"""
Python Agent Template - Updated for IPC Communication
Base classes and example implementations for Python-based agents
Compatible with the new Rust IPC system
"""

import asyncio
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Base class for all Python agents - IPC compatible"""
    
    def __init__(self, agent_id: str = None, config: Dict[str, Any] = None):
        self.agent_id = agent_id or os.environ.get('AGENT_ID', 'unknown')
        self.config = config or {}
        self.is_running = False
        self.start_time = None
        
        logger.info(f"Initializing agent {self.agent_id}")
    
    async def configure(self, config: Dict[str, Any]):
        """Configure the agent with the provided configuration"""
        self.config.update(config)
        logger.info(f"Agent {self.agent_id} configured with: {config}")
    
    async def start(self):
        """Start the agent"""
        self.is_running = True
        self.start_time = time.time()
        logger.info(f"Agent {self.agent_id} started")
        await self.on_start()
    
    async def stop(self):
        """Stop the agent"""
        self.is_running = False
        logger.info(f"Agent {self.agent_id} stopped")
        await self.on_stop()
    
    async def cleanup(self):
        """Clean up agent resources"""
        await self.on_cleanup()
        logger.info(f"Agent {self.agent_id} cleaned up")
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the agent"""
        uptime = time.time() - self.start_time if self.start_time else 0
        return {
            "agent_id": self.agent_id,
            "is_running": self.is_running,
            "uptime": uptime,
            "config": self.config,
            "custom_status": self.get_custom_status()
        }
    
    async def handle_trigger(self, trigger_type: str, data: Any) -> Dict[str, Any]:
        """Handle a trigger event"""
        logger.info(f"Agent {self.agent_id} handling trigger: {trigger_type}")
        
        result = await self.on_trigger(trigger_type, data)
        
        return {
            "trigger_type": trigger_type,
            "handled": True,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # Abstract methods to be implemented by subclasses
    @abstractmethod
    async def on_start(self):
        """Called when the agent starts"""
        pass
    
    @abstractmethod
    async def on_stop(self):
        """Called when the agent stops"""
        pass
    
    @abstractmethod
    async def on_cleanup(self):
        """Called during cleanup"""
        pass
    
    @abstractmethod
    async def on_trigger(self, trigger_type: str, data: Any) -> Any:
        """Called when a trigger fires"""
        pass
    
    @abstractmethod
    def get_custom_status(self) -> Dict[str, Any]:
        """Get custom status information"""
        pass

class ChatAgent(BaseAgent):
    """Example chat agent that can generate responses"""
    
    def __init__(self, agent_id: str = None, config: Dict[str, Any] = None):
        super().__init__(agent_id, config)
        self.conversation_history = []
        self.model_name = "gpt-3.5-turbo"  # Default model
    
    async def configure(self, config: Dict[str, Any]):
        await super().configure(config)
        self.model_name = config.get('model_name', self.model_name)
    
    async def on_start(self):
        logger.info(f"Chat agent {self.agent_id} started with model: {self.model_name}")
    
    async def on_stop(self):
        logger.info(f"Chat agent {self.agent_id} stopped")
    
    async def on_cleanup(self):
        self.conversation_history.clear()
    
    async def on_trigger(self, trigger_type: str, data: Any) -> Any:
        if trigger_type == "message_received":
            return await self.process_message(data)
        elif trigger_type == "schedule":
            return await self.scheduled_task(data)
        else:
            return {"error": f"Unknown trigger type: {trigger_type}"}
    
    def get_custom_status(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "conversation_length": len(self.conversation_history),
            "last_message_time": self.conversation_history[-1].get('timestamp') if self.conversation_history else None
        }
    
    async def process_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process an incoming message and generate a response"""
        message = message_data.get('message', '')
        user_id = message_data.get('user_id', 'unknown')
        
        logger.info(f"Processing message from {user_id}: {message}")
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": message,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Generate response (placeholder - would use actual LLM)
        response = await self.generate_response(message)
        
        # Add response to history
        self.conversation_history.append({
            "role": "assistant", 
            "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "response": response,
            "user_id": user_id,
            "model": self.model_name
        }
    
    async def generate_response(self, message: str) -> str:
        """Generate a response to the message (placeholder implementation)"""
        # This is a placeholder - in a real implementation, you would:
        # 1. Use langchain/openai/anthropic to generate responses
        # 2. Consider conversation context
        # 3. Handle various message types
        
        await asyncio.sleep(0.1)  # Simulate processing time
        
        responses = [
            f"I understand you said: {message}",
            f"That's interesting! You mentioned: {message}",
            f"Thanks for sharing: {message}",
            "I'm still learning how to respond to that.",
            "Could you tell me more about that?"
        ]
        
        import random
        return random.choice(responses)
    
    async def scheduled_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle scheduled tasks"""
        task_type = data.get('task_type', 'unknown')
        
        if task_type == 'cleanup':
            # Clean up old conversation history
            if len(self.conversation_history) > 100:
                self.conversation_history = self.conversation_history[-50:]
                return {"cleaned": True, "remaining_messages": len(self.conversation_history)}
        
        return {"task_type": task_type, "status": "completed"}
    
    # Custom actions for this agent
    async def get_conversation_history(self, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get the conversation history"""
        limit = params.get('limit', 10) if params else 10
        return self.conversation_history[-limit:]
    
    async def clear_history(self, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Clear the conversation history"""
        count = len(self.conversation_history)
        self.conversation_history.clear()
        return {"cleared_messages": count}

# Default agent class - this will be instantiated if no specific agent is found
class Agent(ChatAgent):
    """Default agent implementation"""
    pass

# Function to create agent - alternative instantiation method
def create_agent(agent_type: str = "chat", config: Dict[str, Any] = None) -> BaseAgent:
    """Factory function to create agents"""
    agents = {
        "chat": ChatAgent
    }
    
    agent_class = agents.get(agent_type, ChatAgent)
    return agent_class(config=config)

if __name__ == "__main__":
    # This allows the template to be run standalone for testing
    import asyncio
    
    async def test_agent():
        agent = Agent()
        await agent.configure({"model_name": "test-model"})
        await agent.start()
        
        # Test message processing
        result = await agent.process_message({
            "message": "Hello, agent!",
            "user_id": "test_user"
        })
        print("Response:", result)
        
        # Test status
        status = agent.get_status()
        print("Status:", status)
        
        await agent.stop()
        await agent.cleanup()
    
    asyncio.run(test_agent())
