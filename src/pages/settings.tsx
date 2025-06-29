import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Textarea,
  Select,
  Spinner,
  Badge,
  Alert,
} from '@chakra-ui/react';
import { ArrowLeft, Save, Settings, Database, Cpu, Check, X, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { readSettings, writeSettings } from '@/utils/settings';
import type { MemoryConfig, SettingsData } from '@shared/types';
import type { DatabaseStats } from '@shared/database-types';
import { 
  getAvailableProviders, 
  getProviderById, 
  type ConfiguredProvider, 
  type VerificationStatus 
} from '@/utils/providers/registry';
import { verifyProvider } from '@/utils/providers/verifiers';

export default function SettingsPage() {
  const router = useRouter();
  
  // State for LLM Provider (single provider selection)
  const [currentProvider, setCurrentProvider] = useState<ConfiguredProvider | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verificationError, setVerificationError] = useState<string>('');
  
  // Memory config state
  const [memoryConfig, setMemoryConfig] = useState<MemoryConfig>({
    provider: 'sqlite',
    config: {}
  });
  
  // Memory management state
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [databasePath, setDatabasePath] = useState<string>('');
  const [isDatabaseInitialized, setIsDatabaseInitialized] = useState(false);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);
  const [memoryOperationMessage, setMemoryOperationMessage] = useState('');
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'llm' | 'memory'>('llm');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Get available providers
  const availableProviders = getAvailableProviders();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-save when API key changes and is valid
  useEffect(() => {
    if (apiKey && selectedProviderId && verificationStatus === 'verified') {
      handleAutoSave();
    }
  }, [apiKey, selectedProviderId, verificationStatus]);

  // Verify API key when it changes
  useEffect(() => {
    if (apiKey && selectedProviderId) {
      const provider = getProviderById(selectedProviderId);
      if (provider?.requiresAuth) {
        handleVerification();
      }
    }
  }, [apiKey, selectedProviderId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await readSettings();
      
      // Load the first configured provider if any exist
      if (data.llmProviders && data.llmProviders.length > 0) {
        const firstProvider = data.llmProviders[0];
        const template = getProviderById(firstProvider.providerId);
        if (template) {
          const configured: ConfiguredProvider = {
            ...template,
            apiKey: firstProvider.apiKey,
            enabled: firstProvider.enabled || true,
            verified: firstProvider.verified || false,
            lastVerified: firstProvider.lastVerified,
            verificationError: firstProvider.verificationError
          };
          setCurrentProvider(configured);
          setSelectedProviderId(firstProvider.providerId);
          setApiKey(firstProvider.apiKey);
          
          // Set verification status based on stored data
          if (firstProvider.verified) {
            setVerificationStatus('verified');
          } else if (firstProvider.verificationError) {
            setVerificationStatus('error');
            setVerificationError(firstProvider.verificationError);
          } else {
            setVerificationStatus('idle');
          }
        }
      }
      
      setMemoryConfig(data.memoryConfig || { provider: 'sqlite', config: {} });
    } catch (error) {
      setSaveMessage('Error loading settings');
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelection = async (providerId: string) => {
    if (!providerId) {
      setCurrentProvider(null);
      setSelectedProviderId('');
      setApiKey('');
      setVerificationStatus('idle');
      setVerificationError('');
      return;
    }

    const template = getProviderById(providerId);
    if (template) {
      // Check if we have saved settings for this provider
      try {
        const savedSettings = await readSettings();
        const existingProvider = savedSettings.llmProviders?.find(p => p.providerId === providerId);
        
        if (existingProvider && existingProvider.apiKey) {
          // Use existing saved provider data
          const configured: ConfiguredProvider = {
            ...template,
            apiKey: existingProvider.apiKey,
            enabled: existingProvider.enabled ?? true,
            verified: existingProvider.verified ?? false,
            lastVerified: existingProvider.lastVerified,
            verificationError: existingProvider.verificationError
          };
          setCurrentProvider(configured);
          setSelectedProviderId(providerId);
          setApiKey(existingProvider.apiKey);
          
          // Set verification status based on saved data
          if (existingProvider.verified) {
            setVerificationStatus('verified');
          } else if (existingProvider.verificationError) {
            setVerificationStatus('error');
            setVerificationError(existingProvider.verificationError);
          } else {
            setVerificationStatus('idle');
          }
        } else {
          // New provider setup
          const configured: ConfiguredProvider = {
            ...template,
            apiKey: '',
            enabled: true,
            verified: false
          };
          setCurrentProvider(configured);
          setSelectedProviderId(providerId);
          setApiKey('');
          setVerificationStatus('idle');
          setVerificationError('');
        }
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error('Error loading saved provider data:', error);
        // Fallback to new provider setup
        const configured: ConfiguredProvider = {
          ...template,
          apiKey: '',
          enabled: true,
          verified: false
        };
        setCurrentProvider(configured);
        setSelectedProviderId(providerId);
        setApiKey('');
        setVerificationStatus('idle');
        setVerificationError('');
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setHasUnsavedChanges(true);
    
    if (currentProvider) {
      setCurrentProvider({
        ...currentProvider,
        apiKey: value,
        verified: false
      });
    }
  };

  const handleVerification = async () => {
    if (!selectedProviderId || !apiKey) return;
    
    setVerificationStatus('checking');
    setVerificationError('');
    
    try {
      const result = await verifyProvider(selectedProviderId, apiKey);
      
      if (result.success) {
        setVerificationStatus('verified');
        if (currentProvider) {
          setCurrentProvider({
            ...currentProvider,
            verified: true,
            lastVerified: new Date(),
            verificationError: undefined
          });
        }
      } else {
        setVerificationStatus('error');
        setVerificationError(result.error || 'Verification failed');
        if (currentProvider) {
          setCurrentProvider({
            ...currentProvider,
            verified: false,
            verificationError: result.error
          });
        }
      }
    } catch (error) {
      setVerificationStatus('error');
      setVerificationError('Verification failed');
      console.error('Verification error:', error);
    }
  };

  const handleAutoSave = async () => {
    if (!currentProvider || !selectedProviderId || !apiKey) return;

    try {
      const settingsData: SettingsData = {
        llmProviders: [{
          providerId: selectedProviderId,
          description: currentProvider.description,
          baseUrl: currentProvider.baseUrl,
          apiKey: apiKey,
          enabled: currentProvider.enabled,
          verified: currentProvider.verified,
          lastVerified: currentProvider.lastVerified,
          verificationError: currentProvider.verificationError
        }],
        memoryConfig,
      };

      await writeSettings(settingsData);
      setHasUnsavedChanges(false);
      setSaveMessage('Settings saved automatically!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsData: SettingsData = {
        llmProviders: currentProvider && selectedProviderId ? [{
          providerId: selectedProviderId,
          description: currentProvider.description,
          baseUrl: currentProvider.baseUrl,
          apiKey: apiKey,
          enabled: currentProvider.enabled,
          verified: currentProvider.verified,
          lastVerified: currentProvider.lastVerified,
          verificationError: currentProvider.verificationError
        }] : [],
        memoryConfig,
      };

      await writeSettings(settingsData);
      setHasUnsavedChanges(false);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error saving settings');
      setTimeout(() => setSaveMessage(''), 3000);
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMemoryConfig = (field: string, value: any) => {
    setMemoryConfig(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const setMemoryProvider = (provider: 'sqlite' | 'supabase') => {
    setMemoryConfig({
      provider,
      config: provider === 'sqlite' ? {} : { connectionString: '', projectUrl: '', apiKey: '' },
    });
    setHasUnsavedChanges(true);
  };

  // Memory management functions
  const initializeDatabase = async () => {
    setIsMemoryLoading(true);
    try {
      // For Tauri app, we'll simulate the database initialization
      // In a real Tauri app, you would use:
      // const result = await invoke('init_database');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
      
      // Get database path
      // const path = await invoke('get_database_path');
      const path = '~/.openconv/settings/db/conv.db'; // Simulated path
      setDatabasePath(path);
      
      // Get initial stats
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

  const loadDatabaseStats = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Initialize database first if not already initialized
      try {
        await invoke('init_database', { databasePath: null });
      } catch (initError) {
        // Database might already be initialized, continue
        console.log('Database init result:', initError);
      }
      
      const stats = await invoke<DatabaseStats>('get_database_stats');
      setDatabaseStats(stats);
      
      // Get database path
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
        // Clear all data using the new API
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('clear_all_data');
        setMemoryOperationMessage('All data cleared successfully');
      } else {
        // For now, individual table clearing is not implemented
        setMemoryOperationMessage(`${table} clearing not yet implemented`);
      }
      
      setTimeout(() => setMemoryOperationMessage(''), 3000);
      
      // Reload stats
      await loadDatabaseStats();
    } catch (error) {
      console.error(`Failed to clear ${table}:`, error);
      setMemoryOperationMessage(`Failed to clear ${table}`);
      setTimeout(() => setMemoryOperationMessage(''), 3000);
    } finally {
      setIsMemoryLoading(false);
    }
  };

  // Initialize database on component mount
  useEffect(() => {
    if (activeTab === 'memory' && memoryConfig.provider === 'sqlite' && !isDatabaseInitialized) {
      initializeDatabase();
    }
  }, [activeTab, memoryConfig.provider, isDatabaseInitialized]);

  const getVerificationIcon = () => {
    switch (verificationStatus) {
      case 'checking':
        return <Spinner size="sm" color="blue.500" />;
      case 'verified':
        return <CheckCircle size={16} color="green" />;
      case 'error':
        return <AlertCircle size={16} color="red" />;
      default:
        return null;
    }
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'checking':
        return <Badge colorScheme="blue" size="sm">Verifying...</Badge>;
      case 'verified':
        return <Badge colorScheme="green" size="sm">Verified</Badge>;
      case 'error':
        return <Badge colorScheme="red" size="sm">Failed</Badge>;
      default:
        return null;
    }
  };

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
            {hasUnsavedChanges && (
              <Text fontSize="sm" color="orange.500" fontWeight="medium">
                Unsaved changes
              </Text>
            )}
            {saveMessage && (
              <Text fontSize="sm" color="green.500" fontWeight="medium">
                {saveMessage}
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
              loading={isSaving}
              onClick={saveSettings}
              disabled={!hasUnsavedChanges}
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

        {/* LLM Providers Tab */}
        {activeTab === 'llm' && (
          <VStack gap={6} align="stretch">
            <Box
              bg="white"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              p={6}
            >
              <VStack align="start" gap={1} mb={6}>
                <Text fontSize="xl" fontWeight="600" color="gray.700">
                  LLM Provider Configuration
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Select and configure your AI model provider
                </Text>
              </VStack>

              <VStack gap={6} align="stretch">
                {/* Provider Selection Dropdown */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={3}>Choose Provider</Text>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => handleProviderSelection(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select an AI provider...</option>
                    {availableProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} - {provider.description}
                      </option>
                    ))}
                  </select>
                </Box>

                {/* Provider Configuration */}
                {currentProvider && (
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={5}
                    bg="gray.50"
                  >
                    <VStack gap={4} align="stretch">
                      {/* Provider Info Header */}
                      <HStack justify="space-between" align="center">
                        <HStack>
                          <Text fontSize="lg" fontWeight="600">
                            {currentProvider.icon} {currentProvider.name}
                          </Text>
                          {getVerificationBadge()}
                        </HStack>
                        <Button
                          size="sm"
                          colorScheme={currentProvider.enabled ? 'green' : 'gray'}
                          variant="outline"
                          onClick={() => {
                            if (currentProvider) {
                              setCurrentProvider({
                                ...currentProvider,
                                enabled: !currentProvider.enabled
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          px={3}
                          py={1}
                        >
                          {currentProvider.enabled ? 'Enabled' : 'Disabled'}
                        </Button>
                      </HStack>

                      <Text fontSize="sm" color="gray.600">
                        {currentProvider.description}
                      </Text>

                      {/* Base URL - Auto-populated, read-only */}
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={2}>Base URL</Text>
                        <Input
                          value={currentProvider.baseUrl}
                          readOnly
                          bg="gray.100"
                          color="gray.600"
                          _focus={{ bg: "gray.100" }}
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Auto-populated based on provider selection
                        </Text>
                      </Box>

                      {/* API Key - Required for providers that need auth */}
                      {currentProvider.requiresAuth && (
                        <Box>
                          <HStack justify="space-between" align="center" mb={2}>
                            <Text fontSize="sm" fontWeight="medium">API Key *</Text>
                            <HStack>
                              {getVerificationIcon()}
                              {verificationStatus === 'checking' && (
                                <Text fontSize="xs" color="blue.500">Verifying...</Text>
                              )}
                            </HStack>
                          </HStack>
                          <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => handleApiKeyChange(e.target.value)}
                            placeholder="Enter your API key"
                            border="2px solid"
                            borderColor={
                              verificationStatus === 'verified' ? 'green.300' :
                              verificationStatus === 'error' ? 'red.300' : 
                              'gray.200'
                            }
                            _focus={{
                              borderColor: 
                                verificationStatus === 'verified' ? 'green.400' :
                                verificationStatus === 'error' ? 'red.400' : 
                                'purple.400',
                              boxShadow: `0 0 0 1px ${
                                verificationStatus === 'verified' ? '#68d391' :
                                verificationStatus === 'error' ? '#fc8181' : 
                                '#9f7aea'
                              }`
                            }}
                          />
                          <HStack justify="space-between" mt={2}>
                            <Text fontSize="xs" color="gray.500">
                              Your API key is stored securely and never shared
                            </Text>
                            {currentProvider.apiKeyPattern && (
                              <Text fontSize="xs" color="gray.400">
                                Expected format: {currentProvider.apiKeyPattern.source.replace(/[\[\]\\^$.*+?{}()|]/g, '...')}
                              </Text>
                            )}
                          </HStack>

                          {/* Verification Status */}
                          {verificationStatus === 'verified' && (
                            <Box
                              bg="green.50"
                              border="1px solid"
                              borderColor="green.200"
                              borderRadius="md"
                              p={3}
                              mt={3}
                            >
                              <HStack>
                                <CheckCircle size={16} color="green" />
                                <Text fontSize="sm" color="green.700" fontWeight="medium">
                                  API key verified successfully! Settings will auto-save.
                                </Text>
                              </HStack>
                            </Box>
                          )}

                          {verificationStatus === 'error' && verificationError && (
                            <Box
                              bg="red.50"
                              border="1px solid"
                              borderColor="red.200"
                              borderRadius="md"
                              p={3}
                              mt={3}
                            >
                              <HStack>
                                <X size={16} color="red" />
                                <Text fontSize="sm" color="red.700" fontWeight="medium">
                                  {verificationError}
                                </Text>
                              </HStack>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* For providers that don't require auth */}
                      {!currentProvider.requiresAuth && (
                        <Box
                          bg="green.50"
                          border="1px solid"
                          borderColor="green.200"
                          borderRadius="md"
                          p={3}
                        >
                          <HStack>
                            <CheckCircle size={16} color="green" />
                            <Text fontSize="sm" color="green.700" fontWeight="medium">
                              No authentication required
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="green.600" mt={1}>
                            This provider is ready to use without an API key.
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                )}

                {/* Empty State */}
                {!currentProvider && (
                  <Box
                    bg="blue.50"
                    border="1px solid"
                    borderColor="blue.200"
                    borderRadius="md"
                    p={6}
                    textAlign="center"
                  >
                    <Text color="blue.700" fontWeight="medium" mb={2}>
                      No provider selected
                    </Text>
                    <Text fontSize="sm" color="blue.600">
                      Choose a provider from the dropdown above to get started with AI conversations.
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>
          </VStack>
        )}

        {/* Memory Tab */}
        {activeTab === 'memory' && (
          <VStack gap={6} align="stretch">
            <Box
              bg="white"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              p={6}
            >
              <VStack align="start" gap={1} mb={6}>
                <Text fontSize="xl" fontWeight="600" color="gray.700">
                  Memory Configuration
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Configure how your conversations are stored and retrieved
                </Text>
              </VStack>

              <VStack gap={6} align="stretch">
                {/* Provider Selection */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={3}>Storage Provider</Text>
                  <HStack gap={4}>
                    <Button
                      variant={memoryConfig.provider === 'sqlite' ? 'solid' : 'outline'}
                      colorScheme="blue"
                      onClick={() => setMemoryProvider('sqlite')}
                      px={4}
                      py={2}
                    >
                      <Database size={16} style={{ marginRight: '8px' }} />
                      SQLite (Local)
                    </Button>
                    <Button
                      variant={memoryConfig.provider === 'supabase' ? 'solid' : 'outline'}
                      colorScheme="green"
                      onClick={() => setMemoryProvider('supabase')}
                      px={4}
                      py={2}
                    >
                      <Database size={16} style={{ marginRight: '8px' }} />
                      Supabase (Cloud)
                    </Button>
                  </HStack>
                </Box>

                <Box h="1px" bg="gray.200" />

                {/* SQLite Configuration */}
                {memoryConfig.provider === 'sqlite' && (
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
                )}

                {/* Supabase Configuration */}
                {memoryConfig.provider === 'supabase' && (
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
                            onChange={(e) => updateMemoryConfig('projectUrl', e.target.value)}
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
                            onChange={(e) => updateMemoryConfig('apiKey', e.target.value)}
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
                            onChange={(e) => updateMemoryConfig('connectionString', e.target.value)}
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
                )}
              </VStack>
            </Box>
          </VStack>
        )}
      </Box>
    </Flex>
  );
}
