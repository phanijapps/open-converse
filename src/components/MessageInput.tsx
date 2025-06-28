import React, { useState } from 'react';
import { Box, Flex, Textarea, Button } from '@chakra-ui/react';
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
      width="100%"
      maxWidth="100vw"
      minWidth={0}
      boxSizing="border-box"
    >
      <Box
        position="relative"
        width="100%"
        maxWidth="100%"
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
          gap={{ base: 2, sm: 3, md: 4 }} 
          p={{ base: 2, sm: 3, md: 6 }} 
          bg="white" 
          boxShadow="0 -4px 20px rgba(0, 0, 0, 0.05)"
          backdropFilter="blur(10px)"
          width="100%"
          maxWidth="100%"
          minWidth={0}
          boxSizing="border-box"
        >
          <Box flex={1} position="relative" minWidth={0}>
            <Textarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? (⌘+Enter to send)"
              px={{ base: 2, sm: 3, md: 6 }}
              py={{ base: 2, sm: 3, md: 4 }}
              borderRadius={{ base: "lg", md: "2xl" }}
              border="2px solid"
              borderColor="gray.200"
              bg="gray.50"
              fontSize={{ base: "sm", sm: "md", md: "lg" }}
              minHeight={{ base: "56px", sm: "64px", md: "72px" }}
              maxHeight={{ base: "90px", sm: "100px", md: "120px" }}
              resize="none"
              rows={2}
              width="100%"
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
                fontSize: { base: "xs", sm: "sm", md: "md" }
              }}
              transition="all 0.2s ease"
            />
          </Box>
          <Button
            type="submit"
            w={{ base: "40px", sm: "44px", md: "56px" }}
            h={{ base: "40px", sm: "44px", md: "56px" }}
            minW={{ base: "40px", sm: "44px", md: "56px" }}
            borderRadius={{ base: "20px", sm: "22px", md: "28px" }}
            bg="linear-gradient(135deg, #459AFF 0%, #6054FF 100%)"
            color="white"
            flexShrink={0}
            _hover={{
              bg: "linear-gradient(135deg, #4092ff 0%, #5a4ce6 100%)",
              transform: 'translateY(-1px)',
              boxShadow: "0 8px 25px rgba(69, 154, 255, 0.4)"
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s ease"
            boxShadow="0 4px 15px rgba(69, 154, 255, 0.3)"
            disabled={!input.trim()}
            _disabled={{ 
              opacity: 0.5,
              cursor: 'not-allowed',
              transform: 'none',
              boxShadow: "0 2px 8px rgba(69, 154, 255, 0.2)"
            }}
            aria-label="Send message"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Send size={18} />
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default MessageInput;
