/**
 * x402 Analytics Integration
 *
 * Provides real-time analytics and metrics tracking for x402 payment transactions,
 * integrating with the GhostSpeak analytics system.
 *
 * @module x402/analytics
 */

import type { Address } from '@solana/kit'
import { EventEmitter } from 'node:events'
import type {
  AnalyticsStreamer,
  TransactionAnalyticsEvent
} from '../utils/analytics-streaming.js'
import type { AnalyticsAggregator, AggregatedMetrics } from '../utils/analytics-aggregation.js'

/**
 * x402 payment event data
 */
export interface X402PaymentEvent {
  signature: string
  timestamp: bigint
  payer: Address
  recipient: Address
  amount: bigint
  token: Address
  agent?: Address
  status: 'pending' | 'confirmed' | 'failed'
  metadata?: Record<string, unknown>
}

/**
 * x402 transaction metrics
 */
export interface X402TransactionMetrics {
  period: {
    start: bigint
    end: bigint
  }
  payments: {
    total: number
    successful: number
    failed: number
    pending: number
  }
  volume: {
    total: bigint
    average: bigint
    byToken: Map<Address, bigint>
  }
  agents: {
    totalActive: number
    topEarners: Array<{
      agent: Address
      earnings: bigint
      callCount: number
    }>
  }
  performance: {
    averageConfirmationTime: number // milliseconds
    successRate: number // percentage
    errorRate: number // percentage
  }
}

/**
 * x402 analytics options
 */
export interface X402AnalyticsOptions {
  enableRealtime?: boolean
  metricsInterval?: number // milliseconds
  retentionPeriod?: number // seconds
  onPayment?: (event: X402PaymentEvent) => void
  onMetrics?: (metrics: X402TransactionMetrics) => void
  onError?: (error: Error) => void
}

/**
 * x402 Analytics Tracker
 *
 * Tracks and aggregates x402 payment transactions for real-time analytics,
 * monitoring, and dashboard visualization.
 */
export class X402AnalyticsTracker extends EventEmitter {
  private paymentEvents: X402PaymentEvent[] = []
  private agentEarnings: Map<Address, bigint> = new Map()
  private agentCallCounts: Map<Address, number> = new Map()
  private tokenVolumes: Map<Address, bigint> = new Map()
  private metricsTimer?: ReturnType<typeof setInterval>
  private isActive = false

  // Integration with existing analytics system
  private analyticsStreamer?: AnalyticsStreamer
  private analyticsAggregator?: AnalyticsAggregator

  constructor(private options: X402AnalyticsOptions = {}) {
    super()
  }

  /**
   * Start analytics tracking
   */
  start(): void {
    if (this.isActive) {
      console.warn('x402 analytics tracker is already active')
      return
    }

    this.isActive = true

    // Start metrics aggregation
    if (this.options.metricsInterval) {
      this.metricsTimer = setInterval(() => {
        this.aggregateAndEmitMetrics()
      }, this.options.metricsInterval)
    }

    this.emit('started')
  }

  /**
   * Stop analytics tracking
   */
  stop(): void {
    this.isActive = false

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = undefined
    }

