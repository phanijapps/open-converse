// Example: Using Tauri commands in your React components
import { useState } from 'react';
import { Button, VStack, Text, Input } from '@chakra-ui/react';
import { tauriCommands, windowUtils, isTauri } from '@/utils/tauri';

export function TauriExample() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAiChat = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      if (isTauri()) {
        // Use Tauri command for AI response
        const aiResponse = await tauriCommands.getAiResponse(message);
        setResponse(aiResponse);
      } else {
        // Fallback for web (mock response since no API routes in static export)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResponse(`Mock AI Response: "${message}". This is running in web mode.`);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      setResponse('Error getting AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleWindowAction = async (action: string) => {
    if (!isTauri()) {
      alert('Window actions only work in Tauri app');
      return;
    }

    try {
      switch (action) {
        case 'minimize':
          await windowUtils.minimize();
          break;
        case 'hide':
          await windowUtils.hide();
          break;
        case 'show':
          await windowUtils.show();
          break;
      }
    } catch (error) {
      console.error('Window action failed:', error);
    }
  };

  return (
    <VStack gap={4} p={4}>
      <Text fontSize="lg" fontWeight="bold">
        Tauri Integration Example
      </Text>
      
      {/* AI Chat Test */}
      <VStack gap={2} w="full">
        <Input
          placeholder="Enter a message for AI..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button 
          onClick={handleAiChat} 
          loading={loading}
          colorScheme="blue"
        >
          Send to AI
        </Button>
        {response && (
          <Text p={3} bg="gray.100" borderRadius="md" w="full">
            {response}
          </Text>
        )}
      </VStack>

      {/* Window Management Test */}
      {isTauri() && (
        <VStack gap={2}>
          <Text fontWeight="bold">Window Controls:</Text>
          <Button onClick={() => handleWindowAction('minimize')}>
            Minimize Window
          </Button>
          <Button onClick={() => handleWindowAction('hide')}>
            Hide to Tray
          </Button>
        </VStack>
      )}

      {/* Platform Detection */}
      <Text fontSize="sm" color="gray.600">
        Running in: {isTauri() ? 'Tauri App' : 'Web Browser'}
      </Text>
    </VStack>
  );
}
