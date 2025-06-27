// IPC Channel definitions
export enum IPCChannels {
  // App related
  GET_APP_VERSION = 'get-app-version',
  GET_PLATFORM = 'get-platform',
  
  // Dialog related
  SHOW_MESSAGE_BOX = 'show-message-box',
  SHOW_SAVE_DIALOG = 'show-save-dialog',
  SHOW_OPEN_DIALOG = 'show-open-dialog',
  
  // Chat related
  NEW_CHAT = 'new-chat',
  SEND_MESSAGE = 'send-message',
  RECEIVE_MESSAGE = 'receive-message',
  
  // Session related
  LOAD_SESSIONS = 'load-sessions',
  SAVE_SESSION = 'save-session',
  DELETE_SESSION = 'delete-session',
  
  // Settings related
  GET_SETTINGS = 'get-settings',
  SAVE_SETTINGS = 'save-settings',
}

// Platform information
export interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  version: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  model?: string;
}

// Chat session types
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  model?: string;
}

// Application settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  apiKey?: string;
  defaultModel?: string;
  autoSave: boolean;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
