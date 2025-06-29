// Shared types for OpenConverse

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: number;
}

// Settings types
export interface LLMProvider {
  providerId: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  enabled?: boolean;
  verified?: boolean;
  lastVerified?: Date;
  verificationError?: string;
}

export interface MemoryConfig {
  provider: 'sqlite' | 'supabase';
  config: {
    // SQLite config (empty for now)
    // Supabase config
    projectUrl?: string;
    apiKey?: string;
    connectionString?: string;
  };
}

export interface SettingsData {
  llmProviders: LLMProvider[];
  memoryConfig: MemoryConfig;
}
