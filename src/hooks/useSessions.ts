import { useState, useEffect, useCallback } from 'react';
import { tauriCommands, isTauri } from '@/utils/tauri';
import type { Session } from '@shared/database-types';

export interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  createSession: (name: string, role?: string, goals?: string) => Promise<Session | null>;
  deleteSession: (sessionId: number) => Promise<boolean>;
  refreshSessions: () => Promise<void>;
}

export const useSessions = (): UseSessionsReturn => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    goals?: string
  ): Promise<Session | null> => {
    if (!isTauri()) {
      console.warn('Cannot create session outside Tauri environment');
      return null;
    }

    try {
      setError(null);
      const newSession = await tauriCommands.createSession(name, role, goals);
      
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
    if (!isTauri()) {
      console.warn('Cannot delete session outside Tauri environment');
      return false;
    }

    try {
      setError(null);
      const success = await tauriCommands.deleteSession(sessionId);
      
      if (success) {
        setSessions(prev => prev.filter(session => session.id !== sessionId));
      }
      
      return success;
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      return false;
    }
  }, []);

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
