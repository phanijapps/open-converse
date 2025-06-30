import type { NextApiRequest, NextApiResponse } from 'next';
import { AgentFactory } from '@/agents';
import { readSettings } from '@/utils/settings';
import type { ChatRequest, ChatResponse } from '@/agents';

export const dynamic = 'force-dynamic';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed` 
    });
  }

  try {
    const { message, sessionId, agentType, context }: ChatRequest = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string',
      });
    }

    if (!agentType) {
      return res.status(400).json({
        success: false,
        error: 'Agent type is required',
      });
    }

    // Load settings to get API configuration
    const settings = await readSettings();
    
    // Validate that we have a valid configuration
    if (!AgentFactory.validateSettings(settings)) {
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API configuration not found or incomplete. Please configure your settings.',
      });
    }

    // Create agent with settings
    const agent = AgentFactory.createAgent(agentType, settings);
    
    // Get response from agent
    const response = await agent.sendMessage(message, context);

    return res.status(200).json({
      success: true,
      response,
      agentType,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
