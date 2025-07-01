import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Box, 
  Heading, 
  VStack, 
  HStack, 
  Button,
  Text,
  IconButton,
  SimpleGrid,
  Badge,
  Spinner
} from '@chakra-ui/react';
import { Bot, MessageCircle, Settings, ArrowLeft, Home, Play, Square, Trash2, Plus } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { useTriggers } from '@/hooks/useTriggers';
import { useSessions } from '@/hooks/useSessions';
import { useRouter } from 'next/router';

const AgentsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'management' | 'chat' | 'triggers'>('management');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const router = useRouter();
  
  const { 
    agents, 
    loading: agentsLoading, 
    error: agentsError,
    createAgent,
    deleteAgent,
    startAgent,
    stopAgent,
    createAgentSession
  } = useAgents();
  
  const { 
    triggers, 
    loading: triggersLoading, 
    error: triggersError 
  } = useTriggers();

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple alert for now, can be replaced with a proper toast system later
    alert(`${title}: ${message}`);
  };

  const handleStartChat = async (agentId: string) => {
    try {
      // Create a new session for this agent
      const session = await createAgentSession(agentId);
      
      if (session) {
        showNotification("Agent Chat Started", `Started new chat session with agent`, 'success');
        
        // Navigate to the main chat page with the new session
        router.push(`/?session=${session.id}`);
      } else {
        throw new Error('Failed to create agent session');
      }
    } catch (error) {
      showNotification("Error", "Failed to start chat with agent", 'error');
    }
  };

  const handleStartAgent = async (agentId: string) => {
    try {
      const success = await startAgent(agentId);
      if (success) {
        showNotification("Agent Started", "Agent is now running", 'success');
      } else {
        throw new Error('Failed to start agent');
      }
    } catch (error) {
      showNotification("Error", "Failed to start agent", 'error');
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      const success = await stopAgent(agentId);
      if (success) {
        showNotification("Agent Stopped", "Agent has been stopped", 'info');
      } else {
        throw new Error('Failed to stop agent');
      }
    } catch (error) {
      showNotification("Error", "Failed to stop agent", 'error');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }
    
    try {
      const success = await deleteAgent(agentId);
      if (success) {
        showNotification("Agent Deleted", "Agent has been permanently deleted", 'success');
      } else {
        throw new Error('Failed to delete agent');
      }
    } catch (error) {
      showNotification("Error", "Failed to delete agent", 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'green';
      case 'stopped': return 'gray';
      case 'error': return 'red';
      case 'starting': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      <Box maxW="7xl" mx="auto">
        {/* Header with Back Button */}
        <VStack gap={6} align="stretch">
          <Box>
            <HStack gap={3} mb={4} justify="space-between" align="center">
              <HStack gap={3}>
                <Bot size={32} color="#459AFF" />
                <Heading size="xl" color="gray.700">
                  Agent Space
                </Heading>
              </HStack>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  _hover={{
                    bg: "gray.100",
                    borderColor: "gray.400",
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to Chat
                </Button>
              </Link>
            </HStack>
            <Text color="gray.600" fontSize="lg">
              Manage your AI agents, configure triggers, and interact with your personal agent ecosystem
            </Text>
          </Box>

          {/* Navigation */}
          <Box bg="white" borderRadius="xl" p={6} shadow="sm" border="1px solid" borderColor="gray.200">
            <HStack gap={4} mb={6}>
              <Button
                variant={activeView === 'management' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setActiveView('management')}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Bot size={16} />
                Agent Management
              </Button>
              <Button
                variant={activeView === 'chat' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setActiveView('chat')}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <MessageCircle size={16} />
                Agent Chat
              </Button>
              <Button
                variant={activeView === 'triggers' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setActiveView('triggers')}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Settings size={16} />
                Triggers & Automation
              </Button>
            </HStack>

            {/* Content */}
            {activeView === 'management' && (
              <Box>
                <HStack justify="space-between" align="center" mb={6}>
                  <Text fontSize="lg" fontWeight="semibold">Agent Management</Text>
                  <Button
                    colorScheme="blue"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus size={16} />
                    Create Agent
                  </Button>
                </HStack>

                {agentsError && (
                  <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4} mb={4}>
                    <Text color="red.600" fontWeight="semibold">Error loading agents</Text>
                    <Text color="red.500" fontSize="sm">{agentsError}</Text>
                  </Box>
                )}

                {agentsLoading ? (
                  <Box display="flex" justifyContent="center" py={8}>
                    <Spinner size="lg" color="blue.500" />
                  </Box>
                ) : agents.length === 0 ? (
                  <Box 
                    textAlign="center" 
                    py={12}
                    bg="gray.50" 
                    borderRadius="lg"
                    border="2px dashed"
                    borderColor="gray.300"
                  >
                    <Bot size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.500" fontSize="lg" mb={4}>
                      No agents created yet
                    </Text>
                    <Text color="gray.400" mb={6}>
                      Create your first AI agent to get started
                    </Text>
                    <Button 
                      colorScheme="blue" 
                      onClick={() => setShowCreateForm(true)}
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      <Plus size={16} />
                      Create Agent
                    </Button>
                  </Box>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                    {agents.map(agent => (
                      <Box
                        key={agent.id}
                        bg="white"
                        p={6}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="gray.200"
                        shadow="sm"
                        _hover={{ shadow: "md" }}
                        transition="all 0.2s"
                      >
                        <VStack align="stretch" gap={4}>
                          <HStack justify="space-between" align="start">
                            <VStack align="start" gap={2} flex={1}>
                              <HStack gap={2}>
                                <Bot size={20} color="#459AFF" />
                                <Text fontWeight="semibold" fontSize="lg">
                                  {agent.name}
                                </Text>
                              </HStack>
                              <Badge colorScheme={getStatusColor(agent.status)}>
                                {agent.status}
                              </Badge>
                            </VStack>
                            <IconButton
                              aria-label="Delete agent"
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDeleteAgent(agent.id)}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </HStack>

                          <Text color="gray.600" fontSize="sm">
                            {agent.description}
                          </Text>

                          <Text color="gray.400" fontSize="xs">
                            Type: {agent.agent_type}
                          </Text>

                          <HStack gap={2}>
                            <Button
                              size="sm"
                              colorScheme="green"
                              variant={agent.status === 'running' ? 'solid' : 'outline'}
                              onClick={() => handleStartAgent(agent.id)}
                              disabled={agent.status === 'running'}
                              display="flex"
                              alignItems="center"
                              gap={1}
                            >
                              <Play size={12} />
                              Start
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="gray"
                              variant={agent.status === 'stopped' ? 'solid' : 'outline'}
                              onClick={() => handleStopAgent(agent.id)}
                              disabled={agent.status === 'stopped'}
                              display="flex"
                              alignItems="center"
                              gap={1}
                            >
                              <Square size={12} />
                              Stop
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => handleStartChat(agent.id)}
                              display="flex"
                              alignItems="center"
                              gap={1}
                              flex={1}
                            >
                              <MessageCircle size={12} />
                              Chat
                            </Button>
                          </HStack>
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}

                {showCreateForm && (
                  <Box 
                    mb={6}
                    bg="blue.50" 
                    p={6} 
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="blue.200"
                  >
                    <HStack justify="space-between" mb={4}>
                      <Text fontSize="lg" fontWeight="semibold">Create New Agent</Text>
                      <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                        ✕
                      </Button>
                    </HStack>
                    <Text color="gray.600" mb={4}>
                      Agent creation form will be implemented here. For now, this is a placeholder.
                    </Text>
                    <HStack gap={2}>
                      <Button size="sm" colorScheme="blue" onClick={() => {
                        alert('Agent creation will be implemented soon!');
                        setShowCreateForm(false);
                      }}>
                        Create Agent
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </HStack>
                  </Box>
                )}
              </Box>
            )}

            {activeView === 'chat' && (
              <Box>
                {selectedAgentId ? (
                  <Box>
                    <Text fontSize="lg" mb={4} fontWeight="semibold">Chat with Agent</Text>
                    <Text color="gray.600">
                      Chat interface with agent {selectedAgentId}. This will redirect to the main chat interface.
                    </Text>
                  </Box>
                ) : (
                  <Box 
                    textAlign="center" 
                    py={12}
                    bg="gray.50" 
                    borderRadius="lg"
                    border="2px dashed"
                    borderColor="gray.300"
                  >
                    <Bot size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.500" fontSize="lg" mb={4}>
                      No agent selected
                    </Text>
                    <Text color="gray.400" mb={6}>
                      Select an agent from the Agent Management tab to start chatting
                    </Text>
                    <Button 
                      colorScheme="blue" 
                      onClick={() => setActiveView('management')}
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      <Bot size={16} />
                      Go to Agent Management
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {activeView === 'triggers' && (
              <Box>
                <HStack justify="space-between" align="center" mb={6}>
                  <Text fontSize="lg" fontWeight="semibold">Triggers & Automation</Text>
                  <Button
                    colorScheme="blue"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    onClick={() => alert('Create trigger functionality coming soon!')}
                  >
                    <Plus size={16} />
                    Create Trigger
                  </Button>
                </HStack>

                {triggersError && (
                  <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4} mb={4}>
                    <Text color="red.600" fontWeight="semibold">Error loading triggers</Text>
                    <Text color="red.500" fontSize="sm">{triggersError}</Text>
                  </Box>
                )}

                {triggersLoading ? (
                  <Box display="flex" justifyContent="center" py={8}>
                    <Spinner size="lg" color="blue.500" />
                  </Box>
                ) : triggers.length === 0 ? (
                  <Box 
                    textAlign="center" 
                    py={12}
                    bg="gray.50" 
                    borderRadius="lg"
                    border="2px dashed"
                    borderColor="gray.300"
                  >
                    <Settings size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.500" fontSize="lg" mb={4}>
                      No triggers configured
                    </Text>
                    <Text color="gray.400" mb={6}>
                      Create triggers to automate your agents
                    </Text>
                  </Box>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                    {triggers.map(trigger => (
                      <Box
                        key={trigger.id}
                        bg="white"
                        p={6}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="gray.200"
                        shadow="sm"
                      >
                        <VStack align="stretch" gap={3}>
                          <HStack justify="space-between">
                            <Text fontWeight="semibold">{trigger.name}</Text>
                            <Badge colorScheme={trigger.enabled ? 'green' : 'gray'}>
                              {trigger.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </HStack>
                          <Text color="gray.600" fontSize="sm">
                            {trigger.description}
                          </Text>
                          <Text color="gray.400" fontSize="xs">
                            Type: {trigger.trigger_type} | Agent: {trigger.agent_id}
                          </Text>
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Box>
            )}
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default AgentsPage;
