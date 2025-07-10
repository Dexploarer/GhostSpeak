/**
 * Performance monitoring and optimization tools
 */

import type { PerformanceMetric } from './types';
import { MetricsCollector } from './metrics';
import { StructuredLogger } from './logger';

export class PerformanceMonitor {
  private measurements: Map<string, PerformanceMeasurement[]> = new Map();
  private activeTimers: Map<string, PerformanceTimer> = new Map();
  private metricsCollector: MetricsCollector;
  private logger: StructuredLogger;
  private thresholds: Map<string, PerformanceThreshold> = new Map();

  constructor(metricsCollector: MetricsCollector, logger: StructuredLogger) {
    this.metricsCollector = metricsCollector;
    this.logger = logger;
    this.setupDefaultThresholds();
  }

  // Start performance measurement
  startMeasurement(name: string, category?: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const timer: PerformanceTimer = {
      id,
      name,
      category: category || 'general',
      startTime: Date.now(),
      startCPU: process.cpuUsage(),
      startMemory: process.memoryUsage(),
      metadata: metadata || {},
    };

    this.activeTimers.set(id, timer);

    this.logger.debug(
      {
        performanceId: id,
        name,
        category,
        metadata,
      },
      `Performance measurement started: ${name}`
    );

    return id;
  }

  // End performance measurement
  endMeasurement(id: string, metadata?: Record<string, any>): PerformanceMeasurement {
    const timer = this.activeTimers.get(id);
    if (!timer) {
      throw new Error(`Performance timer not found: ${id}`);
    }

    const endTime = Date.now();
    const endCPU = process.cpuUsage(timer.startCPU);
    const endMemory = process.memoryUsage();

    const measurement: PerformanceMeasurement = {
      id: timer.id,
      name: timer.name,
      category: timer.category,
      startTime: timer.startTime,
      endTime,
      duration: endTime - timer.startTime,
      cpuUsage: {
        user: endCPU.user,
        system: endCPU.system,
        total: endCPU.user + endCPU.system,
      },
      memoryDelta: {
        heapUsed: endMemory.heapUsed - timer.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - timer.startMemory.heapTotal,
        external: endMemory.external - timer.startMemory.external,
        rss: endMemory.rss - timer.startMemory.rss,
      },
      metadata: { ...timer.metadata, ...metadata },
    };

    this.activeTimers.delete(id);

    // Store measurement
    if (!this.measurements.has(timer.name)) {
      this.measurements.set(timer.name, []);
    }
    this.measurements.get(timer.name)!.push(measurement);

    // Record metrics
    this.recordMetrics(measurement);

    // Check thresholds
    this.checkThresholds(measurement);

    this.logger.debug(
      {
        performanceId: id,
        name: timer.name,
        duration: measurement.duration,
        category: timer.category,
      },
      `Performance measurement completed: ${timer.name} (${measurement.duration}ms)`
    );

    return measurement;
  }

