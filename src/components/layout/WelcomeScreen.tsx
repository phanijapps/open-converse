import React, { useState } from 'react';
import { Box, Flex, Text, VStack, Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Zap } from 'lucide-react';

const MotionBox = motion(Box);

interface WelcomeScreenProps {
  onStartChat?: () => void;
  onNewChat?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartChat, onNewChat }) => {
  const handleStart = () => {
    if (onNewChat) {
      onNewChat();
    } else if (onStartChat) {
      onStartChat();
    }
  };
  const suggestions = [
    { icon: MessageCircle, text: "Ask me anything about technology" },
    { icon: Sparkles, text: "Let's brainstorm some creative ideas" },
    { icon: Zap, text: "Help me solve a problem" },
  ];

  return (
    <Flex 
      direction="column" 
      align="center" 
      justify="center" 
      h="100%" 
      p={8}
      bgGradient="linear(to-br, gray.50, blue.50)"
      position="relative"
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
      <VStack gap={8} maxW="2xl" textAlign="center" position="relative" zIndex={1}>
        <MotionBox
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Box 
            w="120px" 
            h="120px" 
            borderRadius="full" 
            bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontSize="4xl"
            mb={6}
            boxShadow="0 20px 40px rgba(102, 126, 234, 0.3)"
          >
            🤖
          </Box>
        </MotionBox>

        <VStack gap={4}>
          <Text 
            fontSize="4xl" 
            fontWeight="bold" 
            bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)" 
            bgClip="text"
            lineHeight="shorter"
          >
            Welcome to OpenConverse
          </Text>
          <Text 
            fontSize="lg" 
            color="gray.600" 
            lineHeight="tall"
            fontWeight="normal"
            maxW="lg"
          >
            Your intelligent AI companion is ready to chat. Start a conversation and explore the possibilities together.
          </Text>
        </VStack>

        <VStack gap={4} w="100%">
          {suggestions.map((suggestion, index) => (
            <MotionBox
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + (index * 0.1) }}
              w="100%"
            >
              <Button
                variant="outline"
                size="lg"
                borderRadius="xl"
                p={6}
                h="auto"
                w="100%"
                border="2px solid"
                borderColor="gray.200"
                bg="white"
                _hover={{
                  borderColor: "#667eea",
                  bg: "blue.50",
                  transform: 'translateY(-2px)',
                  boxShadow: "0 8px 25px rgba(102, 126, 234, 0.15)"
                }}
                transition="all 0.2s ease"
                onClick={handleStart}
                display="flex"
                alignItems="center"
                gap={4}
              >
                <Box color="#667eea">
                  <suggestion.icon size={24} />
                </Box>
                <Text 
                  color="gray.700" 
                  fontWeight="medium"
                  fontSize="md"
                  lineHeight="base"
                >
                  {suggestion.text}
                </Text>
              </Button>
            </MotionBox>
          ))}
        </VStack>
      </VStack>
    </Flex>
  );
};

export default WelcomeScreen;
