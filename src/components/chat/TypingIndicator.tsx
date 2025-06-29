import React from 'react';
import { Box, HStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const TypingIndicator: React.FC = () => {
  return (
    <HStack gap={1} p={3}>
      <Box 
        w="32px" 
        h="32px" 
        borderRadius="full" 
        bgGradient="linear(to-br, blue.400, purple.500)" 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        color="white" 
        fontWeight="bold"
        flexShrink={0}
        fontSize="sm"
      >
        🤖
      </Box>
      <Box
        bg="white"
        px={4}
        py={3}
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.100"
        boxShadow="sm"
      >
        <HStack gap={1}>
          {[0, 1, 2].map((i) => (
            <MotionBox
              key={i}
              w="8px"
              h="8px"
              borderRadius="full"
              bg="gray.400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </HStack>
      </Box>
    </HStack>
  );
};

export default TypingIndicator;
