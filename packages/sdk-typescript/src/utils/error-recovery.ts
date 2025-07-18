/**
 * Advanced Error Recovery and Resilience Utilities
 * 
 * Provides comprehensive error recovery patterns including:
 * - Advanced retry strategies with intelligent backoff
 * - Circuit breaker pattern with health monitoring
 * - Error aggregation and batch handling
 * - Resilient operation wrappers
 * - Error monitoring and analytics
 */

import {
  GhostSpeakError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  NetworkError,
  TransactionError,
  TimeoutError,
  RateLimitError,
  isRetryableError,
  createErrorWithContext
} from '../errors/index.js'

/**
 * Advanced retry configuration with intelligent strategies
 */
export interface AdvancedRetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffStrategy: 'exponential' | 'linear' | 'fibonacci' | 'adaptive'
  jitterType: 'none' | 'uniform' | 'proportional' | 'decorrelated'
  jitterMax: number
  circuitBreakerConfig?: CircuitBreakerConfig
  healthCheckConfig?: HealthCheckConfig
  retryableCategories: ErrorCategory[]
  nonRetryableCategories: ErrorCategory[]
  timeoutPerAttempt: number
  onRetry?: (error: Error, attempt: number, delay: number) => void | Promise<void>
  onMaxRetriesReached?: (error: Error, totalAttempts: number) => void | Promise<void>
  onSuccess?: <T>(result: T, totalAttempts: number) => void | Promise<void>
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  timeout: number
  monitoringWindow: number
  failureRateThreshold: number
  slowCallThreshold: number
  slowCallRateThreshold: number
  minimumThroughput: number
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean
  interval: number
  timeout: number
  healthCheckOperation: () => Promise<boolean>
  onHealthRestored?: () => void | Promise<void>
  onHealthDegraded?: () => void | Promise<void>
}

/**
 * Operation metrics for monitoring
 */
export interface OperationMetrics {
  operationId: string
  totalAttempts: number
  successCount: number
  failureCount: number
  averageLatency: number
  lastAttemptTime: number
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  errorDistribution: Record<string, number>
}

/**
 * Default configurations for different operation types
 */
export const RETRY_STRATEGIES = {
  CRITICAL_TRANSACTION: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffStrategy: 'exponential' as const,
    jitterType: 'proportional' as const,
    jitterMax: 2000,
    timeoutPerAttempt: 90000,
    retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.SYSTEM] as ErrorCategory[],
    nonRetryableCategories: [ErrorCategory.VALIDATION, ErrorCategory.AUTHORIZATION] as ErrorCategory[]
  },
  
  ACCOUNT_FETCH: {
    maxRetries: 8,
    baseDelay: 500,
    maxDelay: 10000,
    backoffStrategy: 'fibonacci' as const,
    jitterType: 'uniform' as const,
    jitterMax: 500,
    timeoutPerAttempt: 15000,
    retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.ACCOUNT] as ErrorCategory[],
    nonRetryableCategories: [ErrorCategory.VALIDATION] as ErrorCategory[]
  },
  
  RPC_CALL: {
    maxRetries: 6,
    baseDelay: 1000,
    maxDelay: 20000,
    backoffStrategy: 'adaptive' as const,
    jitterType: 'decorrelated' as const,
    jitterMax: 1000,
    timeoutPerAttempt: 30000,
    retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.SYSTEM] as ErrorCategory[],
    nonRetryableCategories: [ErrorCategory.VALIDATION, ErrorCategory.AUTHORIZATION] as ErrorCategory[]
  }
} as const

/**
 * Advanced circuit breaker with comprehensive failure tracking
 */
