import type { NextApiRequest, NextApiResponse } from 'next';
import { writeSettings, readSettings } from '@/utils/settings';
import type { SettingsData } from '@shared/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const settings = await readSettings();
      res.status(200).json(settings);
    } catch (error) {
      console.error('Error reading settings:', error);
      res.status(500).json({ error: 'Failed to read settings' });
    }
  } else if (req.method === 'POST') {
    try {
      const settings: SettingsData = req.body;
      await writeSettings(settings);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error writing settings:', error);
      res.status(500).json({ error: 'Failed to write settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
