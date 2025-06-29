import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  IconButton,
} from '@chakra-ui/react';
import { ArrowLeft, Save, Settings, Database, Cpu } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSettings } from './hooks/useSettings';
import LLMProvidersTab from './tabs/LLMProvidersTab';
import MemoryTab from './tabs/MemoryTab';

export default function SettingsPage() {
  const router = useRouter();
  const [state, actions] = useSettings();
  const [activeTab, setActiveTab] = useState<'llm' | 'memory'>('llm');

  // Load settings on component mount
  useEffect(() => {
    actions.loadSettings();
  }, []);

  return (
    <Flex 
      direction="column"
      h="100vh" 
      bg="gray.50" 
      fontFamily="Inter"
      overflow="hidden"
    >
      {/* Header */}
      <Box 
        bg="white" 
        borderBottom="1px solid" 
        borderColor="gray.200"
        px={6} 
        py={4}
        flexShrink={0}
      >
        <Flex align="center" justify="space-between">
          <HStack gap={4}>
            <IconButton
              aria-label="Back to chat"
              size="sm"
              variant="ghost"
              onClick={() => router.push('/')}
              _hover={{ bg: "gray.100" }}
              px={2}
              py={2}
            >
              <ArrowLeft size={18} />
            </IconButton>
            <HStack gap={3}>
              <Settings size={24} color="#6054FF" />
              <Text 
                fontSize="24px" 
                fontWeight="500" 
                color="gray.700"
              >
                Settings
              </Text>
            </HStack>
          </HStack>
          
          <HStack gap={3}>
            {state.hasUnsavedChanges && (
              <Text fontSize="sm" color="orange.500" fontWeight="medium">
                Unsaved changes
              </Text>
            )}
            {state.saveMessage && (
              <Text fontSize="sm" color="green.500" fontWeight="medium">
                {state.saveMessage}
              </Text>
            )}
            <Button
              bg="linear-gradient(135deg, #459AFF 0%, #6054FF 100%)"
              color="white"
              _hover={{
                bg: "linear-gradient(135deg, #4092ff 0%, #5a4ce6 100%)",
                transform: 'translateY(-1px)',
              }}
              _active={{
                transform: 'translateY(0)',
              }}
              loading={state.isSaving}
              onClick={actions.saveSettings}
              disabled={!state.hasUnsavedChanges}
              px={4}
              py={2}
            >
              <Save size={16} style={{ marginRight: '8px' }} />
              Save Settings
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Tab Navigation */}
      <Box p={6} flex={1} overflow="auto">
        <HStack gap={4} mb={6}>
          <Button
            variant={activeTab === 'llm' ? 'solid' : 'outline'}
            colorScheme="purple"
            onClick={() => setActiveTab('llm')}
            px={4}
            py={2}
          >
            <Cpu size={16} style={{ marginRight: '8px' }} />
            LLM Providers
          </Button>
          <Button
            variant={activeTab === 'memory' ? 'solid' : 'outline'}
            colorScheme="purple"
            onClick={() => setActiveTab('memory')}
            px={4}
            py={2}
          >
            <Database size={16} style={{ marginRight: '8px' }} />
            Memory
          </Button>
        </HStack>

        {/* Tab Content */}
        {activeTab === 'llm' && (
          <LLMProvidersTab state={state} actions={actions} />
        )}

        {activeTab === 'memory' && (
          <MemoryTab state={state} actions={actions} />
        )}
      </Box>
    </Flex>
  );
}