    this.emit('stopped')
  }

  /**
   * Record a new x402 payment event
   */
  recordPayment(event: X402PaymentEvent): void {
    if (!this.isActive) return

    // Store event
    this.paymentEvents.push(event)

    // Update agent metrics
    if (event.agent && event.status === 'confirmed') {
      const currentEarnings = this.agentEarnings.get(event.agent) ?? 0n
      this.agentEarnings.set(event.agent, currentEarnings + event.amount)

      const currentCalls = this.agentCallCounts.get(event.agent) ?? 0
      this.agentCallCounts.set(event.agent, currentCalls + 1)
    }

    // Update token volumes
    if (event.status === 'confirmed') {
      const currentVolume = this.tokenVolumes.get(event.token) ?? 0n
      this.tokenVolumes.set(event.token, currentVolume + event.amount)
    }

    // Emit event
    this.emit('payment', event)
    if (this.options.onPayment) {
      this.options.onPayment(event)
    }

    // Prune old events
    this.pruneOldEvents()
  }

  /**
   * Record payment from transaction signature
   */
  async recordPaymentFromSignature(
    signature: string,
    payer: Address,
    recipient: Address,
    amount: bigint,
    token: Address,
    agent?: Address
  ): Promise<void> {
    const event: X402PaymentEvent = {
      signature,
      timestamp: BigInt(Date.now()),
      payer,
      recipient,
      amount,
      token,
      agent,
      status: 'pending'
    }

    this.recordPayment(event)
  }

  /**
   * Update payment status
   */
  updatePaymentStatus(
    signature: string,
    status: 'confirmed' | 'failed',
    metadata?: Record<string, unknown>
  ): void {
    const event = this.paymentEvents.find(e => e.signature === signature)
    if (event) {
      event.status = status
      if (metadata) {
        event.metadata = { ...event.metadata, ...metadata }
      }

      this.emit('paymentStatusChanged', event)
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(periodSeconds?: number): X402TransactionMetrics {
    const now = BigInt(Date.now())
    const startTime = periodSeconds
      ? now - BigInt(periodSeconds * 1000)
      : this.getOldestEventTimestamp()

    // Filter events by period
    const periodEvents = this.paymentEvents.filter(e => e.timestamp >= startTime)

    // Calculate payment counts
    const total = periodEvents.length
    const successful = periodEvents.filter(e => e.status === 'confirmed').length
    const failed = periodEvents.filter(e => e.status === 'failed').length
    const pending = periodEvents.filter(e => e.status === 'pending').length

    // Calculate volume
    const successfulEvents = periodEvents.filter(e => e.status === 'confirmed')
    const totalVolume = successfulEvents.reduce((sum, e) => sum + e.amount, 0n)
    const averageVolume = successful > 0 ? totalVolume / BigInt(successful) : 0n

    // Calculate volume by token
    const volumeByToken = new Map<Address, bigint>()
    for (const event of successfulEvents) {
      const current = volumeByToken.get(event.token) ?? 0n
      volumeByToken.set(event.token, current + event.amount)
    }

    // Get active agents
    const activeAgents = new Set(
      periodEvents.filter(e => e.agent).map(e => e.agent!)
    )

    // Get top earners
    const topEarners = Array.from(this.agentEarnings.entries())
      .map(([agent, earnings]) => ({
        agent,
        earnings,
        callCount: this.agentCallCounts.get(agent) ?? 0
      }))
      .sort((a, b) => Number(b.earnings - a.earnings))
      .slice(0, 10)

    // Calculate confirmation times
    const confirmedEvents = periodEvents.filter(e => e.status === 'confirmed')
    const confirmationTimes = confirmedEvents
      .map(e => Number(e.metadata?.confirmationTime ?? 0))
      .filter(t => t > 0)

    const averageConfirmationTime = confirmationTimes.length > 0
      ? confirmationTimes.reduce((a, b) => a + b, 0) / confirmationTimes.length
      : 0

    // Calculate rates
    const successRate = total > 0 ? (successful / total) * 100 : 0
    const errorRate = total > 0 ? (failed / total) * 100 : 0

    return {
      period: {
        start: startTime,
        end: now
      },
      payments: {
        total,
        successful,
        failed,
        pending
      },
      volume: {
        total: totalVolume,
        average: averageVolume,
        byToken: volumeByToken
      },
      agents: {
        totalActive: activeAgents.size,
        topEarners
      },
      performance: {
        averageConfirmationTime,
        successRate,
        errorRate
      }
    }
  }

  /**
   * Get agent earnings
   */
  getAgentEarnings(agent: Address): {
    totalEarnings: bigint
    totalCalls: number
    averagePerCall: bigint
  } {
    const totalEarnings = this.agentEarnings.get(agent) ?? 0n
    const totalCalls = this.agentCallCounts.get(agent) ?? 0
    const averagePerCall = totalCalls > 0 ? totalEarnings / BigInt(totalCalls) : 0n

    return {
      totalEarnings,
      totalCalls,
      averagePerCall
    }
  }

  /**
   * Get token volume
   */
  getTokenVolume(token: Address): bigint {
    return this.tokenVolumes.get(token) ?? 0n
  }

  /**
   * Get payment history for agent
   */
  getAgentPaymentHistory(
    agent: Address,
    limit?: number
  ): X402PaymentEvent[] {
    const agentEvents = this.paymentEvents
      .filter(e => e.agent === agent)
      .sort((a, b) => Number(b.timestamp - a.timestamp))

    return limit ? agentEvents.slice(0, limit) : agentEvents
  }

  /**
   * Get recent payments
   */
  getRecentPayments(limit = 100): X402PaymentEvent[] {
    return this.paymentEvents
      .slice(-limit)
      .sort((a, b) => Number(b.timestamp - a.timestamp))
  }

  /**
   * Integrate with existing analytics streamer
   */
  integrateWithStreamer(streamer: AnalyticsStreamer): void {
    this.analyticsStreamer = streamer

    // Listen for transaction analytics events
    streamer.on('transactionAnalytics', (event: TransactionAnalyticsEvent) => {
      // Check if this is an x402 payment
      if (this.isX402Transaction(event)) {
        this.recordPaymentFromAnalyticsEvent(event)
      }
    })
  }

  /**
   * Integrate with existing analytics aggregator
   */
  integrateWithAggregator(aggregator: AnalyticsAggregator): void {
    this.analyticsAggregator = aggregator

    // Feed x402 payment events to aggregator
    this.on('payment', (event: X402PaymentEvent) => {
      if (event.status === 'confirmed' && this.analyticsAggregator) {
        // Convert to transaction analytics event
        const txEvent: TransactionAnalyticsEvent = {
          transactionType: 'x402_payment',
          amount: event.amount,
          from: event.payer,
          to: event.recipient,
          status: 'completed',
          timestamp: BigInt(event.timestamp),
          blockHeight: 0n // Would be populated from actual blockchain data
        }

        this.analyticsAggregator.processTransactionEvent(txEvent)
      }
    })
  }

  /**
   * Get aggregated metrics from integrated aggregator
   */
  getAggregatedMetrics(): AggregatedMetrics | null {
    return this.analyticsAggregator?.aggregate() ?? null
  }

  // Private helper methods

  private aggregateAndEmitMetrics(): void {
    try {
      const metrics = this.getMetrics()
      this.emit('metrics', metrics)

      if (this.options.onMetrics) {
        this.options.onMetrics(metrics)
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private pruneOldEvents(): void {
    if (!this.options.retentionPeriod) return

    const cutoffTime = BigInt(Date.now()) - BigInt(this.options.retentionPeriod * 1000)
    this.paymentEvents = this.paymentEvents.filter(e => e.timestamp > cutoffTime)
  }

  private getOldestEventTimestamp(): bigint {
    if (this.paymentEvents.length === 0) {
      return BigInt(Date.now())
    }
    return this.paymentEvents[0].timestamp
  }

  private isX402Transaction(event: TransactionAnalyticsEvent): boolean {
    return event.transactionType === 'x402_payment' ||
           event.transactionType === 'payment'
  }

  private recordPaymentFromAnalyticsEvent(event: TransactionAnalyticsEvent): void {
    const paymentEvent: X402PaymentEvent = {
      signature: '', // Not available in TransactionAnalyticsEvent
      timestamp: BigInt(event.timestamp),
      payer: event.from,
      recipient: event.to,
      amount: event.amount,
      token: '11111111111111111111111111111111' as Address, // Would parse from event
      status: event.status === 'completed' ? 'confirmed' : 'failed'
    }

    this.recordPayment(paymentEvent)
  }

  private handleError(error: Error): void {
    this.emit('error', error)
    if (this.options.onError) {
      this.options.onError(error)
    }
  }

  /**
   * Clear all tracked data
   */
  clearData(): void {
    this.paymentEvents = []
    this.agentEarnings.clear()
    this.agentCallCounts.clear()
    this.tokenVolumes.clear()
  }

  /**
   * Get tracker statistics
   */
  getStats(): {
    eventsTracked: number
    agentsTracked: number
    tokensTracked: number
    isActive: boolean
  } {
    return {
      eventsTracked: this.paymentEvents.length,
      agentsTracked: this.agentEarnings.size,
      tokensTracked: this.tokenVolumes.size,
      isActive: this.isActive
    }
  }
}

/**
 * Create x402 analytics tracker instance
 */
export function createX402AnalyticsTracker(
  options?: X402AnalyticsOptions
): X402AnalyticsTracker {
  return new X402AnalyticsTracker(options)
}

/**
 * x402 analytics event handlers type
 */
export interface X402AnalyticsEventHandlers {
  onPayment?: (event: X402PaymentEvent) => void
  onPaymentStatusChanged?: (event: X402PaymentEvent) => void
  onMetrics?: (metrics: X402TransactionMetrics) => void
  onError?: (error: Error) => void
  onStarted?: () => void
  onStopped?: () => void
}
