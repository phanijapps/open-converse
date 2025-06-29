import React from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Badge,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { Database, Users, MessageSquare, FileText, RefreshCw } from 'lucide-react';

export interface DatabaseTableInfo {
  name: string;
  displayName: string;
  count: number;
  icon: React.ReactNode;
  description: string;
}

interface DatabaseSidebarProps {
  tables: DatabaseTableInfo[];
  activeTable: string | null;
  onTableSelect: (tableName: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const DatabaseSidebar: React.FC<DatabaseSidebarProps> = ({
  tables,
  activeTable,
  onTableSelect,
  onRefresh,
  isLoading = false,
}) => {
  const getTableIcon = (tableName: string) => {
    switch (tableName.toLowerCase()) {
      case 'persona':
        return <Users size={16} strokeWidth={1.5} />;
      case 'conversation':
        return <MessageSquare size={16} strokeWidth={1.5} />;
      case 'message':
        return <FileText size={16} strokeWidth={1.5} />;
      default:
        return <Database size={16} strokeWidth={1.5} />;
    }
  };

  return (
    <Box
      w="280px"
      h="100%"
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
      p={4}
    >
      <VStack align="stretch" gap={4}>
        {/* Header */}
        <Box>
          <HStack justify="space-between" align="center" mb={2}>
            <HStack gap={2}>
              <Database size={20} strokeWidth={1.5} color="#51A1FF" />
              <Text fontSize="18px" fontWeight="600" color="gray.800">
                Database Tables
              </Text>
            </HStack>
            <IconButton
              aria-label="Refresh data"
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              disabled={isLoading}
              _hover={{ bg: "gray.100" }}
              px={2}
              py={2}
            >
              <RefreshCw size={16} strokeWidth={1.5} />
            </IconButton>
          </HStack>
          <Text fontSize="14px" color="gray.600">
            Explore your conversation data
          </Text>
        </Box>

        {/* Table List */}
        <VStack align="stretch" gap={2}>
          {tables.map((table) => (
            <Button
              key={table.name}
              variant="ghost"
              justifyContent="flex-start"
              h="auto"
              p={3}
              bg={activeTable === table.name ? "blue.50" : "transparent"}
              borderLeft="3px solid"
              borderLeftColor={activeTable === table.name ? "blue.500" : "transparent"}
              borderRadius="8px"
              onClick={() => onTableSelect(table.name)}
              _hover={{
                bg: activeTable === table.name ? "blue.50" : "gray.50",
                borderLeftColor: activeTable === table.name ? "blue.500" : "gray.300",
              }}
              _active={{
                bg: activeTable === table.name ? "blue.100" : "gray.100",
              }}
              transition="all 0.2s ease"
            >
              <VStack align="stretch" gap={2} w="full">
                <HStack justify="space-between" align="center">
                  <HStack gap={2}>
                    <Box color={activeTable === table.name ? "blue.600" : "gray.600"}>
                      {getTableIcon(table.name)}
                    </Box>
                    <Text
                      fontSize="14px"
                      fontWeight={activeTable === table.name ? "600" : "500"}
                      color={activeTable === table.name ? "blue.800" : "gray.800"}
                    >
                      {table.displayName}
                    </Text>
                  </HStack>
                  <Badge
                    bg={activeTable === table.name ? "blue.100" : "gray.100"}
                    color={activeTable === table.name ? "blue.800" : "gray.600"}
                    px={2}
                    py={1}
                    borderRadius="4px"
                    fontSize="xs"
                    fontWeight="600"
                  >
                    {table.count.toLocaleString()}
                  </Badge>
                </HStack>
                <Text
                  fontSize="12px"
                  color={activeTable === table.name ? "blue.600" : "gray.500"}
                  textAlign="left"
                  lineHeight="1.4"
                  wordBreak="break-word"
                  whiteSpace="normal"
                >
                  {table.description}
                </Text>
              </VStack>
            </Button>
          ))}
        </VStack>

        {/* Summary Stats */}
        <Box
          mt={4}
          p={3}
          bg="gray.50"
          borderRadius="8px"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
            DATABASE SUMMARY
          </Text>
          <VStack align="stretch" gap={1}>
            <HStack justify="space-between">
              <Text fontSize="11px" color="gray.600">Total Tables:</Text>
              <Text fontSize="11px" fontWeight="600" color="gray.800">
                {tables.length}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="11px" color="gray.600">Total Records:</Text>
              <Text fontSize="11px" fontWeight="600" color="gray.800">
                {tables.reduce((sum, table) => sum + table.count, 0).toLocaleString()}
              </Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default DatabaseSidebar;
