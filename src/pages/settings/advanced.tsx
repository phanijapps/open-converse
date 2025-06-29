import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { invoke } from '@tauri-apps/api/core';
import DatabaseSidebar, { DatabaseTableInfo } from '@/components/database/DatabaseSidebar';
import DatabaseTable, { TableColumn, TableRow } from '@/components/database/DatabaseTable';
import type { DatabaseStats } from '@shared/database-types';

// Table column definitions
const TABLE_COLUMNS: Record<string, TableColumn[]> = {
  session: [
    { key: 'id', label: 'ID', type: 'number', width: '80px' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'role', label: 'Role', type: 'text' },
    { key: 'goals', label: 'Goals', type: 'text' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ],
  conversation: [
    { key: 'id', label: 'ID', type: 'number', width: '80px' },
    { key: 'session_id', label: 'Session ID', type: 'number', width: '100px' },
    { key: 'status', label: 'Status', type: 'badge', width: '100px' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ],
  message: [
    { key: 'id', label: 'ID', type: 'number', width: '80px' },
    { key: 'conversation_id', label: 'Conv. ID', type: 'number', width: '100px' },
    { key: 'role', label: 'Role', type: 'badge', width: '100px' },
    { key: 'content', label: 'Content', type: 'text' },
    { key: 'ts', label: 'Timestamp', type: 'date' },
    { key: 'recall_score', label: 'Score', type: 'number', width: '100px' },
  ],
};

export default function AdvancedPage() {
  const router = useRouter();
  
  // State management
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<DatabaseTableInfo[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load database stats on mount
  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    setIsLoadingStats(true);
    setError(null);
    
    try {
      // Initialize database first if not already initialized
      try {
        await invoke('init_database', { databasePath: null });
      } catch (initError) {
        // Database might already be initialized, continue
        console.log('Database init result:', initError);
      }

      const stats = await invoke<DatabaseStats>('get_database_stats');
      setDatabaseStats(stats);
      
      // Create table info from stats
      const tableInfo: DatabaseTableInfo[] = [
        {
          name: 'session',
          displayName: 'Sessions',
          count: stats.session_count,
          icon: null, // Icon will be determined by the sidebar component
          description: 'User sessions with roles and goals'
        },
        {
          name: 'conversation',
          displayName: 'Conversations',
          count: stats.conversation_count,
          icon: null,
          description: 'Conversation sessions linked to sessions'
        },
        {
          name: 'message',
          displayName: 'Messages',
          count: stats.message_count,
          icon: null,
          description: 'Individual messages with content and metadata'
        }
      ];
      
      setTables(tableInfo);
      
      // Select the first table if none is selected
      if (!activeTable && tableInfo.length > 0) {
        setActiveTable(tableInfo[0].name);
      }
    } catch (error) {
      console.error('Failed to load database stats:', error);
      setError('Failed to load database statistics. Please check your database connection.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    setIsLoadingTable(true);
    setError(null);
    
    try {
      let data: TableRow[] = [];
      
      switch (tableName) {
        case 'session':
          data = await invoke<TableRow[]>('get_sessions');
          break;
        case 'conversation':
          data = await invoke<TableRow[]>('get_conversations', { sessionId: null });
          break;
        case 'message':
          // For messages, we'll limit to recent ones to avoid loading too much data
          // We'll need to modify this to support pagination in the future
          data = []; // Placeholder - would need a get_all_messages command
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }
      
      setTableData(data);
    } catch (error) {
      console.error(`Failed to load ${tableName} data:`, error);
      setError(`Failed to load ${tableName} data. ${error}`);
      setTableData([]);
    } finally {
      setIsLoadingTable(false);
    }
  };

  // Load table data when active table changes
  useEffect(() => {
    if (activeTable) {
      loadTableData(activeTable);
    }
  }, [activeTable]);

  const handleTableSelect = (tableName: string) => {
    setActiveTable(tableName);
  };

  const handleRefresh = () => {
    loadDatabaseStats();
    if (activeTable) {
      loadTableData(activeTable);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleViewRow = (row: TableRow) => {
    // TODO: Implement row detail view modal
    console.log('View row:', row);
  };

  const handleDeleteRow = async (row: TableRow) => {
    if (!activeTable || !window.confirm(`Are you sure you want to delete this ${activeTable} record?`)) {
      return;
    }

    try {
      switch (activeTable) {
        case 'session':
          await invoke('delete_session', { sessionId: row.id });
          break;
        case 'conversation':
          await invoke('delete_conversation', { conversationId: row.id });
          break;
        case 'message':
          await invoke('delete_message', { messageId: row.id });
          break;
      }
      
      // Refresh data after deletion
      handleRefresh();
    } catch (error) {
      console.error(`Failed to delete ${activeTable}:`, error);
      setError(`Failed to delete ${activeTable}. ${error}`);
    }
  };

  return (
    <Box h="100vh" bg="gray.50">
      <Flex h="full">
        {/* Sidebar */}
        <DatabaseSidebar
          tables={tables}
          activeTable={activeTable}
          onTableSelect={handleTableSelect}
          onRefresh={handleRefresh}
          isLoading={isLoadingStats}
        />

        {/* Main Content */}
        <Box flex={1} h="full" overflow="hidden">
          <VStack align="stretch" h="full" gap={0}>
            {/* Header */}
            <Box
              bg="white"
              borderBottom="1px solid"
              borderColor="gray.200"
              px={6}
              py={4}
            >
              <HStack justify="space-between" align="center">
                <HStack gap={4}>
                  <IconButton
                    aria-label="Back to chat"
                    size="sm"
                    variant="ghost"
                    onClick={handleBack}
                    _hover={{ bg: "gray.100" }}
                    px={2}
                    py={2}
                  >
                    <ArrowLeft size={18} strokeWidth={1.5} />
                  </IconButton>
                  <VStack align="start" gap={0}>
                    <Text fontSize="20px" fontWeight="600" color="gray.800">
                      Advanced Database Management
                    </Text>
                    <Text fontSize="14px" color="gray.600">
                      View and manage your conversation data
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack gap={3}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoadingStats || isLoadingTable}
                    px={4}
                    py={2}
                  >
                    {(isLoadingStats || isLoadingTable) && (
                      <Spinner size="xs" mr={2} />
                    )}
                    Refresh
                  </Button>
                </HStack>
              </HStack>
            </Box>

            {/* Content Area */}
            <Box flex={1} p={6} overflow="hidden" h="full">
              {error ? (
                <Box 
                  p={4} 
                  bg="red.50" 
                  borderRadius="8px" 
                  border="1px solid" 
                  borderColor="red.200"
                  color="red.800"
                >
                  <Text fontWeight="500">Error:</Text>
                  <Text fontSize="sm" mt={1}>{error}</Text>
                </Box>
              ) : activeTable ? (
                <Box h="full">
                  <DatabaseTable
                    tableName={tables.find(t => t.name === activeTable)?.displayName || activeTable}
                    columns={TABLE_COLUMNS[activeTable] || []}
                    data={tableData}
                    isLoading={isLoadingTable}
                    onViewRow={handleViewRow}
                    onDeleteRow={handleDeleteRow}
                  />
                </Box>
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="gray.500" fontSize="lg">
                    Select a table from the sidebar to view its data
                  </Text>
                </Box>
              )}
            </Box>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
}
