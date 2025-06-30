import React, { useEffect, useRef } from 'react';
import { Box, Flex, Text, HStack, IconButton } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Edit, Trash2 } from 'lucide-react';
import type { ChatMessage } from '@shared/types';

const MotionFlex = motion(Flex);
const MotionBox = motion(Box);

interface ChatStreamProps {
  messages: ChatMessage[];
}

const ChatStream: React.FC<ChatStreamProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollToBottom();
  }, [messages]);

  return (
    <Box 
      ref={containerRef}
      flex={1} 
      height="100%"
      overflowY="auto" 
      overflowX="hidden"
      p={{ base: 4, md: 8 }} 
      bgGradient="linear(to-br, gray.50, blue.50)"
      position="relative"
      className="chat-stream"
      css={{
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(156, 163, 175, 0.3)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(156, 163, 175, 0.5)',
        },
        // Force scroll behavior
        scrollBehavior: 'smooth',
      }}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgImage: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Flex direction="column" gap={6}>
        {messages.map((msg, index) => (
          <MotionFlex 
            key={msg.id} 
            justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <MotionBox 
              maxW="2xl" 
              px={6} 
              py={4} 
              borderRadius="3xl" 
              boxShadow="sm" 
              bg={msg.sender === 'user' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'white'
              }
              color={msg.sender === 'user' ? 'white' : 'gray.900'}
              border={msg.sender === 'ai' ? '1px solid' : 'none'}
              borderColor="gray.100"
              position="relative"
              role="group"
              whileHover={{ 
                scale: 1.02,
                boxShadow: msg.sender === 'user' 
                  ? "0 20px 40px rgba(102, 126, 234, 0.4)" 
                  : "0 20px 40px rgba(0, 0, 0, 0.15)"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              _after={msg.sender === 'user' ? {
                content: '""',
                position: 'absolute',
                bottom: 0,
                right: '-8px',
                w: 0,
                h: 0,
                border: '8px solid transparent',
                borderTopColor: '#667eea',
                borderBottomWidth: 0,
              } : msg.sender === 'ai' ? {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: '-8px',
                w: 0,
                h: 0,
                border: '8px solid transparent',
                borderTopColor: 'white',
                borderBottomWidth: 0,
                filter: 'drop-shadow(1px 0 1px rgba(0,0,0,0.1))',
              } : {}}
            >
              <Flex align="start" gap={3}>
                {msg.sender === 'ai' && (
                  <Box 
                    w="40px" 
                    h="40px" 
                    borderRadius="full" 
                    bgGradient="linear(to-br, blue.400, purple.500)" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    color="white" 
                    fontWeight="bold"
                    flexShrink={0}
                    fontSize="lg"
                  >
                    🤖
                  </Box>
                )}
                
                <Box flex={1}>
                  <Text 
                    lineHeight="tall"
                    fontSize="md"
                    fontWeight="normal"
                    className={msg.sender === 'user' ? 'chat-message-user' : 'chat-message-ai'}
                  >
                    {msg.content}
                  </Text>
                  <HStack 
                    gap={2} 
                    mt={2} 
                    opacity={0} 
                    _hover={{ opacity: 1 }} 
                    transition="opacity 0.2s"
                    display="none"
                  >
                    <IconButton 
                      aria-label="Edit"
                      size="xs"
                      variant="ghost"
                      borderRadius="md"
                      _hover={{ bg: "gray.100" }}
                    >
                      <Edit size={16} />
                    </IconButton>
                    <IconButton 
                      aria-label="Delete"
                      size="xs"
                      variant="ghost"
                      borderRadius="md"
                      _hover={{ bg: "gray.100" }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </HStack>
                </Box>

                {msg.sender === 'user' && (
                  <Box 
                    w="40px" 
                    h="40px" 
                    borderRadius="full" 
                    bg="blue.100" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    color="blue.700" 
                    fontWeight="bold"
                    flexShrink={0}
                    fontSize="lg"
                  >
                    U
                  </Box>
                )}
              </Flex>
            </MotionBox>
          </MotionFlex>
        ))}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Flex>
    </Box>
  );
};

export default ChatStream;
