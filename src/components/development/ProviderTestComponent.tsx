// Testing component for LLM provider selection
import React from 'react';
import { Box, Text, VStack, HStack, Button, Badge } from '@chakra-ui/react';
import { getAvailableProviders, type LLMProviderTemplate } from '@/utils/providers/registry';

export default function ProviderTestComponent() {
  const providers = getAvailableProviders();

  return (
    <Box p={4}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Available LLM Providers
      </Text>
      <VStack gap={3} align="stretch">
        {providers.map((provider: LLMProviderTemplate) => (
          <Box
            key={provider.id}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            bg="white"
          >
            <HStack justify="space-between">
              <VStack align="start" gap={1}>
                <HStack>
                  <Text fontSize="lg">{provider.icon}</Text>
                  <Text fontWeight="medium">{provider.name}</Text>
                  {provider.requiresAuth && (
                    <Badge colorScheme="orange" size="sm">Requires API Key</Badge>
                  )}
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {provider.description}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {provider.baseUrl}
                </Text>
              </VStack>
              <Button size="sm" variant="outline">
                Select
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
