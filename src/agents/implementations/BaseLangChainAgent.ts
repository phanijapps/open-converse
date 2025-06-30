import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ChatAgent, AgentType, AgentCapabilities } from '../core/types';
import type { SettingsData } from '@shared/types';
import { AgentConfig } from '../config/llm';
import { ErrorHandler, NetworkError } from '../utils/errors';
import { validateMessage, sanitizeMessage } from '../utils/validation';

/**
 * Base implementation for LangChain.js-based agents
 * This class provides common functionality for all agent types
 */
export abstract class BaseLangChainAgent implements ChatAgent {
  public readonly type: AgentType;
  public readonly capabilities: AgentCapabilities;
  protected llm: ChatOpenAI;

  constructor(
    type: AgentType,
    capabilities: AgentCapabilities,
    settings: SettingsData
  ) {
    this.type = type;
    this.capabilities = capabilities;
    this.llm = this.createLLM(settings);
  }

  /**
   * Create and configure the LLM instance
   */
  private createLLM(settings: SettingsData): ChatOpenAI {
    const config = AgentConfig.getLLMConfig(settings);
    
    if (!config.apiKey) {
      throw new Error(`No API key found for ${this.type} agent. Please configure your settings.`);
    }

    return new ChatOpenAI({
      modelName: config.modelName,
      openAIApiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl,
      },
      temperature: this.capabilities.temperature,
      maxTokens: this.capabilities.maxTokens,
    });
  }

  /**
   * Send a message to the agent
   */
  async sendMessage(message: string, context?: any): Promise<string> {
    try {
      // Validate and sanitize message
      const validation = validateMessage(message);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      const sanitizedMessage = sanitizeMessage(message);
      
      // Prepare messages
      const messages = [
        new SystemMessage(this.capabilities.systemPrompt),
        new HumanMessage(sanitizedMessage),
      ];

      // Add context if provided
      if (context) {
        const contextMessage = this.formatContext(context);
        if (contextMessage) {
          messages.splice(1, 0, new SystemMessage(contextMessage));
        }
      }

      // Get response from LLM
      const response = await this.llm.invoke(messages);
      
      if (!response.content) {
        throw new Error('Empty response from agent');
      }

      return response.content as string;
      
    } catch (error) {
      const agentError = ErrorHandler.createError(error, this.type);
      ErrorHandler.logError(agentError, { message, context });
      throw agentError;
    }
  }

  /**
   * Format context information for the agent
   * Can be overridden by specific agent implementations
   */
  protected formatContext(context: any): string | null {
    if (!context) return null;
    
    if (typeof context === 'string') {
      return `Context: ${context}`;
    }
    
    if (typeof context === 'object') {
      try {
        return `Context: ${JSON.stringify(context, null, 2)}`;
      } catch {
        return 'Context: [Complex object]';
      }
    }
    
    return `Context: ${String(context)}`;
  }

  /**
   * Update agent configuration
   */
  updateCapabilities(newCapabilities: Partial<AgentCapabilities>): void {
    Object.assign(this.capabilities, newCapabilities);
    
    // Update LLM settings
    if (newCapabilities.temperature !== undefined) {
      this.llm.temperature = newCapabilities.temperature;
    }
    if (newCapabilities.maxTokens !== undefined) {
      this.llm.maxTokens = newCapabilities.maxTokens;
    }
  }

  /**
   * Get agent information
   */
  getInfo(): {
    type: AgentType;
    name: string;
    description: string;
    temperature: number;
    maxTokens: number;
  } {
    return {
      type: this.type,
      name: this.capabilities.name,
      description: this.capabilities.description,
      temperature: this.capabilities.temperature,
      maxTokens: this.capabilities.maxTokens,
    };
  }
}
