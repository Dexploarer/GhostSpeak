/**
 * Performance Monitor - CLI Performance Tracking and Optimization
 *
 * Monitors command execution times, memory usage, and provides performance insights.
 */

import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface PerformanceMetric {
  command: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  success: boolean;
  errorType?: string;
}

interface PerformanceStats {
  totalCommands: number;
  avgExecutionTime: number;
  slowestCommand: PerformanceMetric | null;
  fastestCommand: PerformanceMetric | null;
  recentMetrics: PerformanceMetric[];
  memoryTrends: Array<{ timestamp: number; heapUsed: number }>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private currentCommand: string | null = null;
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage | null = null;
  private metricsFile: string;

  private constructor() {
    this.metricsFile = join(homedir(), '.ghostspeak', 'performance.json');
    this.loadMetrics();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring a command
   */
  public startCommand(command: string): void {
    this.currentCommand = command;
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }

  /**
   * End monitoring a command
   */
  public endCommand(success: boolean = true, errorType?: string): void {
    if (!this.currentCommand || !this.startMemory) return;

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const metric: PerformanceMetric = {
      command: this.currentCommand,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      memoryUsage: endMemory,
      timestamp: Date.now(),
      success,
      errorType
    };

    this.metrics.push(metric);
    this.saveMetrics();

    // Clean up old metrics (keep last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
      this.saveMetrics();
    }

    this.currentCommand = null;
    this.startTime = 0;
    this.startMemory = null;
  }

