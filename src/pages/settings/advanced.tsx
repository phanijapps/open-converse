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
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { invoke } from '@tauri-apps/api/core';
import DatabaseSidebar, { DatabaseTableInfo } from '@/components/database/DatabaseSidebar';
import DatabaseTable, { TableColumn, TableRow } from '@/components/database/DatabaseTable';
import useSessions from '@/hooks/useSessions';
import type { DatabaseStats } from '@shared/database-types';

// Table column definitions
const TABLE_COLUMNS: Record<string, TableColumn[]> = {
  session: [
    { key: 'id', label: 'ID', type: 'number', width: '80px' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'role', label: 'Role', type: 'text' },
    { key: 'goals', label: 'Goals', type: 'text' },
    { key: 'llm_provider', label: 'Provider', type: 'text' },
    { key: 'model_id', label: 'Model', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ],
  message: [
    { key: 'id', label: 'ID', type: 'number', width: '80px' },
    { key: 'session_id', label: 'Session ID', type: 'number', width: '100px' },
    { key: 'role', label: 'Role', type: 'badge', width: '100px' },
    { key: 'content', label: 'Content', type: 'text' },
    { key: 'ts', label: 'Timestamp', type: 'date' },
    { key: 'recall_score', label: 'Score', type: 'number', width: '100px' },
  ],
};

export default function AdvancedPage() {
  const router = useRouter();
  const { sessions, loading: sessionsLoading, error: sessionsError, deleteSession, refreshSessions } = useSessions();
  
  // State management
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<DatabaseTableInfo[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track which row is being deleted
  const [showClearConfirm, setShowClearConfirm] = useState(false); // For clear all confirmation
  const [clearRowToDelete, setClearRowToDelete] = useState<TableRow | null>(null); // For individual row deletion

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
        await invoke('init_database', { database_path: null });
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
          description: 'User sessions that act as personas and conversation containers'
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
          // Always use sessions from the hook for consistency
          data = sessions.map(session => ({
            id: session.id,
            name: session.name,
            role: session.role || '',
            goals: session.goals || '',
            llm_provider: session.llm_provider || '',
            model_id: session.model_id || '',
            status: session.status || 'open',
            created_at: session.created_at,
          }));
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

  // Update table data when sessions change (if viewing session table)
  useEffect(() => {
    if (activeTable === 'session' && !sessionsLoading) {
      console.log('Sessions changed, updating session table data. Sessions count:', sessions.length);
      console.log('Raw sessions data:', sessions);
      const sessionTableData = sessions.map(session => ({
        id: session.id,
        name: session.name,
        role: session.role || '',
        goals: session.goals || '',
        llm_provider: session.llm_provider || '',
        model_id: session.model_id || '',
        status: session.status || 'open',
        created_at: session.created_at,
      }));
      console.log('Mapped table data:', sessionTableData);
      setTableData(sessionTableData);
    }
  }, [sessions, activeTable, sessionsLoading]);

  const handleTableSelect = (tableName: string) => {
    setActiveTable(tableName);
  };

  const handleRefresh = async () => {
    setError(null);
    await loadDatabaseStats();
    
    if (activeTable && activeTable !== 'session') {
      // For non-session tables, reload the table data
      await loadTableData(activeTable);
    } else if (activeTable === 'session') {
      // For session table, refresh sessions from the hook (table will update via useEffect)
      await refreshSessions();
    }
  };

  const handleClearAllSessions = async () => {
    console.log('handleClearAllSessions called, sessions:', sessions);
    
    if (sessions.length === 0) return;
    
    // Show confirmation dialog
    setShowClearConfirm(true);
  };

  const confirmClearAllSessions = async () => {
    console.log('User confirmed deletion, proceeding...');
    setShowClearConfirm(false);
    setIsDeleting('all');

    try {
      // Try using the clear_all_memory command instead of deleting individually
      console.log('Attempting to clear all memory using Tauri command...');
      await invoke('clear_all_memory');
      console.log('clear_all_memory command completed successfully');
      
      // Refresh the sessions list to reflect the changes
      await refreshSessions();
      
      // Also refresh the database stats (but table data will update automatically via useEffect)
      await loadDatabaseStats();
      
      console.log('Sessions cleared and refreshed successfully');
    } catch (error) {
      console.error('Failed to clear all sessions using clear_all_memory:', error);
      
      // Fallback: try deleting sessions one by one
      console.log('Falling back to individual session deletion...');
      let deletedCount = 0;
      let errorCount = 0;

      try {
        // Delete sessions one by one to ensure proper cleanup
        for (const session of sessions) {
          try {
            console.log('Deleting session:', session.id, session.name);
            const success = await deleteSession(session.id);
            if (success) {
              deletedCount++;
              console.log('Successfully deleted session:', session.id);
            } else {
              errorCount++;
              console.log('Failed to delete session:', session.id);
            }
          } catch (error) {
            console.error(`Failed to delete session ${session.id}:`, error);
            errorCount++;
          }
        }

        // Refresh database stats after bulk deletion (sessions will update automatically)
        await loadDatabaseStats();
        
        if (errorCount === 0) {
          console.log(`Successfully deleted all ${deletedCount} sessions`);
        } else {
          setError(`Deleted ${deletedCount} sessions, but ${errorCount} failed to delete`);
        }
      } catch (fallbackError) {
        console.error('Failed to delete sessions using fallback method:', fallbackError);
        setError(`Failed to delete sessions: ${fallbackError}`);
      }
    } finally {
      setIsDeleting(null);
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
    console.log('handleDeleteRow called with:', row);
    
    if (!activeTable) return;

    // Show confirmation dialog
    setClearRowToDelete(row);
  };

  const confirmDeleteRow = async () => {
    if (!clearRowToDelete || !activeTable) return;

    const row = clearRowToDelete;
    setClearRowToDelete(null);

    const itemName = activeTable === 'session' ? 'session' : 'message';

    console.log('User confirmed deletion, proceeding with row:', row.id);
    setIsDeleting(row.id?.toString());

    try {
      let success = false;
      
      switch (activeTable) {
        case 'session':
          // Use the sessions hook for better state management
          console.log('Calling deleteSession from hook...');
          console.log('Row ID:', row.id, 'type:', typeof row.id);
          console.log('Row object:', JSON.stringify(row, null, 2));
          
          try {
            success = await deleteSession(row.id);
            console.log('DeleteSession returned:', success);
          } catch (deleteError) {
            console.error('Error calling deleteSession:', deleteError);
            throw deleteError;
          }
          // No need to refresh manually - the sessions useEffect will update table data
          break;
        case 'message':
          await invoke('delete_message', { message_id: row.id });
          success = true;
          // Refresh only for non-session tables
          await handleRefresh();
          if (activeTable) {
            await loadTableData(activeTable);
          }
          break;
      }
      
      console.log('Delete operation result:', success);
      
      if (success) {
        console.log(`${itemName} deleted successfully`);
      }
    } catch (error) {
      console.error(`Failed to delete ${activeTable}:`, error);
      setError(`Failed to delete ${itemName}. ${error}`);
    } finally {
      setIsDeleting(null);
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
                  {activeTable === 'session' && sessions.length > 0 && (
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => {
                        console.log('Clear All button clicked!');
                        handleClearAllSessions();
                      }}
                      disabled={isDeleting === 'all' || sessionsLoading}
                      px={4}
                      py={2}
                    >
                      {isDeleting === 'all' ? (
                        <Spinner size="xs" mr={2} />
                      ) : (
                        <Trash2 size={14} style={{ marginRight: '8px' }} />
                      )}
                      Clear All ({sessions.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoadingStats || isLoadingTable || sessionsLoading}
                    px={4}
                    py={2}
                  >
                    {(isLoadingStats || isLoadingTable || sessionsLoading) && (
                      <Spinner size="xs" mr={2} />
                    )}
                    Refresh
                  </Button>
                </HStack>
              </HStack>
            </Box>

            {/* Content Area */}
            <Box flex={1} p={6} overflow="hidden" h="full">
              {(error || sessionsError) ? (
                <VStack gap={3} align="stretch">
                  {error && (
                    <Box 
                      p={4} 
                      bg="red.50" 
                      borderRadius="8px" 
                      border="1px solid" 
                      borderColor="red.200"
                      color="red.800"
                    >
                      <Text fontWeight="500">Database Error:</Text>
                      <Text fontSize="sm" mt={1}>{error}</Text>
                    </Box>
                  )}
                  {sessionsError && (
                    <Box 
                      p={4} 
                      bg="orange.50" 
                      borderRadius="8px" 
                      border="1px solid" 
                      borderColor="orange.200"
                      color="orange.800"
                    >
                      <Text fontWeight="500">Sessions Error:</Text>
                      <Text fontSize="sm" mt={1}>{sessionsError}</Text>
                    </Box>
                  )}
                </VStack>
              ) : activeTable ? (
                <Box h="full">
                  <DatabaseTable
                    tableName={tables.find(t => t.name === activeTable)?.displayName || activeTable}
                    columns={TABLE_COLUMNS[activeTable] || []}
                    data={tableData}
                    isLoading={isLoadingTable || (activeTable === 'session' && sessionsLoading)}
                    onViewRow={handleViewRow}
                    onDeleteRow={handleDeleteRow}
                    deletingRowId={isDeleting}
                  />
                </Box>
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="gray.500" fontSize="lg">
                    Select a table from the sidebar to view its data
                  </Text>
                  {sessionsLoading && (
                    <Box mt={4}>
                      <Spinner size="md" color="blue.500" />
                      <Text color="gray.500" fontSize="sm" mt={2}>
                        Loading sessions...
                      </Text>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </VStack>
        </Box>
      </Flex>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1000}
        >
          <Box
            bg="white"
            borderRadius="12px"
            p={6}
            maxW="md"
            mx={4}
            boxShadow="xl"
          >
            <VStack gap={4} align="stretch">
              <Text fontSize="lg" fontWeight="600" color="gray.800">
                Clear All Sessions
              </Text>
              <Text color="gray.600">
                Are you sure you want to delete ALL {sessions.length} sessions? This will permanently delete all conversations and messages. This action cannot be undone.
              </Text>
              <HStack gap={3} justify="end">
                <Button
                  variant="ghost"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isDeleting === 'all'}
                  px={4}
                  py={2}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  bg="red.500"
                  color="white"
                  _hover={{ bg: "red.600" }}
                  _active={{ bg: "red.700" }}
                  onClick={confirmClearAllSessions}
                  disabled={isDeleting === 'all'}
                  px={4}
                  py={2}
                >
                  {isDeleting === 'all' ? <Spinner size="xs" mr={2} /> : null}
                  Delete All
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Individual Row Delete Confirmation Dialog */}
      {clearRowToDelete && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1000}
        >
          <Box
            bg="white"
            borderRadius="12px"
            p={6}
            maxW="md"
            mx={4}
            boxShadow="xl"
          >
            <VStack gap={4} align="stretch">
              <Text fontSize="lg" fontWeight="600" color="gray.800">
                Delete {activeTable === 'session' ? 'Session' : 'Message'}
              </Text>
              <Text color="gray.600">
                {activeTable === 'session' 
                  ? `Are you sure you want to delete the session "${clearRowToDelete.name || clearRowToDelete.id}"? This will also delete all associated messages.`
                  : `Are you sure you want to delete this ${activeTable}? This action cannot be undone.`
                }
              </Text>
              <HStack gap={3} justify="end">
                <Button
                  variant="ghost"
                  onClick={() => setClearRowToDelete(null)}
                  disabled={isDeleting === clearRowToDelete.id?.toString()}
                  px={4}
                  py={2}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  bg="red.500"
                  color="white"
                  _hover={{ bg: "red.600" }}
                  _active={{ bg: "red.700" }}
                  onClick={confirmDeleteRow}
                  disabled={isDeleting === clearRowToDelete.id?.toString()}
                  px={4}
                  py={2}
                >
                  {isDeleting === clearRowToDelete.id?.toString() ? <Spinner size="xs" mr={2} /> : null}
                  Delete
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