export class AdvancedCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private slowCallCount = 0
  private lastFailureTime = 0
  private lastSuccessTime = 0
  private recentCalls: { timestamp: number; success: boolean; duration: number }[] = []
  private metrics: OperationMetrics
  
  constructor(
    private operationId: string,
    private config: CircuitBreakerConfig
  ) {
    this.metrics = {
      operationId,
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      lastAttemptTime: 0,
      circuitBreakerState: 'CLOSED',
      healthStatus: 'HEALTHY',
      errorDistribution: {}
    }
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    this.updateState()
    
    if (this.state === 'OPEN') {
      throw new GhostSpeakError(
        `Circuit breaker is OPEN for operation ${this.operationId}`,
        'CIRCUIT_BREAKER_OPEN',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        {
          context: {
            operation: this.operationId,
            timestamp: Date.now(),
            metadata: {
              circuitBreakerState: this.state,
              failureCount: this.failureCount,
              timeUntilRetry: this.getTimeUntilRetry(),
              metrics: this.metrics
            },
            ...context
          },
          retryable: true,
          userFriendlyMessage: `Service temporarily unavailable. Retrying in ${Math.ceil(this.getTimeUntilRetry() / 1000)} seconds.`
        }
      )
    }

    const startTime = Date.now()
    this.metrics.totalAttempts++
    this.metrics.lastAttemptTime = startTime

    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      this.recordSuccess(duration)
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordFailure(error as Error, duration)
      throw error
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(duration: number): void {
    this.successCount++
    this.metrics.successCount++
    this.lastSuccessTime = Date.now()
    
    // Track slow calls
    if (duration > this.config.slowCallThreshold) {
      this.slowCallCount++
    }
    
    // Add to recent calls
    this.recentCalls.push({
      timestamp: Date.now(),
      success: true,
      duration
    })
    
    this.cleanupOldCalls()
    this.updateMetrics()
    
    // Transition from HALF_OPEN to CLOSED
    if (this.state === 'HALF_OPEN' && this.successCount >= this.config.successThreshold) {
      this.state = 'CLOSED'
      this.failureCount = 0
      this.metrics.circuitBreakerState = 'CLOSED'
      this.metrics.healthStatus = 'HEALTHY'
      
      console.log(`✅ Circuit breaker CLOSED for ${this.operationId} after ${this.successCount} successes`)
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(error: Error, duration: number): void {
    this.failureCount++
    this.metrics.failureCount++
    this.lastFailureTime = Date.now()
    
    // Track error types
    const errorType = error instanceof GhostSpeakError ? error.code : error.constructor.name
    this.metrics.errorDistribution[errorType] = (this.metrics.errorDistribution[errorType] ?? 0) + 1
    
    // Add to recent calls
    this.recentCalls.push({
      timestamp: Date.now(),
      success: false,
      duration
    })
    
    this.cleanupOldCalls()
    this.updateMetrics()
    
    // Check if circuit should open
    if (this.shouldOpenCircuit()) {
      this.state = 'OPEN'
      this.metrics.circuitBreakerState = 'OPEN'
      this.metrics.healthStatus = 'UNHEALTHY'
      
      console.error(`🚨 Circuit breaker OPENED for ${this.operationId}:`, {
        failureCount: this.failureCount,
        failureRate: this.getFailureRate(),
        slowCallRate: this.getSlowCallRate(),
        recentCallCount: this.recentCalls.length
      })
    }
  }

  /**
   * Determine if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    const recentCallCount = this.recentCalls.length
    
    // Need minimum throughput to make decisions
    if (recentCallCount < this.config.minimumThroughput) {
      return false
    }
    
    const failureRate = this.getFailureRate()
    const slowCallRate = this.getSlowCallRate()
    
    return (
      this.failureCount >= this.config.failureThreshold ||
      failureRate >= this.config.failureRateThreshold ||
      slowCallRate >= this.config.slowCallRateThreshold
    )
  }

  /**
   * Update circuit breaker state
   */
  private updateState(): void {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure >= this.config.timeout) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
        this.metrics.circuitBreakerState = 'HALF_OPEN'
        this.metrics.healthStatus = 'DEGRADED'
        
        console.log(`🔄 Circuit breaker HALF_OPEN for ${this.operationId} - testing recovery`)
      }
    }
  }

  /**
   * Get failure rate for recent calls
   */
  private getFailureRate(): number {
    if (this.recentCalls.length === 0) return 0
    
    const failures = this.recentCalls.filter(call => !call.success).length
    return failures / this.recentCalls.length
  }

  /**
   * Get slow call rate for recent calls
   */
  private getSlowCallRate(): number {
    if (this.recentCalls.length === 0) return 0
    
    const slowCalls = this.recentCalls.filter(call => call.duration > this.config.slowCallThreshold).length
    return slowCalls / this.recentCalls.length
  }

  /**
   * Clean up old call records
   */
  private cleanupOldCalls(): void {
    const cutoff = Date.now() - this.config.monitoringWindow
    this.recentCalls = this.recentCalls.filter(call => call.timestamp > cutoff)
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    if (this.recentCalls.length > 0) {
      const totalDuration = this.recentCalls.reduce((sum, call) => sum + call.duration, 0)
      this.metrics.averageLatency = totalDuration / this.recentCalls.length
    }
  }

  /**
   * Get time until circuit breaker allows retry
   */
  private getTimeUntilRetry(): number {
    if (this.state !== 'OPEN') return 0
    
    const elapsed = Date.now() - this.lastFailureTime
    return Math.max(0, this.config.timeout - elapsed)
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): OperationMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.slowCallCount = 0
    this.lastFailureTime = 0
    this.lastSuccessTime = 0
    this.recentCalls = []
    
    this.metrics = {
      ...this.metrics,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      circuitBreakerState: 'CLOSED',
      healthStatus: 'HEALTHY',
      errorDistribution: {}
    }
    
    console.log(`🔄 Circuit breaker RESET for ${this.operationId}`)
  }
}

