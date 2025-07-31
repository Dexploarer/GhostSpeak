/**
 * Performance Monitoring & Analytics System for GhostSpeak CLI
 * 
 * Provides comprehensive performance monitoring, analytics collection,
 * and intelligent performance optimization recommendations.
 * 
 * Features:
 * - Real-time performance metrics collection
 * - Memory usage monitoring and optimization
 * - CPU usage tracking and alerts
 * - Network performance analytics
 * - Cache performance analysis
 * - User experience metrics
 * - Performance trend analysis
 * - Automated performance reports
 * - Smart performance recommendations
 * 
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance()
 * 
 * // Start monitoring
 * await monitor.startMonitoring({
 *   collectInterval: 5000,
 *   enableMemoryMonitoring: true,
 *   enableNetworkMonitoring: true
 * })
 * 
 * // Track custom performance metrics
 * await monitor.trackOperation('user_action', async () => {
 *   return performSomeOperation()
 * })
 * 
 * // Get performance analytics
 * const analytics = await monitor.getPerformanceAnalytics()
 * ```
 */

import { EventEmitter } from 'events'
import { EventBus } from './event-system'
import { cacheManager } from './cache-system'
import { enhancedCacheManager } from './enhanced-cache-system'
import { networkOptimizer } from './network-optimizer'

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
  /** Data collection interval in milliseconds */
  collectInterval: number
  /** Enable memory usage monitoring */
  enableMemoryMonitoring: boolean
  /** Enable CPU usage monitoring */
  enableCpuMonitoring: boolean
  /** Enable network performance monitoring */
  enableNetworkMonitoring: boolean
  /** Enable cache performance monitoring */
  enableCacheMonitoring: boolean
  /** Enable user experience tracking */
  enableUXMonitoring: boolean
  /** Maximum number of data points to retain */
  maxDataPoints: number
  /** Performance alert thresholds */
  alertThresholds: {
    memoryUsage: number // Percentage
    cpuUsage: number // Percentage
    responseTime: number // Milliseconds
    errorRate: number // Percentage
  }
}

/**
 * Performance metrics snapshot
 */
export interface PerformanceSnapshot {
  timestamp: Date
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
    utilizationPercentage: number
  }
  cpu: {
    usage: number
    loadAverage: number[]
  }
  network: {
    totalRequests: number
    averageResponseTime: number
    successRate: number
    bandwidthUsage: number
  }
  cache: {
    hitRate: number
    memoryUsage: number
    size: number
    operations: number
  }
  system: {
    uptime: number
    platform: string
    nodeVersion: string
    pid: number
  }
}

/**
 * Operation performance tracking
 */
export interface OperationMetrics {
  operationName: string
  startTime: Date
  endTime?: Date
  duration?: number
  success: boolean
  error?: Error
  metadata?: Record<string, unknown>
  tags?: string[]
}

/**
 * Performance analytics report
 */
export interface PerformanceAnalytics {
  /** Report generation time */
  generatedAt: Date
  /** Time range of the analysis */
  timeRange: {
    start: Date
    end: Date
  }
  /** Summary statistics */
  summary: {
    totalOperations: number
    averageResponseTime: number
    successRate: number
    memoryEfficiency: number
    cacheEffectiveness: number
    networkOptimization: number
  }
  /** Performance trends */
  trends: {
    memoryUsage: 'increasing' | 'decreasing' | 'stable'
    responseTime: 'increasing' | 'decreasing' | 'stable'
    errorRate: 'increasing' | 'decreasing' | 'stable'
    cacheHitRate: 'increasing' | 'decreasing' | 'stable'
  }
  /** Top performing operations */
  topOperations: Array<{
    name: string
    averageTime: number
    successRate: number
    callCount: number
  }>
  /** Performance bottlenecks */
  bottlenecks: Array<{
    category: 'memory' | 'cpu' | 'network' | 'cache' | 'operation'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    impact: string
    recommendation: string
  }>
  /** Optimization opportunities */
  optimizations: Array<{
    type: 'memory' | 'cache' | 'network' | 'code'
    priority: 'low' | 'medium' | 'high'
    description: string
    estimatedImprovement: string
    implementation: string
  }>
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string
  timestamp: Date
  type: 'memory' | 'cpu' | 'network' | 'cache' | 'operation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  currentValue: number
  threshold: number
  recommendation: string
  resolved: boolean
}

/**
 * CPU usage tracking utilities
 */
class CpuMonitor {
  private lastCpuUsage: NodeJS.CpuUsage | null = null
  private lastTimestamp = 0

