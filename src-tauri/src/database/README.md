# OpenConverse Database Module

This module provides a modular database abstraction layer for OpenConverse's memory management system. It's designed to support multiple database backends with a focus on SQLite for the initial implementation.

## Architecture

The database module follows a layered architecture:

```
database/
├── mod.rs              # Main module and database manager
├── models.rs           # Data models and structures
├── migrations.rs       # Schema migration system
├── commands.rs         # Tauri commands for frontend integration
└── providers/          # Database backend implementations
    ├── mod.rs
    └── sqlite.rs       # SQLite implementation
```

## Core Components

### Database Manager (`DatabaseManager`)

The main entry point that orchestrates database operations and manages connections.

### Data Models

#### LongTermMemory
- **Purpose**: Persistent conversation memory that survives across sessions
- **Schema**: 
  - `id`: Primary key
  - `content`: Text content
  - `created_at`: Timestamp
  - `metadata`: Optional JSON metadata

#### ShortTermMemory
- **Purpose**: Temporary conversation context with automatic expiration
- **Schema**:
  - `id`: Primary key
  - `content`: Text content
  - `expires_at`: Expiration timestamp
  - `created_at`: Creation timestamp
  - `metadata`: Optional JSON metadata

#### VectorDB
- **Purpose**: Vector embeddings for semantic search (prepared for Langchain integration)
- **Schema**:
  - `id`: Primary key
  - `document_id`: UUID for document identification
  - `content`: Original text content
  - `embedding`: Serialized vector embedding (for future use)
  - `collection_name`: Namespace for organizing vectors
  - `metadata`: Optional JSON metadata
  - `created_at`: Timestamp

### Database Providers

#### SQLite Provider (`SqliteProvider`)
- Primary database backend
- File-based storage at `~/.openconv/settings/db/conv.db`
- Full CRUD operations for all memory tables
- Automatic migrations and indexing

## Configuration

The database uses a simple configuration system:

```rust
DatabaseConfig {
    provider: DatabaseProvider::SQLite,
    connection_string: "/path/to/database.db"
}
```

## Tauri Commands

All database operations are exposed as Tauri commands for frontend use:

### Memory Management
- `clear_long_term_memory()`: Clear all long-term memories
- `clear_short_term_memory()`: Clear all short-term memories  
- `clear_vector_db()`: Clear all vector database entries

### Database Operations
- `init_database(path?)`: Initialize database at specified path
- `get_database_path()`: Get current database path
- `get_database_stats()`: Get usage statistics

### Long-Term Memory
- `create_long_term_memory(content, metadata?)`
- `get_long_term_memories(limit?)`
- `delete_long_term_memory(id)`

### Short-Term Memory
- `create_short_term_memory(content, expires_at, metadata?)`
- `get_short_term_memories(include_expired)`
- `delete_short_term_memory(id)`
- `cleanup_expired_short_term_memory()`

### Vector Database
- `create_vector_db_entry(content, collection_name, document_id?, metadata?)`
- `get_vector_db_entries(collection_name?)`
- `get_vector_db_entry_by_document_id(document_id)`
- `delete_vector_db_entry(id)`

## Usage Examples

### Frontend Integration

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Initialize database
await invoke('init_database');

// Clear memories
await invoke('clear_long_term_memory');
await invoke('clear_short_term_memory');
await invoke('clear_vector_db');

// Create long-term memory
const memory = await invoke('create_long_term_memory', {
  content: 'User prefers concise responses',
  metadata: JSON.stringify({ priority: 'high' })
});

// Get database statistics
const stats = await invoke('get_database_stats');
console.log(`Long-term memories: ${stats.long_term_count}`);
```

### Rust Backend Usage

```rust
// Initialize database
let config = DatabaseConfig {
    provider: DatabaseProvider::SQLite,
    connection_string: "/path/to/db.sqlite".to_string(),
};

let manager = DatabaseManager::new(config).await?;
manager.migrate().await?;

// Clear all memories
manager.clear_long_term_memory().await?;
```

## Migration System

The migration system ensures database schema consistency:

1. **Migration Tracking**: All applied migrations are tracked in `schema_migrations` table
2. **Versioning**: Each migration has a unique version number
3. **Rollback Support**: Migrations can define rollback SQL (optional)
4. **Automatic Application**: Pending migrations are applied during initialization

## Future Extensibility

### Langchain Integration

The VectorDB table is designed to support Langchain Chroma integration:

- `document_id`: Maps to Langchain document IDs
- `embedding`: Will store vector embeddings
- `collection_name`: Maps to Chroma collections
- `metadata`: Supports Langchain metadata format

### Additional Database Backends

New providers can be added by:

1. Creating a new provider module (e.g., `providers/postgresql.rs`)
2. Implementing the same interface as `SqliteProvider`
3. Adding the provider to `DatabaseProvider` enum
4. Updating `DatabaseManager::new()` to handle the new provider

### Performance Optimizations

- **Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Built-in SQLx connection pooling
- **Batch Operations**: Ready for bulk insert/update operations
- **Async Operations**: Full async/await support

## Dependencies

- `sqlx`: Database toolkit with async support
- `chrono`: Date/time handling with UTC timestamps
- `uuid`: UUID generation for document IDs
- `serde`: Serialization for JSON metadata
- `thiserror`: Error handling

## Security Considerations

- **Path Validation**: Safe handling of database file paths
- **SQL Injection**: Uses parameterized queries exclusively
- **File Permissions**: Database files created with appropriate permissions
- **Error Handling**: Prevents information leakage in error messages

## Testing

The module is designed for comprehensive testing:

- Unit tests for each provider
- Integration tests for Tauri commands
- Migration testing with temporary databases
- Performance benchmarks for large datasets
