import { Message, CreateMessage, Session } from './database-types';

// Generic interface for any memory provider
export interface MemoryProvider<TMemory, TCreateMemory> {
  getMemory(sessionId: number): Promise<TMemory[]>;
  addMemory(sessionId: number, memory: TCreateMemory): Promise<TMemory>;
  queryMemory?(sessionId: number, query: string): Promise<TMemory[]>; // Optional for semantic search
}

// Implementation using the Message table as memory
export class MessageMemoryProvider implements MemoryProvider<Message, CreateMessage> {
  async getMemory(sessionId: number): Promise<Message[]> {
    const res = await fetch(`/api/memory?sessionId=${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  }

  async addMemory(sessionId: number, memory: CreateMessage): Promise<Message> {
    const res = await fetch(`/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...memory, session_id: sessionId }),
    });
    if (!res.ok) throw new Error('Failed to add message');
    return res.json();
  }

  // Optionally implement queryMemory for future semantic search
}

// Utility to create a new session
type CreateSessionInput = Partial<Omit<Session, 'id' | 'created_at'>>;

export async function createSession(input: CreateSessionInput = {}): Promise<Session> {
  const res = await fetch('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, type: 'session' }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

// Utility to load session context for agents
export class SessionMemoryProvider extends MessageMemoryProvider {
  async getSessionContext(sessionId: number): Promise<{ session: Session; messages: Message[] }> {
    // In Tauri environment, we need to use the tauriCommands directly
    // This will be handled by the AgentSessionManager that imports the right utilities
    throw new Error('getSessionContext should be called from AgentSessionManager in Tauri environment');
  }

  async loadSessionForAgent(sessionId: number): Promise<{ session: Session; history: Message[] }> {
    // This will be implemented in the frontend where Tauri commands are available
    throw new Error('loadSessionForAgent should be called from frontend AgentSessionManager');
  }
}

// To add a new memory provider, implement MemoryProvider<T, U> and register it in the agent config.
