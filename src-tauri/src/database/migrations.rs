/// Database migration system
/// 
/// This module handles database schema versioning and migrations.
/// It ensures the database schema is up-to-date and provides a way
/// to add new migrations as the schema evolves.

/// Migration trait for defining database schema changes
pub trait Migration {
    fn version(&self) -> i32;
    fn description(&self) -> &str;
    fn up_sql(&self) -> &str;
    fn down_sql(&self) -> Option<&str>;
}

/// Initial migration to create the core memory tables
pub struct InitialMigration;

impl Migration for InitialMigration {
    fn version(&self) -> i32 {
        1
    }

    fn description(&self) -> &str {
        "Create initial memory tables"
    }

    fn up_sql(&self) -> &str {
        r#"
        -- Create long_term_memory table
        CREATE TABLE IF NOT EXISTS long_term_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        );

        -- Create short_term_memory table
        CREATE TABLE IF NOT EXISTS short_term_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        );

        -- Create vector_db table
        CREATE TABLE IF NOT EXISTS vector_db (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT NOT NULL UNIQUE,
            content TEXT NOT NULL,
            embedding BLOB,
            collection_name TEXT NOT NULL DEFAULT 'default',
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_long_term_created_at ON long_term_memory(created_at);
        CREATE INDEX IF NOT EXISTS idx_short_term_expires_at ON short_term_memory(expires_at);
        CREATE INDEX IF NOT EXISTS idx_vector_db_collection ON vector_db(collection_name);
        CREATE INDEX IF NOT EXISTS idx_vector_db_document_id ON vector_db(document_id);

        -- Create migration tracking table
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        "#
    }

    fn down_sql(&self) -> Option<&str> {
        Some(r#"
        DROP TABLE IF EXISTS long_term_memory;
        DROP TABLE IF EXISTS short_term_memory;
        DROP TABLE IF EXISTS vector_db;
        DROP TABLE IF EXISTS schema_migrations;
        "#)
    }
}

/// Migration runner that applies pending migrations
pub struct MigrationRunner {
    migrations: Vec<Box<dyn Migration>>,
}

impl MigrationRunner {
    pub fn new() -> Self {
        Self {
            migrations: vec![Box::new(InitialMigration)],
        }
    }

    /// Add a new migration to the runner
    pub fn add_migration(mut self, migration: Box<dyn Migration>) -> Self {
        self.migrations.push(migration);
        self.migrations.sort_by_key(|m| m.version());
        self
    }

    /// Get all available migrations sorted by version
    pub fn get_migrations(&self) -> &[Box<dyn Migration>] {
        &self.migrations
    }
}

impl Default for MigrationRunner {
    fn default() -> Self {
        Self::new()
    }
}
