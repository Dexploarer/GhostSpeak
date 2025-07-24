/**
 * Error Monitoring and Analytics System
 * 
 * Provides comprehensive error tracking, monitoring, and analytics for the GhostSpeak SDK.
 * Includes real-time error tracking, performance monitoring, and detailed error reporting.
 */


import {
  GhostSpeakError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  logError
} from '../errors/index.js'
import type { OperationMetrics } from './error-recovery.js'

/**
 * Error event for monitoring
 */
export interface ErrorEvent {
  id: string
  timestamp: number
  operationId: string
  error: GhostSpeakError
  context: ErrorContext
  metrics?: OperationMetrics
  userAgent?: string
  sessionId?: string
  userId?: string
}

/**
 * Error statistics for analysis
 */
export interface ErrorStatistics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  errorsByCode: Record<string, number>
  errorsByOperation: Record<string, number>
  averageErrorRate: number
  recentErrors: ErrorEvent[]
  topErrors: { code: string; count: number; percentage: number }[]
  timeWindow: { start: number; end: number }
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operationId: string
  averageLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  successRate: number
  errorRate: number
  throughput: number
  lastUpdated: number
}

/**
 * Health status for operations
 */
export interface HealthStatus {
  operationId: string
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  score: number // 0-100
  indicators: {
    errorRate: number
    latency: number
    availability: number
    throughput: number
  }
  lastChecked: number
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean
  maxEvents: number
  retentionPeriod: number // milliseconds
  sampling: {
    enabled: boolean
    rate: number // 0-1
  }
  alerting: {
    enabled: boolean
    thresholds: {
      errorRate: number
      latency: number
      availability: number
    }
    callbacks: {
      onHighErrorRate?: (stats: ErrorStatistics) => void
      onHighLatency?: (metrics: PerformanceMetrics) => void
      onLowAvailability?: (health: HealthStatus) => void
    }
  }
  reporting: {
    enabled: boolean
    endpoint?: string
    apiKey?: string
    batchSize: number
    flushInterval: number
  }
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  maxEvents: 1000,
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  sampling: {
    enabled: false,
    rate: 0.1
  },
  alerting: {
    enabled: true,
    thresholds: {
      errorRate: 0.1, // 10%
      latency: 5000, // 5 seconds
      availability: 0.95 // 95%
    },
    callbacks: {}
  },
  reporting: {
    enabled: false,
    batchSize: 50,
    flushInterval: 60000 // 1 minute
  }
}

/**
 * Comprehensive error monitoring system
 */
export class ErrorMonitor {
  private events: ErrorEvent[] = []
  private performanceMetrics = new Map<string, PerformanceMetrics>()
  private healthStatus = new Map<string, HealthStatus>()
  private reportingBuffer: ErrorEvent[] = []
  private flushTimer?: ReturnType<typeof setTimeout>
  
  constructor(private config: MonitoringConfig = DEFAULT_MONITORING_CONFIG) {
    if (this.config.reporting.enabled && this.config.reporting.flushInterval > 0) {
      this.startReportingFlush()
    }
  }

