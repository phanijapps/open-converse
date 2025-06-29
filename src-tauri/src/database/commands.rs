/// Tauri commands for the new memory architecture
/// 
/// This module exposes the new session/conversation/message operations to the frontend.
/// These commands provide a clean API for interacting with the new three-table design.

use crate::database::{models::*, DatabaseConfig, DatabaseManager, DatabaseProvider};
use crate::connectors::Connector;
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

// === Session Commands ===

#[tauri::command]
pub async fn create_session(
    name: String,
    role: Option<String>,
    goals: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<Session, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let create_session = CreateSession { name, role, goals };

    manager
        .memory_repo()
        .create_session(create_session)
        .await
        .map_err(|e| format!("Failed to create session: {}", e))
}

#[tauri::command]
pub async fn get_sessions(state: State<'_, DatabaseState>) -> Result<Vec<Session>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .get_sessions()
        .await
        .map_err(|e| format!("Failed to get sessions: {}", e))
}

#[tauri::command]
pub async fn delete_session(
    session_id: i64,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .delete_session(session_id)
        .await
        .map_err(|e| format!("Failed to delete session: {}", e))
}

// === Conversation Commands ===

#[tauri::command]
pub async fn create_conversation(
    session_id: i64,
    status: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<Conversation, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    let create_conversation = CreateConversation { session_id, status };

    manager
        .memory_repo()
        .create_conversation(create_conversation)
        .await
        .map_err(|e| format!("Failed to create conversation: {}", e))
}

#[tauri::command]
pub async fn get_conversations(
    session_id: Option<i64>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<Conversation>, String> {
    let state_guard = state.lock().await;
    let manager = state_guard
        .as_ref()
        .ok_or("Database not initialized")?;

    manager
        .memory_repo()
        .get_conversations(session_id)
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

#[tauri::command]
pub async fn tauri_test_openrouter_settings(settings: std::collections::HashMap<String, String>) -> Result<bool, String> {
    println!("[Tauri] test_openrouter_settings called with: {:?}", settings);
    let connector = crate::connectors::OpenRouterConnector;
    match Connector::test_settings(&connector, &settings).await {
        Ok(result) => {
            println!("[Tauri] OpenRouter test result: {}", result);
            Ok(result)
        },
        Err(e) => {
            println!("[Tauri] OpenRouter test error: {:?}", e);
            Err(format!("OpenRouter test failed: {:?}", e))
        }
    }
}
