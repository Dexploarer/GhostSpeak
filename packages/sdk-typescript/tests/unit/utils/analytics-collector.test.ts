/**
 * Unit tests for AnalyticsCollector
 * 
 * Tests real-time analytics collection, metrics aggregation,
 * streaming functionality, and dashboard integration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  generateKeyPairSigner, 
  address,
  type Address
} from '@solana/kit'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnalyticsCollector } from '../../src/client/instructions/AnalyticsCollector'
import type { AnalyticsCollectorConfig } from '../../src/client/instructions/AnalyticsCollector'
import { EscrowStatus } from '../../src/generated/types'

// Mock the Web3.js Connection
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    onAccountChange: vi.fn().mockReturnValue(1), // subscription id
    removeAccountChangeListener: vi.fn(),
    onProgramAccountChange: vi.fn().mockReturnValue(2),
    removeProgramAccountChangeListener: vi.fn(),
    getAccountInfo: vi.fn(),
    getProgramAccounts: vi.fn()
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
    equals: (other: any) => key === other.toString()
  }))
}))

// Mock analytics utilities
vi.mock('../../src/utils/analytics-streaming', () => ({
  createAnalyticsStreamer: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
    onEvent: vi.fn(),
    getEventCount: vi.fn().mockReturnValue(0)
  }),
  AnalyticsStreamer: vi.fn()
}))

vi.mock('../../src/utils/analytics-aggregation', () => ({
  AnalyticsAggregator: vi.fn().mockImplementation(() => ({
    addMetric: vi.fn(),
    getAggregatedMetrics: vi.fn().mockReturnValue({
      period: { start: 0n, end: 1000n },
      agents: { total: 10, active: 5, new: 2 },
      transactions: { count: 100, volume: 1000000n, averageValue: 10000n },
      marketplace: { listings: 50, sales: 20, volume: 500000n },
      network: { latency: 100n, throughput: 1000n, errorRate: 50 }
    }),
    reset: vi.fn()
  }))
}))

// Mock generated decoders
vi.mock('../../src/generated/accounts', () => ({
  getAgentDecoder: vi.fn().mockReturnValue({
    decode: (data: any) => data
  }),
  getServiceListingDecoder: vi.fn().mockReturnValue({
    decode: (data: any) => data
  }),
  getJobPostingDecoder: vi.fn().mockReturnValue({
    decode: (data: any) => data
  }),
  getEscrowDecoder: vi.fn().mockReturnValue({
    decode: (data: any) => data
  })
}))

describe('AnalyticsCollector', () => {
  let collector: AnalyticsCollector
  let mockConnection: vi.Mocked<Connection>
  let config: AnalyticsCollectorConfig
  let programId: Address

  beforeEach(() => {
    programId = address('GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy')
    mockConnection = new Connection('mock-endpoint') as vi.Mocked<Connection>
    
    config = {
      programId,
      connection: mockConnection,
      commitment: 'confirmed',
      collectionInterval: 1000, // 1 second for testing
      enableAutoCollection: false,
      retentionDays: 7,
      maxRetries: 3
    }

    collector = new AnalyticsCollector(config)
  })

  afterEach(() => {
    collector.stopAutoCollection()
    vi.clearAllMocks()
  })

  describe('Network Metrics Collection', () => {
    it('should collect network metrics', async () => {
      // Mock active agents
      const mockAgents = [
        { pubkey: new PublicKey('Agent111'), data: { isActive: true, createdAt: Date.now() / 1000 } },
        { pubkey: new PublicKey('Agent222'), data: { isActive: true, createdAt: Date.now() / 1000 } },
        { pubkey: new PublicKey('Agent333'), data: { isActive: false, createdAt: Date.now() / 1000 } }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce(mockAgents) // For active agents count
        .mockResolvedValueOnce([]) // For transactions

      const metrics = await collector.collectNetworkMetrics()

      expect(metrics.activeAgents).toBe(2) // Only active agents
      expect(metrics.transactionThroughput).toBeGreaterThanOrEqual(0n)
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0n)
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0)
      expect(metrics.errorRate).toBeLessThanOrEqual(10000) // Max basis points
    })

    it('should handle network errors gracefully', async () => {
      mockConnection.getProgramAccounts = vi.fn()
        .mockRejectedValue(new Error('Network error'))

      const metrics = await collector.collectNetworkMetrics()

      // Should return default metrics on error
      expect(metrics.activeAgents).toBe(0)
      expect(metrics.transactionThroughput).toBe(0n)
      expect(metrics.averageLatency).toBe(0n)
      expect(metrics.errorRate).toBe(0)
    })

    it('should calculate error rate correctly', async () => {
      // Mock transactions with some errors
      const mockTransactions = [
        { data: { status: 'success' } },
        { data: { status: 'success' } },
        { data: { status: 'error' } },
        { data: { status: 'success' } },
        { data: { status: 'error' } }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce([]) // For agents
        .mockResolvedValueOnce(mockTransactions) // For transactions

      const metrics = await collector.collectNetworkMetrics()

      // 2 errors out of 5 transactions = 40% = 4000 basis points
      expect(metrics.errorRate).toBe(4000)
    })
  })

  describe('Marketplace Metrics Collection', () => {
    it('should collect marketplace metrics', async () => {
      const mockListings = [
        { 
          data: { 
            isActive: true, 
            price: 100_000_000n,
            creator: 'Seller1',
            listingId: '1'
          } 
        },
        { 
          data: { 
            isActive: true, 
            price: 200_000_000n,
            creator: 'Seller2',
            listingId: '2'
          } 
        },
        { 
          data: { 
            isActive: false, 
            price: 150_000_000n,
            creator: 'Seller1',
            listingId: '3'
          } 
        }
      ]

      const mockPurchases = [
        { 
          data: { 
            buyer: 'Buyer1',
            seller: 'Seller1',
            amount: 100_000_000n
          } 
        },
        { 
          data: { 
            buyer: 'Buyer2',
            seller: 'Seller2',
            amount: 200_000_000n
          } 
        }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce(mockListings) // For listings
        .mockResolvedValueOnce(mockPurchases) // For purchases

      const metrics = await collector.collectMarketplaceMetrics()

      expect(metrics.totalListings).toBe(3)
      expect(metrics.activeListings).toBe(2)
      expect(metrics.averagePrice).toBe(150_000_000n) // Average of all prices
      expect(metrics.totalVolume).toBe(300_000_000n) // Sum of purchases
      expect(metrics.uniqueBuyers).toBe(2)
      expect(metrics.uniqueSellers).toBe(2)
    })

    it('should handle empty marketplace', async () => {
      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValue([])

      const metrics = await collector.collectMarketplaceMetrics()

      expect(metrics.totalListings).toBe(0)
      expect(metrics.activeListings).toBe(0)
      expect(metrics.averagePrice).toBe(0n)
      expect(metrics.totalVolume).toBe(0n)
      expect(metrics.uniqueBuyers).toBe(0)
      expect(metrics.uniqueSellers).toBe(0)
    })
  })

  describe('Economic Metrics Collection', () => {
    it('should collect economic metrics', async () => {
      const mockEscrows = [
        { 
          data: { 
            amount: 500_000_000n,
            status: EscrowStatus.Active,
            createdAt: BigInt(Date.now() / 1000 - 3600) // 1 hour ago
          } 
        },
        { 
          data: { 
            amount: 300_000_000n,
            status: EscrowStatus.Active,
            createdAt: BigInt(Date.now() / 1000 - 7200) // 2 hours ago
          } 
        },
        { 
          data: { 
            amount: 200_000_000n,
            status: EscrowStatus.Released,
            createdAt: BigInt(Date.now() / 1000 - 86400) // 1 day ago
          } 
        }
      ]

      const mockTransactions = [
        { data: { amount: 100_000_000n, fee: 1_000_000n } },
        { data: { amount: 200_000_000n, fee: 2_000_000n } },
        { data: { amount: 150_000_000n, fee: 1_500_000n } }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce(mockEscrows) // For TVL
        .mockResolvedValueOnce(mockTransactions) // For volume
        .mockResolvedValueOnce([]) // For daily active users

      const metrics = await collector.collectEconomicMetrics()

      expect(metrics.totalValueLocked).toBe(800_000_000n) // Only active escrows
      expect(metrics.transactionVolume).toBe(450_000_000n) // Sum of transaction amounts
      expect(metrics.feeRevenue).toBe(4_500_000n) // Sum of fees
      expect(metrics.dailyActiveUsers).toBe(0)
      expect(metrics.dailyVolume).toBeGreaterThanOrEqual(0n)
      expect(metrics.tokenCirculation).toBeGreaterThan(0n) // Placeholder value
    })

    it('should calculate daily metrics correctly', async () => {
      const now = Date.now() / 1000
      const todayStart = Math.floor(now / 86400) * 86400

      const mockTransactions = [
        { 
          data: { 
            amount: 100_000_000n, 
            timestamp: BigInt(todayStart + 3600) // Today
          } 
        },
        { 
          data: { 
            amount: 200_000_000n, 
            timestamp: BigInt(todayStart + 7200) // Today
          } 
        },
        { 
          data: { 
            amount: 150_000_000n, 
            timestamp: BigInt(todayStart - 3600) // Yesterday
          } 
        }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce([]) // For escrows
        .mockResolvedValueOnce(mockTransactions) // For volume
        .mockResolvedValueOnce([]) // For daily active users

      const metrics = await collector.collectEconomicMetrics()

      // Only today's transactions should count for daily volume
      expect(metrics.dailyVolume).toBe(300_000_000n)
    })
  })

  describe('Agent Performance Tracking', () => {
    it('should track agent performance metrics', async () => {
      const agentId = address('Agent111111111111111111111111111111111111111')
      
      const mockTasks = [
        { data: { status: 'completed', responseTime: 3600n, rating: 9000 } },
        { data: { status: 'completed', responseTime: 7200n, rating: 8500 } },
        { data: { status: 'failed', responseTime: 0n, rating: 0 } },
        { data: { status: 'completed', responseTime: 5400n, rating: 9500 } }
      ]

      const mockEarnings = [
        { data: { amount: 100_000_000n } },
        { data: { amount: 200_000_000n } },
        { data: { amount: 150_000_000n } }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce(mockTasks) // For task data
        .mockResolvedValueOnce(mockEarnings) // For earnings

      const performance = await collector.trackAgentPerformance(agentId)

      expect(performance.agentId).toBe(agentId)
      expect(performance.taskCompletionRate).toBe(7500) // 3 out of 4 = 75%
      expect(performance.responseTime).toBe(5400n) // Average of completed tasks
      expect(performance.userRating).toBe(9000) // Average rating
      expect(performance.totalEarnings).toBe(450_000_000n)
      expect(performance.performanceScore).toBeGreaterThan(0)
      expect(performance.transactionCount).toBe(3)
    })

    it('should handle agents with no activity', async () => {
      const agentId = address('NewAgent11111111111111111111111111111111111')
      
      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValue([])

      const performance = await collector.trackAgentPerformance(agentId)

      expect(performance.agentId).toBe(agentId)
      expect(performance.taskCompletionRate).toBe(0)
      expect(performance.responseTime).toBe(0n)
      expect(performance.userRating).toBe(0)
      expect(performance.totalEarnings).toBe(0n)
      expect(performance.performanceScore).toBe(0)
    })

    it('should calculate performance score correctly', async () => {
      const agentId = address('Agent222222222222222222222222222222222222222')
      
      const mockTasks = [
        { data: { status: 'completed', responseTime: 3600n, rating: 10000 } }, // Perfect rating
        { data: { status: 'completed', responseTime: 3600n, rating: 10000 } },
        { data: { status: 'completed', responseTime: 3600n, rating: 10000 } },
        { data: { status: 'completed', responseTime: 3600n, rating: 10000 } }
      ]

      mockConnection.getProgramAccounts = vi.fn()
        .mockResolvedValueOnce(mockTasks)
        .mockResolvedValueOnce([])

      const performance = await collector.trackAgentPerformance(agentId)

      expect(performance.taskCompletionRate).toBe(10000) // 100%
      expect(performance.userRating).toBe(10000) // Perfect rating
      expect(performance.performanceScore).toBe(10000) // Should be maximum
    })
  })

  describe('Auto Collection', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should start and stop auto collection', () => {
      const collectorWithAuto = new AnalyticsCollector({
        ...config,
        enableAutoCollection: true,
        collectionInterval: 5000
      })

      // Collection should be running
      expect(collectorWithAuto['collectionTimer']).toBeDefined()

      // Stop collection
      collectorWithAuto.stopAutoCollection()
      expect(collectorWithAuto['collectionTimer']).toBeUndefined()
    })

    it('should collect metrics at intervals', async () => {
      const collectAllSpy = vi.spyOn(collector, 'collectAllMetrics')
      collector.startAutoCollection()

      // Advance timer
      vi.advanceTimersByTime(config.collectionInterval!)
      await Promise.resolve() // Let promises resolve

      expect(collectAllSpy).toHaveBeenCalledTimes(1)

      // Advance again
      vi.advanceTimersByTime(config.collectionInterval!)
      await Promise.resolve()

      expect(collectAllSpy).toHaveBeenCalledTimes(2)

      collector.stopAutoCollection()
    })
  })

  describe('Analytics Streaming', () => {
    it('should start streaming analytics', async () => {
      const { createAnalyticsStreamer } = await import('../../src/utils/analytics-streaming')
      const mockStreamer = {
        start: vi.fn(),
        stop: vi.fn(),
        onEvent: vi.fn(),
        getEventCount: vi.fn().mockReturnValue(5)
      }
      ;(createAnalyticsStreamer as vi.Mock).mockReturnValue(mockStreamer)

      const options = {
        enableAgentEvents: true,
        enableTransactionEvents: true,
        enableMarketplaceEvents: true
      }

      await collector.startStreaming(options)

      expect(createAnalyticsStreamer).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: mockConnection,
          programId,
          options
        })
      )
      expect(mockStreamer.start).toHaveBeenCalled()
    })

    it('should stop streaming', async () => {
      const { createAnalyticsStreamer } = await import('../../src/utils/analytics-streaming')
      const mockStreamer = {
        start: vi.fn(),
        stop: vi.fn(),
        onEvent: vi.fn(),
        getEventCount: vi.fn()
      }
      ;(createAnalyticsStreamer as vi.Mock).mockReturnValue(mockStreamer)

      await collector.startStreaming({})
      collector.stopStreaming()

      expect(mockStreamer.stop).toHaveBeenCalled()
    })
  })

  describe('Aggregated Metrics', () => {
    it('should collect all metrics and aggregate', async () => {
      // Mock all individual metric collections
      vi.spyOn(collector, 'collectNetworkMetrics').mockResolvedValue({
        activeAgents: 10,
        transactionThroughput: 1000n,
        averageLatency: 50n,
        errorRate: 100
      })

      vi.spyOn(collector, 'collectMarketplaceMetrics').mockResolvedValue({
        totalListings: 50,
        activeListings: 40,
        averagePrice: 100_000_000n,
        totalVolume: 1_000_000_000n,
        uniqueBuyers: 20,
        uniqueSellers: 15
      })

      vi.spyOn(collector, 'collectEconomicMetrics').mockResolvedValue({
        totalValueLocked: 5_000_000_000n,
        dailyActiveUsers: 100,
        transactionVolume: 2_000_000_000n,
        dailyVolume: 500_000_000n,
        feeRevenue: 10_000_000n,
        tokenCirculation: 100_000_000_000n
      })

      const allMetrics = await collector.collectAllMetrics()

      expect(allMetrics.network).toBeDefined()
      expect(allMetrics.marketplace).toBeDefined()
      expect(allMetrics.economic).toBeDefined()
      expect(allMetrics.timestamp).toBeGreaterThan(0n)
    })

    it('should get aggregated metrics from aggregator', () => {
      const aggregated = collector.getAggregatedMetrics()

      expect(aggregated.period).toBeDefined()
      expect(aggregated.agents).toBeDefined()
      expect(aggregated.transactions).toBeDefined()
      expect(aggregated.marketplace).toBeDefined()
      expect(aggregated.network).toBeDefined()
    })
  })

  describe('Error Handling and Retries', () => {
    it('should retry failed collections', async () => {
      let callCount = 0
      mockConnection.getProgramAccounts = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve([])
      })

      const metrics = await collector.collectNetworkMetrics()

      expect(callCount).toBe(3) // Should succeed on third try
      expect(metrics).toBeDefined()
    })

    it('should give up after max retries', async () => {
      mockConnection.getProgramAccounts = vi.fn()
        .mockRejectedValue(new Error('Persistent failure'))

      const metrics = await collector.collectNetworkMetrics()

      expect(mockConnection.getProgramAccounts).toHaveBeenCalledTimes(config.maxRetries)
      expect(metrics.activeAgents).toBe(0) // Should return default metrics
    })
  })

  describe('Dashboard Integration', () => {
    it('should export metrics for dashboard consumption', async () => {
      const exportedMetrics = await collector.exportForDashboard()

      expect(exportedMetrics).toHaveProperty('network')
      expect(exportedMetrics).toHaveProperty('marketplace')
      expect(exportedMetrics).toHaveProperty('economic')
      expect(exportedMetrics).toHaveProperty('aggregated')
      expect(exportedMetrics).toHaveProperty('timestamp')
      expect(exportedMetrics).toHaveProperty('collectorVersion')
    })

    it('should format metrics for specific dashboard types', async () => {
      const grafanaMetrics = await collector.exportForDashboard('grafana')
      expect(grafanaMetrics).toBeDefined()
      
      const prometheusMetrics = await collector.exportForDashboard('prometheus')
      expect(prometheusMetrics).toBeDefined()
    })
  })
})