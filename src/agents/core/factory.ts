import type { AgentType, ChatAgent, AgentCapabilities } from './types';
import type { SettingsData } from '@shared/types';
import { DEFAULT_AGENT_CONFIGS } from '../config/defaults';
import { AgentConfig } from '../config/llm';
import { BaseLangChainAgent } from '../implementations/BaseLangChainAgent';
import { validateSettingsForAgents } from '../utils/validation';

/**
 * Concrete implementation of BaseLangChainAgent for all agent types
 * This is a simple implementation that uses the base class functionality
 */
class LangChainAgent extends BaseLangChainAgent {
  constructor(type: AgentType, capabilities: AgentCapabilities, settings: SettingsData) {
    super(type, capabilities, settings);
  }
}

/**
 * Factory class for creating and managing different types of AI agents
 * This is the main entry point for agent creation
 */
export class AgentFactory {
  /**
   * Create an agent of the specified type using current settings
   */
  static createAgent(agentType: AgentType, settings: SettingsData): ChatAgent {
    // Validate settings
    const validation = validateSettingsForAgents(settings);
    if (!validation.valid) {
      throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
    }

    // Validate configuration
    if (!AgentConfig.validateConfiguration(settings)) {
      throw new Error('No valid LLM provider configuration found. Please configure your API settings.');
    }

    // Get agent capabilities
    const capabilities = this.getAgentCapabilities(agentType);
    
    // Create and return agent
    return new LangChainAgent(agentType, capabilities, settings);
  }

  /**
   * Get capabilities for a specific agent type
   */
  static getAgentCapabilities(agentType: AgentType): AgentCapabilities {
    const config = DEFAULT_AGENT_CONFIGS[agentType];
    if (!config) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }
    
    // Return a copy to prevent mutations
    return { ...config };
  }

  /**
   * Get all available agent types
   */
  static getAllAgentTypes(): AgentType[] {
    return Object.keys(DEFAULT_AGENT_CONFIGS) as AgentType[];
  }

  /**
   * Validate that settings are sufficient for agent creation
   */
  static validateSettings(settings: SettingsData): boolean {
    const validation = validateSettingsForAgents(settings);
    return validation.valid && AgentConfig.validateConfiguration(settings);
  }

  /**
   * Get agent type information for UI display
   */
  static getAgentTypeInfo(): Array<{
    type: AgentType;
    name: string;
    description: string;
    temperature: number;
    maxTokens: number;
  }> {
    return this.getAllAgentTypes().map(type => {
      const capabilities = this.getAgentCapabilities(type);
      return {
        type,
        name: capabilities.name,
        description: capabilities.description,
        temperature: capabilities.temperature,
        maxTokens: capabilities.maxTokens,
      };
    });
  }

  /**
   * Create a custom agent with specific capabilities
   */
  static createCustomAgent(
    name: string,
    description: string,
    systemPrompt: string,
    settings: SettingsData,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): ChatAgent {
    const customCapabilities: AgentCapabilities = {
      name,
      description,
      systemPrompt,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
    };

    return new LangChainAgent('general', customCapabilities, settings);
  }
}
