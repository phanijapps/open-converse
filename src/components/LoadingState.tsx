import React from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading your conversations..." 
}) => {
  return (
    <Flex 
      direction="column" 
      align="center" 
      justify="center" 
      h="100vh" 
      bg="gray.50"
    >
      <MotionBox
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Spinner 
          size="xl" 
          color="blue.500" 
          mb={4}
        />
      </MotionBox>
      <Text 
        color="gray.600" 
        fontSize="lg" 
        fontWeight="medium"
        textAlign="center"
      >
        {message}
      </Text>
    </Flex>
  );
};

export default LoadingState;
