import React from 'react';
import { Box, Flex, Text, Button, VStack } from '@chakra-ui/react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error?: Error;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  onRetry 
}) => {
  return (
    <Flex 
      direction="column" 
      align="center" 
      justify="center" 
      h="100vh" 
      bg="gray.50"
      p={8}
    >
      <VStack gap={6} maxW="md" textAlign="center">
        <Box color="red.500">
          <AlertCircle size={64} />
        </Box>
        
        <VStack gap={2}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.900">
            Something went wrong
          </Text>
          <Text color="gray.600" lineHeight="relaxed">
            {error?.message || "An unexpected error occurred. Please try again."}
          </Text>
        </VStack>

        {onRetry && (
          <Button
            bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
            color="white"
            size="lg"
            borderRadius="xl"
            onClick={onRetry}
            _hover={{
              bgGradient: "linear(135deg, #5a67d8 0%, #6b46c1 100%)",
              transform: 'translateY(-1px)',
              boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)"
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s ease"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <RefreshCw size={20} />
            Try Again
          </Button>
        )}
      </VStack>
    </Flex>
  );
};

export default ErrorState;
