import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Badge,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import { tauriCommands } from '@/utils/tauri';

interface Agent {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  status: 'stopped' | 'running' | 'error';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent_id?: string;
}

interface ChatSession {
  id: string;
  agent_id: string;
  agent_name: string;
  messages: ChatMessage[];
  created_at: string;
}

const AgentChat: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
    loadSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAgents = async () => {
    try {
      const agentList = await tauriCommands.listAgents();
      // Convert to the expected format and filter to running agents
      const chatAgents = agentList.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        agent_type: agent.agent_type,
        status: agent.status === 'running' ? 'running' : 'stopped' as 'running' | 'stopped' | 'error'
      })).filter(agent => agent.status === 'running');
      setAgents(chatAgents);
    } catch (err) {
      setError(`Failed to load agents: ${err}`);
    }
  };

  const loadSessions = async () => {
    try {
      // For now, just initialize empty sessions
      // TODO: Add a Tauri command to get agent chat sessions
      setSessions([]);
    } catch (err) {
      console.log('No existing sessions or command not implemented');
      setSessions([]);
    }
  };

  const startNewSession = async (agent: Agent) => {
    try {
      setSelectedAgent(agent);
      
      // Create a new session using the agent session integration
      const session = await tauriCommands.createAgentSession(agent.id, `Chat with ${agent.name}`);
      
      const newChatSession: ChatSession = {
        id: session.id.toString(),
        agent_id: agent.id,
        agent_name: agent.name,
        messages: [],
        created_at: new Date().toISOString()
      };
      
      setCurrentSession(newChatSession);
      setSessions(prev => [newChatSession, ...prev]);
      
      console.log(`Started new chat session with ${agent.name}`);
    } catch (err) {
      setError(`Failed to start session: ${err}`);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentSession || !selectedAgent) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      agent_id: selectedAgent.id
    };

    // Add user message to current session
    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage]
    } : null);

    setMessage('');
    setIsLoading(true);

    try {
      // Send message to agent using the integrated command
      const response = await tauriCommands.sendMessageToAgent(
        selectedAgent.id,
        parseInt(currentSession.id),
        userMessage.content
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.agentResponse,
        timestamp: new Date().toISOString(),
        agent_id: selectedAgent.id
      };

      // Add assistant message to current session
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage]
      } : null);

    } catch (err) {
      setError(`Failed to send message: ${err}`);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err}. Please try again.`,
        timestamp: new Date().toISOString(),
        agent_id: selectedAgent.id
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage]
      } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (error) {
    return (
      <Box p={6}>
        <Box p={4} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md">
          <Text color="red.600">{error}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <Box p={4} borderBottom="1px solid" borderColor="gray.200">
        <HStack justify="space-between" align="center">
          <HStack>
            <MessageSquare size={24} />
            <Text fontSize="xl" fontWeight="bold">
              Agent Chat
            </Text>
          </HStack>
          {selectedAgent && (
            <Badge colorScheme="green" variant="solid">
              {selectedAgent.name}
            </Badge>
          )}
        </HStack>
      </Box>

      {!currentSession ? (
        /* Agent Selection */
        <Box flex={1} p={6}>
          <VStack gap={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold">
              Select an Agent to Start Chatting
            </Text>
            
            {agents.length === 0 ? (
              <Box p={4} bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="md">
                <Text color="blue.600">
                  No running agents found. Please start an agent from the Agent Management page.
                </Text>
              </Box>
            ) : (
              <VStack gap={3} align="stretch">
                {agents.map(agent => (
                  <Box
                    key={agent.id}
                    p={4}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ bg: "gray.50", borderColor: "blue.300" }}
                    onClick={() => startNewSession(agent)}
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="semibold">{agent.name}</Text>
                      <Badge colorScheme={agent.status === 'running' ? 'green' : 'gray'}>
                        {agent.status}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      {agent.description}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </Box>
      ) : (
        /* Chat Interface */
        <>
          {/* Messages */}
          <Box flex={1} overflowY="auto" p={4}>
            <VStack gap={4} align="stretch">
              {currentSession.messages.map(msg => (
                <HStack
                  key={msg.id}
                  align="start"
                  justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                >
                  {msg.role === 'assistant' && <Bot size={20} />}
                  <Box
                    maxW="70%"
                    p={3}
                    borderRadius="lg"
                    bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
                    color={msg.role === 'user' ? 'white' : 'black'}
                  >
                    <Text fontSize="sm">{msg.content}</Text>
                  </Box>
                  {msg.role === 'user' && <User size={20} />}
                </HStack>
              ))}
              
              {isLoading && (
                <HStack justify="flex-start">
                  <Bot size={20} />
                  <Box p={3} borderRadius="lg" bg="gray.100">
                    <Spinner size="sm" />
                  </Box>
                </HStack>
              )}
              
              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          {/* Divider */}
          <Box borderTop="1px solid" borderColor="gray.200" />

          {/* Message Input */}
          <Box p={4}>
            <HStack gap={2}>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!message.trim() || isLoading}
                colorScheme="blue"
              >
                <Send size={16} />
              </Button>
            </HStack>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AgentChat;
