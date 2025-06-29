import React, { useEffect, useRef } from 'react';
import { VStack, Box, Text } from '@chakra-ui/react';
import ProviderSelector from '../providers/ProviderSelector';
import ProviderCard from '../providers/ProviderCard';
import type { SettingsState, SettingsActions } from '../hooks/useSettings';

interface LLMProvidersTabProps {
  state: SettingsState;
  actions: SettingsActions;
}

export default function LLMProvidersTab({ state, actions }: LLMProvidersTabProps) {
  const prevStateRef = useRef<any>({});

  // Auto-save when API key changes and is verified (but prevent infinite loops)
  useEffect(() => {
    const prev = prevStateRef.current;
    console.debug('[LLMProvidersTab] Auto-save effect triggered:', {
      verificationStatus: { prev: prev.verificationStatus, current: state.verificationStatus },
      hasUnsavedChanges: { prev: prev.hasUnsavedChanges, current: state.hasUnsavedChanges },
      isSaving: { prev: prev.isSaving, current: state.isSaving },
      apiKey: !!state.apiKey,
      selectedProviderId: !!state.selectedProviderId
    });
    
    if (state.apiKey && state.selectedProviderId && state.verificationStatus === 'verified' && state.hasUnsavedChanges && !state.isSaving) {
      console.debug('[LLMProvidersTab] Auto-saving verified settings');
      actions.autoSave();
    }
    
    prevStateRef.current = {
      verificationStatus: state.verificationStatus,
      hasUnsavedChanges: state.hasUnsavedChanges,
      isSaving: state.isSaving
    };
  }, [state.verificationStatus, state.hasUnsavedChanges, state.isSaving, actions.autoSave]); // Include autoSave in deps

  // Verify API key when it changes (but prevent infinite loops)
  useEffect(() => {
    if (state.apiKey && state.selectedProviderId && state.currentProvider?.requiresAuth && state.verificationStatus !== 'checking') {
      // Only verify if not already verified for this key or if verification failed
      if (
        !state.currentProvider?.verified ||
        state.currentProvider.apiKey !== state.apiKey ||
        state.verificationStatus === 'error'
      ) {
        console.debug('[LLMProvidersTab] Triggering verification for new/changed API key');
        handleVerification();
      }
    }
  }, [state.apiKey, state.selectedProviderId, state.verificationStatus]); // Add verificationStatus to prevent multiple concurrent calls

  const handleVerification = async () => {
    if (!state.selectedProviderId || !state.apiKey) return;

    actions.setVerificationStatus('checking');

    try {
      // Call the Tauri backend for verification
      const { invoke } = await import('@tauri-apps/api/core');
      const settings = { apiKey: state.apiKey };
      const ok = await invoke<boolean>('tauri_test_openrouter_settings', { settings });

      if (ok) {
        actions.setVerificationStatus('verified');
      } else {
        actions.setVerificationStatus('error', 'Verification failed');
      }
    } catch (error: any) {
      actions.setVerificationStatus('error', error?.toString() || 'Verification failed');
      console.error('Verification error:', error);
    }
  };

  return (
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
          {/* Provider Selection */}
          <ProviderSelector
            selectedProviderId={state.selectedProviderId}
            onProviderSelect={actions.selectProvider}
          />

          {/* Provider Configuration */}
          {state.currentProvider && (
            <ProviderCard
              provider={state.currentProvider}
              apiKey={state.apiKey}
              verificationStatus={state.verificationStatus}
              verificationError={state.verificationError}
              onApiKeyChange={actions.updateApiKey}
              onVerification={handleVerification}
              onToggleEnabled={actions.toggleProviderEnabled}
            />
          )}

          {/* Empty State */}
          {!state.currentProvider && (
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
  );
}
