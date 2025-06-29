import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { getAvailableProviders } from '@/utils/providers/registry';

interface ProviderSelectorProps {
  selectedProviderId: string;
  onProviderSelect: (providerId: string) => void;
}

export default function ProviderSelector({ 
  selectedProviderId, 
  onProviderSelect 
}: ProviderSelectorProps) {
  const availableProviders = getAvailableProviders();

  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={3}>
        Choose Provider
      </Text>
      <select
        value={selectedProviderId}
        onChange={(e) => onProviderSelect(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          border: '2px solid #E2E8F0',
          borderRadius: '6px',
          backgroundColor: 'white',
          outline: 'none'
        }}
      >
        <option value="">Select an AI provider...</option>
        {availableProviders.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name} - {provider.description}
          </option>
        ))}
      </select>
    </Box>
  );
}