  /**
   * Get performance statistics
   */
  public getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalCommands: 0,
        avgExecutionTime: 0,
        slowestCommand: null,
        fastestCommand: null,
        recentMetrics: [],
        memoryTrends: []
      };
    }

    const successfulMetrics = this.metrics.filter(m => m.success);
    const totalDuration = successfulMetrics.reduce((sum, m) => sum + m.duration, 0);
    const avgExecutionTime = totalDuration / successfulMetrics.length;

    const slowestCommand = successfulMetrics.reduce((prev, current) => 
      (prev.duration > current.duration) ? prev : current
    );

    const fastestCommand = successfulMetrics.reduce((prev, current) => 
      (prev.duration < current.duration) ? prev : current
    );

    const recentMetrics = this.metrics.slice(-10);
    
    const memoryTrends = this.metrics.slice(-20).map(m => ({
      timestamp: m.timestamp,
      heapUsed: m.memoryUsage.heapUsed
    }));

    return {
      totalCommands: this.metrics.length,
      avgExecutionTime,
      slowestCommand,
      fastestCommand,
      recentMetrics,
      memoryTrends
    };
  }

  /**
   * Display performance report
   */
  public displayReport(): void {
    const stats = this.getStats();
    
    console.log(chalk.cyan('⚡ CLI Performance Report'));
    console.log(chalk.gray('═'.repeat(40)));
    console.log('');

    if (stats.totalCommands === 0) {
      console.log(chalk.yellow('No performance data available yet.'));
      console.log(chalk.gray('Run some commands to see performance metrics.'));
      return;
    }

    // Overall statistics
    console.log(chalk.yellow('📊 Overall Statistics:'));
    console.log(`  Total Commands: ${chalk.cyan(stats.totalCommands)}`);
    console.log(`  Average Execution Time: ${chalk.blue(stats.avgExecutionTime.toFixed(2))}ms`);
    console.log('');

    // Performance extremes
    if (stats.slowestCommand) {
      console.log(chalk.yellow('🐌 Slowest Command:'));
      console.log(`  Command: ${chalk.red(stats.slowestCommand.command)}`);
      console.log(`  Duration: ${chalk.red(stats.slowestCommand.duration.toFixed(2))}ms`);
      console.log(`  Memory: ${chalk.gray((stats.slowestCommand.memoryUsage.heapUsed / 1024 / 1024).toFixed(1))}MB`);
      console.log('');
    }

    if (stats.fastestCommand) {
      console.log(chalk.yellow('🚀 Fastest Command:'));
      console.log(`  Command: ${chalk.green(stats.fastestCommand.command)}`);
      console.log(`  Duration: ${chalk.green(stats.fastestCommand.duration.toFixed(2))}ms`);
      console.log(`  Memory: ${chalk.gray((stats.fastestCommand.memoryUsage.heapUsed / 1024 / 1024).toFixed(1))}MB`);
      console.log('');
    }

    // Recent activity
    console.log(chalk.yellow('🕒 Recent Commands:'));
    stats.recentMetrics.forEach((metric, index) => {
      const statusIcon = metric.success ? chalk.green('✓') : chalk.red('✗');
      const duration = metric.duration.toFixed(2);
      const memory = (metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
      
      console.log(`  ${statusIcon} ${metric.command} - ${duration}ms (${memory}MB)`);
    });
    console.log('');

    // Performance recommendations
    this.displayRecommendations(stats);
  }

  /**
   * Display performance recommendations
   */
  private displayRecommendations(stats: PerformanceStats): void {
    console.log(chalk.yellow('💡 Performance Recommendations:'));
    
    if (stats.avgExecutionTime > 2000) {
      console.log(chalk.red('  ⚠️  Average command execution time is high (>2s)'));
      console.log(chalk.gray('    • Check network connectivity'));
      console.log(chalk.gray('    • Consider using --quiet flag for faster execution'));
      console.log(chalk.gray('    • Try switching to a faster RPC endpoint'));
    } else if (stats.avgExecutionTime > 1000) {
      console.log(chalk.yellow('  ⚠️  Average command execution time could be improved (>1s)'));
      console.log(chalk.gray('    • Monitor network conditions'));
      console.log(chalk.gray('    • Consider batch operations when possible'));
    } else {
      console.log(chalk.green('  ✅ Command execution times are optimal'));
    }

    // Memory usage analysis
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    if (currentMemory > 100) {
      console.log(chalk.red('  ⚠️  High memory usage detected (>100MB)'));
      console.log(chalk.gray('    • Restart CLI if memory usage seems excessive'));
      console.log(chalk.gray('    • Consider processing large datasets in smaller chunks'));
    } else if (currentMemory > 50) {
      console.log(chalk.yellow('  ⚠️  Moderate memory usage (>50MB)'));
      console.log(chalk.gray('    • Monitor memory usage during long operations'));
    } else {
      console.log(chalk.green('  ✅ Memory usage is optimal'));
    }

    // Command-specific recommendations
    const commandStats = this.getCommandStats();
    const slowCommands = Object.entries(commandStats)
      .filter(([_, stats]) => stats.avgDuration > 1500)
      .sort(([_, a], [__, b]) => b.avgDuration - a.avgDuration);

    if (slowCommands.length > 0) {
      console.log('');
      console.log(chalk.yellow('  🎯 Slow Commands to Optimize:'));
      slowCommands.slice(0, 3).forEach(([command, stats]) => {
        console.log(`    • ${command}: ${stats.avgDuration.toFixed(2)}ms average`);
      });
    }
  }

  /**
   * Get statistics grouped by command
   */
  private getCommandStats(): Record<string, { count: number; avgDuration: number; successRate: number }> {
    const commandStats: Record<string, { durations: number[]; successes: number; total: number }> = {};

    this.metrics.forEach(metric => {
      if (!commandStats[metric.command]) {
        commandStats[metric.command] = { durations: [], successes: 0, total: 0 };
      }

      commandStats[metric.command].total++;
      if (metric.success) {
        commandStats[metric.command].successes++;
        commandStats[metric.command].durations.push(metric.duration);
      }
    });

    const result: Record<string, { count: number; avgDuration: number; successRate: number }> = {};

    Object.entries(commandStats).forEach(([command, stats]) => {
      const avgDuration = stats.durations.length > 0 
        ? stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length 
        : 0;
      
      result[command] = {
        count: stats.total,
        avgDuration,
        successRate: (stats.successes / stats.total) * 100
      };
    });

    return result;
  }

  /**
   * Clear all performance data
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.saveMetrics();
  }

  /**
   * Load metrics from disk
   */
  private loadMetrics(): void {
    try {
      if (existsSync(this.metricsFile)) {
        const data = readFileSync(this.metricsFile, 'utf8');
        this.metrics = JSON.parse(data);
      }
    } catch (error) {
      // If we can't load metrics, start fresh
      this.metrics = [];
    }
  }

  /**
   * Save metrics to disk
   */
  private saveMetrics(): void {
    try {
      const dir = join(homedir(), '.ghostspeak');
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
      
      writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      // Silently fail if we can't save metrics
    }
  }

  /**
   * Export metrics for analysis
   */
  public exportMetrics(filePath: string): void {
    const stats = this.getStats();
    const commandStats = this.getCommandStats();
    
    const exportData = {
      summary: stats,
      commandBreakdown: commandStats,
      rawMetrics: this.metrics,
      exportedAt: new Date().toISOString()
    };

    writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  }
}