// Security Module
// Authentication, authorization, and audit logging

pub mod auth;
pub mod permissions;
pub mod audit;

// Re-export key types
pub use auth::{SecurityManager, AuthContext};
pub use permissions::Permission;
pub use audit::{AuditLog, SecurityPolicy};

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::types::AgentId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityContext {
    pub user_id: Option<String>,
    pub agent_id: Option<AgentId>,
    pub permissions: Vec<Permission>,
    pub session_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityLevel {
    Public,
    Internal,
    Confidential,
    Restricted,
}
