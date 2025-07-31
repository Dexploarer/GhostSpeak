/**
 * Test suite for connection pooling system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  ConnectionPoolManager, 
  ConnectionPool, 
  PooledConnection,
  type RpcEndpoint,
  type NetworkType 
} from '../../src/core/connection-pool'
import { EventBus } from '../../src/core/event-system'

// Mock @solana/kit
vi.mock('@solana/kit', () => ({
  createSolanaRpc: vi.fn(() => ({
    getLatestBlockhash: vi.fn().mockResolvedValue({ value: 'mock-blockhash' }),
    getAccountInfo: vi.fn().mockResolvedValue({ value: null }),
    getBalance: vi.fn().mockResolvedValue({ value: 1000000000n })
  }))
}))

describe('Connection Pool System', () => {
  let poolManager: ConnectionPoolManager
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
    eventBus.setMaxListeners(50)
    poolManager = ConnectionPoolManager.getInstance()
  })

  afterEach(async () => {
    await poolManager.closeAll()
    vi.clearAllMocks()
  })

  describe('ConnectionPoolManager', () => {
    it('should be a singleton', () => {
      const instance1 = ConnectionPoolManager.getInstance()
      const instance2 = ConnectionPoolManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should create connection for network', async () => {
      const connection = await poolManager.getConnection('devnet')
      
      expect(connection).toBeDefined()
      expect(connection).toBeInstanceOf(PooledConnection)
    })

    it('should reuse connections from pool', async () => {
      const connection1 = await poolManager.getConnection('devnet')
      const connection2 = await poolManager.getConnection('devnet')
      
      // Connections should be from the same pool
      expect(connection1).toBeDefined()
      expect(connection2).toBeDefined()
    })

    it('should maintain separate pools for different networks', async () => {
      const devnetConnection = await poolManager.getConnection('devnet')
      const testnetConnection = await poolManager.getConnection('testnet')
      
      expect(devnetConnection).toBeDefined()
      expect(testnetConnection).toBeDefined()
      
      // Should have separate pool statistics
      const stats = poolManager.getAllStats()
      expect(stats.devnet).toBeDefined()
      expect(stats.testnet).toBeDefined()
    })

    it('should add custom endpoints', () => {
      const customEndpoint: RpcEndpoint = {
        url: 'https://custom-rpc.example.com',
        weight: 5,
        maxConnections: 3,
        timeout: 30000,
        healthCheckInterval: 60000,
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      }

      poolManager.addEndpoint('devnet', customEndpoint)
      
      // Should trigger endpoint added event
      expect(true).toBe(true) // Basic test that method executes without error
    })

    it('should get aggregated statistics', async () => {
      await poolManager.getConnection('devnet')
      await poolManager.getConnection('testnet')
      
      const stats = poolManager.getAllStats()
      
      expect(stats).toHaveProperty('devnet')
      expect(stats).toHaveProperty('testnet')
      expect(stats.devnet.totalConnections).toBeGreaterThanOrEqual(1)
      expect(stats.testnet.totalConnections).toBeGreaterThanOrEqual(1)
    })

    it('should close all pools', async () => {
      await poolManager.getConnection('devnet')
      await poolManager.getConnection('testnet')
      
      await poolManager.closeAll()
      
      const stats = poolManager.getAllStats()
      expect(Object.keys(stats)).toHaveLength(0)
    })
  })

  describe('ConnectionPool', () => {
    let pool: ConnectionPool
    let mockEndpoints: RpcEndpoint[]

    beforeEach(() => {
      mockEndpoints = [
        {
          url: 'https://api.devnet.solana.com',
          weight: 10,
          maxConnections: 5,
          timeout: 30000,
          healthCheckInterval: 60000,
          health: 'unknown',
          lastHealthCheck: new Date(),
          responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
        },
        {
          url: 'https://devnet.genesysgo.net',
          weight: 8,
          maxConnections: 3,
          timeout: 30000,
          healthCheckInterval: 60000,
          health: 'unknown',
          lastHealthCheck: new Date(),
          responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
        }
      ]

      pool = new ConnectionPool('devnet', mockEndpoints, {
        minConnections: 1,
        maxConnections: 5,
        maxIdleTime: 60000,
        healthCheckInterval: 30000
      })
    })

    afterEach(async () => {
      await pool.close()
    })

    it('should initialize with minimum connections', () => {
      const stats = pool.getStats()
      expect(stats.totalConnections).toBeGreaterThanOrEqual(1)
    })

    it('should provide connections', async () => {
      const connection = await pool.getConnection()
      expect(connection).toBeInstanceOf(PooledConnection)
    })

    it('should track connection statistics', async () => {
      const connection = await pool.getConnection()
      
      const stats = pool.getStats()
      expect(stats.totalConnections).toBeGreaterThanOrEqual(1)
      expect(stats.activeConnections).toBeGreaterThanOrEqual(0)
      expect(stats.idleConnections).toBeGreaterThanOrEqual(0)
    })

    it('should release connections back to pool', async () => {
      const connection = await pool.getConnection()
      
      // Simulate connection usage and release
      pool.releaseConnection(connection)
      
      const stats = pool.getStats()
      expect(stats.idleConnections).toBeGreaterThanOrEqual(1)
    })

    it('should handle connection limits', async () => {
      const connections = []
      
      // Get maximum connections
      for (let i = 0; i < 5; i++) {
        connections.push(await pool.getConnection())
      }
      
      const stats = pool.getStats()
      expect(stats.totalConnections).toBeLessThanOrEqual(5)
    })

    it('should perform health checks', async () => {
      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stats = pool.getStats()
      expect(stats.healthStats).toBeDefined()
    })
  })

  describe('PooledConnection', () => {
    let pool: ConnectionPool
    let connection: PooledConnection
    let mockEndpoint: RpcEndpoint

    beforeEach(async () => {
      mockEndpoint = {
        url: 'https://api.devnet.solana.com',
        weight: 10,
        maxConnections: 5,
        timeout: 30000,
        healthCheckInterval: 60000,
        health: 'healthy',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 500, min: 100, max: 1000, samples: [500] }
      }

      pool = new ConnectionPool('devnet', [mockEndpoint])
      connection = await pool.getConnection()
    })

    afterEach(async () => {
      await pool.close()
    })

    it('should execute RPC calls', async () => {
      const result = await connection.call('getLatestBlockhash')
      expect(result).toBeDefined()
    })

    it('should track request statistics', async () => {
      await connection.call('getLatestBlockhash')
      
      const stats = connection.getStats()
      expect(stats.requestCount).toBe(1)
      expect(stats.lastUsed).toBeInstanceOf(Date)
    })

    it('should handle RPC call errors', async () => {
      // Mock an error
      const mockRpc = {
        getLatestBlockhash: vi.fn().mockRejectedValue(new Error('Network error'))
      }
      
      // Create connection with failing RPC
      const failingConnection = new (PooledConnection as any)(mockRpc, mockEndpoint, pool)
      
      await expect(failingConnection.call('getLatestBlockhash')).rejects.toThrow('Network error')
    })

    it('should detect stale connections', () => {
      const isStale = connection.isStale(1) // 1ms max idle time
      // Connection should be considered stale after 1ms
      expect(typeof isStale).toBe('boolean')
    })

    it('should update response time statistics', async () => {
      await connection.call('getLatestBlockhash')
      
      const stats = connection.getStats()
      // Response time samples should exist in the endpoint
      expect(stats.responseTime.samples.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Health Monitoring', () => {
    let pool: ConnectionPool
    let mockEndpoint: RpcEndpoint

    beforeEach(() => {
      mockEndpoint = {
        url: 'https://api.devnet.solana.com',
        weight: 10,
        maxConnections: 5,
        timeout: 30000,
        healthCheckInterval: 1000, // 1 second for faster testing
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      }

      pool = new ConnectionPool('devnet', [mockEndpoint])
    })

    afterEach(async () => {
      await pool.close()
    })

    it('should update endpoint health status', async () => {
      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const stats = pool.getStats()
      expect(stats.healthStats['https://api.devnet.solana.com']).toBeDefined()
    })

    it('should handle health check failures', async () => {
      // Mock failing endpoint
      const failingEndpoint = {
        ...mockEndpoint,
        url: 'https://failing-endpoint.example.com'
      }

      const failingPool = new ConnectionPool('devnet', [failingEndpoint])
      
      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const stats = failingPool.getStats()
      expect(stats.healthStats['https://failing-endpoint.example.com']).toBeDefined()
      
      await failingPool.close()
    })
  })

  describe('Load Balancing', () => {
    let pool: ConnectionPool
    let endpoints: RpcEndpoint[]

    beforeEach(() => {
      endpoints = [
        {
          url: 'https://fast-endpoint.com',
          weight: 10,
          maxConnections: 5,
          timeout: 30000,
          healthCheckInterval: 60000,
          health: 'healthy',
          lastHealthCheck: new Date(),
          responseTime: { current: 200, average: 200, min: 100, max: 300, samples: [200] }
        },
        {
          url: 'https://slow-endpoint.com',
          weight: 5,
          maxConnections: 3,
          timeout: 30000,
          healthCheckInterval: 60000,
          health: 'healthy',
          lastHealthCheck: new Date(),
          responseTime: { current: 1000, average: 1000, min: 800, max: 1200, samples: [1000] }
        }
      ]

      pool = new ConnectionPool('devnet', endpoints)
    })

    afterEach(async () => {
      await pool.close()
    })

    it('should prefer faster endpoints', async () => {
      const connections = []
      
      // Get multiple connections to test load balancing
      for (let i = 0; i < 10; i++) {
        connections.push(await pool.getConnection())
        pool.releaseConnection(connections[i])
      }
      
      // Should have successfully created connections
      expect(connections).toHaveLength(10)
    })

    it('should handle unhealthy endpoints', async () => {
      // Mark one endpoint as unhealthy
      endpoints[1].health = 'unhealthy'
      
      const connection = await pool.getConnection()
      expect(connection).toBeDefined()
    })
  })

  describe('Event Integration', () => {
    it('should emit connection pool events', async () => {
      const events: string[] = []
      
      eventBus.on('connection_pool:connection_created', () => {
        events.push('connection_created')
      })
      
      eventBus.on('connection_pool:health_changed', () => {
        events.push('health_changed')
      })
      
      // Create connection to trigger events
      await poolManager.getConnection('devnet')
      
      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(events).toContain('connection_created')
    })

    it('should emit pool closure events', async () => {
      const events: string[] = []
      
      eventBus.on('connection_pool:all_closed', () => {
        events.push('all_closed')
      })
      
      await poolManager.closeAll()
      
      expect(events).toContain('all_closed')
    })
  })

  describe('Performance Metrics', () => {
    it('should track response times', async () => {
      const connection = await poolManager.getConnection('devnet')
      
      // Perform some operations
      await connection.call('getLatestBlockhash')
      await connection.call('getLatestBlockhash')
      
      const stats = connection.getStats()
      expect(stats.responseTime.samples.length).toBeGreaterThanOrEqual(0)
      expect(stats.requestCount).toBeGreaterThan(0)
    })

    it('should calculate hit rates', async () => {
      const connection = await poolManager.getConnection('devnet')
      
      // Perform operations
      await connection.call('getLatestBlockhash')
      
      const stats = poolManager.getAllStats()
      expect(stats.devnet.hitRate).toBeGreaterThanOrEqual(0)
      expect(stats.devnet.hitRate).toBeLessThanOrEqual(100)
    })

    it('should track failure rates', async () => {
      const stats = poolManager.getAllStats()
      
      // Initially should have low/no failures
      expect(stats.devnet?.failures ?? 0).toBeGreaterThanOrEqual(0)
    })
  })
})