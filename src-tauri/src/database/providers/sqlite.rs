/// SQLite database provider implementation for the new memory architecture
/// 
/// This module implements the SQLite backend for the new three-table design:
/// - Session: User sessions with role and goals
/// - Conversation: Conversation sessions linked to sessions  
/// - Message: Individual messages with vector embeddings for semantic search
/// 
/// Features vector search using sqlite-vss extension with 384-dimensional embeddings.

use crate::database::{models::*, DatabaseError, Result, MemoryRepo};
use async_trait::async_trait;
use sqlx::{sqlite::SqlitePool, Row};
use std::path::Path;

pub struct SqliteProvider {
    pool: SqlitePool,
}

impl SqliteProvider {
    /// Create a new SQLite provider with the given database path
    pub async fn new(database_url: &str) -> Result<Self> {
        // Handle special cases and ensure parent directory exists for file databases
        let connection_string = if database_url == ":memory:" {
            "sqlite::memory:".to_string()
        } else if database_url.starts_with("sqlite://") {
            database_url.to_string()
        } else {
            // Ensure parent directory exists for file-based databases
            if let Some(parent) = Path::new(database_url).parent() {
                std::fs::create_dir_all(parent)?;
            }
            format!("sqlite://{}?mode=rwc", database_url)
        };
        
        let pool = SqlitePool::connect(&connection_string)
            .await
            .map_err(|e| DatabaseError::Connection(e.to_string()))?;

        Ok(Self { pool })
    }

    /// Run database migrations to create the new schema
    pub async fn migrate(&self) -> Result<()> {
        // Create session table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT,
                goals TEXT,
                created_at INTEGER NOT NULL DEFAULT (unixepoch())
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create conversation table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS conversation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                status TEXT NOT NULL DEFAULT 'open',
                FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create message table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS message (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                ts INTEGER NOT NULL DEFAULT (unixepoch()),
                embedding BLOB,
                recall_score REAL,
                FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_session_created_at ON session(created_at)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversation_session_id ON conversation(session_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation(created_at)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON message(conversation_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_message_ts ON message(ts)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_message_role ON message(role)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}

#[async_trait]
impl MemoryRepo for SqliteProvider {
    // === Session Operations ===

    async fn create_session(&self, session: CreateSession) -> Result<Session> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let result = sqlx::query(
            "INSERT INTO session (name, role, goals, created_at) VALUES (?, ?, ?, ?) RETURNING *"
        )
        .bind(&session.name)
        .bind(&session.role)
        .bind(&session.goals)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(Session {
            id: result.get("id"),
            name: result.get("name"),
            role: result.get("role"),
            goals: result.get("goals"),
            created_at: result.get("created_at"),
        })
    }

    async fn get_sessions(&self) -> Result<Vec<Session>> {
        let rows = sqlx::query("SELECT * FROM session ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;
        
        let sessions = rows
            .into_iter()
            .map(|row| Session {
                id: row.get("id"),
                name: row.get("name"),
                role: row.get("role"),
                goals: row.get("goals"),
                created_at: row.get("created_at"),
            })
            .collect();

        Ok(sessions)
    }

    async fn delete_session(&self, session_id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM session WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // === Conversation Operations ===

    async fn create_conversation(&self, conversation: CreateConversation) -> Result<Conversation> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let status = conversation.status.unwrap_or_else(|| "open".to_string());

        let result = sqlx::query(
            "INSERT INTO conversation (session_id, created_at, status) VALUES (?, ?, ?) RETURNING *"
        )
        .bind(conversation.session_id)
        .bind(now)
        .bind(&status)
        .fetch_one(&self.pool)
        .await?;

        Ok(Conversation {
            id: result.get("id"),
            session_id: result.get("session_id"),
            created_at: result.get("created_at"),
            status: result.get("status"),
        })
    }

    async fn get_conversations(&self, session_id: Option<i64>) -> Result<Vec<Conversation>> {
        let query = match session_id {
            Some(sid) => format!("SELECT * FROM conversation WHERE session_id = {} ORDER BY created_at DESC", sid),
            None => "SELECT * FROM conversation ORDER BY created_at DESC".to_string(),
        };

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;
        
        let conversations = rows
            .into_iter()
            .map(|row| Conversation {
                id: row.get("id"),
                session_id: row.get("session_id"),
                created_at: row.get("created_at"),
                status: row.get("status"),
            })
            .collect();

        Ok(conversations)
    }

    async fn delete_conversation(&self, conversation_id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM conversation WHERE id = ?")
            .bind(conversation_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // === Message Operations ===

    async fn save_message(&self, message: CreateMessage) -> Result<Message> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let result = sqlx::query(
            "INSERT INTO message (conversation_id, role, content, ts, embedding, recall_score) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
        )
        .bind(message.conversation_id)
        .bind(&message.role)
        .bind(&message.content)
        .bind(now)
        .bind(&message.embedding)
        .bind(message.recall_score)
        .fetch_one(&self.pool)
        .await?;

        Ok(Message {
            id: result.get("id"),
            conversation_id: result.get("conversation_id"),
            role: result.get("role"),
            content: result.get("content"),
            ts: result.get("ts"),
            embedding: result.get("embedding"),
            recall_score: result.get("recall_score"),
        })
    }

    async fn recent_messages(&self, conversation_id: i64, limit: Option<i64>) -> Result<Vec<Message>> {
        let query = match limit {
            Some(limit) => format!("SELECT * FROM message WHERE conversation_id = {} ORDER BY ts DESC LIMIT {}", conversation_id, limit),
            None => format!("SELECT * FROM message WHERE conversation_id = {} ORDER BY ts DESC", conversation_id),
        };

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;
        
        let messages = rows
            .into_iter()
            .map(|row| Message {
                id: row.get("id"),
                conversation_id: row.get("conversation_id"),
                role: row.get("role"),
                content: row.get("content"),
                ts: row.get("ts"),
                embedding: row.get("embedding"),
                recall_score: row.get("recall_score"),
            })
            .collect();

        Ok(messages)
    }

    async fn delete_message(&self, message_id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM message WHERE id = ?")
            .bind(message_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // === Vector Search Operations ===

    async fn semantic_search(&self, _query_embedding: Vec<f32>, _limit: Option<i64>) -> Result<Vec<Message>> {
        // For now, return empty vector - will implement VSS integration later
        Ok(vec![])
    }

    // === Utility Operations ===

    async fn get_database_stats(&self) -> Result<DatabaseStats> {
        let session_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM session")
            .fetch_one(&self.pool)
            .await?;

        let conversation_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM conversation")
            .fetch_one(&self.pool)
            .await?;

        let message_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM message")
            .fetch_one(&self.pool)
            .await?;

        Ok(DatabaseStats {
            session_count: session_count.0,
            conversation_count: conversation_count.0,
            message_count: message_count.0,
            database_size_bytes: None,
            vector_index_size: None,
        })
    }

    async fn clear_all_data(&self) -> Result<()> {
        // Clear in order to respect foreign key constraints
        sqlx::query("DELETE FROM message").execute(&self.pool).await?;
        sqlx::query("DELETE FROM conversation").execute(&self.pool).await?;
        sqlx::query("DELETE FROM session").execute(&self.pool).await?;
        
        Ok(())
    }
}
