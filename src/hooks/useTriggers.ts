import { useState, useEffect, useCallback } from 'react';
import { tauriCommands, isTauri } from '@/utils/tauri';

export interface Trigger {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  agent_id: string;
  enabled: boolean;
  created_at: string;
}

export interface TriggerConfig {
  name: string;
  description: string;
  trigger_type: string;
  agent_id: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface UseTriggersReturn {
  triggers: Trigger[];
  loading: boolean;
  error: string | null;
  createTrigger: (trigger: TriggerConfig) => Promise<Trigger | null>;
  updateTrigger: (triggerId: string, updates: {
    name?: string;
    description?: string;
    config?: Record<string, any>;
    enabled?: boolean;
  }) => Promise<boolean>;
  deleteTrigger: (triggerId: string) => Promise<boolean>;
  triggerAgent: (agentId: string, triggerType: string, data: any) => Promise<any>;
  refreshTriggers: () => Promise<void>;
}

export const useTriggers = (): UseTriggersReturn => {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTriggers = useCallback(async () => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const triggersData = await tauriCommands.listTriggers();
      console.log('Loaded triggers:', triggersData);
      
      setTriggers(triggersData);
    } catch (err) {
      console.error('Failed to load triggers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load triggers');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTrigger = useCallback(async (triggerConfig: TriggerConfig): Promise<Trigger | null> => {
    if (!isTauri()) {
      console.warn('Cannot create trigger: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      console.log('Creating trigger with config:', triggerConfig);
      const triggerId = await tauriCommands.createTrigger(triggerConfig);
      
      // Refresh the triggers list to get the new trigger
      await loadTriggers();
      
      // Find and return the created trigger
      const createdTrigger = triggers.find(trigger => trigger.id === triggerId);
      return createdTrigger || null;
    } catch (err) {
      console.error('Failed to create trigger:', err);
      setError(err instanceof Error ? err.message : 'Failed to create trigger');
      return null;
    }
  }, [triggers, loadTriggers]);

  const updateTrigger = useCallback(async (
    triggerId: string, 
    updates: {
      name?: string;
      description?: string;
      config?: Record<string, any>;
      enabled?: boolean;
    }
  ): Promise<boolean> => {
    if (!isTauri()) {
      console.warn('Cannot update trigger: Not in Tauri environment');
      return false;
    }

    try {
      setError(null);
      
      console.log('Updating trigger:', triggerId, updates);
      const success = await tauriCommands.updateTrigger(triggerId, updates);
      
      if (success) {
        // Update local state
        setTriggers(prev => prev.map(trigger => 
          trigger.id === triggerId 
            ? { ...trigger, ...updates }
            : trigger
        ));
      }
      
      return success;
    } catch (err) {
      console.error('Failed to update trigger:', err);
      setError(err instanceof Error ? err.message : 'Failed to update trigger');
      return false;
    }
  }, []);

  const deleteTrigger = useCallback(async (triggerId: string): Promise<boolean> => {
    if (!isTauri()) {
      console.warn('Cannot delete trigger: Not in Tauri environment');
      return false;
    }

    try {
      setError(null);
      
      console.log('Deleting trigger:', triggerId);
      const success = await tauriCommands.deleteTrigger(triggerId);
      
      if (success) {
        // Remove from local state
        setTriggers(prev => prev.filter(trigger => trigger.id !== triggerId));
      }
      
      return success;
    } catch (err) {
      console.error('Failed to delete trigger:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete trigger');
      return false;
    }
  }, []);

  const triggerAgent = useCallback(async (agentId: string, triggerType: string, data: any): Promise<any> => {
    if (!isTauri()) {
      console.warn('Cannot trigger agent: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      console.log('Triggering agent:', { agentId, triggerType, data });
      const result = await tauriCommands.triggerAgent(agentId, triggerType, data);
      return result;
    } catch (err) {
      console.error('Failed to trigger agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger agent');
      return null;
    }
  }, []);

  const refreshTriggers = useCallback(async () => {
    await loadTriggers();
  }, [loadTriggers]);

  // Load triggers on hook initialization
  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  return {
    triggers,
    loading,
    error,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    triggerAgent,
    refreshTriggers,
  };
};

export default useTriggers;
