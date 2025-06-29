import React, { useState, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button,
  Spinner
} from '@chakra-ui/react';
import { Check, Trash2 } from 'lucide-react';
import type { DatabaseStats } from '@shared/database-types';

interface SQLiteConfigProps {
  onUpdateConfig: (field: string, value: any) => void;
}

export default function SQLiteConfig({ onUpdateConfig }: SQLiteConfigProps) {
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [databasePath, setDatabasePath] = useState<string>('');
  const [isDatabaseInitialized, setIsDatabaseInitialized] = useState(false);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);
  const [memoryOperationMessage, setMemoryOperationMessage] = useState('');

  const loadDatabaseStats = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      try {
        await invoke('init_database', { databasePath: null });
      } catch (initError) {
        console.log('Database init result:', initError);
      }
      
      const stats = await invoke<DatabaseStats>('get_database_stats');
      setDatabaseStats(stats);
      
      const path = await invoke<string>('get_database_path');
      setDatabasePath(path);
      setIsDatabaseInitialized(true);
    } catch (error) {
      console.error('Failed to load database stats:', error);
      setDatabaseStats(null);
      setIsDatabaseInitialized(false);
    }
  };

  const clearMemoryTable = async (table: 'sessions' | 'conversations' | 'messages' | 'all') => {
    setIsMemoryLoading(true);
    try {
      if (table === 'all') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('clear_all_data');
        setMemoryOperationMessage('All data cleared successfully');
      } else {
        setMemoryOperationMessage(`${table} clearing not yet implemented`);
      }
      
      setTimeout(() => setMemoryOperationMessage(''), 3000);
      await loadDatabaseStats();
    } catch (error) {
      console.error(`Failed to clear ${table}:`, error);
      setMemoryOperationMessage(`Failed to clear ${table}`);
      setTimeout(() => setMemoryOperationMessage(''), 3000);
    } finally {
      setIsMemoryLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setIsMemoryLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const path = '~/.openconv/settings/db/conv.db';
      setDatabasePath(path);
      await loadDatabaseStats();
      setIsDatabaseInitialized(true);
      setMemoryOperationMessage('Database initialized successfully');
      setTimeout(() => setMemoryOperationMessage(''), 3000);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setMemoryOperationMessage('Failed to initialize database');
      setTimeout(() => setMemoryOperationMessage(''), 3000);
    } finally {
      setIsMemoryLoading(false);
    }
  };

  useEffect(() => {
    if (!isDatabaseInitialized) {
      initializeDatabase();
    }
  }, [isDatabaseInitialized]);

  return (
    <Box
      bg="blue.50"
      border="1px solid"
      borderColor="blue.200"
      borderRadius="md"
      p={4}
    >
      <VStack gap={4} align="stretch">
        <HStack>
          <Check size={16} color="green" />
          <Text fontWeight="medium" color="blue.700">
            SQLite Configuration
          </Text>
        </HStack>
        <Text fontSize="sm" color="gray.600">
          SQLite is a lightweight, file-based database that stores your conversations locally. 
          No additional configuration required - your data stays private on your device.
        </Text>
        
        {/* Database Location */}
        <Box
          bg="blue.100"
          border="1px solid"
          borderColor="blue.300"
          borderRadius="sm"
          p={3}
        >
          <Text fontSize="sm" fontWeight="medium" color="blue.800">
            Database Location
          </Text>
          <Text fontSize="xs" color="blue.700">
            {databasePath || '~/.openconv/settings/db/conv.db'}
          </Text>
        </Box>

        {/* Database Statistics */}
        {databaseStats && (
          <Box
            bg="white"
            border="1px solid"
            borderColor="blue.300"
            borderRadius="sm"
            p={3}
          >
            <Text fontSize="sm" fontWeight="medium" color="blue.800" mb={2}>
              Database Statistics
            </Text>
            <VStack gap={1} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="xs" color="blue.600">Sessions:</Text>
                <Text fontSize="xs" color="blue.800" fontWeight="medium">
                  {databaseStats.session_count}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="xs" color="blue.600">Conversations:</Text>
                <Text fontSize="xs" color="blue.800" fontWeight="medium">
                  {databaseStats.conversation_count}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="xs" color="blue.600">Messages:</Text>
                <Text fontSize="xs" color="blue.800" fontWeight="medium">
                  {databaseStats.message_count}
                </Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Memory Management */}
        <Box
          bg="white"
          border="1px solid"
          borderColor="blue.300"
          borderRadius="sm"
          p={3}
        >
          <Text fontSize="sm" fontWeight="medium" color="blue.800" mb={3}>
            Memory Management
          </Text>
          <VStack gap={2} align="stretch">
            <HStack gap={2}>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={() => clearMemoryTable('sessions')}
                loading={isMemoryLoading}
                disabled={isMemoryLoading}
                px={3}
                py={2}
              >
                <Trash2 size={14} style={{ marginRight: '4px' }} />
                {isMemoryLoading ? 'Clearing...' : 'Clear Sessions'}
              </Button>
              <Button
                size="sm"
                colorScheme="orange"
                variant="outline"
                onClick={() => clearMemoryTable('conversations')}
                loading={isMemoryLoading}
                disabled={isMemoryLoading}
                px={3}
                py={2}
              >
                <Trash2 size={14} style={{ marginRight: '4px' }} />
                {isMemoryLoading ? 'Clearing...' : 'Clear Conversations'}
              </Button>
              <Button
                size="sm"
                colorScheme="purple"
                variant="outline"
                onClick={() => clearMemoryTable('messages')}
                loading={isMemoryLoading}
                disabled={isMemoryLoading}
                px={3}
                py={2}
              >
                <Trash2 size={14} style={{ marginRight: '4px' }} />
                {isMemoryLoading ? 'Clearing...' : 'Clear Messages'}
              </Button>
            </HStack>
            <Button
              size="sm"
              colorScheme="red"
              variant="solid"
              onClick={() => clearMemoryTable('all')}
              loading={isMemoryLoading}
              disabled={isMemoryLoading}
              width="full"
              px={4}
              py={2}
            >
              <Trash2 size={14} style={{ marginRight: '4px' }} />
              {isMemoryLoading ? 'Clearing...' : 'Clear All Data'}
            </Button>
            {memoryOperationMessage && (
              <Box
                bg="green.100"
                border="1px solid"
                borderColor="green.300"
                borderRadius="sm"
                p={2}
              >
                <HStack>
                  <Check size={14} color="green" />
                  <Text fontSize="xs" color="green.800">{memoryOperationMessage}</Text>
                </HStack>
              </Box>
            )}
            <Text fontSize="xs" color="gray.500">
              Clear specific data types or remove all conversation data
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
