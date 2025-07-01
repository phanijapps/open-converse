// Trigger System Module
// Event-driven automation and scheduling

pub mod trigger_engine;
pub mod watchers;
pub mod schedulers;

// Re-export key types
pub use trigger_engine::TriggerEngine;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::types::AgentId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TriggerType {
    FileChange(String),
    Schedule(String),
    WebhookReceived(String),
    DataUpdate(String),
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerCondition {
    pub id: Uuid,
    pub agent_id: AgentId,
    pub trigger_type: TriggerType,
    pub condition: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerEvent {
    pub id: Uuid,
    pub trigger_id: Uuid,
    pub agent_id: AgentId,
    pub event_data: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

pub type EventStream = tokio::sync::mpsc::Receiver<TriggerEvent>;
