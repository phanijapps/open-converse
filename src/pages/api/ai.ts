import type { NextApiRequest, NextApiResponse } from 'next';

export const dynamic = 'force-dynamic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Example: call Electron main process via IPC or return a mock response
  if (req.method === 'POST') {
    // TODO: Use Electron IPC for real AI integration
    return res.status(200).json({
      id: Date.now().toString(),
      sender: 'ai',
      content: 'This is a mock AI response.',
      timestamp: Date.now()
    });
  }
  res.status(405).end();
}
