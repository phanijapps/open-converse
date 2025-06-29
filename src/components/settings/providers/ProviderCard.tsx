import React from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Input, 
  Button, 
  Spinner,
  Badge
} from '@chakra-ui/react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import type { ConfiguredProvider, VerificationStatus } from '@/utils/providers/registry';

interface ProviderCardProps {
  provider: ConfiguredProvider;
  apiKey: string;
  verificationStatus: VerificationStatus;
  verificationError: string;
  onApiKeyChange: (value: string) => void;
  onVerification: () => void;
  onToggleEnabled: () => void;
}

export default function ProviderCard({
  provider,
  apiKey,
  verificationStatus,
  verificationError,
  onApiKeyChange,
  onVerification,
  onToggleEnabled
}: ProviderCardProps) {
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
              {provider.icon} {provider.name}
            </Text>
            {getVerificationBadge()}
          </HStack>
          <Button
            size="sm"
            colorScheme={provider.enabled ? 'green' : 'gray'}
            variant="outline"
            onClick={onToggleEnabled}
            px={3}
            py={1}
          >
            {provider.enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </HStack>

        <Text fontSize="sm" color="gray.600">
          {provider.description}
        </Text>

        {/* Base URL - Auto-populated, read-only */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Base URL</Text>
          <Input
            value={provider.baseUrl}
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
        {provider.requiresAuth ? (
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
              onChange={(e) => onApiKeyChange(e.target.value)}
              onBlur={onVerification}
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
              {provider.apiKeyPattern && (
                <Text fontSize="xs" color="gray.400">
                  Expected format: {provider.apiKeyPattern.source.replace(/[\[\]\\^$.*+?{}()|]/g, '...')}
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
        ) : (
          /* For providers that don't require auth */
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
  );
}
