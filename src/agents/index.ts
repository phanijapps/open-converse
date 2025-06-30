// Core exports
export { AgentFactory } from './core/factory';
export { AgentManager } from './core/AgentManager';

// Type exports
export type { 
  AgentType, 
  ChatAgent, 
  AgentCapabilities, 
  ChatRequest, 
  ChatResponse,
  AgentConfig,
  AgentMessage,
  AgentResponse
} from './core/types';

// Configuration exports
export { DEFAULT_AGENT_CONFIGS, LLM_PROVIDERS } from './config/defaults';
export { AgentConfig as LLMConfig } from './config/llm';
export type { LLMProviderType } from './config/defaults';

// Utility exports
export { 
  isValidAgentType, 
  validateAgentCapabilities, 
  validateSettingsForAgents,
  sanitizeMessage,
  validateMessage 
} from './utils/validation';

export {
  AgentError,
  ConfigurationError,
  NetworkError,
  ValidationError,
  ErrorHandler
} from './utils/errors';

// Implementation exports (for advanced usage)
export { BaseLangChainAgent } from './implementations/BaseLangChainAgent';
