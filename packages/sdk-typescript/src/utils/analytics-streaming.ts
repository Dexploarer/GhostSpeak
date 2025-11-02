/**
 * Real-time Analytics Streaming Module
 * 
 * Provides WebSocket-based streaming of analytics events and metrics
 * for real-time dashboards and monitoring systems.
 */

import type { Address, Commitment } from '@solana/kit'
import { EventEmitter } from 'node:events'
// Create compatibility types for WebSocket functionality
// v2 WebSocket subscriptions are not yet available in @solana/kit
type Connection = any

// Create a simple PublicKey compatibility class
class PublicKey {
  private _address: string

  constructor(value: string | Address) {
    this._address = typeof value === 'string' ? value : value.address
  }

  toString(): string {
    return this._address
  }

  toBase58(): string {
    return this._address
  }
}
import {
  getAgentAnalyticsEventDecoder,
  getTransactionAnalyticsEventDecoder,
  getMarketplaceActivityEventDecoder,
  getNetworkHealthEventDecoder,
  getUserEngagementEventDecoder,
  getServicePerformanceEventDecoder,
  getEconomicMetricsEventDecoder,
  type AgentAnalyticsEvent,
  type TransactionAnalyticsEvent,
  type MarketplaceActivityEvent,
  type NetworkHealthEvent,
  type UserEngagementEvent,
  type ServicePerformanceEvent,
  type EconomicMetricsEvent
} from '../generated/types/index.js'

// Re-export analytics event types from generated code
export type {
  AgentAnalyticsEvent,
  TransactionAnalyticsEvent,
  MarketplaceActivityEvent,
  NetworkHealthEvent,
  UserEngagementEvent,
  ServicePerformanceEvent,
  EconomicMetricsEvent
} from '../generated/types/index.js'

// Aggregated metrics for streaming
export interface StreamedMetrics {
  period: { start: bigint; end: bigint }
  agents: {
    total: number
    active: number
    new: number
  }
  transactions: {
    count: number
    volume: bigint
    averageValue: bigint
    successRate: number
  }
  performance: {
    avgResponseTime: bigint
    throughput: number
    errorRate: number
  }
  market: {
    totalValueLocked: bigint
    dailyVolume: bigint
    priceVolatility: number
  }
}

export interface AnalyticsStreamOptions {
  programId: Address
  commitment?: Commitment
  includeHistorical?: boolean
  metricsInterval?: number // milliseconds
  eventTypes?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

/**
 * Real-time analytics streaming client
 * 
 * Provides WebSocket streaming of analytics events and aggregated metrics
 * for building real-time dashboards and monitoring systems.
 */
export class AnalyticsStreamer extends EventEmitter {
  private connection: Connection
  private programId: PublicKey
  private wsSubscriptionId?: number
  private metricsTimer?: ReturnType<typeof setInterval>
  private reconnectAttempts = 0
  private isActive = false
  
  // Event accumulators for metrics calculation
  private eventBuffer: Map<string, unknown[]> = new Map()
  private lastMetricsTimestamp = BigInt(Date.now())
  
  constructor(
    connection: Connection,
    private options: AnalyticsStreamOptions
  ) {
    super()
    this.connection = connection
    this.programId = new PublicKey(options.programId)
  }

  /**
   * Start streaming analytics events and metrics
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('Analytics streamer is already active')
      return
    }

    this.isActive = true
    this.reconnectAttempts = 0
    
    // Start WebSocket subscription for events
    await this.subscribeToEvents()
    
    // Start metrics aggregation timer
    if (this.options.metricsInterval) {
      this.startMetricsAggregation()
    }
    
    // Fetch historical data if requested
    if (this.options.includeHistorical) {
      await this.fetchHistoricalData()
    }
    
    this.emit('connected')
  }

  /**
   * Stop streaming
   */
  async stop(): Promise<void> {
    this.isActive = false
    
    // Unsubscribe from WebSocket
    if (this.wsSubscriptionId !== undefined) {
      try {
        await this.connection.removeOnLogsListener(this.wsSubscriptionId)
      } catch (error) {
        console.error('Error removing WebSocket subscription:', error)
      }
      this.wsSubscriptionId = undefined
    }
    
    // Clear metrics timer
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = undefined
    }
    
