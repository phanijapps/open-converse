// Personal Agent Space Core Library
// Main entry point for the core Rust services

pub mod agent_runtime;
pub mod data_connectors;
pub mod trigger_system;
pub mod agent_builder;
pub mod data_vault;
pub mod python_service;
pub mod security;

// Re-export key types and traits
pub use agent_runtime::{
    AgentOrchestrator, AgentExecutor, AgentManager,
    Agent, AgentConfig, AgentState, AgentStatus,
};

pub use data_connectors::{
    ConnectorRegistry, DataConnector, ConnectorConfig,
    DataItem, DataType, Connection,
};

pub use trigger_system::{
    TriggerEngine, TriggerType, TriggerCondition,
    EventStream, TriggerEvent,
};

pub use data_vault::{
    VaultManager, SecureVault, DataIndex,
    EncryptionKey,
};

pub use config::VaultConfig;

pub use python_service::{
    PythonService, PythonAgent, PythonWorkflow,
};

pub use security::{
    SecurityManager, Permission, AuthContext,
    AuditLog, SecurityPolicy,
};

// Common types used across modules
pub mod types {
    use serde::{Deserialize, Serialize};
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    pub type AgentId = Uuid;
    pub type ConnectorId = Uuid;
    pub type TriggerId = Uuid;
    pub type DataItemId = Uuid;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Timestamp {
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    impl Default for Timestamp {
        fn default() -> Self {
            let now = Utc::now();
            Self {
                created_at: now,
                updated_at: now,
            }
        }
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub enum Priority {
        Low = 1,
        Normal = 2,
        High = 3,
        Critical = 4,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub enum ExecutionMode {
        Synchronous,
        Asynchronous,
        Background,
        Scheduled,
    }
}

// Error types
pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum AgentSpaceError {
        #[error("Agent runtime error: {0}")]
        AgentRuntime(String),
        
        #[error("Data connector error: {0}")]
        DataConnector(String),
        
        #[error("Trigger system error: {0}")]
        TriggerSystem(String),
        
        #[error("Data vault error: {0}")]
        DataVault(String),
        
        #[error("Python service error: {0}")]
        PythonService(String),
        
        #[error("Security error: {0}")]
        Security(String),
        
        #[error("Database error: {0}")]
        Database(#[from] sqlx::Error),
        
        #[error("Serialization error: {0}")]
        Serialization(#[from] serde_json::Error),
        
        #[error("Network error: {0}")]
        Network(#[from] reqwest::Error),
        
        #[error("IO error: {0}")]
        Io(#[from] std::io::Error),
    }

    pub type Result<T> = std::result::Result<T, AgentSpaceError>;
}

// Configuration
pub mod config {
    use serde::{Deserialize, Serialize};
    use std::path::PathBuf;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct AgentSpaceConfig {
        pub data_directory: PathBuf,
        pub vault_config: VaultConfig,
        pub python_config: PythonConfig,
        pub security_config: SecurityConfig,
        pub database_config: DatabaseConfig,
        pub connector_config: ConnectorConfig,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct VaultConfig {
        pub vault_path: PathBuf,
        pub encryption_enabled: bool,
        pub backup_enabled: bool,
        pub sync_enabled: bool,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PythonConfig {
        pub python_path: Option<PathBuf>,
        pub virtual_env: Option<PathBuf>,
        pub modules_path: PathBuf,
        pub max_memory_mb: u64,
        pub timeout_seconds: u64,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SecurityConfig {
        pub enable_sandboxing: bool,
        pub audit_enabled: bool,
        pub permission_model: PermissionModel,
        pub encryption_algorithm: EncryptionAlgorithm,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DatabaseConfig {
        pub database_path: PathBuf,
        pub connection_pool_size: u32,
        pub enable_wal: bool,
        pub backup_interval_hours: u64,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ConnectorConfig {
        pub max_concurrent_connections: u32,
        pub default_timeout_seconds: u64,
        pub retry_attempts: u32,
        pub rate_limit_per_second: u32,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub enum PermissionModel {
        Strict,
        Balanced,
        Permissive,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub enum EncryptionAlgorithm {
        Aes256Gcm,
        ChaCha20Poly1305,
    }

    impl Default for AgentSpaceConfig {
        fn default() -> Self {
            let data_dir = dirs::data_dir()
                .unwrap_or_else(|| std::env::current_dir().unwrap())
                .join("personal-agent-space");

            Self {
                data_directory: data_dir.clone(),
                vault_config: VaultConfig {
                    vault_path: data_dir.join("vault"),
                    encryption_enabled: true,
                    backup_enabled: true,
                    sync_enabled: false,
                },
                python_config: PythonConfig {
                    python_path: None,
                    virtual_env: None,
                    modules_path: data_dir.join("python_modules"),
                    max_memory_mb: 512,
                    timeout_seconds: 300,
                },
                security_config: SecurityConfig {
                    enable_sandboxing: true,
                    audit_enabled: true,
                    permission_model: PermissionModel::Balanced,
                    encryption_algorithm: EncryptionAlgorithm::Aes256Gcm,
                },
                database_config: DatabaseConfig {
                    database_path: data_dir.join("agents.db"),
                    connection_pool_size: 10,
                    enable_wal: true,
                    backup_interval_hours: 24,
                },
                connector_config: ConnectorConfig {
                    max_concurrent_connections: 50,
                    default_timeout_seconds: 30,
                    retry_attempts: 3,
                    rate_limit_per_second: 10,
                },
            }
        }
    }
}
