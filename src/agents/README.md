# Agent System

A modular, extensible AI agent system built with LangChain.js that supports multiple agent types and session-based management.

## 🧠 Memory Integration (Tauri, Modular, Pluggable)

- All agent and chat memory operations use the `MemoryProvider` interface (see `shared/memory.ts`).
- The default implementation is `MessageMemoryProvider`, which uses the Message table for chat context/history.
- To add new memory backends, implement the interface, add Tauri commands, and wire up new API endpoints.
- No direct DB or Tauri calls from agent or client code—everything is abstracted and pluggable.

## 🏗️ Architecture

```
src/agents/
├── core/                    # Core functionality
│   ├── types.ts            # Type definitions
│   ├── factory.ts          # Agent creation factory
│   └── AgentManager.ts     # Session-based agent management
├── config/                 # Configuration files
│   ├── defaults.ts         # Default agent configurations
│   └── llm.ts             # LLM provider configurations
├── implementations/        # Agent implementations
│   └── BaseLangChainAgent.ts # Base LangChain.js agent
├── utils/                 # Utility functions
│   ├── validation.ts      # Input validation utilities
│   └── errors.ts          # Error handling utilities
├── examples/              # Usage examples
│   ├── basic/             # Simple usage examples
│   ├── advanced/          # Complex usage patterns
│   └── index.ts           # Examples runner
└── README.md              # This file
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { AgentFactory } from '@/agents';
import { readSettings } from '@/utils/settings';

// Create and use an agent
const settings = await readSettings();
const agent = AgentFactory.createAgent('general', settings);
const response = await agent.sendMessage('Hello, how can you help me?');
```

### Session-based Management

```typescript
import { AgentManager } from '@/agents';

// Get manager instance
const manager = AgentManager.getInstance();
await manager.initialize();

// Get agent for specific session
const sessionId = 12345;
const agent = await manager.getSessionAgent(sessionId, 'code');
const response = await agent.sendMessage('Help me debug this code');
```

## 🤖 Agent Types

| Type | Name | Description | Use Cases |
|------|------|-------------|-----------|
| `general` | General Assistant | Versatile AI for general tasks | Q&A, general help, conversations |
| `code` | Code Assistant | Programming and technical help | Code review, debugging, explanations |
| `research` | Research Assistant | Analysis and fact-checking | Research, data analysis, investigations |
| `creative` | Creative Assistant | Creative writing and brainstorming | Writing, ideation, artistic projects |

## 🔧 Configuration

### Agent Configuration

Agents are configured in [`config/defaults.ts`](config/defaults.ts):

```typescript
export const DEFAULT_AGENT_CONFIGS: Record<AgentType, AgentCapabilities> = {
  general: {
    name: 'General Assistant',
    description: 'A versatile AI assistant',
    systemPrompt: 'You are a helpful AI assistant...',
    temperature: 0.7,
    maxTokens: 1000,
  },
  // ... other configurations
};
```

### LLM Provider Configuration

Configure LLM providers in your settings:

```json
{
  "providers": [
    {
      "id": "openrouter",
      "description": "OpenRouter API",
      "base_url": "https://openrouter.ai/api/v1",
      "api_key": "your-api-key",
      "enabled": true
    }
  ]
}
```

## 📖 API Reference

### AgentFactory

Static factory class for creating agents.

#### Methods

- `createAgent(type: AgentType, settings: SettingsData): ChatAgent`
- `createCustomAgent(name, description, systemPrompt, settings, options): ChatAgent`
- `getAgentCapabilities(type: AgentType): AgentCapabilities`
- `getAllAgentTypes(): AgentType[]`
- `validateSettings(settings: SettingsData): boolean`

### AgentManager

Singleton class for session-based agent management.

#### Methods

- `getInstance(): AgentManager`
- `initialize(): Promise<void>`
- `createAgent(type: AgentType): Promise<ChatAgent>`
- `getSessionAgent(sessionId: number, type?: AgentType): Promise<ChatAgent>`
- `updateSessionAgent(sessionId: number, type: AgentType): Promise<ChatAgent>`
- `removeSessionAgent(sessionId: number): void`
- `validateSettings(): Promise<boolean>`

### ChatAgent Interface

```typescript
interface ChatAgent {
  type: AgentType;
  capabilities: AgentCapabilities;
  sendMessage(message: string, context?: any): Promise<string>;
}
```

## 🛠️ Extending the System

### Creating Custom Agent Types

1. **Add to agent types:**
```typescript
// In core/types.ts
export type AgentType = 'general' | 'code' | 'research' | 'creative' | 'your-type';
```

2. **Add configuration:**
```typescript
// In config/defaults.ts
export const DEFAULT_AGENT_CONFIGS = {
  // ... existing configs
  'your-type': {
    name: 'Your Agent',
    description: 'Your custom agent',
    systemPrompt: 'Your system prompt...',
    temperature: 0.7,
    maxTokens: 1000,
  }
};
```

### Creating Custom Agent Implementations

Extend the base agent class:

```typescript
import { BaseLangChainAgent } from '../implementations/BaseLangChainAgent';

class CustomAgent extends BaseLangChainAgent {
  protected formatContext(context: any): string | null {
    // Custom context formatting logic
    return super.formatContext(context);
  }
  
  async sendMessage(message: string, context?: any): Promise<string> {
    // Custom pre/post processing
    const processedMessage = this.preProcess(message);
    const response = await super.sendMessage(processedMessage, context);
    return this.postProcess(response);
  }
}
```

## 🔍 Error Handling

The system provides comprehensive error handling:

```typescript
import { AgentError, ConfigurationError, NetworkError } from '@/agents';

try {
  const response = await agent.sendMessage('Hello');
} catch (error) {
  if (error instanceof ConfigurationError) {
    // Handle configuration issues
  } else if (error instanceof NetworkError) {
    // Handle network issues  
  } else if (error instanceof AgentError) {
    // Handle other agent errors
  }
}
```

## 📝 Examples

See the [`examples/`](examples/) directory for comprehensive usage examples:

- **Basic Examples**: Simple usage patterns in [`examples/basic/`](examples/basic/)
- **Advanced Examples**: Complex patterns in [`examples/advanced/`](examples/advanced/)

Run examples:

```typescript
import { runAllBasicExamples, runAllAdvancedExamples } from '@/agents/examples';

await runAllBasicExamples();
await runAllAdvancedExamples();
```

## 🧪 Testing

The system includes validation utilities for testing:

```typescript
import { validateSettingsForAgents, validateMessage } from '@/agents';

// Validate settings
const validation = validateSettingsForAgents(settings);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}

// Validate messages
const messageValidation = validateMessage('Hello world');
if (messageValidation.valid) {
  // Message is valid
}
```

## 🔮 Future Extensions

The modular architecture supports easy extension:

1. **New Agent Types**: Add specialized agents (e.g., `medical`, `legal`, `education`)
2. **Multiple LLM Providers**: Support for different AI providers
3. **Agent Plugins**: Plugin system for extending agent capabilities
4. **Conversation Memory**: Persistent conversation history
5. **Agent Orchestration**: Multi-agent collaboration
6. **Real-time Streaming**: Streaming responses
7. **Function Calling**: Tool usage capabilities

## 📄 License

This agent system is part of the OpenConverse project.
