/// Data models for the new memory architecture
/// 
/// These models represent the structure of data stored in the new three-table design:
/// - Persona: User personas with roles and goals
/// - Conversation: Conversation sessions linked to personas
/// - Message: Individual messages with embeddings for semantic search

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Persona represents a user persona with specific role and goals
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Persona {
    pub id: i64,
    pub name: String,
    pub role: Option<String>,
    pub goals: Option<String>,
    pub created_at: i64, // Unix timestamp
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePersona {
    pub name: String,
    pub role: Option<String>,
    pub goals: Option<String>,
}

/// Conversation represents a conversation session linked to a persona
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Conversation {
    pub id: i64,
    pub persona_id: i64,
    pub created_at: i64, // Unix timestamp
    pub status: String,  // 'open', 'closed', etc.
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConversation {
    pub persona_id: i64,
    pub status: Option<String>, // Defaults to 'open'
}

/// Message represents individual messages with optional embeddings
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: i64,
    pub conversation_id: i64,
    pub role: String, // 'user', 'assistant', 'system'
    pub content: String,
    pub ts: i64, // Unix timestamp
    pub embedding: Option<Vec<u8>>, // Serialized vector embedding
    pub recall_score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMessage {
    pub conversation_id: i64,
    pub role: String,
    pub content: String,
    pub embedding: Option<Vec<u8>>,
    pub recall_score: Option<f64>,
}

/// Database statistics for the new architecture
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub persona_count: i64,
    pub conversation_count: i64,
    pub message_count: i64,
    pub database_size_bytes: Option<i64>,
    pub vector_index_size: Option<i64>,
}
