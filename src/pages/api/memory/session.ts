import type { NextApiRequest, NextApiResponse } from 'next';

// Mark this route as dynamic to prevent pre-building
export const dynamic = 'force-dynamic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // For now, return an error since we're using Tauri for session data
    // This endpoint exists to prevent 404 errors from the SessionMemoryProvider
    res.status(501).json({ error: 'Session data is handled by Tauri backend, not web API' });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
