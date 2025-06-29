/// Data models for the new memory architecture
/// 
/// These models represent the structure of data stored in the new two-table design:
/// - Session: User sessions that act as both persona and conversation container
/// - Message: Individual messages with embeddings for semantic search

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Session represents a user session with specific role and goals that also acts as a conversation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Session {
    pub id: i64,
    pub name: String,
    pub role: Option<String>,
    pub goals: Option<String>,
    pub llm_provider: Option<String>,
    pub model_id: Option<String>,
    pub status: String, // 'open', 'closed', etc.
    pub created_at: i64, // Unix timestamp
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSession {
    pub name: String,
    pub role: Option<String>,
    pub goals: Option<String>,
    pub llm_provider: Option<String>,
    pub model_id: Option<String>,
    pub status: Option<String>, // Defaults to 'open'
}

/// Message represents individual messages with optional embeddings
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: i64,
    pub session_id: i64,
    pub role: String, // 'user', 'assistant', 'system'
    pub content: String,
    pub ts: i64, // Unix timestamp
    pub embedding: Option<Vec<u8>>, // Serialized vector embedding
    pub recall_score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMessage {
    pub session_id: i64,
    pub role: String,
    pub content: String,
    pub embedding: Option<Vec<u8>>,
    pub recall_score: Option<f64>,
}

/// Database statistics for the new architecture
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub session_count: i64,
    pub message_count: i64,
    pub database_size_bytes: Option<i64>,
    pub vector_index_size: Option<i64>,
}
