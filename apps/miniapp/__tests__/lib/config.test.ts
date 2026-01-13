/**
 * Configuration Tests
 *
 * Unit tests for lib/config.ts configuration object and endpoint helpers.
 */

import { describe, test, expect } from 'bun:test'
import { config, endpoints } from '../../lib/config'

// ============================================================================
// Config Object Tests
// ============================================================================

describe('config object', () => {
  test('should have all required fields', () => {
    expect(config.appUrl).toBeDefined()
    expect(config.webAppUrl).toBeDefined()
    expect(config.convexUrl).toBeDefined()
    expect(config.solana).toBeDefined()
    expect(config.telegram).toBeDefined()
    expect(config.aiGateway).toBeDefined()
    expect(config.isDevelopment).toBeDefined()
    expect(config.isProduction).toBeDefined()
    expect(config.nodeEnv).toBeDefined()
  })

  test('should have correct URL values', () => {
    expect(config.appUrl).toBe('http://localhost:3334')
    expect(config.webAppUrl).toBe('http://localhost:3333')
    expect(config.convexUrl).toBe('https://lovely-cobra-639.convex.cloud')
  })

  test('should have correct Solana configuration', () => {
    expect(config.solana.rpcUrl).toBe('https://api.devnet.solana.com')
    expect(config.solana.network).toBe('devnet')
    expect(config.solana.programId).toBe('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
    expect(config.solana.ghostTokenAddress).toBe('GHoSTgvU7Uw1hVJWj1V1W1q9F1q1q1q1q1q1q1q1q1q')
  })

  test('should have correct Telegram configuration', () => {
    expect(config.telegram.botUsername).toBe('boo_gs_bot')
  })

  test('should have correct environment flags', () => {
    expect(config.nodeEnv).toBe('test')
    expect(typeof config.isDevelopment).toBe('boolean')
    expect(typeof config.isProduction).toBe('boolean')
  })

  test('should have as const type enforcement', () => {
    // 'as const' provides TypeScript compile-time immutability, not runtime
    // This test just verifies the values are accessible
    expect(config.appUrl).toBeDefined()
    expect(typeof config.appUrl).toBe('string')

    // TypeScript will prevent mutation at compile time
    // Runtime mutation is still technically possible but should never happen
  })
})

// ============================================================================
// Endpoint Helper Tests
// ============================================================================

describe('endpoints.getAgent', () => {
  test('should generate correct agent details URL', () => {
    const address = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'
    const url = endpoints.getAgent(address)

    expect(url).toBe('http://localhost:3333/api/v1/agent/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
  })

  test('should handle different addresses', () => {
    const address1 = 'addr1'
    const address2 = 'addr2'

    expect(endpoints.getAgent(address1)).toBe('http://localhost:3333/api/v1/agent/addr1')
    expect(endpoints.getAgent(address2)).toBe('http://localhost:3333/api/v1/agent/addr2')
  })

  test('should not encode safe characters in address', () => {
    const address = 'ABCdef123456'
    const url = endpoints.getAgent(address)

    expect(url).toContain(address)
    expect(url).not.toContain('%')
  })
})

describe('endpoints.agentChat', () => {
  test('should generate correct agent chat URL', () => {
    const url = endpoints.agentChat()

    expect(url).toBe('http://localhost:3333/api/agent/chat')
  })

  test('should be callable multiple times with same result', () => {
    const url1 = endpoints.agentChat()
    const url2 = endpoints.agentChat()

    expect(url1).toBe(url2)
  })
})

describe('endpoints.discoverAgents', () => {
  test('should generate correct discovery URL', () => {
    const url = endpoints.discoverAgents()

    expect(url).toBe('http://localhost:3333/api/v1/discovery')
  })

  test('should be callable multiple times with same result', () => {
    const url1 = endpoints.discoverAgents()
    const url2 = endpoints.discoverAgents()

    expect(url1).toBe(url2)
  })
})

describe('endpoints.getUserImages', () => {
  test('should generate correct user images URL', () => {
    const userId = 'telegram_123456'
    const url = endpoints.getUserImages(userId)

    expect(url).toBe('http://localhost:3333/api/images/telegram_123456')
  })

  test('should handle different user IDs', () => {
    const telegramUserId = 'telegram_123456'
    const walletUserId = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'

    expect(endpoints.getUserImages(telegramUserId)).toContain('telegram_123456')
    expect(endpoints.getUserImages(walletUserId)).toContain('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
  })
})

describe('endpoints.getUserQuota', () => {
  test('should generate correct user quota URL with encoded userId', () => {
    const userId = 'telegram_123456'
    const url = endpoints.getUserQuota(userId)

    expect(url).toBe('http://localhost:3333/api/v1/quota?userId=telegram_123456')
  })

  test('should properly encode special characters in userId', () => {
    const userId = 'user with spaces'
    const url = endpoints.getUserQuota(userId)

    expect(url).toContain('userId=user%20with%20spaces')
  })

  test('should handle URL-unsafe characters', () => {
    const userId = 'user@test.com'
    const url = endpoints.getUserQuota(userId)

    expect(url).toContain('userId=user%40test.com')
  })

  test('should handle special characters', () => {
    const userId = 'user+name&test=value'
    const url = endpoints.getUserQuota(userId)

    // encodeURIComponent should encode these characters
    expect(url).toContain('%2B')
    expect(url).toContain('%26')
    expect(url).toContain('%3D')
  })
})

describe('endpoints.healthCheck', () => {
  test('should generate correct health check URL', () => {
    const url = endpoints.healthCheck()

    expect(url).toBe('http://localhost:3333/api/v1/health')
  })

  test('should be callable multiple times with same result', () => {
    const url1 = endpoints.healthCheck()
    const url2 = endpoints.healthCheck()

    expect(url1).toBe(url2)
  })
})

// ============================================================================
// Endpoint Integration Tests
// ============================================================================

describe('endpoints integration', () => {
  test('all endpoints should use webAppUrl', () => {
    const baseUrl = config.webAppUrl

    expect(endpoints.getAgent('test')).toStartWith(baseUrl)
    expect(endpoints.agentChat()).toStartWith(baseUrl)
    expect(endpoints.discoverAgents()).toStartWith(baseUrl)
    expect(endpoints.getUserImages('test')).toStartWith(baseUrl)
    expect(endpoints.getUserQuota('test')).toStartWith(baseUrl)
    expect(endpoints.healthCheck()).toStartWith(baseUrl)
  })

  test('all endpoints should return valid URLs', () => {
    const urls = [
      endpoints.getAgent('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'),
      endpoints.agentChat(),
      endpoints.discoverAgents(),
      endpoints.getUserImages('telegram_123456'),
      endpoints.getUserQuota('telegram_123456'),
      endpoints.healthCheck(),
    ]

    for (const url of urls) {
      expect(() => new URL(url)).not.toThrow()
    }
  })

  test('all endpoints should use correct protocol', () => {
    const urls = [
      endpoints.getAgent('test'),
      endpoints.agentChat(),
      endpoints.discoverAgents(),
      endpoints.getUserImages('test'),
      endpoints.getUserQuota('test'),
      endpoints.healthCheck(),
    ]

    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//)
    }
  })

  test('endpoints should have as const type enforcement', () => {
    // 'as const' provides TypeScript compile-time immutability, not runtime
    // This test just verifies endpoints are functions
    expect(typeof endpoints.getAgent).toBe('function')
    expect(typeof endpoints.agentChat).toBe('function')
    expect(typeof endpoints.healthCheck).toBe('function')
  })
})

// ============================================================================
// URL Construction Edge Cases
// ============================================================================

describe('endpoint URL construction edge cases', () => {
  test('should handle empty string parameters', () => {
    const url = endpoints.getAgent('')

    expect(url).toBe('http://localhost:3333/api/v1/agent/')
  })

  test('should handle very long addresses', () => {
    const longAddress = 'a'.repeat(100)
    const url = endpoints.getAgent(longAddress)

    expect(url).toContain(longAddress)
    expect(url).toStartWith('http://localhost:3333/api/v1/agent/')
  })

  test('should handle special characters in query params', () => {
    const userIdWithSpecialChars = 'user+name@test.com?query=value&foo=bar'
    const url = endpoints.getUserQuota(userIdWithSpecialChars)

    // Should be properly encoded
    expect(url).toContain('userId=')
    expect(url).not.toContain('?query=value')
    expect(url).not.toContain('&foo=bar')
  })

  test('should construct valid URLs for all endpoint types', () => {
    // GET endpoint with path param
    const getUrl = endpoints.getAgent('test-address')
    expect(getUrl).toMatch(/\/api\/v1\/agent\/test-address$/)

    // POST endpoint
    const postUrl = endpoints.agentChat()
    expect(postUrl).toMatch(/\/api\/agent\/chat$/)

    // GET endpoint with query param
    const queryUrl = endpoints.getUserQuota('test-user')
    expect(queryUrl).toMatch(/\/api\/v1\/quota\?userId=test-user$/)

    // GET endpoint no params
    const noParamUrl = endpoints.healthCheck()
    expect(noParamUrl).toMatch(/\/api\/v1\/health$/)
  })
})
