/**
 * Validation utilities for the agent system
 */

import type { AgentType, AgentCapabilities } from '../core/types';
import type { SettingsData } from '@shared/types';

/**
 * Validate agent type
 */
export function isValidAgentType(type: string): type is AgentType {
  return ['general', 'code', 'research', 'creative'].includes(type);
}

/**
 * Validate agent capabilities structure
 */
export function validateAgentCapabilities(capabilities: any): capabilities is AgentCapabilities {
  return (
    typeof capabilities === 'object' &&
    typeof capabilities.name === 'string' &&
    typeof capabilities.description === 'string' &&
    typeof capabilities.systemPrompt === 'string' &&
    typeof capabilities.temperature === 'number' &&
    typeof capabilities.maxTokens === 'number' &&
    capabilities.temperature >= 0 &&
    capabilities.temperature <= 2 &&
    capabilities.maxTokens > 0
  );
}

/**
 * Validate settings structure for agent usage
 */
export function validateSettingsForAgents(settings: SettingsData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings) {
    errors.push('Settings object is required');
    return { valid: false, errors };
  }

  if (!Array.isArray(settings.providers)) {
    errors.push('Settings must contain a providers array');
    return { valid: false, errors };
  }

  const enabledProviders = settings.providers.filter(p => p.enabled);
  if (enabledProviders.length === 0) {
    errors.push('At least one enabled provider is required');
  }

  enabledProviders.forEach((provider, index) => {
    if (!provider.api_key) {
      errors.push(`Provider ${index + 1} (${provider.id || 'unknown'}) is missing API key`);
    }
    if (!provider.base_url) {
      errors.push(`Provider ${index + 1} (${provider.id || 'unknown'}) is missing base URL`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input for agent messages
 */
export function sanitizeMessage(message: string): string {
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  
  return message
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .substring(0, 10000); // Limit message length
}

/**
 * Validate message before sending to agent
 */
export function validateMessage(message: string): {
  valid: boolean;
  error?: string;
} {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message must be a non-empty string' };
  }
  
  const sanitized = sanitizeMessage(message);
  if (sanitized.length === 0) {
    return { valid: false, error: 'Message cannot be empty after sanitization' };
  }
  
  if (sanitized.length > 10000) {
    return { valid: false, error: 'Message is too long (max 10,000 characters)' };
  }
  
  return { valid: true };
}
