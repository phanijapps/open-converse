import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Session, CreateSession, Conversation, CreateConversation, Message, CreateMessage } from '@shared/database-types';

// Lazy-load the current window instance to avoid SSR issues
let appWindow: any = null;
const getAppWindow = () => {
  if (typeof window !== 'undefined' && !appWindow) {
    appWindow = getCurrentWindow();
  }
  return appWindow;
};

// Tauri command wrappers
export const tauriCommands = {
  async greet(name: string): Promise<string> {
    if (typeof window === 'undefined') return 'Hello from SSR!';
    return await invoke('greet', { name });
  },

  async getAiResponse(message: string): Promise<string> {
    if (typeof window === 'undefined') return 'Response from SSR';
    return await invoke('get_ai_response', { message });
  },

  async showWindow(): Promise<void> {
    if (typeof window === 'undefined') return;
    return await invoke('show_window');
  },

  async hideWindow(): Promise<void> {
    if (typeof window === 'undefined') return;
    return await invoke('hide_window');
  },

  // Session commands
  async createSession(name: string, role?: string, goals?: string): Promise<Session> {
    if (typeof window === 'undefined') throw new Error('Sessions not available in SSR');
    return await invoke('create_session', { name, role, goals });
  },

  async getSessions(): Promise<Session[]> {
    if (typeof window === 'undefined') return [];
    return await invoke('get_sessions');
  },

  async deleteSession(sessionId: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return await invoke('delete_session', { sessionId });
  },

  // Conversation commands
  async createConversation(sessionId: number, status?: string): Promise<Conversation> {
    if (typeof window === 'undefined') throw new Error('Conversations not available in SSR');
    return await invoke('create_conversation', { sessionId, status });
  },

  async getConversations(sessionId?: number): Promise<Conversation[]> {
    if (typeof window === 'undefined') return [];
    return await invoke('get_conversations', { sessionId });
  },

  async deleteConversation(conversationId: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return await invoke('delete_conversation', { conversationId });
  },

  // Message commands
  async saveMessage(
    conversationId: number, 
    role: string, 
    content: string, 
    embedding?: number[], 
    recallScore?: number
  ): Promise<Message> {
    if (typeof window === 'undefined') throw new Error('Messages not available in SSR');
    return await invoke('save_message', { 
      conversationId, 
      role, 
      content, 
      embedding, 
      recallScore 
    });
  },

  async getRecentMessages(conversationId: number, limit?: number): Promise<Message[]> {
    if (typeof window === 'undefined') return [];
    return await invoke('get_recent_messages', { conversationId, limit });
  },

  async deleteMessage(messageId: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return await invoke('delete_message', { messageId });
  },

  // Database commands
  async initDatabase(databasePath?: string): Promise<string> {
    if (typeof window === 'undefined') return 'Database not available in SSR';
    return await invoke('init_database', { databasePath });
  }
};

// Window management utilities
export const windowUtils = {
  async minimize() {
    const window = getAppWindow();
    if (window) await window.minimize();
  },

  async maximize() {
    const window = getAppWindow();
    if (window) await window.maximize();
  },

  async close() {
    const window = getAppWindow();
    if (window) await window.close();
  },

  async hide() {
    const window = getAppWindow();
    if (window) await window.hide();
  },

  async show() {
    const window = getAppWindow();
    if (window) {
      await window.show();
      await window.setFocus();
    }
  }
};

// Notification utilities (simplified for now)
export const notificationUtils = {
  async send(title: string, body: string) {
    // Using web notifications as fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  }
};

// Check if running in Tauri
export const isTauri = () => {
  try {
    // Most reliable method: try to access Tauri's invoke function
    if (typeof window !== 'undefined') {
      const w = window as any;
      
      // Check for Tauri-specific globals
      const hasInvoke = typeof w.__TAURI_INTERNALS__ !== 'undefined' || 
                       typeof w.__TAURI__ !== 'undefined' ||
                       typeof w.tauri !== 'undefined';
      
      // Additional check: try to import the invoke function
      let canImportInvoke = false;
      try {
        // This will succeed only in Tauri environment
        canImportInvoke = typeof invoke !== 'undefined';
      } catch (e) {
        canImportInvoke = false;
      }
      
      const isTauriEnv = hasInvoke || canImportInvoke;
      
      console.debug('[isTauri] Detection details:', {
        isTauriEnv,
        hasInvoke,
        canImportInvoke,
        __TAURI_INTERNALS__: typeof w.__TAURI_INTERNALS__,
        __TAURI__: typeof w.__TAURI__,
        tauri: typeof w.tauri,
        userAgent: navigator?.userAgent?.includes('Tauri') || false
      });
      
      return isTauriEnv;
    }
  } catch (error) {
    console.debug('[isTauri] Detection error:', error);
  }
  
  return false;
};

// Platform detection
export const platform = {
  isMacOS: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac'),
  isWindows: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win'),
  isLinux: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('linux'),
};
