/**
 * Analytics Aggregation Module
 * 
 * Provides time-series data aggregation, statistical analysis,
 * and metric computation for analytics dashboards.
 */

import type { Address } from '@solana/kit'
import { 
  type AgentAnalyticsEvent,
  type TransactionAnalyticsEvent,
  type MarketplaceActivityEvent,
  type NetworkHealthEvent,
  type ServicePerformanceEvent,
  type EconomicMetricsEvent
} from './analytics-streaming.js'

// Time series data point
export interface TimeSeriesPoint {
  timestamp: bigint
  value: number
}

// Aggregation time windows
export enum AggregationWindow {
  Minute = 60,
  FiveMinutes = 300,
  FifteenMinutes = 900,
  Hour = 3600,
  Day = 86400,
  Week = 604800,
  Month = 2592000
}

// Aggregated metrics by time window
export interface AggregatedMetrics {
  window: AggregationWindow
  startTime: bigint
  endTime: bigint
  dataPoints: number
  
  agents: {
    totalActive: number
    newRegistrations: number
    averageRevenue: bigint
    topPerformers: { agent: Address; score: number }[]
  }
  
  transactions: {
    totalCount: number
    totalVolume: bigint
    averageValue: bigint
    successRate: number
    volumeByType: Map<string, bigint>
  }
  
  performance: {
    averageResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    throughput: number
    errorRate: number
  }
  
  marketplace: {
    listingsCreated: number
    salesCompleted: number
    totalSalesVolume: bigint
    averagePrice: bigint
    popularCategories: { category: string; count: number }[]
  }
  
  network: {
    peakActiveAgents: number
    averageActiveAgents: number
    totalTransactionThroughput: bigint
    averageLatency: number
    healthScore: number
  }
}

/**
 * Real-time analytics aggregator
 * 
 * Aggregates streaming analytics events into time-series metrics
 * with configurable time windows and statistical analysis.
 */
export class AnalyticsAggregator {
  // Event storage by time window
  private eventsByWindow: Map<AggregationWindow, Map<string, unknown[]>> = new Map()
  
  // Time series data storage
  private timeSeriesData: Map<string, TimeSeriesPoint[]> = new Map()
  
  // Agent performance tracking
  private agentMetrics: Map<Address, {
    revenue: bigint
    transactions: number
    successRate: number
    lastActive: bigint
  }> = new Map()
  
  constructor(
    private windows: AggregationWindow[] = [
      AggregationWindow.Minute,
      AggregationWindow.Hour,
      AggregationWindow.Day
    ]
  ) {
    // Initialize storage for each window
    for (const window of windows) {
      this.eventsByWindow.set(window, new Map())
    }
  }

  /**
   * Process incoming agent analytics event
   */
  processAgentEvent(event: AgentAnalyticsEvent): void {
    // Update agent metrics
    const current = this.agentMetrics.get(event.agent) ?? {
      revenue: BigInt(0),
      transactions: 0,
      successRate: 0,
      lastActive: BigInt(0)
    }
    
    this.agentMetrics.set(event.agent, {
      revenue: current.revenue + event.revenue,
      transactions: current.transactions + event.transactionCount,
      successRate: (current.successRate + event.successRate) / 2, // Running average
      lastActive: event.timestamp
    })
    
    // Store event in time windows
    this.storeEventInWindows('agent', event)
    
    // Update time series
    this.updateTimeSeries('agent_count', Number(event.timestamp), 1)
    this.updateTimeSeries('agent_revenue', Number(event.timestamp), Number(event.revenue))
    this.updateTimeSeries('agent_response_time', Number(event.timestamp), Number(event.responseTime))
  }

  /**
   * Process transaction analytics event
   */
  processTransactionEvent(event: TransactionAnalyticsEvent): void {
    // Store event in time windows
    this.storeEventInWindows('transaction', event)
    
    // Update time series
    this.updateTimeSeries('transaction_count', Number(event.timestamp), 1)
    this.updateTimeSeries('transaction_volume', Number(event.timestamp), Number(event.amount))
    
    // Track transaction status
    if (event.status === 'completed') {
      this.updateTimeSeries('successful_transactions', Number(event.timestamp), 1)
    } else if (event.status === 'failed') {
      this.updateTimeSeries('failed_transactions', Number(event.timestamp), 1)
    }
  }

