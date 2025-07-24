/**
 * Monitoring and Observability for Solana RPC Operations
 * July 2025 Best Practices
 */

/// <reference types="node" />


// Types available for monitoring system extensions
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Keep for future monitoring features
import type { Address, Signature } from '@solana/kit'

/**
 * Metric types for different operations
 */
export type MetricType = 
  | 'counter'     // Monotonically increasing values
  | 'gauge'       // Point-in-time values
  | 'histogram'   // Distribution of values
  | 'summary'     // Statistical summary

/**
 * Metric data point
 */
export interface MetricPoint {
  timestamp: number
  value: number
  labels?: Record<string, string>
}

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string
  type: MetricType
  description: string
  unit: string
  points: MetricPoint[]
  aggregations?: {
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
  }
}

/**
 * RPC operation context
 */
export interface OperationContext {
  operation: string
  endpoint: string
  commitment?: string
  startTime: number
  endTime?: number
  success?: boolean
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'ne'
  threshold: number
  duration: number // How long condition must persist
  severity: 'low' | 'medium' | 'high' | 'critical'
  callback?: (alert: Alert) => void
}

/**
 * Active alert
 */
export interface Alert {
  id: string
  config: AlertConfig
  triggeredAt: number
  value: number
  message: string
  acknowledged: boolean
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  name: string
  endpoint: string
  interval: number
  timeout: number
  retries: number
  expectedStatus?: number
  customCheck?: () => Promise<boolean>
}

/**
 * Health status
 */
export interface HealthStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: number
  responseTime: number
  error?: string
  checks: {
    name: string
    status: 'pass' | 'fail'
    message?: string
  }[]
}

/**
 * Trace span for distributed tracing
 */
export interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operation: string
  startTime: number
  endTime?: number
  tags: Record<string, string>
  logs: {
    timestamp: number
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    fields?: Record<string, unknown>
  }[]
}

/**
 * Comprehensive monitoring system
 */
export class MonitoringSystem {
  private metrics = new Map<string, PerformanceMetric>()
  private activeOperations = new Map<string, OperationContext>()
  private alerts = new Map<string, Alert>()
  private alertConfigs = new Map<string, AlertConfig>()
  private healthChecks = new Map<string, HealthCheckConfig>()
  private healthStatuses = new Map<string, HealthStatus>()
  private traces = new Map<string, TraceSpan[]>()
  
  private cleanupTimer?: ReturnType<typeof setInterval>
  private healthCheckTimer?: ReturnType<typeof setInterval>
  private alertCheckTimer?: ReturnType<typeof setInterval>

  constructor(
    private config: {
      retentionPeriod: number // How long to keep metrics (ms)
      cleanupInterval: number // How often to cleanup old data (ms)
      healthCheckInterval: number // Health check frequency (ms)
      alertCheckInterval: number // Alert evaluation frequency (ms)
      enableTracing: boolean
      enableProfiling: boolean
    } = {
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      healthCheckInterval: 30 * 1000, // 30 seconds
      alertCheckInterval: 10 * 1000, // 10 seconds
      enableTracing: true,
      enableProfiling: false
    }
  ) {
    this.startBackgroundTasks()
    this.initializeDefaultMetrics()
  }

  // =====================================================
  // METRICS COLLECTION
  // =====================================================

