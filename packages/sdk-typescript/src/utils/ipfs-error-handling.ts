/**
 * Enhanced error handling and retry logic for IPFS operations in GhostSpeak
 */

import type { IPFSError, IPFSOperationResult } from '../types/ipfs-types.js'

/**
 * IPFS-specific error class with enhanced context
 */
export class IPFSOperationError extends Error {
  constructor(
    public readonly type: IPFSError,
    message: string,
    public readonly provider?: string,
    public readonly retryCount?: number,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'IPFSOperationError'
  }
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryableErrors: IPFSError[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'PROVIDER_ERROR'
  ]
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTime: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTime) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN - too many failures')
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
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }

  reset(): void {
    this.failures = 0
    this.lastFailureTime = 0
    this.state = 'CLOSED'
  }
}

/**
 * Enhanced retry utility with exponential backoff
 */
export class RetryHandler {
  private circuitBreaker: CircuitBreaker

  constructor(
    private readonly config: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.circuitBreaker = new CircuitBreaker()
  }

  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error
      
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const result = await operation()
          
          if (attempt > 0) {
            console.log(`✅ Operation succeeded after ${attempt} retries${context ? ` (${context})` : ''}`)
          }
          
          return result
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          
          if (attempt === this.config.maxRetries) {
            break // Don't delay on the last attempt
          }

          const shouldRetry = this.shouldRetry(lastError, attempt)
          if (!shouldRetry) {
            console.log(`❌ Error not retryable${context ? ` (${context})` : ''}:`, lastError.message)
            break
          }

