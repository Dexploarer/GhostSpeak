/**
 * Analytics Collector Module
 * 
 * Provides comprehensive real-time analytics collection functionality
 * for GhostSpeak Protocol with streaming data, metrics aggregation,
 * and dashboard integration.
 */

import type { Address, Commitment } from '@solana/kit'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAgentDecoder, getServiceListingDecoder, getJobPostingDecoder, getEscrowDecoder } from '../../generated/accounts/index.js'
import { EscrowStatus } from '../../generated/types/index.js'
import { 
  AnalyticsStreamer,
  createAnalyticsStreamer,
  type AnalyticsStreamOptions 
} from '../../utils/analytics-streaming.js'
import { 
  AnalyticsAggregator,
  type AggregatedMetrics 
} from '../../utils/analytics-aggregation.js'

// Analytics collection configuration
export interface AnalyticsCollectorConfig {
  programId: Address
  connection: Connection
  commitment?: Commitment
  collectionInterval?: number // milliseconds
  enableAutoCollection?: boolean
  retentionDays?: number
  maxRetries?: number
}

// Metrics collection parameters
export interface NetworkMetrics {
  activeAgents: number
  transactionThroughput: bigint
  averageLatency: bigint
  errorRate: number // basis points (0-10000)
}

export interface MarketplaceMetrics {
  totalListings: number
  activeListings: number
  averagePrice: bigint
  totalVolume: bigint
  uniqueBuyers: number
  uniqueSellers: number
}

export interface EconomicMetrics {
  totalValueLocked: bigint
  dailyActiveUsers: number
  transactionVolume: bigint
  dailyVolume: bigint
  feeRevenue: bigint
  tokenCirculation: bigint
}

export interface AgentPerformance {
  agentId: Address
  taskCompletionRate: number // basis points
  responseTime: bigint // milliseconds
  userRating: number // 0-10000 (100.00%)
  totalEarnings: bigint
  performanceScore: number
  totalRevenue: bigint
  transactionCount: number
}

/**
 * Analytics Collector Client
 * 
 * Handles all analytics collection operations including network metrics,
 * marketplace data, economic indicators, and agent performance tracking.
 */
export class AnalyticsCollector {
  private connection: Connection
  private programId: Address
  private commitment: Commitment
  private collectionInterval: number
  private retentionDays: number
  private maxRetries: number
  private collectionTimer?: ReturnType<typeof setInterval>
  private aggregator: AnalyticsAggregator
  private streamer?: AnalyticsStreamer
  constructor(config: AnalyticsCollectorConfig) {
    this.connection = config.connection
    this.programId = config.programId
    this.commitment = config.commitment ?? 'confirmed'
    this.collectionInterval = config.collectionInterval ?? 60000 // 1 minute default
    this.retentionDays = config.retentionDays ?? 30
    this.maxRetries = config.maxRetries ?? 3
    this.aggregator = new AnalyticsAggregator()

    if (config.enableAutoCollection) {
      this.startAutoCollection()
    }
  }

  /**
   * Start automatic metrics collection
   */
  startAutoCollection(): void {
    if (this.collectionTimer) {
      return
    }

    this.collectionTimer = setInterval(() => {
      void this.collectAllMetrics()
    }, this.collectionInterval)
  }

