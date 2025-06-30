import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Session, CreateSession, Message, CreateMessage } from '@shared/database-types';

/**
 * Check if we're running in a Tauri environment
 */
export function isTauri(): boolean {
  // Check for both window and the Tauri internals
  if (typeof window === 'undefined') return false;
  
  const w = window as any;
  return typeof w.__TAURI_INTERNALS__ !== 'undefined' &&
         typeof w.__TAURI_INTERNALS__.invoke === 'function';
}

// Safe Tauri invoke wrapper
const safeInvoke = async (command: string, args?: any) => {
  if (typeof window !== 'undefined') {
    try {
      // Dynamic import only when needed and when globals exist
      const w = window as any;
      if (typeof w.__TAURI_INTERNALS__ !== 'undefined' || typeof w.__TAURI__ !== 'undefined') {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke(command, args);
      }
    } catch (error) {
      console.error('Failed to invoke Tauri command:', command, error);
      throw error;
    }
  }
  throw new Error('Tauri not available');
};

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
    return await safeInvoke('greet', { name }) as string;
  },

  async getAiResponse(message: string): Promise<string> {
    if (typeof window === 'undefined') return 'Response from SSR';
    return await safeInvoke('get_ai_response', { message }) as string;
  },

  async showWindow(): Promise<void> {
    if (typeof window === 'undefined') return;
    await safeInvoke('show_window');
  },

  async hideWindow(): Promise<void> {
    if (typeof window === 'undefined') return;
    await safeInvoke('hide_window');
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
    return await safeInvoke('create_session', { 
      name, 
      role, 
      goals, 
      llm_provider, 
      model_id 
    }) as Session;
  },

  async getSessions(): Promise<Session[]> {
    if (typeof window === 'undefined') return [];
    return await safeInvoke('get_sessions') as Session[];
  },

  async getSessionById(sessionId: number): Promise<Session> {
    if (typeof window === 'undefined') throw new Error('Sessions not available in SSR');
    console.log('getSessionById called with:', { sessionId });
    // Pass parameters wrapped in params object to match GetSessionParams struct
    return await safeInvoke('get_session_by_id', { 
      params: { sessionId }
    }) as Session;
  },

  async deleteSession(sessionId: number): Promise<boolean> {
    console.log('=== TAURI COMMAND DELETE SESSION START ===');
    console.log('tauriCommands.deleteSession called with:', sessionId, 'type:', typeof sessionId);
    console.log('typeof window:', typeof window);
    
    if (typeof window === 'undefined') {
      console.log('Window is undefined, returning false');
      return false;
    }
    
    try {
      console.log('About to call safeInvoke with command: delete_session');
      console.log('Parameters:', { sessionId: sessionId });
      
      const result = await safeInvoke('delete_session', { sessionId });
      
      console.log('safeInvoke call completed successfully');
      console.log('delete_session command result:', result, 'type:', typeof result);
      console.log('=== TAURI COMMAND DELETE SESSION END ===');
      
      return result as boolean;
    } catch (error) {
      console.error('=== TAURI COMMAND DELETE SESSION ERROR ===');
      console.error('Error in delete_session safeInvoke:', error);
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
    console.log('saveMessage called with:', { sessionId, role, content });
    // Pass parameters wrapped in params object to match SaveMessageParams struct
    return await safeInvoke('save_message', { 
      params: {
        sessionId,
        role, 
        content, 
        embedding, 
        recallScore 
      }
    }) as Message;
  },

  async getRecentMessages(sessionId: number, limit?: number): Promise<Message[]> {
    if (typeof window === 'undefined') return [];
    console.log('getRecentMessages called with:', { sessionId, limit });
    // Pass parameters wrapped in params object to match GetMessagesParams struct
    return await safeInvoke('get_recent_messages', { 
      params: { sessionId, limit }
    }) as Message[];
  },

  async deleteMessage(messageId: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return await safeInvoke('delete_message', { message_id: messageId }) as boolean;
  },

  // Database commands
  async initDatabase(databasePath?: string): Promise<string> {
    if (typeof window === 'undefined') return 'Database not available in SSR';
    return await safeInvoke('init_database', { database_path: databasePath }) as string;
  },

  async clearAllMemory(): Promise<string> {
    console.log('=== TAURI COMMAND CLEAR ALL MEMORY START ===');
    if (typeof window === 'undefined') throw new Error('Clear all memory not available in SSR');
    
    try {
      console.log('About to call safeInvoke with command: clear_all_memory');
      const result = await safeInvoke('clear_all_memory');
      console.log('clear_all_memory command result:', result);
      console.log('=== TAURI COMMAND CLEAR ALL MEMORY END ===');
      return result as string;
    } catch (error) {
      console.error('=== TAURI COMMAND CLEAR ALL MEMORY ERROR ===');
      console.error('Error in clear_all_memory safeInvoke:', error);
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

// Test function to verify Tauri is working
export const testTauriConnection = async (): Promise<boolean> => {
  try {
    console.log('[testTauriConnection] Testing Tauri connection...');
    
    // First check if we're even in a Tauri environment
    if (!isTauri()) {
      console.log('[testTauriConnection] Not in Tauri environment');
      return false;
    }
    
    // Try to dynamically import and test invoke
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      console.log('[testTauriConnection] typeof invoke:', typeof invoke);
      
      if (typeof invoke === 'function') {
        // Try to call a simple command that should always exist
        const result = await safeInvoke('get_database_path');
        console.log('[testTauriConnection] Successfully called get_database_path:', result);
        return true;
      } else {
        console.log('[testTauriConnection] invoke is not a function');
        return false;
      }
    } catch (invokeError) {
      console.error('[testTauriConnection] Error accessing invoke:', invokeError);
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
