/**
 * Real-Time Performance Monitoring System
 * 
 * Comprehensive performance monitoring with real-time metrics collection,
 * alerting, dashboards, and performance regression detection.
 */

import { Address } from '@solana/addresses';

/**
 * Performance metric types for comprehensive monitoring
 */
export interface PerformanceMetrics {
  // Response time metrics
  responseTime: {
    current: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  
  // Throughput metrics
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    totalRequests: number;
  };
  
  // Error metrics
  errors: {
    rate: number;
    count: number;
    types: Map<string, number>;
    criticalErrors: number;
  };
  
  // Resource utilization
  resources: {
    memoryUsageMB: number;
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    connectionCount: number;
    cacheHitRatio: number;
  };
  
  // Network metrics
  network: {
    latency: number;
    bandwidth: number;
    packetLoss: number;
    retryCount: number;
  };
  
  // Business metrics
  business: {
    successfulTransactions: number;
    failedTransactions: number;
    averageTransactionValue: number;
    agentRegistrations: number;
    messagesSent: number;
  };
  
  // System health
  health: {
    score: number; // 0-100
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    lastHealthCheck: number;
  };
}

/**
 * Alert configuration and thresholds
 */
export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    healthScore: number;
  };
  channels: {
    console: boolean;
    webhook?: string;
    email?: string;
    slack?: string;
  };
  cooldownMs: number;
  escalationLevels: Array<{
    threshold: number;
    delay: number;
    channels: string[];
  }>;
}

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
  // Collection settings
  sampleIntervalMs: number;
  retentionDays: number;
  maxDataPoints: number;
  
  // Real-time settings
  realTimeEnabled: boolean;
  streamingEnabled: boolean;
  dashboardUpdateMs: number;
  
  // Alert settings
  alerts: AlertConfig;
  
  // Performance baseline
  baseline: {
    responseTimeMs: number;
    errorRatePercent: number;
    throughputRps: number;
  };
  
  // Advanced features
  anomalyDetection: boolean;
  predictionEnabled: boolean;
  autoOptimization: boolean;
}

/**
 * Default high-performance monitoring configuration
 */
export const OPTIMAL_MONITORING_CONFIG: MonitoringConfig = {
  sampleIntervalMs: 1000, // 1 second
  retentionDays: 30,
  maxDataPoints: 86400, // 24 hours at 1s intervals
  realTimeEnabled: true,
  streamingEnabled: true,
  dashboardUpdateMs: 5000, // 5 seconds
  alerts: {
    enabled: true,
    thresholds: {
      responseTime: 1000, // 1 second
      errorRate: 5, // 5%
      memoryUsage: 80, // 80%
      cpuUsage: 80, // 80%
      healthScore: 70, // Below 70
    },
    channels: {
      console: true,
    },
    cooldownMs: 300000, // 5 minutes
    escalationLevels: [
      { threshold: 85, delay: 60000, channels: ['console'] },
      { threshold: 95, delay: 300000, channels: ['console', 'webhook'] },
    ],
  },
  baseline: {
    responseTimeMs: 200,
    errorRatePercent: 1,
    throughputRps: 100,
  },
  anomalyDetection: true,
  predictionEnabled: true,
  autoOptimization: true,
};

/**
 * Time-series data point for historical analysis
 */
interface DataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Performance alert with severity and context
 */
interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
  resolved: boolean;
  resolvedAt?: number;
  context: Record<string, any>;
}

/**
 * Dashboard widget configuration
 */
interface DashboardWidget {
  id: string;
  type: 'chart' | 'gauge' | 'counter' | 'table' | 'alert';
  title: string;
  metric: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

/**
 * Real-Time Performance Monitor
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private historicalData = new Map<string, DataPoint[]>();
  private alerts: PerformanceAlert[] = [];
  private activeAlerts = new Set<string>();
  private dashboardWidgets: DashboardWidget[] = [];
  private collectors: Array<() => Partial<PerformanceMetrics>> = [];
  private readonly config: MonitoringConfig;
  private monitoringInterval?: number;
  private responseTimes: number[] = [];
  private lastAlertTime = new Map<string, number>();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...OPTIMAL_MONITORING_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.setupDefaultCollectors();
    this.setupDefaultDashboard();
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.checkAlerts();
      this.updateDashboard();
    }, this.config.sampleIntervalMs);

    console.log('🚀 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Record response time for analysis
   */
  recordResponseTime(timeMs: number, operation?: string): void {
    this.responseTimes.push(timeMs);
    
    // Keep only recent response times for calculations
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }

