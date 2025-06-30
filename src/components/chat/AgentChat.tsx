import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import ChatStream from './ChatStream';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { AgentFactory } from '@/agents';
import { readSettings } from '@/utils/settings';
import type { ChatMessage, SettingsData } from '@shared/types';
import type { AgentType } from '@/agents';

interface AgentChatProps {
  sessionId?: number;
  initialAgentType?: AgentType;
  onMessageSent?: (message: ChatMessage) => void;
  onAgentResponse?: (message: ChatMessage, agentType: AgentType) => void;
}

const AgentChat: React.FC<AgentChatProps> = ({
  sessionId = 1,
  initialAgentType = 'general',
  onMessageSent,
  onAgentResponse,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(initialAgentType);
  const [isConfigured, setIsConfigured] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Get agent info for display
  const agentInfo = AgentFactory.getAgentTypeInfo();
  const currentAgentInfo = agentInfo.find(agent => agent.type === selectedAgent);

  // Initialize chat hook
  const { sendMessage, isLoading, error, clearError } = useChat({
    onSuccess: (response, agentType) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        content: response,
        sender: 'ai',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
      onAgentResponse?.(aiMessage, agentType);

      // Clear any previous errors
      clearError();
    },
    onError: (errorMessage) => {
      console.error('Agent Error:', errorMessage);
    },
  });

  // Load settings and check configuration
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await readSettings();
        setSettings(currentSettings);
        setIsConfigured(AgentFactory.validateSettings(currentSettings));
      } catch (err) {
        console.error('Failed to load settings:', err);
        setIsConfigured(false);
      } finally {
        setIsInitializing(false);
      }
    };

    loadSettings();
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !isConfigured) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    onMessageSent?.(userMessage);

    try {
      // Send to agent system
      await sendMessage(content.trim(), sessionId, selectedAgent);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Error handling is done in the useChat hook
    }
  }, [sendMessage, sessionId, selectedAgent, isConfigured, onMessageSent]);

  // Handle agent type change
  const handleAgentChange = useCallback((newAgentType: AgentType) => {
    setSelectedAgent(newAgentType);
    
    // Add agent change message
    const changeMessage: ChatMessage = {
      id: `change-${Date.now()}`,
      content: `Switched to ${agentInfo.find(a => a.type === newAgentType)?.name || newAgentType} agent`,
      sender: 'ai',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, changeMessage]);
  }, [agentInfo]);

  if (isInitializing) {
    return (
      <Flex align="center" justify="center" h="400px" direction="column" gap={4}>
        <Spinner size="lg" color="blue.500" />
        <Text color="gray.600">Initializing agent system...</Text>
      </Flex>
    );
  }

  if (!isConfigured) {
    return (
      <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
        <Text color="yellow.700">
          ⚠️ Agent system is not configured. Please configure your API settings.
        </Text>
      </Box>
    );
  }

  return (
    <Flex direction="column" h="100%" bg="gray.50" borderRadius="lg" overflow="hidden">
      {/* Agent Selector Header */}
      <Box bg="white" p={4} borderBottom="1px solid" borderColor="gray.200">
        <Flex justify="space-between" align="center" mb={2}>
          <Box>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Active Agent
            </Text>
            <Flex gap={2} align="center" mt={1}>
              <Badge colorScheme="blue" fontSize="xs">
                {selectedAgent}
              </Badge>
              {currentAgentInfo && (
                <Text fontSize="sm" color="gray.700" fontWeight="medium">
                  {currentAgentInfo.name}
                </Text>
              )}
            </Flex>
          </Box>
          
          <Box>
            <select
              value={selectedAgent}
              onChange={(e) => handleAgentChange(e.target.value as AgentType)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                background: '#f7fafc',
                fontSize: '14px',
              }}
            >
              {agentInfo.map((agent) => (
                <option key={agent.type} value={agent.type}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Box>
        </Flex>

        {currentAgentInfo && (
          <Text fontSize="xs" color="gray.500">
            {currentAgentInfo.description}
          </Text>
        )}
      </Box>

      {/* Chat Messages */}
      <Box flex={1} position="relative">
        <ChatStream messages={messages} />
        
        {/* Typing Indicator */}
        {isLoading && (
          <Box position="absolute" bottom={4} left={8}>
            <TypingIndicator />
          </Box>
        )}
      </Box>

      {/* Message Input */}
      <Box bg="white" borderTop="1px solid" borderColor="gray.200">
        <MessageInput onSend={handleSendMessage} />
      </Box>

      {/* Error Display */}
      {error && (
        <Box bg="red.50" p={3} borderTop="1px solid" borderColor="red.200">
          <Text fontSize="sm" color="red.600">❌ {error}</Text>
        </Box>
      )}
    </Flex>
  );
};

export default AgentChat;
