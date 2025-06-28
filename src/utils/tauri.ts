import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Get the current window instance
const appWindow = getCurrentWindow();

// Tauri command wrappers
export const tauriCommands = {
  async greet(name: string): Promise<string> {
    return await invoke('greet', { name });
  },

  async getAiResponse(message: string): Promise<string> {
    return await invoke('get_ai_response', { message });
  },

  async showWindow(): Promise<void> {
    return await invoke('show_window');
  },

  async hideWindow(): Promise<void> {
    return await invoke('hide_window');
  }
};

// Window management utilities
export const windowUtils = {
  async minimize() {
    await appWindow.minimize();
  },

  async maximize() {
    await appWindow.maximize();
  },

  async close() {
    await appWindow.close();
  },

  async hide() {
    await appWindow.hide();
  },

  async show() {
    await appWindow.show();
    await appWindow.setFocus();
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
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Platform detection
export const platform = {
  isMacOS: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac'),
  isWindows: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win'),
  isLinux: () => typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('linux'),
};
