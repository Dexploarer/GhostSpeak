import type { Signature } from '@solana/kit'
import { 
  GhostSpeakError, 
  ErrorContext, 
  ErrorCategory, 
  ErrorSeverity,
  NetworkError,
  TransactionError,
  AccountNotFoundError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  isRetryableError,
  getRetryDelay,
  createErrorWithContext,
  logError
} from '../errors/index.js'

/**
 * Enhanced error handling utilities with comprehensive retry logic and recovery patterns
 * Integrates with the new comprehensive error system for production-ready error handling
 */

// Re-export main error types for backward compatibility
export { 
  GhostSpeakError,
  NetworkError,
  TransactionError,
  AccountNotFoundError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity
} from '../errors/index.js'

/**
 * Deprecated aliases for backward compatibility
 * @deprecated Use the new error classes from '../errors/index.js'
 */
export class RpcError extends NetworkError {
  constructor(
    message: string,
    public endpoint?: string,
    cause?: Error
  ) {
    super(message, { context: { metadata: { endpoint } }, cause })
    this.name = 'RpcError'
  }
}

export class InstructionError extends ValidationError {
  constructor(
    message: string,
    public instructionIndex?: number,
    cause?: Error
  ) {
    super(message, { 
      field: 'instruction', 
      context: { metadata: { instructionIndex } }, 
      cause 
    })
    this.name = 'InstructionError'
  }
}

/**
 * Enhanced retry configuration with comprehensive settings
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterMax: number
  retryableErrors: string[]
  retryableCategories: ErrorCategory[]
  timeoutPerAttempt: number
  exponentialBackoff: boolean
  onRetry?: (error: Error, attempt: number) => void
  onMaxRetriesReached?: (error: Error) => void
}

/**
 * Default retry configuration optimized for blockchain operations
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterMax: 1000,
  timeoutPerAttempt: 30000,
  exponentialBackoff: true,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_EXCEEDED',
    'CONNECTION_REFUSED',
    'TEMPORARY_FAILURE',
    'TRANSACTION_ERROR' // Some transaction errors are retryable
  ],
  retryableCategories: [
    ErrorCategory.NETWORK,
    ErrorCategory.SYSTEM
  ]
}

/**
 * Configuration for different operation types
 */
export const RETRY_CONFIGS = {
  TRANSACTION: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 3,
    baseDelay: 2000,
    timeoutPerAttempt: 60000 // Longer timeout for transactions
  },
  
  ACCOUNT_FETCH: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 5,
    baseDelay: 500,
    timeoutPerAttempt: 10000
  },
  
  RPC_CALL: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 4,
    baseDelay: 800,
    timeoutPerAttempt: 15000
  }
} as const

/**
 * Retry logic utility
 */
export class RetryHandler {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry if this is the last attempt
        if (attempt === this.config.maxRetries) {
          break
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          throw error
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxDelay
        )
        
        console.warn(
          `Attempt ${attempt + 1} failed${context ? ` for ${context}` : ''}, retrying in ${delay}ms:`,
          error
        )
        
        await this.sleep(delay)
      }
    }
    
    throw new GhostSpeakError(
      `Operation failed after ${this.config.maxRetries + 1} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError
    )
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase()
    
    return this.config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    ) || this.isNetworkError(error)
  }

  /**
   * Check if error is a network-related error
   */
  private isNetworkError(error: Error): boolean {
    const networkIndicators = [
      'fetch',
      'network',
      'connection',
      'timeout',
      'abort',
      'cors',
      'dns'
    ]
    
    const errorString = error.toString().toLowerCase()
    return networkIndicators.some(indicator => errorString.includes(indicator))
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Circuit breaker pattern for handling repeated failures
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 10000 // 10 seconds
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new GhostSpeakError(
          'Circuit breaker is OPEN - too many recent failures',
          'CIRCUIT_BREAKER_OPEN'
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): string {
    return this.state
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0
    this.lastFailureTime = 0
    this.state = 'CLOSED'
  }
}

/**
 * Timeout wrapper utility
 */
export class TimeoutHandler {
  /**
   * Wrap a promise with a timeout
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new GhostSpeakError(errorMessage, 'TIMEOUT'))
        }, timeoutMs)
      })
    ])
  }
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandling(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason)
    // Don't exit the process, but log the error
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    // For uncaught exceptions, we should exit gracefully
    process.exit(1)
  })
}

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  operation: string
  address?: string
  signature?: string
  instruction?: string
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Enhanced error wrapper with context
 */
export function wrapWithErrorContext<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: Omit<ErrorContext, 'timestamp'>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const enhancedError = new GhostSpeakError(
        `${context.operation}: ${(error as Error).message}`,
        'ENHANCED_ERROR',
        error as Error
      )
      
      // Add context to error for debugging
      Object.assign(enhancedError, {
        context: {
          ...context,
          timestamp: Date.now()
        }
      })
      
      throw enhancedError
    }
  }
}