import React, { useState } from 'react';
import { Box, Container, Text, Badge, HStack, VStack } from '@chakra-ui/react';
import { ChatMessageInput, ChatStream } from '@/components/chat';
import type { AgentType } from '@/agents';
import type { ChatMessage } from '@shared/types';

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    // Sample markdown messages to demonstrate functionality
    {
      id: '1',
      content: `# Welcome to the Markdown Chat Demo! 🎉

This is a **demonstration** of markdown rendering in chat messages. Here are some features:

## Text Formatting
- **Bold text**
- *Italic text*
- \`inline code\`
- ~~strikethrough~~ (if supported)

## Code Blocks
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome to the chat, \${name}!\`;
}

greet('User');
\`\`\`

## Lists
1. First item
2. Second item
3. Third item

### Bullet points:
- Feature A
- Feature B  
- Feature C

## Links and More
Check out [this link](https://example.com) for more information.

> This is a blockquote with some important information
> that spans multiple lines.

Happy chatting! 🚀`,
      sender: 'ai',
      timestamp: Date.now() - 10000,
    }
  ]);
  const [currentSessionId] = useState<number>(1); // Mock session ID

  const handleMessage = (content: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: isUser ? 'user' : 'ai',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const handleError = (error: string) => {
    console.error('Chat error:', error);
    // You could show a toast notification here
  };

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Professional Chat with Markdown Support
          </Text>
          <Text color="gray.600">
            Enhanced chat experience with markdown rendering, professional fonts, and improved UI
          </Text>
        </Box>

        <Box height="1px" bg="gray.200" />

        {/* Chat Messages */}
        <Box 
          height="500px" 
          border="1px solid" 
          borderColor="gray.200" 
          borderRadius="lg"
          bg="gray.50"
          overflow="hidden"
        >
          <ChatStream messages={messages} />
        </Box>

        {/* Chat Input */}
        <ChatMessageInput
          sessionId={currentSessionId}
          onMessage={handleMessage}
          onError={handleError}
          showAgentSelector={true}
          initialAgentType="general"
        />

        <Box bg="blue.50" p={4} borderRadius="lg">
          <Text fontSize="sm" color="blue.800" fontWeight="medium" mb={2}>
            💡 Tips:
          </Text>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color="blue.700">
              • **Markdown support**: Use **bold**, *italics*, `code`, and more!
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Use ⌘+Enter (Mac) or Ctrl+Enter (Windows) to send messages quickly
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Switch between different AI assistants using the dropdown
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Each assistant has different specialties (General, Code, Research, Creative)
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Professional fonts: Inter and Manrope for better readability
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default ChatDemo;
