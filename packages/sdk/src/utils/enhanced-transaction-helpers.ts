/**
 * Enhanced Transaction Helpers with Retry Logic and Circuit Breakers
 * Production-ready transaction handling for Solana blockchain
 */

import type { Address } from '@solana/addresses';
import type { Rpc } from '@solana/rpc';
import type { TransactionSigner } from '@solana/signers';

/**
 * Retry configuration for transaction operations
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor to prevent thundering herd (0-1) */
  jitterFactor: number;
}

/**
 * Default retry configuration for different operation types
 */
export const DEFAULT_RETRY_CONFIGS = {
  /** For critical transactions that must succeed */
  CRITICAL: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,
  
  /** For standard transactions */
  STANDARD: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,
  
  /** For non-critical read operations */
  READ_ONLY: {
    maxAttempts: 2,
    initialDelayMs: 250,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,
} as const;

/**
 * Circuit breaker state
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit */
  successThreshold: number;
  /** Timeout in milliseconds before trying to close circuit */
  timeoutMs: number;
  /** Window size for failure counting */
  windowSizeMs: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 60000, // 1 minute
  windowSizeMs: 300000, // 5 minutes
};

/**
 * Circuit breaker implementation for network resilience
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private failureWindow: number[] = [];
  
  constructor(private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {}
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.timeoutMs) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.successes++;
    
    if (this.state === 'HALF_OPEN' && this.successes >= this.config.successThreshold) {
      this.state = 'CLOSED';
      this.failures = 0;
      this.failureWindow = [];
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.failureWindow.push(this.lastFailureTime);
    
    // Remove failures outside the window
    const cutoff = this.lastFailureTime - this.config.windowSizeMs;
    this.failureWindow = this.failureWindow.filter(time => time > cutoff);
    
    if (this.failureWindow.length >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.successes = 0;
    }
  }
  
  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.failureWindow = [];
  }
}

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Enhanced error with classification
 */
export class EnhancedTransactionError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly retryable: boolean,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'EnhancedTransactionError';
  }
}

/**
 * Classify error type for retry logic
 */
export function classifyError(error: Error): EnhancedTransactionError {
  const message = error.message.toLowerCase();
  
  // Network errors (retryable)
  if (message.includes('network') || message.includes('connection') || 
      message.includes('timeout') || message.includes('econnreset')) {
    return new EnhancedTransactionError(
      error.message,
      ErrorType.NETWORK,
      true,
      error
    );
  }
  
  // Rate limiting (retryable with delay)
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return new EnhancedTransactionError(
      error.message,
      ErrorType.RATE_LIMIT,
      true,
      error
    );
  }
  
  // Insufficient funds (not retryable)
  if (message.includes('insufficient') || message.includes('funds')) {
    return new EnhancedTransactionError(
      error.message,
      ErrorType.INSUFFICIENT_FUNDS,
      false,
      error
    );
  }
  
  // Invalid transaction (not retryable)
  if (message.includes('invalid') || message.includes('malformed')) {
    return new EnhancedTransactionError(
      error.message,
      ErrorType.INVALID_TRANSACTION,
      false,
      error
    );
  }
  
  // Program errors (sometimes retryable)
  if (message.includes('program error') || message.includes('custom program error')) {
    return new EnhancedTransactionError(
      error.message,
      ErrorType.PROGRAM_ERROR,
      false, // Conservative: don't retry program errors
      error
    );
  }
  
  // Default to unknown, retryable
  return new EnhancedTransactionError(
    error.message,
    ErrorType.UNKNOWN,
    true,
    error
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );
  
  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * config.jitterFactor * Math.random();
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIGS.STANDARD,
  operationName = 'Operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const enhancedError = classifyError(error instanceof Error ? error : new Error(String(error)));
      lastError = enhancedError;
      
      // Don't retry if error is not retryable
      if (!enhancedError.retryable) {
        throw enhancedError;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      const delay = calculateDelay(attempt, config);
      console.warn(
        `${operationName} failed (attempt ${attempt}/${config.maxAttempts}): ${enhancedError.message}. Retrying in ${delay}ms...`
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`${operationName} failed after ${config.maxAttempts} attempts. Last error: ${lastError.message}`);
}

