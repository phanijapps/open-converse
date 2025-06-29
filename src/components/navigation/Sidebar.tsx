import React, { useState } from 'react';
import { 
  Box, 
  Flex, 
  VStack, 
  HStack, 
  Text, 
  Input, 
  Button, 
  IconButton,
} from '@chakra-ui/react';
import { Search, MessageCircle, Plus, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';
import SettingsDropdown from '../ui/SettingsDropdown';

export interface Conversation {
  id: string;
  name: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  activeId, 
  onSelect, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const router = useRouter();

  return (
    <Box 
      w={isCollapsed ? "64px" : { base: "100vw", md: "320px", lg: "348px", xl: "380px" }}
      h="100vh" 
      bg="white" 
      borderRight="1px solid" 
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
      transition="width 0.3s ease"
      position={{ base: "fixed", md: "relative" }}
      top={{ base: 0, md: "auto" }}
      left={{ base: 0, md: "auto" }}
      zIndex={{ base: 1000, md: "auto" }}
      boxShadow={{ base: "2xl", md: "none" }}
    >

      {/* Header with Logo */}
      <Box 
        p={isCollapsed ? 4 : 6} 
        borderBottom="1px solid" 
        borderColor="gray.100" 
        position="relative"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        {!isCollapsed ? (
          <HStack justify="space-between" align="center" w="full">
            <Text 
              fontSize="24px" 
              fontWeight="500" 
              color="gray.700"
              letterSpacing="0.25em"
              fontFamily="Inter"
            >
              OpenConv
            </Text>
            <IconButton
              aria-label="Collapse sidebar"
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
              _hover={{
                bg: "gray.100"
              }}
            >
              <ChevronLeft size={16} />
            </IconButton>
          </HStack>
        ) : (
          <Box 
            w="48px" 
            h="48px" 
            borderRadius="24px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <Text 
              fontSize="18px" 
              fontWeight="500" 
              color="gray.700"
              fontFamily="Inter"
              mr={1}
            >
              O
            </Text>
            <IconButton
              aria-label="Expand sidebar"
              size="xs"
              variant="ghost"
              onClick={onToggleCollapse}
              _hover={{
                bg: "gray.100"
              }}
              minW="auto"
              h="auto"
              p={1}
              borderRadius="full"
            >
              <ChevronRight size={12} />
            </IconButton>
          </Box>
        )}
      </Box>

      {!isCollapsed ? (
        <>
          {/* New Chat Button with Settings */}
          <Box px={{ base: 3, sm: 4, md: 6 }} pt={4}>
            <HStack gap={3}>
              <Button
                flex={1}
                h="50px"
                bg="linear-gradient(135deg, #459AFF 0%, #6054FF 100%)"
                color="white"
                borderRadius="25px"
                fontSize="16px"
                fontWeight="400"
                _hover={{
                  bg: "linear-gradient(135deg, #4092ff 0%, #5a4ce6 100%)",
                  transform: 'translateY(-1px)',
                }}
                _active={{
                  transform: 'translateY(0)',
                }}
                transition="all 0.2s ease"
                display="flex"
                alignItems="center"
                gap={3}
              >
                <Plus size={18} />
                New chat
              </Button>
              <SettingsDropdown isCollapsed={false} />
            </HStack>
          </Box>

          {/* Search */}
          <Box px={{ base: 3, sm: 4, md: 6 }} py={4}>
            <Box position="relative">
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#9CA3AF' 
                }} 
              />
              <Input 
                pl={12}
                h="50px"
                borderRadius="25px"
                placeholder="Search conversations..."
                bg="#8B81FF"
                border="none"
                color="white"
                fontSize="16px"
                _placeholder={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: '400'
                }}
                _focus={{ 
                  outline: "none", 
                  boxShadow: "none"
                }}
              />
            </Box>
          </Box>

          {/* Conversations Header */}
          <Box px={{ base: 3, sm: 4, md: 6 }} py={4}>
            <HStack justify="space-between" align="center">
              <Text 
                fontSize="12px" 
                fontWeight="400" 
                color="#6A6969"
                fontFamily="Inter"
              >
                Your conversations
              </Text>
              <Text 
                fontSize="14px" 
                fontWeight="600" 
                color="#5661F6"
                cursor="pointer"
                fontFamily="Inter"
                _hover={{ textDecoration: 'underline' }}
              >
                Clear All
              </Text>
            </HStack>
          </Box>

          {/* Conversations List */}
          <VStack 
            gap={0} 
            px={{ base: 3, sm: 4, md: 6 }} 
            align="stretch" 
            flex={1} 
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '0px',
              },
            }}
          >
            {conversations.map(conv => (
              <Box
                key={conv.id}
                py={4}
                cursor="pointer"
                onClick={() => onSelect(conv.id)}
                transition="all 0.2s"
                borderBottom="1px solid"
                borderColor="transparent"
                _hover={{ 
                  bg: "gray.50",
                  borderBottomColor: "gray.100"
                }}
              >
                <HStack gap={3} align="center">
                  <Box color={activeId === conv.id ? "#02489B" : "#000000"}>
                    <MessageCircle size={16} strokeWidth={1.5} />
                  </Box>
                  <Text 
                    fontSize="16px"
                    fontWeight="400"
                    color={activeId === conv.id ? "#02489B" : "#475569"}
                    fontFamily="Inter"
                    lineHeight="1.5"
                    flex={1}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {conv.name}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>

          {/* Last 7 Days Section */}
          <Box px={{ base: 3, sm: 4, md: 6 }} py={4}>
            <Text 
              fontSize="14px" 
              fontWeight="500" 
              color="#6A6969"
              fontFamily="Mier A"
            >
              Last 7 Days
            </Text>
          </Box>

          {/* Vibe Note Section */}
          <Box p={{ base: 3, sm: 4, md: 6 }} borderTop="1px solid" borderColor="gray.100">
            <Box
              p={4}
              borderRadius="20px"
              bg="linear-gradient(135deg, #667eea20 0%, #764ba220 100%)"
              border="1px solid"
              borderColor="purple.200"
              textAlign="center"
            >
              <Text 
                fontSize="13px"
                fontWeight="500"
                color="#667eea"
                fontFamily="Inter"
                lineHeight="1.4"
              >
                🎨✨ Vibe Coded using GitHub Copilot and Figma Community Design 🚀😎
              </Text>
            </Box>
          </Box>
        </>
      ) : (
        /* Collapsed Sidebar Content */
        <>
          {/* Collapsed New Chat Button with Settings */}
          <Box p={4}>
            <VStack gap={3}>
              <IconButton
                aria-label="New chat"
                w="48px"
                h="48px"
                borderRadius="24px"
                bg="linear-gradient(135deg, #459AFF 0%, #6054FF 100%)"
                color="white"
                _hover={{
                  bg: "linear-gradient(135deg, #4092ff 0%, #5a4ce6 100%)",
                  transform: 'translateY(-1px)',
                }}
                _active={{
                  transform: 'translateY(0)',
                }}
                transition="all 0.2s ease"
              >
                <Plus size={20} />
              </IconButton>
              <SettingsDropdown isCollapsed={true} />
            </VStack>
          </Box>

          {/* Collapsed Search */}
          <Box p={4}>
            <IconButton
              aria-label="Search"
              w="48px"
              h="48px"
              borderRadius="24px"
              bg="#8B81FF"
              color="white"
              _hover={{
                bg: "#7B71FF",
              }}
              transition="all 0.2s ease"
            >
              <Search size={18} />
            </IconButton>
          </Box>

          {/* Collapsed Conversations */}
          <VStack 
            gap={2} 
            px={4} 
            align="center" 
            flex={1} 
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '0px',
              },
            }}
          >
            {conversations.map(conv => (
              <IconButton
                key={conv.id}
                aria-label={conv.name}
                w="48px"
                h="48px"
                borderRadius="24px"
                bg={activeId === conv.id ? "#EBF4FF" : "transparent"}
                border={activeId === conv.id ? "2px solid #02489B" : "2px solid transparent"}
                color={activeId === conv.id ? "#02489B" : "#000000"}
                onClick={() => onSelect(conv.id)}
                _hover={{ 
                  bg: activeId === conv.id ? "#EBF4FF" : "gray.50",
                }}
                transition="all 0.2s"
              >
                <MessageCircle size={16} strokeWidth={1.5} />
              </IconButton>
            ))}
          </VStack>
        </>
      )}
    </Box>
  );
};

export default Sidebar;
