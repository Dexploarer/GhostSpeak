/**
 * Time-Windowed Metrics Aggregator for x402 Resources
 *
 * Provides comprehensive time-windowed analytics for x402 resources,
 * including latency percentiles, status code distribution, and payment metrics.
 *
 * @module x402/TimeWindowedMetrics
 */

import { EventEmitter } from 'node:events'
import type { TimeWindow, TimeWindowedResourceMetrics } from '../database/schema/resourceMetrics.js'
import { TIME_WINDOWS } from '../database/schema/resourceMetrics.js'

// =====================================================
// TYPES
// =====================================================

/**
 * Raw ping/request event for aggregation
 */
export interface ResourceRequestEvent {
  resourceId: string
  timestamp: number
  latencyMs: number
  statusCode: number
  success: boolean
  paymentAmount?: bigint
  payerAddress?: string
  errorMessage?: string
}

/**
 * Time window configuration
 */
export interface TimeWindowConfig {
  window: TimeWindow
  durationMs: number
}

/**
 * Aggregated metrics for a single time window
 */
export interface WindowMetrics {
  window: TimeWindow
  requests: {
    total: number
    success: number
    failure: number
  }
  latencies: number[]
  statusCodes: {
    '2xx': number
    '3xx': number
    '4xx': number
    '5xx': number
  }
  payments: {
    amounts: bigint[]
    payers: Set<string>
  }
  outages: number
  lastSuccess: number | null
  lastFailure: number | null
}

/**
 * Percentile calculation result
 */
export interface LatencyPercentiles {
  p50: number | null
  p90: number | null
  p99: number | null
  min: number | null
  max: number | null
  avg: number | null
}

/**
 * Time-windowed metrics aggregator options
 */
export interface TimeWindowedMetricsOptions {
  maxEventsPerWindow?: number
  cleanupIntervalMs?: number
  outageThresholdMs?: number
}

// =====================================================
// TIME WINDOW DURATIONS
// =====================================================

/**
 * Duration in milliseconds for each time window
 */
export const TIME_WINDOW_DURATIONS: Record<TimeWindow, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '15d': 15 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: Number.MAX_SAFE_INTEGER
}

// =====================================================
// TIME-WINDOWED METRICS AGGREGATOR
// =====================================================

/**
 * Aggregates x402 resource metrics across multiple time windows
 */
export class TimeWindowedMetricsAggregator extends EventEmitter {
  private readonly maxEventsPerWindow: number
  private readonly outageThresholdMs: number

  // Events stored by resourceId -> window -> events
  private eventStore: Map<string, Map<TimeWindow, ResourceRequestEvent[]>> = new Map()

  // Metrics cache by resourceId -> window -> metrics
  private metricsCache: Map<string, Map<TimeWindow, WindowMetrics>> = new Map()

