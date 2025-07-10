/**
 * Real-time Performance Monitoring Dashboard
 * 
 * Provides live performance metrics tracking and visualization
 * for the GhostSpeak protocol.
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import { performance } from 'perf_hooks';
import type { Address } from '@solana/addresses';
import type { Connection } from '@solana/web3.js';

export interface PerformanceMetric {
  timestamp: number;
  name: string;
  value: number;
  unit: string;
  category: 'transaction' | 'network' | 'system' | 'blockchain';
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  process: {
    uptime: number;
    pid: number;
    memoryMB: number;
    cpuPercent: number;
  };
}

export interface NetworkMetrics {
  latency: number;
  requestsPerSecond: number;
  activeConnections: number;
  failedRequests: number;
  averageResponseTime: number;
}

export interface TransactionMetrics {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  averageConfirmationTime: number;
  throughput: number;
}

export interface BlockchainMetrics {
  slot: number;
  blockTime: number;
  tps: number;
  blockHeight: number;
  networkCongestion: number;
}

export class RealTimePerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private startTime: number;
  private sampleInterval: NodeJS.Timer | null = null;
  private connection: Connection | null = null;
  
  // Tracking counters
  private requestCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalResponseTime = 0;
  private activeRequests = 0;
  
  // Moving averages
  private cpuSamples: number[] = [];
  private latencySamples: number[] = [];
  private tpsSamples: number[] = [];

  constructor(
    private config: {
      sampleIntervalMs?: number;
      maxSamples?: number;
      connection?: Connection;
      enableSystemMetrics?: boolean;
      enableNetworkMetrics?: boolean;
      enableBlockchainMetrics?: boolean;
    } = {}
  ) {
    super();
    this.startTime = performance.now();
    this.connection = config.connection || null;
    
    // Set defaults
    this.config.sampleIntervalMs = config.sampleIntervalMs || 1000;
    this.config.maxSamples = config.maxSamples || 300; // 5 minutes at 1s intervals
    this.config.enableSystemMetrics = config.enableSystemMetrics ?? true;
    this.config.enableNetworkMetrics = config.enableNetworkMetrics ?? true;
    this.config.enableBlockchainMetrics = config.enableBlockchainMetrics ?? true;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.sampleInterval) {
      console.warn('Monitor already running');
      return;
    }

    console.log('🔍 Starting real-time performance monitoring...');
    
    this.sampleInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleIntervalMs!);

    // Initial collection
    this.collectMetrics();
    
    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }

    console.log('🛑 Stopped performance monitoring');
    this.emit('stopped', this.generateSummary());
  }

  /**
   * Record a transaction
   */
  recordTransaction(
    name: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ) {
    this.requestCount++;
    this.totalResponseTime += duration;
    
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }

    this.addMetric({
      timestamp: Date.now(),
      name: `transaction.${name}`,
      value: duration,
      unit: 'ms',
      category: 'transaction',
    });

    this.emit('transaction', {
      name,
      duration,
      success,
      metadata,
    });
  }

  /**
   * Record network latency
   */
  recordLatency(latency: number) {
    this.latencySamples.push(latency);
    if (this.latencySamples.length > 100) {
      this.latencySamples.shift();
    }

    this.addMetric({
      timestamp: Date.now(),
      name: 'network.latency',
      value: latency,
      unit: 'ms',
      category: 'network',
    });
  }

  /**
   * Track active request
   */
  startRequest(): () => void {
    this.activeRequests++;
    const startTime = performance.now();

    return () => {
      this.activeRequests--;
      const duration = performance.now() - startTime;
      this.recordTransaction('request', duration, true);
    };
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): {
    system: SystemMetrics;
    network: NetworkMetrics;
    transactions: TransactionMetrics;
    blockchain?: BlockchainMetrics;
  } {
    return {
      system: this.getSystemMetrics(),
      network: this.getNetworkMetrics(),
      transactions: this.getTransactionMetrics(),
      blockchain: this.connection ? this.getBlockchainMetrics() : undefined,
    };
  }

  /**
   * Get metrics history
   */
  getHistory(category?: string, limit?: number): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    
    for (const [key, values] of this.metrics.entries()) {
      if (!category || key.startsWith(category)) {
        metrics.push(...values.slice(-(limit || this.config.maxSamples!)));
      }
    }

    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export metrics data
   */
  exportMetrics(): {
    startTime: number;
    endTime: number;
    duration: number;
    metrics: Record<string, PerformanceMetric[]>;
    summary: any;
  } {
    const endTime = performance.now();
    
    return {
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      metrics: Object.fromEntries(this.metrics),
      summary: this.generateSummary(),
    };
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData() {
    const snapshot = this.getSnapshot();
    const recentTransactions = this.getHistory('transaction', 50);
    const recentLatency = this.getHistory('network.latency', 50);
    
    return {
      timestamp: Date.now(),
      uptime: (performance.now() - this.startTime) / 1000,
      snapshot,
      charts: {
        transactions: this.prepareChartData(recentTransactions),
        latency: this.prepareChartData(recentLatency),
        cpu: this.prepareChartData(this.getHistory('system.cpu', 60)),
        memory: this.prepareChartData(this.getHistory('system.memory', 60)),
      },
      alerts: this.checkAlerts(snapshot),
    };
  }

  // Private methods

  private collectMetrics() {
    if (this.config.enableSystemMetrics) {
      this.collectSystemMetrics();
    }

    if (this.config.enableNetworkMetrics) {
      this.collectNetworkMetrics();
    }

    if (this.config.enableBlockchainMetrics && this.connection) {
      this.collectBlockchainMetrics();
    }

    // Emit update event
    this.emit('update', this.getSnapshot());
  }

  private collectSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    const osFreeMem = os.freemem();
    const osTotalMem = os.totalmem();
    
    // Calculate CPU percentage
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.cpuSamples.push(cpuPercent);
    if (this.cpuSamples.length > 60) {
      this.cpuSamples.shift();
    }

    this.addMetric({
      timestamp: Date.now(),
      name: 'system.cpu',
      value: cpuPercent,
      unit: 'percent',
      category: 'system',
    });

    this.addMetric({
      timestamp: Date.now(),
      name: 'system.memory',
      value: memUsage.heapUsed / (1024 * 1024),
      unit: 'MB',
      category: 'system',
    });

    this.addMetric({
      timestamp: Date.now(),
      name: 'system.memory.os',
      value: ((osTotalMem - osFreeMem) / osTotalMem) * 100,
      unit: 'percent',
      category: 'system',
    });
  }

  private collectNetworkMetrics() {
    const avgLatency = this.latencySamples.length > 0
      ? this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
      : 0;

    this.addMetric({
      timestamp: Date.now(),
      name: 'network.requests',
      value: this.requestCount,
      unit: 'count',
      category: 'network',
    });

    this.addMetric({
      timestamp: Date.now(),
      name: 'network.active',
      value: this.activeRequests,
      unit: 'count',
      category: 'network',
    });

    this.addMetric({
      timestamp: Date.now(),
      name: 'network.avgLatency',
      value: avgLatency,
      unit: 'ms',
      category: 'network',
    });
  }

  private async collectBlockchainMetrics() {
    if (!this.connection) return;

    try {
      const slot = await this.connection.getSlot();
      const blockTime = await this.connection.getBlockTime(slot);
      const perfSamples = await this.connection.getRecentPerformanceSamples(1);
      
      if (perfSamples.length > 0) {
        const tps = perfSamples[0].numTransactions / perfSamples[0].samplePeriodSecs;
        
        this.tpsSamples.push(tps);
        if (this.tpsSamples.length > 60) {
          this.tpsSamples.shift();
        }

        this.addMetric({
          timestamp: Date.now(),
          name: 'blockchain.tps',
          value: tps,
          unit: 'tps',
          category: 'blockchain',
        });
      }

      this.addMetric({
        timestamp: Date.now(),
        name: 'blockchain.slot',
        value: slot,
        unit: 'slot',
        category: 'blockchain',
      });

      if (blockTime) {
        this.addMetric({
          timestamp: Date.now(),
          name: 'blockchain.blockTime',
          value: blockTime,
          unit: 'timestamp',
          category: 'blockchain',
        });
      }
    } catch (error) {
      // Ignore blockchain metric errors
    }
  }

  private addMetric(metric: PerformanceMetric) {
    const key = metric.name;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricArray = this.metrics.get(key)!;
    metricArray.push(metric);

    // Maintain max samples limit
    if (metricArray.length > this.config.maxSamples!) {
      metricArray.shift();
    }
  }

  private getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const osTotalMem = os.totalmem();
    const osFreeMem = os.freemem();
    const osUsedMem = osTotalMem - osFreeMem;

    const avgCpu = this.cpuSamples.length > 0
      ? this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length
      : 0;

    return {
      cpu: {
        usage: avgCpu,
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: osTotalMem / (1024 * 1024 * 1024),
        used: osUsedMem / (1024 * 1024 * 1024),
        free: osFreeMem / (1024 * 1024 * 1024),
        percentage: (osUsedMem / osTotalMem) * 100,
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        memoryMB: memUsage.heapUsed / (1024 * 1024),
        cpuPercent: avgCpu,
      },
    };
  }

  private getNetworkMetrics(): NetworkMetrics {
    const avgLatency = this.latencySamples.length > 0
      ? this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
      : 0;

    const avgResponseTime = this.requestCount > 0
      ? this.totalResponseTime / this.requestCount
      : 0;

    const uptime = (performance.now() - this.startTime) / 1000;
    const rps = uptime > 0 ? this.requestCount / uptime : 0;

    return {
      latency: avgLatency,
      requestsPerSecond: rps,
      activeConnections: this.activeRequests,
      failedRequests: this.failureCount,
      averageResponseTime: avgResponseTime,
    };
  }

  private getTransactionMetrics(): TransactionMetrics {
    const total = this.requestCount;
    const successful = this.successCount;
    const failed = this.failureCount;
    const pending = this.activeRequests;

    const avgConfirmationTime = total > 0
      ? this.totalResponseTime / total
      : 0;

    const uptime = (performance.now() - this.startTime) / 1000;
    const throughput = uptime > 0 ? successful / uptime : 0;

    return {
      total,
      successful,
      failed,
      pending,
      averageConfirmationTime: avgConfirmationTime,
      throughput,
    };
  }

  private getBlockchainMetrics(): BlockchainMetrics {
    const avgTps = this.tpsSamples.length > 0
      ? this.tpsSamples.reduce((a, b) => a + b, 0) / this.tpsSamples.length
      : 0;

    // Get latest metrics
    const slotMetrics = this.metrics.get('blockchain.slot');
    const slot = slotMetrics && slotMetrics.length > 0
      ? slotMetrics[slotMetrics.length - 1].value
      : 0;

    const blockTimeMetrics = this.metrics.get('blockchain.blockTime');
    const blockTime = blockTimeMetrics && blockTimeMetrics.length > 0
      ? blockTimeMetrics[blockTimeMetrics.length - 1].value
      : 0;

    // Estimate congestion based on TPS
    const targetTps = 50000; // Solana's theoretical max
    const congestion = Math.min((avgTps / targetTps) * 100, 100);

    return {
      slot,
      blockTime,
      tps: avgTps,
      blockHeight: slot, // Simplified
      networkCongestion: congestion,
    };
  }

  private prepareChartData(metrics: PerformanceMetric[]) {
    return {
      labels: metrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
      data: metrics.map(m => m.value),
      unit: metrics[0]?.unit || '',
    };
  }

  private checkAlerts(snapshot: any): Array<{
    level: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
  }> {
    const alerts = [];

    // CPU alerts
    if (snapshot.system.cpu.usage > 80) {
      alerts.push({
        level: 'critical' as const,
        message: 'High CPU usage detected',
        metric: 'cpu',
        value: snapshot.system.cpu.usage,
      });
    } else if (snapshot.system.cpu.usage > 60) {
      alerts.push({
        level: 'warning' as const,
        message: 'Elevated CPU usage',
        metric: 'cpu',
        value: snapshot.system.cpu.usage,
      });
    }

    // Memory alerts
    if (snapshot.system.memory.percentage > 90) {
      alerts.push({
        level: 'critical' as const,
        message: 'Critical memory usage',
        metric: 'memory',
        value: snapshot.system.memory.percentage,
      });
    } else if (snapshot.system.memory.percentage > 75) {
      alerts.push({
        level: 'warning' as const,
        message: 'High memory usage',
        metric: 'memory',
        value: snapshot.system.memory.percentage,
      });
    }

    // Network alerts
    if (snapshot.network.latency > 1000) {
      alerts.push({
        level: 'critical' as const,
        message: 'Very high network latency',
        metric: 'latency',
        value: snapshot.network.latency,
      });
    } else if (snapshot.network.latency > 500) {
      alerts.push({
        level: 'warning' as const,
        message: 'High network latency',
        metric: 'latency',
        value: snapshot.network.latency,
      });
    }

    // Transaction failure alerts
    const failureRate = snapshot.transactions.total > 0
      ? (snapshot.transactions.failed / snapshot.transactions.total) * 100
      : 0;

    if (failureRate > 10) {
      alerts.push({
        level: 'critical' as const,
        message: 'High transaction failure rate',
        metric: 'failureRate',
        value: failureRate,
      });
    } else if (failureRate > 5) {
      alerts.push({
        level: 'warning' as const,
        message: 'Elevated transaction failure rate',
        metric: 'failureRate',
        value: failureRate,
      });
    }

    return alerts;
  }

  private generateSummary() {
    const uptime = (performance.now() - this.startTime) / 1000;
    const snapshot = this.getSnapshot();

    return {
      uptime,
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      successRate: this.requestCount > 0 
        ? (this.successCount / this.requestCount) * 100 
        : 100,
      averageResponseTime: this.requestCount > 0
        ? this.totalResponseTime / this.requestCount
        : 0,
      peakCpu: Math.max(...this.cpuSamples),
      averageCpu: this.cpuSamples.length > 0
        ? this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length
        : 0,
      currentMemoryMB: snapshot.system.process.memoryMB,
      averageLatency: snapshot.network.latency,
      throughput: snapshot.transactions.throughput,
    };
  }
}

