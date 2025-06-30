/// Database module for OpenConverse memory management
/// 
/// This module provides a modular database abstraction layer that supports:
/// - SQLite backend with vector search capabilities
/// - New two-table design: Session (acting as persona/conversation), Message
/// - Migration system for schema management
/// - CRUD operations exposed via Tauri commands
/// 
/// The design uses a MemoryRepo trait for clean abstraction of memory operations.

pub mod providers;
pub mod models;
pub mod migrations;
pub mod commands;

#[cfg(test)]
pub mod tests;

use std::path::Path;
use thiserror::Error;
use models::{Session, Message, CreateSession, CreateMessage, DatabaseStats};
use crate::connectors::openrouter::OpenRouterConnector;
use crate::connectors::settings::SettingsManager;
use crate::connectors::Connector;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Connection error: {0}")]
    Connection(String),
    #[error("Migration error: {0}")]
    Migration(String),
    #[error("Query error: {0}")]
    Query(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("SQLx error: {0}")]
    Sqlx(#[from] sqlx::Error),
}

pub type Result<T> = std::result::Result<T, DatabaseError>;

/// Memory repository trait for database operations
#[async_trait::async_trait]
pub trait MemoryRepo {
    // Session operations
    async fn create_session(&self, session: CreateSession) -> Result<Session>;
    async fn get_sessions(&self) -> Result<Vec<Session>>;
    async fn get_session_by_id(&self, session_id: i64) -> Result<Session>;
    async fn delete_session(&self, session_id: i64) -> Result<bool>;

    // Message operations
    async fn save_message(&self, message: CreateMessage) -> Result<Message>;
    async fn recent_messages(&self, session_id: i64, limit: Option<i64>) -> Result<Vec<Message>>;
    async fn delete_message(&self, message_id: i64) -> Result<bool>;

    // Vector search operations
    async fn semantic_search(&self, query_embedding: Vec<f32>, limit: Option<i64>) -> Result<Vec<Message>>;

    // Utility operations
    async fn get_database_stats(&self) -> Result<DatabaseStats>;
    async fn clear_all_data(&self) -> Result<()>;
}

/// Database configuration
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub provider: DatabaseProvider,
    pub connection_string: String,
}

/// Supported database providers
#[derive(Debug, Clone)]
pub enum DatabaseProvider {
    SQLite,
    // Future: PostgreSQL, MySQL, etc.
}

/// Main database manager that handles connection and operations
pub struct DatabaseManager {
    provider: providers::sqlite::SqliteProvider,
}

impl DatabaseManager {
    /// Initialize database with given configuration
    pub async fn new(config: DatabaseConfig) -> Result<Self> {
        match config.provider {
            DatabaseProvider::SQLite => {
                let provider = providers::sqlite::SqliteProvider::new(&config.connection_string).await?;
                Ok(Self { provider })
            }
        }
    }

    /// Get the default database path
    pub fn default_db_path() -> std::path::PathBuf {
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        Path::new(&home_dir)
            .join(".openconv")
            .join("db")
            .join("conv.db")
    }

    /// Run database migrations
    pub async fn migrate(&self) -> Result<()> {
        self.provider.migrate().await
    }

    /// Get reference to the provider for memory operations
    pub fn memory_repo(&self) -> &dyn MemoryRepo {
        &self.provider
    }
}
