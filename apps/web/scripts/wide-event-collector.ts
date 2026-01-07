/**
 * Wide Event Collector
 *
 * Collects and analyzes wide events emitted by the application during testing.
 * Provides utilities for correlation analysis, performance monitoring, and
 * comprehensive event inspection.
 */

import { getWideEventLogger } from '../lib/logging/wide-event'

interface CollectedEvent {
  id: string
  timestamp: Date
  event: any
  correlationId?: string
  chain: string[]
}

export class WideEventCollector {
  private events: CollectedEvent[] = []
  private isCollecting = false
  private originalEmit: any
  private logger = getWideEventLogger()

  async startCollection(): Promise<void> {
    if (this.isCollecting) return

    this.isCollecting = true
    this.events = []

    // Intercept wide event emissions
    this.originalEmit = this.logger.emit.bind(this.logger)
    this.logger.emit = this.interceptEmit.bind(this)

    console.log('📊 Wide event collection started')
  }

  async stopCollection(): Promise<void> {
    if (!this.isCollecting) return

    // Restore original emit function
    this.logger.emit = this.originalEmit
    this.isCollecting = false

    console.log(`📊 Wide event collection stopped. Collected: ${this.events.length} events`)
  }

  private interceptEmit(event: any): void {
    // Call original emit
    this.originalEmit(event)

    // Collect the event
    const collectedEvent: CollectedEvent = {
      id: event.request_id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      event: { ...event },
      correlationId: event.correlation_id,
      chain: this.buildCorrelationChain(event.correlation_id || event.request_id)
    }

    this.events.push(collectedEvent)

    // Log collection activity
    console.log(`📊 Collected event: ${event.method || 'UNKNOWN'} ${event.path || 'unknown'} → ${event.status_code || 'pending'}`)
  }

  private buildCorrelationChain(correlationId: string): string[] {
    // Find all events in this correlation chain
    const chainEvents = this.events.filter(e =>
      e.correlationId === correlationId ||
      e.event.request_id === correlationId
    )

    return chainEvents.map(e => `${e.event.method} ${e.event.path}`).filter(Boolean)
  }

  async getAllEvents(): Promise<any[]> {
    return this.events.map(e => e.event)
  }

  async getRecentEvents(count: number = 10): Promise<any[]> {
    return this.events
      .slice(-count)
      .map(e => e.event)
  }

  async getEventsByCorrelation(correlationId: string): Promise<any[]> {
    return this.events
      .filter(e => e.correlationId === correlationId)
      .map(e => e.event)
  }

  async getEventsByPath(path: string): Promise<any[]> {
    return this.events
      .filter(e => e.event.path === path)
      .map(e => e.event)
  }

  async getEventsByService(service: string): Promise<any[]> {
    return this.events
      .filter(e => e.event.service === service)
      .map(e => e.event)
  }

  async getErrorEvents(): Promise<any[]> {
    return this.events
      .filter(e => e.event.outcome === 'error' || (e.event.status_code && e.event.status_code >= 400))
      .map(e => e.event)
  }

  async getPerformanceMetrics(): Promise<{
    averageResponseTime: number
    slowestEndpoints: Array<{ path: string, avgTime: number }>
    errorRate: number
    totalRequests: number
  }> {
    const events = this.events.map(e => e.event)
    const responseTimes: Record<string, number[]> = {}

    events.forEach(event => {
      if (event.path && event.duration_ms) {
        if (!responseTimes[event.path]) responseTimes[event.path] = []
        responseTimes[event.path].push(event.duration_ms)
      }
    })

    // Calculate averages
    const endpointMetrics = Object.entries(responseTimes).map(([path, times]) => ({
      path,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      count: times.length
    }))

    const allResponseTimes = Object.values(responseTimes).flat()
    const averageResponseTime = allResponseTimes.length > 0
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
      : 0

    const slowestEndpoints = endpointMetrics
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5)

    const errorEvents = events.filter(e => e.outcome === 'error' || (e.status_code && e.status_code >= 400))
    const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0

    return {
      averageResponseTime,
      slowestEndpoints,
      errorRate,
      totalRequests: events.length
    }
  }

  async analyzeCorrelations(): Promise<{
    totalChains: number
    averageChainLength: number
    longestChain: number
    serviceDistribution: Record<string, number>
    brokenChains: number
  }> {
    const correlationGroups: Record<string, any[]> = {}

    this.events.forEach(collected => {
      const corrId = collected.correlationId || collected.event.request_id
      if (!correlationGroups[corrId]) {
        correlationGroups[corrId] = []
      }
      correlationGroups[corrId].push(collected.event)
    })

    const totalChains = Object.keys(correlationGroups).length
    const chainLengths = Object.values(correlationGroups).map(chain => chain.length)
    const averageChainLength = chainLengths.reduce((a, b) => a + b, 0) / chainLengths.length
    const longestChain = Math.max(...chainLengths)

    // Analyze service distribution
    const serviceDistribution: Record<string, number> = {}
    Object.values(correlationGroups).forEach(chain => {
      chain.forEach(event => {
        const service = event.service || 'unknown'
        serviceDistribution[service] = (serviceDistribution[service] || 0) + 1
      })
    })

    // Count broken chains (chains with errors that don't have successful recovery)
    let brokenChains = 0
    Object.values(correlationGroups).forEach(chain => {
      const hasError = chain.some(e => e.outcome === 'error')
      const hasSuccess = chain.some(e => e.outcome === 'success')
      if (hasError && !hasSuccess) {
        brokenChains++
      }
    })

    return {
      totalChains,
      averageChainLength,
      longestChain,
      serviceDistribution,
      brokenChains
    }
  }

  async exportEvents(): Promise<string> {
    const exportData = {
      metadata: {
        collectionStart: this.events[0]?.timestamp.toISOString(),
        collectionEnd: this.events[this.events.length - 1]?.timestamp.toISOString(),
        totalEvents: this.events.length,
        uniqueCorrelations: new Set(this.events.map(e => e.correlationId).filter(Boolean)).size
      },
      events: this.events.map(e => ({
        id: e.id,
        timestamp: e.timestamp.toISOString(),
        correlationId: e.correlationId,
        event: e.event,
        chain: e.chain
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  async clearEvents(): Promise<void> {
    this.events = []
    console.log('🗑️  Wide event collection cleared')
  }

  getCollectionStatus(): {
    isCollecting: boolean
    totalEvents: number
    uniqueCorrelations: number
    timeRange: { start?: string, end?: string }
  } {
    const uniqueCorrelations = new Set(
      this.events.map(e => e.correlationId).filter(Boolean)
    ).size

    return {
      isCollecting: this.isCollecting,
      totalEvents: this.events.length,
      uniqueCorrelations,
      timeRange: {
        start: this.events[0]?.timestamp.toISOString(),
        end: this.events[this.events.length - 1]?.timestamp.toISOString()
      }
    }
  }
}