          const delay = this.calculateDelay(attempt)
          console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.config.maxRetries}${context ? `, ${context}` : ''})`)
          
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      throw new IPFSOperationError(
        this.categorizeError(lastError!),
        `Operation failed after ${this.config.maxRetries + 1} attempts${context ? ` (${context})` : ''}: ${lastError!.message}`,
        undefined,
        this.config.maxRetries
      )
    })
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false
    }

    const errorType = this.categorizeError(error)
    return this.config.retryableErrors.includes(errorType)
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt)
    const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxDelay)
  }

  private categorizeError(error: Error): IPFSError {
    const message = error.message.toLowerCase()
    
    if (message.includes('timeout') ?? message.includes('aborted')) {
      return 'TIMEOUT_ERROR'
    }
    
    if (message.includes('network') ?? message.includes('fetch') ?? message.includes('connection')) {
      return 'NETWORK_ERROR'
    }
    
    if (message.includes('unauthorized') ?? message.includes('forbidden') ?? message.includes('authentication')) {
      return 'AUTHENTICATION_FAILED'
    }
    
    if (message.includes('quota') ?? message.includes('limit') ?? message.includes('exceeded')) {
      return 'QUOTA_EXCEEDED'
    }
    
    if (message.includes('invalid') && message.includes('hash')) {
      return 'INVALID_HASH'
    }
    
    if (message.includes('too large') ?? message.includes('size')) {
      return 'CONTENT_TOO_LARGE'
    }
    
    return 'PROVIDER_ERROR'
  }

  getStats(): {
    circuitBreakerState: ReturnType<CircuitBreaker['getState']>
    config: RetryConfig
  } {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      config: this.config
    }
  }

  reset(): void {
    this.circuitBreaker.reset()
  }
}

/**
 * Fallback handler for graceful degradation
 */
export class FallbackHandler {
  private fallbackStrategies: Map<IPFSError, (error: IPFSOperationError) => Promise<unknown>> = new Map()

  constructor() {
    this.setupDefaultFallbacks()
  }

  private setupDefaultFallbacks(): void {
    // Fallback for upload failures - compress and retry inline storage
    this.fallbackStrategies.set('UPLOAD_FAILED', async (error) => {
      console.log('🔄 Upload failed, attempting inline storage fallback...')
      throw error // Let caller handle inline storage
    })

    // Fallback for retrieval failures - try alternative gateways
    this.fallbackStrategies.set('RETRIEVAL_FAILED', async (error) => {
      console.log('🔄 Retrieval failed, trying alternative gateways...')
      throw error // Let caller try alternative gateways
    })

    // Fallback for quota exceeded - suggest cleanup or alternative storage
    this.fallbackStrategies.set('QUOTA_EXCEEDED', async (error) => {
      console.warn('⚠️ IPFS quota exceeded - consider upgrading plan or cleaning up old content')
      throw error
    })
  }

  async handleError<T>(error: IPFSOperationError, fallbackValue?: T): Promise<T> {
    const strategy = this.fallbackStrategies.get(error.type)
    
    if (strategy) {
      try {
        const result = await strategy(error)
        return result as T
      } catch (_fallbackError) {
        console.warn('Fallback strategy also failed:', _fallbackError instanceof Error ? _fallbackError.message : String(_fallbackError))
      }
    }

    if (fallbackValue !== undefined) {
      console.log('Using provided fallback value')
      return fallbackValue
    }

    throw error
  }

  registerFallback<T>(errorType: IPFSError, strategy: (error: IPFSOperationError) => Promise<T>): void {
    this.fallbackStrategies.set(errorType, strategy)
  }
}

/**
 * Comprehensive error handler that combines retry logic with fallback strategies
 */
export class IPFSErrorHandler {
  private retryHandler: RetryHandler
  private fallbackHandler: FallbackHandler

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryHandler = new RetryHandler({ ...DEFAULT_RETRY_CONFIG, ...retryConfig })
    this.fallbackHandler = new FallbackHandler()
  }

  async executeWithErrorHandling<T>(
    operation: () => Promise<IPFSOperationResult<T>>,
    context?: string,
    fallbackValue?: T
  ): Promise<IPFSOperationResult<T>> {
    try {
      const result = await this.retryHandler.execute(async () => {
        const opResult = await operation()
        
        if (!opResult.success && opResult.error) {
          throw new IPFSOperationError(
            opResult.error,
            opResult.message ?? `IPFS operation failed: ${opResult.error}`
          )
        }
        
        return opResult
      }, context)

      return result
    } catch (error) {
      const ipfsError = error instanceof IPFSOperationError 
        ? error 
        : new IPFSOperationError('PROVIDER_ERROR', error instanceof Error ? error.message : String(error))

      try {
        const fallbackResult = await this.fallbackHandler.handleError(ipfsError, fallbackValue)
        return {
          success: true,
          data: fallbackResult,
          message: 'Operation succeeded using fallback strategy'
        }
      } catch {
        return {
          success: false,
          error: ipfsError.type,
          message: ipfsError.message,
          duration: 0
        }
      }
    }
  }

  /**
   * Register a custom fallback strategy
   */
  registerFallback<T>(errorType: IPFSError, strategy: (error: IPFSOperationError) => Promise<T>): void {
    this.fallbackHandler.registerFallback(errorType, strategy)
  }

  /**
   * Get error handler statistics
   */
  getStats(): {
    retryStats: ReturnType<RetryHandler['getStats']>
    registeredFallbacks: IPFSError[]
  } {
    return {
      retryStats: this.retryHandler.getStats(),
      registeredFallbacks: Array.from(this.fallbackHandler['fallbackStrategies'].keys())
    }
  }

  /**
   * Reset all error handling state
   */
  reset(): void {
    this.retryHandler.reset()
  }
}

/**
 * Utility function to create a configured error handler
 */
export function createIPFSErrorHandler(config?: {
  retryConfig?: Partial<RetryConfig>
  customFallbacks?: {
    errorType: IPFSError
    strategy: (error: IPFSOperationError) => Promise<unknown>
  }[]
}): IPFSErrorHandler {
  const handler = new IPFSErrorHandler(config?.retryConfig)
  
  if (config?.customFallbacks) {
    for (const { errorType, strategy } of config.customFallbacks) {
      handler.registerFallback(errorType, strategy)
    }
  }
  
  return handler
}

/**
 * Type guard to check if an error is an IPFS error
 */
export function isIPFSError(error: unknown): error is IPFSOperationError {
  return error instanceof IPFSOperationError
}

/**
 * Helper function to wrap any IPFS operation with error handling
 */
export async function withIPFSErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  errorHandler?: IPFSErrorHandler
): Promise<IPFSOperationResult<T>> {
  const handler = errorHandler ?? new IPFSErrorHandler()
  
  return handler.executeWithErrorHandling(
    async () => {
      try {
        const result = await operation()
        return { success: true, data: result }
      } catch (error) {
        const ipfsError = error instanceof IPFSOperationError 
          ? error.type 
          : 'PROVIDER_ERROR' as IPFSError
          
        return {
          success: false,
          error: ipfsError,
          message: error instanceof Error ? error.message : String(error)
        }
      }
    },
    context
  )
}