/**
 * Enhanced transaction sender with all resilience features
 */
export class ResilientTransactionSender {
  private circuitBreaker: CircuitBreaker;
  
  constructor(
    private rpc: Rpc<any>,
    circuitBreakerConfig?: CircuitBreakerConfig
  ) {
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
  }
  
  /**
   * Send transaction with full resilience features
   */
  async sendTransaction<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIGS.STANDARD,
    operationName = 'Transaction'
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return withRetry(operation, retryConfig, operationName);
    });
  }
  
  /**
   * Send and confirm transaction with enhanced error handling
   */
  async sendAndConfirmTransaction(
    transaction: any,
    signers: TransactionSigner[],
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIGS.CRITICAL
  ): Promise<string> {
    return this.sendTransaction(async () => {
      // Send transaction
      const signature = await this.rpc.sendTransaction(transaction, {
        signers,
        skipPreflight: false,
      }).send();
      
      // Confirm transaction
      const confirmation = await this.rpc.confirmTransaction(signature, {
        commitment: 'confirmed',
      }).send();
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return signature;
    }, retryConfig, 'SendAndConfirmTransaction');
  }
  
  /**
   * Get account info with retry
   */
  async getAccountInfo(
    address: Address,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIGS.READ_ONLY
  ): Promise<any> {
    return this.sendTransaction(async () => {
      const accountInfo = await this.rpc.getAccountInfo(address, {
        commitment: 'confirmed',
        encoding: 'base64',
      }).send();
      
      return accountInfo.value;
    }, retryConfig, 'GetAccountInfo');
  }
  
  /**
   * Get multiple accounts with retry
   */
  async getMultipleAccounts(
    addresses: Address[],
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIGS.READ_ONLY
  ): Promise<any[]> {
    return this.sendTransaction(async () => {
      const accounts = await this.rpc.getMultipleAccounts(addresses, {
        commitment: 'confirmed',
        encoding: 'base64',
      }).send();
      
      return accounts.value;
    }, retryConfig, 'GetMultipleAccounts');
  }
  
  /**
   * Reset circuit breaker (for testing or recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
  
  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}

/**
 * Global instance for convenience (can be overridden)
 */
let globalTransactionSender: ResilientTransactionSender | null = null;

/**
 * Initialize global transaction sender
 */
export function initializeGlobalTransactionSender(
  rpc: Rpc<any>,
  circuitBreakerConfig?: CircuitBreakerConfig
): void {
  globalTransactionSender = new ResilientTransactionSender(rpc, circuitBreakerConfig);
}

/**
 * Get global transaction sender (must be initialized first)
 */
export function getGlobalTransactionSender(): ResilientTransactionSender {
  if (!globalTransactionSender) {
    throw new Error('Global transaction sender not initialized. Call initializeGlobalTransactionSender() first.');
  }
  return globalTransactionSender;
}

/**
 * Utility functions for common operations
 */
export const TransactionUtils = {
  /**
   * Check if transaction is likely to succeed based on simulation
   */
  async simulateTransaction(rpc: Rpc<any>, transaction: any): Promise<boolean> {
    try {
      const simulation = await rpc.simulateTransaction(transaction, {
        commitment: 'processed',
        sigVerify: false,
      }).send();
      
      return simulation.value.err === null;
    } catch {
      return false;
    }
  },
  
  /**
   * Estimate transaction fee
   */
  async estimateFee(rpc: Rpc<any>, transaction: any): Promise<bigint> {
    try {
      const feeCalculation = await rpc.getFeeForMessage(transaction.message, {
        commitment: 'processed',
      }).send();
      
      return BigInt(feeCalculation.value || 0);
    } catch {
      return 5000n; // Default fallback fee
    }
  },
  
  /**
   * Wait for transaction confirmation with timeout
   */
  async waitForConfirmation(
    rpc: Rpc<any>, 
    signature: string, 
    timeoutMs = 60000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await rpc.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        }).send();
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          return status.value.err === null;
        }
      } catch {
        // Ignore errors and continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  },
};

// Export types and utilities
export type { RetryConfig, CircuitBreakerConfig };