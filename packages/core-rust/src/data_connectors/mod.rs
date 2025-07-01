// Data Connectors Module
// Universal data integration system

pub mod connector_registry;
pub mod filesystem;
pub mod cloud_storage;
pub mod productivity;

// Re-export key types
pub use connector_registry::ConnectorRegistry;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use async_trait::async_trait;
use std::collections::HashMap;

use crate::errors::Result;
use crate::types::AgentId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: Uuid,
    pub connector_id: Uuid,
    pub agent_id: AgentId,
    pub config: ConnectorConfig,
    pub status: ConnectionStatus,
    pub last_sync: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
    Error(String),
    Syncing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorConfig {
    pub connector_type: String,
    pub settings: HashMap<String, serde_json::Value>,
    pub credentials: Option<HashMap<String, String>>,
    pub sync_interval: Option<chrono::Duration>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataItem {
    pub id: Uuid,
    pub connector_id: Uuid,
    pub data_type: DataType,
    pub content: serde_json::Value,
    pub metadata: HashMap<String, String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataType {
    Document,
    Email,
    Calendar,
    Task,
    Note,
    File,
    Message,
    Contact,
    Custom(String),
}

#[async_trait]
pub trait DataConnector: Send + Sync {
    async fn connect(&self, config: ConnectorConfig) -> Result<Connection>;
    async fn disconnect(&self, connection: &Connection) -> Result<()>;
    async fn sync_data(&self, connection: &Connection) -> Result<Vec<DataItem>>;
    async fn test_connection(&self, config: &ConnectorConfig) -> Result<bool>;
    
    fn get_connector_info(&self) -> ConnectorInfo;
    fn get_supported_data_types(&self) -> Vec<DataType>;
    fn get_required_permissions(&self) -> Vec<String>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub provider: String,
}

pub type EventStream = tokio::sync::mpsc::Receiver<DataItem>;
