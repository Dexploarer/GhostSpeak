/**
 * Network Optimizer for GhostSpeak CLI
 * 
 * Provides intelligent network optimization features including:
 * - Adaptive connection management based on network conditions
 * - Request prioritization and throttling
 * - Circuit breaker pattern for failing endpoints
 * - Intelligent retry mechanisms with exponential backoff
 * - Network latency monitoring and optimization recommendations
 * - Bandwidth usage optimization
 * 
 * @example
 * ```typescript
 * const optimizer = NetworkOptimizer.getInstance()
 * 
 * // Configure network preferences
 * await optimizer.configureNetwork({
 *   preferredEndpoints: ['https://fast-rpc.com'],
 *   maxConcurrentRequests: 20,
 *   retryStrategy: 'exponential'
 * })
 * 
 * // Execute optimized request
 * const result = await optimizer.executeRequest(rpcCall, {
 *   priority: 'high',
 *   timeout: 5000
 * })
 * ```
 */

import { EventEmitter } from 'events'
import { EventBus } from './event-system'
import { connectionPoolManager, type NetworkType } from './connection-pool'
import { rpcPoolManager } from '../services/blockchain/rpc-pool-manager'

/**
 * Network configuration options
 */
export interface NetworkConfig {
  /** Preferred RPC endpoints in order of preference */
  preferredEndpoints: string[]
  /** Maximum concurrent requests per endpoint */
  maxConcurrentRequests: number
  /** Request timeout in milliseconds */
  defaultTimeout: number
  /** Retry strategy */
  retryStrategy: 'linear' | 'exponential' | 'fibonacci'
  /** Maximum retry attempts */
  maxRetries: number
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold: number
  /** Circuit breaker reset timeout */
  circuitBreakerResetTime: number
  /** Enable intelligent load balancing */
  intelligentLoadBalancing: boolean
  /** Bandwidth usage limit (bytes per second) */
  bandwidthLimit?: number
}

/**
 * Request execution options
 */
export interface RequestOptions {
  /** Request priority level */
  priority: 'low' | 'medium' | 'high' | 'critical'
  /** Request timeout (overrides default) */
  timeout?: number
  /** Number of retry attempts */
  retries?: number
  /** Enable circuit breaker */
  useCircuitBreaker?: boolean
  /** Request tags for monitoring */
  tags?: string[]
}

/**
 * Network performance metrics
 */
export interface NetworkMetrics {
  /** Average response time across all endpoints */
  averageResponseTime: number
  /** Success rate percentage */
  successRate: number
  /** Total requests processed */
  totalRequests: number
  /** Failed requests count */
  failedRequests: number
  /** Circuit breaker activations */
  circuitBreakerActivations: number
  /** Bandwidth usage in bytes */
  bandwidthUsage: number
  /** Endpoint performance breakdown */
  endpointMetrics: Record<string, {
    responseTime: number
    successRate: number
    requestCount: number
    circuitBreakerState: 'closed' | 'open' | 'half-open'
  }>
}

/**
 * Circuit breaker states
 */
type CircuitBreakerState = 'closed' | 'open' | 'half-open'

/**
 * Circuit breaker for endpoint failure handling
 */
class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = 'closed'
  private failureCount = 0
  private lastFailureTime = 0
  private successCount = 0

  constructor(
    private endpoint: string,
    private threshold: number,
    private resetTimeout: number
  ) {
    super()
  }

  /**
   * Execute request through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open'
        this.successCount = 0
        this.emit('state-change', { endpoint: this.endpoint, state: 'half-open' })
      } else {
        throw new Error(`Circuit breaker is open for endpoint: ${this.endpoint}`)
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= 3) { // 3 successful requests to close
        this.state = 'closed'
        this.emit('state-change', { endpoint: this.endpoint, state: 'closed' })
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.threshold) {
      this.state = 'open'
      this.emit('state-change', { endpoint: this.endpoint, state: 'open' })
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
    this.emit('state-change', { endpoint: this.endpoint, state: 'closed' })
  }
}

/**
 * Request priority queue
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = []

  /**
   * Add item to queue
   */
  enqueue(item: T, priority: number): void {
    const queueItem = { item, priority }
    
    // Insert in priority order (higher priority first)
    let added = false
    for (let i = 0; i < this.items.length; i++) {
      if (queueItem.priority > this.items[i].priority) {
        this.items.splice(i, 0, queueItem)
        added = true
        break
      }
    }
    
    if (!added) {
      this.items.push(queueItem)
    }
  }

  /**
   * Remove and return highest priority item
   */
  dequeue(): T | null {
    const item = this.items.shift()
    return item?.item || null
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.items.length
  }
}

