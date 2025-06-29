-- Migration 002: Phase 1 Core - New Memory Architecture
-- Drops legacy three-table design and implements persona/conversation/message schema

-- === UP MIGRATION ===

-- Drop legacy tables and their indexes
DROP TABLE IF EXISTS vector_db;
DROP TABLE IF EXISTS short_term_memory;
DROP TABLE IF EXISTS long_term_memory;
DROP INDEX IF EXISTS idx_long_term_created_at;
DROP INDEX IF EXISTS idx_short_term_expires_at;
DROP INDEX IF EXISTS idx_vector_db_collection;
DROP INDEX IF EXISTS idx_vector_db_document_id;

-- Create new persona table
CREATE TABLE persona (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    goals TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create conversation table with foreign key to persona
CREATE TABLE conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    status TEXT NOT NULL DEFAULT 'open',
    FOREIGN KEY (persona_id) REFERENCES persona(id) ON DELETE CASCADE
);

-- Create message table with foreign key to conversation
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

-- Load VSS extension and create vector index for semantic search
-- Note: This requires sqlite-vss extension to be available
.load vss0

-- Create virtual table for 384-dimensional vector search using cosine similarity
CREATE VIRTUAL TABLE msg_idx USING vss0(
    embedding(384)
);

-- Create indexes for performance
CREATE INDEX idx_persona_created_at ON persona(created_at);
CREATE INDEX idx_conversation_persona_id ON conversation(persona_id);
CREATE INDEX idx_conversation_created_at ON conversation(created_at);
CREATE INDEX idx_message_conversation_id ON message(conversation_id);
CREATE INDEX idx_message_ts ON message(ts);
CREATE INDEX idx_message_role ON message(role);

-- === DOWN MIGRATION ===
-- Rollback script to recreate legacy tables

/*
-- Drop new tables
DROP TABLE IF EXISTS msg_idx;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS conversation;
DROP TABLE IF EXISTS persona;

-- Recreate legacy tables
CREATE TABLE long_term_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
);

CREATE TABLE short_term_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
);

CREATE TABLE vector_db (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    embedding BLOB,
    collection_name TEXT NOT NULL DEFAULT 'default',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recreate legacy indexes
CREATE INDEX idx_long_term_created_at ON long_term_memory(created_at);
CREATE INDEX idx_short_term_expires_at ON short_term_memory(expires_at);
CREATE INDEX idx_vector_db_collection ON vector_db(collection_name);
CREATE INDEX idx_vector_db_document_id ON vector_db(document_id);
*/