  /**
   * Process marketplace activity event
   */
  processMarketplaceEvent(event: MarketplaceActivityEvent): void {
    // Store event in time windows
    this.storeEventInWindows('marketplace', event)
    
    // Update time series based on activity type
    switch (event.activityType) {
      case 'service_listed':
        this.updateTimeSeries('listings_created', Number(event.timestamp), 1)
        break
      case 'service_purchased':
        this.updateTimeSeries('sales_completed', Number(event.timestamp), 1)
        this.updateTimeSeries('sales_volume', Number(event.timestamp), Number(event.value))
        break
      case 'auction_created':
        this.updateTimeSeries('auctions_created', Number(event.timestamp), 1)
        break
    }
  }

  /**
   * Process network health event
   */
  processNetworkHealthEvent(event: NetworkHealthEvent): void {
    // Store event in time windows
    this.storeEventInWindows('network', event)
    
    // Update time series
    this.updateTimeSeries('active_agents', Number(event.timestamp), event.activeAgents)
    this.updateTimeSeries('transaction_throughput', Number(event.timestamp), Number(event.transactionThroughput))
    this.updateTimeSeries('network_latency', Number(event.timestamp), Number(event.averageLatency))
    this.updateTimeSeries('error_rate', Number(event.timestamp), event.errorRate)
  }

  /**
   * Process service performance event
   */
  processServicePerformanceEvent(event: ServicePerformanceEvent): void {
    // Store event in time windows
    this.storeEventInWindows('service', event)
    
    // Update time series
    this.updateTimeSeries('service_executions', Number(event.timestamp), 1)
    this.updateTimeSeries('service_execution_time', Number(event.timestamp), Number(event.executionTime))
    
    if (event.success) {
      this.updateTimeSeries('successful_services', Number(event.timestamp), 1)
    }
    
    // Check if qualityScore Option type has a value
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (event.qualityScore !== undefined) {
      const qualityValue = typeof event.qualityScore === 'number' ? event.qualityScore : 0
      this.updateTimeSeries('service_quality', Number(event.timestamp), qualityValue)
    }
  }

  /**
   * Process economic metrics event
   */
  processEconomicMetricsEvent(event: EconomicMetricsEvent): void {
    // Store event in time windows
    this.storeEventInWindows('economic', event)
    
    // Update time series
    this.updateTimeSeries('total_value_locked', Number(event.timestamp), Number(event.totalValueLocked))
    this.updateTimeSeries('daily_volume', Number(event.timestamp), Number(event.dailyVolume))
    this.updateTimeSeries('fee_revenue', Number(event.timestamp), Number(event.feeRevenue))
    this.updateTimeSeries('unique_users', Number(event.timestamp), event.uniqueUsers)
  }