  /**
   * Record a counter metric (monotonically increasing)
   */
  recordCounter(
    name: string, 
    value: number = 1, 
    labels: Record<string, string> = {}
  ): void {
    const metric = this.getOrCreateMetric(name, 'counter', 'Count of events')
    metric.points.push({
      timestamp: Date.now(),
      value,
      labels
    })
    this.trimMetricPoints(metric)
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  recordGauge(
    name: string, 
    value: number, 
    labels: Record<string, string> = {}
  ): void {
    const metric = this.getOrCreateMetric(name, 'gauge', 'Current value')
    metric.points.push({
      timestamp: Date.now(),
      value,
      labels
    })
    this.trimMetricPoints(metric)
  }

  /**
   * Record a histogram metric (distribution)
   */
  recordHistogram(
    name: string, 
    value: number, 
    labels: Record<string, string> = {}
  ): void {
    const metric = this.getOrCreateMetric(name, 'histogram', 'Distribution of values')
    metric.points.push({
      timestamp: Date.now(),
      value,
      labels
    })
    this.trimMetricPoints(metric)
    this.updateAggregations(metric)
  }

  /**
   * Start timing an operation
   */
  startOperation(
    id: string,
    operation: string,
    endpoint: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.activeOperations.set(id, {
      operation,
      endpoint,
      startTime: Date.now(),
      metadata
    })

    // Record operation started
    this.recordCounter('rpc_operations_started', 1, {
      operation,
      endpoint
    })
  }

  /**
   * End timing an operation
   */
  endOperation(
    id: string,
    success: boolean = true,
    error?: string
  ): number | null {
    const context = this.activeOperations.get(id)
    if (!context) return null

    const endTime = Date.now()
    const duration = endTime - context.startTime

    context.endTime = endTime
    context.success = success
    context.error = error

    // Record metrics
    this.recordCounter('rpc_operations_completed', 1, {
      operation: context.operation,
      endpoint: context.endpoint,
      status: success ? 'success' : 'error'
    })

    this.recordHistogram('rpc_operation_duration_ms', duration, {
      operation: context.operation,
      endpoint: context.endpoint
    })

    if (!success) {
      this.recordCounter('rpc_operations_failed', 1, {
        operation: context.operation,
        endpoint: context.endpoint,
        error: error ?? 'unknown'
      })
    }

    // Update connection pool metrics
    this.recordGauge('rpc_active_operations', this.activeOperations.size)

    this.activeOperations.delete(id)
    return duration
  }

  /**
   * Record RPC-specific metrics
   */
  recordRpcMetrics(data: {
    endpoint: string
    operation: string
    duration: number
    success: boolean
    retries?: number
    cacheHit?: boolean
    error?: string
  }): void {
    const labels = {
      endpoint: data.endpoint,
      operation: data.operation
    }

    // Duration
    this.recordHistogram('rpc_request_duration_ms', data.duration, labels)

    // Success/failure rate
    this.recordCounter('rpc_requests_total', 1, {
      ...labels,
      status: data.success ? 'success' : 'failure'
    })

    // Retry metrics
    if (data.retries !== undefined) {
      this.recordHistogram('rpc_request_retries', data.retries, labels)
    }

    // Cache metrics
    if (data.cacheHit !== undefined) {
      this.recordCounter('rpc_cache_requests', 1, {
        ...labels,
        hit: data.cacheHit ? 'true' : 'false'
      })
    }

    // Error metrics
    if (!data.success && data.error) {
      this.recordCounter('rpc_errors_total', 1, {
        ...labels,
        error_type: data.error
      })
    }
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name)
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  // =====================================================
  // ALERTING
  // =====================================================

  /**
   * Add alert configuration
   */
  addAlert(config: AlertConfig): void {
    this.alertConfigs.set(config.name, config)
  }

  /**
   * Remove alert configuration
   */
  removeAlert(name: string): boolean {
    return this.alertConfigs.delete(name)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.get(id)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  // =====================================================
  // HEALTH CHECKS
  // =====================================================

  /**
   * Add health check
   */
  addHealthCheck(config: HealthCheckConfig): void {
    this.healthChecks.set(config.name, config)
    
    // Initialize status
    this.healthStatuses.set(config.name, {
      name: config.name,
      status: 'healthy',
      lastCheck: 0,
      responseTime: 0,
      checks: []
    })
  }

  /**
   * Remove health check
   */
  removeHealthCheck(name: string): boolean {
    this.healthChecks.delete(name)
    return this.healthStatuses.delete(name)
  }

  /**
   * Get health status
   */
  getHealthStatus(name?: string): HealthStatus | HealthStatus[] {
    if (name) {
      return this.healthStatuses.get(name)!
    }
    return Array.from(this.healthStatuses.values())
  }

  /**
   * Check overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: HealthStatus[]
    summary: {
      total: number
      healthy: number
      degraded: number
      unhealthy: number
    }
  } {
    const services = Array.from(this.healthStatuses.values())
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length
    }

    let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (summary.unhealthy > 0) {
      systemStatus = 'unhealthy'
    } else if (summary.degraded > 0) {
      systemStatus = 'degraded'
    }

    return {
      status: systemStatus,
      services,
      summary
    }
  }

  // =====================================================
  // DISTRIBUTED TRACING
  // =====================================================

  /**
   * Start a new trace
   */
  startTrace(operation: string, tags: Record<string, string> = {}): TraceSpan {
    const traceId = this.generateId()
    const spanId = this.generateId()
    
    const span: TraceSpan = {
      traceId,
      spanId,
      operation,
      startTime: Date.now(),
      tags,
      logs: []
    }

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, [])
    }
    this.traces.get(traceId)!.push(span)

    return span
  }

