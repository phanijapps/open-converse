# OpenConverse Memory Management Implementation

This document provides a complete implementation guide for the new memory management system in OpenConverse Tauri application.

## Phase 1 Architecture Overview

✅ **Completed Components:**

1. **New Memory Architecture** (`src-tauri/src/database/`)
   - Clean three-table design: Session, Conversation, Message
   - Modern async Rust backend with SQLx
   - MemoryRepo trait for clean abstraction
   - Vector search capability (ready for embedding integration)
   - Complete migration from legacy tables

2. **TypeScript Types** (`shared/database-types.ts`)
   - Updated type definitions for new schema
   - Utility functions for date handling and metadata
   - Example usage patterns

3. **Settings Page Integration** (`src/pages/settings.tsx`)
   - Memory management UI works with new backend
   - Database statistics display for new tables
   - Clear memory operations with user feedback
   - Real-time status updates

## New Database Architecture

### Schema Design

```
database/
├── mod.rs              # Main module with MemoryRepo trait
├── models.rs           # Data models (Session, Conversation, Message)
├── providers/
│   ├── mod.rs
│   └── sqlite.rs       # SQLite implementation of MemoryRepo
├── migrations.rs       # Schema migration system
├── commands.rs         # Tauri commands for frontend integration
└── tests/              # Comprehensive test suite
    ├── mod.rs
    └── phase1_core.rs
```

### Core Tables

#### 1. **session**
```sql
CREATE TABLE session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    goals TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

#### 2. **conversation** 
```sql
CREATE TABLE conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    status TEXT NOT NULL DEFAULT 'open',
    FOREIGN KEY (persona_id) REFERENCES persona(id) ON DELETE CASCADE
);
```

#### 3. **message**
```sql
CREATE TABLE message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    ts INTEGER NOT NULL DEFAULT (unixepoch()),
    embedding BLOB,
    recall_score REAL,
    FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE
);
```

### Key Features

- **Performance-Optimized**: Uses i64 integer IDs for better performance
- **Referential Integrity**: Proper foreign keys with CASCADE deletes
- **Vector Search Ready**: Embedding field prepared for semantic search
- **Type Safety**: Full Rust type safety with Serde serialization
- **Async Operations**: Built on SQLx with async/await support
- **Clean Abstractions**: MemoryRepo trait allows easy backend swapping
- **Comprehensive Testing**: Full test coverage for all operations

## API Reference

### MemoryRepo Trait

```rust
#[async_trait]
pub trait MemoryRepo {
    // Persona operations
    async fn create_persona(&self, persona: CreatePersona) -> Result<Persona>;
    async fn get_personas(&self) -> Result<Vec<Persona>>;
    async fn delete_persona(&self, persona_id: i64) -> Result<bool>;

    // Conversation operations  
    async fn create_conversation(&self, conversation: CreateConversation) -> Result<Conversation>;
    async fn get_conversations(&self, persona_id: Option<i64>) -> Result<Vec<Conversation>>;
    async fn delete_conversation(&self, conversation_id: i64) -> Result<bool>;

    // Message operations
    async fn save_message(&self, message: CreateMessage) -> Result<Message>;
    async fn recent_messages(&self, conversation_id: i64, limit: Option<i64>) -> Result<Vec<Message>>;
    async fn delete_message(&self, message_id: i64) -> Result<bool>;

    // Vector search operations
    async fn semantic_search(&self, query_embedding: Vec<f32>, limit: Option<i64>) -> Result<Vec<Message>>;

    // Utility operations
    async fn get_database_stats(&self) -> Result<DatabaseStats>;
    async fn clear_all_data(&self) -> Result<()>;
}
```

## Frontend Integration

### Available Tauri Commands

**Database Management:**
- `init_database(database_path?: string)`
- `get_database_path()`
- `get_database_stats()`
- `clear_all_memory()`

**Persona Operations:**
- `create_persona(name: string, role?: string, goals?: string)`
- `get_personas()`
- `delete_persona(persona_id: number)`

**Conversation Operations:**
- `create_conversation(persona_id: number, status?: string)`
- `get_conversations(persona_id?: number)`
- `delete_conversation(conversation_id: number)`

**Message Operations:**
- `save_message(conversation_id: number, role: string, content: string, embedding?: Uint8Array, recall_score?: number)`
- `get_recent_messages(conversation_id: number, limit?: number)`
- `delete_message(message_id: number)`

**Search Operations:**
- `semantic_search(query_embedding: number[], limit?: number)`

### Example Usage

```typescript
// Create a persona
const persona = await invoke('create_persona', {
    name: 'AI Assistant',
    role: 'Helper',
    goals: 'Assist users with their tasks'
});

// Start a conversation
const conversation = await invoke('create_conversation', {
    persona_id: persona.id,
    status: 'active'
});

// Save a message
const message = await invoke('save_message', {
    conversation_id: conversation.id,
    role: 'user',
    content: 'Hello, how can you help me?',
    recall_score: 0.9
});

