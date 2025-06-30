/**
 * Agent session integration utilities
 */

import { AgentFactory } from '@/agents';
import { messagesToLangChain } from '@shared/langchain-adapters';
import { SessionMemoryProvider } from '@shared/memory';
import type { Session, Message } from '@shared/database-types';
import type { SettingsData } from '@shared/types';

export class AgentSessionManager {
  private memoryProvider: SessionMemoryProvider;
  public settings: SettingsData; // Made public for comparison

  constructor(settings: SettingsData) {
    this.memoryProvider = new SessionMemoryProvider();
    this.settings = settings;
  }

  /**
   * Send a message to an agent with full session context
   */
  async sendMessageWithContext(
    sessionId: number,
    message: string,
    agentType: 'general' | 'code' | 'research' | 'creative' = 'general'
  ): Promise<string> {
    try {
      // Load session context (session info + message history)
      const context = await this.memoryProvider.loadSessionForAgent(sessionId);
      
      // Create agent
      const agent = AgentFactory.createAgent(agentType, this.settings);
      
      // Convert message history to LangChain format
      const langChainHistory = messagesToLangChain(context.history);
      
      // For now, just send the message (context integration can be added later)
      const response = await agent.sendMessage(message);
      
      return response;
    } catch (error) {
      console.error('Failed to send message with context:', error);
      throw error;
    }
  }

  /**
   * Get session context for manual agent setup
   */
  async getSessionContext(sessionId: number) {
    return await this.memoryProvider.loadSessionForAgent(sessionId);
  }

  /**
   * Create a system message with session context
   */
  createSystemPrompt(session: Session, messageHistory: Message[]): string {
    let prompt = `You are an AI assistant`;
    
    if (session.role) {
      prompt += ` acting as: ${session.role}`;
    }
    
    if (session.goals) {
      prompt += `\nYour goals: ${session.goals}`;
    }
    
    if (messageHistory.length > 0) {
      prompt += `\nThis is a continuation of an existing conversation. The conversation history is provided in the messages above.`;
    }
    
    return prompt;
  }
}

/**
 * Singleton instance for easy access
 */
let agentSessionManager: AgentSessionManager | null = null;

export function getAgentSessionManager(settings: SettingsData): AgentSessionManager {
  if (!agentSessionManager || agentSessionManager.settings !== settings) {
    agentSessionManager = new AgentSessionManager(settings);
  }
  return agentSessionManager;
}
