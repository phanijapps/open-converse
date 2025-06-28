import React, { useState } from 'react';
import { Box, Flex, Input, Button } from '@chakra-ui/react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input);
        setInput('');
      }
    }
  };

  return (
    <Box 
      as="form"
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
          onSend(input);
          setInput('');
        }
      }}
    >
      <Box
        position="relative"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          bgGradient: 'linear(to-r, transparent, gray.200, transparent)',
        }}
      >
        <Flex 
          align="center" 
          gap={4} 
          p={{ base: 4, md: 6 }} 
          bg="white" 
          boxShadow="0 -4px 20px rgba(0, 0, 0, 0.05)"
          backdropFilter="blur(10px)"
        >
          <Box flex={1} position="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? (⌘+Enter to send)"
              px={{ base: 4, md: 6 }}
              py={{ base: 3, md: 4 }}
              borderRadius="2xl"
              border="2px solid"
              borderColor="gray.200"
              bg="gray.50"
              fontSize={{ base: "md", md: "lg" }}
              _hover={{
                borderColor: 'blue.300',
                bg: 'white',
              }}
              _focus={{ 
                outline: "none", 
                borderColor: "#667eea", 
                bg: 'white',
                boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)",
              }}
              _placeholder={{
                color: 'gray.500',
                fontWeight: '400',
              }}
              transition="all 0.2s ease"
            />
          </Box>
          <Button
            type="submit"
            bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
            _hover={{ 
              bgGradient: "linear(135deg, #5a67d8 0%, #6b46c1 100%)",
              transform: 'translateY(-1px)',
              boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)"
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            color="white"
            px={{ base: 4, md: 6 }}
            py={{ base: 3, md: 4 }}
            borderRadius="2xl"
            transition="all 0.2s ease"
            boxShadow="0 4px 15px rgba(102, 126, 234, 0.3)"
            disabled={!input.trim()}
            _disabled={{ 
              opacity: 0.5,
              cursor: 'not-allowed',
              transform: 'none',
              boxShadow: "0 2px 8px rgba(102, 126, 234, 0.2)"
            }}
            aria-label="Send message"
            minW={{ base: "48px", md: "auto" }}
            height={{ base: "48px", md: "56px" }}
          >
            <Send size={24} />
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default MessageInput;
