/**
 * Basic agent usage examples
 * These examples show simple, straightforward usage patterns
 */

import { AgentFactory } from '../../core/factory';
import { readSettings } from '@/utils/settings';
import type { AgentType } from '../../core/types';

/**
 * Example 1: Simple agent creation and usage
 */
export async function simpleAgentExample(): Promise<string> {
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
    console.error('Simple agent example failed:', error);
    throw error;
  }
}

/**
 * Example 2: Different agent types
 */
export async function differentAgentTypesExample(): Promise<Record<AgentType, string>> {
  const settings = await readSettings();
  const results: Record<AgentType, string> = {} as any;
  
  // Test each agent type
  const agentTypes = AgentFactory.getAllAgentTypes();
  
  for (const type of agentTypes) {
    const agent = AgentFactory.createAgent(type, settings);
    const response = await agent.sendMessage(`What can you help me with as a ${type} assistant?`);
    results[type] = response;
    console.log(`${type} agent:`, response.substring(0, 100) + '...');
  }
  
  return results;
}

/**
 * Example 3: Agent with context
 */
export async function agentWithContextExample(): Promise<string> {
  const settings = await readSettings();
  const codeAgent = AgentFactory.createAgent('code', settings);
  
  const context = {
    language: 'TypeScript',
    framework: 'React',
    problem: 'State management',
  };
  
  const response = await codeAgent.sendMessage(
    'I need help with managing complex state in my application',
    context
  );
  
  return response;
}

/**
 * Example 4: Custom agent
 */
export async function customAgentExample(): Promise<string> {
  const settings = await readSettings();
  
  const customAgent = AgentFactory.createCustomAgent(
    'Math Tutor',
    'Specialized in explaining mathematical concepts',
    'You are a patient and encouraging math tutor. Break down complex problems into simple steps and provide clear explanations.',
    settings,
    {
      temperature: 0.3, // Lower temperature for more consistent math explanations
      maxTokens: 800,
    }
  );
  
  const response = await customAgent.sendMessage(
    'Can you explain calculus derivatives in simple terms?'
  );
  
  return response;
}

/**
 * Example 5: Error handling
 */
export async function errorHandlingExample(): Promise<void> {
  try {
    const settings = await readSettings();
    
    // This might throw configuration errors
    const agent = AgentFactory.createAgent('general', settings);
    
    // This might throw validation or network errors
    const response = await agent.sendMessage('Hello');
    
    console.log('Success:', response);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Handle different error types
    if (error.name === 'ConfigurationError') {
      console.log('Please check your API configuration');
    } else if (error.name === 'NetworkError') {
      console.log('Please check your internet connection');
    } else if (error.name === 'ValidationError') {
      console.log('Please check your input');
    } else {
      console.log('An unexpected error occurred');
    }
  }
}
