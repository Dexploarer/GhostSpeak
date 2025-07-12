/**
 * Timeout utilities for async operations
 */

import { logger } from './logger.js';

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout and optional warning
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - Operation name for error messages
 * @param options - Additional options for timeout behavior
 * @returns The result of the promise or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'Operation',
  options?: {
    warningThreshold?: number;  // Show warning after this percentage of timeout
    onWarning?: () => void;     // Callback when warning threshold is reached
  }
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  let warningId: NodeJS.Timeout | undefined;
  
  // Set up warning if threshold is provided
  if (options?.warningThreshold && options.warningThreshold > 0 && options.warningThreshold < 100) {
    const warningMs = Math.floor(timeoutMs * (options.warningThreshold / 100));
    warningId = setTimeout(() => {
      logger.general.warn(`⏱️  ${operation} is taking longer than expected (${warningMs / 1000}s elapsed)`);
      logger.general.warn('This operation will timeout in ' + Math.round((timeoutMs - warningMs) / 1000) + ' seconds');
      if (options.onWarning) {
        options.onWarning();
      }
    }, warningMs);
  }
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(
        `${operation} timed out after ${timeoutMs}ms`,
        timeoutMs
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    clearTimeout(warningId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    clearTimeout(warningId);
    throw error;
  }
}

/**
 * Get timeout value from environment or use default
 */
function getTimeout(envVar: string, defaultMs: number): number {
  const envValue = process.env[envVar];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      logger.general.debug(`Using custom timeout for ${envVar}: ${parsed}ms`);
      return parsed;
    }
  }
  return defaultMs;
}

/**
 * Default timeout values for different operations
 * Can be overridden via environment variables
 */
export const TIMEOUTS = {
  CHANNEL_CREATE: getTimeout('GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT', 30000),      // 30 seconds for channel creation
  TRANSACTION_SEND: getTimeout('GHOSTSPEAK_TRANSACTION_TIMEOUT', 20000),       // 20 seconds for sending transactions
  ACCOUNT_FETCH: getTimeout('GHOSTSPEAK_ACCOUNT_FETCH_TIMEOUT', 10000),        // 10 seconds for fetching accounts
  RPC_CALL: getTimeout('GHOSTSPEAK_RPC_CALL_TIMEOUT', 15000),                 // 15 seconds for general RPC calls
  SDK_INIT: getTimeout('GHOSTSPEAK_SDK_INIT_TIMEOUT', 5000),                  // 5 seconds for SDK initialization
  AGENT_REGISTER: getTimeout('GHOSTSPEAK_AGENT_REGISTER_TIMEOUT', 30000),      // 30 seconds for agent registration
  INTERACTIVE_PROMPT: getTimeout('GHOSTSPEAK_PROMPT_TIMEOUT', 120000),         // 2 minutes for user prompts
} as const;

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 1.5,
  shouldRetry: (error: unknown) => {
    // Retry on network errors and timeouts
    if (error instanceof TimeoutError) return true;
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
      );
    }
    return false;
  },
};

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | unknown;
  let delay = mergedConfig.delayMs;

  for (let attempt = 1; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      logger.general.debug(`Attempting ${operationName} (attempt ${attempt}/${mergedConfig.maxRetries})`);
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === mergedConfig.maxRetries) {
        logger.general.error(`${operationName} failed after ${attempt} attempts:`, error);
        break;
      }

      if (mergedConfig.shouldRetry && !mergedConfig.shouldRetry(error)) {
        logger.general.debug(`${operationName} error is not retryable:`, error);
        break;
      }

      logger.general.warn(
        `${operationName} failed (attempt ${attempt}/${mergedConfig.maxRetries}), ` +
        `retrying in ${delay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Apply backoff multiplier
      if (mergedConfig.backoffMultiplier) {
        delay = Math.floor(delay * mergedConfig.backoffMultiplier);
      }
    }
  }

  throw lastError;
}

/**
 * Combines timeout and retry logic with enhanced user feedback
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = TIMEOUTS.RPC_CALL,
  retryConfig?: Partial<RetryConfig>,
  options?: {
    showRetryHint?: boolean;  // Show hint about retry attempts
    warningThreshold?: number; // Percentage of timeout before warning
  }
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  if (options?.showRetryHint && config.maxRetries > 1) {
    logger.general.debug(`${operationName} will retry up to ${config.maxRetries} times if needed`);
  }
  
  return retryWithBackoff(
    () => withTimeout(
      operation(), 
      timeoutMs, 
      operationName,
      {
        warningThreshold: options?.warningThreshold || 70,  // Default to 70% warning
        onWarning: () => {
          if (config.maxRetries > 1) {
            logger.general.info('💡 If this operation times out, it will automatically retry');
          }
        }
      }
    ),
    operationName,
    config
  );
}