// Audit Logging

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::types::AgentId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub event_type: AuditEventType,
    pub actor: ActorType,
    pub resource: String,
    pub action: String,
    pub result: AuditResult,
    pub timestamp: DateTime<Utc>,
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditEventType {
    Authentication,
    Authorization,
    DataAccess,
    AgentExecution,
    ConfigurationChange,
    SecurityViolation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActorType {
    User(String),
    Agent(AgentId),
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditResult {
    Success,
    Failure(String),
    Denied,
}

pub struct SecurityPolicy {
    pub name: String,
    pub rules: Vec<String>,
}

impl SecurityPolicy {
    pub fn new(name: String) -> Self {
        Self {
            name,
            rules: Vec::new(),
        }
    }
}
