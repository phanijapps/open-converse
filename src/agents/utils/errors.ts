/**
 * Error handling utilities for the agent system
 */

export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public agentType?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ConfigurationError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', undefined, cause);
    this.name = 'ConfigurationError';
  }
}

export class NetworkError extends AgentError {
  constructor(message: string, agentType?: string, cause?: Error) {
    super(message, 'NETWORK_ERROR', agentType, cause);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', undefined, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Create appropriate error type based on error message
   */
  static createError(error: any, agentType?: string): AgentError {
    const message = error instanceof Error ? error.message : String(error);
    
    if (message.includes('API key') || message.includes('configuration') || message.includes('settings')) {
      return new ConfigurationError(message, error instanceof Error ? error : undefined);
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return new NetworkError(message, agentType, error instanceof Error ? error : undefined);
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(message, error instanceof Error ? error : undefined);
    }
    
    return new AgentError(message, 'UNKNOWN_ERROR', agentType, error instanceof Error ? error : undefined);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AgentError): string {
    switch (error.code) {
      case 'CONFIGURATION_ERROR':
        return 'Configuration error: Please check your API settings and try again.';
      case 'NETWORK_ERROR':
        return 'Network error: Please check your internet connection and try again.';
      case 'VALIDATION_ERROR':
        return 'Invalid input: Please check your message and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Log error with context
   */
  static logError(error: AgentError, context?: any): void {
    console.error(`[${error.name}] ${error.message}`, {
      code: error.code,
      agentType: error.agentType,
      context,
      cause: error.cause,
    });
  }
}
