import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Session, CreateSession, Message, CreateMessage } from '@shared/database-types';

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
  async createSession(
    name: string, 
    role?: string, 
    goals?: string, 
    llm_provider?: string, 
    model_id?: string
  ): Promise<Session> {
    if (typeof window === 'undefined') throw new Error('Sessions not available in SSR');
    return await invoke('create_session', { 
      name, 
      role, 
      goals, 
      llm_provider, 
      model_id 
    });
  },

  async getSessions(): Promise<Session[]> {
    if (typeof window === 'undefined') return [];
    return await invoke('get_sessions');
  },

  async deleteSession(sessionId: number): Promise<boolean> {
    console.log('=== TAURI COMMAND DELETE SESSION START ===');
    console.log('tauriCommands.deleteSession called with:', sessionId, 'type:', typeof sessionId);
    console.log('typeof window:', typeof window);
    console.log('typeof invoke:', typeof invoke);
    
    if (typeof window === 'undefined') {
      console.log('Window is undefined, returning false');
      return false;
    }
    
    try {
      console.log('About to call invoke with command: delete_session');
      console.log('Parameters:', { sessionId: sessionId });
      
      const result = await invoke('delete_session', { sessionId });
      
      console.log('invoke call completed successfully');
      console.log('delete_session command result:', result, 'type:', typeof result);
      console.log('=== TAURI COMMAND DELETE SESSION END ===');
      
      return result as boolean;
    } catch (error) {
      console.error('=== TAURI COMMAND DELETE SESSION ERROR ===');
      console.error('Error in delete_session invoke:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      
      if (error && typeof error === 'object') {
        console.error('Error keys:', Object.keys(error));
        console.error('Error message:', (error as any).message);
        console.error('Error stack:', (error as any).stack);
      }
      
      console.error('Error details (stringified):', JSON.stringify(error, null, 2));
      console.error('=== TAURI COMMAND DELETE SESSION ERROR END ===');
      throw error;
    }
  },

  // Message commands
  async saveMessage(
    sessionId: number, 
    role: string, 
    content: string, 
    embedding?: number[], 
    recallScore?: number
  ): Promise<Message> {
    if (typeof window === 'undefined') throw new Error('Messages not available in SSR');
    return await invoke('save_message', { 
      session_id: sessionId, 
      role, 
      content, 
      embedding, 
      recall_score: recallScore 
    });
  },

  async getRecentMessages(sessionId: number, limit?: number): Promise<Message[]> {
    if (typeof window === 'undefined') return [];
    return await invoke('get_recent_messages', { session_id: sessionId, limit });
  },

  async deleteMessage(messageId: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return await invoke('delete_message', { message_id: messageId });
  },

  // Database commands
  async initDatabase(databasePath?: string): Promise<string> {
    if (typeof window === 'undefined') return 'Database not available in SSR';
    return await invoke('init_database', { database_path: databasePath });
  },

  async clearAllMemory(): Promise<string> {
    console.log('=== TAURI COMMAND CLEAR ALL MEMORY START ===');
    if (typeof window === 'undefined') throw new Error('Clear all memory not available in SSR');
    
    try {
      console.log('About to call invoke with command: clear_all_memory');
      const result = await invoke('clear_all_memory');
      console.log('clear_all_memory command result:', result);
      console.log('=== TAURI COMMAND CLEAR ALL MEMORY END ===');
      return result as string;
    } catch (error) {
      console.error('=== TAURI COMMAND CLEAR ALL MEMORY ERROR ===');
      console.error('Error in clear_all_memory invoke:', error);
      console.error('=== TAURI COMMAND CLEAR ALL MEMORY ERROR END ===');
      throw error;
    }
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
    if (typeof window !== 'undefined') {
      const w = window as any;
      
      // For Tauri v2, the most reliable method is checking if invoke function is available
      // In Tauri v2, the globals are different than v1
      
      // Method 1: Direct function check
      const hasInvokeFunction = typeof invoke === 'function';
      
      // Method 2: Check for Tauri-specific window properties
      const hasTauriGlobals = typeof w.__TAURI__ !== 'undefined' || 
                             typeof w.__TAURI_INTERNALS__ !== 'undefined' ||
                             typeof w.tauri !== 'undefined';
      
      // Method 3: Check user agent
      const userAgentHasTauri = navigator?.userAgent?.includes('Tauri') || false;
      
      // Method 4: Try to detect if we're in a webview (common in Tauri)
      const isWebView = navigator?.userAgent?.includes('WebView') || false;
      
      // Log everything for debugging
      console.debug('[isTauri] Detection details:', {
        hasInvokeFunction,
        hasTauriGlobals,
        userAgentHasTauri,
        isWebView,
        invoke: typeof invoke,
        userAgent: navigator?.userAgent,
        windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('tauri'))
      });
      
      // In Tauri v2, the primary indicator should be the availability of the invoke function
      const isTauriEnv = hasInvokeFunction || hasTauriGlobals;
      
      console.debug('[isTauri] Final result:', isTauriEnv);
      
      return isTauriEnv;
    }
  } catch (error) {
    console.debug('[isTauri] Detection error:', error);
  }
  
  return false;
};

// Test function to verify Tauri is working
export const testTauriConnection = async (): Promise<boolean> => {
  try {
    console.log('[testTauriConnection] Testing Tauri connection...');
    console.log('[testTauriConnection] typeof invoke:', typeof invoke);
    
    if (typeof invoke === 'function') {
      // Try to call a simple command that should always exist
      const result = await invoke('get_database_path');
      console.log('[testTauriConnection] Successfully called get_database_path:', result);
      return true;
    } else {
      console.log('[testTauriConnection] invoke is not a function');
      return false;
    }
  } catch (error) {
    console.error('[testTauriConnection] Error testing Tauri connection:', error);
    return false;
  }
};

// Platform detection
export const platform = {
  isMacOS: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac'),
  isWindows: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win'),
  isLinux: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('linux'),
};
