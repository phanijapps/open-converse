/**
 * Types for the modular agent system
 */

export type AgentType = 'general' | 'code' | 'research' | 'creative';

export interface AgentCapabilities {
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface AgentConfig {
  llmProvider: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface AgentResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface ChatAgent {
  type: AgentType;
  capabilities: AgentCapabilities;
  sendMessage: (message: string, context?: any) => Promise<string>;
}

export interface ChatRequest {
  message: string;
  sessionId: number;
  agentType: AgentType;
  context?: any;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  agentType?: AgentType;
}
