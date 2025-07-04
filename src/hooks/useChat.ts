import { useState, useCallback } from 'react';
import { AgentFactory } from '@/agents';
import { readSettings } from '@/utils/settings';
import { MessageMemoryProvider } from '../../shared/memory';
import type { AgentType } from '@/agents';

interface UseChatOptions {
  onSuccess?: (response: string, agentType: AgentType) => void;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memoryProvider = new MessageMemoryProvider();

  // Fetch chat history for a session
  const fetchHistory = useCallback(async (sessionId: number) => {
    try {
      return await memoryProvider.getMemory(sessionId);
    } catch (err) {
      setError('Failed to load chat history');
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    sessionId: number,
    agentType: AgentType = 'general',
    context?: any
  ) => {
    if (!message.trim()) {
      const errorMsg = 'Message cannot be empty';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load settings and create agent directly
      const settings = await readSettings();
      // Validate settings
      if (!AgentFactory.validateSettings(settings)) {
        throw new Error('API configuration not found. Please configure your settings.');
      }

      // Create agent and send message
      const agent = AgentFactory.createAgent(agentType, settings);
      const response = await agent.sendMessage(message.trim(), context);

      // Save message to memory
      await memoryProvider.addMemory(sessionId, {
        session_id: sessionId,
        role: 'user',
        content: message.trim(),
      });
      await memoryProvider.addMemory(sessionId, {
        session_id: sessionId,
        role: 'assistant',
        content: response,
      });

      if (response) {
        options.onSuccess?.(response, agentType);
        return response;
      } else {
        throw new Error('No response received from agent');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      console.error('Chat error:', err);
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    isLoading,
    error,
    clearError,
    fetchHistory,
  };
}