  // Cleanup interval
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(options?: TimeWindowedMetricsOptions) {
    super()
    this.maxEventsPerWindow = options?.maxEventsPerWindow ?? 10000
    this.outageThresholdMs = options?.outageThresholdMs ?? 60000 // 1 minute

    // Start cleanup interval
    const cleanupInterval = options?.cleanupIntervalMs ?? 60000
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval)
  }

  // =====================================================
  // EVENT PROCESSING
  // =====================================================

  /**
   * Record a request event for a resource
   */
  recordEvent(event: ResourceRequestEvent): void {
    const { resourceId } = event

    // Initialize storage if needed
    if (!this.eventStore.has(resourceId)) {
      this.eventStore.set(resourceId, new Map())
      for (const window of TIME_WINDOWS) {
        this.eventStore.get(resourceId)!.set(window, [])
      }
    }

    // Add event to all applicable windows
    const resourceEvents = this.eventStore.get(resourceId)!
    for (const window of TIME_WINDOWS) {
      const events = resourceEvents.get(window)!

      // Add event
      events.push(event)

      // Trim if exceeds max
      if (events.length > this.maxEventsPerWindow) {
        events.shift()
      }
    }

    // Invalidate cache for this resource
    this.metricsCache.delete(resourceId)

    // Emit event
    this.emit('event:recorded', event)
  }

  /**
   * Record multiple events in batch
   */
  recordEvents(events: ResourceRequestEvent[]): void {
    for (const event of events) {
      this.recordEvent(event)
    }
  }

  // =====================================================
  // METRICS CALCULATION
  // =====================================================

  /**
   * Get metrics for a resource across all time windows
   */
  getMetrics(resourceId: string): TimeWindowedResourceMetrics[] {
    return TIME_WINDOWS.map(window => this.getWindowMetrics(resourceId, window))
  }

  /**
   * Get metrics for a specific time window
   */
  getWindowMetrics(resourceId: string, window: TimeWindow): TimeWindowedResourceMetrics {
    // Check cache
    const cached = this.metricsCache.get(resourceId)?.get(window)
    if (cached) {
      return this.buildMetricsResponse(resourceId, window, cached)
    }

    // Calculate metrics
    const events = this.getEventsForWindow(resourceId, window)
    const metrics = this.calculateWindowMetrics(events, window)

    // Cache result
    if (!this.metricsCache.has(resourceId)) {
      this.metricsCache.set(resourceId, new Map())
    }
    this.metricsCache.get(resourceId)!.set(window, metrics)

    return this.buildMetricsResponse(resourceId, window, metrics)
  }

  /**
   * Get events for a specific time window
   */
  private getEventsForWindow(
    resourceId: string,
    window: TimeWindow
  ): ResourceRequestEvent[] {
    const allEvents = this.eventStore.get(resourceId)?.get(window) ?? []

    if (window === 'all') {
      return allEvents
    }

    // Filter to events within the window
    const cutoff = Date.now() - TIME_WINDOW_DURATIONS[window]
    return allEvents.filter(e => e.timestamp >= cutoff)
  }

  /**
   * Calculate metrics for a set of events
   */
  private calculateWindowMetrics(
    events: ResourceRequestEvent[],
    window: TimeWindow
  ): WindowMetrics {
    const metrics: WindowMetrics = {
      window,
      requests: { total: 0, success: 0, failure: 0 },
      latencies: [],
      statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      payments: { amounts: [], payers: new Set() },
      outages: 0,
      lastSuccess: null,
      lastFailure: null
    }

    let lastSuccessTime: number | null = null

    for (const event of events) {
      metrics.requests.total++

      if (event.success) {
        metrics.requests.success++
        metrics.lastSuccess = event.timestamp

        // Check for outage recovery
        if (lastSuccessTime !== null) {
          const gap = event.timestamp - lastSuccessTime
          if (gap > this.outageThresholdMs) {
            metrics.outages++
          }
        }
        lastSuccessTime = event.timestamp
      } else {
        metrics.requests.failure++
        metrics.lastFailure = event.timestamp
      }

      // Record latency
      if (event.latencyMs > 0) {
        metrics.latencies.push(event.latencyMs)
      }

      // Categorize status code
      if (event.statusCode >= 200 && event.statusCode < 300) {
        metrics.statusCodes['2xx']++
      } else if (event.statusCode >= 300 && event.statusCode < 400) {
        metrics.statusCodes['3xx']++
      } else if (event.statusCode >= 400 && event.statusCode < 500) {
        metrics.statusCodes['4xx']++
      } else if (event.statusCode >= 500) {
        metrics.statusCodes['5xx']++
      }

      // Record payment
      if (event.paymentAmount != null && event.paymentAmount > 0n) {
        metrics.payments.amounts.push(event.paymentAmount)
        if (event.payerAddress) {
          metrics.payments.payers.add(event.payerAddress)
        }
      }
    }

    return metrics
  }

  /**
   * Build the final metrics response
   */
  private buildMetricsResponse(
    resourceId: string,
    window: TimeWindow,
    metrics: WindowMetrics
  ): TimeWindowedResourceMetrics {
    const latencyPercentiles = this.calculatePercentiles(metrics.latencies)
    const totalPayments = metrics.payments.amounts.reduce((a, b) => a + b, 0n)
    const avgPayment =
      metrics.payments.amounts.length > 0
        ? totalPayments / BigInt(metrics.payments.amounts.length)
        : null

    const successRate =
      metrics.requests.total > 0
        ? (metrics.requests.success / metrics.requests.total) * 100
        : 0

    // Calculate uptime based on success rate and outages
    const uptimePercent = this.calculateUptime(metrics)

    return {
      resourceId,
      window,
      requests: {
        total: metrics.requests.total,
        success: metrics.requests.success,
        failure: metrics.requests.failure,
        successRate
      },
      latency: {
        p50: latencyPercentiles.p50,
        p90: latencyPercentiles.p90,
        p99: latencyPercentiles.p99
      },
      statusCodes: metrics.statusCodes,
      uptime: {
        percent: uptimePercent,
        outages: metrics.outages
      },
      payments: {
        volume: totalPayments,
        count: metrics.payments.amounts.length,
        average: avgPayment,
        uniquePayers: metrics.payments.payers.size
      }
    }
  }

  // =====================================================
  // PERCENTILE CALCULATIONS
  // =====================================================

  /**
   * Calculate latency percentiles
   */
  private calculatePercentiles(latencies: number[]): LatencyPercentiles {
    if (latencies.length === 0) {
      return { p50: null, p90: null, p99: null, min: null, max: null, avg: null }
    }

    const sorted = [...latencies].sort((a, b) => a - b)
    const len = sorted.length

    return {
      p50: this.percentile(sorted, 50),
      p90: this.percentile(sorted, 90),
      p99: this.percentile(sorted, 99),
      min: sorted[0],
      max: sorted[len - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / len
    }
  }

  /**
   * Calculate a specific percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(metrics: WindowMetrics): number | null {
    if (metrics.requests.total === 0) {
      return null
    }

    // Base uptime on success rate
    const successRate = metrics.requests.success / metrics.requests.total

    // Penalize for outages (each outage reduces uptime by 1%)
    const outagePenalty = Math.min(metrics.outages * 0.01, 0.1)

    return Math.max(0, (successRate - outagePenalty) * 100)
  }

  // =====================================================
  // GLOBAL METRICS
  // =====================================================

  /**
   * Get global metrics across all resources
   */
  getGlobalMetrics(window: TimeWindow): {
    totalResources: number
    activeResources: number
    requests: { total: number; success: number; failure: number }
    payments: { volume: bigint; count: number; uniquePayers: number }
    avgLatencyP50: number | null
    avgLatencyP90: number | null
  } {
    const resourceIds = Array.from(this.eventStore.keys())
    const allMetrics = resourceIds.map(id => this.getWindowMetrics(id, window))

    let totalRequests = 0
    let successRequests = 0
    let failureRequests = 0
    let paymentVolume = 0n
    let paymentCount = 0
    const allPayers = new Set<string>()
    const allP50: number[] = []
    const allP90: number[] = []

    let activeResources = 0

    for (const m of allMetrics) {
      totalRequests += m.requests.total
      successRequests += m.requests.success
      failureRequests += m.requests.failure
      paymentVolume += m.payments.volume
      paymentCount += m.payments.count

      if (m.latency.p50 != null) allP50.push(m.latency.p50)
      if (m.latency.p90 != null) allP90.push(m.latency.p90)

      if (m.requests.total > 0) activeResources++
    }

    return {
      totalResources: resourceIds.length,
      activeResources,
      requests: {
        total: totalRequests,
        success: successRequests,
        failure: failureRequests
      },
      payments: {
        volume: paymentVolume,
        count: paymentCount,
        uniquePayers: allPayers.size
      },
      avgLatencyP50: allP50.length > 0 ? allP50.reduce((a, b) => a + b) / allP50.length : null,
      avgLatencyP90: allP90.length > 0 ? allP90.reduce((a, b) => a + b) / allP90.length : null
    }
  }

  /**
   * Get top resources by a metric
   */
  getTopResources(
    window: TimeWindow,
    metric: 'requests' | 'volume' | 'latency',
    limit: number = 10
  ): Array<{ resourceId: string; value: number | bigint }> {
    const resourceIds = Array.from(this.eventStore.keys())
    const metricsWithIds = resourceIds.map(id => ({
      resourceId: id,
      metrics: this.getWindowMetrics(id, window)
    }))

    let sorted: Array<{ resourceId: string; value: number | bigint }>

    switch (metric) {
      case 'requests':
        sorted = metricsWithIds
          .map(m => ({ resourceId: m.resourceId, value: m.metrics.requests.total }))
          .sort((a, b) => (b.value as number) - (a.value as number))
        break
      case 'volume':
        sorted = metricsWithIds
          .map(m => ({ resourceId: m.resourceId, value: m.metrics.payments.volume }))
          .sort((a, b) => Number(b.value) - Number(a.value))
        break
      case 'latency':
        sorted = metricsWithIds
          .filter(m => m.metrics.latency.p50 != null)
          .map(m => ({ resourceId: m.resourceId, value: m.metrics.latency.p50! }))
          .sort((a, b) => (a.value as number) - (b.value as number)) // Lower is better
        break
      default:
        sorted = []
    }

    return sorted.slice(0, limit)
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  /**
   * Clean up old events outside their time windows
   */
  private cleanup(): void {
    const now = Date.now()

    for (const [resourceId, windowEvents] of this.eventStore) {
      for (const window of TIME_WINDOWS) {
        if (window === 'all') continue

        const cutoff = now - TIME_WINDOW_DURATIONS[window]
        const events = windowEvents.get(window)!
        const filtered = events.filter(e => e.timestamp >= cutoff)

        if (filtered.length !== events.length) {
          windowEvents.set(window, filtered)
          // Invalidate cache
          this.metricsCache.get(resourceId)?.delete(window)
        }
      }
    }
  }

  /**
   * Clear all data for a resource
   */
  clearResource(resourceId: string): void {
    this.eventStore.delete(resourceId)
    this.metricsCache.delete(resourceId)
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.eventStore.clear()
    this.metricsCache.clear()
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Get resource count
   */
  getResourceCount(): number {
    return this.eventStore.size
  }

  /**
   * Export data for persistence
   */
  exportData(): Map<string, ResourceRequestEvent[]> {
    const result = new Map<string, ResourceRequestEvent[]>()
    for (const [resourceId, windowEvents] of this.eventStore) {
      // Export "all" window which contains all events
      result.set(resourceId, windowEvents.get('all') ?? [])
    }
    return result
  }

  /**
   * Import data from persistence
   */
  importData(data: Map<string, ResourceRequestEvent[]>): void {
    for (const [resourceId, events] of data) {
      for (const event of events) {
        this.recordEvent({ ...event, resourceId })
      }
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new time-windowed metrics aggregator
 */
export function createTimeWindowedMetricsAggregator(
  options?: TimeWindowedMetricsOptions
): TimeWindowedMetricsAggregator {
  return new TimeWindowedMetricsAggregator(options)
}