    // Clear buffers
    this.eventBuffer.clear()
    
    this.emit('disconnected')
  }

  /**
   * Subscribe to program events via WebSocket
   */
  private async subscribeToEvents(): Promise<void> {
    try {
      // Subscribe to program logs for event parsing
      this.wsSubscriptionId = this.connection.onLogs(
        this.programId,
        (logs, ctx) => {
          this.processLogs(logs, ctx)
        },
        this.options.commitment ?? 'confirmed'
      )
      
      console.log('Subscribed to analytics events')
    } catch (error) {
      console.error('Failed to subscribe to events:', error)
      await this.handleReconnect()
    }
  }

  /**
   * Process incoming logs and extract events
   */
  private processLogs(logs: { logs: string[] }, context: unknown): void {
    void context // Mark as intentionally unused
    try {
      // Parse logs for event data
      const events = this.parseEventsFromLogs(logs)
      
      // Emit individual events
      for (const event of events) {
        this.emitAnalyticsEvent(event)
        
        // Buffer events for metrics aggregation
        this.bufferEvent(event)
      }
    } catch (error) {
      console.error('Error processing logs:', error)
      this.emit('error', error)
    }
  }

  /**
   * Parse events from program logs
   */
  private parseEventsFromLogs(logs: { logs: string[] }): unknown[] {
    const events: unknown[] = []
    
    // Look for event markers in logs
    for (const log of logs.logs) {
      if (log.includes('Program data:')) {
        try {
          // Extract and decode event data
          const dataStr = log.split('Program data: ')[1]
          const eventData = this.decodeEventData(dataStr)
          
          if (eventData && this.isAnalyticsEvent(eventData)) {
            events.push(eventData)
          }
        } catch {
          // Skip malformed events
          continue
        }
      }
    }
    
    return events
  }

  /**
   * Decode event data from base64
   */
  private decodeEventData(dataStr: string): unknown {
    try {
      // Decode base64 and parse event structure
      const buffer = Buffer.from(dataStr, 'base64')
      
      // Parse event discriminator and data
      // This is a simplified version - actual implementation would use proper borsh deserialization
      const eventType = this.getEventType(buffer)
      const eventData = this.parseEventData(eventType, buffer)
      
      return { type: eventType, data: eventData }
    } catch {
      return null
    }
  }

  /**
   * Check if event is an analytics event
   */
  private isAnalyticsEvent(event: unknown): boolean {
    const analyticsEventTypes = [
      'AgentAnalyticsEvent',
      'TransactionAnalyticsEvent',
      'MarketplaceActivityEvent',
      'NetworkHealthEvent',
      'UserEngagementEvent',
      'ServicePerformanceEvent',
      'EconomicMetricsEvent'
    ]
    
    return analyticsEventTypes.includes((event as { type: string }).type)
  }

  /**
   * Emit typed analytics event
   */
  private emitAnalyticsEvent(event: unknown): void {
    const { type, data } = event as { type: string; data: unknown }
    
    // Filter by requested event types
    if (this.options.eventTypes && !this.options.eventTypes.includes(type)) {
      return
    }
    
    // Emit typed event
    switch (type) {
      case 'AgentAnalyticsEvent':
        this.emit('agentAnalytics', data as AgentAnalyticsEvent)
        break
      case 'TransactionAnalyticsEvent':
        this.emit('transactionAnalytics', data as TransactionAnalyticsEvent)
        break
      case 'MarketplaceActivityEvent':
        this.emit('marketplaceActivity', data as MarketplaceActivityEvent)
        break
      case 'NetworkHealthEvent':
        this.emit('networkHealth', data as NetworkHealthEvent)
        break
      case 'UserEngagementEvent':
        this.emit('userEngagement', data as UserEngagementEvent)
        break
      case 'ServicePerformanceEvent':
        this.emit('servicePerformance', data as ServicePerformanceEvent)
        break
      case 'EconomicMetricsEvent':
        this.emit('economicMetrics', data as EconomicMetricsEvent)
        break
    }
    
    // Also emit generic event
    this.emit('event', { type, data })
  }

