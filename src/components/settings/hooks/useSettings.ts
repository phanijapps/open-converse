import { useState, useEffect, useCallback, useMemo } from 'react';
import { readSettings, writeSettings } from '@/utils/settings';
import type { SettingsData, MemoryConfig, ProviderConfig } from '@shared/types';
import { getProviderById, type ConfiguredProvider, type VerificationStatus } from '@/utils/providers/registry';

export interface SettingsState {
  // Current provider state
  currentProvider: ConfiguredProvider | null;
  selectedProviderId: string;
  apiKey: string;
  verificationStatus: VerificationStatus;
  verificationError: string;
  
  // Memory config
  memoryConfig: MemoryConfig;
  
  // UI state
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveMessage: string;
}

export interface SettingsActions {
  // Provider actions
  selectProvider: (providerId: string) => Promise<void>;
  updateApiKey: (apiKey: string) => void;
  setVerificationStatus: (status: VerificationStatus, error?: string) => void;
  toggleProviderEnabled: () => void;
  
  // Memory actions
  updateMemoryConfig: (field: string, value: any) => void;
  setMemoryProvider: (provider: 'sqlite' | 'supabase') => void;
  
  // Settings persistence
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  autoSave: () => Promise<void>;
  
  // UI actions
  setSaveMessage: (message: string) => void;
  clearSaveMessage: () => void;
}

