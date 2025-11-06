/**
 * Real-Time Performance Metrics
 *
 * Provides live performance tracking for:
 * - Agent response times
 * - Transaction throughput
 * - x402 payment success rates
 * - Escrow completion rates
 * - Network performance
 *
 * Integrates with WebSocket notifications for real-time updates.
 *
 * @module utils/realtime-performance-metrics
 */

import type { Address, Signature } from '@solana/kit'
import {
  WebSocketNotificationManager,
  type BlockchainNotification
} from './websocket-notifications.js'

/**
 * Performance metric types
 */
export type MetricType =
  | 'response_time'
  | 'transaction_throughput'
  | 'payment_success_rate'
  | 'escrow_completion_rate'
  | 'network_latency'
  | 'error_rate'
  | 'uptime'

/**
 * Time window for aggregating metrics
 */
export type TimeWindow = '1m' | '5m' | '15m' | '1h' | '24h' | '7d' | '30d'

/**
 * Performance metric data point
 */
export interface MetricDataPoint {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

/**
 * Aggregated metric statistics
 */
export interface MetricStatistics {
  min: number
  max: number
  avg: number
  p50: number // Median
  p95: number
  p99: number
  count: number
  sum: number
}

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  agentAddress: Address
  responseTime: MetricStatistics
  successRate: number
  totalCalls: number
  totalPayments: bigint
  averagePaymentAmount: bigint
  uptime: number // Percentage
  lastUpdated: number
}

/**
 * x402 payment metrics
 */
export interface X402PaymentMetrics {
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  successRate: number
  totalVolume: bigint
  averagePaymentAmount: bigint
  averageProcessingTime: number
  lastUpdated: number
}

/**
 * Network performance metrics
 */
export interface NetworkPerformanceMetrics {
  currentSlot: bigint
  transactionsPerSecond: number
  averageBlockTime: number
  networkLatency: number
  confirmedTransactions: number
  failedTransactions: number
  successRate: number
  lastUpdated: number
}

/**
 * Real-time performance metrics manager
 */
export class RealtimePerformanceMetrics {
  private wsManager: WebSocketNotificationManager
  private programId: Address

  // Metric storage
  private metricData = new Map<string, MetricDataPoint[]>()
  private agentMetrics = new Map<Address, AgentPerformanceMetrics>()
  private x402Metrics: X402PaymentMetrics = {
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    successRate: 0,
    totalVolume: BigInt(0),
    averagePaymentAmount: BigInt(0),
    averageProcessingTime: 0,
    lastUpdated: Date.now()
  }
  private networkMetrics: NetworkPerformanceMetrics = {
    currentSlot: BigInt(0),
    transactionsPerSecond: 0,
    averageBlockTime: 0,
    networkLatency: 0,
    confirmedTransactions: 0,
    failedTransactions: 0,
    successRate: 0,
    lastUpdated: Date.now()
  }

