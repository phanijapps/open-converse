import React, { useState, useMemo } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Input, 
  Button, 
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { Search, MessageCircle, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import SettingsDropdown from '../ui/SettingsDropdown';
import useSessions from '@/hooks/useSessions';
import type { Session } from '@shared/database-types';

export interface Conversation {
  id: string;
  name: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  activeId, 
  onSelect, 
  onNewChat,
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const { sessions, loading, error, createSession, deleteSession } = useSessions();

  // Use passed conversations or fall back to sessions, then apply search filter
  const filteredConversations = useMemo(() => {
    // Prefer passed conversations, fall back to sessions
    const allConversations = conversations.length > 0 
      ? conversations 
      : sessions.map(session => ({
          id: session.id.toString(),
          name: session.name,
        }));

    if (!searchQuery.trim()) {
      return allConversations;
    }

    return allConversations.filter(conv => 
      conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, sessions, searchQuery]);

  const handleNewChat = async () => {
    if (onNewChat) {
      onNewChat();
    } else {
      // Create a new session with a default name
      const timestamp = new Date().toLocaleString();
      await createSession(`New Chat - ${timestamp}`);
    }
  };

  const handleClearAll = async () => {
    if (sessions.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete all ${sessions.length} sessions? This action cannot be undone.`)) {
      return;
    }

    // This will be handled by the advanced settings page
    // For now, just show a message
    alert('To delete all sessions, please use the Advanced Settings page.');
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string, event: React.MouseEvent) => {
    console.log('handleDeleteSession called with:', { sessionId, sessionName });
    event.stopPropagation(); // Prevent triggering onSelect
    
    if (!window.confirm(`Are you sure you want to delete "${sessionName}"? This will permanently delete all conversations and messages in this session.`)) {
      console.log('User cancelled deletion');
      return;
    }

    console.log('User confirmed deletion, proceeding...');
    setDeletingSessionId(sessionId);
    
    try {
      const success = await deleteSession(parseInt(sessionId));
      console.log('Delete session result:', success);
      
      if (success) {
        // If the deleted session was active, clear the active selection
        if (activeId === sessionId) {
          onSelect('');
        }
      }
    } catch (error) {
      console.error('Failed to delete session from sidebar:', error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <Box 
      w={isCollapsed ? "64px" : { base: "100vw", md: "320px", lg: "348px", xl: "380px" }}
      h="100vh" 
      bg="white" 
      borderRight="1px solid" 
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
      transition="width 0.3s ease"
      position={{ base: "fixed", md: "relative" }}
      top={{ base: 0, md: "auto" }}
      left={{ base: 0, md: "auto" }}
      zIndex={{ base: 1000, md: "auto" }}
      boxShadow={{ base: "2xl", md: "none" }}
    >

      {/* Header with Logo */}
      <Box 
        p={isCollapsed ? 4 : 6} 
        borderBottom="1px solid" 
        borderColor="gray.100" 
        position="relative"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        {!isCollapsed ? (
          <HStack justify="space-between" align="center" w="full">
            <Text 
              fontSize="2xl" 
              fontWeight="medium" 
              color="gray.700"
              letterSpacing="0.25em"
              className="sidebar-title"
              fontFamily="var(--font-secondary)"
            >
              OpenConv
            </Text>
            <IconButton
              aria-label="Collapse sidebar"
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
              _hover={{
                bg: "gray.100"
              }}
            >
              <ChevronLeft size={16} />
            </IconButton>
          </HStack>
        ) : (
          <Box 
            w="48px" 
            h="48px" 
            borderRadius="24px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <Text 
              fontSize="lg" 
              fontWeight="medium" 
              color="gray.700"
              className="sidebar-title"
              fontFamily="var(--font-secondary)"
              mr={1}
            >
              O
            </Text>
            <IconButton
              aria-label="Expand sidebar"
              size="xs"
              variant="ghost"
              onClick={onToggleCollapse}
              _hover={{
                bg: "gray.100"
              }}
              minW="auto"
              h="auto"
              p={1}
              borderRadius="full"
            >
              <ChevronRight size={12} />
            </IconButton>
          </Box>
        )}
      </Box>

      {!isCollapsed ? (
        <>
          {/* New Chat Button with Settings */}
          <Box px={{ base: 3, sm: 4, md: 6 }} pt={4}>
            <HStack gap={3}>
              <Button
                flex={1}
                h="50px"
                bg="linear-gradient(135deg, #459AFF 0%, #6054FF 100%)"
                color="white"
                borderRadius="25px"
                fontSize="16px"
                fontWeight="500"
                fontFamily="var(--font-primary)"
                className="sidebar-button"
                onClick={handleNewChat}
                disabled={loading}
                _hover={{
                  bg: "linear-gradient(135deg, #4092ff 0%, #5a4ce6 100%)",
                  transform: 'translateY(-1px)',
                }}
                _active={{
                  transform: 'translateY(0)',
                }}
                transition="all 0.2s ease"
                display="flex"
                alignItems="center"
                gap={3}
              >
                {loading ? <Spinner size="sm" /> : <Plus size={18} />}
                New chat
              </Button>
              <SettingsDropdown isCollapsed={false} />
            </HStack>
          </Box>

          {/* Search */}
          <Box px={{ base: 3, sm: 4, md: 6 }} py={4}>
            <Box position="relative">
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#9CA3AF' 
                }} 
              />
              <Input 
                pl={12}
                h="50px"
                borderRadius="25px"
                placeholder="Search conversations..."
                bg="#8B81FF"
                border="none"
                color="white"
                fontSize="16px"
                fontFamily="var(--font-primary)"
                className="sidebar-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                _placeholder={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: '400'
                }}
                _focus={{ 
                  outline: "none", 
                  boxShadow: "none"
                }}
              />
            </Box>
          </Box>

          {/* Conversations Header */}
          <Box px={{ base: 3, sm: 4, md: 6 }} py={4}>
            <HStack justify="space-between" align="center">
              <Text 
                fontSize="xs" 
                fontWeight="semibold" 
                color="#6A6969"
                className="sidebar-label"
                fontFamily="var(--font-primary)"
              >
                Your conversations
              </Text>
              <Text 
                fontSize="sm" 
                fontWeight="medium" 
                color="#5661F6"
                cursor="pointer"
                className="sidebar-nav-item"
                fontFamily="var(--font-primary)"
                onClick={handleClearAll}
                _hover={{ textDecoration: 'underline' }}
              >
                Clear All
              </Text>
            </HStack>
          </Box>

          {/* Conversations List */}
          <VStack 
            gap={0} 
            px={{ base: 3, sm: 4, md: 6 }} 
            align="stretch" 
            flex={1} 
            overflowY="auto"
            maxH="calc(100vh - 400px)" // Reserve space for header, buttons, and footer
            css={{
              '&::-webkit-scrollbar': {
                width: '0px',
              },
            }}
          >
            {error && (
              <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={3} mb={2}>
                <Text fontSize="sm" color="red.600" className="sidebar-text" fontFamily="var(--font-primary)">{error}</Text>
              </Box>
            )}
            
            {loading && !sessions.length && (
              <Box display="flex" justifyContent="center" py={4}>
                <Spinner size="md" color="#5661F6" />
              </Box>
            )}
            
            {!loading && !error && filteredConversations.length === 0 && sessions.length === 0 && conversations.length === 0 && (
              <Box textAlign="center" py={8}>
                <Text fontSize="sm" color="gray.500" className="sidebar-text" fontFamily="var(--font-primary)">
                  No conversations yet
                </Text>
                <Text fontSize="xs" color="gray.400" className="sidebar-text" fontFamily="var(--font-primary)" mt={1}>
                  Start a new chat to begin
                </Text>
              </Box>
            )}
            
            {!loading && !error && searchQuery && filteredConversations.length === 0 && (sessions.length > 0 || conversations.length > 0) && (
              <Box textAlign="center" py={8}>
                <Text fontSize="sm" color="gray.500" className="sidebar-text" fontFamily="var(--font-primary)">
                  No conversations found
                </Text>
                <Text fontSize="xs" color="gray.400" className="sidebar-text" fontFamily="var(--font-primary)" mt={1}>
                  Try a different search term
                </Text>
              </Box>
            )}
            
            {filteredConversations.map(conv => {
              const isDeleting = deletingSessionId === conv.id;
              return (
                <Box
                  key={conv.id}
                  py={4}
                  cursor="pointer"
                  onClick={() => onSelect(conv.id)}
                  transition="all 0.2s"
                  borderBottom="1px solid"
                  borderColor="transparent"
                  position="relative"
                  opacity={isDeleting ? 0.5 : 1}
                  _hover={{ 
                    bg: "gray.50",
                    borderBottomColor: "gray.100",
                    '& .delete-button': {
                      opacity: 1,
                      visibility: 'visible',
                    }
                  }}
                >
                  <HStack gap={3} align="center">
                    <Box color={activeId === conv.id ? "#02489B" : "#000000"}>
                      <MessageCircle size={16} strokeWidth={1.5} />
                    </Box>
                    <Text 
                      fontSize="16px"
                      fontWeight="400"
                      color={activeId === conv.id ? "#02489B" : "#475569"}
                      fontFamily="var(--font-primary)"
                      className={`sidebar-conversation ${activeId === conv.id ? 'active' : ''}`}
                      lineHeight="1.5"
                      flex={1}
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                    >
                      {conv.name}
                    </Text>
                    {/* Only show delete button for sessions from the sessions list */}
                    {sessions.some(s => s.id.toString() === conv.id) && (
                      <IconButton
                        className="delete-button"
                        aria-label="Delete session"
                        size="xs"
                        variant="ghost"
                        opacity={0}
                        visibility="hidden"
                        transition="all 0.2s"
                        onClick={(e) => handleDeleteSession(conv.id, conv.name, e)}
                        disabled={isDeleting}
                        _hover={{
                          bg: "red.50",
                          color: "red.600",
                        }}
                      >
                        {isDeleting ? (
                          <Spinner size="xs" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </IconButton>
                    )}
                  </HStack>
                </Box>
              );
            })}
          </VStack>

          {/* Last 7 Days Section */}
          <Box px={{ base: 3, sm: 4, md: 6 }} py={2} flexShrink={0}>
            <Text 
              fontSize="14px" 
              fontWeight="600" 
              color="#6A6969"
              fontFamily="var(--font-primary)"
              className="sidebar-section-header"
            >
              Last 7 Days
            </Text>
          </Box>

          {/* Vibe Note Section */}
          <Box p={{ base: 3, sm: 4, md: 6 }} borderTop="1px solid" borderColor="gray.100" flexShrink={0}>
            <Box
              p={4}
              borderRadius="20px"
              bg="linear-gradient(135deg, #667eea20 0%, #764ba220 100%)"
              border="1px solid"
              borderColor="purple.200"
              textAlign="center"
            >
              <Text 
                fontSize="13px"
                fontWeight="500"
                color="#667eea"
                fontFamily="var(--font-primary)"
                className="sidebar-text"
                lineHeight="1.4"
              >
                🎨✨ Vibe Coded using GitHub Copilot and Figma Community Design 🚀😎
              </Text>
            </Box>
          </Box>
        </>
      ) : (
        /* Collapsed Sidebar Content */
        <>
          {/* Collapsed New Chat Button with Settings */}
          <Box p={4}>
            <VStack gap={3}>
              <IconButton
                aria-label="New chat"
                w="48px"
                h="48px"
                borderRadius="24px"
                bg="linear-gradient(135deg, #459AFF 0%, #6054FF 100%)"
                color="white"
                onClick={handleNewChat}
                disabled={loading}
                _hover={{
                  bg: "linear-gradient(135deg, #4092ff 0%, #5a4ce6 100%)",
                  transform: 'translateY(-1px)',
                }}
                _active={{
                  transform: 'translateY(0)',
                }}
                transition="all 0.2s ease"
              >
                {loading ? <Spinner size="sm" /> : <Plus size={20} />}
              </IconButton>
              <SettingsDropdown isCollapsed={true} />
            </VStack>
          </Box>

          {/* Collapsed Search */}
          <Box p={4}>
            <IconButton
              aria-label="Search"
              w="48px"
              h="48px"
              borderRadius="24px"
              bg="#8B81FF"
              color="white"
              _hover={{
                bg: "#7B71FF",
              }}
              transition="all 0.2s ease"
            >
              <Search size={18} />
            </IconButton>
          </Box>

          {/* Collapsed Conversations */}
          <VStack 
            gap={2} 
            px={4} 
            align="center" 
            flex={1} 
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '0px',
              },
            }}
          >
            {filteredConversations.map(conv => (
              <IconButton
                key={conv.id}
                aria-label={conv.name}
                w="48px"
                h="48px"
                borderRadius="24px"
                bg={activeId === conv.id ? "#EBF4FF" : "transparent"}
                border={activeId === conv.id ? "2px solid #02489B" : "2px solid transparent"}
                color={activeId === conv.id ? "#02489B" : "#000000"}
                onClick={() => onSelect(conv.id)}
                _hover={{ 
                  bg: activeId === conv.id ? "#EBF4FF" : "gray.50",
                }}
                transition="all 0.2s"
              >
                <MessageCircle size={16} strokeWidth={1.5} />
              </IconButton>
            ))}
          </VStack>
        </>
      )}
    </Box>
  );
};

export default Sidebar;
