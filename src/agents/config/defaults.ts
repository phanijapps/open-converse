import type { AgentType, AgentCapabilities } from '../core/types';

/**
 * Default agent configurations
 * These can be overridden by user settings or environment variables
 */
export const DEFAULT_AGENT_CONFIGS: Record<AgentType, AgentCapabilities> = {
  general: {
    name: 'General Assistant',
    description: 'A versatile AI assistant for general conversations and tasks',
    systemPrompt: 'You are a helpful, knowledgeable, and friendly AI assistant. Provide clear, accurate, and engaging responses to help users with a wide variety of tasks and questions.',
    temperature: 0.7,
    maxTokens: 1000,
  },
  code: {
    name: 'Code Assistant',
    description: 'Specialized in programming, debugging, and technical explanations',
    systemPrompt: 'You are an expert programming assistant. Help users write, debug, and understand code. Provide clear explanations, best practices, and practical solutions. Format code properly and explain complex concepts simply.',
    temperature: 0.3,
    maxTokens: 1500,
  },
  research: {
    name: 'Research Assistant',
    description: 'Focused on analysis, fact-checking, and detailed investigations',
    systemPrompt: 'You are a thorough research assistant. Provide well-researched, factual information with proper analysis. Break down complex topics, cite reasoning, and present information in a structured, easy-to-understand manner.',
    temperature: 0.4,
    maxTokens: 1200,
  },
  creative: {
    name: 'Creative Assistant',
    description: 'Specialized in creative writing, brainstorming, and artistic tasks',
    systemPrompt: 'You are a creative assistant focused on imagination and artistic expression. Help users with creative writing, brainstorming, storytelling, and artistic projects. Be imaginative, inspiring, and encourage creative exploration.',
    temperature: 0.9,
    maxTokens: 1000,
  },
};

/**
 * LLM Provider configurations
 */
export const LLM_PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat-v3-0324',
    supportedModels: [
      'deepseek/deepseek-chat-v3-0324',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.2-90b-vision-instruct',
    ],
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    supportedModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
  },
} as const;

export type LLMProviderType = keyof typeof LLM_PROVIDERS;
