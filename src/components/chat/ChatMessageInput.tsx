import React, { useState, useRef } from 'react';
import {
  Box,
  Input,
  Button,
  HStack,
  Text,
} from '@chakra-ui/react';
import { Send } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { AgentFactory, type AgentType } from '@/agents';

interface ChatMessageInputProps {
  sessionId: number;
  onMessage?: (content: string, isUser: boolean) => void;
  onError?: (error: string) => void;
  showAgentSelector?: boolean;
  initialAgentType?: AgentType;
  placeholder?: string;
  disabled?: boolean;
}

const ChatMessageInput: React.FC<ChatMessageInputProps> = ({
  sessionId,
  onMessage,
  onError,
  showAgentSelector = true,
  initialAgentType = 'general',
  placeholder = 'Type your message...',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(initialAgentType);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendMessage: sendChatMessage, isLoading, error, clearError } = useChat({
    onSuccess: (response, agentType) => {
      onMessage?.(response, false);
      setMessage('');
      inputRef.current?.focus();
    },
    onError: (errorMsg) => {
      onError?.(errorMsg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading || disabled) {
      return;
    }

    // Add user message to chat immediately
    onMessage?.(message, true);

    try {
      await sendChatMessage(message, sessionId, selectedAgent);
    } catch (error) {
      // Error handling is done in the useChat hook
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const agentTypes = AgentFactory.getAllAgentTypes();

  return (
    <Box>
      {error && (
        <Box bg="red.50" p={3} borderRadius="md" mb={4} border="1px solid" borderColor="red.200">
          <Text color="red.600" fontSize="sm">{error}</Text>
          <Button
            size="xs"
            variant="ghost"
            colorScheme="red"
            onClick={clearError}
            mt={2}
          >
            Dismiss
          </Button>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <HStack gap={3}>
          {showAgentSelector && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
              style={{
                width: '200px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
              }}
              disabled={isLoading || disabled}
            >
              {agentTypes.map((type) => {
                const capabilities = AgentFactory.getAgentCapabilities(type);
                return (
                  <option key={type} value={type}>
                    {capabilities.name}
                  </option>
                );
              })}
            </select>
          )}

          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            flex="1"
          />

          <Button
            type="submit"
            colorScheme="blue"
            disabled={!message.trim() || isLoading || disabled}
            minW="auto"
            px={4}
          >
            {isLoading ? 'Sending...' : <Send size={16} />}
          </Button>
        </HStack>
      </form>

      {showAgentSelector && (
        <Text fontSize="sm" color="gray.600" mt={2}>
          Agent: {AgentFactory.getAgentCapabilities(selectedAgent).description}
        </Text>
      )}
    </Box>
  );
};

export default ChatMessageInput;