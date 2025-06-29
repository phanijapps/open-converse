import React, { useState } from 'react';
import { Button, Box, Text } from '@chakra-ui/react';
import { invoke } from '@tauri-apps/api/core';

export default function OpenRouterTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    console.log('[UI] Invoking tauri_test_openrouter_settings');
    try {
      const ok = await invoke<boolean>('tauri_test_openrouter_settings');
      setResult(ok ? 'OpenRouter API key is valid!' : 'OpenRouter API key is invalid.');
      console.log('[UI] OpenRouter test result:', ok);
    } catch (e: any) {
      setError('Error testing OpenRouter API key: ' + (e?.toString() || 'Unknown error'));
      console.error('[UI] OpenRouter test error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box my={4}>
      <Button onClick={handleTest} loading={loading} colorScheme="blue">
        Test OpenRouter API Key
      </Button>
      {result && <Text color="green.600" mt={2}>{result}</Text>}
      {error && <Text color="red.600" mt={2}>{error}</Text>}
    </Box>
  );
}
