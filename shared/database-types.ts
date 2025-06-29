/**
 * TypeScript types for OpenConverse database operations
 * 
 * These types correspond to the new session/message architecture
 * and provide type safety for frontend database interactions.
 */

// === New Database Models (Phase 1 Core) ===

export interface Session {
  id: number;
  name: string;
  role?: string;
  goals?: string;
  llm_provider?: string;
  model_id?: string;
  status: string; // 'open', 'closed', etc.
  created_at: number; // Unix timestamp
}

export interface Message {
  id: number;
  session_id: number;
  role: string; // 'user' | 'assistant' | 'system'
  content: string;
  ts: number; // Unix timestamp
  embedding?: number[]; // Vector embedding for semantic search
  recall_score?: number;
}

export interface DatabaseStats {
  session_count: number;
  message_count: number;
  database_size_bytes?: number;
  vector_index_size?: number;
}

// === Input Types for Creating Records ===

export interface CreateSession {
  name: string;
  role?: string;
  goals?: string;
  llm_provider?: string;
  model_id?: string;
  status?: string;
}

export interface CreateMessage {
  session_id: number;
  role: string;
  content: string;
  embedding?: number[];
  recall_score?: number;
}

// === Legacy Database Models (Deprecated) ===
// These are kept for backward compatibility during migration

export interface LongTermMemory {
  id: number;
  content: string;
  created_at: string; // ISO 8601 timestamp
  metadata?: string;  // JSON string
}

export interface ShortTermMemory {
  id: number;
  content: string;
  expires_at: string; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  metadata?: string;  // JSON string
}

export interface VectorDbEntry {
  id: number;
  document_id: string;
  content: string;
  embedding?: number[]; // Will be null initially, populated with Langchain
  collection_name: string;
  metadata?: string;    // JSON string
  created_at: string;   // ISO 8601 timestamp
}

// Legacy stats (deprecated)
export interface LegacyDatabaseStats {
  long_term_count: number;
  short_term_count: number;
  vector_db_count: number;
  database_size_bytes?: number;
}

// === Input Types for Creating Legacy Records ===

export interface CreateLongTermMemory {
  content: string;
  metadata?: string;
}

export interface CreateShortTermMemory {
  content: string;
  expires_at: string; // ISO 8601 timestamp
  metadata?: string;
}

export interface CreateVectorDbEntry {
  content: string;
  collection_name: string;
  document_id?: string; // Will generate UUID if not provided
  metadata?: string;
}

// Database Commands
export interface DatabaseCommands {
  // Database Management
  init_database(database_path?: string): Promise<string>;
  get_database_path(): Promise<string>;
  get_database_stats(): Promise<DatabaseStats>;

  // Memory Clearing
  clear_long_term_memory(): Promise<string>;
  clear_short_term_memory(): Promise<string>;
  clear_vector_db(): Promise<string>;

  // Long-Term Memory
  create_long_term_memory(content: string, metadata?: string): Promise<LongTermMemory>;
  get_long_term_memories(limit?: number): Promise<LongTermMemory[]>;
  delete_long_term_memory(id: number): Promise<boolean>;

  // Short-Term Memory
  create_short_term_memory(
    content: string,
    expires_at: string,
    metadata?: string
  ): Promise<ShortTermMemory>;
  get_short_term_memories(include_expired: boolean): Promise<ShortTermMemory[]>;
  delete_short_term_memory(id: number): Promise<boolean>;
  cleanup_expired_short_term_memory(): Promise<number>;

  // Vector Database
  create_vector_db_entry(
    content: string,
    collection_name: string,
    document_id?: string,
    metadata?: string
  ): Promise<VectorDbEntry>;
  get_vector_db_entries(collection_name?: string): Promise<VectorDbEntry[]>;
  get_vector_db_entry_by_document_id(document_id: string): Promise<VectorDbEntry | null>;
  delete_vector_db_entry(id: number): Promise<boolean>;
}

// === Utility Classes ===

export class DatabaseUtils {
  /**
   * Convert Unix timestamp to JavaScript Date
   */
  static timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  /**
   * Convert JavaScript Date to Unix timestamp
   */
  static dateToTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Create an expiration date for short-term memory (legacy)
   */
  static createExpirationDate(hours: number): string {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  }

  /**
   * Check if a short-term memory has expired (legacy)
   */
  static isExpired(memory: ShortTermMemory): boolean {
    return new Date(memory.expires_at) < new Date();
  }

  /**
   * Parse metadata from JSON string
   */
  static parseMetadata(metadata?: string): any {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  /**
   * Stringify metadata to JSON
   */
  static stringifyMetadata(metadata: any): string {
    return JSON.stringify(metadata);
  }
}

// === Example Usage with New Architecture ===
/*
import { invoke } from '@tauri-apps/api/core';

// Initialize database
await invoke('init_database');

// Create a session (now acts as both persona and conversation)
const session = await invoke('create_session', {
  name: 'Technical Assistant',
  role: 'AI Helper',
  goals: 'Provide accurate technical guidance',
  llm_provider: 'openrouter',
  model_id: 'anthropic/claude-3-haiku',
  status: 'open'
}) as Session;

// Save a message directly to the session
const message = await invoke('save_message', {
  session_id: session.id,
  role: 'user',
  content: 'How do I implement async functions in Rust?',
  embedding: null,
  recall_score: 0.9
}) as Message;

// Get database statistics
const stats = await invoke('get_database_stats') as DatabaseStats;
console.log(`Total sessions: ${stats.session_count}`);
console.log(`Total messages: ${stats.message_count}`);

// Get recent messages for a session
const recentMessages = await invoke('get_recent_messages', {
  session_id: session.id,
  limit: 10
}) as Message[];

// Clear all data
await invoke('clear_all_memory');
*/
