/**
 * Comprehensive metrics collection and reporting system
 */

import type { MetricDefinition, MetricValue, MetricType, PerformanceMetric, BusinessMetric } from './types';

export class MetricsCollector {
  private metrics: Map<string, MetricValue[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private startTime = Date.now();

  constructor() {
    this.registerCoreMetrics();
  }

  // Register metric definition
  registerMetric(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);
    if (!this.metrics.has(definition.name)) {
      this.metrics.set(definition.name, []);
    }
  }

  // Record metric value
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
    tags?: string[]
  ): void {
    const timestamp = Date.now();
    const metricValue: MetricValue = {
      name,
      value,
      timestamp,
      labels,
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metricValue);
  }

  // Increment counter
  increment(name: string, labels?: Record<string, string>, amount: number = 1): void {
    this.recordMetric(name, amount, labels, ['counter']);
  }

  // Set gauge value
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels, ['gauge']);
  }

  // Record histogram value
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels, ['histogram']);
  }

  // Record timing
  recordTiming(name: string, durationMs: number, labels?: Record<string, string>): void {
    this.recordMetric(name, durationMs, { ...labels, unit: 'milliseconds' }, ['timing']);
  }

  // Time a function execution
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.recordTiming(name, Date.now() - start, { ...labels, status: 'success' });
      return result;
    } catch (error) {
      this.recordTiming(name, Date.now() - start, { ...labels, status: 'error' });
      throw error;
    }
  }

  // Get metric values
  getMetric(name: string): MetricValue[] {
    return this.metrics.get(name) || [];
  }

  // Get all metrics
  getAllMetrics(): Map<string, MetricValue[]> {
    return new Map(this.metrics);
  }

  // Get metric summary
  getMetricSummary(name: string, windowMs: number = 60000): {
    count: number;
    sum: number;
    average: number;
    min: number;
    max: number;
    latest: number;
  } {
    const values = this.getMetric(name);
    const cutoff = Date.now() - windowMs;
    const recentValues = values
      .filter(v => v.timestamp > cutoff)
      .map(v => v.value);

    if (recentValues.length === 0) {
      return { count: 0, sum: 0, average: 0, min: 0, max: 0, latest: 0 };
    }

    const sum = recentValues.reduce((a, b) => a + b, 0);
    return {
      count: recentValues.length,
      sum,
      average: sum / recentValues.length,
      min: Math.min(...recentValues),
      max: Math.max(...recentValues),
      latest: recentValues[recentValues.length - 1],
    };
  }

  // Get percentiles for histogram metrics
  getPercentiles(name: string, percentiles: number[] = [50, 90, 95, 99]): Record<string, number> {
    const values = this.getMetric(name)
      .map(v => v.value)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return percentiles.reduce((acc, p) => ({ ...acc, [`p${p}`]: 0 }), {});
    }

    return percentiles.reduce((acc, p) => {
      const index = Math.ceil((p / 100) * values.length) - 1;
      return { ...acc, [`p${p}`]: values[Math.max(0, index)] };
    }, {});
  }

  // Clean up old metrics
  cleanup(retentionMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - retentionMs;
    for (const [name, values] of this.metrics.entries()) {
      const filtered = values.filter(v => v.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
  }

  // Export metrics in Prometheus format
  exportPrometheus(): string {
    let output = '';

    for (const [name, definition] of this.definitions.entries()) {
      output += `# HELP ${name} ${definition.description}\n`;
      output += `# TYPE ${name} ${definition.type}\n`;

      const values = this.getMetric(name);
      const latest = values[values.length - 1];
      
      if (latest) {
        const labels = latest.labels 
          ? Object.entries(latest.labels).map(([k, v]) => `${k}="${v}"`).join(',')
          : '';
        output += `${name}${labels ? `{${labels}}` : ''} ${latest.value} ${latest.timestamp}\n`;
      }
    }

    return output;
  }

  // Register core platform metrics
  private registerCoreMetrics(): void {
    // Agent metrics
    this.registerMetric({
      name: 'ghostspeak_agents_total',
      type: 'gauge',
      description: 'Total number of registered agents',
    });

    this.registerMetric({
      name: 'ghostspeak_agents_active',
      type: 'gauge',
      description: 'Number of active agents',
    });

    // Transaction metrics
    this.registerMetric({
      name: 'ghostspeak_transactions_total',
      type: 'counter',
      description: 'Total number of transactions',
      labels: ['type', 'status'],
    });

    this.registerMetric({
      name: 'ghostspeak_transaction_duration',
      type: 'histogram',
      description: 'Transaction duration in milliseconds',
      unit: 'milliseconds',
      labels: ['type'],
    });

    // Escrow metrics
    this.registerMetric({
      name: 'ghostspeak_escrow_value_locked',
      type: 'gauge',
      description: 'Total value locked in escrow',
      unit: 'lamports',
    });

    this.registerMetric({
      name: 'ghostspeak_escrow_count',
      type: 'gauge',
      description: 'Number of active escrows',
    });

    // Message metrics
    this.registerMetric({
      name: 'ghostspeak_messages_total',
      type: 'counter',
      description: 'Total number of messages sent',
      labels: ['type', 'status'],
    });

    this.registerMetric({
      name: 'ghostspeak_message_latency',
      type: 'histogram',
      description: 'Message delivery latency in milliseconds',
      unit: 'milliseconds',
    });

    // Error metrics
    this.registerMetric({
      name: 'ghostspeak_errors_total',
      type: 'counter',
      description: 'Total number of errors',
      labels: ['component', 'type'],
    });

    // Performance metrics
    this.registerMetric({
      name: 'ghostspeak_rpc_calls_total',
      type: 'counter',
      description: 'Total number of RPC calls',
      labels: ['method', 'status'],
    });

    this.registerMetric({
      name: 'ghostspeak_rpc_duration',
      type: 'histogram',
      description: 'RPC call duration in milliseconds',
      unit: 'milliseconds',
      labels: ['method'],
    });

    // System metrics
    this.registerMetric({
      name: 'ghostspeak_uptime_seconds',
      type: 'counter',
      description: 'Application uptime in seconds',
    });

    this.registerMetric({
      name: 'ghostspeak_memory_usage_bytes',
      type: 'gauge',
      description: 'Memory usage in bytes',
    });

    this.registerMetric({
      name: 'ghostspeak_cpu_usage_percent',
      type: 'gauge',
      description: 'CPU usage percentage',
    });
  }
}

// Performance metrics collector
export class PerformanceMetrics {
  private collector: MetricsCollector;
  private timers: Map<string, number> = new Map();

  constructor(collector: MetricsCollector) {
    this.collector = collector;
  }

  // Start timing an operation
  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  // End timing and record metric
  endTimer(operation: string, labels?: Record<string, string>): number {
    const start = this.timers.get(operation);
    if (!start) {
      throw new Error(`Timer not found for operation: ${operation}`);
    }

    const duration = Date.now() - start;
    this.timers.delete(operation);
    
    this.collector.recordTiming(
      `ghostspeak_operation_duration`,
      duration,
      { operation, ...labels }
    );

    return duration;
  }

  // Record performance metric
  recordPerformance(metric: PerformanceMetric): void {
    this.collector.recordMetric(
      metric.name,
      metric.value,
      { 
        component: metric.component,
        operation: metric.operation,
        unit: metric.unit,
        ...metric.labels
      },
      ['performance']
    );

    // Record percentiles if available
    if (metric.percentiles) {
      for (const [percentile, value] of Object.entries(metric.percentiles)) {
        this.collector.recordMetric(
          `${metric.name}_${percentile}`,
          value,
          { 
            component: metric.component,
            operation: metric.operation,
            ...metric.labels
          },
          ['percentile']
        );
      }
    }
  }

  // Get operation statistics
  getOperationStats(operation: string): {
    count: number;
    averageDuration: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    percentiles: Record<string, number>;
  } {
    const values = this.collector.getMetric('ghostspeak_operation_duration')
      .filter(v => v.labels?.operation === operation)
      .map(v => v.value);

    if (values.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        totalDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        percentiles: {},
      };
    }

    const totalDuration = values.reduce((a, b) => a + b, 0);
    const sortedValues = values.sort((a, b) => a - b);

    return {
      count: values.length,
      averageDuration: totalDuration / values.length,
      totalDuration,
      minDuration: Math.min(...values),
      maxDuration: Math.max(...values),
      percentiles: {
        p50: sortedValues[Math.floor(values.length * 0.5)],
        p90: sortedValues[Math.floor(values.length * 0.9)],
        p95: sortedValues[Math.floor(values.length * 0.95)],
        p99: sortedValues[Math.floor(values.length * 0.99)],
      },
    };
  }
}

