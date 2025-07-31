import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSolanaRpc, address, generateKeyPairSigner } from '@solana/kit'

import { GhostSpeakClient } from '../../src/index.js'
import { 
  AnalyticsCollector,
  type AnalyticsCollectorConfig
} from '../../src/client/instructions/AnalyticsCollector.js'
import { 
  AnalyticsStreamer,
  createAnalyticsStreamer,
  type AgentAnalyticsEvent,
  type TransactionAnalyticsEvent,
  type MarketplaceActivityEvent,
  type NetworkHealthEvent
} from '../../src/utils/analytics-streaming.js'
import { 
  AnalyticsAggregator,
  AggregationWindow 
} from '../../src/utils/analytics-aggregation.js'

// Mock connection
const mockConnection = {
  rpcEndpoint: 'http://localhost:8899',
  commitment: 'confirmed',
  getSignaturesForAddress: vi.fn(),
  getProgramAccounts: vi.fn(),
  getAccountInfo: vi.fn(),
  getTransaction: vi.fn(),
  onLogs: vi.fn()
} as unknown as Connection

describe('Analytics Integration Tests', () => {
  let client: GhostSpeakClient
  let collector: AnalyticsCollector
  let aggregator: AnalyticsAggregator

  beforeEach(() => {
    vi.clearAllMocks()
    
    client = new GhostSpeakClient({
      rpc: 'http://localhost:8899',
      cluster: 'devnet'
    })
    
    // Override connection
    Object.defineProperty(client, 'connection', {
      value: mockConnection,
      writable: true
    })
  })

  afterEach(() => {
    if (collector) {
      collector.stopAutoCollection()
    }
  })

  describe('Analytics Collection', () => {
    it('should collect network metrics', async () => {
      // Mock RPC responses
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'sig1', blockTime: Date.now() / 1000 - 1800, err: null },
        { signature: 'sig2', blockTime: Date.now() / 1000 - 900, err: null },
        { signature: 'sig3', blockTime: Date.now() / 1000 - 300, err: null }
      ])
      
      mockConnection.getProgramAccounts.mockResolvedValue([
        { 
          pubkey: new PublicKey('11111111111111111111111111111111'),
          account: { 
            data: Buffer.alloc(176), // Agent account size
            lamports: 1000000,
            owner: new PublicKey('11111111111111111111111111111111')
          }
        }
      ])

      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection,
        commitment: 'confirmed'
      }
      
      collector = new AnalyticsCollector(config)
      const result = await collector.collectNetworkMetrics()
      
      expect(result).toBe('network-metrics-collected')
      expect(mockConnection.getSignaturesForAddress).toHaveBeenCalled()
      expect(mockConnection.getProgramAccounts).toHaveBeenCalled()
    })

    it('should collect marketplace metrics', async () => {
      // Mock service listings and job postings
      mockConnection.getProgramAccounts.mockResolvedValue([
        { 
          pubkey: new PublicKey('11111111111111111111111111111111'),
          account: { 
            data: Buffer.alloc(344), // ServiceListing size
            lamports: 1000000,
            owner: new PublicKey('11111111111111111111111111111111')
          }
        }
      ])

      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      const result = await collector.collectMarketplaceMetrics()
      
      expect(result).toBe('marketplace-metrics-collected')
      expect(mockConnection.getProgramAccounts).toHaveBeenCalled()
    })

    it('should collect economic metrics', async () => {
      // Mock escrow accounts
      mockConnection.getProgramAccounts.mockResolvedValue([
        { 
          pubkey: new PublicKey('11111111111111111111111111111111'),
          account: { 
            data: Buffer.alloc(128), // Escrow size
            lamports: 10000000,
            owner: new PublicKey('11111111111111111111111111111111')
          }
        }
      ])
      
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'sig1', blockTime: Date.now() / 1000 - 3600, err: null }
      ])

      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      const result = await collector.collectEconomicMetrics()
      
      expect(result).toBe('economic-metrics-collected')
    })

    it('should handle collection failures gracefully', async () => {
      // Mock RPC failure
      mockConnection.getSignaturesForAddress.mockRejectedValue(new Error('RPC Error'))

      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      const result = await collector.collectNetworkMetrics()
      
      expect(result).toBe('network-metrics-failed')
    })
  })

  describe('Real-time Streaming', () => {
    it('should start and stop streaming', async () => {
      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      
      // Mock onLogs subscription
      const mockSubscriptionId = 12345
      mockConnection.onLogs.mockReturnValue(mockSubscriptionId)
      
      await collector.startStreaming({
        programId: address('11111111111111111111111111111111'),
        commitment: 'confirmed'
      })
      
      expect(mockConnection.onLogs).toHaveBeenCalled()
      
      await collector.stopStreaming()
    })

    it('should process streaming events', async () => {
      aggregator = new AnalyticsAggregator()
      
      // Create test events
      const agentEvent: AgentAnalyticsEvent = {
        timestamp: BigInt(Date.now() / 1000),
        agent: address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
        operation: 'task_complete',
        revenue: 1000000n,
        responseTime: 500n,
        successRate: 95,
        averageRating: 85,
        transactionCount: 10
      }
      
      const txEvent: TransactionAnalyticsEvent = {
        timestamp: BigInt(Date.now() / 1000),
        signature: 'sig123',
        transactionType: 'service_purchase',
        amount: 5000000n,
        fee: 125000n,
        parties: {
          from: address('11111111111111111111111111111111'),
          to: address('22222222222222222222222222222222')
        },
        status: 'completed'
      }
      
      // Process events
      aggregator.processAgentEvent(agentEvent)
      aggregator.processTransactionEvent(txEvent)
      
      // Get aggregated metrics
      const metrics = aggregator.getAggregatedMetrics(AggregationWindow.Hour)
      
      expect(metrics.agents.totalActive).toBeGreaterThan(0)
      expect(metrics.transactions.totalCount).toBeGreaterThan(0)
      expect(metrics.transactions.totalVolume).toBe(5000000n)
    })
  })

  describe('Agent Performance Tracking', () => {
    it('should track agent performance metrics', async () => {
      const agentId = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Mock agent account data
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.alloc(176), // Mock agent data
        lamports: 1000000,
        owner: new PublicKey('11111111111111111111111111111111')
      })

      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      const performance = await collector.trackAgentPerformance(agentId)
      
      expect(performance.agentId).toBe(agentId)
      expect(performance.totalJobs).toBeGreaterThanOrEqual(0)
      expect(performance.completionRate).toBeGreaterThanOrEqual(0)
      expect(performance.completionRate).toBeLessThanOrEqual(100)
    })
  })

  describe('Data Export', () => {
    it('should export analytics data in JSON format', async () => {
      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      
      // Add some test data
      const timestamp = BigInt(Date.now() / 1000)
      collector['aggregator'].addMetric('test_metric', 100, timestamp)
      
      const jsonExport = collector.exportAnalytics('json')
      
      expect(jsonExport).toContain('timestamp')
      expect(jsonExport).toContain('value')
      expect(jsonExport).toContain('100')
    })

    it('should export analytics data in CSV format', async () => {
      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      
      // Add some test data
      const timestamp = BigInt(Date.now() / 1000)
      collector['aggregator'].addMetric('test_metric', 200, timestamp)
      
      const csvExport = collector.exportAnalytics('csv')
      
      expect(csvExport).toContain('timestamp,value')
      expect(csvExport).toContain('200')
    })

    it('should export for dashboard integration', async () => {
      // Mock RPC responses for metrics collection
      mockConnection.getSignaturesForAddress.mockResolvedValue([])
      mockConnection.getProgramAccounts.mockResolvedValue([])

      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection
      }
      
      collector = new AnalyticsCollector(config)
      
      // Test Grafana export
      const grafanaExport = await collector.exportForDashboard('grafana')
      expect(grafanaExport).toHaveProperty('datapoints')
      expect(grafanaExport).toHaveProperty('target')
      
      // Test Prometheus export
      const prometheusExport = await collector.exportForDashboard('prometheus')
      expect(typeof prometheusExport).toBe('string')
      expect(prometheusExport).toContain('ghostspeak_')
    })
  })

  describe('Auto Collection', () => {
    it('should start and stop auto collection', async () => {
      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection,
        collectionInterval: 100, // 100ms for testing
        enableAutoCollection: true
      }
      
      // Mock RPC responses
      mockConnection.getSignaturesForAddress.mockResolvedValue([])
      mockConnection.getProgramAccounts.mockResolvedValue([])
      
      collector = new AnalyticsCollector(config)
      
      // Wait for a collection cycle
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockConnection.getSignaturesForAddress).toHaveBeenCalled()
      
      collector.stopAutoCollection()
    })
  })

  describe('Data Aggregation', () => {
    it('should aggregate metrics over time windows', async () => {
      aggregator = new AnalyticsAggregator([
        AggregationWindow.Minute,
        AggregationWindow.Hour
      ])
      
      // Add multiple data points
      const baseTime = Date.now() / 1000
      for (let i = 0; i < 10; i++) {
        const timestamp = BigInt(Math.floor(baseTime - i * 10))
        aggregator.addMetric('active_agents', 50 + i, timestamp)
        aggregator.addMetric('transaction_volume', 1000000 * i, timestamp)
      }
      
      // Get aggregated metrics
      const minuteMetrics = aggregator.getAggregatedMetrics(AggregationWindow.Minute)
      const hourMetrics = aggregator.getAggregatedMetrics(AggregationWindow.Hour)
      
      expect(minuteMetrics.dataPoints).toBeGreaterThan(0)
      expect(hourMetrics.dataPoints).toBeGreaterThan(0)
    })

    it('should calculate percentiles correctly', async () => {
      aggregator = new AnalyticsAggregator()
      
      // Add response time data
      const responseTimes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
      const timestamp = BigInt(Date.now() / 1000)
      
      for (const time of responseTimes) {
        const event: AgentAnalyticsEvent = {
          timestamp,
          agent: address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
          operation: 'task_complete',
          revenue: 1000000n,
          responseTime: BigInt(time),
          successRate: 95,
          averageRating: 85,
          transactionCount: 1
        }
        aggregator.processAgentEvent(event)
      }
      
      const metrics = aggregator.getAggregatedMetrics(AggregationWindow.Hour)
      
      // P95 should be around 950 (95th percentile of 100-1000)
      expect(metrics.performance.p95ResponseTime).toBeGreaterThan(800)
      expect(metrics.performance.p95ResponseTime).toBeLessThanOrEqual(1000)
    })
  })

  describe('Data Pruning', () => {
    it('should prune old analytics data', async () => {
      const config: AnalyticsCollectorConfig = {
        programId: address('11111111111111111111111111111111'),
        connection: mockConnection,
        retentionDays: 7
      }
      
      collector = new AnalyticsCollector(config)
      aggregator = collector['aggregator']
      
      // Add old and new data
      const oldTimestamp = BigInt(Date.now() / 1000 - 8 * 24 * 60 * 60) // 8 days ago
      const newTimestamp = BigInt(Date.now() / 1000)
      
      aggregator.addMetric('old_metric', 100, oldTimestamp)
      aggregator.addMetric('new_metric', 200, newTimestamp)
      
      // Prune old data
      await collector.pruneAnalyticsData()
      
      // Check that old data is removed
      const allMetrics = aggregator.getAllMetrics()
      const hasOldData = allMetrics.some(m => m.timestamp === oldTimestamp)
      const hasNewData = allMetrics.some(m => m.timestamp === newTimestamp)
      
      expect(hasOldData).toBe(false)
      expect(hasNewData).toBe(true)
    })
  })
})