#!/usr/bin/env python3
"""
Python Agent Wrapper
Handles IPC communication between Rust and Python agents
"""

import sys
import json
import os
import asyncio
import logging
import traceback
import importlib.util
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger('agent_wrapper')

class IPCMessage:
    """IPC message structure for communication with Rust"""
    
    def __init__(self, id: str, message_type: str, payload: Any = None, timestamp: str = None):
        self.id = id
        self.message_type = message_type
        self.payload = payload
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'message_type': self.message_type,
            'payload': self.payload,
            'timestamp': self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'IPCMessage':
        return cls(
            id=data['id'],
            message_type=data['message_type'],
            payload=data.get('payload'),
            timestamp=data.get('timestamp')
        )

class AgentWrapper:
    """Wrapper class that manages a Python agent and handles IPC"""
    
    def __init__(self):
        self.agent = None
        self.agent_id = os.environ.get('AGENT_ID')
        self.agent_script_path = os.environ.get('AGENT_SCRIPT_PATH')
        self.is_running = False
        
        logger.info(f"Initializing agent wrapper for {self.agent_id}")
        logger.info(f"Agent script path: {self.agent_script_path}")
    
    async def initialize(self):
        """Initialize the agent wrapper and load the agent script"""
        try:
            if not self.agent_script_path or not os.path.exists(self.agent_script_path):
                raise Exception(f"Agent script not found: {self.agent_script_path}")
            
            # Load the agent script
            spec = importlib.util.spec_from_file_location("agent_module", self.agent_script_path)
            agent_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(agent_module)
            
            # Look for an agent class or create function
            if hasattr(agent_module, 'Agent'):
                self.agent = agent_module.Agent()
            elif hasattr(agent_module, 'create_agent'):
                self.agent = agent_module.create_agent()
            else:
                # Fallback: use the module itself as the agent
                self.agent = agent_module
            
            logger.info("Agent loaded successfully")
            self.is_running = True
            
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            logger.error(traceback.format_exc())
            raise
    
    async def handle_message(self, message: IPCMessage) -> Optional[IPCMessage]:
        """Handle an incoming IPC message"""
        try:
            if message.message_type == "Execute":
                return await self.handle_execute(message)
            elif message.message_type == "Trigger":
                return await self.handle_trigger(message)
            elif message.message_type == "Stop":
                return await self.handle_stop(message)
            elif message.message_type == "Status":
                return await self.handle_status(message)
            else:
                logger.warning(f"Unknown message type: {message.message_type}")
                return self.create_error_response(message.id, f"Unknown message type: {message.message_type}")
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            logger.error(traceback.format_exc())
            return self.create_error_response(message.id, str(e), traceback.format_exc())
    
    async def handle_execute(self, message: IPCMessage) -> IPCMessage:
        """Handle execute method call"""
        method = message.message_type.get('method') if isinstance(message.message_type, dict) else message.payload.get('method')
        params = message.message_type.get('params') if isinstance(message.message_type, dict) else message.payload.get('params')
        
        if method == 'configure':
            # Special case: configure the agent
            result = await self.configure_agent(params)
        else:
            # Call the method on the agent
            if hasattr(self.agent, method):
                agent_method = getattr(self.agent, method)
                if asyncio.iscoroutinefunction(agent_method):
                    if params:
                        result = await agent_method(params)
                    else:
                        result = await agent_method()
                else:
                    if params:
                        result = agent_method(params)
                    else:
                        result = agent_method()
            else:
                raise Exception(f"Method '{method}' not found on agent")
        
        return IPCMessage(
            id=message.id,
            message_type={
                "Response": {
                    "request_id": message.id,
                    "result": result
                }
            },
            payload=result
        )
    
    async def handle_trigger(self, message: IPCMessage) -> IPCMessage:
        """Handle trigger event"""
        trigger_type = message.message_type.get('trigger_type') if isinstance(message.message_type, dict) else message.payload.get('trigger_type')
        data = message.message_type.get('data') if isinstance(message.message_type, dict) else message.payload.get('data')
        
        # Call the trigger handler on the agent
        if hasattr(self.agent, 'handle_trigger'):
            handler = getattr(self.agent, 'handle_trigger')
            if asyncio.iscoroutinefunction(handler):
                result = await handler(trigger_type, data)
            else:
                result = handler(trigger_type, data)
        else:
            logger.warning("Agent does not have a trigger handler")
            result = {"status": "no_handler", "trigger_type": trigger_type}
        
        return IPCMessage(
            id=message.id,
            message_type={
                "Response": {
                    "request_id": message.id,
                    "result": result
                }
            },
            payload=result
        )
    
    async def handle_stop(self, message: IPCMessage) -> IPCMessage:
        """Handle stop request"""
        self.is_running = False
        
        # Call cleanup if available
        if hasattr(self.agent, 'cleanup'):
            try:
                cleanup = getattr(self.agent, 'cleanup')
                if asyncio.iscoroutinefunction(cleanup):
                    await cleanup()
                else:
                    cleanup()
            except Exception as e:
                logger.warning(f"Error during cleanup: {e}")
        
        return IPCMessage(
            id=message.id,
            message_type={
                "Response": {
                    "request_id": message.id,
                    "result": {"status": "stopped"}
                }
            },
            payload={"status": "stopped"}
        )
    
    async def handle_status(self, message: IPCMessage) -> IPCMessage:
        """Handle status request"""
        status = {
            "agent_id": self.agent_id,
            "is_running": self.is_running,
            "script_path": self.agent_script_path,
            "uptime": 0  # TODO: calculate actual uptime
        }
        
        # Get agent-specific status if available
        if hasattr(self.agent, 'get_status'):
            try:
                agent_status = getattr(self.agent, 'get_status')
                if asyncio.iscoroutinefunction(agent_status):
                    agent_data = await agent_status()
                else:
                    agent_data = agent_status()
                status.update(agent_data)
            except Exception as e:
                logger.warning(f"Error getting agent status: {e}")
        
        return IPCMessage(
            id=message.id,
            message_type={
                "Response": {
                    "request_id": message.id,
                    "result": status
                }
            },
            payload=status
        )
    
    async def configure_agent(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Configure the agent with the provided configuration"""
        try:
            if hasattr(self.agent, 'configure'):
                configure = getattr(self.agent, 'configure')
                if asyncio.iscoroutinefunction(configure):
                    await configure(config)
                else:
                    configure(config)
            
            # Start the agent if it has a start method
            if hasattr(self.agent, 'start'):
                start = getattr(self.agent, 'start')
                if asyncio.iscoroutinefunction(start):
                    await start()
                else:
                    start()
            
            return {"status": "configured", "config": config}
            
        except Exception as e:
            logger.error(f"Error configuring agent: {e}")
            raise
    
    def create_error_response(self, request_id: str, error_message: str, traceback_str: str = None) -> IPCMessage:
        """Create an error response message"""
        return IPCMessage(
            id=request_id,
            message_type={
                "Error": {
                    "message": error_message,
                    "traceback": traceback_str
                }
            },
            payload={
                "error": error_message,
                "traceback": traceback_str
            }
        )
    
    async def send_event(self, event_type: str, data: Any):
        """Send an event to Rust"""
        event_message = IPCMessage(
            id=f"event_{datetime.now().timestamp()}",
            message_type={
                "Event": {
                    "event_type": event_type,
                    "data": data
                }
            },
            payload=data
        )
        
        await self.send_message(event_message)
    
    async def send_heartbeat(self):
        """Send a heartbeat to Rust"""
        heartbeat_message = IPCMessage(
            id=f"heartbeat_{datetime.now().timestamp()}",
            message_type="Heartbeat",
            payload=None
        )
        
        await self.send_message(heartbeat_message)
    
    async def send_message(self, message: IPCMessage):
        """Send a message to Rust via stdout"""
        try:
            json_str = json.dumps(message.to_dict())
            print(json_str, flush=True)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def run(self):
        """Main event loop for the agent wrapper"""
        try:
            await self.initialize()
            
            # Start heartbeat task
            heartbeat_task = asyncio.create_task(self.heartbeat_loop())
            
            # Main message processing loop
            logger.info("Agent wrapper started, waiting for messages...")
            
            while self.is_running:
                try:
                    # Read from stdin
                    line = await asyncio.get_event_loop().run_in_executor(
                        None, sys.stdin.readline
                    )
                    
                    if not line:
                        break  # EOF
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Parse message
                    try:
                        message_data = json.loads(line)
                        message = IPCMessage.from_dict(message_data)
                        
                        # Handle the message
                        response = await self.handle_message(message)
                        if response:
                            await self.send_message(response)
                            
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON received: {e}")
                        logger.error(f"Line: {line}")
                        
                except Exception as e:
                    logger.error(f"Error in main loop: {e}")
                    logger.error(traceback.format_exc())
            
            # Cancel heartbeat task
            heartbeat_task.cancel()
            
        except Exception as e:
            logger.error(f"Fatal error in agent wrapper: {e}")
            logger.error(traceback.format_exc())
            sys.exit(1)
    
    async def heartbeat_loop(self):
        """Send periodic heartbeats"""
        try:
            while self.is_running:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                if self.is_running:
                    await self.send_heartbeat()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in heartbeat loop: {e}")

async def main():
    """Main entry point"""
    wrapper = AgentWrapper()
    await wrapper.run()

if __name__ == "__main__":
    asyncio.run(main())
