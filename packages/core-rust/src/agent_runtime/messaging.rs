// Inter-Agent Messaging System
// Handles communication between agents and system components

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock, broadcast};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;

pub struct MessageBus {
    channels: Arc<RwLock<HashMap<AgentId, mpsc::Sender<InterAgentMessage>>>>,
    broadcast_sender: broadcast::Sender<InterAgentMessage>,
    _broadcast_receiver: broadcast::Receiver<InterAgentMessage>,
    message_history: Arc<RwLock<Vec<InterAgentMessage>>>,
    max_history_size: usize,
    is_running: Arc<RwLock<bool>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterAgentMessage {
    pub id: Uuid,
    pub from_agent: AgentId,
    pub to_agent: Option<AgentId>, // None for broadcast messages
    pub message_type: MessageType,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageType {
    // Agent lifecycle messages
    AgentStarted,
    AgentStopped,
    AgentPaused,
    AgentResumed,
    AgentError,

    // Action messages
    ActionRequested,
    ActionStarted,
    ActionCompleted,
    ActionFailed,

    // Data messages
    DataUpdated,
    DataRequested,
    DataShared,

    // Trigger messages
    TriggerFired,
    TriggerCreated,
    TriggerDeleted,

    // Coordination messages
    TaskDelegation,
    ResourceRequest,
    ResourceRelease,
    StatusUpdate,

    // Custom messages
    Custom(String),
}

impl MessageBus {
    pub fn new(max_history_size: usize) -> Self {
        let (broadcast_sender, broadcast_receiver) = broadcast::channel(1000);

        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
            broadcast_sender,
            _broadcast_receiver: broadcast_receiver,
            message_history: Arc::new(RwLock::new(Vec::new())),
            max_history_size,
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    /// Start the message bus
    pub async fn start(&self) -> Result<()> {
        info!("Starting message bus");
        *self.is_running.write().await = true;
        Ok(())
    }

    /// Stop the message bus
    pub async fn stop(&self) -> Result<()> {
        info!("Stopping message bus");
        *self.is_running.write().await = false;
        
        // Close all agent channels
        let mut channels = self.channels.write().await;
        channels.clear();
        
        Ok(())
    }

    /// Register an agent with the message bus
    pub async fn register_agent(&self, agent_id: AgentId) -> Result<mpsc::Receiver<InterAgentMessage>> {
        debug!("Registering agent with message bus: {}", agent_id);
        
        let (sender, receiver) = mpsc::channel(100);
        self.channels.write().await.insert(agent_id, sender);
        
        info!("Agent registered with message bus: {}", agent_id);
        Ok(receiver)
    }

    /// Unregister an agent from the message bus
    pub async fn unregister_agent(&self, agent_id: AgentId) -> Result<()> {
        debug!("Unregistering agent from message bus: {}", agent_id);
        
        self.channels.write().await.remove(&agent_id);
        
        info!("Agent unregistered from message bus: {}", agent_id);
        Ok(())
    }

    /// Send a message through the bus
    pub async fn send_message(&self, message: InterAgentMessage) -> Result<()> {
        if !*self.is_running.read().await {
            return Err(AgentSpaceError::AgentRuntime("Message bus is not running".to_string()));
        }

        debug!("Sending message: {:?} -> {:?} ({})", 
            message.from_agent, 
            message.to_agent, 
            message.message_type
        );

        // Add to history
        self.add_to_history(message.clone()).await;

        // Send to specific agent or broadcast
        match message.to_agent {
            Some(target_agent) => {
                self.send_to_agent(target_agent, message).await?;
            }
            None => {
                self.broadcast_message(message).await?;
            }
        }

        Ok(())
    }

    /// Send message to a specific agent
    async fn send_to_agent(&self, agent_id: AgentId, message: InterAgentMessage) -> Result<()> {
        let channels = self.channels.read().await;
        
        if let Some(sender) = channels.get(&agent_id) {
            if let Err(e) = sender.send(message).await {
                warn!("Failed to send message to agent {}: {}", agent_id, e);
                return Err(AgentSpaceError::AgentRuntime(
                    format!("Failed to send message to agent: {}", e)
                ));
            }
        } else {
            warn!("Agent {} not registered with message bus", agent_id);
            return Err(AgentSpaceError::AgentRuntime(
                format!("Agent {} not registered", agent_id)
            ));
        }

        Ok(())
    }

    /// Broadcast message to all registered agents
    async fn broadcast_message(&self, message: InterAgentMessage) -> Result<()> {
        if let Err(e) = self.broadcast_sender.send(message.clone()) {
            warn!("Failed to broadcast message: {}", e);
            return Err(AgentSpaceError::AgentRuntime(
                format!("Failed to broadcast message: {}", e)
            ));
        }

        debug!("Broadcasted message from agent: {}", message.from_agent);
        Ok(())
    }

    /// Get a broadcast receiver for listening to all messages
    pub fn get_broadcast_receiver(&self) -> broadcast::Receiver<InterAgentMessage> {
        self.broadcast_sender.subscribe()
    }

    /// Add message to history with size limit
    async fn add_to_history(&self, message: InterAgentMessage) {
        let mut history = self.message_history.write().await;
        
        history.push(message);
        
        // Maintain maximum history size
        if history.len() > self.max_history_size {
            let excess = history.len() - self.max_history_size;
            history.drain(0..excess);
        }
    }

    /// Get recent message history
    pub async fn get_message_history(&self, limit: Option<usize>) -> Vec<InterAgentMessage> {
        let history = self.message_history.read().await;
        
        match limit {
            Some(n) => {
                let start = if history.len() > n { history.len() - n } else { 0 };
                history[start..].to_vec()
            }
            None => history.clone(),
        }
    }

    /// Get messages for a specific agent
    pub async fn get_agent_messages(&self, agent_id: AgentId, limit: Option<usize>) -> Vec<InterAgentMessage> {
        let history = self.message_history.read().await;
        let mut agent_messages: Vec<InterAgentMessage> = history
            .iter()
            .filter(|msg| msg.from_agent == agent_id || msg.to_agent == Some(agent_id))
            .cloned()
            .collect();

        if let Some(n) = limit {
            if agent_messages.len() > n {
                let start = agent_messages.len() - n;
                agent_messages = agent_messages[start..].to_vec();
            }
        }

        agent_messages
    }

    /// Get message statistics
    pub async fn get_message_statistics(&self) -> MessageStatistics {
        let history = self.message_history.read().await;
        let channels = self.channels.read().await;

        let mut type_counts = HashMap::new();
        let mut agent_counts = HashMap::new();

        for message in history.iter() {
            // Count by message type
            let type_key = format!("{:?}", message.message_type);
            *type_counts.entry(type_key).or_insert(0) += 1;

            // Count by agent
            *agent_counts.entry(message.from_agent).or_insert(0) += 1;
        }

        MessageStatistics {
            total_messages: history.len(),
            registered_agents: channels.len(),
            message_types: type_counts,
            messages_per_agent: agent_counts,
        }
    }

    /// Clear message history
    pub async fn clear_history(&self) -> Result<()> {
        info!("Clearing message history");
        self.message_history.write().await.clear();
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MessageStatistics {
    pub total_messages: usize,
    pub registered_agents: usize,
    pub message_types: HashMap<String, u32>,
    pub messages_per_agent: HashMap<AgentId, u32>,
}

impl InterAgentMessage {
    pub fn new(
        from_agent: AgentId,
        to_agent: Option<AgentId>,
        message_type: MessageType,
        payload: serde_json::Value,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            from_agent,
            to_agent,
            message_type,
            payload,
            timestamp: Utc::now(),
        }
    }

    pub fn broadcast(
        from_agent: AgentId,
        message_type: MessageType,
        payload: serde_json::Value,
    ) -> Self {
        Self::new(from_agent, None, message_type, payload)
    }

    pub fn direct(
        from_agent: AgentId,
        to_agent: AgentId,
        message_type: MessageType,
        payload: serde_json::Value,
    ) -> Self {
        Self::new(from_agent, Some(to_agent), message_type, payload)
    }

    pub fn is_broadcast(&self) -> bool {
        self.to_agent.is_none()
    }

    pub fn is_direct(&self) -> bool {
        self.to_agent.is_some()
    }
}

// Message type display implementations
impl std::fmt::Display for MessageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MessageType::AgentStarted => write!(f, "Agent Started"),
            MessageType::AgentStopped => write!(f, "Agent Stopped"),
            MessageType::AgentPaused => write!(f, "Agent Paused"),
            MessageType::AgentResumed => write!(f, "Agent Resumed"),
            MessageType::AgentError => write!(f, "Agent Error"),
            MessageType::ActionRequested => write!(f, "Action Requested"),
            MessageType::ActionStarted => write!(f, "Action Started"),
            MessageType::ActionCompleted => write!(f, "Action Completed"),
            MessageType::ActionFailed => write!(f, "Action Failed"),
            MessageType::DataUpdated => write!(f, "Data Updated"),
            MessageType::DataRequested => write!(f, "Data Requested"),
            MessageType::DataShared => write!(f, "Data Shared"),
            MessageType::TriggerFired => write!(f, "Trigger Fired"),
            MessageType::TriggerCreated => write!(f, "Trigger Created"),
            MessageType::TriggerDeleted => write!(f, "Trigger Deleted"),
            MessageType::TaskDelegation => write!(f, "Task Delegation"),
            MessageType::ResourceRequest => write!(f, "Resource Request"),
            MessageType::ResourceRelease => write!(f, "Resource Release"),
            MessageType::StatusUpdate => write!(f, "Status Update"),
            MessageType::Custom(name) => write!(f, "Custom: {}", name),
        }
    }
}