  /**
   * Record an error event
   */
  recordError(
    error: GhostSpeakError,
    operationId: string,
    context: Partial<ErrorContext> = {},
    metrics?: OperationMetrics
  ): string {
    if (!this.config.enabled) return ''
    
    // Apply sampling if enabled
    if (this.config.sampling.enabled && Math.random() > this.config.sampling.rate) {
      return ''
    }
    
    const event: ErrorEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      operationId,
      error,
      context: {
        operation: operationId,
        timestamp: Date.now(),
        ...context
      },
      metrics,
      userAgent: (() => {
        if (typeof globalThis === 'undefined') return undefined
        const global = globalThis as { navigator?: { userAgent?: string } }
        const nav = global.navigator
        if (!nav || typeof nav !== 'object') return undefined
        return typeof nav.userAgent === 'string' ? nav.userAgent : undefined
      })(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    }
    
    // Add to events
    this.events.push(event)
    
    // Maintain event limit
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents)
    }
    
    // Update performance metrics
    this.updatePerformanceMetrics(operationId, error, metrics)
    
    // Update health status
    this.updateHealthStatus(operationId)
    
    // Add to reporting buffer
    if (this.config.reporting.enabled) {
      this.reportingBuffer.push(event)
    }
    
    // Check alerting thresholds
    this.checkAlerts(operationId)
    
    // Log error based on severity
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      logError(error, true)
    }
    
    return event.id
  }

  /**
   * Get error statistics for a time window
   */
  getStatistics(timeWindow?: { start: number; end: number }): ErrorStatistics {
    const window = timeWindow ?? {
      start: Date.now() - (60 * 60 * 1000), // Last hour
      end: Date.now()
    }
    
    const relevantEvents = this.events.filter(
      event => event.timestamp >= window.start && event.timestamp <= window.end
    )
    
    const stats: ErrorStatistics = {
      totalErrors: relevantEvents.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByCode: {},
      errorsByOperation: {},
      averageErrorRate: 0,
      recentErrors: relevantEvents.slice(-10),
      topErrors: [],
      timeWindow: window
    }
    
    // Initialize category and severity counters
    Object.values(ErrorCategory).forEach(category => {
      stats.errorsByCategory[category as ErrorCategory] = 0
    })
    Object.values(ErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity as ErrorSeverity] = 0
    })
    
    // Aggregate statistics
    relevantEvents.forEach(event => {
      const { error, operationId } = event
      
      stats.errorsByCategory[error.category]++
      stats.errorsBySeverity[error.severity]++
      stats.errorsByCode[error.code] = (stats.errorsByCode[error.code] ?? 0) + 1
      stats.errorsByOperation[operationId] = (stats.errorsByOperation[operationId] ?? 0) + 1
    })
    
    // Calculate error rate
    const timeSpanHours = (window.end - window.start) / (60 * 60 * 1000)
    stats.averageErrorRate = timeSpanHours > 0 ? stats.totalErrors / timeSpanHours : 0
    
    // Calculate top errors
    stats.topErrors = Object.entries(stats.errorsByCode)
      .map(([code, count]) => ({
        code,
        count,
        percentage: (count / stats.totalErrors) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return stats
  }

  /**
   * Get performance metrics for an operation
   */
  getPerformanceMetrics(operationId?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (operationId) {
      return this.performanceMetrics.get(operationId) ?? this.createDefaultMetrics(operationId)
    }
    
    return new Map(this.performanceMetrics)
  }

  /**
   * Get health status for operations
   */
  getHealthStatus(operationId?: string): HealthStatus | Map<string, HealthStatus> {
    if (operationId) {
      return this.healthStatus.get(operationId) ?? this.createDefaultHealth(operationId)
    }
    
    return new Map(this.healthStatus)
  }

  /**
   * Get recent errors for an operation
   */
  getRecentErrors(operationId: string, limit = 10): ErrorEvent[] {
    return this.events
      .filter(event => event.operationId === operationId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Export error data for analysis
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV()
    }
    
    return JSON.stringify({
      statistics: this.getStatistics(),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      healthStatus: Object.fromEntries(this.healthStatus),
      events: this.events.map(event => ({
        ...event,
        error: event.error.toJSON()
      }))
    }, null, 2)
  }

  /**
   * Clear monitoring data
   */
  clear(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan
      this.events = this.events.filter(event => event.timestamp > cutoff)
    } else {
      this.events = []
      this.performanceMetrics.clear()
      this.healthStatus.clear()
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.config.reporting.enabled && !this.flushTimer) {
      this.startReportingFlush()
    } else if (!this.config.reporting.enabled && this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }
  }

  /**
   * Generate comprehensive health report
   */
  generateHealthReport(): {
    overall: HealthStatus
    operations: HealthStatus[]
    recommendations: string[]
    statistics: ErrorStatistics
  } {
    const stats = this.getStatistics()
    const operations = Array.from(this.healthStatus.values())
    
    // Calculate overall health
    const overallScore = operations.length > 0
      ? operations.reduce((sum, op) => sum + op.score, 0) / operations.length
      : 100
    
    const overall: HealthStatus = {
      operationId: 'overall',
      status: overallScore >= 90 ? 'HEALTHY' : overallScore >= 70 ? 'DEGRADED' : 'UNHEALTHY',
      score: overallScore,
      indicators: {
        errorRate: stats.averageErrorRate,
        latency: this.calculateOverallLatency(),
        availability: this.calculateOverallAvailability(),
        throughput: this.calculateOverallThroughput()
      },
      lastChecked: Date.now()
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, operations)
    
    return {
      overall,
      operations,
      recommendations,
      statistics: stats
    }
  }

  /**
   * Private helper methods
   */
  
  private generateEventId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getSessionId(): string {
    // Implementation would depend on your session management
    return 'session_' + Math.random().toString(36).substr(2, 9)
  }

  private getUserId(): string {
    // Implementation would depend on your user management
    return 'user_anonymous'
  }

  private updatePerformanceMetrics(
    operationId: string,
    error: GhostSpeakError,
    operationMetrics?: OperationMetrics
  ): void {
    const existing = this.performanceMetrics.get(operationId) ?? this.createDefaultMetrics(operationId)
    
    if (operationMetrics) {
      existing.averageLatency = operationMetrics.averageLatency
      existing.successRate = operationMetrics.totalAttempts > 0
        ? operationMetrics.successCount / operationMetrics.totalAttempts
        : 0
      existing.errorRate = 1 - existing.successRate
      existing.throughput = this.calculateThroughput(operationId)
    }
    
    existing.lastUpdated = Date.now()
    this.performanceMetrics.set(operationId, existing)
  }

  private updateHealthStatus(operationId: string): void {
    const metrics = this.performanceMetrics.get(operationId)
    const recentEvents = this.getRecentErrors(operationId, 20)
    
    const errorRate = recentEvents.length > 0 ? recentEvents.length / 20 : 0
    const avgLatency = metrics?.averageLatency ?? 0
    const availability = metrics?.successRate ?? 1
    const throughput = metrics?.throughput ?? 0
    
    // Calculate health score (0-100)
    let score = 100
    score -= Math.min(errorRate * 100, 50) // Max 50 points deduction for errors
    score -= Math.min((avgLatency / 1000) * 10, 30) // Max 30 points for latency
    score -= Math.min((1 - availability) * 100, 20) // Max 20 points for availability
    
    const status: HealthStatus = {
      operationId,
      status: score >= 90 ? 'HEALTHY' : score >= 70 ? 'DEGRADED' : 'UNHEALTHY',
      score: Math.max(0, Math.min(100, score)),
      indicators: {
        errorRate,
        latency: avgLatency,
        availability,
        throughput
      },
      lastChecked: Date.now()
    }
    
    this.healthStatus.set(operationId, status)
  }

  private checkAlerts(operationId: string): void {
    if (!this.config.alerting.enabled) return
    
    const health = this.healthStatus.get(operationId)
    const metrics = this.performanceMetrics.get(operationId)
    
    if (health && metrics) {
      // Check error rate threshold
      if (health.indicators.errorRate > this.config.alerting.thresholds.errorRate) {
        this.config.alerting.callbacks.onHighErrorRate?.(this.getStatistics())
      }
      
      // Check latency threshold
      if (health.indicators.latency > this.config.alerting.thresholds.latency) {
        this.config.alerting.callbacks.onHighLatency?.(metrics)
      }
      
      // Check availability threshold
      if (health.indicators.availability < this.config.alerting.thresholds.availability) {
        this.config.alerting.callbacks.onLowAvailability?.(health)
      }
    }
  }

  private startReportingFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushReportingBuffer()
    }, this.config.reporting.flushInterval)
  }

  private async flushReportingBuffer(): Promise<void> {
    if (this.reportingBuffer.length === 0 || !this.config.reporting.endpoint) return
    
    const batch = this.reportingBuffer.splice(0, this.config.reporting.batchSize)
    
    try {
      // Check if fetch is available (browser or Node 18+)
      if (typeof globalThis.fetch === 'undefined') {
        console.warn('fetch is not available in this environment')
        return
      }
      
      await globalThis.fetch(this.config.reporting.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.reporting.apiKey ? { 'Authorization': `Bearer ${this.config.reporting.apiKey}` } : {})
        },
        body: JSON.stringify({
          events: batch.map(event => ({
            ...event,
            error: event.error.toJSON()
          }))
        })
      })
    } catch (error) {
      console.error('Failed to report errors:', error)
      // Put events back at the beginning of buffer for retry
      this.reportingBuffer.unshift(...batch)
    }
  }

  private createDefaultMetrics(operationId: string): PerformanceMetrics {
    return {
      operationId,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      successRate: 1,
      errorRate: 0,
      throughput: 0,
      lastUpdated: Date.now()
    }
  }

  private createDefaultHealth(operationId: string): HealthStatus {
    return {
      operationId,
      status: 'HEALTHY',
      score: 100,
      indicators: {
        errorRate: 0,
        latency: 0,
        availability: 1,
        throughput: 0
      },
      lastChecked: Date.now()
    }
  }

  private calculateThroughput(operationId: string): number {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const recentEvents = this.events.filter(
      event => event.operationId === operationId && event.timestamp > oneHourAgo
    )
    return recentEvents.length // Events per hour
  }

  private calculateOverallLatency(): number {
    const latencies = Array.from(this.performanceMetrics.values()).map(m => m.averageLatency)
    return latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0
  }

  private calculateOverallAvailability(): number {
    const availabilities = Array.from(this.performanceMetrics.values()).map(m => m.successRate)
    return availabilities.length > 0 ? availabilities.reduce((sum, a) => sum + a, 0) / availabilities.length : 1
  }

  private calculateOverallThroughput(): number {
    return Array.from(this.performanceMetrics.values()).reduce((sum, m) => sum + m.throughput, 0)
  }

  private generateRecommendations(stats: ErrorStatistics, operations: HealthStatus[]): string[] {
    const recommendations: string[] = []
    
    // High error rate recommendations
    if (stats.averageErrorRate > 10) {
      recommendations.push('High error rate detected. Review error logs and implement additional error handling.')
    }
    
    // Top error recommendations
    if (stats.topErrors.length > 0) {
      const topError = stats.topErrors[0]
      if (topError.percentage > 50) {
        recommendations.push(`${topError.code} accounts for ${topError.percentage.toFixed(1)}% of errors. Focus on resolving this specific issue.`)
      }
    }
    
    // Unhealthy operations
    const unhealthyOps = operations.filter(op => op.status === 'UNHEALTHY')
    if (unhealthyOps.length > 0) {
      recommendations.push(`${unhealthyOps.length} operations are unhealthy: ${unhealthyOps.map(op => op.operationId).join(', ')}`)
    }
    
    // Network issues
    if (stats.errorsByCategory[ErrorCategory.NETWORK] > stats.totalErrors * 0.3) {
      recommendations.push('High network error rate. Consider implementing more aggressive retry policies or checking network infrastructure.')
    }
    
    // Validation issues
    if (stats.errorsByCategory[ErrorCategory.VALIDATION] > stats.totalErrors * 0.2) {
      recommendations.push('High validation error rate. Review input validation and provide better user guidance.')
    }
    
    return recommendations
  }

  private exportToCSV(): string {
    const headers = [
      'timestamp',
      'operationId',
      'errorCode',
      'errorCategory',
      'errorSeverity',
      'message',
      'retryable',
      'userFriendlyMessage'
    ]
    
    const rows = this.events.map(event => [
      new Date(event.timestamp).toISOString(),
      event.operationId,
      event.error.code,
      event.error.category,
      event.error.severity,
      event.error.message.replace(/,/g, ';'), // Escape commas
      event.error.retryable.toString(),
      event.error.userFriendlyMessage.replace(/,/g, ';')
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}

/**
 * Default error monitor instance
 */
export const defaultErrorMonitor = new ErrorMonitor()

/**
 * Convenience function to record errors
 */
export function recordError(
  error: GhostSpeakError,
  operationId: string,
  context?: Partial<ErrorContext>,
  metrics?: OperationMetrics
): string {
  return defaultErrorMonitor.recordError(error, operationId, context, metrics)
}

/**
 * Convenience function to get error statistics
 */
export function getErrorStatistics(timeWindow?: { start: number; end: number }): ErrorStatistics {
  return defaultErrorMonitor.getStatistics(timeWindow)
}

/**
 * Convenience function to generate health report
 */
export function generateHealthReport() {
  return defaultErrorMonitor.generateHealthReport()
}