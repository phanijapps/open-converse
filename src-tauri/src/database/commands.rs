/// Tauri commands for database operations
/// 
/// This module exposes database functionality to the frontend via Tauri commands.
/// These commands handle memory management operations and provide a clean API
/// for the frontend to interact with the database.

use crate::database::{models::*, DatabaseConfig, DatabaseManager, DatabaseProvider};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Application state containing the database manager
pub type DatabaseState = Arc<Mutex<Option<DatabaseManager>>>;

/// Initialize the database with the given configuration
#[tauri::command]
pub async fn init_database(
    database_path: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<String, String> {
    let db_path = database_path.unwrap_or_else(|| {
        DatabaseManager::default_db_path()
            .to_string_lossy()
            .to_string()
    });

    let config = DatabaseConfig {
        provider: DatabaseProvider::SQLite,
        connection_string: db_path.clone(),
    };

    let manager = DatabaseManager::new(config)
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    manager
        .migrate()
        .await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    let mut state_guard = state.lock().await;
    *state_guard = Some(manager);

    Ok(format!("Database initialized at: {}", db_path))
}

/// Get the current database path
#[tauri::command]
pub async fn get_database_path() -> Result<String, String> {
    Ok(DatabaseManager::default_db_path()
        .to_string_lossy()
        .to_string())
}

/// Clear long-term memory
#[tauri::command]
pub async fn clear_long_term_memory(state: State<'_, DatabaseState>) -> Result<String, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .clear_long_term_memory()
        .await
        .map_err(|e| format!("Failed to clear long-term memory: {}", e))?;

    Ok("Long-term memory cleared successfully".to_string())
}

/// Clear short-term memory
#[tauri::command]
pub async fn clear_short_term_memory(state: State<'_, DatabaseState>) -> Result<String, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .clear_short_term_memory()
        .await
        .map_err(|e| format!("Failed to clear short-term memory: {}", e))?;

    Ok("Short-term memory cleared successfully".to_string())
}

/// Clear vector database
#[tauri::command]
pub async fn clear_vector_db(state: State<'_, DatabaseState>) -> Result<String, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .clear_vector_db()
        .await
        .map_err(|e| format!("Failed to clear vector database: {}", e))?;

    Ok("Vector database cleared successfully".to_string())
}

/// Get database statistics
#[tauri::command]
pub async fn get_database_stats(state: State<'_, DatabaseState>) -> Result<DatabaseStats, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let stats = manager
        .provider()
        .get_database_stats()
        .await
        .map_err(|e| format!("Failed to get database stats: {}", e))?;

    Ok(stats)
}

// === Long Term Memory Commands ===

#[tauri::command]
pub async fn create_long_term_memory(
    content: String,
    metadata: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<LongTermMemory, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let entry = CreateLongTermMemory { content, metadata };
    
    let result = manager
        .provider()
        .create_long_term_memory(entry)
        .await
        .map_err(|e| format!("Failed to create long-term memory: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub async fn get_long_term_memories(
    limit: Option<i64>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<LongTermMemory>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let memories = manager
        .provider()
        .get_long_term_memories(limit)
        .await
        .map_err(|e| format!("Failed to get long-term memories: {}", e))?;

    Ok(memories)
}

#[tauri::command]
pub async fn delete_long_term_memory(
    id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let deleted = manager
        .provider()
        .delete_long_term_memory(id)
        .await
        .map_err(|e| format!("Failed to delete long-term memory: {}", e))?;

    Ok(deleted)
}

// === Short Term Memory Commands ===

#[tauri::command]
pub async fn create_short_term_memory(
    content: String,
    expires_at: String, // ISO 8601 string
    metadata: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<ShortTermMemory, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let expires_at: DateTime<Utc> = expires_at
        .parse()
        .map_err(|e| format!("Invalid expires_at format: {}", e))?;

    let entry = CreateShortTermMemory {
        content,
        expires_at,
        metadata,
    };

    let result = manager
        .provider()
        .create_short_term_memory(entry)
        .await
        .map_err(|e| format!("Failed to create short-term memory: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub async fn get_short_term_memories(
    include_expired: bool,
    state: State<'_, DatabaseState>,
) -> Result<Vec<ShortTermMemory>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let memories = manager
        .provider()
        .get_short_term_memories(include_expired)
        .await
        .map_err(|e| format!("Failed to get short-term memories: {}", e))?;

    Ok(memories)
}

#[tauri::command]
pub async fn delete_short_term_memory(
    id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let deleted = manager
        .provider()
        .delete_short_term_memory(id)
        .await
        .map_err(|e| format!("Failed to delete short-term memory: {}", e))?;

    Ok(deleted)
}

#[tauri::command]
pub async fn cleanup_expired_short_term_memory(
    state: State<'_, DatabaseState>,
) -> Result<i64, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let cleaned_count = manager
        .provider()
        .cleanup_expired_short_term_memory()
        .await
        .map_err(|e| format!("Failed to cleanup expired memories: {}", e))?;

    Ok(cleaned_count)
}

// === Vector DB Commands ===

#[tauri::command]
pub async fn create_vector_db_entry(
    content: String,
    collection_name: String,
    document_id: Option<String>,
    metadata: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<VectorDbEntry, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let entry = CreateVectorDbEntry {
        document_id,
        content,
        embedding: None, // Will be populated when Langchain integration is added
        collection_name,
        metadata,
    };

    let result = manager
        .provider()
        .create_vector_db_entry(entry)
        .await
        .map_err(|e| format!("Failed to create vector DB entry: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub async fn get_vector_db_entries(
    collection_name: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<VectorDbEntry>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let entries = manager
        .provider()
        .get_vector_db_entries(collection_name)
        .await
        .map_err(|e| format!("Failed to get vector DB entries: {}", e))?;

    Ok(entries)
}

#[tauri::command]
pub async fn get_vector_db_entry_by_document_id(
    document_id: String,
    state: State<'_, DatabaseState>,
) -> Result<Option<VectorDbEntry>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let entry = manager
        .provider()
        .get_vector_db_entry_by_document_id(&document_id)
        .await
        .map_err(|e| format!("Failed to get vector DB entry: {}", e))?;

    Ok(entry)
}

#[tauri::command]
pub async fn delete_vector_db_entry(
    id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let deleted = manager
        .provider()
        .delete_vector_db_entry(id)
        .await
        .map_err(|e| format!("Failed to delete vector DB entry: {}", e))?;

    Ok(deleted)
}