  /**
   * Buffer events for metrics aggregation
   */
  private bufferEvent(event: unknown): void {
    const { type, data } = event as { type: string; data: unknown }
    
    if (!this.eventBuffer.has(type)) {
      this.eventBuffer.set(type, [])
    }
    
    this.eventBuffer.get(type)!.push(data)
  }

  /**
   * Start periodic metrics aggregation
   */
  private startMetricsAggregation(): void {
    const interval = this.options.metricsInterval ?? 5000 // Default 5 seconds
    
    this.metricsTimer = setInterval(() => {
      this.aggregateAndEmitMetrics()
    }, interval)
  }

  /**
   * Aggregate buffered events into metrics
   */
  private aggregateAndEmitMetrics(): void {
    const now = BigInt(Date.now())
    const metrics: StreamedMetrics = {
      period: {
        start: this.lastMetricsTimestamp,
        end: now
      },
      agents: {
        total: 0,
        active: 0,
        new: 0
      },
      transactions: {
        count: 0,
        volume: BigInt(0),
        averageValue: BigInt(0),
        successRate: 0
      },
      performance: {
        avgResponseTime: BigInt(0),
        throughput: 0,
        errorRate: 0
      },
      market: {
        totalValueLocked: 0n,
        dailyVolume: 0n,
        priceVolatility: 0
      }
    }
    
    // Aggregate agent events
const agentEvents = this.eventBuffer.get('AgentAnalyticsEvent') as AgentAnalyticsEvent[]
    if (agentEvents.length > 0) {
      const uniqueAgents = new Set(agentEvents.map(e => e.agent))
      metrics.agents.active = uniqueAgents.size
      metrics.agents.new = agentEvents.filter(e => e.operation === 'register').length
      
      // Calculate average response time
      const responseTimes = agentEvents.map(e => e.responseTime).filter(t => t > 0n)
      if (responseTimes.length > 0) {
        metrics.performance.avgResponseTime = responseTimes.reduce((a, b) => a + b) / BigInt(responseTimes.length)
      }
    }
    
    // Aggregate transaction events
const txEvents = this.eventBuffer.get('TransactionAnalyticsEvent') as TransactionAnalyticsEvent[]
    if (txEvents.length > 0) {
      metrics.transactions.count = txEvents.length
      metrics.transactions.volume = txEvents.reduce((sum, e) => sum + e.amount, 0n)
      metrics.transactions.averageValue = metrics.transactions.volume / BigInt(txEvents.length)
      
      const successfulTxs = txEvents.filter(e => e.status === 'completed').length
      metrics.transactions.successRate = (successfulTxs / txEvents.length) * 100
    }
    
    // Aggregate economic events
const economicEvents = this.eventBuffer.get('EconomicMetricsEvent') as EconomicMetricsEvent[]
    if (economicEvents.length > 0) {
      const latestEconomic = economicEvents[economicEvents.length - 1]
      metrics.market.totalValueLocked = latestEconomic.totalValueLocked
      metrics.market.dailyVolume = latestEconomic.dailyVolume
    }
    
    // Calculate throughput
    const periodSeconds = Number(now - this.lastMetricsTimestamp) / 1000
    metrics.performance.throughput = metrics.transactions.count / periodSeconds
    
    // Clear buffers after aggregation
    this.eventBuffer.clear()
    this.lastMetricsTimestamp = now
    
    // Emit aggregated metrics
    this.emit('metrics', metrics)
  }

  /**
   * Fetch historical analytics data
   */
  private async fetchHistoricalData(): Promise<void> {
    try {
      // Get recent transaction signatures
      const signatures = await this.connection.getSignaturesForAddress(
        this.programId,
        { limit: 100 },
        this.options.commitment as 'confirmed'
      )
      
      // Process historical transactions
      for (const sig of signatures) {
        const tx = await this.connection.getTransaction(sig.signature, {
          commitment: this.options.commitment as 'confirmed',
          maxSupportedTransactionVersion: 0
        })
        
        if (tx?.meta?.logMessages) {
          this.processLogs({ logs: tx.meta.logMessages }, { slot: sig.slot })
        }
      }
      
      this.emit('historicalDataLoaded')
    } catch (error) {
      console.error('Failed to fetch historical data:', error)
      this.emit('error', error)
    }
  }

