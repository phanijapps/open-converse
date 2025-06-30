import React, { useEffect, useRef } from 'react';
import { Box, Flex, Text, HStack, IconButton, Link } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Edit, Trash2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
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
                  <Box 
                    lineHeight="tall"
                    fontSize="md"
                    fontWeight="normal"
                    className={`markdown-content ${msg.sender === 'user' ? 'chat-message-user' : 'chat-message-ai'}`}
                    color={msg.sender === 'user' ? 'white' : 'gray.900'}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // Custom styling for markdown elements
                        p: ({ children }) => (
                          <Text mb={2} lineHeight="tall" color="inherit">
                            {children}
                          </Text>
                        ),
                        h1: ({ children }) => (
                          <Text fontSize="xl" fontWeight="bold" mb={3} mt={2} color="inherit">
                            {children}
                          </Text>
                        ),
                        h2: ({ children }) => (
                          <Text fontSize="lg" fontWeight="bold" mb={2} mt={2} color="inherit">
                            {children}
                          </Text>
                        ),
                        h3: ({ children }) => (
                          <Text fontSize="md" fontWeight="bold" mb={2} mt={2} color="inherit">
                            {children}
                          </Text>
                        ),
                        ul: ({ children }) => (
                          <Box as="ul" pl={4} mb={2} color="inherit">
                            {children}
                          </Box>
                        ),
                        ol: ({ children }) => (
                          <Box as="ol" pl={4} mb={2} color="inherit">
                            {children}
                          </Box>
                        ),
                        li: ({ children }) => (
                          <Box as="li" mb={1} color="inherit">
                            {children}
                          </Box>
                        ),
                        code: ({ children, className, ...props }: any) => {
                          const inline = !className;
                          return inline ? (
                            <Text
                              as="code"
                              bg={msg.sender === 'user' ? 'rgba(255,255,255,0.2)' : 'gray.100'}
                              px={1}
                              py={0.5}
                              borderRadius="sm"
                              fontSize="sm"
                              fontFamily="monospace"
                            >
                              {children}
                            </Text>
                          ) : (
                            <Box
                              as="pre"
                              bg={msg.sender === 'user' ? 'rgba(255,255,255,0.1)' : 'gray.50'}
                              p={3}
                              borderRadius="md"
                              overflow="auto"
                              fontSize="sm"
                              fontFamily="monospace"
                              mb={2}
                            >
                              <Text as="code">{children}</Text>
                            </Box>
                          );
                        },
                        blockquote: ({ children }) => (
                          <Box
                            borderLeft="4px solid"
                            borderColor={msg.sender === 'user' ? 'rgba(255,255,255,0.5)' : 'gray.300'}
                            pl={4}
                            ml={2}
                            mb={2}
                            fontStyle="italic"
                            color="inherit"
                          >
                            {children}
                          </Box>
                        ),
                        strong: ({ children }) => (
                          <Text as="strong" fontWeight="bold" color="inherit">
                            {children}
                          </Text>
                        ),
                        em: ({ children }) => (
                          <Text as="em" fontStyle="italic" color="inherit">
                            {children}
                          </Text>
                        ),
                        a: ({ children, href }: any) => (
                          <Link 
                            href={href}
                            color={msg.sender === 'user' ? 'rgba(255,255,255,0.9)' : 'blue.500'}
                            textDecoration="underline"
                            _hover={{ opacity: 0.8 }}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </Link>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </Box>
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
                    bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    color="white" 
                    fontWeight="bold"
                    flexShrink={0}
                    fontSize="lg"
                  >
                    <User size={20} />
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