// Get recent messages
const messages = await invoke('get_recent_messages', {
    conversation_id: conversation.id,
    limit: 10
});
```

## Migration Guide

### From Legacy Schema

The new architecture replaces the old three-table design:

**REMOVED:**
- `long_term_memory` → Replaced by `persona` + `conversation` + `message`
- `short_term_memory` → Replaced by `message` with timestamps
- `vector_db` → Replaced by `message.embedding` field

**BENEFITS:**
- Better data organization with clear relationships
- Improved query performance with proper indexing
- Cleaner API with focused operations
- Vector search ready for AI integration
- Easier testing and maintenance

### Database Location

Default database path: `~/.openconv/settings/db/conv.db`

Tables available after migration:
- `persona`
- `conversation` 
- `message`

## Testing

Comprehensive test suite covers:
- Persona CRUD operations
- Conversation management
- Message storage and retrieval
- Database statistics
- Data clearing operations
- Foreign key constraints
- Error handling

Run tests: `cargo test database::tests::phase1_core`

### Settings Page Features

When SQLite is selected in the Memory section:

1. **Database Information**:
   - Shows database file location (`~/.openconv/settings/db/conv.db`)
   - Real-time statistics (count of each memory type)
   - Database initialization status

2. **Memory Management**:
   - Clear Long-term Memory button
   - Clear Short-term Memory button  
   - Clear Vector Database button
   - Operation feedback with success/error messages

3. **Automatic Features**:
   - Database auto-initialization on tab switch
   - Statistics refresh after operations
   - Loading states for all async operations

## Usage Examples

### Frontend TypeScript

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import type { DatabaseStats, LongTermMemory } from '@shared/database-types';

// Initialize database
await invoke('init_database');

// Get statistics
const stats: DatabaseStats = await invoke('get_database_stats');
console.log(`Total memories: ${stats.long_term_count + stats.short_term_count}`);

// Create long-term memory
const memory: LongTermMemory = await invoke('create_long_term_memory', {
  content: 'User prefers technical explanations',
  metadata: JSON.stringify({ category: 'preference', priority: 'high' })
});

// Clear all memory types
await invoke('clear_long_term_memory');
await invoke('clear_short_term_memory');  
await invoke('clear_vector_db');
```

### Rust Backend

```rust
use crate::database::{DatabaseConfig, DatabaseManager, DatabaseProvider};

// Initialize database manager
let config = DatabaseConfig {
    provider: DatabaseProvider::SQLite,
    connection_string: "~/.openconv/settings/db/conv.db".to_string(),
};

let manager = DatabaseManager::new(config).await?;
manager.migrate().await?;

// Clear operations
manager.clear_long_term_memory().await?;
manager.clear_short_term_memory().await?;
manager.clear_vector_db().await?;
```

## Database Schema

### LongTermMemory Table
```sql
CREATE TABLE long_term_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON metadata
);
```

### ShortTermMemory Table
```sql
CREATE TABLE short_term_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON metadata
);
```

### VectorDB Table (Langchain Ready)
```sql
CREATE TABLE vector_db (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL UNIQUE,  -- UUID for document identification
    content TEXT NOT NULL,              -- Original text content
    embedding BLOB,                     -- Serialized vector embedding (future)
    collection_name TEXT NOT NULL DEFAULT 'default',  -- Namespace
    metadata TEXT,                      -- JSON metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Optimizations

- **Indexes**: Strategic indexes on frequently queried columns
- **Connection Pooling**: SQLx provides built-in connection pooling
- **Async Operations**: Non-blocking database operations
- **Prepared Statements**: All queries use parameterized statements

## Security Features

- **SQL Injection Prevention**: Parameterized queries only
- **Path Validation**: Safe handling of database file paths
- **Error Sanitization**: No sensitive information in error messages
- **Local Storage**: SQLite keeps data completely local

## Future Langchain Integration

The VectorDB table is designed for seamless Langchain Chroma integration:

```python
# Future Langchain integration example
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

# The VectorDB table structure maps to:
embeddings = OpenAIEmbeddings()
vectorstore = Chroma(
    collection_name="default",  # Maps to collection_name column
    embedding_function=embeddings,
    persist_directory="~/.openconv/settings/db/"
)

# document_id maps to Chroma document IDs
# embedding column will store vector embeddings
# metadata column stores Langchain metadata
```

## Extension Points

### Adding New Database Backends

1. Create new provider (e.g., `providers/postgresql.rs`)
2. Implement same interface as `SqliteProvider`
3. Add to `DatabaseProvider` enum
4. Update `DatabaseManager::new()`

### Adding New Memory Tables

1. Define model in `models.rs`
2. Add creation SQL to migration
3. Implement CRUD methods in provider
4. Add Tauri commands in `commands.rs`

## Testing Recommendations

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_memory_operations() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        
        let config = DatabaseConfig {
            provider: DatabaseProvider::SQLite,
            connection_string: db_path.to_string_lossy().to_string(),
        };
        
        let manager = DatabaseManager::new(config).await.unwrap();
        manager.migrate().await.unwrap();
        
        // Test memory operations
        manager.clear_long_term_memory().await.unwrap();
        
        let stats = manager.provider().get_database_stats().await.unwrap();
        assert_eq!(stats.long_term_count, 0);
    }
}
```

## Deployment Considerations

1. **Database File Location**: Ensure `~/.openconv/settings/db/` directory is created
2. **Permissions**: Database files should have appropriate read/write permissions
3. **Backup Strategy**: Consider periodic backups of the SQLite database
4. **Migration Safety**: Test migrations thoroughly before deployment

## Troubleshooting

### Common Issues

1. **Database File Creation**: Ensure parent directories exist
2. **Permission Errors**: Check file system permissions
3. **Migration Failures**: Verify schema compatibility
4. **Connection Errors**: Validate database file path

### Debug Commands

```bash
# Check database file
ls -la ~/.openconv/settings/db/

# Verify database schema
sqlite3 ~/.openconv/settings/db/conv.db ".schema"

# Check table contents
sqlite3 ~/.openconv/settings/db/conv.db "SELECT COUNT(*) FROM long_term_memory;"
```

This implementation provides a solid foundation for memory management in OpenConverse, with clear extension points for future enhancements like Langchain integration and additional database backends.
