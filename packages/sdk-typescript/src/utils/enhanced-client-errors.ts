/**
 * Enhanced Client Error Utilities
 * 
 * Provides wrapper functions for SDK operations that automatically enhance
 * error messages with detailed instruction account information.
 */

import { enhanceErrorMessage, debugInstructionCall } from './instruction-error-handler.js';
import type { Address } from '@solana/addresses';

/**
 * Enhanced error class for SDK operations
 */
export class GhostSpeakSDKError extends Error {
  public readonly originalError: Error;
  public readonly operation: string;
  public readonly instructionName?: string;

  constructor(operation: string, originalError: Error, instructionName?: string) {
    const enhancedError = enhanceErrorMessage(originalError, instructionName ?? 'unknown');
    super(enhancedError);
    
    this.name = 'GhostSpeakSDKError';
    this.operation = operation;
    this.originalError = originalError;
    this.instructionName = instructionName;
  }
}

/**
 * Type for account context
 */
export type AccountContext = Address | { address: Address; name?: string };

/**
 * Wrapper for async operations that enhances errors with instruction context
 */
export async function withEnhancedErrors<T>(
  operation: string,
  instructionName: string | undefined,
  fn: () => Promise<T>,
  debugAccounts?: AccountContext[]
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
  debugAccounts?: AccountContext[]
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
  accounts?: AccountContext[]
): Error {
  // Extract common Solana transaction error patterns
  const message = error.message;
  
  // Check for instruction-specific errors
  if (message.includes('custom program error')) {
    const enhancedMessage = `${message}\n\nInstruction: ${instructionName ?? 'unknown'}`;
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
    return new Error(enhanceErrorMessage(error, instructionName ?? 'unknown'));
  }
  
  return error;
}

/**
 * Helper to log detailed error information for debugging
 */
export function logEnhancedError(error: Error, context?: {
  operation?: string;
  instructionName?: string;
  accounts?: AccountContext[];
  params?: Record<string, unknown>;
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
        if (typeof account === 'string') {
          console.error(`  ${index + 1}. ${account}`);
        } else if (typeof account === 'object') {
          const addr = 'address' in account ? account.address : account;
          const name = 'name' in account ? account.name : undefined;
          console.error(`  ${index + 1}. ${addr}${name ? ` (${name})` : ''}`);
        } else {
          console.error(`  ${index + 1}. ${String(account)}`);
        }
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
 * Error context for operations
 */
export interface ErrorContext {
  operation: string;
  instructionName?: string;
  accounts?: AccountContext[];
  params?: Record<string, unknown>;
}

/**
 * Create a detailed error context for operations
 */
export function createErrorContext(
  operation: string,
  instructionName?: string,
  accounts?: AccountContext[],
  params?: Record<string, unknown>
): ErrorContext {
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
      const enhanced = enhanceErrorMessage(error, check.instructionName ?? 'unknown');
      throw new Error(enhanced);
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
    'verify_work_delivery': 'verify_work_delivery',
    'verifyWorkDelivery': 'verify_work_delivery',
    'reject_work_delivery': 'reject_work_delivery',
    'rejectWorkDelivery': 'reject_work_delivery',
    'create_work_order': 'create_work_order',
    'createWorkOrder': 'create_work_order',
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

/**
 * Work order specific error messages
 */
export function getWorkOrderErrorMessage(instructionName: string, accountCount: number): string {
  const errorMessages: Record<string, (count: number) => string> = {
    'verify_work_delivery': (count) => 
      count < 4 
        ? `Work delivery verification requires 4 accounts: workOrder, workDelivery, client, clock. Only ${count} provided.`
        : 'Work delivery verification failed due to invalid account configuration.',
    
    'submit_work_delivery': (count) =>
      count < 5
        ? `Work delivery submission requires 5 accounts: workDelivery, workOrder, provider, clock, systemProgram. Only ${count} provided.`
        : 'Work delivery submission failed due to invalid account configuration.',
    
    'reject_work_delivery': (count) =>
      count < 4
        ? `Work delivery rejection requires 4 accounts: workOrder, workDelivery, client, clock. Only ${count} provided.`
        : 'Work delivery rejection failed due to invalid account configuration.',
    
    'create_work_order': (count) =>
      count < 3
        ? `Work order creation requires at least 3 accounts: workOrder, client, systemProgram. Only ${count} provided.`
        : 'Work order creation failed due to invalid account configuration.'
  };

  const getErrorMessage = errorMessages[instructionName];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (getErrorMessage) {
    return getErrorMessage(accountCount);
  }

  return `Instruction ${instructionName} failed with ${accountCount} accounts provided.`;
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
  extractInstructionName,
  getWorkOrderErrorMessage
};