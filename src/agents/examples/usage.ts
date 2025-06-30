/**
 * Example usage of the agent system
 * This file demonstrates different ways to use agents in your application
 */

import { AgentFactory, AgentManager, type AgentType } from '../index';
import { readSettings } from '@/utils/settings';

/**
 * Basic agent usage - direct creation and usage
 */
export async function basicAgentExample() {
  try {
    // Load settings
    const settings = await readSettings();
    
    // Validate configuration
    if (!AgentFactory.validateSettings(settings)) {
      throw new Error('Please configure OpenRouter API settings first');
    }
    
    // Create a general assistant
    const agent = AgentFactory.createAgent('general', settings);
    
    // Send a message
    const response = await agent.sendMessage('Hello! Can you help me understand TypeScript generics?');
    console.log('Agent response:', response);
    
    return response;
  } catch (error) {
    console.error('Basic agent example failed:', error);
    throw error;
  }
}

/**
 * Code assistant example
 */
export async function codeAssistantExample() {
  const settings = await readSettings();
  const codeAgent = AgentFactory.createAgent('code', settings);
  
  const codeQuestion = `
    I have this TypeScript function but it's not working:
    
    function findUser(users: User[], id: string) {
      return users.filter(user => user.id === id);
    }
    
    What's wrong with it?
  `;
  
  const response = await codeAgent.sendMessage(codeQuestion);
  return response;
}

/**
 * Session-based agent management example
 */
export async function sessionBasedExample() {
  // Get agent manager instance
  const manager = AgentManager.getInstance();
  await manager.initialize();
  
  // Check if settings are valid
  const isValid = await manager.validateSettings();
  if (!isValid) {
    throw new Error('Invalid settings configuration');
  }
  
  const sessionId = 12345;
  
  // Get agent for session (creates if doesn't exist)
  const agent1 = await manager.getSessionAgent(sessionId, 'general');
  const response1 = await agent1.sendMessage('What is React?');
  
  // Switch to code assistant for same session
  const agent2 = await manager.updateSessionAgent(sessionId, 'code');
  const response2 = await agent2.sendMessage('Show me a React component example');
  
  return { response1, response2 };
}

/**
 * Multiple agent types example
 */
export async function multipleAgentsExample() {
  const settings = await readSettings();
  
  // Create different types of agents
  const agents: { [key in AgentType]: any } = {
    general: AgentFactory.createAgent('general', settings),
    code: AgentFactory.createAgent('code', settings),
    research: AgentFactory.createAgent('research', settings),
    creative: AgentFactory.createAgent('creative', settings),
  };
  
  // Ask the same question to different agents
  const question = 'How can I improve my productivity?';
  
  const responses = await Promise.all(
    Object.entries(agents).map(async ([type, agent]) => {
      const response = await agent.sendMessage(question);
      return { type, response };
    })
  );
  
  return responses;
}

/**
 * Agent capabilities inspection
 */
export function inspectAgentCapabilities() {
  const allTypes = AgentFactory.getAllAgentTypes();
  
  const capabilities = allTypes.map(type => ({
    type,
    ...AgentFactory.getAgentCapabilities(type),
  }));
  
  console.log('Available agent types and their capabilities:');
  capabilities.forEach(cap => {
    console.log(`\n${cap.type.toUpperCase()}:`);
    console.log(`  Name: ${cap.name}`);
    console.log(`  Description: ${cap.description}`);
    console.log(`  Temperature: ${cap.temperature}`);
    console.log(`  Max Tokens: ${cap.maxTokens}`);
    console.log(`  System Prompt: ${cap.systemPrompt.substring(0, 100)}...`);
  });
  
  return capabilities;
}

/**
 * Error handling example
 */
export async function errorHandlingExample() {
  try {
    const settings = await readSettings();
    
    // This will throw if settings are invalid
    const agent = AgentFactory.createAgent('general', settings);
    
    // This will throw if the API call fails
    const response = await agent.sendMessage('Hello');
    
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.error('Configuration error: Please set up your OpenRouter API key');
      } else if (error.message.includes('Failed to get response')) {
        console.error('Network or API error:', error.message);
      } else {
        console.error('Unexpected error:', error.message);
      }
    }
    
    throw error;
  }
}
