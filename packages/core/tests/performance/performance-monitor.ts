/**
 * Real-time Performance Monitoring Dashboard
 * 
 * Provides live monitoring of system performance during load tests
 * with visual indicators and alerts.
 */

import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { EventEmitter } from 'events';
import * as os from 'os';
import { logger } from '../../shared/logger';

interface PerformanceMetric {
  timestamp: number;
  throughput: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
}

interface Alert {
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

class PerformanceMonitor extends EventEmitter {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  private widgets: {
    throughputLine: any;
    errorGauge: any;
    responseTimeLine: any;
    cpuGauge: any;
    memoryGauge: any;
    connectionsLine: any;
    alertsLog: any;
    statsTable: any;
  };
  
  private metrics: PerformanceMetric[] = [];
  private alerts: Alert[] = [];
  private startTime: number = Date.now();
  private updateInterval: NodeJS.Timeout;

  // Performance thresholds
  private readonly THRESHOLDS = {
    MIN_THROUGHPUT: 10, // msg/sec
    MAX_ERROR_RATE: 5, // %
    MAX_RESPONSE_TIME: 2000, // ms
    MAX_CPU: 80, // %
    MAX_MEMORY: 80, // %
    MAX_CONNECTIONS: 200,
  };

  constructor() {
    super();
    this.initializeScreen();
    this.initializeWidgets();
    this.setupEventHandlers();
    this.startMonitoring();
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'GhostSpeak Performance Monitor',
      fullUnicode: true,
    });

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });
  }

  private initializeWidgets(): void {
    // Throughput chart (top left)
    this.widgets.throughputLine = this.grid.set(0, 0, 4, 6, contrib.line, {
      style: {
        line: 'green',
        text: 'white',
        baseline: 'black',
      },
      label: '📊 Message Throughput (msg/sec)',
      showLegend: true,
      xLabelPadding: 3,
      xPadding: 5,
      wholeNumbersOnly: false,
      abbreviate: true,
    });

    // Response time chart (top right)
    this.widgets.responseTimeLine = this.grid.set(0, 6, 4, 6, contrib.line, {
      style: {
        line: 'yellow',
        text: 'white',
        baseline: 'black',
      },
      label: '⏱️ Response Time (ms)',
      showLegend: true,
      xLabelPadding: 3,
      xPadding: 5,
      wholeNumbersOnly: true,
    });

    // Error rate gauge (middle left)
    this.widgets.errorGauge = this.grid.set(4, 0, 2, 3, contrib.gauge, {
      label: '❌ Error Rate %',
      stroke: 'red',
      fill: 'white',
      percent: 0,
    });

    // CPU gauge (middle center)
    this.widgets.cpuGauge = this.grid.set(4, 3, 2, 3, contrib.gauge, {
      label: '💻 CPU Usage %',
      stroke: 'cyan',
      fill: 'white',
      percent: 0,
    });

    // Memory gauge (middle right)
    this.widgets.memoryGauge = this.grid.set(4, 6, 2, 3, contrib.gauge, {
      label: '🧠 Memory Usage %',
      stroke: 'magenta',
      fill: 'white',
      percent: 0,
    });

    // Active connections (middle far right)
    this.widgets.connectionsLine = this.grid.set(4, 9, 2, 3, contrib.line, {
      style: {
        line: 'blue',
        text: 'white',
        baseline: 'black',
      },
      label: '🔗 Active Connections',
      showLegend: false,
      xLabelPadding: 3,
      xPadding: 5,
      wholeNumbersOnly: true,
    });

    // Stats table (bottom left)
    this.widgets.statsTable = this.grid.set(6, 0, 3, 6, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: '📈 Performance Statistics',
      width: '50%',
      height: '30%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 3,
      columnWidth: [20, 15, 15],
    });

    // Alerts log (bottom right)
    this.widgets.alertsLog = this.grid.set(6, 6, 6, 6, contrib.log, {
      fg: 'green',
      selectedFg: 'green',
      label: '🚨 Alerts & Events',
      border: { type: 'line', fg: 'yellow' },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
    });

    // Instructions box (very bottom)
    const instructions = this.grid.set(9, 0, 3, 6, blessed.box, {
      label: '⌨️  Keyboard Shortcuts',
      content: `
  q - Quit
  r - Reset metrics
  s - Save snapshot
  p - Pause/Resume
  ↑↓ - Scroll alerts
  
  Thresholds:
  • Throughput: >${this.THRESHOLDS.MIN_THROUGHPUT} msg/s
  • Errors: <${this.THRESHOLDS.MAX_ERROR_RATE}%
  • Response: <${this.THRESHOLDS.MAX_RESPONSE_TIME}ms
  • CPU/Mem: <${this.THRESHOLDS.MAX_CPU}%`,
      border: { type: 'line', fg: 'white' },
    });

    this.screen.render();
  }

  private setupEventHandlers(): void {
    // Keyboard shortcuts
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    this.screen.key('r', () => {
      this.resetMetrics();
      this.addAlert('info', 'Metrics reset');
    });

    this.screen.key('s', () => {
      this.saveSnapshot();
    });

    this.screen.key('p', () => {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
        this.addAlert('info', 'Monitoring paused');
      } else {
        this.startMonitoring();
        this.addAlert('info', 'Monitoring resumed');
      }
    });

    // Handle resize
    this.screen.on('resize', () => {
      this.screen.render();
    });
  }

  private startMonitoring(): void {
    this.updateInterval = setInterval(() => {
      this.collectMetrics();
      this.updateDisplay();
      this.checkThresholds();
    }, 1000); // Update every second
  }

  private collectMetrics(): void {
    // In a real implementation, these would come from actual system monitoring
    // For now, we'll simulate realistic values
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      throughput: this.simulateThroughput(),
      errorRate: this.simulateErrorRate(),
      avgResponseTime: this.simulateResponseTime(),
      p95ResponseTime: this.simulateResponseTime() * 1.5,
      p99ResponseTime: this.simulateResponseTime() * 2,
      activeConnections: this.simulateConnections(),
      cpuUsage: this.getCpuUsage(),
      memoryUsage: this.getMemoryUsage(),
      networkLatency: Math.random() * 50 + 10,
    };

    this.metrics.push(metric);

    // Keep only last 5 minutes of data
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);

    this.emit('metric', metric);
  }

  private simulateThroughput(): number {
    // Simulate realistic throughput with some variation
    const base = 12 + Math.sin(Date.now() / 10000) * 3;
    const noise = (Math.random() - 0.5) * 2;
    return Math.max(0, base + noise);
  }

  private simulateErrorRate(): number {
    // Simulate occasional error spikes
    const base = 1;
    const spike = Math.random() < 0.1 ? Math.random() * 10 : 0;
    return Math.min(100, Math.max(0, base + spike));
  }

  private simulateResponseTime(): number {
    // Simulate response times with occasional spikes
    const base = 200 + Math.sin(Date.now() / 15000) * 100;
    const spike = Math.random() < 0.05 ? Math.random() * 1000 : 0;
    return base + spike;
  }

  private simulateConnections(): number {
    // Simulate varying connection count
    const base = 50 + Math.sin(Date.now() / 20000) * 30;
    return Math.floor(Math.max(0, base + (Math.random() - 0.5) * 10));
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return Math.min(100, Math.max(0, usage));
  }

  private getMemoryUsage(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return Math.round((1 - freeMem / totalMem) * 100);
  }

  private updateDisplay(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const windowSize = 60; // Show last 60 seconds

    // Update throughput chart
    const throughputData = this.getRecentData('throughput', windowSize);
    this.widgets.throughputLine.setData([
      {
        title: 'Throughput',
        x: throughputData.x,
        y: throughputData.y,
        style: { line: latest.throughput < this.THRESHOLDS.MIN_THROUGHPUT ? 'red' : 'green' },
      },
    ]);

    // Update response time chart
    const responseData = this.getRecentData('avgResponseTime', windowSize);
    const p95Data = this.getRecentData('p95ResponseTime', windowSize);
    const p99Data = this.getRecentData('p99ResponseTime', windowSize);
    
    this.widgets.responseTimeLine.setData([
      {
        title: 'Avg',
        x: responseData.x,
        y: responseData.y,
        style: { line: 'yellow' },
      },
      {
        title: 'P95',
        x: p95Data.x,
        y: p95Data.y,
        style: { line: 'magenta' },
      },
      {
        title: 'P99',
        x: p99Data.x,
        y: p99Data.y,
        style: { line: 'red' },
      },
    ]);

    // Update gauges
    this.widgets.errorGauge.setPercent(Math.round(latest.errorRate));
    this.widgets.cpuGauge.setPercent(Math.round(latest.cpuUsage));
    this.widgets.memoryGauge.setPercent(Math.round(latest.memoryUsage));

    // Update connections chart
    const connectionsData = this.getRecentData('activeConnections', windowSize);
    this.widgets.connectionsLine.setData([
      {
        title: 'Connections',
        x: connectionsData.x,
        y: connectionsData.y,
      },
    ]);

    // Update stats table
    this.updateStatsTable();

    this.screen.render();
  }

  private getRecentData(metric: keyof PerformanceMetric, windowSize: number): { x: string[], y: number[] } {
    const now = Date.now();
    const windowStart = now - windowSize * 1000;
    const recentMetrics = this.metrics.filter(m => m.timestamp > windowStart);

    const x = recentMetrics.map(m => {
      const secondsAgo = Math.floor((now - m.timestamp) / 1000);
      return `-${secondsAgo}s`;
    });

    const y = recentMetrics.map(m => m[metric] as number);

    return { x, y };
  }

  private updateStatsTable(): void {
    const stats = this.calculateStats();
    
    const data = [
      ['Metric', 'Current', 'Average'],
      ['Throughput', `${stats.current.throughput.toFixed(1)} msg/s`, `${stats.avg.throughput.toFixed(1)} msg/s`],
      ['Error Rate', `${stats.current.errorRate.toFixed(1)}%`, `${stats.avg.errorRate.toFixed(1)}%`],
      ['Response Time', `${stats.current.avgResponseTime.toFixed(0)}ms`, `${stats.avg.avgResponseTime.toFixed(0)}ms`],
      ['Connections', `${stats.current.activeConnections}`, `${stats.avg.activeConnections.toFixed(0)}`],
      ['Uptime', this.formatUptime(), ''],
      ['Total Messages', stats.totalMessages.toLocaleString(), ''],
    ];

    this.widgets.statsTable.setData({ 
      headers: data[0],
      data: data.slice(1),
    });
  }

  private calculateStats(): any {
    if (this.metrics.length === 0) {
      return {
        current: {
          throughput: 0,
          errorRate: 0,
          avgResponseTime: 0,
          activeConnections: 0,
        },
        avg: {
          throughput: 0,
          errorRate: 0,
          avgResponseTime: 0,
          activeConnections: 0,
        },
        totalMessages: 0,
      };
    }

    const current = this.metrics[this.metrics.length - 1];
    const sum = this.metrics.reduce((acc, m) => ({
      throughput: acc.throughput + m.throughput,
      errorRate: acc.errorRate + m.errorRate,
      avgResponseTime: acc.avgResponseTime + m.avgResponseTime,
      activeConnections: acc.activeConnections + m.activeConnections,
    }), { throughput: 0, errorRate: 0, avgResponseTime: 0, activeConnections: 0 });

    const count = this.metrics.length;
    const uptime = (Date.now() - this.startTime) / 1000;
    const avgThroughput = sum.throughput / count;
    const totalMessages = Math.floor(avgThroughput * uptime);

    return {
      current,
      avg: {
        throughput: avgThroughput,
        errorRate: sum.errorRate / count,
        avgResponseTime: sum.avgResponseTime / count,
        activeConnections: sum.activeConnections / count,
      },
      totalMessages,
    };
  }

  private formatUptime(): string {
    const uptime = (Date.now() - this.startTime) / 1000;
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private checkThresholds(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];

    // Check throughput
    if (latest.throughput < this.THRESHOLDS.MIN_THROUGHPUT) {
      this.addAlert('warning', `Low throughput: ${latest.throughput.toFixed(1)} msg/s`, 'throughput', latest.throughput, this.THRESHOLDS.MIN_THROUGHPUT);
    }

    // Check error rate
    if (latest.errorRate > this.THRESHOLDS.MAX_ERROR_RATE) {
      this.addAlert('critical', `High error rate: ${latest.errorRate.toFixed(1)}%`, 'errorRate', latest.errorRate, this.THRESHOLDS.MAX_ERROR_RATE);
    }

    // Check response time
    if (latest.avgResponseTime > this.THRESHOLDS.MAX_RESPONSE_TIME) {
      this.addAlert('warning', `High response time: ${latest.avgResponseTime.toFixed(0)}ms`, 'responseTime', latest.avgResponseTime, this.THRESHOLDS.MAX_RESPONSE_TIME);
    }

    // Check CPU
    if (latest.cpuUsage > this.THRESHOLDS.MAX_CPU) {
      this.addAlert('warning', `High CPU usage: ${latest.cpuUsage.toFixed(0)}%`, 'cpu', latest.cpuUsage, this.THRESHOLDS.MAX_CPU);
    }

    // Check memory
    if (latest.memoryUsage > this.THRESHOLDS.MAX_MEMORY) {
      this.addAlert('warning', `High memory usage: ${latest.memoryUsage.toFixed(0)}%`, 'memory', latest.memoryUsage, this.THRESHOLDS.MAX_MEMORY);
    }

    // Check connections
    if (latest.activeConnections > this.THRESHOLDS.MAX_CONNECTIONS) {
      this.addAlert('warning', `High connection count: ${latest.activeConnections}`, 'connections', latest.activeConnections, this.THRESHOLDS.MAX_CONNECTIONS);
    }
  }

  private addAlert(severity: Alert['severity'], message: string, metric?: string, value?: number, threshold?: number): void {
    const alert: Alert = {
      timestamp: Date.now(),
      severity,
      message,
      metric,
      value,
      threshold,
    };

    this.alerts.push(alert);

    // Format alert for display
    const timestamp = new Date(alert.timestamp).toLocaleTimeString();
    const severityIcon = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
    const formattedMessage = `${timestamp} ${severityIcon} ${message}`;

    // Color based on severity
    if (severity === 'critical') {
      this.widgets.alertsLog.log(`{red-fg}${formattedMessage}{/red-fg}`);
    } else if (severity === 'warning') {
      this.widgets.alertsLog.log(`{yellow-fg}${formattedMessage}{/yellow-fg}`);
    } else {
      this.widgets.alertsLog.log(`{green-fg}${formattedMessage}{/green-fg}`);
    }

    this.emit('alert', alert);
  }

  private resetMetrics(): void {
    this.metrics = [];
    this.alerts = [];
    this.startTime = Date.now();
    this.widgets.alertsLog.setContent('');
    this.screen.render();
  }

  private saveSnapshot(): void {
    const snapshot = {
      timestamp: new Date().toISOString(),
      uptime: this.formatUptime(),
      stats: this.calculateStats(),
      recentMetrics: this.metrics.slice(-60), // Last minute
      alerts: this.alerts,
    };

    const filename = `performance-snapshot-${Date.now()}.json`;
    require('fs').writeFileSync(filename, JSON.stringify(snapshot, null, 2));
    this.addAlert('info', `Snapshot saved to ${filename}`);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.screen.destroy();
  }

  // API for external metric injection
  injectMetric(metric: Partial<PerformanceMetric>): void {
    const fullMetric: PerformanceMetric = {
      timestamp: Date.now(),
      throughput: metric.throughput || 0,
      errorRate: metric.errorRate || 0,
      avgResponseTime: metric.avgResponseTime || 0,
      p95ResponseTime: metric.p95ResponseTime || metric.avgResponseTime || 0,
      p99ResponseTime: metric.p99ResponseTime || metric.avgResponseTime || 0,
      activeConnections: metric.activeConnections || 0,
      cpuUsage: metric.cpuUsage || this.getCpuUsage(),
      memoryUsage: metric.memoryUsage || this.getMemoryUsage(),
      networkLatency: metric.networkLatency || 0,
    };

    this.metrics.push(fullMetric);
    this.updateDisplay();
    this.checkThresholds();
  }
}

// Export for use in tests
export default PerformanceMonitor;

// Standalone mode
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  logger.general.info('Performance monitor started. Press "q" to quit.');
  
  // Keep process alive
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });
}