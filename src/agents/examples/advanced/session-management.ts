/**
 * Advanced agent usage examples
 * These examples show complex usage patterns and advanced features
 */

import { AgentManager } from '../../core/AgentManager';
import { AgentFactory } from '../../core/factory';
import type { AgentType } from '../../core/types';

/**
 * Example 1: Session-based agent management
 */
export async function sessionBasedExample(): Promise<{
  conversation1: string;
  conversation2: string;
  switchedResponse: string;
}> {
  // Get agent manager instance
  const manager = AgentManager.getInstance();
  await manager.initialize();
  
  // Check if settings are valid
  const isValid = await manager.validateSettings();
  if (!isValid) {
    throw new Error('Invalid settings configuration');
  }
  
  const sessionId = 12345;
  
  // Start conversation with general agent
  const agent1 = await manager.getSessionAgent(sessionId, 'general');
  const conversation1 = await agent1.sendMessage('What is React?');
  
  // Continue conversation (same session, same agent)
  const conversation2 = await agent1.sendMessage('Can you give me more details about React hooks?');
  
  // Switch to code assistant for same session
  const agent2 = await manager.updateSessionAgent(sessionId, 'code');
  const switchedResponse = await agent2.sendMessage('Show me a React component example with hooks');
  
  return { conversation1, conversation2, switchedResponse };
}

/**
 * Example 2: Multiple concurrent sessions
 */
export async function multipleConcurrentSessionsExample(): Promise<Record<string, string>> {
  const manager = AgentManager.getInstance();
  await manager.initialize();
  
  const sessions = [
    { id: 1001, type: 'general' as AgentType, question: 'What is artificial intelligence?' },
    { id: 1002, type: 'code' as AgentType, question: 'How do I implement a binary search?' },
    { id: 1003, type: 'creative' as AgentType, question: 'Write a short story about a robot' },
    { id: 1004, type: 'research' as AgentType, question: 'What are the benefits of renewable energy?' },
  ];
  
  // Process all sessions concurrently
  const results = await Promise.all(
    sessions.map(async (session) => {
      const agent = await manager.getSessionAgent(session.id, session.type);
      const response = await agent.sendMessage(session.question);
      return { sessionId: session.id, type: session.type, response };
    })
  );
  
  // Convert to record for easier access
  const resultMap: Record<string, string> = {};
  results.forEach(result => {
    resultMap[`session-${result.sessionId}-${result.type}`] = result.response;
  });
  
  return resultMap;
}

/**
 * Example 3: Agent comparison
 */
export async function agentComparisonExample(): Promise<{
  question: string;
  responses: Array<{ type: AgentType; response: string; }>;
}> {
  const manager = AgentManager.getInstance();
  await manager.initialize();
  
  const question = 'How can I improve my productivity while working from home?';
  
  // Get responses from all agent types
  const agentTypes = AgentFactory.getAllAgentTypes();
  const responses = await Promise.all(
    agentTypes.map(async (type) => {
      const agent = await manager.createAgent(type);
      const response = await agent.sendMessage(question);
      return { type, response };
    })
  );
  
  return { question, responses };
}

/**
 * Example 4: Agent with complex context and conversation history
 */
export async function complexContextExample(): Promise<string[]> {
  const manager = AgentManager.getInstance();
  await manager.initialize();
  
  const codeAgent = await manager.createAgent('code');
  const responses: string[] = [];
  
  // Simulate a multi-turn conversation with building context
  const conversation = [
    {
      message: 'I want to build a web application',
      context: { experience: 'beginner', preference: 'modern' }
    },
    {
      message: 'I prefer React. What do I need to know?',
      context: { 
        experience: 'beginner', 
        preference: 'modern',
        choice: 'React',
        focus: 'fundamentals'
      }
    },
    {
      message: 'How do I manage state in a complex React app?',
      context: { 
        experience: 'beginner', 
        preference: 'modern',
        choice: 'React',
        focus: 'state-management',
        complexity: 'high'
      }
    }
  ];
  
  for (const turn of conversation) {
    const response = await codeAgent.sendMessage(turn.message, turn.context);
    responses.push(response);
  }
  
  return responses;
}

/**
 * Example 5: Performance monitoring and optimization
 */
export async function performanceMonitoringExample(): Promise<{
  results: Array<{
    agentType: AgentType;
    responseTime: number;
    responseLength: number;
    tokensEstimate: number;
  }>;
  averageResponseTime: number;
}> {
  const manager = AgentManager.getInstance();
  await manager.initialize();
  
  const testMessage = 'Explain the concept of recursion in programming';
  const results = [];
  
  for (const agentType of AgentFactory.getAllAgentTypes()) {
    const startTime = Date.now();
    const agent = await manager.createAgent(agentType);
    const response = await agent.sendMessage(testMessage);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    const responseLength = response.length;
    const tokensEstimate = Math.ceil(responseLength / 4); // Rough estimate
    
    results.push({
      agentType,
      responseTime,
      responseLength,
      tokensEstimate,
    });
  }
  
  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  return { results, averageResponseTime };
}

/**
 * Example 6: Agent configuration inspection
 */
export function agentConfigurationInspection(): void {
  console.log('=== Agent Configuration Inspection ===\n');
  
  const agentInfo = AgentFactory.getAgentTypeInfo();
  
  agentInfo.forEach(info => {
    console.log(`${info.type.toUpperCase()} AGENT:`);
    console.log(`  Name: ${info.name}`);
    console.log(`  Description: ${info.description}`);
    console.log(`  Temperature: ${info.temperature}`);
    console.log(`  Max Tokens: ${info.maxTokens}`);
    console.log('');
  });
  
  const availableTypes = AgentFactory.getAllAgentTypes();
  console.log(`Available agent types: ${availableTypes.join(', ')}`);
}