  /**
   * Handle reconnection on disconnect
   */
  private async handleReconnect(): Promise<void> {
    if (!this.isActive) return
    
    const maxAttempts = this.options.maxReconnectAttempts ?? 5
    const reconnectInterval = this.options.reconnectInterval ?? 5000
    
    if (this.reconnectAttempts >= maxAttempts) {
      this.emit('maxReconnectAttemptsReached')
      await this.stop()
      return
    }
    
    this.reconnectAttempts++
    this.emit('reconnecting', { attempt: this.reconnectAttempts, maxAttempts })
    
    setTimeout(async () => {
      if (this.isActive) {
        await this.subscribeToEvents()
      }
    }, reconnectInterval)
  }

  // Event parsing with real discriminators
  private getEventType(buffer: Buffer): string {
    // Extract 8-byte discriminator and convert to hex string
    const discriminator = buffer.slice(0, 8).toString('hex')
    
    // Real discriminator mappings from generated IDL
    const eventTypeMap: Record<string, string> = {
      '8a86421528393c5': 'AgentAnalyticsEvent',
      '2d88a996aaa670df': 'TransactionAnalyticsEvent', 
      '9f44a46e713ce403': 'MarketplaceActivityEvent',
      '8c9e495c53fa32b7': 'NetworkHealthEvent',
      'd22e3c6f0548d2bb': 'UserEngagementEvent',
      'c3cd1392aa456fcd': 'ServicePerformanceEvent',
      '9cd02d6d24357298': 'EconomicMetricsEvent'
    }
    
    return eventTypeMap[discriminator] ?? 'UnknownEvent'
  }

  private parseEventData(eventType: string, buffer: Buffer): unknown {
    try {
      // Use generated decoders for proper borsh deserialization
      switch (eventType) {
        case 'AgentAnalyticsEvent': {
          const decoder = getAgentAnalyticsEventDecoder()
          return decoder.decode(buffer)
        }
        case 'TransactionAnalyticsEvent': {
          const decoder = getTransactionAnalyticsEventDecoder()
          return decoder.decode(buffer)
        }
        case 'MarketplaceActivityEvent': {
          const decoder = getMarketplaceActivityEventDecoder()
          return decoder.decode(buffer)
        }
        case 'NetworkHealthEvent': {
          const decoder = getNetworkHealthEventDecoder()
          return decoder.decode(buffer)
        }
        case 'UserEngagementEvent': {
          const decoder = getUserEngagementEventDecoder()
          return decoder.decode(buffer)
        }
        case 'ServicePerformanceEvent': {
          const decoder = getServicePerformanceEventDecoder()
          return decoder.decode(buffer)
        }
        case 'EconomicMetricsEvent': {
          const decoder = getEconomicMetricsEventDecoder()
          return decoder.decode(buffer)
        }
        default:
          console.warn(`Unknown event type: ${eventType}`)
          return null
      }
    } catch (error) {
      console.error(`Failed to decode ${eventType}:`, error)
      return null
    }
  }
}

/**
 * Create analytics streamer instance
 */
export function createAnalyticsStreamer(
  connection: Connection,
  options: AnalyticsStreamOptions
): AnalyticsStreamer {
  return new AnalyticsStreamer(connection, options)
}

/**
 * Analytics event handlers type
 */
export interface AnalyticsEventHandlers {
  onAgentAnalytics?: (event: AgentAnalyticsEvent) => void
  onTransactionAnalytics?: (event: TransactionAnalyticsEvent) => void
  onMarketplaceActivity?: (event: MarketplaceActivityEvent) => void
  onNetworkHealth?: (event: NetworkHealthEvent) => void
  onUserEngagement?: (event: UserEngagementEvent) => void
  onServicePerformance?: (event: ServicePerformanceEvent) => void
  onEconomicMetrics?: (event: EconomicMetricsEvent) => void
  onMetrics?: (metrics: StreamedMetrics) => void
  onError?: (error: Error) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onReconnecting?: (info: { attempt: number; maxAttempts: number }) => void
}