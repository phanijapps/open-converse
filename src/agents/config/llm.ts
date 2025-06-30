import type { SettingsData, ProviderConfig } from '@shared/types';
import { LLM_PROVIDERS, type LLMProviderType } from './defaults';

/**
 * Configuration utilities for agent system
 */
export class AgentConfig {
  /**
   * Find the best LLM provider from settings
   */
  static findLLMProvider(settings: SettingsData): {
    provider: ProviderConfig | null;
    providerType: LLMProviderType | null;
  } {
    // Try to find OpenRouter first (our default)
    let provider = settings.providers.find(
      p => p.id === 'openrouter' || 
           p.base_url.includes('openrouter.ai') ||
           p.description.toLowerCase().includes('openrouter')
    );
    
    if (provider && provider.enabled) {
      return { provider, providerType: 'openrouter' };
    }
    
    // Try to find OpenAI
    provider = settings.providers.find(
      p => p.id === 'openai' || 
           p.base_url.includes('api.openai.com') ||
           p.description.toLowerCase().includes('openai')
    );
    
    if (provider && provider.enabled) {
      return { provider, providerType: 'openai' };
    }
    
    // Return first enabled provider if any
    provider = settings.providers.find(p => p.enabled);
    if (provider) {
      return { provider, providerType: null };
    }
    
    return { provider: null, providerType: null };
  }

  /**
   * Get LLM configuration for agent creation
   */
  static getLLMConfig(settings: SettingsData): {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    providerType: LLMProviderType | null;
  } {
    const { provider, providerType } = this.findLLMProvider(settings);
    
    if (provider && provider.enabled) {
      const providerConfig = providerType ? LLM_PROVIDERS[providerType] : null;
      
      return {
        apiKey: provider.api_key,
        baseUrl: provider.base_url,
        modelName: providerConfig?.defaultModel || 'deepseek/deepseek-chat-v3-0324',
        providerType,
      };
    }
    
    // Fallback configuration
    return {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: LLM_PROVIDERS.openrouter.baseUrl,
      modelName: LLM_PROVIDERS.openrouter.defaultModel,
      providerType: 'openrouter',
    };
  }

  /**
   * Validate that we have a working LLM configuration
   */
  static validateConfiguration(settings: SettingsData): boolean {
    const { provider } = this.findLLMProvider(settings);
    return !!(provider && provider.enabled && provider.api_key);
  }

  /**
   * Get environment-specific overrides
   */
  static getEnvironmentOverrides(): Partial<{
    openrouterApiKey: string;
    openaiApiKey: string;
    defaultModel: string;
    defaultProvider: LLMProviderType;
  }> {
    return {
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.DEFAULT_MODEL,
      defaultProvider: process.env.DEFAULT_PROVIDER as LLMProviderType,
    };
  }
}