// Business metrics collector
export class BusinessMetrics {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
  }

  // Record business metric
  recordBusinessMetric(metric: BusinessMetric): void {
    this.collector.recordMetric(
      metric.name,
      metric.value,
      {
        unit: metric.unit,
        period: metric.period,
        ...metric.dimensions,
      },
      ['business']
    );
  }

  // Track agent registration
  trackAgentRegistration(agentType?: string): void {
    this.collector.increment('ghostspeak_agents_registered_total', { 
      type: agentType || 'unknown' 
    });
  }

  // Track transaction volume
  trackTransactionVolume(amount: number, currency: string = 'SOL'): void {
    this.collector.recordMetric(
      'ghostspeak_transaction_volume',
      amount,
      { currency },
      ['business', 'volume']
    );
  }

  // Track service usage
  trackServiceUsage(serviceType: string, usage: number): void {
    this.collector.recordMetric(
      'ghostspeak_service_usage',
      usage,
      { service_type: serviceType },
      ['business', 'usage']
    );
  }

  // Track revenue
  trackRevenue(amount: number, source: string): void {
    this.collector.recordMetric(
      'ghostspeak_revenue',
      amount,
      { source },
      ['business', 'revenue']
    );
  }

  // Track user engagement
  trackUserEngagement(userId: string, action: string): void {
    this.collector.increment('ghostspeak_user_actions_total', {
      user_id: userId,
      action,
    });
  }
}

// Singleton metrics instance
let metricsInstance: MetricsCollector | null = null;

export const getMetricsCollector = (): MetricsCollector => {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
};

export const getPerformanceMetrics = (): PerformanceMetrics => {
  return new PerformanceMetrics(getMetricsCollector());
};

export const getBusinessMetrics = (): BusinessMetrics => {
  return new BusinessMetrics(getMetricsCollector());
};