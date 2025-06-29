/// Data models for the memory tables
/// 
/// These models represent the structure of data stored in each memory table:
/// - LongTermMemory: Persistent conversation memory
/// - ShortTermMemory: Temporary conversation context with expiration
/// - VectorDB: Vector embeddings for semantic search (future Langchain integration)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Long-term memory entry for persistent conversation context
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LongTermMemory {
    pub id: i64,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub metadata: Option<String>, // JSON metadata for future extensibility
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateLongTermMemory {
    pub content: String,
    pub metadata: Option<String>,
}

/// Short-term memory entry with expiration for temporary context
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ShortTermMemory {
    pub id: i64,
    pub content: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateShortTermMemory {
    pub content: String,
    pub expires_at: DateTime<Utc>,
    pub metadata: Option<String>,
}

/// Vector database entry for semantic search and embeddings
/// This is designed to be compatible with Langchain Chroma integration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VectorDbEntry {
    pub id: i64,
    pub document_id: String,        // UUID for document identification
    pub content: String,            // Original text content
    pub embedding: Option<Vec<u8>>, // Serialized vector embedding (future use)
    pub collection_name: String,    // Collection/namespace for organizing vectors
    pub metadata: Option<String>,   // JSON metadata (tags, source, etc.)
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVectorDbEntry {
    pub document_id: Option<String>, // Will generate UUID if not provided
    pub content: String,
    pub embedding: Option<Vec<u8>>,
    pub collection_name: String,
    pub metadata: Option<String>,
}

/// Database statistics for monitoring
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub long_term_count: i64,
    pub short_term_count: i64,
    pub vector_db_count: i64,
    pub database_size_bytes: Option<i64>,
}
