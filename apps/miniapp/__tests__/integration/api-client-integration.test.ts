/**
 * API Client Integration Tests
 *
 * Integration tests for the complete API client flow including real network behavior,
 * request/response cycles, and error handling across multiple API methods.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { ApiError, NetworkError, TimeoutError } from '../../lib/types'
import {
  mockAgentDiscoveryResponse,
  mockAgentDetailsResponse,
  mockQuotaResponse,
  mockImageGenerationResponse,
  mockHealthCheckResponse,
  mockUserImages,
  mockFetchResponse,
  mockFetchErrorResponse,
} from '../utils/test-utils'
import { apiClient } from '../../lib/api-client'

// ============================================================================
// Setup and Teardown
// ============================================================================

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

// ============================================================================
// Full API Flow Integration Tests
// ============================================================================

describe('API Client Integration - Complete Flow', () => {
  test('should complete agent discovery and detail fetching flow', async () => {
    let callCount = 0

    global.fetch = async (url: string | URL | Request) => {
      callCount++
      const urlStr = typeof url === 'string' ? url : url.toString()

      // First call: discovery
      if (urlStr.includes('/api/v1/discovery')) {
        return mockFetchResponse(mockAgentDiscoveryResponse)
      }

      // Second call: agent details
      if (urlStr.includes('/api/v1/agent/')) {
        return mockFetchResponse(mockAgentDetailsResponse)
      }

      throw new Error('Unexpected URL')
    }

    // Step 1: Discover agents
    const discovery = await apiClient.discoverAgents()
    expect(discovery.agents).toHaveLength(2)

    // Step 2: Get details for first agent
    const agent = await apiClient.getAgent(discovery.agents[0].address)
    expect(agent.agent.address).toBe(discovery.agents[0].address)

    // Verify both calls were made
    expect(callCount).toBe(2)
  })

  test('should complete quota check and image generation flow', async () => {
    let callCount = 0

    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      callCount++
      const urlStr = typeof url === 'string' ? url : url.toString()

      // First call: check quota
      if (urlStr.includes('/api/v1/quota')) {
        return mockFetchResponse(mockQuotaResponse)
      }

      // Second call: generate image (POST)
      if (urlStr.includes('/api/agent/chat') && options?.method === 'POST') {
        return mockFetchResponse(mockImageGenerationResponse)
      }

      throw new Error('Unexpected URL')
    }

    // Step 1: Check quota
    const quota = await apiClient.getUserQuota('telegram_123456')
    expect(quota.remaining).toBeGreaterThan(0)

    // Step 2: Generate image if quota available
    if (quota.remaining > 0) {
      const image = await apiClient.generateImage({
        userId: '123456',
        message: 'cute ghost',
        characterId: 'boo',
      })
      expect(image.success).toBe(true)
    }

    expect(callCount).toBe(2)
  })

  test('should complete user profile fetching flow', async () => {
    let callCount = 0

    global.fetch = async (url: string | URL | Request) => {
      callCount++
      const urlStr = typeof url === 'string' ? url : url.toString()

      // Quota endpoint
      if (urlStr.includes('/api/v1/quota')) {
        return mockFetchResponse(mockQuotaResponse)
      }

      // Images endpoint
      if (urlStr.includes('/api/images/')) {
        return mockFetchResponse({ images: mockUserImages })
      }

      throw new Error('Unexpected URL')
    }

    // Fetch user quota and images in parallel
    const [quota, images] = await Promise.all([
      apiClient.getUserQuota('telegram_123456'),
      apiClient.getUserImages('telegram_123456'),
    ])

    expect(quota.tier).toBe('free')
    expect(images).toHaveLength(2)
    expect(callCount).toBe(2)
  })
})

// ============================================================================
// Error Recovery Integration Tests
// ============================================================================

describe('API Client Integration - Error Recovery', () => {
  test('should recover from transient errors with retry', async () => {
    let callCount = 0

    global.fetch = async () => {
      callCount++

      // Fail first 2 attempts
      if (callCount <= 2) {
        return mockFetchErrorResponse('Server Error', 'Temporary failure', 500)
      }

      // Succeed on 3rd attempt
      return mockFetchResponse(mockHealthCheckResponse)
    }

    const result = await apiClient.healthCheck()

    expect(result.status).toBe('ok')
    expect(callCount).toBe(3)
  })

  test('should handle quota exceeded gracefully', async () => {
    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      // Quota check succeeds
      if (urlStr.includes('/api/v1/quota')) {
        return mockFetchResponse({
          ...mockQuotaResponse,
          remaining: 0,
          used: 20,
        })
      }

      // Image generation fails with 429
      if (urlStr.includes('/api/agent/chat') && options?.method === 'POST') {
        return mockFetchErrorResponse('RATE_LIMITED', 'Quota exceeded', 429, 'QUOTA_EXCEEDED')
      }

      throw new Error('Unexpected URL')
    }

    // Check quota first
    const quota = await apiClient.getUserQuota('telegram_123456')
    expect(quota.remaining).toBe(0)

    // Try to generate image (should fail)
    try {
      await apiClient.generateImage({
        userId: '123456',
        message: 'test',
        characterId: 'boo',
      })
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.status).toBe(429)
      }
    }
  })

  test('should handle network failure then success', async () => {
    let callCount = 0

    global.fetch = async () => {
      callCount++

      // Fail first attempt with network error
      if (callCount === 1) {
        throw new Error('ECONNREFUSED')
      }

      // Succeed on retry
      return mockFetchResponse(mockHealthCheckResponse)
    }

    const result = await apiClient.healthCheck()

    expect(result.status).toBe('ok')
    expect(callCount).toBe(2)
  })

  test('should handle mixed error types', async () => {
    let callCount = 0

    global.fetch = async () => {
      callCount++

      switch (callCount) {
        case 1:
          // Network error
          throw new Error('Network failure')
        case 2:
          // Server error
          return mockFetchErrorResponse('Server Error', 'Internal error', 500)
        case 3:
          // Success
          return mockFetchResponse(mockHealthCheckResponse)
        default:
          throw new Error('Too many calls')
      }
    }

    const result = await apiClient.healthCheck()

    expect(result.status).toBe('ok')
    expect(callCount).toBe(3)
  })
})

// ============================================================================
// Concurrent Request Integration Tests
// ============================================================================

describe('API Client Integration - Concurrent Requests', () => {
  test('should handle multiple concurrent successful requests', async () => {
    global.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/api/v1/discovery')) {
        return mockFetchResponse(mockAgentDiscoveryResponse)
      }

      if (urlStr.includes('/api/v1/health')) {
        return mockFetchResponse(mockHealthCheckResponse)
      }

      if (urlStr.includes('/api/v1/quota')) {
        return mockFetchResponse(mockQuotaResponse)
      }

      throw new Error('Unexpected URL')
    }

    const [discovery, health, quota] = await Promise.all([
      apiClient.discoverAgents(),
      apiClient.healthCheck(),
      apiClient.getUserQuota('telegram_123456'),
    ])

    expect(discovery.agents).toBeDefined()
    expect(health.status).toBe('ok')
    expect(quota.tier).toBe('free')
  })

  test('should handle concurrent requests with mixed success/failure', async () => {
    global.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      // Success
      if (urlStr.includes('/api/v1/health')) {
        return mockFetchResponse(mockHealthCheckResponse)
      }

      // Failure
      if (urlStr.includes('/api/v1/agent/invalid')) {
        return mockFetchErrorResponse('NOT_FOUND', 'Agent not found', 404)
      }

      // Success
      if (urlStr.includes('/api/v1/discovery')) {
        return mockFetchResponse(mockAgentDiscoveryResponse)
      }

      throw new Error('Unexpected URL')
    }

    const results = await Promise.allSettled([
      apiClient.healthCheck(),
      apiClient.getAgent('invalid'),
      apiClient.discoverAgents(),
    ])

    // First request should succeed
    expect(results[0].status).toBe('fulfilled')

    // Second request should fail
    expect(results[1].status).toBe('rejected')
    if (results[1].status === 'rejected') {
      expect(results[1].reason).toBeInstanceOf(ApiError)
    }

    // Third request should succeed
    expect(results[2].status).toBe('fulfilled')
  })

  test('should handle race conditions gracefully', async () => {
    let requestCount = 0

    global.fetch = async () => {
      requestCount++
      // Simulate variable response times
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
      return mockFetchResponse(mockHealthCheckResponse)
    }

    // Fire off 5 requests simultaneously
    const promises = Array(5).fill(null).map(() => apiClient.healthCheck())
    const results = await Promise.all(promises)

    expect(results).toHaveLength(5)
    expect(requestCount).toBe(5)
    results.forEach(result => {
      expect(result.status).toBe('ok')
    })
  })
})

// ============================================================================
// Real-World Scenario Integration Tests
// ============================================================================

describe('API Client Integration - Real-World Scenarios', () => {
  test('scenario: user discovers agents, views details, checks quota, generates image', async () => {
    const mockState = {
      callOrder: [] as string[],
    }

    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/api/v1/discovery')) {
        mockState.callOrder.push('discovery')
        return mockFetchResponse(mockAgentDiscoveryResponse)
      }

      if (urlStr.includes('/api/v1/agent/')) {
        mockState.callOrder.push('agent-details')
        return mockFetchResponse(mockAgentDetailsResponse)
      }

      if (urlStr.includes('/api/v1/quota')) {
        mockState.callOrder.push('quota')
        return mockFetchResponse(mockQuotaResponse)
      }

      if (urlStr.includes('/api/agent/chat') && options?.method === 'POST') {
        mockState.callOrder.push('generate-image')
        return mockFetchResponse(mockImageGenerationResponse)
      }

      throw new Error('Unexpected URL')
    }

    // Step 1: Discover agents
    const discovery = await apiClient.discoverAgents({ verified: true })
    expect(discovery.agents.length).toBeGreaterThan(0)

    // Step 2: View first agent details
    const agent = await apiClient.getAgent(discovery.agents[0].address)
    expect(agent.agent.status).toBe('active')

    // Step 3: Check quota
    const quota = await apiClient.getUserQuota('telegram_123456')
    expect(quota.remaining).toBeGreaterThan(0)

    // Step 4: Generate image
    const image = await apiClient.generateImage({
      userId: '123456',
      message: 'cute ghost',
      characterId: 'boo',
    })
    expect(image.success).toBe(true)

    // Verify call order
    expect(mockState.callOrder).toEqual([
      'discovery',
      'agent-details',
      'quota',
      'generate-image',
    ])
  })

  test('scenario: user checks quota, hits limit, sees error', async () => {
    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/api/v1/quota')) {
        return mockFetchResponse({
          ...mockQuotaResponse,
          remaining: 0,
          used: 20,
        })
      }

      if (urlStr.includes('/api/agent/chat') && options?.method === 'POST') {
        return mockFetchErrorResponse('QUOTA_EXCEEDED', 'Daily limit reached', 429)
      }

      throw new Error('Unexpected URL')
    }

    // Check quota
    const quota = await apiClient.getUserQuota('telegram_123456')
    expect(quota.remaining).toBe(0)

    // Attempt generation despite quota
    try {
      await apiClient.generateImage({
        userId: '123456',
        message: 'test',
        characterId: 'boo',
      })
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.status).toBe(429)
        expect(error.message).toContain('Daily limit reached')
      }
    }
  })

  test('scenario: server temporarily down, retries, succeeds', async () => {
    let serverUptime = 0

    global.fetch = async () => {
      serverUptime++

      // Server down for first 2 attempts
      if (serverUptime <= 2) {
        return mockFetchErrorResponse('SERVER_ERROR', 'Service temporarily unavailable', 503)
      }

      // Server back up
      return mockFetchResponse(mockHealthCheckResponse)
    }

    // Health check should retry and succeed
    const result = await apiClient.healthCheck()

    expect(result.status).toBe('ok')
    expect(serverUptime).toBe(3)
  })

  test('scenario: user views gallery of their generated images', async () => {
    global.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/api/images/')) {
        return mockFetchResponse({ images: mockUserImages })
      }

      throw new Error('Unexpected URL')
    }

    // Fetch user's generated images
    const images = await apiClient.getUserImages('telegram_123456')

    expect(images).toHaveLength(2)
    expect(images[0]._id).toBe('img-1')
    expect(images[0].storageUrl).toBeDefined()
    expect(images[0].prompt).toBe('cute ghost')
    expect(images[0].upvotes).toBe(10)
  })
})

// ============================================================================
// Performance Integration Tests
// ============================================================================

describe('API Client Integration - Performance', () => {
  test('should handle rapid sequential requests efficiently', async () => {
    let callCount = 0

    global.fetch = async () => {
      callCount++
      return mockFetchResponse(mockHealthCheckResponse)
    }

    const startTime = Date.now()

    // Make 10 sequential requests
    for (let i = 0; i < 10; i++) {
      await apiClient.healthCheck()
    }

    const duration = Date.now() - startTime

    expect(callCount).toBe(10)
    // Should complete relatively quickly (no artificial delays)
    expect(duration).toBeLessThan(5000)
  })

  test('should handle burst of parallel requests', async () => {
    let callCount = 0

    global.fetch = async () => {
      callCount++
      // Simulate slight network delay
      await new Promise(resolve => setTimeout(resolve, 50))
      return mockFetchResponse(mockHealthCheckResponse)
    }

    const startTime = Date.now()

    // Fire 20 requests in parallel
    const promises = Array(20).fill(null).map(() => apiClient.healthCheck())
    await Promise.all(promises)

    const duration = Date.now() - startTime

    expect(callCount).toBe(20)
    // Parallel requests should be much faster than sequential
    expect(duration).toBeLessThan(2000)
  })
})
