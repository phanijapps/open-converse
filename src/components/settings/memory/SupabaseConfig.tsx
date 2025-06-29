import React from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Input, 
  Textarea
} from '@chakra-ui/react';
import { Database } from 'lucide-react';
import type { MemoryConfig } from '@shared/types';

interface SupabaseConfigProps {
  memoryConfig: MemoryConfig;
  onUpdateConfig: (field: string, value: any) => void;
}

export default function SupabaseConfig({ memoryConfig, onUpdateConfig }: SupabaseConfigProps) {
  return (
    <Box
      bg="green.50"
      border="1px solid"
      borderColor="green.200"
      borderRadius="md"
      p={4}
    >
      <VStack gap={4} align="stretch">
        <HStack>
          <Database size={16} color="green" />
          <Text fontWeight="medium" color="green.700">
            Supabase Configuration
          </Text>
        </HStack>
        <Text fontSize="sm" color="gray.600">
          Supabase provides a cloud-based PostgreSQL database with real-time capabilities. 
          Perfect for syncing conversations across devices.
        </Text>
        
        <VStack gap={4} align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Project URL</Text>
            <Input
              value={memoryConfig.config.projectUrl || ''}
              onChange={(e) => onUpdateConfig('projectUrl', e.target.value)}
              placeholder="https://your-project.supabase.co"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Your Supabase project URL from the dashboard
            </Text>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>API Key (anon/public)</Text>
            <Input
              type="password"
              value={memoryConfig.config.apiKey || ''}
              onChange={(e) => onUpdateConfig('apiKey', e.target.value)}
              placeholder="Enter your Supabase anon key"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Your Supabase anonymous/public API key
            </Text>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Connection String (Optional)</Text>
            <Textarea
              value={memoryConfig.config.connectionString || ''}
              onChange={(e) => onUpdateConfig('connectionString', e.target.value)}
              placeholder="postgresql://..."
              rows={3}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Direct database connection string (optional, for advanced users)
            </Text>
          </Box>
        </VStack>

        <Box
          bg="orange.100"
          border="1px solid"
          borderColor="orange.300"
          borderRadius="sm"
          p={3}
        >
          <Text fontSize="sm" fontWeight="medium" color="orange.800">
            Security Note
          </Text>
          <Text fontSize="xs" color="orange.700">
            Only use the anon/public key. Never use your service role key in client applications.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
