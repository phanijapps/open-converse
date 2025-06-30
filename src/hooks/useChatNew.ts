import { useState, useCallback } from 'react';
import type { AgentType, ChatRequest, ChatResponse } from '@/agents';

interface UseChatOptions {
  onSuccess?: (response: string, agentType: AgentType) => void;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const requestBody: ChatRequest = {
        message: message.trim(),
        sessionId,
        agentType,
        context,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      if (data.response) {
        options.onSuccess?.(data.response, agentType);
        return data.response;
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
  };
}
