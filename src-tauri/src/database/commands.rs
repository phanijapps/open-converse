/// Tauri commands for the new memory architecture
/// 
/// This module exposes the new persona/conversation/message operations to the frontend.
/// These commands provide a clean API for interacting with the new three-table design.

use crate::database::{models::*, DatabaseConfig, DatabaseManager, DatabaseProvider};
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

/// Get database statistics
#[tauri::command]
pub async fn get_database_stats(state: State<'_, DatabaseState>) -> Result<DatabaseStats, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .get_database_stats()
        .await
        .map_err(|e| format!("Failed to get database stats: {}", e))
}

/// Clear all memory data
#[tauri::command]
pub async fn clear_all_memory(state: State<'_, DatabaseState>) -> Result<String, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .clear_all_data()
        .await
        .map_err(|e| format!("Failed to clear memory: {}", e))?;

    Ok("All memory data cleared successfully".to_string())
}

// === Persona Commands ===

#[tauri::command]
pub async fn create_persona(
    name: String,
    role: Option<String>,
    goals: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<Persona, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let create_persona = CreatePersona { name, role, goals };

    manager
        .memory_repo()
        .create_persona(create_persona)
        .await
        .map_err(|e| format!("Failed to create persona: {}", e))
}

#[tauri::command]
pub async fn get_personas(state: State<'_, DatabaseState>) -> Result<Vec<Persona>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .get_personas()
        .await
        .map_err(|e| format!("Failed to get personas: {}", e))
}

#[tauri::command]
pub async fn delete_persona(
    persona_id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .delete_persona(persona_id)
        .await
        .map_err(|e| format!("Failed to delete persona: {}", e))
}

// === Conversation Commands ===

#[tauri::command]
pub async fn create_conversation(
    persona_id: i64,
    status: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<Conversation, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let create_conversation = CreateConversation { persona_id, status };

    manager
        .memory_repo()
        .create_conversation(create_conversation)
        .await
        .map_err(|e| format!("Failed to create conversation: {}", e))
}

#[tauri::command]
pub async fn get_conversations(
    persona_id: Option<i64>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<Conversation>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .get_conversations(persona_id)
        .await
        .map_err(|e| format!("Failed to get conversations: {}", e))
}

#[tauri::command]
pub async fn delete_conversation(
    conversation_id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .delete_conversation(conversation_id)
        .await
        .map_err(|e| format!("Failed to delete conversation: {}", e))
}

// === Message Commands ===

#[tauri::command]
pub async fn save_message(
    conversation_id: i64,
    role: String,
    content: String,
    embedding: Option<Vec<u8>>,
    recall_score: Option<f64>,
    state: State<'_, DatabaseState>,
) -> Result<Message, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let create_message = CreateMessage {
        conversation_id,
        role,
        content,
        embedding,
        recall_score,
    };

    manager
        .memory_repo()
        .save_message(create_message)
        .await
        .map_err(|e| format!("Failed to save message: {}", e))
}

#[tauri::command]
pub async fn get_recent_messages(
    conversation_id: i64,
    limit: Option<i64>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<Message>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .recent_messages(conversation_id, limit)
        .await
        .map_err(|e| format!("Failed to get recent messages: {}", e))
}

#[tauri::command]
pub async fn delete_message(
    message_id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .delete_message(message_id)
        .await
        .map_err(|e| format!("Failed to delete message: {}", e))
}

// === Search Commands ===

#[tauri::command]
pub async fn semantic_search(
    query_embedding: Vec<f32>,
    limit: Option<i64>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<Message>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .semantic_search(query_embedding, limit)
        .await
        .map_err(|e| format!("Failed to perform semantic search: {}", e))
}
