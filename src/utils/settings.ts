import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauri';
import type { SettingsData } from '@shared/types';

// Default settings (provider-agnostic)
const DEFAULT_SETTINGS: SettingsData = {
  providers: [],
  memory_config: {
    provider: 'sqlite',
    config: {},
  },
};

export async function readSettings(): Promise<SettingsData> {
  console.debug('[Settings] Starting readSettings...');
  
  try {
    const isTauriEnv = isTauri();
    console.debug('[Settings] Environment check - isTauri:', isTauriEnv);
    
    if (isTauriEnv) {
      console.debug('[Settings] Using Tauri backend to load settings from file');
      try {
        const result = await invoke('load_settings');
        console.debug('[Settings] Successfully loaded from Tauri backend:', result);
        return result as SettingsData;
      } catch (tauriError) {
        console.error('[Settings] Tauri load_settings failed:', tauriError);
        console.warn('[Settings] Falling back to localStorage due to Tauri error');
        // Fall through to localStorage fallback
      }
    } else {
      console.debug('[Settings] Not in Tauri environment, using localStorage');
    }
    
    // Fallback for web/development or Tauri error: use localStorage
    const stored = localStorage.getItem('openconv-settings');
    const result = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    console.debug('[Settings] Loaded from localStorage:', result);
    return result;
    
  } catch (error) {
    console.error('[Settings] Error reading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function writeSettings(settings: SettingsData): Promise<void> {
  console.debug('[Settings] Starting writeSettings with data:', settings);
  
  try {
    const isTauriEnv = isTauri();
    console.debug('[Settings] Environment check - isTauri:', isTauriEnv);
    
    if (isTauriEnv) {
      console.debug('[Settings] Using Tauri backend to save settings to file');
      try {
        await invoke('save_settings', { settings });
        console.debug('[Settings] Successfully saved to Tauri backend');
        return;
      } catch (tauriError) {
        console.error('[Settings] Tauri save_settings failed:', tauriError);
        console.warn('[Settings] Falling back to localStorage due to Tauri error');
        // Fall through to localStorage fallback
      }
    } else {
      console.debug('[Settings] Not in Tauri environment, using localStorage');
    }
    
    // Fallback for web/development or Tauri error: use localStorage
    localStorage.setItem('openconv-settings', JSON.stringify(settings));
    console.debug('[Settings] Successfully saved to localStorage');
    
  } catch (error) {
    console.error('[Settings] Error writing settings:', error);
    throw new Error('Failed to save settings');
  }
}
