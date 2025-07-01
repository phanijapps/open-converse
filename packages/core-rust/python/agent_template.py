# Python Agent Template
# Base template for creating Python-based agents

import json
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseAgent:
    """
    Base class for all Python agents.
    
    This provides the interface that the Rust runtime expects.
    All agents should inherit from this class or implement these methods.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.status = "initialized"
        self.memory = {}
        self.data_connectors = {}
        
    def start(self):
        """Called when the agent is started by the runtime"""
        logger.info(f"Starting agent: {self.config.get('name', 'Unknown')}")
        self.status = "running"
        return {"status": "started", "timestamp": datetime.now().isoformat()}
    
    def cleanup(self):
        """Called when the agent is being stopped"""
        logger.info("Cleaning up agent")
        self.status = "stopped"
        return {"status": "cleaned_up", "timestamp": datetime.now().isoformat()}
    
    def handle_trigger(self, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle trigger events from the runtime
        
        Args:
            trigger_data: Dictionary containing trigger information
            
        Returns:
            Dictionary with the result of handling the trigger
        """
        trigger_type = trigger_data.get("trigger_type")
        data = trigger_data.get("data")
        
        logger.info(f"Handling trigger: {trigger_type}")
        
        # Default implementation - override in subclasses
        return {
            "status": "trigger_handled",
            "trigger_type": trigger_type,
            "result": "No specific handler implemented",
            "timestamp": datetime.now().isoformat()
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Return current agent status"""
        return {
            "status": self.status,
            "memory_items": len(self.memory),
            "config": self.config,
            "timestamp": datetime.now().isoformat()
        }
    
    def heartbeat(self) -> Dict[str, Any]:
        """Called periodically by the runtime to check agent health"""
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat()
        }
    
    # Utility methods for common agent operations
    def store_memory(self, key: str, value: Any):
        """Store data in agent memory"""
        self.memory[key] = {
            "value": value,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_memory(self, key: str) -> Any:
        """Retrieve data from agent memory"""
        return self.memory.get(key, {}).get("value")
    
    def connect_data_source(self, source_id: str, connector_config: Dict[str, Any]):
        """Connect to a data source"""
        # This would be implemented to use the Rust data connectors
        self.data_connectors[source_id] = connector_config
        logger.info(f"Connected to data source: {source_id}")
    
    def send_message(self, target: str, message: Dict[str, Any]):
        """Send a message (would be handled by Rust messaging system)"""
        logger.info(f"Sending message to {target}: {message}")
        return {"status": "message_sent", "target": target}


# Example: Personal Assistant Agent
class PersonalAssistantAgent(BaseAgent):
    """
    Example implementation of a personal assistant agent
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.tasks = []
        self.reminders = []
    
    def handle_trigger(self, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        trigger_type = trigger_data.get("trigger_type")
        data = trigger_data.get("data")
        
        if trigger_type == "Schedule":
            return self.handle_scheduled_task(data)
        elif trigger_type == "MessageReceived":
            return self.handle_message(data)
        elif trigger_type == "FileChange":
            return self.handle_file_change(data)
        else:
            return super().handle_trigger(trigger_data)
    
    def handle_scheduled_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle scheduled reminders and tasks"""
        task_type = data.get("type", "reminder")
        
        if task_type == "reminder":
            message = data.get("message", "Time for a reminder!")
            self.send_notification(message)
            return {"status": "reminder_sent", "message": message}
        
        return {"status": "scheduled_task_handled"}
    
    def handle_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming messages"""
        message = data.get("message", "")
        sender = data.get("sender", "unknown")
        
        # Simple command processing
        if message.lower().startswith("add task"):
            task = message[8:].strip()
            self.add_task(task)
            return {"status": "task_added", "task": task}
        
        elif message.lower().startswith("list tasks"):
            return {"status": "tasks_listed", "tasks": self.tasks}
        
        else:
            return {"status": "message_processed", "response": "I didn't understand that command"}
    
    def handle_file_change(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file system changes"""
        file_path = data.get("path", "")
        change_type = data.get("change_type", "modified")
        
        logger.info(f"File {change_type}: {file_path}")
        
        # Example: Auto-backup important files
        if file_path.endswith(('.doc', '.pdf', '.txt')):
            self.backup_file(file_path)
            return {"status": "file_backed_up", "path": file_path}
        
        return {"status": "file_change_noted"}
    
    def add_task(self, task: str):
        """Add a new task to the list"""
        self.tasks.append({
            "task": task,
            "created_at": datetime.now().isoformat(),
            "completed": False
        })
        self.store_memory("tasks", self.tasks)
    
    def send_notification(self, message: str):
        """Send a notification (would integrate with system notifications)"""
        logger.info(f"NOTIFICATION: {message}")
        # This would integrate with the Rust notification system
    
    def backup_file(self, file_path: str):
        """Backup a file (would use data connectors)"""
        logger.info(f"Backing up file: {file_path}")
        # This would use the Rust data connectors for cloud storage


# Example: Data Analysis Agent
class DataAnalysisAgent(BaseAgent):
    """
    Example agent for data analysis tasks
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.analysis_history = []
    
    def handle_trigger(self, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        trigger_type = trigger_data.get("trigger_type")
        data = trigger_data.get("data")
        
        if trigger_type == "DataChange":
            return self.handle_data_change(data)
        else:
            return super().handle_trigger(trigger_data)
    
    def handle_data_change(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle changes in data sources"""
        source_id = data.get("source_id", "")
        change_type = data.get("change_type", "update")
        
        # Analyze the new data
        analysis_result = self.analyze_data(data.get("data", {}))
        
        self.analysis_history.append({
            "source_id": source_id,
            "analysis": analysis_result,
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "status": "data_analyzed",
            "source_id": source_id,
            "analysis": analysis_result
        }
    
    def analyze_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform data analysis (placeholder implementation)"""
        # This would contain actual analysis logic
        # Could use pandas, numpy, scikit-learn, etc.
        
        return {
            "summary": "Data analysis completed",
            "insights": ["Sample insight 1", "Sample insight 2"],
            "recommendations": ["Recommendation 1", "Recommendation 2"]
        }


# Factory function for creating agents
def create_agent(agent_type: str, config: Dict[str, Any] = None) -> BaseAgent:
    """
    Factory function to create different types of agents
    """
    if agent_type == "personal_assistant":
        return PersonalAssistantAgent(config)
    elif agent_type == "data_analysis":
        return DataAnalysisAgent(config)
    else:
        return BaseAgent(config)


# Global agent instance (used by Rust runtime)
# The Rust runtime will call functions on this instance
agent = None

def initialize_agent(agent_type: str, config_json: str):
    """Initialize the global agent instance"""
    global agent
    config = json.loads(config_json) if config_json else {}
    agent = create_agent(agent_type, config)
    return agent.start()

# Runtime interface functions (called by Rust)
def start():
    if agent:
        return agent.start()
    return {"error": "Agent not initialized"}

def cleanup():
    if agent:
        return agent.cleanup()
    return {"error": "Agent not initialized"}

def handle_trigger(trigger_json: str):
    if agent:
        trigger_data = json.loads(trigger_json)
        return agent.handle_trigger(trigger_data)
    return {"error": "Agent not initialized"}

def get_status():
    if agent:
        return agent.get_status()
    return {"error": "Agent not initialized"}

def heartbeat():
    if agent:
        return agent.heartbeat()
    return {"error": "Agent not initialized"}

# Custom action interface
def execute_action(action_name: str, params_json: str):
    """Execute a custom action on the agent"""
    if not agent:
        return {"error": "Agent not initialized"}
    
    params = json.loads(params_json) if params_json else {}
    
    # Try to call the method on the agent
    if hasattr(agent, action_name):
        method = getattr(agent, action_name)
        if callable(method):
            try:
                return method(**params)
            except Exception as e:
                return {"error": f"Action failed: {str(e)}"}
    
    return {"error": f"Action '{action_name}' not found"}
