#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { table } from 'table';
import { HealthChecker, HealthStatus } from './health-check.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface SystemMetrics {
  timestamp: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  activeConnections: number;
  errorCount: number;
  warningCount: number;
}

interface TransactionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageResponseTime: number;
  tps: number; // Transactions per second
}

class MonitoringDashboard {
  private healthChecker: HealthChecker;
  private startTime: number;
  private metrics: SystemMetrics[] = [];
  private maxMetricsHistory = 100;

  constructor() {
    this.healthChecker = new HealthChecker();
    this.startTime = Date.now();
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    console.log(colors[level](`[${new Date().toISOString()}] ${message}`));
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // Simulate connection and error counts (in production, these would come from real monitoring)
    const activeConnections = Math.floor(Math.random() * 50) + 10;
    const errorCount = Math.floor(Math.random() * 5);
    const warningCount = Math.floor(Math.random() * 10);

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      memoryUsage,
      cpuUsage,
      uptime,
      activeConnections,
      errorCount,
      warningCount
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    return metrics;
  }

  private async getTransactionMetrics(): Promise<TransactionMetrics> {
    // In a real implementation, this would query the blockchain or local metrics
    return {
      totalTransactions: Math.floor(Math.random() * 1000) + 500,
      successfulTransactions: Math.floor(Math.random() * 950) + 450,
      failedTransactions: Math.floor(Math.random() * 50),
      averageResponseTime: Math.floor(Math.random() * 2000) + 100,
      tps: Math.floor(Math.random() * 10) + 2
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private getUptime(): string {
    const totalSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  private renderHeader(): void {
    console.log(chalk.cyan(figlet.textSync('GhostSpeak', { horizontalLayout: 'fitted' })));
    console.log(chalk.gray('━'.repeat(80)));
    console.log(chalk.bold.white('🚀 GhostSpeak Protocol Monitoring Dashboard'));
    console.log(chalk.gray(`Dashboard uptime: ${this.getUptime()}`));
    console.log(chalk.gray('━'.repeat(80)));
  }

  private renderSystemStatus(metrics: SystemMetrics): void {
    console.log(chalk.bold.yellow('\n📊 System Status'));
    
    const data = [
      ['Metric', 'Value', 'Status'],
      ['Memory (Heap)', this.formatBytes(metrics.memoryUsage.heapUsed), 
       metrics.memoryUsage.heapUsed > 100 * 1024 * 1024 ? chalk.yellow('HIGH') : chalk.green('OK')],
      ['Memory (RSS)', this.formatBytes(metrics.memoryUsage.rss), 
       metrics.memoryUsage.rss > 200 * 1024 * 1024 ? chalk.yellow('HIGH') : chalk.green('OK')],
      ['Process Uptime', `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`, chalk.green('OK')],
      ['Active Connections', metrics.activeConnections.toString(), 
       metrics.activeConnections > 40 ? chalk.yellow('HIGH') : chalk.green('OK')],
      ['Errors (last check)', metrics.errorCount.toString(), 
       metrics.errorCount > 0 ? chalk.red('ERRORS') : chalk.green('CLEAN')],
      ['Warnings (last check)', metrics.warningCount.toString(), 
       metrics.warningCount > 5 ? chalk.yellow('HIGH') : chalk.green('OK')]
    ];

    console.log(table(data));
  }

  private renderTransactionMetrics(txMetrics: TransactionMetrics): void {
    console.log(chalk.bold.blue('\n⚡ Transaction Metrics'));
    
    const successRate = Math.round((txMetrics.successfulTransactions / txMetrics.totalTransactions) * 100);
    
    const data = [
      ['Metric', 'Value', 'Status'],
      ['Total Transactions', txMetrics.totalTransactions.toLocaleString(), chalk.blue('INFO')],
      ['Successful', txMetrics.successfulTransactions.toLocaleString(), chalk.green('✓')],
      ['Failed', txMetrics.failedTransactions.toLocaleString(), 
       txMetrics.failedTransactions > 10 ? chalk.red('HIGH') : chalk.green('LOW')],
      ['Success Rate', `${successRate}%`, 
       successRate > 95 ? chalk.green('EXCELLENT') : successRate > 90 ? chalk.yellow('GOOD') : chalk.red('POOR')],
      ['Avg Response Time', `${txMetrics.averageResponseTime}ms`, 
       txMetrics.averageResponseTime > 1000 ? chalk.red('SLOW') : chalk.green('FAST')],
      ['TPS', txMetrics.tps.toString(), 
       txMetrics.tps > 5 ? chalk.green('HIGH') : chalk.yellow('NORMAL')]
    ];

    console.log(table(data));
  }

  private renderHealthStatus(healthResults: HealthStatus[]): void {
    console.log(chalk.bold.green('\n🏥 Service Health'));
    
    const data = [['Service', 'Status', 'Response Time', 'Details']];

    for (const result of healthResults) {
      const statusColor = result.status === 'healthy' 
        ? chalk.green('✓')
        : result.status === 'degraded' 
        ? chalk.yellow('⚠')
        : chalk.red('✗');

      const responseTime = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      const details = result.details ? (result.details.length > 50 ? result.details.substring(0, 47) + '...' : result.details) : '';

      data.push([
        result.service,
        statusColor,
        responseTime,
        details
      ]);
    }

    console.log(table(data));
  }

  private renderPerformanceChart(): void {
    if (this.metrics.length < 2) return;

    console.log(chalk.bold.magenta('\n📈 Memory Usage Trend (Last 20 readings)'));
    
    const recentMetrics = this.metrics.slice(-20);
    const maxHeap = Math.max(...recentMetrics.map(m => m.memoryUsage.heapUsed));
    const barWidth = 60;

    for (let i = 0; i < recentMetrics.length; i++) {
      const metric = recentMetrics[i];
      const percentage = (metric.memoryUsage.heapUsed / maxHeap);
      const barLength = Math.floor(percentage * barWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
      
      const time = new Date(metric.timestamp).toLocaleTimeString();
      const memoryMB = Math.round(metric.memoryUsage.heapUsed / 1024 / 1024);
      
      console.log(`${time} |${chalk.blue(bar)}| ${memoryMB}MB`);
    }
  }

  private async saveMetricsToFile(): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      const logFile = path.join(logsDir, `metrics-${new Date().toISOString().split('T')[0]}.json`);
      const currentMetrics = this.metrics[this.metrics.length - 1];
      
      let existingData = [];
      try {
        const existingContent = await fs.readFile(logFile, 'utf-8');
        existingData = JSON.parse(existingContent);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
      
      existingData.push(currentMetrics);
      await fs.writeFile(logFile, JSON.stringify(existingData, null, 2));
    } catch (error) {
      this.log(`Failed to save metrics: ${error}`, 'error');
    }
  }

  async displayDashboard(): Promise<void> {
    console.clear();
    this.renderHeader();
    
    try {
      // Collect all data in parallel
      const [systemMetrics, txMetrics, healthResults] = await Promise.all([
        this.collectSystemMetrics(),
        this.getTransactionMetrics(),
        this.healthChecker.runHealthChecks()
      ]);

      this.renderSystemStatus(systemMetrics);
      this.renderTransactionMetrics(txMetrics);
      this.renderHealthStatus(healthResults);
      this.renderPerformanceChart();

      await this.saveMetricsToFile();

      console.log(chalk.gray('\n━'.repeat(80)));
      console.log(chalk.gray(`Last updated: ${new Date().toLocaleString()}`));
      console.log(chalk.gray('Press Ctrl+C to exit | Refreshing every 10 seconds'));

    } catch (error) {
      this.log(`Dashboard error: ${error}`, 'error');
    }
  }

  async startContinuousMonitoring(interval: number = 10000): Promise<void> {
    this.log('🖥️  Starting GhostSpeak Monitoring Dashboard...', 'info');

    while (true) {
      await this.displayDashboard();
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

async function main(): Promise<void> {
  program
    .name('monitoring-dashboard')
    .description('GhostSpeak comprehensive monitoring dashboard')
    .option('-i, --interval <seconds>', 'Update interval in seconds', '10')
    .option('-o, --once', 'Run once and exit (no continuous monitoring)')
    .parse();

  const options = program.opts();
  const dashboard = new MonitoringDashboard();

  if (options.once) {
    await dashboard.displayDashboard();
  } else {
    const interval = parseInt(options.interval) * 1000;
    await dashboard.startContinuousMonitoring(interval);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Dashboard failed:'), error);
    process.exit(1);
  });
}

export { MonitoringDashboard };