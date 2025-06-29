/// Database module for OpenConverse memory management
/// 
/// This module provides a modular database abstraction layer that supports:
/// - SQLite backend (with future extensibility for PostgreSQL, etc.)
/// - Three core memory tables: LongTermMemory, ShortTermMemory, VectorDB
/// - Migration system for schema management
/// - CRUD operations exposed via Tauri commands
/// 
/// The design allows for easy extension to other database backends by implementing
/// the DatabaseProvider trait.

pub mod providers;
pub mod models;
pub mod migrations;
pub mod commands;

use std::path::Path;
use thiserror::Error;

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
            .join("settings")
            .join("db")
            .join("conv.db")
    }

    /// Run database migrations
    pub async fn migrate(&self) -> Result<()> {
        self.provider.migrate().await
    }

    /// Clear all long-term memory
    pub async fn clear_long_term_memory(&self) -> Result<()> {
        self.provider.clear_long_term_memory().await
    }

    /// Clear all short-term memory
    pub async fn clear_short_term_memory(&self) -> Result<()> {
        self.provider.clear_short_term_memory().await
    }

    /// Clear all vector database entries
    pub async fn clear_vector_db(&self) -> Result<()> {
        self.provider.clear_vector_db().await
    }

    /// Get reference to the provider for CRUD operations
    pub fn provider(&self) -> &providers::sqlite::SqliteProvider {
        &self.provider
    }
}