/**
 * Advanced retry handler with multiple backoff strategies
 */
export class AdvancedRetryHandler {
  private operationMetrics = new Map<string, OperationMetrics>()
  private circuitBreakers = new Map<string, AdvancedCircuitBreaker>()
  
  constructor(private defaultConfig: AdvancedRetryConfig) {}

  /**
   * Execute operation with advanced retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    config?: Partial<AdvancedRetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationId, finalConfig)
    
    let lastError: Error = new Error('No attempts made')
    let attempt = 0
    
    // Initialize metrics
    if (!this.operationMetrics.has(operationId)) {
      this.operationMetrics.set(operationId, {
        operationId,
        totalAttempts: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0,
        lastAttemptTime: 0,
        circuitBreakerState: 'CLOSED',
        healthStatus: 'HEALTHY',
        errorDistribution: {}
      })
    }
    
    for (attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await circuitBreaker.execute(
          async () => this.withTimeout(operation(), finalConfig.timeoutPerAttempt),
          { operation: operationId, metadata: { attempt } }
        )
        
        // Success callback
        finalConfig.onSuccess?.(result, attempt + 1)
        
        // Update metrics
        const metrics = this.operationMetrics.get(operationId)!
        metrics.successCount++
        metrics.lastAttemptTime = Date.now()
        
        return result
        
      } catch (error) {
        lastError = error as Error
        
        // Update metrics
        const metrics = this.operationMetrics.get(operationId)!
        metrics.failureCount++
        metrics.totalAttempts++
        metrics.lastAttemptTime = Date.now()
        
        // Don't retry if this is the last attempt
        if (attempt === finalConfig.maxRetries) {
          finalConfig.onMaxRetriesReached?.(lastError, attempt + 1)
          break
        }
        
        // Check if error is retryable
        if (!this.shouldRetryError(lastError, finalConfig)) {
          throw this.enhanceErrorWithContext(lastError, operationId, attempt, finalConfig)
        }
        
        // Calculate delay
        const delay = this.calculateBackoffDelay(attempt, finalConfig, lastError)
        
        // Retry callback
        await finalConfig.onRetry?.(lastError, attempt + 1, delay)
        
        // Log retry attempt
        this.logRetryAttempt(lastError, attempt + 1, delay, operationId, finalConfig)
        
        await this.sleep(delay)
      }
    }
    
    // All retries exhausted
    throw this.createMaxRetriesError(lastError, operationId, attempt + 1, finalConfig)
  }

  /**
   * Get or create circuit breaker for operation
   */
  private getOrCreateCircuitBreaker(
    operationId: string,
    config: AdvancedRetryConfig
  ): AdvancedCircuitBreaker {
    if (!this.circuitBreakers.has(operationId)) {
      const circuitBreakerConfig: CircuitBreakerConfig = config.circuitBreakerConfig ?? {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        monitoringWindow: 30000,
        failureRateThreshold: 0.5,
        slowCallThreshold: 10000,
        slowCallRateThreshold: 0.8,
        minimumThroughput: 3
      }
      
      this.circuitBreakers.set(
        operationId,
        new AdvancedCircuitBreaker(operationId, circuitBreakerConfig)
      )
    }
    
    return this.circuitBreakers.get(operationId)!
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetryError(error: Error, config: AdvancedRetryConfig): boolean {
    if (error instanceof GhostSpeakError) {
      // Check non-retryable categories first
      if (config.nonRetryableCategories.includes(error.category)) {
        return false
      }
      
      // Check retryable categories
      if (config.retryableCategories.includes(error.category)) {
        return true
      }
      
      // Use error's own retryable flag
      return error.retryable
    }
    
    // Fallback to general retry check
    return isRetryableError(error)
  }

  /**
   * Calculate backoff delay with various strategies
   */
  private calculateBackoffDelay(
    attempt: number,
    config: AdvancedRetryConfig,
    error: Error
  ): number {
    let baseDelay: number
    
    switch (config.backoffStrategy) {
      case 'exponential':
        baseDelay = config.baseDelay * Math.pow(2, attempt)
        break
        
      case 'linear':
        baseDelay = config.baseDelay + (config.baseDelay * attempt)
        break
        
      case 'fibonacci':
        baseDelay = this.fibonacciDelay(attempt, config.baseDelay)
        break
        
      case 'adaptive':
        baseDelay = this.adaptiveDelay(attempt, config, error)
        break
        
      default:
        baseDelay = config.baseDelay * Math.pow(2, attempt)
    }
    
    // Apply jitter
    const jitteredDelay = this.applyJitter(baseDelay, config)
    
    // Ensure within bounds
    return Math.min(Math.max(jitteredDelay, config.baseDelay), config.maxDelay)
  }

  /**
   * Fibonacci-based delay calculation
   */
  private fibonacciDelay(attempt: number, baseDelay: number): number {
    const fib = (n: number): number => {
      if (n <= 1) return 1
      let a = 1, b = 1
      for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b]
      }
      return b
    }
    
