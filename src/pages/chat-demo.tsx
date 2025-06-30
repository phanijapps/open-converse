import React, { useState } from 'react';
import { Box, Container, Text, Badge, HStack, VStack } from '@chakra-ui/react';
import { ChatMessageInput } from '@/components/chat';
import type { AgentType } from '@/agents';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  agentType?: AgentType;
}

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId] = useState<number>(1); // Mock session ID

  const handleMessage = (content: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isUser,
      timestamp: new Date(),
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
            LangChain.js Chat Demo
          </Text>
          <Text color="gray.600">
            Test the new modular agent system with different AI assistants
          </Text>
        </Box>

        <Box height="1px" bg="gray.200" />

        {/* Chat Messages */}
        <Box 
          height="500px" 
          overflowY="auto" 
          border="1px solid" 
          borderColor="gray.200" 
          borderRadius="lg"
          p={4}
          bg="gray.50"
        >
          <VStack gap={4} align="stretch">
            {messages.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                Start a conversation with the AI assistant...
              </Text>
            ) : (
              messages.map((message) => (
                <Box
                  key={message.id}
                  alignSelf={message.isUser ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  <Box
                    bg={message.isUser ? 'blue.500' : 'white'}
                    color={message.isUser ? 'white' : 'gray.800'}
                    px={4}
                    py={3}
                    borderRadius="lg"
                    boxShadow="sm"
                    border={message.isUser ? 'none' : '1px solid'}
                    borderColor={message.isUser ? 'transparent' : 'gray.200'}
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {message.content}
                    </Text>
                  </Box>
                  <HStack justify={message.isUser ? 'flex-end' : 'flex-start'} mt={1}>
                    <Text fontSize="xs" color="gray.500">
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                    {!message.isUser && (
                      <Badge size="sm" colorScheme="blue">
                        AI Assistant
                      </Badge>
                    )}
                  </HStack>
                </Box>
              ))
            )}
          </VStack>
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
              • Use ⌘+Enter (Mac) or Ctrl+Enter (Windows) to send messages quickly
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Switch between different AI assistants using the dropdown
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Each assistant has different specialties (General, Code, Research, Creative)
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Currently configured with OpenRouter + DeepSeek Chat v3
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default ChatDemo;
