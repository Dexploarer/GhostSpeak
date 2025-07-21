#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import fs from 'fs/promises';
import path from 'path';
import { table } from 'table';
import os from 'os';

interface PerformanceMetric {
  timestamp: string;
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    node: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
  process: {
    uptime: number;
    pid: number;
    ppid: number;
    threads: number;
  };
  network?: {
    connections: number;
    bytesIn: number;
    bytesOut: number;
  };
  disk?: {
    usage: number;
    available: number;
    total: number;
  };
}

interface PerformanceAlert {
  id: string;
  timestamp: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'process';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  resolved?: boolean;
  resolvedAt?: string;
}

interface PerformanceThresholds {
  cpu: {
    warning: number; // percentage
    critical: number; // percentage
  };
  memory: {
    warning: number; // percentage
    critical: number; // percentage
  };
  nodeMemory: {
    warning: number; // MB
    critical: number; // MB
  };
  loadAverage: {
    warning: number;
    critical: number;
  };
  uptime: {
    minimum: number; // seconds
  };
}

class PerformanceMonitor {
  private logger: GhostSpeakLogger;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private maxHistorySize: number = 1440; // 24 hours at 1-minute intervals

  constructor(thresholds?: PerformanceThresholds) {
    this.logger = new GhostSpeakLogger('PERF_MON');
    this.thresholds = thresholds || this.getDefaultThresholds();
  }

  private getDefaultThresholds(): PerformanceThresholds {
    return {
      cpu: {
        warning: 70,
        critical: 90
      },
      memory: {
        warning: 80,
        critical: 95
      },
      nodeMemory: {
        warning: 512, // 512MB
        critical: 1024 // 1GB
      },
      loadAverage: {
        warning: os.cpus().length * 0.7,
        critical: os.cpus().length * 1.5
      },
      uptime: {
        minimum: 3600 // 1 hour
      }
    };
  }

  private async getCPUUsage(): Promise<{ usage: number; loadAverage: number[] }> {
    const startTime = process.hrtime.bigint();
    const startUsage = process.cpuUsage();
    
    // Wait 100ms for measurement
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = process.hrtime.bigint();
    const endUsage = process.cpuUsage(startUsage);
    
    const elapsedTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const totalCPUTime = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
    
    const usage = (totalCPUTime / elapsedTime) * 100;
    const loadAverage = os.loadavg();
    
    return {
      usage: Math.min(100, Math.max(0, usage)), // Clamp between 0-100
      loadAverage
    };
  }

