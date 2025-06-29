import { useState, useEffect, useCallback } from 'react';
import { tauriCommands, isTauri, testTauriConnection } from '@/utils/tauri';
import type { Session } from '@shared/database-types';

export interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  createSession: (name: string, role?: string, goals?: string, llm_provider?: string, model_id?: string) => Promise<Session | null>;
  deleteSession: (sessionId: number) => Promise<boolean>;
  refreshSessions: () => Promise<void>;
}

export const useSessions = (): UseSessionsReturn => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log environment info
  useEffect(() => {
    const testConnection = async () => {
      console.log('useSessions initialized');
      console.log('isTauri():', isTauri());
      console.log('typeof window:', typeof window);
      console.log('window.__TAURI__:', typeof (window as any).__TAURI__);
      
      // Test if we can actually connect to Tauri
      const canConnect = await testTauriConnection();
      console.log('testTauriConnection result:', canConnect);
    };
    
    testConnection();
  }, []);

  const loadSessions = useCallback(async () => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Initialize database first
      await tauriCommands.initDatabase();
      
      // Then load sessions
      const sessionsData = await tauriCommands.getSessions();
      
      // Sort by created_at descending (most recent first)
      const sortedSessions = sessionsData.sort((a, b) => b.created_at - a.created_at);
      
      setSessions(sortedSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (
    name: string, 
    role?: string, 
    goals?: string,
    llm_provider?: string,
    model_id?: string
  ): Promise<Session | null> => {
    if (!isTauri()) {
      console.warn('Cannot create session outside Tauri environment');
      return null;
    }

    try {
      setError(null);
      const newSession = await tauriCommands.createSession(name, role, goals, llm_provider, model_id);
      
      // Add to the beginning of the list (most recent)
      setSessions(prev => [newSession, ...prev]);
      
      return newSession;
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: number): Promise<boolean> => {
    console.log('=== DELETE SESSION START ===');
    console.log('deleteSession called with ID:', sessionId);
    console.log('isTauri() result:', isTauri());
    console.log('Current sessions count:', sessions.length);
    
    // Test: First try calling get_sessions to make sure invoke is working
    try {
      console.log('Testing invoke with get_sessions...');
      const testSessions = await tauriCommands.getSessions();
      console.log('get_sessions test successful, got', testSessions.length, 'sessions');
    } catch (testError) {
      console.error('get_sessions test failed:', testError);
      return false;
    }
    
    if (!isTauri()) {
      console.warn('Cannot delete session outside Tauri environment');
      return false;
    }

    try {
      setError(null);
      console.log('Calling tauriCommands.deleteSession...');
      const success = await tauriCommands.deleteSession(sessionId);
      console.log('deleteSession result:', success);
      
      if (success) {
        console.log('Success returned true, updating local state...');
        const beforeCount = sessions.length;
        setSessions(prev => {
          const filtered = prev.filter(session => session.id !== sessionId);
          console.log('Filtered sessions from', prev.length, 'to', filtered.length);
          return filtered;
        });
        console.log('Local state update completed');
        console.log('Sessions before:', beforeCount);
      } else {
        console.log('deleteSession returned false - operation failed');
      }
      
      console.log('=== DELETE SESSION END ===');
      return success;
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      console.log('=== DELETE SESSION END (ERROR) ===');
      return false;
    }
  }, [sessions.length]);

  const refreshSessions = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    createSession,
    deleteSession,
    refreshSessions,
  };
};

export default useSessions;
