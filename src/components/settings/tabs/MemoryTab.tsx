import React from 'react';
import { VStack, Box, Text } from '@chakra-ui/react';
import MemoryProviderSelector from '../memory/MemoryProviderSelector';
import SQLiteConfig from '../memory/SQLiteConfig';
import SupabaseConfig from '../memory/SupabaseConfig';
import type { SettingsState, SettingsActions } from '../hooks/useSettings';

interface MemoryTabProps {
  state: SettingsState;
  actions: SettingsActions;
}

export default function MemoryTab({ state, actions }: MemoryTabProps) {
  return (
    <VStack gap={6} align="stretch">
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        p={6}
      >
        <VStack align="start" gap={1} mb={6}>
          <Text fontSize="xl" fontWeight="600" color="gray.700">
            Memory Configuration
          </Text>
          <Text fontSize="sm" color="gray.500">
            Configure how your conversations are stored and retrieved
          </Text>
        </VStack>

        <VStack gap={6} align="stretch">
          {/* Provider Selection */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={3}>Storage Provider</Text>
            <MemoryProviderSelector
              memoryConfig={state.memoryConfig}
              onProviderSelect={actions.setMemoryProvider}
            />
          </Box>

          <Box h="1px" bg="gray.200" />

          {/* Provider-specific Configuration */}
          {state.memoryConfig.provider === 'sqlite' && (
            <SQLiteConfig onUpdateConfig={actions.updateMemoryConfig} />
          )}

          {state.memoryConfig.provider === 'supabase' && (
            <SupabaseConfig
              memoryConfig={state.memoryConfig}
              onUpdateConfig={actions.updateMemoryConfig}
            />
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
