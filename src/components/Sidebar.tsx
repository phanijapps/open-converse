import React from 'react';
import { 
  Box, 
  Flex, 
  VStack, 
  HStack, 
  Text, 
  Input, 
  Button, 
  IconButton,
  Badge,
} from '@chakra-ui/react';
import { Search, Settings, Edit, Trash2 } from 'lucide-react';

export interface Conversation {
  id: string;
  name: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ conversations, activeId, onSelect }) => {
  return (
    <Box 
      w="320px" 
      h="100vh" 
      bg="white" 
      borderRight="1px solid" 
      borderColor="gray.100"
      boxShadow="xl"
    >
      {/* Header */}
      <Flex p={6} align="center" justify="space-between" borderBottom="1px solid" borderColor="gray.100">
        <Text fontSize="xl" fontWeight="bold" bgGradient="linear(to-r, #5661F6, #6054FF)" bgClip="text">
          OpenConverse
        </Text>
        <Button
          size="sm"
          borderRadius="full"
          bgGradient="linear(to-r, #5661F6, #6054FF)"
          color="white"
          _hover={{ transform: 'scale(1.05)' }}
          transition="all 0.2s"
        >
          +
        </Button>
      </Flex>

      {/* Search */}
      <Box p={6} bg="gray.50">
        <Box position="relative">
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9CA3AF' 
            }} 
          />
          <Input 
            pl={10}
            borderRadius="xl"
            placeholder="Search conversations..."
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            _focus={{ borderColor: "#5661F6", boxShadow: "0 0 0 1px #5661F6" }}
          />
        </Box>
      </Box>

      {/* Conversations */}
      <VStack gap={2} p={4} align="stretch" flex={1} overflowY="auto">
        {conversations.map(conv => (
          <Box
            key={conv.id}
            p={4}
            borderRadius="xl"
            bg={activeId === conv.id ? "linear-gradient(135deg, #EBF4FF 0%, #E9D5FF 100%)" : "transparent"}
            border={activeId === conv.id ? "1px solid" : "none"}
            borderColor={activeId === conv.id ? "#5661F6" : "transparent"}
            cursor="pointer"
            onClick={() => onSelect(conv.id)}
            _hover={{ bg: "gray.50" }}
            transition="all 0.2s"
            role="group"
          >
            <HStack gap={3}>
              <Box 
                w="32px" 
                h="32px" 
                borderRadius="full" 
                bgGradient="linear(to-br, #5661F6, #6054FF)"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                fontWeight="bold"
              >
                {conv.name.charAt(0).toUpperCase()}
              </Box>
              <Text 
                fontWeight={activeId === conv.id ? "semibold" : "normal"} 
                color={activeId === conv.id ? "#5661F6" : "gray.700"} 
                flex={1}
              >
                {conv.name}
              </Text>
              <HStack gap={1} opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
                <IconButton 
                  aria-label="Edit" 
                  size="xs" 
                  variant="ghost"
                >
                  <Edit size={14} />
                </IconButton>
                <IconButton 
                  aria-label="Delete" 
                  size="xs" 
                  variant="ghost"
                >
                  <Trash2 size={14} />
                </IconButton>
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* User Profile */}
      <Box p={6} borderTop="1px solid" borderColor="gray.100">
        <HStack gap={3}>
          <Box 
            w="40px" 
            h="40px" 
            borderRadius="full" 
            bgGradient="linear(to-br, #5661F6, #6054FF)"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="md"
            fontWeight="bold"
          >
            AN
          </Box>
          <VStack align="start" gap={0} flex={1}>
            <Text fontWeight="medium">Andrew Neilson</Text>
            <Text fontSize="sm" color="gray.500">Settings</Text>
          </VStack>
          <Badge colorScheme="blue" borderRadius="full" px={3}>Silent</Badge>
          <IconButton aria-label="Settings" size="sm" variant="ghost">
            <Settings size={18} />
          </IconButton>
        </HStack>
      </Box>
    </Box>
  );
};

export default Sidebar;