  // Configuration
  private maxDataPoints = 10000 // Maximum data points to keep in memory
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(wsManager: WebSocketNotificationManager, programId: Address) {
    this.wsManager = wsManager
    this.programId = programId

    // Subscribe to notifications
    this.setupNotificationHandlers()

    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Setup notification handlers
   */
  private setupNotificationHandlers(): void {
    this.wsManager.on('notification', (notification: BlockchainNotification) => {
      this.handleNotification(notification)
    })

    this.wsManager.on('signatureNotification', (notification) => {
      this.recordTransactionMetric(notification)
    })

    this.wsManager.on('slotChange', (notification) => {
      this.recordNetworkMetric(notification)
    })
  }

  /**
   * Handle blockchain notifications
   */
  private handleNotification(notification: BlockchainNotification): void {
    switch (notification.type) {
      case 'accountChange':
        this.handleAccountChange(notification)
        break
      case 'programChange':
        this.handleProgramChange(notification)
        break
      case 'signatureNotification':
        this.recordTransactionMetric(notification)
        break
      case 'slotChange':
        this.recordNetworkMetric(notification)
        break
    }
  }

  /**
   * Handle account change notifications
   */
  private handleAccountChange(notification: any): void {
    // Parse account data to determine if it's an agent account
    const discriminator = notification.account.data.slice(0, 8)

    // Record metric based on account type
    this.recordMetric('account_change', {
      timestamp: Date.now(),
      value: 1,
      metadata: {
        address: notification.pubkey,
        slot: notification.slot.toString(),
        discriminator: Buffer.from(discriminator).toString('hex')
      }
    })
  }

  /**
   * Handle program change notifications
   */
  private handleProgramChange(notification: any): void {
    this.recordMetric('program_change', {
      timestamp: Date.now(),
      value: 1,
      metadata: {
        address: notification.pubkey,
        slot: notification.slot.toString()
      }
    })
  }

  /**
   * Record transaction metric
   */
  private recordTransactionMetric(notification: any): void {
    const success = notification.error === null
    const processingTime = notification.timestamp - (notification.submittedAt ?? notification.timestamp)

    this.recordMetric('transaction_completion', {
      timestamp: notification.timestamp,
      value: processingTime,
      metadata: {
        signature: notification.signature,
        success,
        slot: notification.slot.toString(),
        error: notification.error?.message
      }
    })

    // Update network metrics
    if (success) {
      this.networkMetrics.confirmedTransactions++
    } else {
      this.networkMetrics.failedTransactions++
    }

    const total = this.networkMetrics.confirmedTransactions + this.networkMetrics.failedTransactions
    this.networkMetrics.successRate = total > 0
      ? (this.networkMetrics.confirmedTransactions / total) * 100
      : 0

    this.networkMetrics.lastUpdated = Date.now()
  }

  /**
   * Record network metric
   */
  private recordNetworkMetric(notification: any): void {
    const prevSlot = this.networkMetrics.currentSlot
    const currentSlot = notification.slot
    const timeDiff = notification.timestamp - this.networkMetrics.lastUpdated

    if (prevSlot > 0 && timeDiff > 0) {
      const slotDiff = Number(currentSlot - prevSlot)
      const blockTime = timeDiff / slotDiff

      this.networkMetrics.averageBlockTime = blockTime
      this.networkMetrics.currentSlot = currentSlot
      this.networkMetrics.lastUpdated = notification.timestamp
    }

    this.recordMetric('slot_change', {
      timestamp: notification.timestamp,
      value: Number(currentSlot),
      metadata: {
        parent: notification.parent.toString()
      }
    })
  }

  /**
   * Record x402 payment metric
   */
  recordX402Payment(payment: {
    agentAddress: Address
    amount: bigint
    success: boolean
    processingTime: number
  }): void {
    this.x402Metrics.totalPayments++

    if (payment.success) {
      this.x402Metrics.successfulPayments++
      this.x402Metrics.totalVolume += payment.amount
    } else {
      this.x402Metrics.failedPayments++
    }

    const totalPayments = this.x402Metrics.totalPayments
    this.x402Metrics.successRate = totalPayments > 0
      ? (this.x402Metrics.successfulPayments / totalPayments) * 100
      : 0

    this.x402Metrics.averagePaymentAmount = this.x402Metrics.successfulPayments > 0
      ? this.x402Metrics.totalVolume / BigInt(this.x402Metrics.successfulPayments)
      : BigInt(0)

    // Update average processing time
    const currentAvg = this.x402Metrics.averageProcessingTime
    this.x402Metrics.averageProcessingTime = (currentAvg * (totalPayments - 1) + payment.processingTime) / totalPayments

    this.x402Metrics.lastUpdated = Date.now()

    // Update agent-specific metrics
    this.updateAgentMetrics(payment.agentAddress, payment)

    // Record data point
    this.recordMetric('x402_payment', {
      timestamp: Date.now(),
      value: Number(payment.amount),
      metadata: {
        agentAddress: payment.agentAddress,
        success: payment.success,
        processingTime: payment.processingTime
      }
    })
  }

  /**
   * Update agent-specific metrics
   */
  private updateAgentMetrics(agentAddress: Address, payment: {
    amount: bigint
    success: boolean
    processingTime: number
  }): void {
    let metrics = this.agentMetrics.get(agentAddress)

    if (!metrics) {
      metrics = {
        agentAddress,
        responseTime: {
          min: payment.processingTime,
          max: payment.processingTime,
          avg: payment.processingTime,
          p50: payment.processingTime,
          p95: payment.processingTime,
          p99: payment.processingTime,
          count: 1,
          sum: payment.processingTime
        },
        successRate: payment.success ? 100 : 0,
        totalCalls: 1,
        totalPayments: payment.success ? payment.amount : BigInt(0),
        averagePaymentAmount: payment.success ? payment.amount : BigInt(0),
        uptime: 100,
        lastUpdated: Date.now()
      }

      this.agentMetrics.set(agentAddress, metrics)
    } else {
      // Update response time statistics
      metrics.responseTime.count++
      metrics.responseTime.sum += payment.processingTime
      metrics.responseTime.avg = metrics.responseTime.sum / metrics.responseTime.count
      metrics.responseTime.min = Math.min(metrics.responseTime.min, payment.processingTime)
      metrics.responseTime.max = Math.max(metrics.responseTime.max, payment.processingTime)

      // Update success rate
      metrics.totalCalls++
      const successfulCalls = Math.round((metrics.successRate / 100) * (metrics.totalCalls - 1)) + (payment.success ? 1 : 0)
      metrics.successRate = (successfulCalls / metrics.totalCalls) * 100

      // Update payment metrics
      if (payment.success) {
        metrics.totalPayments += payment.amount
        metrics.averagePaymentAmount = metrics.totalPayments / BigInt(successfulCalls)
      }

      metrics.lastUpdated = Date.now()
    }
  }

  /**
   * Record a generic metric
   */
  recordMetric(metricType: string, dataPoint: MetricDataPoint): void {
    const key = metricType

    if (!this.metricData.has(key)) {
      this.metricData.set(key, [])
    }

    const data = this.metricData.get(key)!
    data.push(dataPoint)

    // Keep only the most recent data points
    if (data.length > this.maxDataPoints) {
      data.shift()
    }
  }

  /**
   * Get metric statistics for a time window
   */
  getMetricStatistics(metricType: string, timeWindow: TimeWindow): MetricStatistics | null {
    const data = this.getMetricsForTimeWindow(metricType, timeWindow)

    if (data.length === 0) {
      return null
    }

    const values = data.map(d => d.value).sort((a, b) => a - b)
    const sum = values.reduce((acc, val) => acc + val, 0)
    const count = values.length

    return {
      min: values[0],
      max: values[count - 1],
      avg: sum / count,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
      count,
      sum
    }
  }

  /**
   * Get metrics for a specific time window
   */
  private getMetricsForTimeWindow(metricType: string, timeWindow: TimeWindow): MetricDataPoint[] {
    const data = this.metricData.get(metricType)
    if (!data) return []

    const windowMs = this.timeWindowToMs(timeWindow)
    const cutoffTime = Date.now() - windowMs

    return data.filter(d => d.timestamp >= cutoffTime)
  }

  /**
   * Convert time window to milliseconds
   */
  private timeWindowToMs(window: TimeWindow): number {
    const windowMap: Record<TimeWindow, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }

    return windowMap[window]
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1
    return sortedValues[Math.max(0, index)]
  }

