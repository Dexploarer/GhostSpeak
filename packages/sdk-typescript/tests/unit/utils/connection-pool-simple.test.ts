/**
 * Connection Pool Tests (Without Module Mocking)
 * 
 * Tests connection pooling functionality using dependency injection
 * instead of module mocking for better compatibility
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

describe('SolanaConnectionPool (Simple)', () => {
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

  describe('Cache Functionality', () => {
    it('should cache data with getCachedData', async () => {
      const key = 'test-key'
      const data = { value: 'test-data' }
      
      // First call - should fetch
      const result1 = await pool.getCachedData(
        key,
        async () => data,
        10000
      )
      
      expect(result1).toEqual(data)
      
      // Second call - should return cached
      const result2 = await pool.getCachedData(
        key,
        async () => {
          throw new Error('Should not be called')
        },
        10000
      )
      
      expect(result2).toEqual(data)
    })

    it('should generate cache keys', () => {
      const key1 = pool.getCacheKey('getBalance', ['address1'])
      const key2 = pool.getCacheKey('getBalance', ['address2'])
      const key3 = pool.getCacheKey('getAccountInfo', ['address1'])
      
      expect(key1).not.toBe(key2)
      expect(key1).not.toBe(key3)
      expect(key2).not.toBe(key3)
    })

    it('should respect TTL', async () => {
      const key = 'ttl-test'
      let callCount = 0
      
      const fetcher = async () => {
        callCount++
        return { count: callCount }
      }
      
      // First call
      const result1 = await pool.getCachedData(key, fetcher, 100) // 100ms TTL
      expect(result1.count).toBe(1)
      
      // Second call within TTL
      const result2 = await pool.getCachedData(key, fetcher, 100)
      expect(result2.count).toBe(1)
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Third call after TTL
      const result3 = await pool.getCachedData(key, fetcher, 100)
      expect(result3.count).toBe(2)
    })
  })

  describe('Statistics', () => {
    it('should track cache statistics', async () => {
      const key1 = 'stat-key-1'
      const key2 = 'stat-key-2'
      
      // Cache miss
      await pool.getCachedData(key1, async () => ({ data: 1 }), 30000)
      
      // Cache hit
      await pool.getCachedData(key1, async () => ({ data: 2 }), 30000)
      
      // Another cache miss
      await pool.getCachedData(key2, async () => ({ data: 3 }), 30000)
      
      const stats = pool.getStats()
      expect(stats.cacheHits).toBe(1)
      expect(stats.cacheMisses).toBe(2)
      expect(stats.cacheSize).toBe(2)
    })
  })

  describe('Global Pool Management', () => {
    afterEach(() => {
      closeGlobalConnectionPool()
    })

    it('should manage global connection pool', () => {
      const customPool = new SolanaConnectionPool(poolConfig, cacheConfig)
      
      setGlobalConnectionPool(customPool)
      const globalPool = getGlobalConnectionPool()
      
      expect(globalPool).toBe(customPool)
    })

    it('should create default global pool when none exists', () => {
      closeGlobalConnectionPool()
      
      const globalPool = getGlobalConnectionPool()
      
      expect(globalPool).toBeInstanceOf(SolanaConnectionPool)
    })
  })
})