    return baseDelay * fib(attempt)
  }

  /**
   * Adaptive delay based on error type and history
   */
  private adaptiveDelay(attempt: number, config: AdvancedRetryConfig, error: Error): number {
    let multiplier = 1
    
    // Adjust based on error type
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000
    }
    
    if (error instanceof NetworkError) {
      multiplier = 0.8 // Faster retry for network issues
    } else if (error instanceof TimeoutError) {
      multiplier = 1.5 // Slower retry for timeouts
    } else if (error instanceof TransactionError) {
      multiplier = 1.2 // Moderate retry for transaction errors
    }
    
    return config.baseDelay * Math.pow(2, attempt) * multiplier
  }

  /**
   * Apply jitter to delay
   */
  private applyJitter(delay: number, config: AdvancedRetryConfig): number {
    switch (config.jitterType) {
      case 'none':
        return delay
        
      case 'uniform':
        return delay + (Math.random() * config.jitterMax)
        
      case 'proportional':
        return delay + (Math.random() * delay * 0.1) // 10% jitter
        
      case 'decorrelated':
        // Decorrelated jitter - helps avoid thundering herd
        return Math.random() * (delay * 3)
        
      default:
        return delay + (Math.random() * config.jitterMax)
    }
  }

  /**
   * Add timeout to operation
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`, {
            timeoutDuration: timeoutMs
          }))
        }, timeoutMs)
      })
    ])
  }

  /**
   * Enhanced error with retry context
   */
  private enhanceErrorWithContext(
    error: Error,
    operationId: string,
    attempt: number,
    config: AdvancedRetryConfig
  ): GhostSpeakError {
    return createErrorWithContext(error, `retry_${operationId}`, {
      attempt: attempt + 1,
      maxRetries: config.maxRetries,
      retryStrategy: config.backoffStrategy,
      circuitBreakerState: this.circuitBreakers.get(operationId)?.getMetrics().circuitBreakerState
    })
  }

  /**
   * Create max retries exceeded error
   */
  private createMaxRetriesError(
    lastError: Error,
    operationId: string,
    totalAttempts: number,
    config: AdvancedRetryConfig
  ): GhostSpeakError {
    return new GhostSpeakError(
      `Operation ${operationId} failed after ${totalAttempts} attempts`,
      'MAX_RETRIES_EXCEEDED',
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      {
        context: {
          operation: operationId,
          timestamp: Date.now(),
          metadata: {
            totalAttempts,
            maxRetries: config.maxRetries,
            lastError: lastError.message,
            strategy: config.backoffStrategy,
            circuitBreakerMetrics: this.circuitBreakers.get(operationId)?.getMetrics()
          }
        },
        cause: lastError,
        retryable: false,
        userFriendlyMessage: 'The operation failed after multiple attempts. Please try again later or contact support.'
      }
    )
  }

  /**
   * Log retry attempt with enhanced information
   */
  private logRetryAttempt(
    error: Error,
    attempt: number,
    delay: number,
    operationId: string,
    config: AdvancedRetryConfig
  ): void {
    const circuitBreaker = this.circuitBreakers.get(operationId)
    const metrics = circuitBreaker?.getMetrics()
    
    console.warn(`⚠️ Retry ${attempt}/${config.maxRetries + 1} for ${operationId}:`, {
      error: error instanceof GhostSpeakError ? error.code : error.constructor.name,
      message: error.message,
      strategy: config.backoffStrategy,
      delay: `${delay}ms`,
      circuitBreakerState: metrics?.circuitBreakerState,
      failureRate: metrics ? (metrics.failureCount / (metrics.successCount + metrics.failureCount)) : 0
    })
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(operationId?: string): OperationMetrics | Map<string, OperationMetrics> {
    if (operationId) {
      return this.operationMetrics.get(operationId) ?? {
        operationId,
        totalAttempts: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0,
        lastAttemptTime: 0,
        circuitBreakerState: 'CLOSED',
        healthStatus: 'HEALTHY',
        errorDistribution: {}
      }
    }
    
    return new Map(this.operationMetrics)
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitBreakerMetrics(operationId?: string): OperationMetrics | Map<string, OperationMetrics> {
    if (operationId) {
      const circuitBreaker = this.circuitBreakers.get(operationId)
      return circuitBreaker ? circuitBreaker.getMetrics() : this.getOperationMetrics(operationId) as OperationMetrics
    }
    
    const allMetrics = new Map<string, OperationMetrics>()
    for (const [id, circuitBreaker] of this.circuitBreakers) {
      allMetrics.set(id, circuitBreaker.getMetrics())
    }
    
    return allMetrics
  }

  /**
   * Reset specific operation or all operations
   */
  reset(operationId?: string): void {
    if (operationId) {
      this.operationMetrics.delete(operationId)
      this.circuitBreakers.get(operationId)?.reset()
    } else {
      this.operationMetrics.clear()
      for (const circuitBreaker of this.circuitBreakers.values()) {
        circuitBreaker.reset()
      }
    }
  }
}

/**
 * Create a resilient operation wrapper with advanced error handling
 */
export function createResilientSDKOperation<TArgs extends unknown[], TResult>(
  operation: (...args: TArgs) => Promise<TResult>,
  operationId: string,
  config: {
    retryStrategy?: keyof typeof RETRY_STRATEGIES
    customRetryConfig?: Partial<AdvancedRetryConfig>
    circuitBreakerConfig?: CircuitBreakerConfig
    healthCheck?: HealthCheckConfig
    errorReporting?: (error: GhostSpeakError, metrics: OperationMetrics) => void
  } = {}
): (...args: TArgs) => Promise<TResult> {
  const {
    retryStrategy = 'RPC_CALL',
    customRetryConfig = {},
    circuitBreakerConfig,
    healthCheck,
    errorReporting
  } = config
  
  const baseConfig = RETRY_STRATEGIES[retryStrategy]
  const finalConfig: AdvancedRetryConfig = {
    ...baseConfig,
    ...customRetryConfig,
    circuitBreakerConfig,
    healthCheckConfig: healthCheck
  }
  
  const retryHandler = new AdvancedRetryHandler(finalConfig)
  
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await retryHandler.executeWithRetry(
        () => operation(...args),
        operationId,
        finalConfig
      )
    } catch (error) {
      const enhancedError = createErrorWithContext(
        error as Error,
        operationId,
        {
          functionArgs: args.length,
          retryStrategy,
          timestamp: Date.now()
        }
      )
      
      // Report error for monitoring
      if (errorReporting) {
        const metrics = retryHandler.getOperationMetrics(operationId) as OperationMetrics
        errorReporting(enhancedError, metrics)
      }
      
      throw enhancedError
    }
  }
}

/**
 * Export default retry handler instance
 */
export const defaultRetryHandler = new AdvancedRetryHandler({
  ...RETRY_STRATEGIES.RPC_CALL,
  onRetry: (error, attempt, delay) => {
    if (error instanceof GhostSpeakError) {
      console.warn(`🔄 Retrying operation: ${error.code} (attempt ${attempt}, delay ${delay}ms)`)
    }
  }
})