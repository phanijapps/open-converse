// Data Vault Module
// Secure personal data storage and management

pub mod vault_manager;
pub mod encryption;
pub mod indexing;

// Re-export key types
pub use vault_manager::{VaultManager, SecureVault};
pub use encryption::EncryptionKey;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::config::VaultConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataIndex {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub content_hash: String,
    pub metadata: std::collections::HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultEntry {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub data: Vec<u8>,
    pub is_encrypted: bool,
    pub metadata: std::collections::HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}
