import React from 'react';
import {
  Box,
  Text,
  Badge,
  Spinner,
  IconButton,
  HStack,
  VStack,
  Flex,
} from '@chakra-ui/react';
import { Eye, Trash2 } from 'lucide-react';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'actions';
  width?: string;
}

export interface TableRow {
  [key: string]: any;
}

interface DatabaseTableProps {
  tableName: string;
  columns: TableColumn[];
  data: TableRow[];
  isLoading?: boolean;
  error?: string | null;
  onViewRow?: (row: TableRow) => void;
  onDeleteRow?: (row: TableRow) => void;
  deletingRowId?: string | null; // ID of row currently being deleted
}

const DatabaseTable: React.FC<DatabaseTableProps> = ({
  tableName,
  columns,
  data,
  isLoading = false,
  error = null,
  onViewRow,
  onDeleteRow,
  deletingRowId = null,
}) => {
  const formatCellValue = (value: any, type: string = 'text') => {
    if (value === null || value === undefined) {
      return <Text color="gray.400" fontSize="sm">null</Text>;
    }

    switch (type) {
      case 'date':
        if (typeof value === 'number') {
          return new Date(value * 1000).toLocaleString();
        }
        return new Date(value).toLocaleString();
      
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      
      case 'badge':
        return (
          <Badge
            bg={value === 'open' ? 'green.100' : 'gray.100'}
            color={value === 'open' ? 'green.800' : 'gray.800'}
            px={2}
            py={1}
            borderRadius="4px"
            fontSize="xs"
          >
            {value}
          </Badge>
        );
      
      case 'text':
      default:
        if (typeof value === 'string' && value.length > 100) {
          return (
            <Text 
              fontSize="sm" 
              title={value}
              cursor="help"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              maxW="200px"
            >
              {value}
            </Text>
          );
        }
        return <Text fontSize="sm">{value}</Text>;
    }
  };

  if (error) {
    return (
      <Box 
        p={4} 
        bg="red.50" 
        borderRadius="8px" 
        border="1px solid" 
        borderColor="red.200"
        color="red.800"
      >
        <Text fontWeight="500">Error loading {tableName}:</Text>
        <Text fontSize="sm" mt={1}>{error}</Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={4} h="full">
      {/* Table Header */}
      <Box>
        <Text fontSize="18px" fontWeight="600" color="gray.800" mb={1}>
          {tableName}
        </Text>
        <Text fontSize="14px" color="gray.600">
          {isLoading ? 'Loading...' : `${data.length} records`}
        </Text>
      </Box>

      {/* Table Container with Fixed Height and Scrolling */}
      <Box
        flex={1}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="8px"
        overflow="hidden"
        bg="white"
        h="full"
        minH="400px"
      >
        {isLoading ? (
          <Flex justify="center" align="center" h="200px">
            <VStack gap={3}>
              <Spinner size="lg" color="blue.500" />
              <Text color="gray.500">Loading {tableName} data...</Text>
            </VStack>
          </Flex>
        ) : data.length === 0 ? (
          <Flex justify="center" align="center" h="200px">
            <VStack gap={2}>
              <Text fontSize="lg" color="gray.500">No data found</Text>
              <Text fontSize="sm" color="gray.400">
                This table is currently empty
              </Text>
            </VStack>
          </Flex>
        ) : (
          <Box h="full" overflow="auto">
            {/* Header Row - Sticky */}
            <Flex
              bg="gray.50"
              borderBottom="2px solid"
              borderColor="gray.200"
              py={3}
              px={4}
              position="sticky"
              top={0}
              zIndex={1}
            >
              {columns.map((column) => (
                <Box
                  key={column.key}
                  flex={column.width || "1"}
                  fontSize="12px"
                  fontWeight="600"
                  color="gray.700"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  {column.label}
                </Box>
              ))}
              {(onViewRow || onDeleteRow) && (
                <Box width="80px" textAlign="center" fontSize="12px" fontWeight="600" color="gray.700">
                  ACTIONS
                </Box>
              )}
            </Flex>

            {/* Data Rows - Scrollable */}
            <Box>
              {data.map((row, index) => {
                const isDeleting = deletingRowId === row.id?.toString();
                return (
                  <Flex
                    key={row.id || index}
                    py={3}
                    px={4}
                    borderBottom={index < data.length - 1 ? "1px solid" : "none"}
                    borderColor="gray.100"
                    _hover={{ bg: "gray.50" }}
                    align="center"
                    minH="48px"
                    opacity={isDeleting ? 0.5 : 1}
                    transition="opacity 0.2s"
                  >
                    {columns.map((column) => (
                      <Box
                        key={column.key}
                        flex={column.width || "1"}
                        pr={4}
                      >
                        {formatCellValue(row[column.key], column.type)}
                      </Box>
                    ))}
                    {(onViewRow || onDeleteRow) && (
                      <Box width="80px">
                        <HStack gap={1} justify="center">
                          {onViewRow && (
                            <IconButton
                              aria-label="View details"
                              size="sm"
                              variant="ghost"
                              onClick={() => onViewRow(row)}
                              disabled={isDeleting}
                              _hover={{ bg: "blue.50", color: "blue.600" }}
                              p={2}
                            >
                              <Eye size={14} />
                            </IconButton>
                          )}
                          {onDeleteRow && (
                            <IconButton
                              aria-label="Delete record"
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteRow(row)}
                              disabled={isDeleting}
                              _hover={{ bg: "red.50", color: "red.600" }}
                              p={2}
                            >
                              {isDeleting ? (
                                <Spinner size="xs" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </IconButton>
                          )}
                        </HStack>
                      </Box>
                    )}
                  </Flex>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </VStack>
  );
};

export default DatabaseTable;