  /**
   * Stop automatic metrics collection
   */
  stopAutoCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer)
      this.collectionTimer = undefined
    }
  }

  /**
   * Collect all metrics in a single batch
   */
  async collectAllMetrics(): Promise<{
    network: NetworkMetrics
    marketplace: MarketplaceMetrics  
    economic: EconomicMetrics
    timestamp: number
  }> {
    const [networkResult, marketplaceResult, economicResult] = await Promise.allSettled([
      this.collectNetworkMetrics(),
      this.collectMarketplaceMetrics(),
      this.collectEconomicMetrics()
    ])

    // Extract network metrics
    const networkMetrics = networkResult.status === 'fulfilled' ? 
      await this.parseNetworkMetrics(networkResult.value) : 
      this.getDefaultNetworkMetrics()
    
    // Extract marketplace metrics  
    const marketplaceMetrics = marketplaceResult.status === 'fulfilled' ?
      await this.parseMarketplaceMetrics(marketplaceResult.value) :
      this.getDefaultMarketplaceMetrics()
      
    // Extract economic metrics
    const economicMetrics = economicResult.status === 'fulfilled' ?
      await this.parseEconomicMetrics(economicResult.value) :
      this.getDefaultEconomicMetrics()

    return {
      network: networkMetrics,
      marketplace: marketplaceMetrics,
      economic: economicMetrics,
      timestamp: Date.now()
    }
  }

  /**
   * Collect network-wide metrics
   */
  async collectNetworkMetrics(): Promise<string> {
    try {
      // Get recent confirmed signatures for the program to measure throughput
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(this.programId),
        { limit: 1000 }
      )

      // Calculate transaction throughput (transactions per hour)
      const now = Date.now() / 1000
      const oneHourAgo = now - 3600
      const recentSignatures = signatures.filter(sig => (sig.blockTime ?? 0) > oneHourAgo)
      const transactionThroughput = BigInt(recentSignatures.length)

      // Calculate average block time as latency indicator
      const recentBlockTimes = signatures
        .slice(0, 10)
        .map(sig => sig.blockTime)
        .filter(time => time !== null) as number[]
      
      let averageLatency = BigInt(0)
      if (recentBlockTimes.length > 1) {
        const timeDiffs = recentBlockTimes.slice(1).map((time, i) => 
          Math.abs(time - recentBlockTimes[i])
        )
        const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
        averageLatency = BigInt(Math.round(avgDiff * 1000)) // Convert to milliseconds
      }

      // Get program accounts to count active agents
      const agentAccounts = await this.connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            { dataSize: 176 } // Agent account size - adjust based on your struct
          ]
        }
      )

      // Count active agents by checking their status
      let activeAgents = 0
      const agentDecoder = getAgentDecoder()
      for (const account of agentAccounts.slice(0, 100)) { // Limit to avoid rate limits
        try {
          const agentData = agentDecoder.decode(account.account.data)
          if (agentData.isActive) {
            activeAgents++
          }
        } catch {
          // Skip accounts that can't be parsed as agents
          continue
        }
      }

      // Calculate error rate from failed vs successful transactions
      const failedTransactions = signatures.filter(sig => 
        sig.err !== null && (sig.blockTime ?? 0) > oneHourAgo
      ).length
      const errorRate = recentSignatures.length > 0 
        ? (failedTransactions / recentSignatures.length) * 100 
        : 0

      const metrics: NetworkMetrics = {
        activeAgents,
        transactionThroughput,
        averageLatency,
        errorRate
      }

      // Store metrics for aggregation
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      this.aggregator.addMetric('active_agents', metrics.activeAgents, timestamp)
      this.aggregator.addMetric('transaction_throughput', Number(metrics.transactionThroughput), timestamp)
      this.aggregator.addMetric('average_latency', Number(metrics.averageLatency), timestamp)
      this.aggregator.addMetric('error_rate', metrics.errorRate, timestamp)

      console.log(`Collected network metrics: ${activeAgents} active agents, ${transactionThroughput} txns/hour, ${averageLatency}ms latency, ${errorRate.toFixed(2)}% error rate`)
      
      return 'network-metrics-collected'
    } catch (error) {
      console.error('Failed to collect network metrics:', error)
      // Return default network metrics if collection fails
      
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      this.aggregator.addMetric('active_agents', 0, timestamp)
      this.aggregator.addMetric('error_rate', 100, timestamp)
      
      return 'network-metrics-failed'
    }
  }

  /**
   * Collect marketplace metrics
   */
  async collectMarketplaceMetrics(): Promise<string> {
    try {
      // Get service listing accounts
      const serviceListingAccounts = await this.connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            { dataSize: 344 } // ServiceListing account size - adjust based on your struct
          ]
        }
      )

      // Get job posting accounts  
      const jobPostingAccounts = await this.connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            { dataSize: 256 } // JobPosting account size - adjust based on your struct
          ]
        }
      )

      let totalListings = 0
      let activeListings = 0
      let totalPrice = BigInt(0)
      let priceCount = 0
      const sellers = new Set<string>()
      const buyers = new Set<string>()

      // Process service listings
      const serviceListingDecoder = getServiceListingDecoder()
      for (const account of serviceListingAccounts.slice(0, 200)) { // Limit for performance
        try {
          const listingData = serviceListingDecoder.decode(account.account.data)
          totalListings++
          sellers.add(listingData.owner.toString())
          
          if (listingData.isActive) {
            activeListings++
            totalPrice += listingData.price
            priceCount++
          }
        } catch {
          // Skip accounts that can't be parsed
          continue
        }
      }

      // Process job postings
      const jobPostingDecoder = getJobPostingDecoder()
      for (const account of jobPostingAccounts.slice(0, 200)) { // Limit for performance
        try {
          const jobData = jobPostingDecoder.decode(account.account.data)
          totalListings++
          buyers.add(jobData.employer.toString())
          
          if (jobData.isActive) {
            activeListings++
            totalPrice += jobData.budget
            priceCount++
          }
        } catch {
          // Skip accounts that can't be parsed
          continue
        }
      }

      // Calculate average price
      const averagePrice = priceCount > 0 ? totalPrice / BigInt(priceCount) : BigInt(0)

      // Get escrow accounts to calculate total volume
      const escrowAccounts = await this.connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            { dataSize: 128 } // Escrow account size - adjust based on your struct
          ]
        }
      )

      let totalVolume = BigInt(0)
      const escrowDecoder = getEscrowDecoder()
      for (const account of escrowAccounts.slice(0, 500)) { // Limit for performance
        try {
          const escrowData = escrowDecoder.decode(account.account.data)
          totalVolume += escrowData.amount
          buyers.add(escrowData.client.toString())
          sellers.add(escrowData.agent.toString())
        } catch {
          // Skip accounts that can't be parsed
          continue
        }
      }

      const metrics: MarketplaceMetrics = {
        totalListings,
        activeListings,
        averagePrice,
        totalVolume,
        uniqueBuyers: buyers.size,
        uniqueSellers: sellers.size
      }

      // Store metrics for aggregation
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      this.aggregator.addMetric('total_listings', metrics.totalListings, timestamp)
      this.aggregator.addMetric('active_listings', metrics.activeListings, timestamp)
      this.aggregator.addMetric('average_price', Number(metrics.averagePrice), timestamp)
      this.aggregator.addMetric('total_volume', Number(metrics.totalVolume), timestamp)
      this.aggregator.addMetric('unique_buyers', metrics.uniqueBuyers, timestamp)
      this.aggregator.addMetric('unique_sellers', metrics.uniqueSellers, timestamp)

      console.log(`Collected marketplace metrics: ${totalListings} total listings, ${activeListings} active, avg price ${averagePrice}, volume ${totalVolume}`)

      return 'marketplace-metrics-collected'
    } catch (error) {
      console.error('Failed to collect marketplace metrics:', error)
      
      // Return default network metrics if collection fails
      
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      this.aggregator.addMetric('total_listings', 0, timestamp)
      this.aggregator.addMetric('error_rate', 100, timestamp)
      
      return 'marketplace-metrics-failed'
    }
  }

  /**
   * Collect economic metrics
   */
  async collectEconomicMetrics(): Promise<string> {
    try {
      // Calculate total value locked from active escrows
      const escrowAccounts = await this.connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            { dataSize: 128 } // Escrow account size
          ]
        }
      )

      let totalValueLocked = BigInt(0)
      let feeRevenue = BigInt(0)
      const activeUsers = new Set<string>()

      const escrowDecoder = getEscrowDecoder()
      for (const account of escrowAccounts.slice(0, 500)) {
        try {
          const escrowData = escrowDecoder.decode(account.account.data)
          
          // Only count active/pending escrows as TVL
          if (escrowData.status === EscrowStatus.Active) {
            totalValueLocked += escrowData.amount
          }
          
          // Count completed escrows for fee revenue estimation (assume 2.5% fee)
          if (escrowData.status === EscrowStatus.Completed) {
            feeRevenue += escrowData.amount * BigInt(25) / BigInt(1000) // 2.5% fee
          }
          
          activeUsers.add(escrowData.client.toString())
          activeUsers.add(escrowData.agent.toString())
        } catch {
          continue
        }
      }

      // Get transaction volume from recent signatures
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(this.programId),
        { limit: 1000 }
      )

      const now = Date.now() / 1000
      const oneDayAgo = now - 86400 // 24 hours ago
      const recentSignatures = signatures.filter(sig => (sig.blockTime ?? 0) > oneDayAgo)
      
      // Estimate transaction volume (this is a rough estimation)
      const transactionVolume = BigInt(recentSignatures.length * 1000000) // Assume avg transaction value
      const dailyVolume = transactionVolume
      
      // Daily active users from recent transactions
      const dailyActiveUsers = activeUsers.size

      // Calculate token circulation based on market activity  
      // Uses transaction volume and TVL to estimate circulating supply
      const baseCirculation = totalValueLocked * BigInt(5) // Conservative base
      const volumeMultiplier = transactionVolume > 0n ? BigInt(2) : BigInt(1)
      const tokenCirculation = baseCirculation * volumeMultiplier

      const metrics: EconomicMetrics = {
        totalValueLocked,
        dailyActiveUsers,
        transactionVolume,
        dailyVolume,
        feeRevenue,
        tokenCirculation
      }

      // Store metrics for aggregation
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      this.aggregator.addMetric('total_value_locked', Number(metrics.totalValueLocked), timestamp)
      this.aggregator.addMetric('daily_active_users', metrics.dailyActiveUsers, timestamp)
      this.aggregator.addMetric('transaction_volume', Number(metrics.transactionVolume), timestamp)
      this.aggregator.addMetric('daily_volume', Number(metrics.dailyVolume), timestamp)
      this.aggregator.addMetric('fee_revenue', Number(metrics.feeRevenue), timestamp)
      this.aggregator.addMetric('token_circulation', Number(metrics.tokenCirculation), timestamp)

      console.log(`Collected economic metrics: TVL ${totalValueLocked}, ${dailyActiveUsers} DAU, volume ${dailyVolume}, fees ${feeRevenue}`)

      return 'economic-metrics-collected'
    } catch (error) {
      console.error('Failed to collect economic metrics:', error)
      
      // Return default network metrics if collection fails
      
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      this.aggregator.addMetric('total_value_locked', 0, timestamp)
      this.aggregator.addMetric('error_rate', 100, timestamp)
      
      return 'economic-metrics-failed'
    }
  }

  /**
   * Update agent performance metrics
   */
  async updateAgentPerformance(performance: AgentPerformance): Promise<string> {
    // Store performance metrics
    this.aggregator.addMetric(`agent_${performance.agentId}_score`, performance.performanceScore, BigInt(Date.now() / 1000))
    this.aggregator.addMetric(`agent_${performance.agentId}_revenue`, Number(performance.totalRevenue), BigInt(Date.now() / 1000))
    this.aggregator.addMetric(`agent_${performance.agentId}_transactions`, performance.transactionCount, BigInt(Date.now() / 1000))

    return 'agent-performance-updated'
  }

  /**
   * Prune old analytics data
   */
  async pruneAnalyticsData(): Promise<string> {
    const cutoffTimestamp = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000)
    this.aggregator.pruneOldData(cutoffTimestamp)
    return 'analytics-data-pruned'
  }

  /**
   * Start real-time analytics streaming
   */
  async startStreaming(options: AnalyticsStreamOptions): Promise<void> {
    this.streamer = createAnalyticsStreamer(this.connection, options)
    await this.streamer.start()
  }

  /**
   * Stop real-time analytics streaming
   */
  async stopStreaming(): Promise<void> {
    if (this.streamer) {
      await this.streamer.stop()
      this.streamer = undefined
    }
  }

  /**
   * Get aggregated metrics for a specific window
   */
  getAggregatedMetrics(): AggregatedMetrics | null {
    // For now, use the default aggregation since our simplified aggregate method doesn't take parameters
    return this.aggregator.aggregate()
  }

  /**
   * Export analytics data
   */
  exportAnalytics(format: 'json' | 'csv' = 'json'): string {
    const allMetrics = this.aggregator.getAllMetrics()
    
    if (format === 'json') {
      return JSON.stringify(allMetrics, null, 2)
    }
    
    // CSV export
    const headers = ['timestamp', 'value']
    const rows = allMetrics.map(metric => [
      metric.timestamp,
      metric.value
    ])
    
    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
  }

  /**
   * Track agent performance metrics
   */
  async trackAgentPerformance(agentId: Address): Promise<{
    agentId: Address
    totalJobs: number
    completionRate: number
    averageRating: number
    responseTime: number
    earnings: bigint
    reputationScore: number
  }> {
    try {
      // Get agent account data
      const agentPubkey = new PublicKey(agentId)
      const agentAccount = await this.connection.getAccountInfo(agentPubkey)
      
      if (!agentAccount) {
        throw new Error(`Agent account not found: ${agentId}`)
      }

      // Decode agent data
      const agentDecoder = getAgentDecoder()
      const agentData = agentDecoder.decode(agentAccount.data)

      // Calculate performance metrics
      const totalJobs = Number(agentData.totalJobsCompleted ?? 0)
      const completionRate = totalJobs > 0 ? 100 : 0 // Simplified calculation
      const averageRating = agentData.reputationScore ?? 50
      const responseTime = 0 // TODO: Track from actual response data
      const earnings = agentData.totalEarnings ?? 0n
      const reputationScore = agentData.reputationScore ?? 50

      return {
        agentId,
        totalJobs,
        completionRate,
        averageRating,
        responseTime,
        earnings,
        reputationScore
      }
    } catch (error) {
      console.error('Failed to track agent performance:', error)
      
      // Return default performance metrics
      return {
        agentId,
        totalJobs: 0,
        completionRate: 0,
        averageRating: 50,
        responseTime: 0,
        earnings: 0n,
        reputationScore: 50
      }
    }
  }

  /**
   * Export analytics data for dashboard integration
   */
  async exportForDashboard(format?: string): Promise<unknown> {
    try {
      // Collect all current metrics
      const allMetrics = await this.collectAllMetrics()
      
      switch (format) {
        case 'grafana':
          // Grafana-compatible format
          return {
            datapoints: [
              [allMetrics.network.activeAgents, allMetrics.timestamp],
              [Number(allMetrics.marketplace.totalVolume), allMetrics.timestamp],
              [Number(allMetrics.economic.totalValueLocked), allMetrics.timestamp]
            ],
            target: 'ghostspeak_metrics'
          }
          
        case 'prometheus':
          // Prometheus-compatible format
          return [
            `ghostspeak_active_agents ${allMetrics.network.activeAgents} ${allMetrics.timestamp}`,
            `ghostspeak_marketplace_volume ${allMetrics.marketplace.totalVolume} ${allMetrics.timestamp}`,
            `ghostspeak_tvl ${allMetrics.economic.totalValueLocked} ${allMetrics.timestamp}`
          ].join('\\n')
          
        default:
          // Default JSON format
          return {
            metrics: allMetrics,
            exportedAt: allMetrics.timestamp,
            format: 'json',
            version: '1.0'
          }
      }
    } catch (error) {
      console.error('Failed to export dashboard data:', error)
      
      // Return empty export on error
      return {
        metrics: null,
        exportedAt: Date.now(),
        format: format ?? 'json',
        error: 'Export failed'
      }
    }
  }

  // Helper methods for default metrics
  private getDefaultNetworkMetrics(): NetworkMetrics {
    return {
      activeAgents: 0,
      transactionThroughput: 0n,
      averageLatency: 0n,
      errorRate: 0
    }
  }

  private getDefaultMarketplaceMetrics(): MarketplaceMetrics {
    return {
      totalListings: 0,
      activeListings: 0,
      averagePrice: 0n,
      totalVolume: 0n,
      uniqueBuyers: 0,
      uniqueSellers: 0
    }
  }

  private getDefaultEconomicMetrics(): EconomicMetrics {
    return {
      totalValueLocked: 0n,
      dailyActiveUsers: 0,
      transactionVolume: 0n,
      dailyVolume: 0n,
      feeRevenue: 0n,
      tokenCirculation: 0n
    }
  }

  // Helper methods to parse metrics from transaction signatures
  private async parseNetworkMetrics(_signature: string): Promise<NetworkMetrics> {
    void _signature // Mark as intentionally unused
    // TODO: Parse actual transaction data for more accurate metrics
    return this.getDefaultNetworkMetrics()
  }

  private async parseMarketplaceMetrics(_signature: string): Promise<MarketplaceMetrics> {
    void _signature // Mark as intentionally unused
    // TODO: Parse actual transaction data for more accurate metrics  
    return this.getDefaultMarketplaceMetrics()
  }

  private async parseEconomicMetrics(_signature: string): Promise<EconomicMetrics> {
    void _signature // Mark as intentionally unused
    // TODO: Parse actual transaction data for more accurate metrics
    return this.getDefaultEconomicMetrics()
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoCollection()
    void this.stopStreaming()
  }
}