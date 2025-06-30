import type { NextApiRequest, NextApiResponse } from 'next';
import { Message, CreateMessage, Session } from '../../../shared/database-types';

// Mark this route as dynamic to prevent pre-building
export const dynamic = 'force-dynamic';

// Helper to call Tauri commands (pseudo, replace with actual Tauri bridge)
async function callTauri<T>(command: string, args: any): Promise<T> {
  // Implement Tauri bridge here (e.g., window.__TAURI__.invoke or IPC)
  throw new Error('Tauri bridge not implemented');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Fetch messages for a session
    const { sessionId, limit } = req.query;
    try {
      const messages = await callTauri<Message[]>('get_recent_messages', {
        session_id: Number(sessionId),
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json(messages);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  } else if (req.method === 'POST') {
    if (req.body.type === 'session') {
      // Create a new session in the database
      try {
        const session = await callTauri<Session>('create_session', {
          // Pass any additional session fields if needed
          ...req.body,
        });
        res.status(200).json(session);
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
      return;
    }
    // Add a message to a session
    const { session_id, role, content, embedding, recall_score } = req.body as CreateMessage;
    try {
      const message = await callTauri<Message>('save_message', {
        session_id,
        role,
        content,
        embedding,
        recall_score,
      });
      res.status(200).json(message);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