  /**
   * Create child span
   */
  createChildSpan(
    parentSpan: TraceSpan,
    operation: string,
    tags: Record<string, string> = {}
  ): TraceSpan {
    const spanId = this.generateId()
    
    const span: TraceSpan = {
      traceId: parentSpan.traceId,
      spanId,
      parentSpanId: parentSpan.spanId,
      operation,
      startTime: Date.now(),
      tags,
      logs: []
    }

    this.traces.get(parentSpan.traceId)!.push(span)
    return span
  }

  /**
   * Finish a span
   */
  finishSpan(span: TraceSpan): void {
    span.endTime = Date.now()
    
    // Record span duration
    const duration = span.endTime - span.startTime
    this.recordHistogram('trace_span_duration_ms', duration, {
      operation: span.operation,
      ...span.tags
    })
  }

  /**
   * Add log to span
   */
  addSpanLog(
    span: TraceSpan,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields: Record<string, unknown> = {}
  ): void {
    span.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields
    })
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): TraceSpan[] | undefined {
    return this.traces.get(traceId)
  }

  // =====================================================
  // PERFORMANCE PROFILING
  // =====================================================

  /**
   * Profile function execution
   */
  async profile<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    if (!this.config.enableProfiling) {
      return fn()
    }

    const startTime = Date.now()
    const startMemory = process.memoryUsage()
    
    try {
      const result = await fn()
      
      const endTime = Date.now()
      const endMemory = process.memoryUsage()
      const duration = endTime - startTime
      
      // Record performance metrics
      this.recordHistogram('profile_duration_ms', duration, { ...tags, function: name })
      this.recordHistogram('profile_memory_delta_mb', 
        (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, 
        { ...tags, function: name }
      )
      
      return result
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      this.recordHistogram('profile_duration_ms', duration, { 
        ...tags, 
        function: name, 
        status: 'error' 
      })
      
      throw error
    }
  }

  // =====================================================
  // DASHBOARD DATA
  // =====================================================

  /**
   * Get dashboard data
   */
  getDashboardData(): {
    metrics: PerformanceMetric[]
    alerts: Alert[]
    health: ReturnType<MonitoringSystem['getSystemHealth']>
    recentActivity: {
      timestamp: number
      type: 'operation' | 'alert' | 'health_change'
      message: string
    }[]
  } {
    return {
      metrics: this.getAllMetrics(),
      alerts: this.getActiveAlerts(),
      health: this.getSystemHealth(),
      recentActivity: this.getRecentActivity()
    }
  }

  /**
   * Export monitoring data for analysis
   */
  exportData(): {
    metrics: Record<string, PerformanceMetric>
    traces: Record<string, TraceSpan[]>
    alerts: Record<string, Alert>
    health: Record<string, HealthStatus>
    timestamp: number
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      traces: Object.fromEntries(this.traces),
      alerts: Object.fromEntries(this.alerts),
      health: Object.fromEntries(this.healthStatuses),
      timestamp: Date.now()
    }
  }

  /**
   * Cleanup and destroy monitoring system
   */
  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)
    if (this.alertCheckTimer) clearInterval(this.alertCheckTimer)
    
    this.metrics.clear()
    this.activeOperations.clear()
    this.alerts.clear()
    this.alertConfigs.clear()
    this.healthChecks.clear()
    this.healthStatuses.clear()
    this.traces.clear()
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  private getOrCreateMetric(
    name: string, 
    type: MetricType, 
    description: string
  ): PerformanceMetric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        description,
        unit: this.getDefaultUnit(type),
        points: []
      })
    }
    return this.metrics.get(name)!
  }

  private getDefaultUnit(type: MetricType): string {
    switch (type) {
      case 'counter': return 'count'
      case 'gauge': return 'value'
      case 'histogram': return 'ms'
      case 'summary': return 'value'
    }
  }

  private trimMetricPoints(metric: PerformanceMetric): void {
    const cutoff = Date.now() - this.config.retentionPeriod
    metric.points = metric.points.filter(point => point.timestamp > cutoff)
  }

  private updateAggregations(metric: PerformanceMetric): void {
    if (metric.points.length === 0) return

    const values = metric.points.map(p => p.value).sort((a, b) => a - b)
    const len = values.length

    metric.aggregations = {
      min: values[0],
      max: values[len - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / len,
      p50: values[Math.floor(len * 0.5)],
      p95: values[Math.floor(len * 0.95)],
      p99: values[Math.floor(len * 0.99)]
    }
  }

  private startBackgroundTasks(): void {
    // Cleanup old data
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData()
    }, this.config.cleanupInterval)

    // Health checks
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks()
    }, this.config.healthCheckInterval)

    // Alert evaluation
    this.alertCheckTimer = setInterval(() => {
      this.evaluateAlerts()
    }, this.config.alertCheckInterval)
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod

    // Clean metrics
    for (const metric of this.metrics.values()) {
      this.trimMetricPoints(metric)
    }

    // Clean traces
    for (const [traceId, spans] of this.traces) {
      const validSpans = spans.filter(span => span.startTime > cutoff)
      if (validSpans.length === 0) {
        this.traces.delete(traceId)
      } else {
        this.traces.set(traceId, validSpans)
      }
    }

    // Clean old alerts
    for (const [id, alert] of this.alerts) {
      if (alert.triggeredAt < cutoff && alert.acknowledged) {
        this.alerts.delete(id)
      }
    }
  }

  private async runHealthChecks(): Promise<void> {
    for (const [name, config] of this.healthChecks) {
      try {
        const startTime = Date.now()
        let healthy = true
        const checks: { name: string; status: 'pass' | 'fail'; details?: string }[] = []

        if (config.customCheck) {
          healthy = await config.customCheck()
          checks.push({
            name: 'custom',
            status: healthy ? 'pass' : 'fail'
          })
        } else {
          // Default HTTP health check
          try {
            const response = await globalThis.fetch(config.endpoint, {
              method: 'GET',
              signal: AbortSignal.timeout(config.timeout)
            })
            
            const statusOk = config.expectedStatus 
              ? response.status === config.expectedStatus
              : response.ok
              
            checks.push({
              name: 'http',
              status: statusOk ? 'pass' : 'fail',
              details: `Status: ${response.status}`
            })
            
            healthy = statusOk
          } catch (error) {
            checks.push({
              name: 'http',
              status: 'fail',
              details: error instanceof Error ? error.message : 'Unknown error'
            })
            healthy = false
          }
        }

        const responseTime = Date.now() - startTime
        
        this.healthStatuses.set(name, {
          name,
          status: healthy ? 'healthy' : 'unhealthy',
          lastCheck: Date.now(),
          responseTime,
          checks,
          error: healthy ? undefined : 'Health check failed'
        })

        // Record health check metrics
        this.recordHistogram('health_check_duration_ms', responseTime, { service: name })
        this.recordGauge('health_check_status', healthy ? 1 : 0, { service: name })
        
      } catch (error) {
        this.healthStatuses.set(name, {
          name,
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime: 0,
          checks: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  private evaluateAlerts(): void {
    for (const [name, config] of this.alertConfigs) {
      const metric = this.metrics.get(config.metric)
      if (!metric || metric.points.length === 0) continue

      const latestValue = metric.points[metric.points.length - 1].value
      let triggered = false

      switch (config.condition) {
        case 'gt':
          triggered = latestValue > config.threshold
          break
        case 'lt':
          triggered = latestValue < config.threshold
          break
        case 'eq':
          triggered = latestValue === config.threshold
          break
        case 'ne':
          triggered = latestValue !== config.threshold
          break
      }

      const alertId = `${name}-${Date.now()}`
      
      if (triggered && !this.alerts.has(alertId)) {
        const alert: Alert = {
          id: alertId,
          config,
          triggeredAt: Date.now(),
          value: latestValue,
          message: `${config.metric} ${config.condition} ${config.threshold} (current: ${latestValue})`,
          acknowledged: false
        }

        this.alerts.set(alertId, alert)
        
        if (config.callback) {
          config.callback(alert)
        }

        // Record alert metric
        this.recordCounter('alerts_triggered', 1, {
          alert_name: name,
          severity: config.severity
        })
      }
    }
  }

  private getRecentActivity(): {
    timestamp: number
    type: 'operation' | 'alert' | 'health_change'
    message: string
  }[] {
    // This would collect recent activity from various sources
    return []
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  private initializeDefaultMetrics(): void {
    // Initialize common RPC metrics
    this.getOrCreateMetric('rpc_requests_total', 'counter', 'Total RPC requests')
    this.getOrCreateMetric('rpc_request_duration_ms', 'histogram', 'RPC request duration in milliseconds')
    this.getOrCreateMetric('rpc_errors_total', 'counter', 'Total RPC errors')
    this.getOrCreateMetric('rpc_cache_requests', 'counter', 'RPC cache requests')
    this.getOrCreateMetric('rpc_active_operations', 'gauge', 'Currently active RPC operations')
    this.getOrCreateMetric('connection_pool_size', 'gauge', 'Connection pool size')
    this.getOrCreateMetric('cache_hit_rate', 'gauge', 'Cache hit rate percentage')
  }
}

/**
 * Global monitoring instance
 */
let globalMonitoring: MonitoringSystem | null = null

/**
 * Get or create global monitoring system
 */
export function getGlobalMonitoring(config?: ConstructorParameters<typeof MonitoringSystem>[0]): MonitoringSystem {
  globalMonitoring ??= new MonitoringSystem(config)
  return globalMonitoring
}

/**
 * Set global monitoring system
 */
export function setGlobalMonitoring(monitoring: MonitoringSystem): void {
  globalMonitoring = monitoring
}

/**
 * Decorator for automatic monitoring of methods
 */
export function Monitor(metricName?: string) {
  return function <T extends { constructor: new (...args: unknown[]) => unknown }>(
    target: T,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value as (...args: unknown[]) => Promise<unknown>
    const name = metricName ?? `${target.constructor.name}.${propertyName}`

    descriptor.value = async function (this: T, ...args: unknown[]) {
      const monitoring = getGlobalMonitoring()
      const operationId = `${name}-${Date.now()}-${Math.random()}`
      
      monitoring.startOperation(operationId, name, 'internal')
      
      try {
        const result = await method.apply(this, args) as unknown
        monitoring.endOperation(operationId, true)
        return result
      } catch (error) {
        monitoring.endOperation(operationId, false, error instanceof Error ? error.message : 'Unknown error')
        throw error
      }
    }

    return descriptor
  }
}