    // Update current response time
    this.metrics.responseTime.current = timeMs;
    
    // Update historical data
    this.addDataPoint('responseTime', timeMs, { operation });
  }

  /**
   * Record error occurrence
   */
  recordError(error: Error, context?: Record<string, any>): void {
    this.metrics.errors.count++;
    
    const errorType = error.constructor.name;
    const currentCount = this.metrics.errors.types.get(errorType) || 0;
    this.metrics.errors.types.set(errorType, currentCount + 1);
    
    // Check if it's a critical error
    if (this.isCriticalError(error)) {
      this.metrics.errors.criticalErrors++;
    }
    
    this.addDataPoint('errors', 1, { type: errorType, message: error.message, ...context });
  }

  /**
   * Record successful operation
   */
  recordSuccess(operation: string, context?: Record<string, any>): void {
    this.metrics.throughput.totalRequests++;
    
    if (operation.includes('transaction')) {
      this.metrics.business.successfulTransactions++;
    } else if (operation.includes('agent')) {
      this.metrics.business.agentRegistrations++;
    } else if (operation.includes('message')) {
      this.metrics.business.messagesSent++;
    }
    
    this.addDataPoint('success', 1, { operation, ...context });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get historical data for a specific metric
   */
  getHistoricalData(
    metric: string,
    timeRangeMs: number
  ): DataPoint[] {
    const data = this.historicalData.get(metric) || [];
    const cutoff = Date.now() - timeRangeMs;
    return data.filter(point => point.timestamp >= cutoff);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts with optional filtering
   */
  getAllAlerts(
    filters: {
      severity?: PerformanceAlert['severity'];
      resolved?: boolean;
      timeRangeMs?: number;
    } = {}
  ): PerformanceAlert[] {
    let filtered = this.alerts;

    if (filters.severity) {
      filtered = filtered.filter(alert => alert.severity === filters.severity);
    }

    if (filters.resolved !== undefined) {
      filtered = filtered.filter(alert => alert.resolved === filters.resolved);
    }

    if (filters.timeRangeMs) {
      const cutoff = Date.now() - filters.timeRangeMs;
      filtered = filtered.filter(alert => alert.timestamp >= cutoff);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add custom metric collector
   */
  addCollector(collector: () => Partial<PerformanceMetrics>): void {
    this.collectors.push(collector);
  }

  /**
   * Add dashboard widget
   */
  addDashboardWidget(widget: DashboardWidget): void {
    this.dashboardWidgets.push(widget);
  }

  /**
   * Get dashboard configuration
   */
  getDashboard(): DashboardWidget[] {
    return [...this.dashboardWidgets];
  }

  /**
   * Generate performance report
   */
  generateReport(timeRangeMs: number = 3600000): {
    summary: {
      timeRange: { start: number; end: number };
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      healthScore: number;
    };
    details: {
      responseTime: {
        average: number;
        p95: number;
        p99: number;
        trend: 'improving' | 'stable' | 'degrading';
      };
      throughput: {
        average: number;
        peak: number;
        trend: 'improving' | 'stable' | 'degrading';
      };
      errors: {
        total: number;
        byType: Array<{ type: string; count: number; percentage: number }>;
        topErrors: Array<{ type: string; count: number; lastOccurrence: number }>;
      };
      alerts: {
        total: number;
        bySeverity: Record<string, number>;
        mostCommon: string;
      };
    };
    recommendations: string[];
  } {
    const endTime = Date.now();
    const startTime = endTime - timeRangeMs;

    const responseTimeData = this.getHistoricalData('responseTime', timeRangeMs);
    const errorData = this.getHistoricalData('errors', timeRangeMs);
    const alertsInRange = this.getAllAlerts({ timeRangeMs });

    // Calculate averages and trends
    const avgResponseTime = responseTimeData.reduce((sum, point) => sum + point.value, 0) / responseTimeData.length || 0;
    const errorRate = (errorData.length / Math.max(this.metrics.throughput.totalRequests, 1)) * 100;

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      summary: {
        timeRange: { start: startTime, end: endTime },
        totalRequests: this.metrics.throughput.totalRequests,
        averageResponseTime: avgResponseTime,
        errorRate,
        healthScore: this.metrics.health.score,
      },
      details: {
        responseTime: {
          average: avgResponseTime,
          p95: this.metrics.responseTime.p95,
          p99: this.metrics.responseTime.p99,
          trend: this.calculateTrend('responseTime', timeRangeMs),
        },
        throughput: {
          average: this.metrics.throughput.requestsPerSecond,
          peak: this.calculatePeakThroughput(timeRangeMs),
          trend: this.calculateTrend('throughput', timeRangeMs),
        },
        errors: {
          total: this.metrics.errors.count,
          byType: Array.from(this.metrics.errors.types.entries()).map(([type, count]) => ({
            type,
            count,
            percentage: (count / this.metrics.errors.count) * 100,
          })),
          topErrors: this.getTopErrors(),
        },
        alerts: {
          total: alertsInRange.length,
          bySeverity: this.groupAlertsBySeverity(alertsInRange),
          mostCommon: this.getMostCommonAlert(alertsInRange),
        },
      },
      recommendations,
    };
  }

  /**
   * Export monitoring data for backup or analysis
   */
  exportData(): {
    config: MonitoringConfig;
    metrics: PerformanceMetrics;
    historicalData: Record<string, DataPoint[]>;
    alerts: PerformanceAlert[];
    dashboard: DashboardWidget[];
  } {
    return {
      config: this.config,
      metrics: this.metrics,
      historicalData: Object.fromEntries(this.historicalData),
      alerts: this.alerts,
      dashboard: this.dashboardWidgets,
    };
  }

  /**
   * Import monitoring data from backup
   */
  importData(data: {
    config?: MonitoringConfig;
    metrics?: PerformanceMetrics;
    historicalData?: Record<string, DataPoint[]>;
    alerts?: PerformanceAlert[];
    dashboard?: DashboardWidget[];
  }): void {
    if (data.metrics) {
      this.metrics = { ...this.metrics, ...data.metrics };
    }

    if (data.historicalData) {
      this.historicalData = new Map(Object.entries(data.historicalData));
    }

    if (data.alerts) {
      this.alerts = [...data.alerts];
    }

    if (data.dashboard) {
      this.dashboardWidgets = [...data.dashboard];
    }
  }

  /**
   * Get real-time performance stream
   */
  createPerformanceStream(): ReadableStream<PerformanceMetrics> {
    if (!this.config.streamingEnabled) {
      throw new Error('Streaming is not enabled');
    }

    return new ReadableStream({
      start: (controller) => {
        const interval = setInterval(() => {
          controller.enqueue(this.getMetrics());
        }, this.config.dashboardUpdateMs);

        // Cleanup on stream close
        return () => clearInterval(interval);
      },
    });
  }

  // Private helper methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      responseTime: {
        current: 0,
        average: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        min: Number.MAX_VALUE,
        max: 0,
      },
      throughput: {
        requestsPerSecond: 0,
        requestsPerMinute: 0,
        requestsPerHour: 0,
        totalRequests: 0,
      },
      errors: {
        rate: 0,
        count: 0,
        types: new Map(),
        criticalErrors: 0,
      },
      resources: {
        memoryUsageMB: 0,
        memoryUsagePercent: 0,
        cpuUsagePercent: 0,
        connectionCount: 0,
        cacheHitRatio: 0,
      },
      network: {
        latency: 0,
        bandwidth: 0,
        packetLoss: 0,
        retryCount: 0,
      },
      business: {
        successfulTransactions: 0,
        failedTransactions: 0,
        averageTransactionValue: 0,
        agentRegistrations: 0,
        messagesSent: 0,
      },
      health: {
        score: 100,
        status: 'healthy',
        uptime: Date.now(),
        lastHealthCheck: Date.now(),
      },
    };
  }

  private setupDefaultCollectors(): void {
    // Response time collector
    this.addCollector(() => {
      if (this.responseTimes.length === 0) return {};

      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      const avg = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const min = Math.min(...sorted);
      const max = Math.max(...sorted);

      return {
        responseTime: {
          average: avg,
          p50,
          p95,
          p99,
          min,
          max,
        },
      };
    });

    // Throughput collector
    this.addCollector(() => {
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      const oneMinuteAgo = now - 60000;
      const oneHourAgo = now - 3600000;

      const recentRequests = this.getHistoricalData('success', 1000).length;
      const minuteRequests = this.getHistoricalData('success', 60000).length;
      const hourRequests = this.getHistoricalData('success', 3600000).length;

      return {
        throughput: {
          requestsPerSecond: recentRequests,
          requestsPerMinute: minuteRequests,
          requestsPerHour: hourRequests,
        },
      };
    });

    // Error rate collector
    this.addCollector(() => {
      const totalRequests = Math.max(this.metrics.throughput.totalRequests, 1);
      const errorRate = (this.metrics.errors.count / totalRequests) * 100;

      return {
        errors: {
          rate: errorRate,
        },
      };
    });

    // Health score collector
    this.addCollector(() => {
      const healthScore = this.calculateHealthScore();
      const status = this.determineHealthStatus(healthScore);

      return {
        health: {
          score: healthScore,
          status,
          lastHealthCheck: Date.now(),
        },
      };
    });
  }

  private setupDefaultDashboard(): void {
    this.dashboardWidgets = [
      {
        id: 'response-time-chart',
        type: 'chart',
        title: 'Response Time',
        metric: 'responseTime',
        position: { x: 0, y: 0, width: 6, height: 4 },
        config: { chartType: 'line', timeRange: 3600000 },
      },
      {
        id: 'throughput-chart',
        type: 'chart',
        title: 'Throughput (RPS)',
        metric: 'throughput',
        position: { x: 6, y: 0, width: 6, height: 4 },
        config: { chartType: 'area', timeRange: 3600000 },
      },
      {
        id: 'error-rate-gauge',
        type: 'gauge',
        title: 'Error Rate',
        metric: 'errors.rate',
        position: { x: 0, y: 4, width: 3, height: 3 },
        config: { max: 10, warningThreshold: 5, criticalThreshold: 8 },
      },
      {
        id: 'health-score-gauge',
        type: 'gauge',
        title: 'Health Score',
        metric: 'health.score',
        position: { x: 3, y: 4, width: 3, height: 3 },
        config: { max: 100, warningThreshold: 70, criticalThreshold: 50 },
      },
      {
        id: 'memory-usage-gauge',
        type: 'gauge',
        title: 'Memory Usage',
        metric: 'resources.memoryUsagePercent',
        position: { x: 6, y: 4, width: 3, height: 3 },
        config: { max: 100, warningThreshold: 70, criticalThreshold: 85 },
      },
      {
        id: 'cache-hit-ratio-gauge',
        type: 'gauge',
        title: 'Cache Hit Ratio',
        metric: 'resources.cacheHitRatio',
        position: { x: 9, y: 4, width: 3, height: 3 },
        config: { max: 100, warningThreshold: 80, criticalThreshold: 60 },
      },
      {
        id: 'recent-alerts-table',
        type: 'table',
        title: 'Recent Alerts',
        metric: 'alerts',
        position: { x: 0, y: 7, width: 12, height: 4 },
        config: { maxRows: 10, timeRange: 3600000 },
      },
    ];
  }

  private collectMetrics(): void {
    // Run all collectors and merge results
    for (const collector of this.collectors) {
      try {
        const partialMetrics = collector();
        this.mergeMetrics(partialMetrics);
      } catch (error) {
        console.error('Error in metric collector:', error);
      }
    }
  }

  private mergeMetrics(partial: Partial<PerformanceMetrics>): void {
    // Deep merge partial metrics into main metrics
    if (partial.responseTime) {
      Object.assign(this.metrics.responseTime, partial.responseTime);
    }
    if (partial.throughput) {
      Object.assign(this.metrics.throughput, partial.throughput);
    }
    if (partial.errors) {
      Object.assign(this.metrics.errors, partial.errors);
    }
    if (partial.resources) {
      Object.assign(this.metrics.resources, partial.resources);
    }
    if (partial.network) {
      Object.assign(this.metrics.network, partial.network);
    }
    if (partial.business) {
      Object.assign(this.metrics.business, partial.business);
    }
    if (partial.health) {
      Object.assign(this.metrics.health, partial.health);
    }
  }

  private analyzePerformance(): void {
    // Run anomaly detection if enabled
    if (this.config.anomalyDetection) {
      this.detectAnomalies();
    }

    // Run performance predictions if enabled
    if (this.config.predictionEnabled) {
      this.predictPerformance();
    }

    // Run auto-optimization if enabled
    if (this.config.autoOptimization) {
      this.optimizePerformance();
    }
  }

  private checkAlerts(): void {
    if (!this.config.alerts.enabled) {
      return;
    }

    this.checkResponseTimeAlert();
    this.checkErrorRateAlert();
    this.checkMemoryAlert();
    this.checkHealthAlert();
  }

  private checkResponseTimeAlert(): void {
    const threshold = this.config.alerts.thresholds.responseTime;
    const current = this.metrics.responseTime.average;
    
    if (current > threshold) {
      this.createAlert('response-time', {
        severity: current > threshold * 2 ? 'critical' : 'high',
        message: `Response time ${current.toFixed(2)}ms exceeds threshold ${threshold}ms`,
        metric: 'responseTime.average',
        threshold,
        actualValue: current,
      });
    } else {
      this.resolveAlert('response-time');
    }
  }

  private checkErrorRateAlert(): void {
    const threshold = this.config.alerts.thresholds.errorRate;
    const current = this.metrics.errors.rate;
    
    if (current > threshold) {
      this.createAlert('error-rate', {
        severity: current > threshold * 2 ? 'critical' : 'high',
        message: `Error rate ${current.toFixed(2)}% exceeds threshold ${threshold}%`,
        metric: 'errors.rate',
        threshold,
        actualValue: current,
      });
    } else {
      this.resolveAlert('error-rate');
    }
  }

  private checkMemoryAlert(): void {
    const threshold = this.config.alerts.thresholds.memoryUsage;
    const current = this.metrics.resources.memoryUsagePercent;
    
    if (current > threshold) {
      this.createAlert('memory-usage', {
        severity: current > 90 ? 'critical' : 'medium',
        message: `Memory usage ${current.toFixed(2)}% exceeds threshold ${threshold}%`,
        metric: 'resources.memoryUsagePercent',
        threshold,
        actualValue: current,
      });
    } else {
      this.resolveAlert('memory-usage');
    }
  }

  private checkHealthAlert(): void {
    const threshold = this.config.alerts.thresholds.healthScore;
    const current = this.metrics.health.score;
    
    if (current < threshold) {
      this.createAlert('health-score', {
        severity: current < 50 ? 'critical' : 'medium',
        message: `Health score ${current.toFixed(2)} below threshold ${threshold}`,
        metric: 'health.score',
        threshold,
        actualValue: current,
      });
    } else {
      this.resolveAlert('health-score');
    }
  }

  private createAlert(type: string, alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved' | 'context'>): void {
    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(type);
    const now = Date.now();
    
    if (lastAlert && now - lastAlert < this.config.alerts.cooldownMs) {
      return;
    }

    const alertId = `${type}-${now}`;
    
    // Don't create duplicate alerts
    if (this.activeAlerts.has(type)) {
      return;
    }

    const fullAlert: PerformanceAlert = {
      id: alertId,
      timestamp: now,
      type,
      resolved: false,
      context: {
        config: this.config.alerts.thresholds,
        metrics: this.metrics,
      },
      ...alert,
    };

    this.alerts.push(fullAlert);
    this.activeAlerts.add(type);
    this.lastAlertTime.set(type, now);

    // Send alert notification
    this.sendAlertNotification(fullAlert);
  }

  private resolveAlert(type: string): void {
    if (!this.activeAlerts.has(type)) {
      return;
    }

    const alert = this.alerts.find(a => a.type === type && !a.resolved);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(type);
      
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }

  private sendAlertNotification(alert: PerformanceAlert): void {
    const channels = this.config.alerts.channels;

    if (channels.console) {
      const emoji = this.getAlertEmoji(alert.severity);
      console.warn(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }

    // Additional notification channels could be implemented here
    // webhook, email, slack, etc.
  }

  private getAlertEmoji(severity: PerformanceAlert['severity']): string {
    switch (severity) {
      case 'low': return '🟡';
      case 'medium': return '🟠';
      case 'high': return '🔴';
      case 'critical': return '🚨';
      default: return '⚠️';
    }
  }

  private updateDashboard(): void {
    // Dashboard updates would be handled by external consumers
    // This is just a placeholder for dashboard update logic
  }

  private addDataPoint(metric: string, value: number, metadata?: Record<string, any>): void {
    if (!this.historicalData.has(metric)) {
      this.historicalData.set(metric, []);
    }

    const data = this.historicalData.get(metric)!;
    data.push({
      timestamp: Date.now(),
      value,
      metadata,
    });

    // Limit data points to prevent memory issues
    if (data.length > this.config.maxDataPoints) {
      data.splice(0, data.length - this.config.maxDataPoints);
    }
  }

  private calculateHealthScore(): number {
    const factors = [
      { weight: 0.3, score: this.getResponseTimeScore() },
      { weight: 0.2, score: this.getErrorRateScore() },
      { weight: 0.2, score: this.getThroughputScore() },
      { weight: 0.15, score: this.getResourceScore() },
      { weight: 0.15, score: this.getUptimeScore() },
    ];

    const weightedScore = factors.reduce((sum, factor) => sum + factor.weight * factor.score, 0);
    return Math.max(0, Math.min(100, weightedScore));
  }

  private getResponseTimeScore(): number {
    const current = this.metrics.responseTime.average;
    const baseline = this.config.baseline.responseTimeMs;
    
    if (current <= baseline) return 100;
    if (current >= baseline * 5) return 0;
    
    return 100 - ((current - baseline) / (baseline * 4)) * 100;
  }

  private getErrorRateScore(): number {
    const current = this.metrics.errors.rate;
    const baseline = this.config.baseline.errorRatePercent;
    
    if (current <= baseline) return 100;
    if (current >= baseline * 10) return 0;
    
    return 100 - ((current - baseline) / (baseline * 9)) * 100;
  }

  private getThroughputScore(): number {
    const current = this.metrics.throughput.requestsPerSecond;
    const baseline = this.config.baseline.throughputRps;
    
    if (current >= baseline) return 100;
    if (current <= baseline * 0.1) return 0;
    
    return (current / baseline) * 100;
  }

  private getResourceScore(): number {
    const memoryScore = Math.max(0, 100 - this.metrics.resources.memoryUsagePercent);
    const cpuScore = Math.max(0, 100 - this.metrics.resources.cpuUsagePercent);
    return (memoryScore + cpuScore) / 2;
  }

  private getUptimeScore(): number {
    const uptime = Date.now() - this.metrics.health.uptime;
    const hours = uptime / (1000 * 60 * 60);
    
    if (hours >= 24) return 100;
    return (hours / 24) * 100;
  }

  private determineHealthStatus(score: number): 'healthy' | 'degraded' | 'critical' {
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'degraded';
    return 'critical';
  }

  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      /connection.*failed/i,
      /timeout/i,
      /out of memory/i,
      /fatal/i,
      /critical/i,
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  private detectAnomalies(): void {
    // Simple anomaly detection based on standard deviation
    const responseTimeData = this.getHistoricalData('responseTime', 3600000);
    if (responseTimeData.length < 10) return;

    const values = responseTimeData.map(point => point.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const current = this.metrics.responseTime.current;
    const threshold = mean + (2 * stdDev); // 2 standard deviations

    if (current > threshold) {
      this.createAlert('anomaly-response-time', {
        severity: 'medium',
        message: `Response time anomaly detected: ${current.toFixed(2)}ms (threshold: ${threshold.toFixed(2)}ms)`,
        metric: 'responseTime.current',
        threshold,
        actualValue: current,
      });
    }
  }

  private predictPerformance(): void {
    // Simple linear regression for performance prediction
    const responseTimeData = this.getHistoricalData('responseTime', 1800000); // 30 minutes
    if (responseTimeData.length < 10) return;

    const x = responseTimeData.map((_, i) => i);
    const y = responseTimeData.map(point => point.value);

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next 10 data points (10 minutes ahead)
    const futureValue = slope * (n + 10) + intercept;

    if (slope > 5) { // Response time increasing rapidly
      console.warn(`📈 Performance degradation predicted: Response time may reach ${futureValue.toFixed(2)}ms`);
    }
  }

  private optimizePerformance(): void {
    // Auto-optimization suggestions based on current metrics
    if (this.metrics.errors.rate > 5) {
      console.log('🔧 Auto-optimization: Consider enabling request retry logic');
    }

    if (this.metrics.responseTime.average > this.config.baseline.responseTimeMs * 2) {
      console.log('🔧 Auto-optimization: Consider increasing connection pool size');
    }

    if (this.metrics.resources.memoryUsagePercent > 80) {
      console.log('🔧 Auto-optimization: Consider enabling cache compression');
    }
  }

  private calculateTrend(metric: string, timeRangeMs: number): 'improving' | 'stable' | 'degrading' {
    const data = this.getHistoricalData(metric, timeRangeMs);
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change < -5) return 'improving'; // 5% improvement
    if (change > 5) return 'degrading'; // 5% degradation
    return 'stable';
  }

  private calculatePeakThroughput(timeRangeMs: number): number {
    const data = this.getHistoricalData('success', timeRangeMs);
    if (data.length === 0) return 0;

    // Calculate peak requests per second
    const buckets = new Map<number, number>();
    for (const point of data) {
      const bucket = Math.floor(point.timestamp / 1000) * 1000;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return Math.max(...buckets.values(), 0);
  }

  private getTopErrors(): Array<{ type: string; count: number; lastOccurrence: number }> {
    return Array.from(this.metrics.errors.types.entries())
      .map(([type, count]) => ({
        type,
        count,
        lastOccurrence: Date.now(), // Would need to track actual last occurrence
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private groupAlertsBySeverity(alerts: PerformanceAlert[]): Record<string, number> {
    const groups: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const alert of alerts) {
      groups[alert.severity]++;
    }

    return groups;
  }

  private getMostCommonAlert(alerts: PerformanceAlert[]): string {
    if (alerts.length === 0) return 'None';

    const counts = new Map<string, number>();
    for (const alert of alerts) {
      counts.set(alert.type, (counts.get(alert.type) || 0) + 1);
    }

    const [mostCommon] = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['None', 0];

    return mostCommon;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.responseTime.average > this.config.baseline.responseTimeMs * 2) {
      recommendations.push('Consider optimizing database queries or increasing connection pool size');
    }

    if (this.metrics.errors.rate > 5) {
      recommendations.push('Implement retry logic and improve error handling');
    }

    if (this.metrics.resources.memoryUsagePercent > 80) {
      recommendations.push('Enable cache compression or increase memory allocation');
    }

    if (this.metrics.throughput.requestsPerSecond < this.config.baseline.throughputRps * 0.5) {
      recommendations.push('Investigate bottlenecks in request processing pipeline');
    }

    if (this.metrics.health.score < 70) {
      recommendations.push('Review system health and address critical issues');
    }

    return recommendations;
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getGlobalMonitor(config?: Partial<MonitoringConfig>): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(config);
  }
  return globalMonitor;
}

/**
 * Performance monitoring decorator
 */
export function monitored(
  options: {
    operation?: string;
    recordErrors?: boolean;
    recordSuccess?: boolean;
  } = {}
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitor = getGlobalMonitor();

    descriptor.value = async function(...args: any[]) {
      const startTime = performance.now();
      const operation = options.operation || `${target.constructor.name}.${propertyKey}`;

      try {
        const result = await originalMethod.apply(this, args);
        
        const responseTime = performance.now() - startTime;
        monitor.recordResponseTime(responseTime, operation);
        
        if (options.recordSuccess !== false) {
          monitor.recordSuccess(operation);
        }
        
        return result;
      } catch (error) {
        if (options.recordErrors !== false) {
          monitor.recordError(error as Error, { operation, args });
        }
        throw error;
      }
    };

    return descriptor;
  };
}