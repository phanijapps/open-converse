import { useState, useEffect, useMemo } from 'react';
import { Box, Flex, IconButton } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { Sidebar, type Conversation } from '../components/navigation';
import { ChatStream } from '../components/chat';
import { MessageInput } from '../components/chat';
import { WelcomeScreen } from '../components/layout';
import useSessions from '@/hooks/useSessions';
import type { ChatMessage } from '@shared/types';

export default function Home() {
  const { sessions, loading, createSession } = useSessions();
  const [activeId, setActiveId] = useState<string>(''); // Start with no active session
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Default expanded on desktop

  // Transform sessions to conversations format
  const conversations = useMemo((): Conversation[] => {
    return sessions.map(session => ({
      id: session.id.toString(),
      name: session.name,
    }));
  }, [sessions]);

  // Set the first session as active when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !activeId) {
      setActiveId(sessions[0].id.toString());
    }
  }, [sessions, activeId]);

  const handleNewChat = async () => {
    const timestamp = new Date().toLocaleString();
    const newSession = await createSession(`New Chat - ${timestamp}`);
    if (newSession) {
      setActiveId(newSession.id.toString());
      // Initialize empty messages for the new session
      setMessages(prev => ({
        ...prev,
        [newSession.id.toString()]: [],
      }));
    }
  };

  const handleSend = (msg: string) => {
    const newUserMessage: ChatMessage = { 
      id: Date.now().toString(), 
      sender: 'user', 
      content: msg, 
      timestamp: Date.now() 
    };
    
    // Add user message immediately
    setMessages(prev => ({
      ...prev,
      [activeId]: [
        ...(prev[activeId] || []),
        newUserMessage,
      ],
    }));

    // Simulate AI thinking time and then respond
    setTimeout(() => {
      const aiResponses = [
        "That's a great question! Let me think about that for a moment.",
        "I understand what you're asking. Here's my perspective on that topic.",
        "Thanks for sharing that with me! I'd be happy to help.",
        "That's an interesting point. Let me provide you with some insights.",
        "I appreciate you bringing this up. Here's what I think about it.",
      ];
      
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      
      const newAiMessage: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        content: randomResponse, 
        timestamp: Date.now() 
      };

      setMessages(prev => ({
        ...prev,
        [activeId]: [
          ...prev[activeId],
          newAiMessage,
        ],
      }));
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const handleStartChat = () => {
    // Focus on the message input when starting a chat
    const input = document.querySelector('input[placeholder*="What\'s on your mind"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const currentMessages = messages[activeId] || [];
  const hasMessages = currentMessages.length > 0;

  // Backgrounds for each conversation (session)
  const backgrounds: Record<string, string> = {
    default: 'linear(to-br, gray.50, blue.50)',
  };

  // Get dynamic background or use default
  const currentBackground = backgrounds[activeId] || backgrounds.default;

  return (
    <Flex h="100vh" w="100vw" bg="gray.100" overflow="hidden" position="relative">
      <Box 
        display="block"
        flexShrink={0}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={handleNewChat}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </Box>
      <Box 
        flex={1} 
        display="flex" 
        flexDirection="column" 
        bgGradient={currentBackground}
        transition="background 0.3s ease"
        minWidth={0}
        width="100%"
        overflow="hidden"
        position="relative"
        height="100vh"
      >
        {        /* Mobile Menu Button */}
        <IconButton
          aria-label="Open menu"
          position="absolute"
          top={4}
          left={4}
          zIndex={1001}
          size="sm"
          variant="solid"
          bg="white"
          color="gray.700"
          boxShadow="lg"
          borderRadius="full"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          display={{ base: "flex", md: "none" }}
          _hover={{
            bg: "gray.50"
          }}
        >
          <Menu size={20} />
        </IconButton>

        {/* Mobile Overlay */}
        {!isSidebarCollapsed && (
          <Box
            position="fixed"
            top={0}
            left={0}
            w="100vw"
            h="100vh"
            bg="blackAlpha.600"
            zIndex={999}
            display={{ base: "block", md: "none" }}
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}
        {hasMessages ? (
          <>
            <Box flex={1} overflow="hidden" height="100%" minHeight={0}>
              <ChatStream messages={currentMessages} />
            </Box>
            <Box flexShrink={0}>
              <MessageInput onSend={handleSend} />
            </Box>
          </>
        ) : (
          <>
            <Box flex={1} overflow="hidden" height="100%" minHeight={0}>
              <WelcomeScreen onNewChat={handleNewChat} />
            </Box>
            <Box flexShrink={0}>
              <MessageInput onSend={handleSend} />
            </Box>
          </>
        )}
      </Box>
    </Flex>
  );
}