  private getMemoryInfo(): PerformanceMetric['memory'] {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = (usedMem / totalMem) * 100;
    
    const nodeMemory = process.memoryUsage();
    
    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentage,
      node: {
        heapUsed: nodeMemory.heapUsed,
        heapTotal: nodeMemory.heapTotal,
        external: nodeMemory.external,
        rss: nodeMemory.rss
      }
    };
  }

  private getProcessInfo(): PerformanceMetric['process'] {
    return {
      uptime: process.uptime(),
      pid: process.pid,
      ppid: process.ppid || 0,
      threads: 1 // Node.js is single-threaded for JS execution
    };
  }

  private async getDiskInfo(): Promise<PerformanceMetric['disk']> {
    try {
      // This is a simplified implementation
      // In a real application, you might use 'diskusage' or 'fs.statSync'
      const stats = await fs.statfs ? fs.statfs('.') : null;
      
      if (stats) {
        const total = stats.blocks * stats.size;
        const available = stats.bavail * stats.size;
        const used = total - available;
        const usage = (used / total) * 100;
        
        return {
          total,
          available,
          usage
        };
      }
    } catch (error) {
      this.logger.debug('Could not get disk info', error);
    }
    
    return undefined;
  }

  async collectMetrics(): Promise<PerformanceMetric> {
    const cpu = await this.getCPUUsage();
    const memory = this.getMemoryInfo();
    const process = this.getProcessInfo();
    const disk = await this.getDiskInfo();
    
    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      cpu,
      memory,
      process,
      disk
    };

    // Add to history
    this.metrics.push(metric);
    
    // Maintain history size
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    // Check for alerts
    await this.checkAlerts(metric);

    return metric;
  }

  private async checkAlerts(metric: PerformanceMetric): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // CPU alerts
    if (metric.cpu.usage >= this.thresholds.cpu.critical) {
      alerts.push(this.createAlert(
        'cpu',
        'critical',
        `Critical CPU usage: ${metric.cpu.usage.toFixed(1)}%`,
        metric.cpu.usage,
        this.thresholds.cpu.critical
      ));
    } else if (metric.cpu.usage >= this.thresholds.cpu.warning) {
      alerts.push(this.createAlert(
        'cpu',
        'high',
        `High CPU usage: ${metric.cpu.usage.toFixed(1)}%`,
        metric.cpu.usage,
        this.thresholds.cpu.warning
      ));
    }

    // Load average alerts
    const loadAvg1m = metric.cpu.loadAverage[0];
    if (loadAvg1m >= this.thresholds.loadAverage.critical) {
      alerts.push(this.createAlert(
        'cpu',
        'critical',
        `Critical load average: ${loadAvg1m.toFixed(2)}`,
        loadAvg1m,
        this.thresholds.loadAverage.critical
      ));
    } else if (loadAvg1m >= this.thresholds.loadAverage.warning) {
      alerts.push(this.createAlert(
        'cpu',
        'high',
        `High load average: ${loadAvg1m.toFixed(2)}`,
        loadAvg1m,
        this.thresholds.loadAverage.warning
      ));
    }

    // Memory alerts
    if (metric.memory.percentage >= this.thresholds.memory.critical) {
      alerts.push(this.createAlert(
        'memory',
        'critical',
        `Critical system memory usage: ${metric.memory.percentage.toFixed(1)}%`,
        metric.memory.percentage,
        this.thresholds.memory.critical
      ));
    } else if (metric.memory.percentage >= this.thresholds.memory.warning) {
      alerts.push(this.createAlert(
        'memory',
        'high',
        `High system memory usage: ${metric.memory.percentage.toFixed(1)}%`,
        metric.memory.percentage,
        this.thresholds.memory.warning
      ));
    }

    // Node.js memory alerts
    const nodeMemoryMB = metric.memory.node.heapUsed / 1024 / 1024;
    if (nodeMemoryMB >= this.thresholds.nodeMemory.critical) {
      alerts.push(this.createAlert(
        'memory',
        'critical',
        `Critical Node.js heap usage: ${nodeMemoryMB.toFixed(1)}MB`,
        nodeMemoryMB,
        this.thresholds.nodeMemory.critical
      ));
    } else if (nodeMemoryMB >= this.thresholds.nodeMemory.warning) {
      alerts.push(this.createAlert(
        'memory',
        'high',
        `High Node.js heap usage: ${nodeMemoryMB.toFixed(1)}MB`,
        nodeMemoryMB,
        this.thresholds.nodeMemory.warning
      ));
    }

    // Disk alerts
    if (metric.disk && metric.disk.usage >= 95) {
      alerts.push(this.createAlert(
        'disk',
        'critical',
        `Critical disk usage: ${metric.disk.usage.toFixed(1)}%`,
        metric.disk.usage,
        95
      ));
    } else if (metric.disk && metric.disk.usage >= 85) {
      alerts.push(this.createAlert(
        'disk',
        'high',
        `High disk usage: ${metric.disk.usage.toFixed(1)}%`,
        metric.disk.usage,
        85
      ));
    }

    // Process uptime check (only warn if too low)
    if (metric.process.uptime < this.thresholds.uptime.minimum) {
      alerts.push(this.createAlert(
        'process',
        'medium',
        `Process recently started: ${Math.round(metric.process.uptime)}s uptime`,
        metric.process.uptime,
        this.thresholds.uptime.minimum
      ));
    }

    // Add new alerts
    for (const alert of alerts) {
      // Check if similar alert already exists and is unresolved
      const existingAlert = this.alerts.find(a => 
        a.type === alert.type && 
        a.severity === alert.severity && 
        !a.resolved
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        this.logger.warn(`Performance alert: ${alert.message}`, {
          type: alert.type,
          severity: alert.severity,
          value: alert.value,
          threshold: alert.threshold
        });
      }
    }

    // Auto-resolve alerts that are no longer triggered
    this.autoResolveAlerts(metric);
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): PerformanceAlert {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      value,
      threshold,
      resolved: false
    };
  }

  private autoResolveAlerts(metric: PerformanceMetric): void {
    for (const alert of this.alerts) {
      if (alert.resolved) continue;

      let shouldResolve = false;

      switch (alert.type) {
        case 'cpu':
          if (alert.message.includes('CPU usage') && metric.cpu.usage < alert.threshold * 0.8) {
            shouldResolve = true;
          } else if (alert.message.includes('load average') && metric.cpu.loadAverage[0] < alert.threshold * 0.8) {
            shouldResolve = true;
          }
          break;
        
        case 'memory':
          if (alert.message.includes('system memory') && metric.memory.percentage < alert.threshold * 0.8) {
            shouldResolve = true;
          } else if (alert.message.includes('Node.js heap')) {
            const nodeMemoryMB = metric.memory.node.heapUsed / 1024 / 1024;
            if (nodeMemoryMB < alert.threshold * 0.8) {
              shouldResolve = true;
            }
          }
          break;

        case 'disk':
          if (metric.disk && metric.disk.usage < alert.threshold * 0.9) {
            shouldResolve = true;
          }
          break;
      }

      if (shouldResolve) {
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
        
        this.logger.info(`Performance alert resolved: ${alert.message}`, {
          alertId: alert.id,
          resolvedAt: alert.resolvedAt
        });
      }
    }
  }

  startMonitoring(intervalSeconds: number = 60): void {
    if (this.isMonitoring) {
      this.logger.warn('Performance monitoring is already running');
      return;
    }

    this.logger.info('Starting performance monitoring', { 
      interval: `${intervalSeconds}s`,
      thresholds: this.thresholds
    });

    this.isMonitoring = true;
    
    // Initial collection
    this.collectMetrics().catch(error => {
      this.logger.error('Initial metrics collection failed', error);
    });

    // Set up regular collection
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.logger.error('Metrics collection failed', error);
      }
    }, intervalSeconds * 1000);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Performance monitoring is not running');
      return;
    }

    this.logger.info('Stopping performance monitoring');
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  getMetrics(count?: number): PerformanceMetric[] {
    if (count) {
      return this.metrics.slice(-count);
    }
    return [...this.metrics];
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  displayCurrentStatus(): void {
    if (this.metrics.length === 0) {
      console.log(chalk.yellow('No performance metrics available yet'));
      return;
    }

    const latest = this.metrics[this.metrics.length - 1];
    const activeAlerts = this.getActiveAlerts();

    console.log(chalk.bold.blue('\n📊 Current Performance Status'));
    console.log('━'.repeat(60));

    // System overview
    const systemData = [
      ['Metric', 'Value', 'Status'],
      [
        'CPU Usage', 
        `${latest.cpu.usage.toFixed(1)}%`, 
        latest.cpu.usage >= this.thresholds.cpu.critical ? chalk.red('CRITICAL') :
        latest.cpu.usage >= this.thresholds.cpu.warning ? chalk.yellow('HIGH') :
        chalk.green('OK')
      ],
      [
        'Load Average (1m)',
        latest.cpu.loadAverage[0].toFixed(2),
        latest.cpu.loadAverage[0] >= this.thresholds.loadAverage.critical ? chalk.red('CRITICAL') :
        latest.cpu.loadAverage[0] >= this.thresholds.loadAverage.warning ? chalk.yellow('HIGH') :
        chalk.green('OK')
      ],
      [
        'Memory Usage',
        `${latest.memory.percentage.toFixed(1)}%`,
        latest.memory.percentage >= this.thresholds.memory.critical ? chalk.red('CRITICAL') :
        latest.memory.percentage >= this.thresholds.memory.warning ? chalk.yellow('HIGH') :
        chalk.green('OK')
      ],
      [
        'Node.js Heap',
        `${(latest.memory.node.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        (latest.memory.node.heapUsed / 1024 / 1024) >= this.thresholds.nodeMemory.critical ? chalk.red('CRITICAL') :
        (latest.memory.node.heapUsed / 1024 / 1024) >= this.thresholds.nodeMemory.warning ? chalk.yellow('HIGH') :
        chalk.green('OK')
      ],
      [
        'Process Uptime',
        `${Math.round(latest.process.uptime)}s`,
        chalk.blue('INFO')
      ]
    ];

    if (latest.disk) {
      systemData.push([
        'Disk Usage',
        `${latest.disk.usage.toFixed(1)}%`,
        latest.disk.usage >= 95 ? chalk.red('CRITICAL') :
        latest.disk.usage >= 85 ? chalk.yellow('HIGH') :
        chalk.green('OK')
      ]);
    }

    console.log(table(systemData));

    // Active alerts
    if (activeAlerts.length > 0) {
      console.log(chalk.bold.red('\n🚨 Active Alerts:'));
      
      for (const alert of activeAlerts) {
        const severityColor = {
          low: chalk.blue,
          medium: chalk.yellow,
          high: chalk.red,
          critical: chalk.red.bold
        }[alert.severity];

        console.log(`  ${severityColor(alert.severity.toUpperCase())} - ${alert.message}`);
        console.log(`    Threshold: ${alert.threshold}, Current: ${alert.value.toFixed(2)}`);
        console.log(`    Since: ${new Date(alert.timestamp).toLocaleString()}`);
      }
    } else {
      console.log(chalk.green('\n✅ No active performance alerts'));
    }

    console.log(chalk.gray(`\nLast updated: ${new Date(latest.timestamp).toLocaleString()}`));
    console.log(chalk.gray(`Monitoring: ${this.isMonitoring ? 'Active' : 'Stopped'}`));
  }

  async saveMetrics(outputPath: string): Promise<void> {
    const reportsDir = path.dirname(outputPath);
    await fs.mkdir(reportsDir, { recursive: true });

    const report = {
      timestamp: new Date().toISOString(),
      thresholds: this.thresholds,
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        totalMetrics: this.metrics.length,
        activeAlerts: this.getActiveAlerts().length,
        totalAlerts: this.alerts.length,
        monitoringActive: this.isMonitoring
      }
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

    // Also save CSV for analysis
    const csvPath = outputPath.replace('.json', '.csv');
    const csvData = ['timestamp,cpu_usage,memory_percentage,node_heap_mb,load_avg_1m,uptime,active_alerts'];
    
    for (const metric of this.metrics) {
      const row = [
        metric.timestamp,
        metric.cpu.usage.toFixed(2),
        metric.memory.percentage.toFixed(2),
        (metric.memory.node.heapUsed / 1024 / 1024).toFixed(2),
        metric.cpu.loadAverage[0].toFixed(2),
        Math.round(metric.process.uptime).toString(),
        this.getActiveAlerts().length.toString()
      ];
      csvData.push(row.join(','));
    }

    await fs.writeFile(csvPath, csvData.join('\n'));

    this.logger.info('Performance metrics saved', {
      jsonReport: outputPath,
      csvReport: csvPath,
      metricsCount: this.metrics.length
    });
  }
}

async function main(): Promise<void> {
  program
    .name('performance-monitor')
    .description('GhostSpeak real-time performance monitoring system')
    .option('-i, --interval <seconds>', 'Monitoring interval in seconds', '60')
    .option('-d, --duration <minutes>', 'Monitoring duration in minutes (0 = infinite)', '0')
    .option('-o, --output <file>', 'Output file for metrics', './performance-reports/performance-metrics.json')
    .option('--status', 'Show current performance status and exit')
    .option('--alerts', 'Show active alerts and exit')
    .parse();

  const options = program.opts();
  const monitor = new PerformanceMonitor();

  if (options.status) {
    // Collect current metrics and display
    await monitor.collectMetrics();
    monitor.displayCurrentStatus();
    return;
  }

  if (options.alerts) {
    const alerts = monitor.getActiveAlerts();
    if (alerts.length === 0) {
      console.log(chalk.green('✅ No active performance alerts'));
    } else {
      console.log(chalk.red(`🚨 ${alerts.length} active performance alerts:`));
      alerts.forEach(alert => {
        console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
      });
    }
    return;
  }

  const interval = parseInt(options.interval);
  const duration = parseInt(options.duration);

  console.log(chalk.blue('🔄 Starting GhostSpeak Performance Monitor'));
  console.log(`Interval: ${interval}s`);
  console.log(`Duration: ${duration === 0 ? 'Infinite' : `${duration}m`}`);
  console.log('Press Ctrl+C to stop monitoring\n');

  // Handle graceful shutdown
  let shutdownRequested = false;
  process.on('SIGINT', async () => {
    if (shutdownRequested) {
      console.log(chalk.red('\nForce shutdown...'));
      process.exit(1);
    }
    
    shutdownRequested = true;
    console.log(chalk.yellow('\n🛑 Shutting down performance monitor...'));
    
    monitor.stopMonitoring();
    
    if (options.output) {
      await monitor.saveMetrics(options.output);
    }
    
    monitor.displayCurrentStatus();
    process.exit(0);
  });

  // Start monitoring
  monitor.startMonitoring(interval);

  // Auto-stop after duration
  if (duration > 0) {
    setTimeout(async () => {
      console.log(chalk.blue(`\n⏰ Monitoring duration (${duration}m) completed`));
      monitor.stopMonitoring();
      
      if (options.output) {
        await monitor.saveMetrics(options.output);
      }
      
      monitor.displayCurrentStatus();
      process.exit(0);
    }, duration * 60 * 1000);
  }

  // Display status every 10 intervals
  let statusCounter = 0;
  setInterval(() => {
    statusCounter++;
    if (statusCounter >= 10) {
      console.clear();
      monitor.displayCurrentStatus();
      statusCounter = 0;
    }
  }, interval * 1000);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Performance monitor error:'), error);
    process.exit(1);
  });
}

export { PerformanceMonitor, PerformanceMetric, PerformanceAlert, PerformanceThresholds };