  /**
   * Get agent performance metrics
   */
  getAgentMetrics(agentAddress: Address): AgentPerformanceMetrics | null {
    return this.agentMetrics.get(agentAddress) ?? null
  }

  /**
   * Get all agent metrics
   */
  getAllAgentMetrics(): AgentPerformanceMetrics[] {
    return Array.from(this.agentMetrics.values())
  }

  /**
   * Get x402 payment metrics
   */
  getX402Metrics(): X402PaymentMetrics {
    return { ...this.x402Metrics }
  }

  /**
   * Get network performance metrics
   */
  getNetworkMetrics(): NetworkPerformanceMetrics {
    return { ...this.networkMetrics }
  }

  /**
   * Get top performing agents
   */
  getTopPerformingAgents(limit = 10, sortBy: 'successRate' | 'totalPayments' | 'responseTime' = 'successRate'): AgentPerformanceMetrics[] {
    const agents = this.getAllAgentMetrics()

    agents.sort((a, b) => {
      switch (sortBy) {
        case 'successRate':
          return b.successRate - a.successRate
        case 'totalPayments':
          return Number(b.totalPayments - a.totalPayments)
        case 'responseTime':
          return a.responseTime.avg - b.responseTime.avg
        default:
          return 0
      }
    })

    return agents.slice(0, limit)
  }

  /**
   * Calculate transactions per second
   */
  calculateTPS(timeWindow: TimeWindow = '1m'): number {
    const txData = this.getMetricsForTimeWindow('transaction_completion', timeWindow)
    if (txData.length === 0) return 0

    const windowMs = this.timeWindowToMs(timeWindow)
    return (txData.length / windowMs) * 1000
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const cutoffTime = Date.now() - this.timeWindowToMs('30d') // Keep 30 days of data

    for (const [key, data] of this.metricData.entries()) {
      const filtered = data.filter(d => d.timestamp >= cutoffTime)
      this.metricData.set(key, filtered)
    }

    // Cleanup agent metrics older than 30 days
    for (const [address, metrics] of this.agentMetrics.entries()) {
      if (metrics.lastUpdated < cutoffTime) {
        this.agentMetrics.delete(address)
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metricData.clear()
    this.agentMetrics.clear()

    this.x402Metrics = {
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      successRate: 0,
      totalVolume: BigInt(0),
      averagePaymentAmount: BigInt(0),
      averageProcessingTime: 0,
      lastUpdated: Date.now()
    }

    this.networkMetrics = {
      currentSlot: BigInt(0),
      transactionsPerSecond: 0,
      averageBlockTime: 0,
      networkLatency: 0,
      confirmedTransactions: 0,
      failedTransactions: 0,
      successRate: 0,
      lastUpdated: Date.now()
    }
  }
}

/**
 * Create realtime performance metrics manager
 */
export function createRealtimePerformanceMetrics(
  wsManager: WebSocketNotificationManager,
  programId: Address
): RealtimePerformanceMetrics {
  return new RealtimePerformanceMetrics(wsManager, programId)
}