  /**
   * Get current CPU usage percentage
   */
  getCpuUsage(): number {
    const cpuUsage = process.cpuUsage()
    const currentTime = Date.now()

    if (this.lastCpuUsage && this.lastTimestamp) {
      const cpuDelta = {
        user: cpuUsage.user - this.lastCpuUsage.user,
        system: cpuUsage.system - this.lastCpuUsage.system
      }
      const timeDelta = (currentTime - this.lastTimestamp) * 1000 // Convert to microseconds

      if (timeDelta > 0) {
        const usage = ((cpuDelta.user + cpuDelta.system) / timeDelta) * 100
        this.lastCpuUsage = cpuUsage
        this.lastTimestamp = currentTime
        return Math.min(100, Math.max(0, usage))
      }
    }

    this.lastCpuUsage = cpuUsage
    this.lastTimestamp = currentTime
    return 0
  }
}

/**
 * Performance monitoring and analytics system
 */
export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor | null = null

  // Configuration
  private config: MonitoringConfig = {
    collectInterval: 10000, // 10 seconds
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    enableNetworkMonitoring: true,
    enableCacheMonitoring: true,
    enableUXMonitoring: true,
    maxDataPoints: 1000,
    alertThresholds: {
      memoryUsage: 85, // 85%
      cpuUsage: 80, // 80%
      responseTime: 10000, // 10 seconds
      errorRate: 5 // 5%
    }
  }

  // Data storage
  private snapshots: PerformanceSnapshot[] = []
  private operationMetrics: OperationMetrics[] = []
  private activeAlerts = new Map<string, PerformanceAlert>()

  // Monitoring state
  private isMonitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private cpuMonitor = new CpuMonitor()

  // Event bus for integration
  private eventBus = EventBus.getInstance()

  private constructor() {
    super()
    this.setupEventListeners()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(config?: Partial<MonitoringConfig>): Promise<void> {
    if (this.isMonitoring) {
      return
    }

    // Apply configuration
    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.isMonitoring = true

    // Start data collection interval
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceSnapshot()
    }, this.config.collectInterval)

    // Initial snapshot
    await this.collectPerformanceSnapshot()

    this.eventBus.emit('performance_monitor:started', {
      config: this.config,
      timestamp: new Date()
    })
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.eventBus.emit('performance_monitor:stopped', {
      timestamp: new Date(),
      totalSnapshots: this.snapshots.length,
      totalOperations: this.operationMetrics.length
    })
  }

  /**
   * Track operation performance
   */
  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    options?: {
      tags?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<T> {
    const startTime = new Date()
    const operationId = this.generateOperationId()

    const metrics: OperationMetrics = {
      operationName,
      startTime,
      success: false,
      tags: options?.tags,
      metadata: options?.metadata
    }

    try {
      const result = await operation()
      
      metrics.endTime = new Date()
      metrics.duration = metrics.endTime.getTime() - startTime.getTime()
      metrics.success = true

      this.recordOperationMetrics(metrics)
      
      // Check for performance alerts
      await this.checkPerformanceAlerts(metrics)

      return result

    } catch (error) {
      metrics.endTime = new Date()
      metrics.duration = metrics.endTime.getTime() - startTime.getTime()
      metrics.success = false
      metrics.error = error as Error

      this.recordOperationMetrics(metrics)

      throw error
    }
  }

  /**
   * Get current performance snapshot
   */
  async getCurrentSnapshot(): Promise<PerformanceSnapshot> {
    return this.collectPerformanceSnapshot()
  }

  /**
   * Get performance analytics report
   */
  async getPerformanceAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceAnalytics> {
    const now = new Date()
    const range = timeRange || {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now
    }

    // Filter data by time range
    const relevantSnapshots = this.snapshots.filter(s => 
      s.timestamp >= range.start && s.timestamp <= range.end
    )
    const relevantOperations = this.operationMetrics.filter(o => 
      o.startTime >= range.start && o.startTime <= range.end
    )

    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics(relevantSnapshots, relevantOperations)
    
    // Analyze trends
    const trends = this.analyzeTrends(relevantSnapshots)
    
    // Identify top operations
    const topOperations = this.identifyTopOperations(relevantOperations)
    
    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(relevantSnapshots, relevantOperations)
    
    // Generate optimization recommendations
    const optimizations = this.generateOptimizationRecommendations(summary, trends, bottlenecks)

    return {
      generatedAt: now,
      timeRange: range,
      summary,
      trends,
      topOperations,
      bottlenecks,
      optimizations
    }
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Resolve performance alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (alert) {
      alert.resolved = true
      this.eventBus.emit('performance_monitor:alert_resolved', alert)
      return true
    }
    return false
  }

  /**
   * Clear all resolved alerts
   */
  clearResolvedAlerts(): number {
    let cleared = 0
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.resolved) {
        this.activeAlerts.delete(id)
        cleared++
      }
    }
    return cleared
  }

  /**
   * Get operation metrics by name
   */
  getOperationMetrics(operationName: string): OperationMetrics[] {
    return this.operationMetrics.filter(m => m.operationName === operationName)
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceSnapshot[] {
    const snapshots = limit ? this.snapshots.slice(-limit) : this.snapshots
    return [...snapshots] // Return copy
  }

  /**
   * Clear performance data
   */
  clearPerformanceData(): void {
    this.snapshots.length = 0
    this.operationMetrics.length = 0
    this.activeAlerts.clear()
    
    this.eventBus.emit('performance_monitor:data_cleared', {
      timestamp: new Date()
    })
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(format: 'json' | 'csv'): Promise<string> {
    const analytics = await this.getPerformanceAnalytics()
    
    if (format === 'json') {
      return JSON.stringify({
        analytics,
        snapshots: this.snapshots,
        operations: this.operationMetrics
      }, null, 2)
    }
    
    if (format === 'csv') {
      return this.generateCsvReport(analytics)
    }
    
    throw new Error(`Unsupported export format: ${format}`)
  }

  /**
   * Collect performance snapshot
   */
  private async collectPerformanceSnapshot(): Promise<PerformanceSnapshot> {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = this.config.enableCpuMonitoring ? this.cpuMonitor.getCpuUsage() : 0
    
    // Get cache metrics
    const cacheStats = this.config.enableCacheMonitoring ? cacheManager.getStats() : {
      hitRate: 0,
      memoryUsage: 0,
      size: 0,
      operations: 0
    }

    // Get network metrics
    const networkMetrics = this.config.enableNetworkMonitoring ? networkOptimizer.getMetrics() : {
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: 100,
      bandwidthUsage: 0
    }

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        utilizationPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        usage: cpuUsage,
        loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
      },
      network: {
        totalRequests: networkMetrics.totalRequests,
        averageResponseTime: networkMetrics.averageResponseTime,
        successRate: networkMetrics.successRate,
        bandwidthUsage: networkMetrics.bandwidthUsage
      },
      cache: {
        hitRate: cacheStats.hitRate,
        memoryUsage: cacheStats.memoryUsage,
        size: cacheStats.size,
        operations: cacheStats.operations
      },
      system: {
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    }

    // Store snapshot
    this.snapshots.push(snapshot)
    
    // Maintain maximum data points
    if (this.snapshots.length > this.config.maxDataPoints) {
      this.snapshots = this.snapshots.slice(-this.config.maxDataPoints)
    }

    // Emit snapshot event
    this.eventBus.emit('performance_monitor:snapshot', snapshot)

    return snapshot
  }

  /**
   * Record operation metrics
   */
  private recordOperationMetrics(metrics: OperationMetrics): void {
    this.operationMetrics.push(metrics)
    
    // Maintain maximum data points
    if (this.operationMetrics.length > this.config.maxDataPoints) {
      this.operationMetrics = this.operationMetrics.slice(-this.config.maxDataPoints)
    }

    this.eventBus.emit('performance_monitor:operation_tracked', metrics)
  }

  /**
   * Check for performance alerts
   */
  private async checkPerformanceAlerts(metrics: OperationMetrics): Promise<void> {
    const currentSnapshot = this.snapshots[this.snapshots.length - 1]
    if (!currentSnapshot) return

    // Check memory usage alert
    if (currentSnapshot.memory.utilizationPercentage > this.config.alertThresholds.memoryUsage) {
      this.createAlert('memory', 'high', 'High Memory Usage', 
        `Memory usage is at ${currentSnapshot.memory.utilizationPercentage.toFixed(1)}%`,
        currentSnapshot.memory.utilizationPercentage,
        this.config.alertThresholds.memoryUsage,
        'Consider clearing caches or optimizing memory usage'
      )
    }

    // Check CPU usage alert
    if (currentSnapshot.cpu.usage > this.config.alertThresholds.cpuUsage) {
      this.createAlert('cpu', 'high', 'High CPU Usage',
        `CPU usage is at ${currentSnapshot.cpu.usage.toFixed(1)}%`,
        currentSnapshot.cpu.usage,
        this.config.alertThresholds.cpuUsage,
        'Reduce concurrent operations or optimize CPU-intensive tasks'
      )
    }

    // Check response time alert
    if (metrics.duration && metrics.duration > this.config.alertThresholds.responseTime) {
      this.createAlert('operation', 'medium', 'Slow Operation',
        `Operation '${metrics.operationName}' took ${metrics.duration}ms`,
        metrics.duration,
        this.config.alertThresholds.responseTime,
        'Optimize the operation or check for network issues'
      )
    }

    // Check error rate alert
    const recentOperations = this.operationMetrics.slice(-100)
    const errorRate = (recentOperations.filter(o => !o.success).length / recentOperations.length) * 100
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert('operation', 'high', 'High Error Rate',
        `Error rate is at ${errorRate.toFixed(1)}%`,
        errorRate,
        this.config.alertThresholds.errorRate,
        'Investigate failing operations and improve error handling'
      )
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    title: string,
    description: string,
    currentValue: number,
    threshold: number,
    recommendation: string
  ): void {
    const alertId = `${type}_${Date.now()}`
    
    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: new Date(),
      type,
      severity,
      title,
      description,
      currentValue,
      threshold,
      recommendation,
      resolved: false
    }

    this.activeAlerts.set(alertId, alert)
    this.eventBus.emit('performance_monitor:alert_created', alert)
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStatistics(
    snapshots: PerformanceSnapshot[],
    operations: OperationMetrics[]
  ): PerformanceAnalytics['summary'] {
    if (snapshots.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        successRate: 100,
        memoryEfficiency: 100,
        cacheEffectiveness: 0,
        networkOptimization: 0
      }
    }

    const avgMemory = snapshots.reduce((sum, s) => sum + s.memory.utilizationPercentage, 0) / snapshots.length
    const avgCacheHitRate = snapshots.reduce((sum, s) => sum + s.cache.hitRate, 0) / snapshots.length
    const avgNetworkSuccess = snapshots.reduce((sum, s) => sum + s.network.successRate, 0) / snapshots.length

    const successfulOps = operations.filter(o => o.success).length
    const successRate = operations.length > 0 ? (successfulOps / operations.length) * 100 : 100

    const avgResponseTime = operations.length > 0 
      ? operations.reduce((sum, o) => sum + (o.duration || 0), 0) / operations.length 
      : 0

    return {
      totalOperations: operations.length,
      averageResponseTime: avgResponseTime,
      successRate,
      memoryEfficiency: Math.max(0, 100 - avgMemory),
      cacheEffectiveness: avgCacheHitRate,
      networkOptimization: avgNetworkSuccess
    }
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(snapshots: PerformanceSnapshot[]): PerformanceAnalytics['trends'] {
    if (snapshots.length < 2) {
      return {
        memoryUsage: 'stable',
        responseTime: 'stable',
        errorRate: 'stable',
        cacheHitRate: 'stable'
      }
    }

    const first = snapshots[0]
    const last = snapshots[snapshots.length - 1]

    return {
      memoryUsage: this.getTrend(first.memory.utilizationPercentage, last.memory.utilizationPercentage),
      responseTime: this.getTrend(first.network.averageResponseTime, last.network.averageResponseTime, true),
      errorRate: this.getTrend(100 - first.network.successRate, 100 - last.network.successRate, true),
      cacheHitRate: this.getTrend(first.cache.hitRate, last.cache.hitRate)
    }
  }

  /**
   * Get trend direction
   */
  private getTrend(
    first: number, 
    last: number, 
    reverseGood = false
  ): 'increasing' | 'decreasing' | 'stable' {
    const threshold = 5 // 5% change threshold
    const change = ((last - first) / first) * 100

    if (Math.abs(change) < threshold) {
      return 'stable'
    }

    return change > 0 ? 'increasing' : 'decreasing'
  }

  /**
   * Identify top performing operations
   */
  private identifyTopOperations(operations: OperationMetrics[]): PerformanceAnalytics['topOperations'] {
    const operationStats = new Map<string, {
      totalTime: number
      successCount: number
      totalCount: number
    }>()

    for (const op of operations) {
      const existing = operationStats.get(op.operationName) || {
        totalTime: 0,
        successCount: 0,
        totalCount: 0
      }

      existing.totalTime += op.duration || 0
      existing.totalCount++
      if (op.success) existing.successCount++

      operationStats.set(op.operationName, existing)
    }

    return Array.from(operationStats.entries())
      .map(([name, stats]) => ({
        name,
        averageTime: stats.totalTime / stats.totalCount,
        successRate: (stats.successCount / stats.totalCount) * 100,
        callCount: stats.totalCount
      }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10)
  }

  /**
   * Detect performance bottlenecks
   */
  private detectBottlenecks(
    snapshots: PerformanceSnapshot[],
    operations: OperationMetrics[]
  ): PerformanceAnalytics['bottlenecks'] {
    const bottlenecks: PerformanceAnalytics['bottlenecks'] = []

    if (snapshots.length === 0) return bottlenecks

    const avgMemory = snapshots.reduce((sum, s) => sum + s.memory.utilizationPercentage, 0) / snapshots.length
    const avgCpu = snapshots.reduce((sum, s) => sum + s.cpu.usage, 0) / snapshots.length
    const avgResponseTime = snapshots.reduce((sum, s) => sum + s.network.averageResponseTime, 0) / snapshots.length

    // Memory bottleneck
    if (avgMemory > 70) {
      bottlenecks.push({
        category: 'memory',
        severity: avgMemory > 85 ? 'critical' : avgMemory > 75 ? 'high' : 'medium',
        description: `High memory usage averaging ${avgMemory.toFixed(1)}%`,
        impact: 'Potential system slowdown and instability',
        recommendation: 'Optimize memory usage, clear unnecessary caches, or increase memory allocation'
      })
    }

    // CPU bottleneck
    if (avgCpu > 60) {
      bottlenecks.push({
        category: 'cpu',
        severity: avgCpu > 80 ? 'critical' : avgCpu > 70 ? 'high' : 'medium',
        description: `High CPU usage averaging ${avgCpu.toFixed(1)}%`,
        impact: 'Reduced system responsiveness and performance',
        recommendation: 'Optimize CPU-intensive operations or reduce concurrent processing'
      })
    }

    // Network bottleneck
    if (avgResponseTime > 5000) {
      bottlenecks.push({
        category: 'network',
        severity: avgResponseTime > 15000 ? 'critical' : avgResponseTime > 10000 ? 'high' : 'medium',
        description: `Slow network responses averaging ${avgResponseTime.toFixed(0)}ms`,
        impact: 'Poor user experience and operational delays',
        recommendation: 'Optimize network requests, use request batching, or improve endpoint selection'
      })
    }

    return bottlenecks
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    summary: PerformanceAnalytics['summary'],
    trends: PerformanceAnalytics['trends'],
    bottlenecks: PerformanceAnalytics['bottlenecks']
  ): PerformanceAnalytics['optimizations'] {
    const optimizations: PerformanceAnalytics['optimizations'] = []

    // Memory optimization
    if (summary.memoryEfficiency < 70 || trends.memoryUsage === 'increasing') {
      optimizations.push({
        type: 'memory',
        priority: 'high',
        description: 'Optimize memory usage to improve system performance',
        estimatedImprovement: '20-40% reduction in memory usage',
        implementation: 'Enable enhanced caching with compression and implement memory cleanup routines'
      })
    }

    // Cache optimization
    if (summary.cacheEffectiveness < 80) {
      optimizations.push({
        type: 'cache',
        priority: 'medium',
        description: 'Improve cache hit rates for better performance',
        estimatedImprovement: '15-25% faster response times',
        implementation: 'Enable predictive cache warming and optimize cache TTL settings'
      })
    }

    // Network optimization
    if (summary.networkOptimization < 90 || trends.responseTime === 'increasing') {
      optimizations.push({
        type: 'network',
        priority: 'high',
        description: 'Optimize network performance and reduce latency',
        estimatedImprovement: '30-50% improvement in response times',
        implementation: 'Enable request batching, connection pooling, and intelligent endpoint selection'
      })
    }

    return optimizations
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(analytics: PerformanceAnalytics): string {
    const lines = []
    
    // Header
    lines.push('Performance Analytics Report')
    lines.push(`Generated: ${analytics.generatedAt.toISOString()}`)
    lines.push('')
    
    // Summary
    lines.push('Summary Statistics')
    lines.push('Metric,Value')
    lines.push(`Total Operations,${analytics.summary.totalOperations}`)
    lines.push(`Average Response Time,${analytics.summary.averageResponseTime}ms`)
    lines.push(`Success Rate,${analytics.summary.successRate}%`)
    lines.push(`Memory Efficiency,${analytics.summary.memoryEfficiency}%`)
    lines.push('')
    
    // Top Operations
    lines.push('Top Operations')
    lines.push('Operation,Average Time,Success Rate,Call Count')
    for (const op of analytics.topOperations) {
      lines.push(`${op.name},${op.averageTime},${op.successRate}%,${op.callCount}`)
    }
    
    return lines.join('\n')
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for cache events
    this.eventBus.on('cache:hit', () => {
      // Cache hit tracking is handled by cache system itself
    })

    // Listen for network events
    this.eventBus.on('network_optimizer:request_completed', (event) => {
      // Network request tracking is handled by network optimizer
    })
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()