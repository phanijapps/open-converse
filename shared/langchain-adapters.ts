/**
 * Adapters for converting between database Message format and LangChain message format
 */

import { Message, CreateMessage, Session } from './database-types';
import { SessionMemoryProvider } from './memory';

// LangChain message format (simplified)
export interface LangChainMessage {
  content: string;
  role: 'user' | 'assistant' | 'system';
  name?: string;
  function_call?: any;
  tool_calls?: any[];
}

// Chat message format used in the UI
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Convert database Message to LangChain format
 */
export function messageToLangChain(message: Message): LangChainMessage {
  return {
    content: message.content,
    role: message.role as 'user' | 'assistant' | 'system',
  };
}

/**
 * Convert array of database Messages to LangChain format
 */
export function messagesToLangChain(messages: Message[]): LangChainMessage[] {
  return messages.map(messageToLangChain);
}

/**
 * Convert database Message to UI ChatMessage format
 */
export function messageToChatMessage(message: Message): ChatMessage {
  return {
    id: message.id.toString(),
    sender: message.role === 'assistant' ? 'ai' : (message.role as 'user' | 'system'),
    content: message.content,
    timestamp: message.ts * 1000, // Convert Unix timestamp to JS timestamp
  };
}

/**
 * Convert array of database Messages to UI ChatMessage format
 */
export function messagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages.map(messageToChatMessage);
}

/**
 * Convert UI ChatMessage to database CreateMessage format
 */
export function chatMessageToCreateMessage(
  message: ChatMessage, 
  sessionId: number
): CreateMessage {
  return {
    session_id: sessionId,
    role: message.sender === 'ai' ? 'assistant' : message.sender,
    content: message.content,
    // Don't include embedding or recall_score for now
  };
}

/**
 * Convert LangChain message to database CreateMessage format
 */
export function langChainToCreateMessage(
  message: LangChainMessage, 
  sessionId: number
): CreateMessage {
  return {
    session_id: sessionId,
    role: message.role,
    content: message.content,
    // Don't include embedding or recall_score for now
  };
}

/**
 * Agent Session Manager - provides historical context to agents
 * This version is designed to work in the frontend with Tauri commands
 */
export class AgentSessionManager {
  /**
   * Get session context for agent processing using Tauri commands
   * This method should only be called from the frontend where tauriCommands are available
   */
  async getSessionContext(sessionId: number, tauriCommands: any): Promise<{
    session: Session;
    history: LangChainMessage[];
  }> {
    // Get session and messages using Tauri commands
    const [session, messages] = await Promise.all([
      tauriCommands.getSessionById(sessionId),
      tauriCommands.getRecentMessages(sessionId)
    ]);
    
    return {
      session,
      history: messagesToLangChain(messages), // Messages are now sorted chronologically in database query
    };
  }

  /**
   * Prepare message context for agent with full conversation history
   */
  async prepareAgentContext(sessionId: number, newMessage: string, tauriCommands: any): Promise<{
    session: Session;
    messages: LangChainMessage[];
  }> {
    const context = await this.getSessionContext(sessionId, tauriCommands);
    
    // Add the new user message to the context
    const newUserMessage: LangChainMessage = {
      content: newMessage,
      role: 'user',
    };

    return {
      session: context.session,
      messages: [...context.history, newUserMessage],
    };
  }
}

// Export singleton instance
export const agentSessionManager = new AgentSessionManager();
