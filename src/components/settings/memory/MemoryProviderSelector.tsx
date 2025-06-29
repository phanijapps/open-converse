import React from 'react';
import { HStack, Button } from '@chakra-ui/react';
import { Database } from 'lucide-react';
import type { MemoryConfig } from '@shared/types';

interface MemoryProviderSelectorProps {
  memoryConfig: MemoryConfig;
  onProviderSelect: (provider: 'sqlite' | 'supabase') => void;
}

export default function MemoryProviderSelector({ 
  memoryConfig, 
  onProviderSelect 
}: MemoryProviderSelectorProps) {
  return (
    <HStack gap={4}>
      <Button
        variant={memoryConfig.provider === 'sqlite' ? 'solid' : 'outline'}
        colorScheme="blue"
        onClick={() => onProviderSelect('sqlite')}
        px={4}
        py={2}
      >
        <Database size={16} style={{ marginRight: '8px' }} />
        SQLite (Local)
      </Button>
      <Button
        variant={memoryConfig.provider === 'supabase' ? 'solid' : 'outline'}
        colorScheme="green"
        onClick={() => onProviderSelect('supabase')}
        px={4}
        py={2}
      >
        <Database size={16} style={{ marginRight: '8px' }} />
        Supabase (Cloud)
      </Button>
    </HStack>
  );
}