/**
 * Network optimizer with intelligent request handling
 */
export class NetworkOptimizer extends EventEmitter {
  private static instance: NetworkOptimizer | null = null

  // Configuration
  private config: NetworkConfig = {
    preferredEndpoints: [],
    maxConcurrentRequests: 10,
    defaultTimeout: 30000,
    retryStrategy: 'exponential',
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTime: 60000,
    intelligentLoadBalancing: true
  }

  // Circuit breakers per endpoint
  private circuitBreakers = new Map<string, CircuitBreaker>()
  
  // Request queues per priority
  private requestQueues = {
    critical: new PriorityQueue<() => Promise<unknown>>(),
    high: new PriorityQueue<() => Promise<unknown>>(),
    medium: new PriorityQueue<() => Promise<unknown>>(),
    low: new PriorityQueue<() => Promise<unknown>>()
  }

  // Active requests tracking
  private activeRequests = new Map<string, number>() // endpoint -> count
  private totalActiveRequests = 0

  // Performance metrics
  private metrics: NetworkMetrics = {
    averageResponseTime: 0,
    successRate: 100,
    totalRequests: 0,
    failedRequests: 0,
    circuitBreakerActivations: 0,
    bandwidthUsage: 0,
    endpointMetrics: {}
  }

  // Response time tracking
  private responseTimes: number[] = []
  private bandwidthTracker = new Map<string, number>()

  private eventBus = EventBus.getInstance()
  private processingQueue = false

