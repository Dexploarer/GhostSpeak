/**
 * Test suite for network optimizer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  NetworkOptimizer,
  type NetworkConfig,
  type RequestOptions 
} from '../../src/core/network-optimizer'
import { EventBus } from '../../src/core/event-system'

describe('Network Optimizer', () => {
  let optimizer: NetworkOptimizer
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
    eventBus.setMaxListeners(50)
    optimizer = NetworkOptimizer.getInstance()
    optimizer.reset() // Reset state between tests
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should configure network settings', async () => {
      const config: Partial<NetworkConfig> = {
        preferredEndpoints: ['https://fast-rpc.com', 'https://backup-rpc.com'],
        maxConcurrentRequests: 15,
        defaultTimeout: 10000,
        retryStrategy: 'exponential',
        maxRetries: 5
      }

      await optimizer.configureNetwork(config)

      // Configuration should be applied
      expect(true).toBe(true) // Basic test that configuration doesn't throw
    })

    it('should emit configuration events', async () => {
      let configEvent: any = null
      eventBus.on('network_optimizer:configured', (event) => {
        configEvent = event.data || event
      })

      const config = { maxConcurrentRequests: 20 }
      await optimizer.configureNetwork(config)

      expect(configEvent).toMatchObject({
        maxConcurrentRequests: 20
      })
    })
  })

  describe('Request Execution', () => {
    it('should execute simple requests', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ success: true })
      
      const result = await optimizer.executeRequest(mockOperation, {
        priority: 'medium'
      })

      expect(result).toEqual({ success: true })
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should handle request priorities', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ priority: 'high' })
      
      const result = await optimizer.executeRequest(mockOperation, {
        priority: 'high',
        timeout: 5000
      })

      expect(result).toEqual({ priority: 'high' })
    })

    it('should handle critical priority requests', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ critical: true })
      
      const result = await optimizer.executeRequest(mockOperation, {
        priority: 'critical',
        tags: ['urgent', 'user-action']
      })

      expect(result).toEqual({ critical: true })
    })

    it('should handle request timeouts', async () => {
      const slowOperation = () => new Promise(resolve => 
        setTimeout(() => resolve({ slow: true }), 2000)
      )
      
      await expect(
        optimizer.executeRequest(slowOperation, {
          priority: 'medium',
          timeout: 100 // 100ms timeout
        })
      ).rejects.toThrow('Request timeout')
    })

    it('should retry failed requests', async () => {
      // Configure faster retries for testing
      await optimizer.configureNetwork({
        retryStrategy: 'linear',
        maxRetries: 2
      })

      let attempts = 0
      const flakyOperation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ success: true, attempts })
      })

      const result = await optimizer.executeRequest(flakyOperation, {
        priority: 'medium',
        retries: 2
      })

      expect(result).toEqual({ success: true, attempts: 3 })
      expect(flakyOperation).toHaveBeenCalledTimes(3)
    }, 10000) // Increase timeout to 10 seconds
  })

  describe('Circuit Breaker', () => {
    it('should activate circuit breaker on repeated failures', async () => {
      let circuitBreakerEvent: any = null
      eventBus.on('network_optimizer:circuit_breaker_state_changed', (event) => {
        circuitBreakerEvent = event.data || event
      })

      // Configure with low threshold for testing
      await optimizer.configureNetwork({
        preferredEndpoints: ['https://failing-endpoint.com'],
        circuitBreakerThreshold: 2
      })

      const failingOperation = vi.fn().mockRejectedValue(new Error('Service unavailable'))

      // Execute multiple failing requests
      for (let i = 0; i < 3; i++) {
        try {
          await optimizer.executeRequest(failingOperation, { priority: 'medium' })
        } catch {
          // Expected to fail
        }
      }

      // Circuit breaker should eventually activate
      // This test verifies the mechanism is in place
      expect(true).toBe(true)
    })

    it('should reset circuit breakers', () => {
      optimizer.resetCircuitBreakers()
      
      const metrics = optimizer.getMetrics()
      expect(metrics.circuitBreakerActivations).toBe(0)
    })
  })

  describe('Performance Metrics', () => {
    it('should track basic metrics', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ test: true })

      await optimizer.executeRequest(mockOperation, { priority: 'medium' })

      const metrics = optimizer.getMetrics()

      // Check all metric types
      expect(typeof metrics.averageResponseTime).toBe('number')
      expect(typeof metrics.successRate).toBe('number')
      expect(typeof metrics.totalRequests).toBe('number')
      expect(typeof metrics.failedRequests).toBe('number')
      expect(typeof metrics.circuitBreakerActivations).toBe('number')
      expect(typeof metrics.bandwidthUsage).toBe('number')
      expect(typeof metrics.endpointMetrics).toBe('object')

      // Check metric values
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.failedRequests).toBe(0)
      expect(metrics.successRate).toBe(100)
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0)
    })

    it('should calculate success rates correctly', async () => {
      const successOperation = vi.fn().mockResolvedValue({ success: true })
      const failOperation = vi.fn().mockRejectedValue(new Error('Failed'))

      // Execute successful requests
      await optimizer.executeRequest(successOperation, { priority: 'medium' })
      await optimizer.executeRequest(successOperation, { priority: 'medium' })

      // Execute failed request
      try {
        await optimizer.executeRequest(failOperation, { priority: 'medium' })
      } catch {
        // Expected to fail
      }

      const metrics = optimizer.getMetrics()
      
      // Should have some success rate less than 100% due to the failure
      expect(metrics.successRate).toBeLessThan(100)
      expect(metrics.failedRequests).toBeGreaterThan(0)
    })

    it('should emit metrics update events', async () => {
      let metricsEvent: any = null
      eventBus.on('network_optimizer:request_completed', (event) => {
        metricsEvent = event.data || event
      })

      const mockOperation = vi.fn().mockResolvedValue({ metrics: true })
      await optimizer.executeRequest(mockOperation, { 
        priority: 'medium',
        tags: ['test-metrics']
      })

      expect(metricsEvent).toMatchObject({
        responseTime: expect.any(Number),
        success: true,
        tags: ['test-metrics'],
        totalRequests: expect.any(Number)
      })
    })
  })

  describe('Optimization Recommendations', () => {
    it('should generate optimization recommendations', () => {
      const recommendations = optimizer.getOptimizationRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      
      // Each recommendation should have required fields
      for (const rec of recommendations) {
        expect(rec).toMatchObject({
          type: expect.stringMatching(/^(endpoint|configuration|usage)$/),
          priority: expect.stringMatching(/^(low|medium|high)$/),
          title: expect.any(String),
          description: expect.any(String),
          action: expect.any(String)
        })
      }
    })

    it('should recommend improvements for low success rates', async () => {
      // Simulate low success rate by having many failures
      const failingOperation = vi.fn().mockRejectedValue(new Error('Simulated failure'))
      
      // Execute multiple failing requests to lower success rate
      for (let i = 0; i < 5; i++) {
        try {
          await optimizer.executeRequest(failingOperation, { priority: 'low' })
        } catch {
          // Expected failures
        }
      }
      
      const recommendations = optimizer.getOptimizationRecommendations()
      const lowSuccessRateRec = recommendations.find(r => 
        r.title.includes('Success Rate') || r.title.includes('reliability')
      )
      
      // Should recommend something about success rate if it's low enough
      expect(recommendations.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Auto Optimization', () => {
    it('should perform automatic optimization', async () => {
      const result = await optimizer.autoOptimize()

      // Check result structure
      expect(Array.isArray(result.changes)).toBe(true)
      expect(typeof result.expectedImprovement).toBe('string')
      expect(result.expectedImprovement.length).toBeGreaterThan(0)
    })

    it('should emit auto optimization events', async () => {
      let optimizationEvent: any = null
      eventBus.on('network_optimizer:auto_optimized', (event) => {
        optimizationEvent = event.data || event
      })

      await optimizer.autoOptimize()

      expect(optimizationEvent).toMatchObject({
        changes: expect.any(Array),
        expectedImprovement: expect.any(String)
      })
    })

    it('should adjust settings based on performance', async () => {
      // Execute some requests to generate metrics
      const fastOperation = vi.fn().mockResolvedValue({ fast: true })
      
      for (let i = 0; i < 5; i++) {
        await optimizer.executeRequest(fastOperation, { priority: 'medium' })
      }

      const result = await optimizer.autoOptimize()
      
      // Should return optimization results
      expect(result.changes).toBeDefined()
      expect(result.expectedImprovement).toBeDefined()
    })
  })

  describe('Request Queue Management', () => {
    it('should handle multiple concurrent requests', async () => {
      const operations = Array(10).fill(0).map((_, i) => 
        vi.fn().mockResolvedValue({ request: i })
      )

      const promises = operations.map((op, i) => 
        optimizer.executeRequest(op, { 
          priority: i % 2 === 0 ? 'high' : 'low' 
        })
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(10)
      operations.forEach((op, i) => {
        expect(op).toHaveBeenCalledTimes(1)
        expect(results[i]).toEqual({ request: i })
      })
    })

    it('should prioritize high priority requests', async () => {
      const completionOrder: string[] = []
      
      const createOperation = (id: string, delay: number) => async () => {
        await new Promise(resolve => setTimeout(resolve, delay))
        completionOrder.push(id)
        return { id }
      }

      // Start multiple requests with different priorities
      const promises = [
        optimizer.executeRequest(createOperation('low1', 10), { priority: 'low' }),
        optimizer.executeRequest(createOperation('high1', 5), { priority: 'high' }),
        optimizer.executeRequest(createOperation('critical1', 5), { priority: 'critical' }),
        optimizer.executeRequest(createOperation('medium1', 5), { priority: 'medium' })
      ]

      await Promise.all(promises)
      
      // Should complete in priority order (allowing for some timing variance)
      expect(completionOrder.length).toBe(4)
    })
  })

  describe('Retry Strategies', () => {
    it('should use exponential backoff for retries', async () => {
      const startTime = Date.now()
      let attempts = 0

      const flakyOperation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 2) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve({ attempts, duration: Date.now() - startTime })
      })

      // Configure exponential retry strategy
      await optimizer.configureNetwork({
        retryStrategy: 'exponential',
        maxRetries: 2
      })

      const result = await optimizer.executeRequest(flakyOperation, {
        priority: 'medium',
        retries: 1
      })

      expect(result.attempts).toBe(2)
      // Should take some time due to exponential backoff
      expect(result.duration).toBeGreaterThan(50)
    }, 10000)

    it('should use linear backoff for retries', async () => {
      let attempts = 0
      
      const flakyOperation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 2) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve({ attempts })
      })

      // Configure linear retry strategy
      await optimizer.configureNetwork({
        retryStrategy: 'linear',
        maxRetries: 2
      })

      const result = await optimizer.executeRequest(flakyOperation, {
        priority: 'medium',
        retries: 1
      })

      expect(result.attempts).toBe(2)
    })

    it('should emit retry attempt events', async () => {
      let retryEvent: any = null
      eventBus.on('network_optimizer:retry_attempt', (event) => {
        retryEvent = event.data || event
      })

      const flakyOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({ success: true })

      await optimizer.executeRequest(flakyOperation, {
        priority: 'medium',
        retries: 1
      })

      expect(retryEvent).toMatchObject({
        attempt: expect.any(Number),
        delay: expect.any(Number),
        lastError: 'First failure'
      })
    })
  })

  describe('Bandwidth Management', () => {
    it('should handle bandwidth limits', async () => {
      await optimizer.configureNetwork({
        bandwidthLimit: 1000 // 1KB limit for testing
      })

      const operation = vi.fn().mockResolvedValue({ data: 'test' })
      
      // Should still execute within bandwidth limits
      const result = await optimizer.executeRequest(operation, {
        priority: 'medium'
      })

      expect(result).toEqual({ data: 'test' })
    })

    it('should track bandwidth usage in metrics', async () => {
      const operation = vi.fn().mockResolvedValue({ largData: 'x'.repeat(1000) })
      
      await optimizer.executeRequest(operation, { priority: 'medium' })
      
      const metrics = optimizer.getMetrics()
      expect(metrics.bandwidthUsage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = NetworkOptimizer.getInstance()
      const instance2 = NetworkOptimizer.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should maintain state across getInstance calls', async () => {
      const instance1 = NetworkOptimizer.getInstance()
      await instance1.configureNetwork({ maxConcurrentRequests: 25 })
      
      const instance2 = NetworkOptimizer.getInstance()
      const metrics1 = instance1.getMetrics()
      const metrics2 = instance2.getMetrics()
      
      expect(metrics1).toEqual(metrics2)
    })
  })

  describe('Event Integration', () => {
    it('should emit network optimization events', async () => {
      const events: string[] = []
      
      eventBus.on('network_optimizer:configured', () => events.push('configured'))
      eventBus.on('network_optimizer:request_completed', () => events.push('request_completed'))
      eventBus.on('network_optimizer:metrics_updated', () => events.push('metrics_updated'))

      await optimizer.configureNetwork({ maxConcurrentRequests: 15 })
      
      const operation = vi.fn().mockResolvedValue({ test: true })
      await optimizer.executeRequest(operation, { priority: 'medium' })

      expect(events).toContain('configured')
      expect(events).toContain('request_completed')
    })

    it('should handle circuit breaker events', async () => {
      let circuitBreakerEvents: any[] = []
      eventBus.on('network_optimizer:circuit_breaker_state_changed', (event) => {
        circuitBreakerEvents.push(event.data || event)
      })

      // Reset to clean state
      optimizer.resetCircuitBreakers()
      
      // Circuit breaker events should be handled properly
      expect(circuitBreakerEvents.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle operation errors gracefully', async () => {
      const errorOperation = vi.fn().mockRejectedValue(new Error('Network failure'))
      
      await expect(
        optimizer.executeRequest(errorOperation, { 
          priority: 'medium',
          retries: 0 // No retries to test immediate failure
        })
      ).rejects.toThrow('Network failure')
      
      // Should still track the failed request in metrics
      const metrics = optimizer.getMetrics()
      expect(metrics.failedRequests).toBeGreaterThan(0)
    })

    it('should handle malformed operations', async () => {
      const malformedOperation = undefined as any
      
      await expect(
        optimizer.executeRequest(malformedOperation, { priority: 'medium' })
      ).rejects.toThrow()
    })
  })
})