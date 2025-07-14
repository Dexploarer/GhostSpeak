import type { Signature } from '@solana/kit'

/**
 * Custom error types for GhostSpeak SDK
 */
export class GhostSpeakError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'GhostSpeakError'
  }
}

export class TransactionError extends GhostSpeakError {
  constructor(
    message: string,
    public signature?: Signature,
    cause?: Error
  ) {
    super(message, 'TRANSACTION_ERROR', cause)
    this.name = 'TransactionError'
  }
}

export class AccountNotFoundError extends GhostSpeakError {
  constructor(
    message: string,
    public address: string,
    cause?: Error
  ) {
    super(message, 'ACCOUNT_NOT_FOUND', cause)
    this.name = 'AccountNotFoundError'
  }
}

export class RpcError extends GhostSpeakError {
  constructor(
    message: string,
    public endpoint?: string,
    cause?: Error
  ) {
    super(message, 'RPC_ERROR', cause)
    this.name = 'RpcError'
  }
}

export class InstructionError extends GhostSpeakError {
  constructor(
    message: string,
    public instructionIndex?: number,
    cause?: Error
  ) {
    super(message, 'INSTRUCTION_ERROR', cause)
    this.name = 'InstructionError'
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'CONNECTION_REFUSED',
    'RATE_LIMITED',
    'TEMPORARY_FAILURE'
  ]
}

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