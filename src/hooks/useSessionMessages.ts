import { useState, useEffect, useCallback } from 'react';
import { tauriCommands, isTauri } from '@/utils/tauri';
import { messagesToChatMessages, type ChatMessage } from '@shared/langchain-adapters';
import type { Message } from '@shared/database-types';

export interface UseSessionMessagesReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  addMessage: (message: ChatMessage, sessionId?: number) => Promise<Message | null>;
  loadMessages: (sessionId: number) => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export const useSessionMessages = (sessionId?: number): UseSessionMessagesReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(sessionId);

  const loadMessages = useCallback(async (sessionId: number) => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentSessionId(sessionId);
      
      console.log('useSessionMessages: Loading messages for sessionId:', sessionId, typeof sessionId);
      
      // Load messages from database
      const dbMessages = await tauriCommands.getRecentMessages(sessionId);
      
      console.log('useSessionMessages: Loaded', dbMessages.length, 'messages');
      
      // Convert to UI format
      const chatMessages = messagesToChatMessages(dbMessages);
      
      setMessages(chatMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const addMessage = useCallback(async (message: ChatMessage, sessionId?: number): Promise<Message | null> => {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!isTauri() || !targetSessionId) {
      console.warn('Cannot add message: Tauri not available or no session selected. sessionId:', targetSessionId);
      return null;
    }

    try {
      setError(null);
      
      console.log('addMessage: Saving message to session', targetSessionId);
      
      // Save to database
      const dbMessage = await tauriCommands.saveMessage(
        targetSessionId,
        message.sender === 'ai' ? 'assistant' : message.sender,
        message.content
      );
      
      console.log('addMessage: Message saved to DB:', dbMessage.id);
      
      // Add to local state
      setMessages(prev => [...prev, message]);
      
      return dbMessage;
    } catch (err) {
      console.error('Failed to add message:', err);
      setError(err instanceof Error ? err.message : 'Failed to add message');
      return null;
    }
  }, [currentSessionId]);

  const refreshMessages = useCallback(async () => {
    if (currentSessionId) {
      await loadMessages(currentSessionId);
    }
  }, [currentSessionId, loadMessages]);

  // Load messages when sessionId changes
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      loadMessages(sessionId);
    }
  }, [sessionId, currentSessionId, loadMessages]);

  return {
    messages,
    loading,
    error,
    addMessage,
    loadMessages,
    refreshMessages,
  };
};

export default useSessionMessages;
