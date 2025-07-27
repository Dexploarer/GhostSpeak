/**
 * Connection Pool Tests
 * 
 * Tests connection pooling functionality including:
 * - Connection creation and reuse
 * - Pool size management
 * - Connection health checking
 * - Cache functionality
 * - Resource cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { address } from '@solana/addresses'

import { 
  SolanaConnectionPool, 
  getGlobalConnectionPool,
  setGlobalConnectionPool,
  closeGlobalConnectionPool
} from '../../../src/utils/connection-pool'
import type { ConnectionPoolConfig, CacheConfig } from '../../../src/utils/connection-pool'
import type { SolanaRpcClient } from '../../../src/utils/rpc-client'

// Helper to create mock RPC client
function createMockRpcClient(endpoint: string): SolanaRpcClient {
  return {
    endpoint,
    getAccountInfo: vi.fn().mockResolvedValue({
      lamports: 1000000000n,
      data: new Uint8Array(0),
      owner: address('11111111111111111111111111111111'),
      executable: false,
      rentEpoch: 361n
    }),
    getSlot: vi.fn().mockResolvedValue(12345n),
    getBalance: vi.fn().mockResolvedValue(1000000000n),
    sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000n
    })
  } as unknown as SolanaRpcClient
}

describe('SolanaConnectionPool', () => {
  let pool: SolanaConnectionPool
  let poolConfig: Partial<ConnectionPoolConfig>
  let cacheConfig: Partial<CacheConfig>
  
  beforeEach(() => {
    poolConfig = {
      maxConnections: 5,
      minConnections: 2,
      idleTimeoutMs: 300000,
      maxAgeMs: 3600000,
      validationIntervalMs: 60000,
      enableHealthChecks: true
    }

    cacheConfig = {
      maxSize: 1000,
      defaultTtlMs: 30000,
      accountTtlMs: 10000,
      transactionTtlMs: 300000,
      enableStats: true
    }

    pool = new SolanaConnectionPool(poolConfig, cacheConfig)
  })

  afterEach(() => {
    pool.close()
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should create and return a connection', async () => {
      const endpoint = 'https://api.devnet.solana.com'
      const client = await pool.getConnection(endpoint)
      
      expect(client).toBeDefined()
      expect(client.endpoint).toBe(endpoint)
    })

    it('should reuse existing connections', async () => {
      const endpoint = 'https://api.devnet.solana.com'
      
      const client1 = await pool.getConnection(endpoint)
      pool.releaseConnection(endpoint, client1)
      
      const client2 = await pool.getConnection(endpoint)
      
      // Should be the same instance
      expect(client2).toBe(client1)
    })

    it('should respect maximum connections limit', async () => {
      const endpoint = 'https://api.devnet.solana.com'
      const clients = []
      
      // Get max connections
      for (let i = 0; i < 5; i++) {
        clients.push(await pool.getConnection(endpoint))
      }
      
      // Try to get one more
      const extraClient = await pool.getConnection(endpoint)
      
      // Should reuse an existing connection
      expect(clients.includes(extraClient)).toBe(true)
    })

    it('should handle multiple endpoints', async () => {
      const endpoint1 = 'https://api.devnet.solana.com'
      const endpoint2 = 'https://devnet.genesysgo.net'
      
      const client1 = await pool.getConnection(endpoint1)
      const client2 = await pool.getConnection(endpoint2)
      
      expect(client1.endpoint).toBe(endpoint1)
      expect(client2.endpoint).toBe(endpoint2)
      expect(client1).not.toBe(client2)
    })
  })

  describe('Connection Health', () => {
    it('should validate connection health', async () => {
      const endpoint = 'https://api.devnet.solana.com'
      const client = await pool.getConnection(endpoint)
      
      const isHealthy = await pool.validateConnection(endpoint, client)
      
      expect(isHealthy).toBe(true)
      pool.releaseConnection(endpoint, client)
    })

    it('should clean up unhealthy connections', async () => {
      const endpoint = 'https://api.devnet.solana.com'
      const client = await pool.getConnection(endpoint)
      
      // Mock unhealthy response
      client.getSlot = vi.fn().mockRejectedValue(new Error('Connection failed'))
      
      const isHealthy = await pool.validateConnection(endpoint, client)
      expect(isHealthy).toBe(false)
      
      // Release and try to get again
      pool.releaseConnection(endpoint, client)
      const newClient = await pool.getConnection(endpoint)
      
      // Should be a different client
      expect(newClient).not.toBe(client)
    })

    it('should clean up old connections', async () => {
      // Create pool with short max age
      const shortLivedPool = new SolanaConnectionPool({
        ...poolConfig,
        maxAgeMs: 100 // 100ms for testing
      }, cacheConfig)
      
      const endpoint = 'https://api.devnet.solana.com'
      const client = await shortLivedPool.getConnection(endpoint)
      shortLivedPool.releaseConnection(endpoint, client)
      
      // Wait for connection to become old
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Force cleanup
      await shortLivedPool.cleanup()
      
      // Get connection again - should be new
      const newClient = await shortLivedPool.getConnection(endpoint)
      expect(newClient).not.toBe(client)
      
      shortLivedPool.close()
    })
  })

  describe('Cache Functionality', () => {
    it('should cache account data', async () => {
      const accountAddress = address('11111111111111111111111111111111')
      const cacheKey = pool.getCacheKey('getAccountInfo', accountAddress)
      
      // First call - cache miss
      const data1 = await pool.getCachedData(
        cacheKey,
        async () => ({
          lamports: 1000000000n,
          data: new Uint8Array(0),
          owner: address('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 361n
        }),
        10000 // 10 second TTL
      )
      
      // Second call - cache hit
      const data2 = await pool.getCachedData(
        cacheKey,
        async () => {
          throw new Error('Should not be called - data should be cached')
        },
        10000
      )
      
      expect(data2).toEqual(data1)
    })

    it('should respect cache TTL', async () => {
      const cacheKey = 'test-key'
      let callCount = 0
      
      const fetcher = async () => {
        callCount++
        return { value: callCount }
      }
      
      // First call
      const data1 = await pool.getCachedData(cacheKey, fetcher, 100) // 100ms TTL
      expect(data1.value).toBe(1)
      
      // Second call within TTL
      const data2 = await pool.getCachedData(cacheKey, fetcher, 100)
      expect(data2.value).toBe(1) // Same cached value
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Third call after TTL
      const data3 = await pool.getCachedData(cacheKey, fetcher, 100)
      expect(data3.value).toBe(2) // New value
    })

    it('should evict old cache entries when full', async () => {
      // Create pool with small cache
      const smallCachePool = new SolanaConnectionPool(poolConfig, {
        ...cacheConfig,
        maxSize: 3
      })
      
      // Fill cache
      for (let i = 0; i < 5; i++) {
        await smallCachePool.getCachedData(
          `key-${i}`,
          async () => ({ value: i }),
          30000
        )
      }
      
      // Check cache size
      const stats = smallCachePool.getStats()
      expect(stats.cacheSize).toBeLessThanOrEqual(3)
      
      smallCachePool.close()
    })
  })

  describe('Statistics', () => {
    it('should track pool statistics', async () => {
      const endpoint = 'https://api.devnet.solana.com'
      
      // Get initial stats
      const initialStats = pool.getStats()
      expect(initialStats.totalConnections).toBe(0)
      expect(initialStats.totalRequests).toBe(0)
      
      // Create connections and make requests
      const client1 = await pool.getConnection(endpoint)
      const client2 = await pool.getConnection(endpoint)
      
      pool.releaseConnection(endpoint, client1)
      
      const stats = pool.getStats()
      expect(stats.totalConnections).toBeGreaterThan(0)
      expect(stats.activeConnections).toBe(1) // client2 still active
      expect(stats.idleConnections).toBe(1) // client1 idle
      
      pool.releaseConnection(endpoint, client2)
    })

    it('should track cache statistics', async () => {
      const key1 = 'cache-key-1'
      const key2 = 'cache-key-2'
      
      // Cache miss
      await pool.getCachedData(key1, async () => ({ data: 'value1' }), 30000)
      
      // Cache hit
      await pool.getCachedData(key1, async () => ({ data: 'value1' }), 30000)
      
      // Another cache miss
      await pool.getCachedData(key2, async () => ({ data: 'value2' }), 30000)
      
      const stats = pool.getStats()
      expect(stats.cacheHits).toBe(1)
      expect(stats.cacheMisses).toBe(2)
      expect(stats.cacheSize).toBe(2)
    })
  })

  describe('Global Pool Management', () => {
    it('should manage global connection pool', () => {
      const customPool = new SolanaConnectionPool(poolConfig, cacheConfig)
      
      // Set global pool
      setGlobalConnectionPool(customPool)
      
      // Get global pool
      const globalPool = getGlobalConnectionPool()
      
      expect(globalPool).toBe(customPool)
    })

    it('should create default global pool when none exists', () => {
      // First, ensure no global pool exists
      closeGlobalConnectionPool()
      
      const globalPool = getGlobalConnectionPool()
      
      expect(globalPool).toBeInstanceOf(SolanaConnectionPool)
    })

    it('should close global pool', async () => {
      const customPool = new SolanaConnectionPool(poolConfig, cacheConfig)
      setGlobalConnectionPool(customPool)
      
      await closeGlobalConnectionPool()
      
      // Should create new pool when accessed
      const newGlobalPool = getGlobalConnectionPool()
      expect(newGlobalPool).not.toBe(customPool)
    })
  })

  describe('Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      const endpoint = 'https://unreachable.endpoint.com'
      
      // Mock connection failure
      vi.mocked(SolanaRpcClient).mockImplementationOnce(() => {
        throw new Error('Connection refused')
      })
      
      // Should retry and create new connection
      const client = await pool.getConnection(endpoint)
      expect(client).toBeDefined()
    })

    it('should handle cache errors', async () => {
      const cacheKey = 'error-key'
      let attempts = 0
      
      const flakyFetcher = async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('Temporary failure')
        }
        return { data: 'success' }
      }
      
      // Should retry on error
      const result = await pool.getCachedData(cacheKey, flakyFetcher, 30000)
      expect(result.data).toBe('success')
      expect(attempts).toBe(2)
    })
  })
})