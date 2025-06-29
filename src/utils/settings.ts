import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauri';
import type { SettingsData } from '@shared/types';

const SETTINGS_PATHS = {
  llms: '~/openconv/settings/llms.json',
  memory: '~/openconv/settings/memory.json',
};

// Default settings
const DEFAULT_SETTINGS: SettingsData = {
  llmProviders: [],
  memoryConfig: {
    provider: 'sqlite',
    config: {},
  },
};

export async function readSettings(): Promise<SettingsData> {
  try {
    if (isTauri()) {
      // Use Tauri APIs for file operations
      const llmSettings = await invoke('read_settings_file', { 
        filePath: SETTINGS_PATHS.llms 
      }).catch(() => null);
      
      const memorySettings = await invoke('read_settings_file', { 
        filePath: SETTINGS_PATHS.memory 
      }).catch(() => null);

      return {
        llmProviders: llmSettings ? JSON.parse(llmSettings as string).llmProviders || [] : [],
        memoryConfig: memorySettings ? JSON.parse(memorySettings as string) : DEFAULT_SETTINGS.memoryConfig,
      };
    } else {
      // Fallback for web/development
      const stored = localStorage.getItem('openconv-settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function writeSettings(settings: SettingsData): Promise<void> {
  try {
    if (isTauri()) {
      // Use Tauri APIs for file operations
      const llmData = { llmProviders: settings.llmProviders };
      const memoryData = settings.memoryConfig;

      await invoke('write_settings_file', {
        filePath: SETTINGS_PATHS.llms,
        content: JSON.stringify(llmData, null, 2),
      });

      await invoke('write_settings_file', {
        filePath: SETTINGS_PATHS.memory,
        content: JSON.stringify(memoryData, null, 2),
      });
    } else {
      // Fallback for web/development
      localStorage.setItem('openconv-settings', JSON.stringify(settings));
    }
  } catch (error) {
    console.error('Error writing settings:', error);
    throw new Error('Failed to save settings');
  }
}
