/// SQLite database provider implementation
/// 
/// This module implements the SQLite backend for the memory database system.
/// It provides CRUD operations for all three memory tables and handles
/// database migrations.

use crate::database::{models::*, DatabaseError, Result};
use chrono::Utc;
use sqlx::{sqlite::SqlitePool, Row};
use std::path::Path;
use uuid::Uuid;

pub struct SqliteProvider {
    pool: SqlitePool,
}

impl SqliteProvider {
    /// Create a new SQLite provider with the given database path
    pub async fn new(database_url: &str) -> Result<Self> {
        // Ensure parent directory exists
        if let Ok(path) = std::fs::canonicalize(database_url) {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)?;
            }
        } else {
            // If canonicalize fails, try to create parent of the intended path
            if let Some(parent) = Path::new(database_url).parent() {
                std::fs::create_dir_all(parent)?;
            }
        }

        let connection_string = format!("sqlite://{}", database_url);
        let pool = SqlitePool::connect(&connection_string)
            .await
            .map_err(|e| DatabaseError::Connection(e.to_string()))?;

        Ok(Self { pool })
    }

    /// Run database migrations to create tables
    pub async fn migrate(&self) -> Result<()> {
        // Create long_term_memory table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS long_term_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create short_term_memory table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS short_term_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create vector_db table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS vector_db (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                embedding BLOB,
                collection_name TEXT NOT NULL DEFAULT 'default',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for better performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_long_term_created_at ON long_term_memory(created_at)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_short_term_expires_at ON short_term_memory(expires_at)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_vector_db_collection ON vector_db(collection_name)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_vector_db_document_id ON vector_db(document_id)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // === Long Term Memory Operations ===

    pub async fn create_long_term_memory(&self, entry: CreateLongTermMemory) -> Result<LongTermMemory> {
        let now = Utc::now();
        let result = sqlx::query(
            "INSERT INTO long_term_memory (content, metadata, created_at) VALUES (?, ?, ?) RETURNING *"
        )
        .bind(&entry.content)
        .bind(&entry.metadata)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(LongTermMemory {
            id: result.get("id"),
            content: result.get("content"),
            created_at: result.get("created_at"),
            metadata: result.get("metadata"),
        })
    }

    pub async fn get_long_term_memories(&self, limit: Option<i64>) -> Result<Vec<LongTermMemory>> {
        let query = match limit {
            Some(limit) => format!("SELECT * FROM long_term_memory ORDER BY created_at DESC LIMIT {}", limit),
            None => "SELECT * FROM long_term_memory ORDER BY created_at DESC".to_string(),
        };

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;
        
        let memories = rows
            .into_iter()
            .map(|row| LongTermMemory {
                id: row.get("id"),
                content: row.get("content"),
                created_at: row.get("created_at"),
                metadata: row.get("metadata"),
            })
            .collect();

        Ok(memories)
    }

    pub async fn delete_long_term_memory(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM long_term_memory WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn clear_long_term_memory(&self) -> Result<()> {
        sqlx::query("DELETE FROM long_term_memory")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // === Short Term Memory Operations ===

    pub async fn create_short_term_memory(&self, entry: CreateShortTermMemory) -> Result<ShortTermMemory> {
        let now = Utc::now();
        let result = sqlx::query(
            "INSERT INTO short_term_memory (content, expires_at, metadata, created_at) VALUES (?, ?, ?, ?) RETURNING *"
        )
        .bind(&entry.content)
        .bind(entry.expires_at)
        .bind(&entry.metadata)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(ShortTermMemory {
            id: result.get("id"),
            content: result.get("content"),
            expires_at: result.get("expires_at"),
            created_at: result.get("created_at"),
            metadata: result.get("metadata"),
        })
    }

    pub async fn get_short_term_memories(&self, include_expired: bool) -> Result<Vec<ShortTermMemory>> {
        let query = if include_expired {
            "SELECT * FROM short_term_memory ORDER BY created_at DESC"
        } else {
            "SELECT * FROM short_term_memory WHERE expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC"
        };

        let rows = sqlx::query(query).fetch_all(&self.pool).await?;
        
        let memories = rows
            .into_iter()
            .map(|row| ShortTermMemory {
                id: row.get("id"),
                content: row.get("content"),
                expires_at: row.get("expires_at"),
                created_at: row.get("created_at"),
                metadata: row.get("metadata"),
            })
            .collect();

        Ok(memories)
    }

    pub async fn delete_short_term_memory(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM short_term_memory WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn clear_short_term_memory(&self) -> Result<()> {
        sqlx::query("DELETE FROM short_term_memory")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn cleanup_expired_short_term_memory(&self) -> Result<i64> {
        let result = sqlx::query("DELETE FROM short_term_memory WHERE expires_at <= CURRENT_TIMESTAMP")
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() as i64)
    }

    // === Vector DB Operations ===

    pub async fn create_vector_db_entry(&self, entry: CreateVectorDbEntry) -> Result<VectorDbEntry> {
        let document_id = entry.document_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now();

        let result = sqlx::query(
            "INSERT INTO vector_db (document_id, content, embedding, collection_name, metadata, created_at) 
             VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
        )
        .bind(&document_id)
        .bind(&entry.content)
        .bind(&entry.embedding)
        .bind(&entry.collection_name)
        .bind(&entry.metadata)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(VectorDbEntry {
            id: result.get("id"),
            document_id: result.get("document_id"),
            content: result.get("content"),
            embedding: result.get("embedding"),
            collection_name: result.get("collection_name"),
            metadata: result.get("metadata"),
            created_at: result.get("created_at"),
        })
    }

    pub async fn get_vector_db_entries(&self, collection_name: Option<String>) -> Result<Vec<VectorDbEntry>> {
        let (query, bind_collection) = match collection_name {
            Some(collection) => (
                "SELECT * FROM vector_db WHERE collection_name = ? ORDER BY created_at DESC",
                Some(collection),
            ),
            None => ("SELECT * FROM vector_db ORDER BY created_at DESC", None),
        };

        let mut query_builder = sqlx::query(query);
        if let Some(collection) = bind_collection {
            query_builder = query_builder.bind(collection);
        }

        let rows = query_builder.fetch_all(&self.pool).await?;

        let entries = rows
            .into_iter()
            .map(|row| VectorDbEntry {
                id: row.get("id"),
                document_id: row.get("document_id"),
                content: row.get("content"),
                embedding: row.get("embedding"),
                collection_name: row.get("collection_name"),
                metadata: row.get("metadata"),
                created_at: row.get("created_at"),
            })
            .collect();

        Ok(entries)
    }

    pub async fn get_vector_db_entry_by_document_id(&self, document_id: &str) -> Result<Option<VectorDbEntry>> {
        let row = sqlx::query("SELECT * FROM vector_db WHERE document_id = ?")
            .bind(document_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|row| VectorDbEntry {
            id: row.get("id"),
            document_id: row.get("document_id"),
            content: row.get("content"),
            embedding: row.get("embedding"),
            collection_name: row.get("collection_name"),
            metadata: row.get("metadata"),
            created_at: row.get("created_at"),
        }))
    }

    pub async fn delete_vector_db_entry(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM vector_db WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn clear_vector_db(&self) -> Result<()> {
        sqlx::query("DELETE FROM vector_db")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // === Statistics ===

    pub async fn get_database_stats(&self) -> Result<DatabaseStats> {
        let long_term_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM long_term_memory")
            .fetch_one(&self.pool)
            .await?;

        let short_term_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM short_term_memory")
            .fetch_one(&self.pool)
            .await?;

        let vector_db_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM vector_db")
            .fetch_one(&self.pool)
            .await?;

        Ok(DatabaseStats {
            long_term_count,
            short_term_count,
            vector_db_count,
            database_size_bytes: None, // SQLite doesn't easily provide this info
        })
    }
}