/**
 * Create a dashboard server for real-time monitoring
 */
export function createPerformanceDashboard(
  monitor: RealTimePerformanceMonitor,
  port: number = 3001
): void {
  // This would typically set up an HTTP server with WebSocket support
  // For now, we'll just log to console
  
  console.log(`📊 Performance dashboard would be available at http://localhost:${port}`);
  
  // Example of how to use the monitor
  monitor.on('update', (snapshot) => {
    // In a real implementation, this would send data to connected clients
    console.log('Performance update:', {
      cpu: `${snapshot.system.cpu.usage.toFixed(1)}%`,
      memory: `${snapshot.system.process.memoryMB.toFixed(1)}MB`,
      latency: `${snapshot.network.latency.toFixed(0)}ms`,
      tps: `${snapshot.transactions.throughput.toFixed(2)} tx/s`,
    });
  });

  monitor.on('transaction', (data) => {
    // Log significant transactions
    if (data.duration > 1000) {
      console.log(`⚠️ Slow transaction: ${data.name} took ${data.duration.toFixed(0)}ms`);
    }
  });
}

// Export singleton instance
let globalMonitor: RealTimePerformanceMonitor | null = null;

export function getGlobalPerformanceMonitor(
  config?: ConstructorParameters<typeof RealTimePerformanceMonitor>[0]
): RealTimePerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new RealTimePerformanceMonitor(config);
  }
  return globalMonitor;
}