  /**
   * Get aggregated metrics for a time window
   */
  getAggregatedMetrics(window: AggregationWindow, endTime?: bigint): AggregatedMetrics {
    const now = endTime ?? BigInt(Date.now() / 1000)
    const startTime = now - BigInt(window)
    
    // Get events for this window
    const windowEvents = this.eventsByWindow.get(window) ?? new Map()
    
    // Calculate agent metrics
    const agentEvents = (windowEvents.get('agent') ?? []) as AgentAnalyticsEvent[]
    const activeAgents = new Set(agentEvents.map(e => e.agent))
    const newRegistrations = agentEvents.filter(e => e.operation === 'register').length
    
    // Calculate average revenue
    const totalRevenue = agentEvents.reduce((sum, e) => sum + e.revenue, BigInt(0))
    const averageRevenue = activeAgents.size > 0 ? totalRevenue / BigInt(activeAgents.size) : BigInt(0)
    
    // Get top performers
    const agentScores = new Map<Address, number>()
    for (const event of agentEvents) {
      const current = agentScores.get(event.agent) ?? 0
      const score = event.successRate * 0.4 + event.averageRating * 0.3 + (Number(event.revenue) / 1e9) * 0.3
      agentScores.set(event.agent, current + score)
    }
    const topPerformers = Array.from(agentScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([agent, score]) => ({ agent, score }))
    
    // Calculate transaction metrics
    const txEvents = (windowEvents.get('transaction') ?? []) as TransactionAnalyticsEvent[]
    const totalTxCount = txEvents.length
    const totalTxVolume = txEvents.reduce((sum, e) => sum + e.amount, BigInt(0))
    const avgTxValue = totalTxCount > 0 ? totalTxVolume / BigInt(totalTxCount) : BigInt(0)
    const successfulTxs = txEvents.filter(e => e.status === 'completed').length
    const txSuccessRate = totalTxCount > 0 ? (successfulTxs / totalTxCount) * 100 : 0
    
    // Group volume by type
    const volumeByType = new Map<string, bigint>()
    for (const tx of txEvents) {
      const current = volumeByType.get(tx.transactionType) ?? BigInt(0)
      volumeByType.set(tx.transactionType, current + tx.amount)
    }
    
    // Calculate performance metrics
    const responseTimes = agentEvents.map(e => Number(e.responseTime)).filter(t => t > 0)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
      : 0
    
    // Calculate percentiles
    responseTimes.sort((a, b) => a - b)
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95)
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99)
    
    // Calculate throughput
    const windowSeconds = Number(window)
    const throughput = totalTxCount / windowSeconds
    
    // Calculate error rate
    const failedTxs = txEvents.filter(e => e.status === 'failed').length
    const errorRate = totalTxCount > 0 ? (failedTxs / totalTxCount) * 100 : 0
    
    // Calculate marketplace metrics
    const marketEvents = (windowEvents.get('marketplace') ?? []) as MarketplaceActivityEvent[]
    const listingsCreated = marketEvents.filter(e => e.activityType === 'service_listed').length
    const salesCompleted = marketEvents.filter(e => e.activityType === 'service_purchased').length
    const salesEvents = marketEvents.filter(e => e.activityType === 'service_purchased')
    const totalSalesVolume = salesEvents.reduce((sum, e) => sum + e.value, BigInt(0))
    const averagePrice = salesCompleted > 0 ? totalSalesVolume / BigInt(salesCompleted) : BigInt(0)
    
    // Calculate network metrics
    const networkEvents = (windowEvents.get('network') ?? []) as NetworkHealthEvent[]
    const peakActiveAgents = Math.max(...networkEvents.map(e => e.activeAgents), 0)
    const avgActiveAgents = networkEvents.length > 0
      ? networkEvents.reduce((sum, e) => sum + e.activeAgents, 0) / networkEvents.length
      : 0
    const totalThroughput = networkEvents.reduce((sum, e) => sum + e.transactionThroughput, BigInt(0))
    const avgLatency = networkEvents.length > 0
      ? networkEvents.reduce((sum, e) => sum + Number(e.averageLatency), 0) / networkEvents.length
      : 0
    
    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore({
      successRate: txSuccessRate,
      errorRate,
      avgLatency,
      throughput
    })
    
    return {
      window,
      startTime,
      endTime: now,
      dataPoints: this.getDataPointCount(window, startTime, now),
      
      agents: {
        totalActive: activeAgents.size,
        newRegistrations,
        averageRevenue,
        topPerformers
      },
      
      transactions: {
        totalCount: totalTxCount,
        totalVolume: totalTxVolume,
        averageValue: avgTxValue,
        successRate: txSuccessRate,
        volumeByType
      },
      
      performance: {
        averageResponseTime: avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        throughput,
        errorRate
      },
      
      marketplace: {
        listingsCreated,
        salesCompleted,
        totalSalesVolume,
        averagePrice,
        popularCategories: [] // Would need category tracking
      },
      
      network: {
        peakActiveAgents,
        averageActiveAgents: avgActiveAgents,
        totalTransactionThroughput: totalThroughput,
        averageLatency: avgLatency,
        healthScore
      }
    }
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(
    metric: string,
    startTime: bigint,
    endTime: bigint,
    interval?: number
  ): TimeSeriesPoint[] {
    const data = this.timeSeriesData.get(metric) ?? []
    
    // Filter by time range
    const filtered = data.filter(p => p.timestamp >= startTime && p.timestamp <= endTime)
    
    // Optionally downsample data
    if (interval && filtered.length > interval) {
      return this.downsampleTimeSeries(filtered, interval)
    }
    
    return filtered
  }

  /**
   * Get current top agents by performance
   */
  getTopAgents(limit = 10): {
    agent: Address
    revenue: bigint
    transactions: number
    successRate: number
    score: number
  }[] {
    const agents = Array.from(this.agentMetrics.entries())
      .map(([agent, metrics]) => {
        // Calculate composite score
        const score = (
          (Number(metrics.revenue) / 1e9) * 0.4 +
          metrics.successRate * 0.3 +
          Math.min(metrics.transactions / 100, 1) * 0.3
        )
        
        return {
          agent,
          revenue: metrics.revenue,
          transactions: metrics.transactions,
          successRate: metrics.successRate,
          score
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    
    return agents
  }

  /**
   * Clear old data outside retention window
   */
  pruneOldData(retentionSeconds: number): void {
    const cutoffTime = BigInt(Date.now() / 1000) - BigInt(retentionSeconds)
    
    // Prune time series data
    for (const [metric, points] of this.timeSeriesData.entries()) {
      const filtered = points.filter(p => p.timestamp > cutoffTime)
      if (filtered.length > 0) {
        this.timeSeriesData.set(metric, filtered)
      } else {
        this.timeSeriesData.delete(metric)
      }
    }
    
    // Prune window events
    for (const [, eventMap] of this.eventsByWindow.entries()) {
      for (const [type, events] of eventMap.entries()) {
        const filtered = events.filter((e: unknown) => (e as { timestamp: number }).timestamp > cutoffTime)
        if (filtered.length > 0) {
          eventMap.set(type, filtered)
        } else {
          eventMap.delete(type)
        }
      }
    }
    
    // Prune inactive agents
    for (const [agent, metrics] of this.agentMetrics.entries()) {
      if (metrics.lastActive < cutoffTime) {
        this.agentMetrics.delete(agent)
      }
    }
  }

  // Helper methods

  private storeEventInWindows(eventType: string, event: unknown): void {
    for (const window of this.windows) {
      const windowMap = this.eventsByWindow.get(window)!
      const events = windowMap.get(eventType) ?? []
      events.push(event)
      
      // Keep only events within window
      const cutoff = BigInt(Date.now() / 1000) - BigInt(window)
      const filtered = events.filter((e: unknown) => (e as { timestamp: bigint }).timestamp > cutoff)
      windowMap.set(eventType, filtered)
    }
  }

  private updateTimeSeries(metric: string, timestamp: number, value: number): void {
    const points = this.timeSeriesData.get(metric) ?? []
    points.push({ timestamp: BigInt(timestamp), value })
    
    // Keep last 10000 points
    if (points.length > 10000) {
      points.shift()
    }
    
    this.timeSeriesData.set(metric, points)
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const index = Math.ceil((percentile / 100) * values.length) - 1
    return values[Math.max(0, Math.min(index, values.length - 1))]
  }

  private calculateHealthScore(metrics: {
    successRate: number
    errorRate: number
    avgLatency: number
    throughput: number
  }): number {
    // Weight different factors
    const successScore = metrics.successRate * 0.4
    const errorScore = (100 - metrics.errorRate) * 0.3
    const latencyScore = Math.max(0, 100 - (metrics.avgLatency / 10)) * 0.2
    const throughputScore = Math.min(100, metrics.throughput * 10) * 0.1
    
    return Math.round(successScore + errorScore + latencyScore + throughputScore)
  }

  private downsampleTimeSeries(points: TimeSeriesPoint[], targetPoints: number): TimeSeriesPoint[] {
    if (points.length <= targetPoints) return points
    
    const downsampled: TimeSeriesPoint[] = []
    const bucketSize = Math.floor(points.length / targetPoints)
    
    for (let i = 0; i < targetPoints; i++) {
      const bucketStart = i * bucketSize
      const bucketEnd = Math.min(bucketStart + bucketSize, points.length)
      const bucket = points.slice(bucketStart, bucketEnd)
      
      if (bucket.length > 0) {
        // Average values in bucket
        const avgValue = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length
        const midTimestamp = bucket[Math.floor(bucket.length / 2)].timestamp
        
        downsampled.push({ timestamp: midTimestamp, value: avgValue })
      }
    }
    
    return downsampled
  }

  private getDataPointCount(window: AggregationWindow, startTime: bigint, endTime: bigint): number {
    // Count unique timestamps in time series data within range
    const timestamps = new Set<string>()
    
    for (const points of this.timeSeriesData.values()) {
      for (const point of points) {
        if (point.timestamp >= startTime && point.timestamp <= endTime) {
          timestamps.add(point.timestamp.toString())
        }
      }
    }
    
    return timestamps.size
  }

  /**
   * Add a metric data point to the aggregator
   */
  addMetric(metricName: string, value: number, timestamp?: bigint): void {
    const time = timestamp ?? BigInt(Date.now() / 1000)
    this.updateTimeSeries(metricName, Number(time), value)
  }

  /**
   * Get aggregated metrics for the default time window
   */
  aggregate(): AggregatedMetrics {
    return this.getAggregatedMetrics(AggregationWindow.Hour)
  }

  /**
   * Get all available metrics from time series data
   */
  getAllMetrics(): TimeSeriesPoint[] {
    const allPoints: TimeSeriesPoint[] = []
    
    for (const points of this.timeSeriesData.values()) {
      allPoints.push(...points)
    }
    
    // Sort by timestamp
    return allPoints.sort((a, b) => Number(a.timestamp - b.timestamp))
  }
}