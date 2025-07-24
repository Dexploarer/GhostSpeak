/**
 * Enhanced Client Error Utilities
 * 
 * Provides wrapper functions for SDK operations that automatically enhance
 * error messages with detailed instruction account information.
 */

import { enhanceErrorMessage, debugInstructionCall } from './instruction-error-handler.js';

/**
 * Enhanced error class for SDK operations
 */
export class GhostSpeakSDKError extends Error {
  public readonly originalError: Error;
  public readonly operation: string;
  public readonly instructionName?: string;

  constructor(operation: string, originalError: Error, instructionName?: string) {
    const enhancedError = enhanceErrorMessage(originalError, instructionName);
    super(enhancedError.message);
    
    this.name = 'GhostSpeakSDKError';
    this.operation = operation;
    this.originalError = originalError;
    this.instructionName = instructionName;
  }
}

/**
 * Wrapper for async operations that enhances errors with instruction context
 */
export async function withEnhancedErrors<T>(
  operation: string,
  instructionName: string | undefined,
  fn: () => Promise<T>,
  debugAccounts?: any[]
): Promise<T> {
  try {
    if (debugAccounts && instructionName) {
      debugInstructionCall(instructionName, debugAccounts);
    }
    
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      throw new GhostSpeakSDKError(operation, error, instructionName);
    }
    throw error;
  }
}

/**
 * Wrapper for synchronous operations that enhances errors with instruction context
 */
export function withEnhancedErrorsSync<T>(
  operation: string,
  instructionName: string | undefined,
  fn: () => T,
  debugAccounts?: any[]
): T {
  try {
    if (debugAccounts && instructionName) {
      debugInstructionCall(instructionName, debugAccounts);
    }
    
    return fn();
  } catch (error) {
    if (error instanceof Error) {
      throw new GhostSpeakSDKError(operation, error, instructionName);
    }
    throw error;
  }
}

/**
 * Parse and enhance transaction errors with instruction context
 */
export function enhanceTransactionError(
  error: Error,
  instructionName?: string,
  accounts?: any[]
): Error {
  // Extract common Solana transaction error patterns
  const message = error.message;
  
  // Check for instruction-specific errors
  if (message.includes('custom program error')) {
    const enhancedMessage = `${message}\n\nInstruction: ${instructionName || 'unknown'}`;
    if (accounts && instructionName) {
      const debugInfo = `\nAccounts provided: ${accounts.length}`;
      return new Error(enhancedMessage + debugInfo);
    }
    return new Error(enhancedMessage);
  }
  
  // Check for account-related errors
  if (message.includes('insufficient') || 
      message.includes('account') ||
      message.includes('signer') ||
      message.includes('writable')) {
    return enhanceErrorMessage(error, instructionName);
  }
  
  return error;
}

/**
 * Helper to log detailed error information for debugging
 */
export function logEnhancedError(error: Error, context?: {
  operation?: string;
  instructionName?: string;
  accounts?: any[];
  params?: Record<string, any>;
}): void {
  console.error('🚨 GhostSpeak SDK Error:', error.message);
  
  if (context) {
    if (context.operation) {
      console.error('🔧 Operation:', context.operation);
    }
    
    if (context.instructionName) {
      console.error('📋 Instruction:', context.instructionName);
    }
    
    if (context.accounts) {
      console.error('🏦 Accounts provided:', context.accounts.length);
      context.accounts.forEach((account, index) => {
        console.error(`  ${index + 1}. ${account?.toString?.() || account}`);
      });
    }
    
    if (context.params) {
      console.error('⚙️ Parameters:', context.params);
    }
  }
  
  // Add helpful suggestions
  console.error('\n💡 Troubleshooting tips:');
  console.error('  1. Check that all required accounts are provided');
  console.error('  2. Verify account addresses are correct');
  console.error('  3. Ensure signers have sufficient SOL for transaction fees');
  console.error('  4. Confirm the program is deployed on the target network');
}

/**
 * Create a detailed error context for operations
 */
export function createErrorContext(
  operation: string,
  instructionName?: string,
  accounts?: any[],
  params?: Record<string, any>
): {
  operation: string;
  instructionName?: string;
  accounts?: any[];
  params?: Record<string, any>;
} {
  return {
    operation,
    instructionName,
    accounts,
    params
  };
}

/**
 * Validate common preconditions and throw enhanced errors
 */
export function validatePreconditions(checks: {
  condition: boolean;
  message: string;
  instructionName?: string;
}[]): void {
  for (const check of checks) {
    if (!check.condition) {
      const error = new Error(check.message);
      throw enhanceErrorMessage(error, check.instructionName);
    }
  }
}

/**
 * Helper to extract instruction name from operation context
 */
export function extractInstructionName(operation: string): string | undefined {
  // Common mapping of operations to instruction names
  const operationToInstruction: Record<string, string> = {
    'register_agent': 'register_agent',
    'registerAgent': 'register_agent',
    'activate_agent': 'activate_agent',
    'activateAgent': 'activate_agent',
    'update_agent': 'update_agent',
    'updateAgent': 'update_agent',
    'create_service_listing': 'create_service_listing',
    'createServiceListing': 'create_service_listing',
    'create_escrow': 'create_escrow',
    'createEscrow': 'create_escrow',
    'complete_escrow': 'complete_escrow',
    'completeEscrow': 'complete_escrow',
    'create_job_posting': 'create_job_posting',
    'createJobPosting': 'create_job_posting',
    'apply_to_job': 'apply_to_job',
    'applyToJob': 'apply_to_job',
    'submit_work_delivery': 'submit_work_delivery',
    'submitWorkDelivery': 'submit_work_delivery',
    'create_channel': 'create_channel',
    'createChannel': 'create_channel',
    'send_message': 'send_message',
    'sendMessage': 'send_message',
    'file_dispute': 'file_dispute',
    'fileDispute': 'file_dispute',
    'resolve_dispute': 'resolve_dispute',
    'resolveDispute': 'resolve_dispute'
  };
  
  return operationToInstruction[operation];
}

// Export all utilities
export default {
  GhostSpeakSDKError,
  withEnhancedErrors,
  withEnhancedErrorsSync,
  enhanceTransactionError,
  logEnhancedError,
  createErrorContext,
  validatePreconditions,
  extractInstructionName
};