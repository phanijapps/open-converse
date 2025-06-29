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

-- Create new session table (acts as both persona and conversation)
CREATE TABLE session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    goals TEXT,
    llm_provider TEXT,
    model_id TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create message table with foreign key to session
CREATE TABLE message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    ts INTEGER NOT NULL DEFAULT (unixepoch()),
    embedding BLOB,
    recall_score REAL,
    FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
);

-- Load VSS extension and create vector index for semantic search
-- Note: This requires sqlite-vss extension to be available
.load vss0

-- Create virtual table for 384-dimensional vector search using cosine similarity
CREATE VIRTUAL TABLE msg_idx USING vss0(
    embedding(384)
);

-- Create indexes for performance
CREATE INDEX idx_session_created_at ON session(created_at);
CREATE INDEX idx_message_session_id ON message(session_id);
CREATE INDEX idx_message_ts ON message(ts);
CREATE INDEX idx_message_role ON message(role);

-- === DOWN MIGRATION ===
-- Rollback script to recreate legacy tables

/*
-- Drop new tables
DROP TABLE IF EXISTS msg_idx;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS session;

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
