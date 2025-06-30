// Shared types for OpenConverse

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

// Settings types
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

// --- Provider-agnostic settings structure ---
export interface ProviderConfig {
  id: string;
  description: string;
  base_url: string;
  api_key: string;
  enabled?: boolean;
  verified?: boolean;
  last_verified?: string;
  verification_error?: string;
}

export interface SettingsData {
  providers: ProviderConfig[];
  memory_config: MemoryConfig;
}
