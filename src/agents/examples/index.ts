// Basic examples
export * from './basic/simple-usage';

// Advanced examples  
export * from './advanced/session-management';

/**
 * Example runner utility
 */
export async function runAllBasicExamples(): Promise<void> {
  console.log('=== Running Basic Agent Examples ===\n');
  
  try {
    const { simpleAgentExample, differentAgentTypesExample, customAgentExample } = await import('./basic/simple-usage');
    
    console.log('1. Simple Agent Example:');
    const simpleResult = await simpleAgentExample();
    console.log('✓ Completed\n');
    
    console.log('2. Different Agent Types Example:');
    const typesResult = await differentAgentTypesExample();
    console.log('✓ Completed\n');
    
    console.log('3. Custom Agent Example:');
    const customResult = await customAgentExample();
    console.log('✓ Completed\n');
    
  } catch (error) {
    console.error('Failed to run basic examples:', error);
  }
}

export async function runAllAdvancedExamples(): Promise<void> {
  console.log('=== Running Advanced Agent Examples ===\n');
  
  try {
    const { 
      sessionBasedExample, 
      multipleConcurrentSessionsExample,
      agentComparisonExample,
      performanceMonitoringExample,
      agentConfigurationInspection
    } = await import('./advanced/session-management');
    
    console.log('1. Session-based Example:');
    await sessionBasedExample();
    console.log('✓ Completed\n');
    
    console.log('2. Multiple Concurrent Sessions Example:');
    await multipleConcurrentSessionsExample();
    console.log('✓ Completed\n');
    
    console.log('3. Agent Comparison Example:');
    await agentComparisonExample();
    console.log('✓ Completed\n');
    
    console.log('4. Performance Monitoring Example:');
    await performanceMonitoringExample();
    console.log('✓ Completed\n');
    
    console.log('5. Agent Configuration Inspection:');
    agentConfigurationInspection();
    console.log('✓ Completed\n');
    
  } catch (error) {
    console.error('Failed to run advanced examples:', error);
  }
}
