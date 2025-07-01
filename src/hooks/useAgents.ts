import { useState, useEffect, useCallback } from 'react';
import { tauriCommands, isTauri } from '@/utils/tauri';
import type { Session } from '@shared/database-types';

export interface Agent {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  status: string;
  created_at: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  agent_type: string;
  environment_variables?: Record<string, string>;
  requirements?: string[];
  triggers?: string[];
  data_connectors?: string[];
  memory_limit_mb?: number;
  timeout_seconds?: number;
}

export interface AgentStatus {
  status: string;
  is_running: boolean;
  uptime?: number;
  last_activity?: string;
}

export interface Trigger {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  agent_id: string;
  enabled: boolean;
  created_at: string;
}

export interface UseAgentsReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  createAgent: (config: AgentConfig) => Promise<Agent | null>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  startAgent: (agentId: string) => Promise<boolean>;
  stopAgent: (agentId: string) => Promise<boolean>;
  getAgentStatus: (agentId: string) => Promise<AgentStatus | null>;
  getAgentLogs: (agentId: string) => Promise<string[]>;
  executeAgentAction: (agentId: string, method: string, params?: any) => Promise<any>;
  createAgentSession: (agentId: string, sessionName?: string) => Promise<Session | null>;
  sendMessageToAgent: (agentId: string, sessionId: number, message: string) => Promise<{
    agentResponse: string;
    messageId: number;
  } | null>;
  refreshAgents: () => Promise<void>;
}

export const useAgents = (): UseAgentsReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const agentsData = await tauriCommands.listAgents();
      console.log('Loaded agents:', agentsData);
      
      setAgents(agentsData);
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (config: AgentConfig): Promise<Agent | null> => {
    if (!isTauri()) {
      console.warn('Cannot create agent: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      console.log('Creating agent with config:', config);
      const agentId = await tauriCommands.createAgent(config);
      
      // Refresh the agents list to get the new agent
      await loadAgents();
      
      // Find and return the created agent
      const createdAgent = agents.find(agent => agent.id === agentId);
      return createdAgent || null;
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      return null;
    }
  }, [agents, loadAgents]);

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    if (!isTauri()) {
      console.warn('Cannot delete agent: Not in Tauri environment');
      return false;
    }

    try {
      setError(null);
      
      console.log('Deleting agent:', agentId);
      const success = await tauriCommands.deleteAgent(agentId);
      
      if (success) {
        // Remove from local state
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
      }
      
      return success;
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      return false;
    }
  }, []);

  const startAgent = useCallback(async (agentId: string): Promise<boolean> => {
    if (!isTauri()) {
      console.warn('Cannot start agent: Not in Tauri environment');
      return false;
    }

    try {
      setError(null);
      
      console.log('Starting agent:', agentId);
      const success = await tauriCommands.startAgent(agentId);
      
      if (success) {
        // Update local state
        setAgents(prev => prev.map(agent => 
          agent.id === agentId 
            ? { ...agent, status: 'running' }
            : agent
        ));
      }
      
      return success;
    } catch (err) {
      console.error('Failed to start agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to start agent');
      return false;
    }
  }, []);

  const stopAgent = useCallback(async (agentId: string): Promise<boolean> => {
    if (!isTauri()) {
      console.warn('Cannot stop agent: Not in Tauri environment');
      return false;
    }

    try {
      setError(null);
      
      console.log('Stopping agent:', agentId);
      const success = await tauriCommands.stopAgent(agentId);
      
      if (success) {
        // Update local state
        setAgents(prev => prev.map(agent => 
          agent.id === agentId 
            ? { ...agent, status: 'stopped' }
            : agent
        ));
      }
      
      return success;
    } catch (err) {
      console.error('Failed to stop agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop agent');
      return false;
    }
  }, []);

  const getAgentStatus = useCallback(async (agentId: string): Promise<AgentStatus | null> => {
    if (!isTauri()) {
      console.warn('Cannot get agent status: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      const status = await tauriCommands.getAgentStatus(agentId);
      return status;
    } catch (err) {
      console.error('Failed to get agent status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get agent status');
      return null;
    }
  }, []);

  const getAgentLogs = useCallback(async (agentId: string): Promise<string[]> => {
    if (!isTauri()) {
      console.warn('Cannot get agent logs: Not in Tauri environment');
      return [];
    }

    try {
      setError(null);
      
      const logs = await tauriCommands.getAgentLogs(agentId);
      return logs;
    } catch (err) {
      console.error('Failed to get agent logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to get agent logs');
      return [];
    }
  }, []);

  const executeAgentAction = useCallback(async (agentId: string, method: string, params?: any): Promise<any> => {
    if (!isTauri()) {
      console.warn('Cannot execute agent action: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      console.log('Executing agent action:', { agentId, method, params });
      const result = await tauriCommands.executeAgentAction(agentId, method, params);
      return result;
    } catch (err) {
      console.error('Failed to execute agent action:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute agent action');
      return null;
    }
  }, []);

  const createAgentSession = useCallback(async (agentId: string, sessionName?: string): Promise<Session | null> => {
    if (!isTauri()) {
      console.warn('Cannot create agent session: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      console.log('Creating agent session:', { agentId, sessionName });
      const session = await tauriCommands.createAgentSession(agentId, sessionName);
      return session;
    } catch (err) {
      console.error('Failed to create agent session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent session');
      return null;
    }
  }, []);

  const sendMessageToAgent = useCallback(async (
    agentId: string, 
    sessionId: number, 
    message: string
  ): Promise<{ agentResponse: string; messageId: number; } | null> => {
    if (!isTauri()) {
      console.warn('Cannot send message to agent: Not in Tauri environment');
      return null;
    }

    try {
      setError(null);
      
      console.log('Sending message to agent:', { agentId, sessionId, message });
      const result = await tauriCommands.sendMessageToAgent(agentId, sessionId, message);
      return result;
    } catch (err) {
      console.error('Failed to send message to agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message to agent');
      return null;
    }
  }, []);

  const refreshAgents = useCallback(async () => {
    await loadAgents();
  }, [loadAgents]);

  // Load agents on hook initialization
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return {
    agents,
    loading,
    error,
    createAgent,
    deleteAgent,
    startAgent,
    stopAgent,
    getAgentStatus,
    getAgentLogs,
    executeAgentAction,
    createAgentSession,
    sendMessageToAgent,
    refreshAgents,
  };
};

export default useAgents;