export function useSettings(): [SettingsState, SettingsActions] {
  const [state, setState] = useState<SettingsState>({
    currentProvider: null,
    selectedProviderId: '',
    apiKey: '',
    verificationStatus: 'idle',
    verificationError: '',
    memoryConfig: { provider: 'sqlite', config: {} },
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    saveMessage: '',
  });

  const loadSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const data = await readSettings();
      
      if (data.providers && Array.isArray(data.providers) && data.providers.length > 0) {
        const firstProvider = data.providers.find((p: any) => p.enabled) || data.providers[0];
        const template = getProviderById(firstProvider.id);
        
        if (template) {
          const configured: ConfiguredProvider = {
            ...template,
            apiKey: firstProvider.api_key,
            enabled: firstProvider.enabled ?? true,
            verified: firstProvider.verified ?? false,
            lastVerified: firstProvider.last_verified ? new Date(firstProvider.last_verified) : undefined,
            verificationError: firstProvider.verification_error
          };
          
          setState(prev => ({
            ...prev,
            currentProvider: configured,
            selectedProviderId: firstProvider.id,
            apiKey: firstProvider.api_key || '',
            verificationStatus: firstProvider.verified ? 'verified' : 
                              firstProvider.verification_error ? 'error' : 'idle',
            verificationError: firstProvider.verification_error || '',
          }));
        }
      }
      
      setState(prev => ({ 
        ...prev,
        memoryConfig: data.memory_config || { provider: 'sqlite', config: {} },
      }));
    } catch (error) {
      setState(prev => ({ ...prev, saveMessage: 'Error loading settings' }));
      console.error('[Settings] Error loading settings:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []); // No dependencies to avoid stale closures

  const selectProvider = useCallback(async (providerId: string) => {
    if (!providerId) {
      setState(prev => ({
        ...prev,
        currentProvider: null,
        selectedProviderId: '',
        apiKey: '',
        verificationStatus: 'idle',
        verificationError: '',
      }));
      return;
    }

    const template = getProviderById(providerId);
    if (!template) return;

    try {
      const savedSettings = await readSettings();
      const existingProvider = savedSettings.providers?.find((p: any) => p.id === providerId);
      
      if (existingProvider && existingProvider.api_key) {
        const configured: ConfiguredProvider = {
          ...template,
          apiKey: existingProvider.api_key,
          enabled: existingProvider.enabled ?? true,
          verified: existingProvider.verified ?? false,
          lastVerified: existingProvider.last_verified ? new Date(existingProvider.last_verified) : undefined,
          verificationError: existingProvider.verification_error
        };
        
        setState(prev => ({
          ...prev,
          currentProvider: configured,
          selectedProviderId: providerId,
          apiKey: existingProvider.api_key,
          verificationStatus: existingProvider.verified ? 'verified' : 
                            existingProvider.verification_error ? 'error' : 'idle',
          verificationError: existingProvider.verification_error || '',
          hasUnsavedChanges: true,
        }));
      } else {
        const configured: ConfiguredProvider = {
          ...template,
          apiKey: '',
          enabled: true,
          verified: false
        };
        
        setState(prev => ({
          ...prev,
          currentProvider: configured,
          selectedProviderId: providerId,
          apiKey: '',
          verificationStatus: 'idle',
          verificationError: '',
          hasUnsavedChanges: true,
        }));
      }
    } catch (error) {
      console.error('[Settings] Error loading provider data:', error);
    }
  }, []); // No dependencies to avoid stale closures

  const updateApiKey = useCallback((apiKey: string) => {
    setState(prev => ({ 
      ...prev,
      apiKey, 
      hasUnsavedChanges: true,
      currentProvider: prev.currentProvider ? {
        ...prev.currentProvider,
        apiKey,
        verified: false
      } : null
    }));
  }, []);

  const setVerificationStatus = useCallback((status: VerificationStatus, error?: string) => {
    setState(prev => ({ 
      ...prev,
      verificationStatus: status, 
      verificationError: error || '',
      currentProvider: prev.currentProvider ? {
        ...prev.currentProvider,
        verified: status === 'verified',
        lastVerified: status === 'verified' ? new Date() : prev.currentProvider.lastVerified,
        verificationError: error
      } : null
    }));
  }, []);

  const toggleProviderEnabled = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentProvider: prev.currentProvider ? {
        ...prev.currentProvider,
        enabled: !prev.currentProvider.enabled
      } : null,
      hasUnsavedChanges: true
    }));
  }, []);

  const updateMemoryConfig = useCallback((field: string, value: any) => {
    setState(prev => ({
      ...prev,
      memoryConfig: {
        ...prev.memoryConfig,
        config: {
          ...prev.memoryConfig.config,
          [field]: value,
        }
      },
      hasUnsavedChanges: true
    }));
  }, []);

  const setMemoryProvider = useCallback((provider: 'sqlite' | 'supabase') => {
    setState(prev => ({
      ...prev,
      memoryConfig: {
        provider,
        config: provider === 'sqlite' ? {} : { connectionString: '', projectUrl: '', apiKey: '' },
      },
      hasUnsavedChanges: true
    }));
  }, []);

  const saveSettings = useCallback(async () => {
    setState(prev => {
      if (prev.isSaving) return prev; // Prevent concurrent saves
      return { ...prev, isSaving: true };
    });
    
    try {
      // Use setState callback to get current state and avoid stale closures
      let settingsData: SettingsData | null = null;
      
      setState(currentState => {
        settingsData = {
          providers: currentState.currentProvider && currentState.selectedProviderId ? [{
            id: currentState.selectedProviderId,
            description: currentState.currentProvider.description,
            base_url: currentState.currentProvider.baseUrl,
            api_key: currentState.apiKey,
            enabled: currentState.currentProvider.enabled,
            verified: currentState.currentProvider.verified,
            last_verified: currentState.currentProvider.lastVerified ? currentState.currentProvider.lastVerified.toISOString() : undefined,
            verification_error: currentState.currentProvider.verificationError
          }] : [],
          memory_config: currentState.memoryConfig,
        };
        return currentState; // Don't change state in this call
      });

      if (settingsData) {
        await writeSettings(settingsData);
        setState(prev => ({ 
          ...prev,
          hasUnsavedChanges: false, 
          saveMessage: 'Settings saved successfully!',
          isSaving: false
        }));
        setTimeout(() => setState(prev => ({ ...prev, saveMessage: '' })), 3000);
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev,
        saveMessage: 'Error saving settings',
        isSaving: false
      }));
      setTimeout(() => setState(prev => ({ ...prev, saveMessage: '' })), 3000);
      console.error('[Settings] Error saving settings:', error);
    }
  }, []); // No dependencies to avoid stale closures

  const autoSave = useCallback(async () => {
    console.debug('[useSettings] autoSave called');
    
    // Use setState callback to get current state and avoid stale closures
    let shouldSave = false;
    let settingsData: SettingsData | null = null;
    
    setState(currentState => {
      console.debug('[useSettings] autoSave state check:', {
        hasCurrentProvider: !!currentState.currentProvider,
        hasSelectedProviderId: !!currentState.selectedProviderId,
        hasApiKey: !!currentState.apiKey,
        isSaving: currentState.isSaving
      });
      
      if (!currentState.currentProvider || !currentState.selectedProviderId || !currentState.apiKey || currentState.isSaving) {
        return currentState;
      }
      
      shouldSave = true;
      settingsData = {
        providers: [{
          id: currentState.selectedProviderId,
          description: currentState.currentProvider.description,
          base_url: currentState.currentProvider.baseUrl,
          api_key: currentState.apiKey,
          enabled: currentState.currentProvider.enabled,
          verified: currentState.currentProvider.verified,
          last_verified: currentState.currentProvider.lastVerified ? currentState.currentProvider.lastVerified.toISOString() : undefined,
          verification_error: currentState.currentProvider.verificationError
        }],
        memory_config: currentState.memoryConfig,
      };
      return currentState; // Don't change state in this call
    });

    if (shouldSave && settingsData) {
      try {
        console.debug('[useSettings] autoSave executing writeSettings');
        await writeSettings(settingsData);
        setState(prev => ({ 
          ...prev,
          hasUnsavedChanges: false, 
          saveMessage: 'Settings saved automatically!' 
        }));
        setTimeout(() => setState(prev => ({ ...prev, saveMessage: '' })), 3000);
      } catch (error) {
        console.error('[Settings] Auto-save error:', error);
      }
    } else {
      console.debug('[useSettings] autoSave skipped - conditions not met');
    }
  }, []); // No dependencies to avoid stale closures

  const setSaveMessage = useCallback((message: string) => {
    setState(prev => ({ ...prev, saveMessage: message }));
  }, []);

  const clearSaveMessage = useCallback(() => {
    setState(prev => ({ ...prev, saveMessage: '' }));
  }, []);

  const actions: SettingsActions = useMemo(() => ({
    selectProvider,
    updateApiKey,
    setVerificationStatus,
    toggleProviderEnabled,
    updateMemoryConfig,
    setMemoryProvider,
    loadSettings,
    saveSettings,
    autoSave,
    setSaveMessage,
    clearSaveMessage,
  }), [
    selectProvider,
    updateApiKey,
    setVerificationStatus,
    toggleProviderEnabled,
    updateMemoryConfig,
    setMemoryProvider,
    loadSettings,
    saveSettings,
    autoSave,
    setSaveMessage,
    clearSaveMessage,
  ]);

  return [state, actions];
}
