// Provider registry and types for LLM configuration

export interface LLMProviderTemplate {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  requiresAuth: boolean;
  testEndpoint?: string;
  apiKeyPattern?: RegExp;
  icon?: string;
}

export interface ConfiguredProvider extends LLMProviderTemplate {
  apiKey: string;
  enabled: boolean;
  verified: boolean;
  lastVerified?: Date;
  verificationError?: string;
}

export type VerificationStatus = 'idle' | 'checking' | 'verified' | 'error';

// Provider registry - easily extensible
export const PROVIDER_REGISTRY: Record<string, LLMProviderTemplate> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, GPT-3.5 and other OpenAI models',
    baseUrl: 'https://api.openai.com/v1',
    requiresAuth: true,
    testEndpoint: '/models',
    apiKeyPattern: /^sk-[a-zA-Z0-9]{48,}$/,
    icon: '🤖'
  },
  
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access to multiple AI models through a unified API',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresAuth: true,
    testEndpoint: '/models',
    apiKeyPattern: /^sk-or-[a-zA-Z0-9-]+$/,
    icon: '🔀'
  },
  
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local AI models running on your machine',
    baseUrl: 'http://localhost:11434',
    requiresAuth: false,
    testEndpoint: '/api/tags',
    icon: '🏠'
  },
  
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini Pro and other Google AI models',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    requiresAuth: true,
    testEndpoint: '/models',
    apiKeyPattern: /^[A-Za-z0-9_-]{39}$/,
    icon: '💎'
  },
  
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models for advanced reasoning and conversation',
    baseUrl: 'https://api.anthropic.com/v1',
    requiresAuth: true,
    testEndpoint: '/models',
    apiKeyPattern: /^sk-ant-[a-zA-Z0-9-_]{95,}$/,
    icon: '🧠'
  }
};

// Get all available providers
export const getAvailableProviders = (): LLMProviderTemplate[] => {
  return Object.values(PROVIDER_REGISTRY);
};

// Get provider by ID
export const getProviderById = (id: string): LLMProviderTemplate | undefined => {
  return PROVIDER_REGISTRY[id];
};