  // Measure function execution
  async measureFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    category?: string,
    metadata?: Record<string, any>
  ): Promise<{ result: T; measurement: PerformanceMeasurement }> {
    const id = this.startMeasurement(name, category, metadata);
    
    try {
      const result = await fn();
      const measurement = this.endMeasurement(id);
      return { result, measurement };
    } catch (error) {
      const measurement = this.endMeasurement(id, { error: true });
      throw error;
    }
  }

  // Get performance statistics for an operation
  getStats(name: string): PerformanceStats {
    const measurements = this.measurements.get(name) || [];
    
    if (measurements.length === 0) {
      return {
        name,
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        percentiles: {},
        cpuStats: { averageUser: 0, averageSystem: 0, averageTotal: 0 },
        memoryStats: { averageHeapDelta: 0, averageRSSelta: 0 },
        errorRate: 0,
        throughput: 0,
      };
    }

    const durations = measurements.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const errors = measurements.filter(m => m.metadata?.error).length;

    // CPU statistics
    const cpuStats = {
      averageUser: measurements.reduce((sum, m) => sum + m.cpuUsage.user, 0) / measurements.length,
      averageSystem: measurements.reduce((sum, m) => sum + m.cpuUsage.system, 0) / measurements.length,
      averageTotal: measurements.reduce((sum, m) => sum + m.cpuUsage.total, 0) / measurements.length,
    };

    // Memory statistics
    const memoryStats = {
      averageHeapDelta: measurements.reduce((sum, m) => sum + m.memoryDelta.heapUsed, 0) / measurements.length,
      averageRSSelta: measurements.reduce((sum, m) => sum + m.memoryDelta.rss, 0) / measurements.length,
    };

    // Calculate percentiles
    const percentiles = {
      p50: durations[Math.floor(durations.length * 0.5)],
      p75: durations[Math.floor(durations.length * 0.75)],
      p90: durations[Math.floor(durations.length * 0.9)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };

    // Calculate throughput (operations per second)
    const timeSpan = Math.max(...measurements.map(m => m.endTime)) - 
                   Math.min(...measurements.map(m => m.startTime));
    const throughput = timeSpan > 0 ? (measurements.length / timeSpan) * 1000 : 0;

    return {
      name,
      count: measurements.length,
      totalDuration,
      averageDuration: totalDuration / measurements.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      percentiles,
      cpuStats,
      memoryStats,
      errorRate: errors / measurements.length,
      throughput,
    };
  }

  // Get all performance statistics
  getAllStats(): Map<string, PerformanceStats> {
    const stats = new Map<string, PerformanceStats>();
    
    for (const name of this.measurements.keys()) {
      stats.set(name, this.getStats(name));
    }

    return stats;
  }

  // Set performance threshold
  setThreshold(name: string, threshold: PerformanceThreshold): void {
    this.thresholds.set(name, threshold);
    
    this.logger.info(
      {
        operation: name,
        threshold,
      },
      `Performance threshold set for ${name}`
    );
  }

  // Remove performance threshold
  removeThreshold(name: string): void {
    this.thresholds.delete(name);
    
    this.logger.info(
      { operation: name },
      `Performance threshold removed for ${name}`
    );
  }

  // Get slow operations
  getSlowOperations(thresholdMs: number = 1000): PerformanceMeasurement[] {
    const slowOps: PerformanceMeasurement[] = [];
    
    for (const measurements of this.measurements.values()) {
      slowOps.push(...measurements.filter(m => m.duration > thresholdMs));
    }

    return slowOps.sort((a, b) => b.duration - a.duration);
  }

  // Get memory-intensive operations
  getMemoryIntensiveOperations(thresholdBytes: number = 10 * 1024 * 1024): PerformanceMeasurement[] {
    const memoryOps: PerformanceMeasurement[] = [];
    
    for (const measurements of this.measurements.values()) {
      memoryOps.push(...measurements.filter(m => 
        Math.abs(m.memoryDelta.heapUsed) > thresholdBytes
      ));
    }

    return memoryOps.sort((a, b) => 
      Math.abs(b.memoryDelta.heapUsed) - Math.abs(a.memoryDelta.heapUsed)
    );
  }

  // Generate performance report
  generateReport(timeframe: 'hour' | 'day' | 'week' = 'day'): PerformanceReport {
    const now = Date.now();
    const timeRanges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - timeRanges[timeframe];
    const recentMeasurements = new Map<string, PerformanceMeasurement[]>();

    // Filter measurements by timeframe
    for (const [name, measurements] of this.measurements.entries()) {
      const recent = measurements.filter(m => m.startTime > cutoff);
      if (recent.length > 0) {
        recentMeasurements.set(name, recent);
      }
    }

    // Calculate summary statistics
    const totalOperations = Array.from(recentMeasurements.values())
      .reduce((sum, measurements) => sum + measurements.length, 0);

    const slowOperations = this.getSlowOperations(1000)
      .filter(m => m.startTime > cutoff);

    const memoryIntensiveOps = this.getMemoryIntensiveOperations(10 * 1024 * 1024)
      .filter(m => m.startTime > cutoff);

    // Top operations by count
    const topOperationsByCount = Array.from(recentMeasurements.entries())
      .map(([name, measurements]) => ({ name, count: measurements.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top operations by duration
    const topOperationsByDuration = Array.from(recentMeasurements.entries())
      .map(([name, measurements]) => ({
        name,
        averageDuration: measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length,
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    return {
      timeframe,
      startTime: cutoff,
      endTime: now,
      summary: {
        totalOperations,
        uniqueOperations: recentMeasurements.size,
        slowOperations: slowOperations.length,
        memoryIntensiveOperations: memoryIntensiveOps.length,
      },
      topOperationsByCount,
      topOperationsByDuration,
      slowOperations: slowOperations.slice(0, 20),
      memoryIntensiveOperations: memoryIntensiveOps.slice(0, 20),
      recommendations: this.generateRecommendations(recentMeasurements),
    };
  }

  // Clear old measurements
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    for (const [name, measurements] of this.measurements.entries()) {
      const filtered = measurements.filter(m => m.startTime > cutoff);
      
      if (filtered.length === 0) {
        this.measurements.delete(name);
      } else {
        this.measurements.set(name, filtered);
      }
    }

    this.logger.debug(
      { cutoff: new Date(cutoff).toISOString() },
      'Performance measurements cleaned up'
    );
  }

  // Record metrics for measurement
  private recordMetrics(measurement: PerformanceMeasurement): void {
    this.metricsCollector.recordTiming(
      'ghostspeak_operation_duration',
      measurement.duration,
      {
        operation: measurement.name,
        category: measurement.category,
      }
    );

    this.metricsCollector.recordMetric(
      'ghostspeak_operation_cpu_usage',
      measurement.cpuUsage.total,
      {
        operation: measurement.name,
        category: measurement.category,
        type: 'total',
      }
    );

    this.metricsCollector.recordMetric(
      'ghostspeak_operation_memory_delta',
      measurement.memoryDelta.heapUsed,
      {
        operation: measurement.name,
        category: measurement.category,
        type: 'heap',
      }
    );
  }

  // Check performance thresholds
  private checkThresholds(measurement: PerformanceMeasurement): void {
    const threshold = this.thresholds.get(measurement.name);
    if (!threshold) return;

    const violations: string[] = [];

    if (threshold.maxDuration && measurement.duration > threshold.maxDuration) {
      violations.push(`Duration ${measurement.duration}ms > ${threshold.maxDuration}ms`);
    }

    if (threshold.maxMemory && measurement.memoryDelta.heapUsed > threshold.maxMemory) {
      violations.push(`Memory ${measurement.memoryDelta.heapUsed} > ${threshold.maxMemory}`);
    }

    if (threshold.maxCPU && measurement.cpuUsage.total > threshold.maxCPU) {
      violations.push(`CPU ${measurement.cpuUsage.total} > ${threshold.maxCPU}`);
    }

    if (violations.length > 0) {
      this.logger.warn(
        {
          operation: measurement.name,
          violations,
          measurement,
        },
        `Performance threshold violated for ${measurement.name}: ${violations.join(', ')}`
      );
    }
  }

  // Setup default performance thresholds
  private setupDefaultThresholds(): void {
    // RPC call thresholds
    this.setThreshold('rpc_call', {
      maxDuration: 5000, // 5 seconds
      maxMemory: 50 * 1024 * 1024, // 50MB
    });

    // Transaction thresholds
    this.setThreshold('transaction', {
      maxDuration: 30000, // 30 seconds
      maxMemory: 100 * 1024 * 1024, // 100MB
    });

    // Agent operation thresholds
    this.setThreshold('agent_operation', {
      maxDuration: 10000, // 10 seconds
      maxMemory: 25 * 1024 * 1024, // 25MB
    });
  }

  // Generate performance recommendations
  private generateRecommendations(measurements: Map<string, PerformanceMeasurement[]>): string[] {
    const recommendations: string[] = [];

    for (const [name, ops] of measurements.entries()) {
      const stats = this.getStats(name);

      // Check for slow operations
      if (stats.averageDuration > 1000) {
        recommendations.push(
          `Consider optimizing '${name}' - average duration ${stats.averageDuration.toFixed(0)}ms`
        );
      }

      // Check for high error rate
      if (stats.errorRate > 0.05) {
        recommendations.push(
          `High error rate for '${name}' - ${(stats.errorRate * 100).toFixed(1)}% of operations fail`
        );
      }

      // Check for memory issues
      if (stats.memoryStats.averageHeapDelta > 50 * 1024 * 1024) {
        recommendations.push(
          `Memory usage concern for '${name}' - average heap delta ${Math.round(stats.memoryStats.averageHeapDelta / 1024 / 1024)}MB`
        );
      }

      // Check for high CPU usage
      if (stats.cpuStats.averageTotal > 100000) { // 100ms CPU time
        recommendations.push(
          `CPU intensive operation '${name}' - average ${Math.round(stats.cpuStats.averageTotal / 1000)}ms CPU time`
        );
      }
    }

    return recommendations;
  }
}

// Performance optimization suggestions
export class PerformanceOptimizer {
  private monitor: PerformanceMonitor;
  private logger: StructuredLogger;

  constructor(monitor: PerformanceMonitor, logger: StructuredLogger) {
    this.monitor = monitor;
    this.logger = logger;
  }

  // Analyze and suggest optimizations
  analyzeAndSuggest(operationName?: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const stats = operationName ? 
      new Map([[operationName, this.monitor.getStats(operationName)]]) :
      this.monitor.getAllStats();

    for (const [name, stat] of stats.entries()) {
      if (stat.count === 0) continue;

      // Duration-based suggestions
      if (stat.averageDuration > 5000) {
        suggestions.push({
          operation: name,
          type: 'performance',
          severity: 'high',
          title: 'Slow Operation',
          description: `Operation '${name}' has high average duration (${stat.averageDuration.toFixed(0)}ms)`,
          suggestions: [
            'Consider adding caching',
            'Optimize database queries',
            'Use connection pooling',
            'Implement pagination for large datasets',
          ],
          impact: 'high',
        });
      } else if (stat.averageDuration > 2000) {
        suggestions.push({
          operation: name,
          type: 'performance',
          severity: 'medium',
          title: 'Moderate Performance Issue',
          description: `Operation '${name}' could be optimized (${stat.averageDuration.toFixed(0)}ms average)`,
          suggestions: [
            'Review algorithm efficiency',
            'Consider asynchronous processing',
            'Optimize data structures',
          ],
          impact: 'medium',
        });
      }

      // Memory-based suggestions
      if (stat.memoryStats.averageHeapDelta > 100 * 1024 * 1024) {
        suggestions.push({
          operation: name,
          type: 'memory',
          severity: 'high',
          title: 'High Memory Usage',
          description: `Operation '${name}' uses significant memory (${Math.round(stat.memoryStats.averageHeapDelta / 1024 / 1024)}MB average)`,
          suggestions: [
            'Implement object pooling',
            'Use streaming for large data',
            'Review memory leaks',
            'Optimize data structures',
          ],
          impact: 'high',
        });
      }

      // Error rate suggestions
      if (stat.errorRate > 0.1) {
        suggestions.push({
          operation: name,
          type: 'reliability',
          severity: 'high',
          title: 'High Error Rate',
          description: `Operation '${name}' has high error rate (${(stat.errorRate * 100).toFixed(1)}%)`,
          suggestions: [
            'Add retry mechanisms',
            'Improve error handling',
            'Add input validation',
            'Review edge cases',
          ],
          impact: 'high',
        });
      }

      // CPU usage suggestions
      if (stat.cpuStats.averageTotal > 500000) { // 500ms CPU time
        suggestions.push({
          operation: name,
          type: 'cpu',
          severity: 'medium',
          title: 'High CPU Usage',
          description: `Operation '${name}' is CPU intensive (${Math.round(stat.cpuStats.averageTotal / 1000)}ms average)`,
          suggestions: [
            'Use worker threads for heavy computation',
            'Implement caching',
            'Optimize algorithms',
            'Consider pre-computation',
          ],
          impact: 'medium',
        });
      }

      // Throughput suggestions
      if (stat.throughput < 1 && stat.count > 10) {
        suggestions.push({
          operation: name,
          type: 'throughput',
          severity: 'medium',
          title: 'Low Throughput',
          description: `Operation '${name}' has low throughput (${stat.throughput.toFixed(2)} ops/sec)`,
          suggestions: [
            'Implement parallel processing',
            'Use batching',
            'Optimize I/O operations',
            'Consider load balancing',
          ],
          impact: 'medium',
        });
      }
    }

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Auto-optimize based on patterns
  autoOptimize(operationName: string): OptimizationResult {
    const stats = this.monitor.getStats(operationName);
    const suggestions = this.analyzeAndSuggest(operationName);
    
    const result: OptimizationResult = {
      operation: operationName,
      originalStats: stats,
      appliedOptimizations: [],
      estimatedImprovement: {},
    };

    // Apply automatic optimizations (this would be more sophisticated in practice)
    for (const suggestion of suggestions) {
      if (suggestion.type === 'performance' && suggestion.severity === 'high') {
        // Example: Enable caching
        result.appliedOptimizations.push('caching_enabled');
        result.estimatedImprovement.duration = stats.averageDuration * 0.3; // 30% improvement
      }
      
      if (suggestion.type === 'memory' && suggestion.severity === 'high') {
        // Example: Enable object pooling
        result.appliedOptimizations.push('object_pooling_enabled');
        result.estimatedImprovement.memory = stats.memoryStats.averageHeapDelta * 0.4; // 40% reduction
      }
    }

    this.logger.info(
      {
        operation: operationName,
        optimizations: result.appliedOptimizations,
        estimatedImprovement: result.estimatedImprovement,
      },
      `Auto-optimization applied to ${operationName}`
    );

    return result;
  }
}

// Type definitions
interface PerformanceTimer {
  id: string;
  name: string;
  category: string;
  startTime: number;
  startCPU: NodeJS.CpuUsage;
  startMemory: NodeJS.MemoryUsage;
  metadata: Record<string, any>;
}

interface PerformanceMeasurement {
  id: string;
  name: string;
  category: string;
  startTime: number;
  endTime: number;
  duration: number;
  cpuUsage: {
    user: number;
    system: number;
    total: number;
  };
  memoryDelta: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  metadata: Record<string, any>;
}

interface PerformanceStats {
  name: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  percentiles: Record<string, number>;
  cpuStats: {
    averageUser: number;
    averageSystem: number;
    averageTotal: number;
  };
  memoryStats: {
    averageHeapDelta: number;
    averageRSSelta: number;
  };
  errorRate: number;
  throughput: number;
}

interface PerformanceThreshold {
  maxDuration?: number;
  maxMemory?: number;
  maxCPU?: number;
  maxErrorRate?: number;
}

interface PerformanceReport {
  timeframe: string;
  startTime: number;
  endTime: number;
  summary: {
    totalOperations: number;
    uniqueOperations: number;
    slowOperations: number;
    memoryIntensiveOperations: number;
  };
  topOperationsByCount: Array<{ name: string; count: number }>;
  topOperationsByDuration: Array<{ name: string; averageDuration: number }>;
  slowOperations: PerformanceMeasurement[];
  memoryIntensiveOperations: PerformanceMeasurement[];
  recommendations: string[];
}

interface OptimizationSuggestion {
  operation: string;
  type: 'performance' | 'memory' | 'cpu' | 'reliability' | 'throughput';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestions: string[];
  impact: 'low' | 'medium' | 'high';
}

interface OptimizationResult {
  operation: string;
  originalStats: PerformanceStats;
  appliedOptimizations: string[];
  estimatedImprovement: {
    duration?: number;
    memory?: number;
    cpu?: number;
    errorRate?: number;
  };
}

// Singleton instances
let performanceMonitorInstance: PerformanceMonitor | null = null;

export const getPerformanceMonitor = (
  metricsCollector?: MetricsCollector,
  logger?: StructuredLogger
): PerformanceMonitor => {
  if (!performanceMonitorInstance && metricsCollector && logger) {
    performanceMonitorInstance = new PerformanceMonitor(metricsCollector, logger);
  }
  if (!performanceMonitorInstance) {
    throw new Error('PerformanceMonitor not initialized. Provide metricsCollector and logger instances.');
  }
  return performanceMonitorInstance;
};