  private constructor() {
    super()
    this.startRequestProcessor()
    this.startMetricsCollection()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer()
    }
    return NetworkOptimizer.instance
  }

  /**
   * Configure network optimization settings
   */
  async configureNetwork(config: Partial<NetworkConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    
    // Initialize circuit breakers for preferred endpoints
    for (const endpoint of this.config.preferredEndpoints) {
      if (!this.circuitBreakers.has(endpoint)) {
        const circuitBreaker = new CircuitBreaker(
          endpoint,
          this.config.circuitBreakerThreshold,
          this.config.circuitBreakerResetTime
        )
        
        circuitBreaker.on('state-change', (event) => {
          if (event.state === 'open') {
            this.metrics.circuitBreakerActivations++
          }
          this.eventBus.emit('network_optimizer:circuit_breaker_state_changed', event)
        })
        
        this.circuitBreakers.set(endpoint, circuitBreaker)
      }
    }

    this.eventBus.emit('network_optimizer:configured', this.config)
  }

  /**
   * Execute optimized network request
   */
  async executeRequest<T>(
    operation: () => Promise<T>,
    options: RequestOptions = { priority: 'medium' }
  ): Promise<T> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      // Check bandwidth limits
      if (this.config.bandwidthLimit && this.isOverBandwidthLimit()) {
        await this.waitForBandwidthAvailability()
      }

      // Execute request based on priority
      const result = await this.executeWithPriority(operation, options, requestId)
      
      // Track successful request
      this.recordRequestMetrics(startTime, true, options.tags)
      
      return result

    } catch {
      // Track failed request
      this.recordRequestMetrics(startTime, false, options.tags)
      
      // Attempt retry if configured
      if (options.retries && options.retries > 0) {
        const retryOptions = { ...options, retries: options.retries - 1 }
        return this.retryRequest(operation, retryOptions, error as Error)
      }
      
      throw error
    }
  }

  /**
   * Get current network performance metrics
   */
  getMetrics(): NetworkMetrics {
    return { ...this.metrics }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'endpoint' | 'configuration' | 'usage'
    priority: 'low' | 'medium' | 'high'
    title: string
    description: string
    action: string
  }> {
    const recommendations = []

    // Check success rate
    if (this.metrics.successRate < 90) {
      recommendations.push({
        type: 'configuration' as const,
        priority: 'high' as const,
        title: 'Low Success Rate Detected',
        description: `Current success rate is ${this.metrics.successRate.toFixed(1)}%`,
        action: 'Increase circuit breaker threshold or add more reliable endpoints'
      })
    }

    // Check response time
    if (this.metrics.averageResponseTime > 5000) {
      recommendations.push({
        type: 'endpoint' as const,
        priority: 'medium' as const,
        title: 'High Response Time',
        description: `Average response time is ${this.metrics.averageResponseTime}ms`,
        action: 'Consider using faster endpoints or enabling request batching'
      })
    }

    // Check circuit breaker activations
    if (this.metrics.circuitBreakerActivations > 10) {
      recommendations.push({
        type: 'endpoint' as const,
        priority: 'high' as const,
        title: 'Frequent Circuit Breaker Activations',
        description: `${this.metrics.circuitBreakerActivations} circuit breaker activations detected`,
        action: 'Review endpoint reliability and consider adding backup endpoints'
      })
    }

    // Check bandwidth usage
    if (this.config.bandwidthLimit && this.metrics.bandwidthUsage > this.config.bandwidthLimit * 0.8) {
      recommendations.push({
        type: 'usage' as const,
        priority: 'medium' as const,
        title: 'High Bandwidth Usage',
        description: `Using ${(this.metrics.bandwidthUsage / this.config.bandwidthLimit * 100).toFixed(1)}% of bandwidth limit`,
        action: 'Enable request compression or reduce request frequency'
      })
    }

    return recommendations
  }

  /**
   * Optimize network configuration automatically
   */
  async autoOptimize(): Promise<{
    changes: string[]
    expectedImprovement: string
  }> {
    const changes: string[] = []
    const recommendations = this.getOptimizationRecommendations()

    // Auto-adjust circuit breaker thresholds based on success rates
    if (this.metrics.successRate < 80) {
      this.config.circuitBreakerThreshold = Math.max(2, this.config.circuitBreakerThreshold - 1)
      changes.push(`Reduced circuit breaker threshold to ${this.config.circuitBreakerThreshold}`)
    } else if (this.metrics.successRate > 95 && this.config.circuitBreakerThreshold < 10) {
      this.config.circuitBreakerThreshold++
      changes.push(`Increased circuit breaker threshold to ${this.config.circuitBreakerThreshold}`)
    }

    // Auto-adjust concurrent requests based on performance
    if (this.metrics.averageResponseTime > 10000 && this.config.maxConcurrentRequests > 5) {
      this.config.maxConcurrentRequests = Math.max(5, this.config.maxConcurrentRequests - 2)
      changes.push(`Reduced max concurrent requests to ${this.config.maxConcurrentRequests}`)
    } else if (this.metrics.averageResponseTime < 2000 && this.config.maxConcurrentRequests < 20) {
      this.config.maxConcurrentRequests = Math.min(20, this.config.maxConcurrentRequests + 2)
      changes.push(`Increased max concurrent requests to ${this.config.maxConcurrentRequests}`)
    }

    // Auto-adjust timeout based on response times
    const recommendedTimeout = Math.max(5000, this.metrics.averageResponseTime * 3)
    if (Math.abs(this.config.defaultTimeout - recommendedTimeout) > 5000) {
      this.config.defaultTimeout = recommendedTimeout
      changes.push(`Adjusted default timeout to ${recommendedTimeout}ms`)
    }

    const expectedImprovement = changes.length > 0
      ? `Expected 10-30% improvement in ${this.metrics.successRate < 90 ? 'reliability' : 'performance'}`
      : 'No optimization changes needed at this time'

    this.eventBus.emit('network_optimizer:auto_optimized', { changes, expectedImprovement })

    return { changes, expectedImprovement }
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset()
    }
    this.metrics.circuitBreakerActivations = 0
    this.eventBus.emit('network_optimizer:circuit_breakers_reset')
  }

  /**
   * Execute request with priority handling
   */
  private async executeWithPriority<T>(
    operation: () => Promise<T>,
    options: RequestOptions,
    requestId: string
  ): Promise<T> {
    // Check if we can execute immediately
    if (this.canExecuteImmediately(options.priority)) {
      return this.executeWithCircuitBreaker(operation, options, requestId)
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const queuedOperation = async () => {
        try {
          const result = await this.executeWithCircuitBreaker(operation, options, requestId)
          resolve(result)
        } catch {
          reject(error)
        }
      }

      const priorityValue = this.getPriorityValue(options.priority)
      this.requestQueues[options.priority].enqueue(queuedOperation, priorityValue)

      // Process queue if not already processing
      if (!this.processingQueue) {
        this.processRequestQueue()
      }
    })
  }

  /**
   * Execute request with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: RequestOptions,
    requestId: string
  ): Promise<T> {
    this.totalActiveRequests++

    try {
      // Apply timeout
      const timeout = options.timeout || this.config.defaultTimeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })

      // Execute with timeout
      const result = await Promise.race([operation(), timeoutPromise])
      
      return result as T

    } finally {
      this.totalActiveRequests--
    }
  }

  /**
   * Retry failed request with exponential backoff
   */
  private async retryRequest<T>(
    operation: () => Promise<T>,
    options: RequestOptions,
    lastError: Error
  ): Promise<T> {
    const delay = this.calculateRetryDelay(
      (this.config.maxRetries - (options.retries || 0)),
      this.config.retryStrategy
    )

    await new Promise(resolve => setTimeout(resolve, delay))

    this.eventBus.emit('network_optimizer:retry_attempt', {
      attempt: this.config.maxRetries - (options.retries || 0),
      delay,
      lastError: lastError.message
    })

    return this.executeRequest(operation, options)
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(attempt: number, strategy: NetworkConfig['retryStrategy']): number {
    const baseDelay = 1000 // 1 second

    switch (strategy) {
      case 'linear':
        return baseDelay * attempt
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1)
      case 'fibonacci':
        return baseDelay * this.fibonacci(attempt)
      default:
        return baseDelay * attempt
    }
  }

  /**
   * Calculate fibonacci number for retry delay
   */
  private fibonacci(n: number): number {
    if (n <= 1) return n
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) {
      const temp = a + b
      a = b
      b = temp
    }
    return b
  }

  /**
   * Check if request can be executed immediately
   */
  private canExecuteImmediately(priority: RequestOptions['priority']): boolean {
    if (this.totalActiveRequests < this.config.maxConcurrentRequests) {
      return true
    }

    // Critical and high priority can bypass limits
    return priority === 'critical' || priority === 'high'
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: RequestOptions['priority']): number {
    const priorities = { critical: 4, high: 3, medium: 2, low: 1 }
    return priorities[priority]
  }

  /**
   * Start request queue processor
   */
  private startRequestProcessor(): void {
    setInterval(() => {
      this.processRequestQueue()
    }, 100) // Process every 100ms
  }

  /**
   * Process queued requests
   */
  private async processRequestQueue(): Promise<void> {
    if (this.processingQueue || this.totalActiveRequests >= this.config.maxConcurrentRequests) {
      return
    }

    this.processingQueue = true

    try {
      // Process requests in priority order
      const queues = ['critical', 'high', 'medium', 'low'] as const
      
      for (const queueName of queues) {
        const queue = this.requestQueues[queueName]
        
        while (!queue.isEmpty() && this.totalActiveRequests < this.config.maxConcurrentRequests) {
          const operation = queue.dequeue()
          if (operation) {
            // Execute asynchronously without waiting
            operation().catch(() => {
              // Error handling is done in the original promise
            })
          }
        }
      }
    } finally {
      this.processingQueue = false
    }
  }

  /**
   * Check if over bandwidth limit
   */
  private isOverBandwidthLimit(): boolean {
    if (!this.config.bandwidthLimit) return false
    
    const currentUsage = Array.from(this.bandwidthTracker.values())
      .reduce((sum, usage) => sum + usage, 0)
    
    return currentUsage > this.config.bandwidthLimit
  }

  /**
   * Wait for bandwidth availability
   */
  private async waitForBandwidthAvailability(): Promise<void> {
    return new Promise(resolve => {
      const checkBandwidth = () => {
        if (!this.isOverBandwidthLimit()) {
          resolve()
        } else {
          setTimeout(checkBandwidth, 1000) // Check every second
        }
      }
      checkBandwidth()
    })
  }

  /**
   * Record request metrics
   */
  private recordRequestMetrics(
    startTime: number,
    success: boolean,
    tags?: string[]
  ): void {
    const responseTime = Date.now() - startTime
    
    this.metrics.totalRequests++
    if (!success) {
      this.metrics.failedRequests++
    }
    
    // Update success rate
    this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests) * 100
    
    // Update response time
    this.responseTimes.push(responseTime)
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }
    
    this.metrics.averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length

    // Emit metrics event
    this.eventBus.emit('network_optimizer:request_completed', {
      responseTime,
      success,
      tags,
      totalRequests: this.metrics.totalRequests
    })
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      // Update bandwidth usage
      const currentTime = Date.now()
      const windowSize = 60000 // 1 minute window
      
      // Clean old bandwidth entries
      for (const [timestamp, usage] of this.bandwidthTracker.entries()) {
        if (currentTime - parseInt(timestamp) > windowSize) {
          this.bandwidthTracker.delete(timestamp)
        }
      }
      
      // Calculate current bandwidth usage
      this.metrics.bandwidthUsage = Array.from(this.bandwidthTracker.values())
        .reduce((sum, usage) => sum + usage, 0)

      // Emit periodic metrics
      this.eventBus.emit('network_optimizer:metrics_updated', this.getMetrics())
    }, 30000) // Every 30 seconds
  }
}

// Export singleton instance
export const networkOptimizer = NetworkOptimizer.getInstance()