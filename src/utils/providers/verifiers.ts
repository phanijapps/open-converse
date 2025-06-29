// API Key verification system with modular verifiers
// NOTE: These are DUMMY verification functions for demonstration
// In production, replace with real API calls to verify keys

import type { LLMProviderTemplate, VerificationStatus } from './registry';

export interface VerificationResult {
  status: VerificationStatus;
  success: boolean;
  error?: string;
  details?: {
    modelCount?: number;
    organizationId?: string;
    rateLimits?: any;
  };
}

// Dummy verification functions - easily replaceable with real API calls
export const verifyOpenAI = async (apiKey: string): Promise<VerificationResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Basic pattern check
  if (!apiKey.startsWith('sk-') || apiKey.length < 50) {
    return {
      status: 'error',
      success: false,
      error: 'Invalid API key format. OpenAI keys start with "sk-" and are 51+ characters.'
    };
  }
  
  // For demo purposes, always succeed with valid format
  return {
    status: 'verified',
    success: true,
    details: {
      modelCount: 12,
      organizationId: 'org-' + Math.random().toString(36).substr(2, 8)
    }
  };
};

export const verifyOpenRouter = async (apiKey: string): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));
  
  if (!apiKey.startsWith('sk-or-')) {
    return {
      status: 'error',
      success: false,
      error: 'Invalid API key format. OpenRouter keys start with "sk-or-".'
    };
  }
  
  // For demo purposes, always succeed with valid format
  return {
    status: 'verified',
    success: true,
    details: { modelCount: 85 }
  };
};

export const verifyOllama = async (baseUrl: string): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For Ollama, always succeed since it doesn't require auth
  return {
    status: 'verified',
    success: true,
    details: { modelCount: 5 }
  };
};

export const verifyGemini = async (apiKey: string): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  if (apiKey.length !== 39) {
    return {
      status: 'error',
      success: false,
      error: 'Invalid API key format. Gemini keys are 39 characters long.'
    };
  }
  
  // For demo purposes, always succeed with valid format
  return {
    status: 'verified',
    success: true,
    details: { modelCount: 3 }
  };
};

export const verifyAnthropic = async (apiKey: string): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 900));
  
  if (!apiKey.startsWith('sk-ant-')) {
    return {
      status: 'error',
      success: false,
      error: 'Invalid API key format. Anthropic keys start with "sk-ant-".'
    };
  }
  
  // For demo purposes, always succeed with valid format  
  return {
    status: 'verified',
    success: true,
    details: { modelCount: 4 }
  };
};

// Provider verification registry
export const VERIFICATION_REGISTRY: Record<string, (apiKey: string, baseUrl?: string) => Promise<VerificationResult>> = {
  openai: verifyOpenAI,
  openrouter: verifyOpenRouter,
  ollama: (_, baseUrl) => verifyOllama(baseUrl || 'http://localhost:11434'),
  gemini: verifyGemini,
  anthropic: verifyAnthropic,
};

// Main verification function
export const verifyProvider = async (
  providerId: string, 
  apiKey: string, 
  baseUrl?: string
): Promise<VerificationResult> => {
  const verifier = VERIFICATION_REGISTRY[providerId];
  
  if (!verifier) {
    return {
      status: 'error',
      success: false,
      error: `No verifier found for provider: ${providerId}`
    };
  }
  
  try {
    return await verifier(apiKey, baseUrl);
  } catch (error) {
    return {
      status: 'error',
      success: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
