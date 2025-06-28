import { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar, { Conversation } from '../components/Sidebar';
import ChatStream from '../components/ChatStream';
import MessageInput from '../components/MessageInput';
import WelcomeScreen from '../components/WelcomeScreen';
import type { ChatMessage } from '@shared/types';

const conversationData: Conversation[] = [
  { id: '1', name: 'Crypto Lending App' },
  { id: '2', name: 'Operator Grammar Types' },
  { id: '3', name: 'Min States For Binary DFA' },
  { id: '4', name: 'Lorem POS system' },
  { id: '5', name: 'Create html game environment for website' },
  { id: '6', name: 'Welcome Chat' },
];

const initialMessages: Record<string, ChatMessage[]> = {
  '1': [
    { id: '1', sender: 'ai', content: 'Welcome to Crypto Lending App! How can I help you today?', timestamp: Date.now() },
    { id: '2', sender: 'user', content: 'Tell me about the benefits of crypto lending.', timestamp: Date.now() },
    { id: '3', sender: 'ai', content: 'Crypto lending offers several advantages: higher interest rates compared to traditional savings, passive income generation, and portfolio diversification. You can earn yields on your cryptocurrency holdings while maintaining ownership.', timestamp: Date.now() },
  ],
  '2': [
    { id: '1', sender: 'ai', content: 'Let\'s explore operator grammar types in formal language theory.', timestamp: Date.now() },
    { id: '2', sender: 'user', content: 'What are the different types of operator grammars?', timestamp: Date.now() },
  ],
  '3': [
    { id: '1', sender: 'ai', content: 'Binary DFA (Deterministic Finite Automaton) analysis focuses on minimizing states.', timestamp: Date.now() },
  ],
  '4': [
    { id: '1', sender: 'ai', content: 'Let me help you with your POS system requirements.', timestamp: Date.now() },
  ],
  '5': [
    { id: '1', sender: 'user', content: 'Create html game environment for website', timestamp: Date.now() },
    { id: '2', sender: 'ai', content: 'I\'ll help you create an HTML game environment! What type of game are you planning to build?', timestamp: Date.now() },
  ],
  '6': [], // Empty conversation for testing welcome screen
};

export default function Home() {
  const [activeId, setActiveId] = useState('6'); // Start with empty conversation to show WelcomeScreen
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(initialMessages);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Backgrounds for each conversation
  const backgrounds: Record<string, string> = {
    '1': 'linear(to-br, blue.50, purple.50, pink.50)',
    '2': 'linear(to-br, green.50, blue.50, cyan.50)',
    '3': 'linear(to-br, yellow.50, orange.50, red.50)',
    '4': 'linear(to-br, purple.50, pink.50, blue.50)',
    '5': 'linear(to-br, teal.50, green.50, blue.50)',
    '6': 'linear(to-br, gray.50, blue.50)',
  };

  return (
    <Flex h="100vh" bg="gray.100">
      <Sidebar
        conversations={conversationData}
        activeId={activeId}
        onSelect={setActiveId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <Box 
        flex={1} 
        display="flex" 
        flexDirection="column" 
        bgGradient={backgrounds[activeId]}
        transition="background 0.3s ease"
      >
        {hasMessages ? (
          <>
            <ChatStream messages={currentMessages} />
            <MessageInput onSend={handleSend} />
          </>
        ) : (
          <>
            <WelcomeScreen onStartChat={handleStartChat} />
            <MessageInput onSend={handleSend} />
          </>
        )}
      </Box>
    </Flex>
  );
}
