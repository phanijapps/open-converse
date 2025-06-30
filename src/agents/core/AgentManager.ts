import type { ChatAgent, AgentType } from './types';
import { AgentFactory } from './factory';
import { readSettings } from '@/utils/settings';
import type { SettingsData } from '@shared/types';

/**
 * Session-based agent manager for maintaining agent state across conversations
 * This class provides a higher-level interface for managing agents per session
 */
export class AgentManager {
  private static instance: AgentManager;
  private sessionAgents: Map<number, { agent: ChatAgent; type: AgentType }> = new Map();
  private settings: SettingsData | null = null;
  
  private constructor() {}
  
  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Initialize the manager with current settings
   */
  async initialize(): Promise<void> {
    this.settings = await readSettings();
  }

  /**
   * Get current settings (load if not cached)
   */
  private async getSettings(): Promise<SettingsData> {
    if (!this.settings) {
      this.settings = await readSettings();
    }
    return this.settings;
  }

  /**
   * Create an agent of the specified type using current settings
   */
  async createAgent(type: AgentType): Promise<ChatAgent> {
    const settings = await this.getSettings();
    return AgentFactory.createAgent(type, settings);
  }

  /**
   * Get or create an agent for a specific session
   */
  async getSessionAgent(sessionId: number, type: AgentType = 'general'): Promise<ChatAgent> {
    const existingSession = this.sessionAgents.get(sessionId);
    if (existingSession && existingSession.type === type) {
      return existingSession.agent;
    }
    
    // Create new agent for session
    const agent = await this.createAgent(type);
    this.sessionAgents.set(sessionId, { agent, type });
    return agent;
  }
  
  /**
   * Update agent configuration for a session
   */
  async updateSessionAgent(sessionId: number, type: AgentType): Promise<ChatAgent> {
    // Remove existing agent (no cleanup needed for our stateless agents)
    this.sessionAgents.delete(sessionId);
    
    // Create new agent with updated type
    const newAgent = await this.createAgent(type);
    this.sessionAgents.set(sessionId, { agent: newAgent, type });
    return newAgent;
  }
  
  /**
   * Remove agent for a session
   */
  removeSessionAgent(sessionId: number): void {
    this.sessionAgents.delete(sessionId);
  }
  
  /**
   * Get available agent types with their capabilities
   */
  getAvailableAgentTypes(): { type: AgentType; name: string; description: string }[] {
    return AgentFactory.getAllAgentTypes().map(type => {
      const capabilities = AgentFactory.getAgentCapabilities(type);
      return {
        type,
        name: capabilities.name,
        description: capabilities.description,
      };
    });
  }
  
  /**
   * Refresh settings cache (call when settings are updated)
   */
  async refreshSettings(): Promise<void> {
    this.settings = await readSettings();
    // Clear all session agents to force recreation with new settings
    this.sessionAgents.clear();
  }
  
  /**
   * Cleanup all agents (clear sessions)
   */
  cleanup(): void {
    this.sessionAgents.clear();
  }

  /**
   * Validate current settings for agent creation
   */
  async validateSettings(): Promise<boolean> {
    const settings = await this.getSettings();
    return AgentFactory.validateSettings(settings);
  }
}
