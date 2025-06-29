import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Portal,
} from '@chakra-ui/react';
import { Settings, Sliders, Database } from 'lucide-react';
import { useRouter } from 'next/router';

interface SettingsDropdownProps {
  /** Whether the parent sidebar is collapsed */
  isCollapsed?: boolean;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ isCollapsed = false }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePreferencesClick = () => {
    router.push('/settings');
    setIsOpen(false);
  };

  const handleAdvancedClick = () => {
    router.push('/settings/advanced');
    setIsOpen(false);
  };

  const getButtonPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: isCollapsed ? rect.right + 8 : rect.left,
    };
  };

  return (
    <Box position="relative">
      <IconButton
        ref={buttonRef}
        aria-label="Settings"
        h="50px"
        w="50px"
        borderRadius="25px"
        bg="#D1E6FF"
        color="#51A1FF"
        onClick={() => setIsOpen(!isOpen)}
        _hover={{
          bg: "#C1D6FF",
          transform: 'translateY(-1px)',
        }}
        _active={{
          transform: 'translateY(0)',
        }}
        transition="all 0.2s ease"
      >
        <Settings size={18} strokeWidth={1.5} />
      </IconButton>

      {isOpen && (
        <Portal>
          <Box
            ref={menuRef}
            position="fixed"
            top={`${getButtonPosition().top}px`}
            left={`${getButtonPosition().left}px`}
            zIndex={1000}
            bg="white"
            borderRadius="12px"
            boxShadow="0 4px 24px rgba(0, 0, 0, 0.1)"
            border="1px solid"
            borderColor="gray.200"
            minW="200px"
            py={2}
          >
            <VStack gap={0} align="stretch">
              <Box
                px={4}
                py={3}
                cursor="pointer"
                onClick={handlePreferencesClick}
                _hover={{
                  bg: "gray.50",
                }}
                transition="background-color 0.2s ease"
              >
                <HStack gap={3}>
                  <Box
                    p={2}
                    bg="#F7FAFC"
                    borderRadius="8px"
                    color="#51A1FF"
                  >
                    <Sliders size={16} strokeWidth={1.5} />
                  </Box>
                  <VStack align="start" gap={0}>
                    <Text fontSize="14px" fontWeight="500" color="gray.800">
                      Preferences
                    </Text>
                    <Text fontSize="12px" color="gray.500">
                      LLM providers & memory settings
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              <Box
                px={4}
                py={3}
                cursor="pointer"
                onClick={handleAdvancedClick}
                _hover={{
                  bg: "gray.50",
                }}
                transition="background-color 0.2s ease"
              >
                <HStack gap={3}>
                  <Box
                    p={2}
                    bg="#F7FAFC"
                    borderRadius="8px"
                    color="#51A1FF"
                  >
                    <Database size={16} strokeWidth={1.5} />
                  </Box>
                  <VStack align="start" gap={0}>
                    <Text fontSize="14px" fontWeight="500" color="gray.800">
                      Advanced
                    </Text>
                    <Text fontSize="12px" color="gray.500">
                      Database management & debugging
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          </Box>
        </Portal>
      )}
    </Box>
  );
};

export default SettingsDropdown;
