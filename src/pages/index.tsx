import { useState, useEffect, useMemo } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Sidebar, type Conversation } from '../components/navigation';
import { ChatStream } from '../components/chat';
import { MessageInput } from '../components/chat';
import { WelcomeScreen } from '../components/layout';
import useSessions from '@/hooks/useSessions';
import { AgentFactory } from '@/agents';
import { readSettings } from '@/utils/settings';
import type { ChatMessage, SettingsData } from '@shared/types';

export default function Home() {
  const { sessions, loading, createSession } = useSessions();
  const [activeId, setActiveId] = useState<string>(''); // Start with no active session
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Default expanded on desktop
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isAgentConfigured, setIsAgentConfigured] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        const currentSettings = await readSettings();
        setSettings(currentSettings);
        setIsAgentConfigured(AgentFactory.validateSettings(currentSettings));
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadAppSettings();
  }, []);

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

  const handleSend = async (msg: string) => {
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

    // Use agent system if configured, otherwise fallback to mock response
    if (isAgentConfigured && settings) {
      try {
        // Create and use agent
        const agent = AgentFactory.createAgent('general', settings);
        const aiResponse = await agent.sendMessage(msg);
        
        const newAiMessage: ChatMessage = { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          content: aiResponse, 
          timestamp: Date.now() 
        };

        setMessages(prev => ({
          ...prev,
          [activeId]: [
            ...prev[activeId],
            newAiMessage,
          ],
        }));
      } catch (error) {
        console.error('Agent error:', error);
        
        // Fallback to error message
        const errorMessage: ChatMessage = { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API configuration in settings.`, 
          timestamp: Date.now() 
        };

        setMessages(prev => ({
          ...prev,
          [activeId]: [
            ...prev[activeId],
            errorMessage,
          ],
        }));
      }
    } else {
      // Fallback to mock response if agent system is not configured
      setTimeout(() => {
        const aiResponses = [
          "I'm not fully configured yet. Please set up your AI provider in the agent-test page or settings.",
          "To enable AI responses, please configure an API key in the settings.",
          "I'm running in demo mode. Visit /agent-test to configure a real AI provider.",
        ];
        
        const mockResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        
        const newAiMessage: ChatMessage = { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          content: mockResponse, 
          timestamp: Date.now() 
        };

        setMessages(prev => ({
          ...prev,
          [activeId]: [
            ...prev[activeId],
            newAiMessage,
          ],
        }));
      }, 1000);
    }
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
    <Flex h="100vh" bg="gray.100">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <Box 
        flex={1} 
        display="flex" 
        flexDirection="column" 
        bgGradient={currentBackground}
        transition="background 0.3s ease"
      >
        {hasMessages ? (
          <>
            <Box flex={1} overflow="hidden">
              <ChatStream messages={currentMessages} />
            </Box>
            <MessageInput onSend={handleSend} />
          </>
        ) : (
          <>
            <Box flex={1}>
              <WelcomeScreen onNewChat={handleNewChat} />
            </Box>
            <MessageInput onSend={handleSend} />
          </>
        )}
      </Box>
    </Flex>
  );
}
