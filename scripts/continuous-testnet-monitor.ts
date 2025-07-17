#!/usr/bin/env tsx

/**
 * Continuous Testnet Monitoring System for GhostSpeak Protocol
 * 
 * This system provides:
 * - 24/7 testnet health monitoring
 * - Automated testing at regular intervals
 * - Performance trend analysis
 * - Alert system for failures
 * - Historical data collection
 * - Real-time status dashboard
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface MonitorConfig {
  network: 'testnet' | 'devnet';
  programId: string;
  rpcUrl: string;
  checkInterval: number; // milliseconds
  alertThresholds: {
    latency: number; // milliseconds
    errorRate: number; // percentage
    throughput: number; // ops/sec
  };
  retentionPeriod: number; // days
}

interface HealthCheck {
  timestamp: number;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  throughput?: number;
  error?: string;
  operations: {
    programAccess: boolean;
    agentRegistration: boolean;
    marketplaceListing: boolean;
    escrowCreation: boolean;
  };
}

interface Alert {
  timestamp: number;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

interface MonitoringReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    uptime: number; // percentage
    averageLatency: number;
    averageErrorRate: number;
    totalChecks: number;
    failedChecks: number;
  };
  trends: {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
    uptimeTrend: 'improving' | 'stable' | 'degrading';
  };
  alerts: Alert[];
  recommendations: string[];
}

class TestnetMonitor {
  private config: MonitorConfig;
  private isRunning: boolean = false;
  private healthHistory: HealthCheck[] = [];
  private alerts: Alert[] = [];
  private startTime: number = 0;

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  async startMonitoring(): Promise<void> {
    console.log(chalk.blue.bold('\n🎯 GhostSpeak Testnet Monitor Starting...\n'));
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Setup monitoring directories
    await this.setupMonitoringEnvironment();
    
    // Load existing data
    await this.loadHistoricalData();
    
    // Start monitoring loop
    this.monitoringLoop();
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
    
    console.log(chalk.green('✅ Monitoring started successfully'));
    console.log(chalk.blue(`📊 Check interval: ${this.config.checkInterval / 1000}s`));
    console.log(chalk.blue(`🎯 Network: ${this.config.network}`));
    console.log(chalk.blue(`🔗 RPC: ${this.config.rpcUrl}`));
    console.log(chalk.yellow('\nPress Ctrl+C to stop monitoring\n'));
  }

  private async setupMonitoringEnvironment(): Promise<void> {
    const monitoringDir = join(process.cwd(), 'monitoring-data');
    const alertsDir = join(monitoringDir, 'alerts');
    const reportsDir = join(monitoringDir, 'reports');
    
    [monitoringDir, alertsDir, reportsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async loadHistoricalData(): Promise<void> {
    const dataPath = join(process.cwd(), 'monitoring-data', 'health-history.json');
    
    if (existsSync(dataPath)) {
      try {
        const data = readFileSync(dataPath, 'utf8');
        this.healthHistory = JSON.parse(data);
        
        // Cleanup old data
        const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
        this.healthHistory = this.healthHistory.filter(check => check.timestamp > cutoff);
        
        console.log(chalk.green(`📊 Loaded ${this.healthHistory.length} historical health checks`));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not load historical data, starting fresh'));
        this.healthHistory = [];
      }
    }
  }

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const healthCheck = await this.performHealthCheck();
        this.healthHistory.push(healthCheck);
        
        // Check for alerts
        await this.checkAlertThresholds(healthCheck);
        
        // Save data periodically
        await this.saveMonitoringData();
        
        // Display status
        this.displayStatus(healthCheck);
        
        // Generate reports periodically
        if (this.healthHistory.length % 100 === 0) {
          await this.generatePeriodicReport();
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Monitoring error: ${(error as Error).message}`));
      }
      
      // Wait for next check
      await new Promise(resolve => setTimeout(resolve, this.config.checkInterval));
    }
  }

  private async performHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    const operations = {
      programAccess: false,
      agentRegistration: false,
      marketplaceListing: false,
      escrowCreation: false
    };
    
    let errors = 0;
    let totalOps = 0;
    
    try {
      // Test program access
      execSync(`solana account ${this.config.programId}`, { stdio: 'pipe', timeout: 10000 });
      operations.programAccess = true;
      totalOps++;
    } catch {
      errors++;
      totalOps++;
    }
    
    try {
      // Test agent registration
      const timestamp = Date.now();
      execSync(`npx ghostspeak agent register --name "Monitor${timestamp}" --description "Monitor test" --price 1000000 --category "Monitor" --network ${this.config.network}`, { stdio: 'pipe', timeout: 15000 });
      operations.agentRegistration = true;
      totalOps++;
    } catch {
      errors++;
      totalOps++;
    }
    
    try {
      // Test marketplace query (lightweight)
      execSync(`npx ghostspeak marketplace list --network ${this.config.network}`, { stdio: 'pipe', timeout: 10000 });
      operations.marketplaceListing = true;
      totalOps++;
    } catch {
      errors++;
      totalOps++;
    }
    
    try {
      // Test escrow creation
      const timestamp = Date.now();
      execSync(`npx ghostspeak escrow create --amount 1000000 --recipient 11111111111111111111111111111111 --description "Monitor${timestamp}" --network ${this.config.network}`, { stdio: 'pipe', timeout: 15000 });
      operations.escrowCreation = true;
      totalOps++;
    } catch {
      errors++;
      totalOps++;
    }
    
    const latency = Date.now() - startTime;
    const errorRate = (errors / totalOps) * 100;
    
    let status: 'healthy' | 'degraded' | 'down';
    if (errorRate === 0) {
      status = 'healthy';
    } else if (errorRate < 50) {
      status = 'degraded';
    } else {
      status = 'down';
    }
    
    return {
      timestamp: Date.now(),
      status,
      latency,
      errorRate,
      operations
    };
  }

  private async checkAlertThresholds(healthCheck: HealthCheck): Promise<void> {
    const alerts: Alert[] = [];
    
    // Check latency threshold
    if (healthCheck.latency > this.config.alertThresholds.latency) {
      alerts.push({
        timestamp: Date.now(),
        severity: healthCheck.latency > this.config.alertThresholds.latency * 2 ? 'critical' : 'warning',
        message: `High latency detected: ${healthCheck.latency}ms`,
        metric: 'latency',
        value: healthCheck.latency,
        threshold: this.config.alertThresholds.latency
      });
    }
    
    // Check error rate threshold
    if (healthCheck.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        timestamp: Date.now(),
        severity: healthCheck.errorRate > 50 ? 'critical' : 'error',
        message: `High error rate detected: ${healthCheck.errorRate.toFixed(1)}%`,
        metric: 'errorRate',
        value: healthCheck.errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }
    
    // Check for service down
    if (healthCheck.status === 'down') {
      alerts.push({
        timestamp: Date.now(),
        severity: 'critical',
        message: 'Service is down - multiple operations failing',
        metric: 'status',
        value: healthCheck.errorRate,
        threshold: 50
      });
    }
    
    // Log and store alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.logAlert(alert);
    }
  }

  private logAlert(alert: Alert): void {
    const severityColor = {
      warning: chalk.yellow,
      error: chalk.red,
      critical: chalk.red.bold
    }[alert.severity];
    
    const icon = {
      warning: '⚠️',
      error: '🚨',
      critical: '💥'
    }[alert.severity];
    
    console.log(severityColor(`${icon} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`));
    
    // Save to alert log
    const alertLogPath = join(process.cwd(), 'monitoring-data', 'alerts', `${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `[${new Date().toISOString()}] ${alert.severity.toUpperCase()}: ${alert.message} (${alert.metric}: ${alert.value}/${alert.threshold})\n`;
    appendFileSync(alertLogPath, logEntry);
  }

  private displayStatus(healthCheck: HealthCheck): void {
    const statusColor = {
      healthy: chalk.green,
      degraded: chalk.yellow,
      down: chalk.red
    }[healthCheck.status];
    
    const statusIcon = {
      healthy: '✅',
      degraded: '⚠️',
      down: '❌'
    }[healthCheck.status];
    
    const timestamp = new Date(healthCheck.timestamp).toLocaleTimeString();
    
    console.log(
      `${statusIcon} ${timestamp} | ${statusColor(healthCheck.status.toUpperCase())} | ` +
      `Latency: ${healthCheck.latency}ms | ` +
      `Error Rate: ${healthCheck.errorRate.toFixed(1)}% | ` +
      `Ops: ${Object.values(healthCheck.operations).filter(Boolean).length}/4`
    );
  }

  private async saveMonitoringData(): Promise<void> {
    // Save health history
    const healthPath = join(process.cwd(), 'monitoring-data', 'health-history.json');
    writeFileSync(healthPath, JSON.stringify(this.healthHistory, null, 2));
    
    // Save current status
    const statusPath = join(process.cwd(), 'monitoring-data', 'current-status.json');
    const currentStatus = {
      timestamp: Date.now(),
      status: this.healthHistory[this.healthHistory.length - 1]?.status || 'unknown',
      uptime: this.calculateUptime(),
      totalChecks: this.healthHistory.length,
      monitoring_duration: Date.now() - this.startTime
    };
    writeFileSync(statusPath, JSON.stringify(currentStatus, null, 2));
  }

  private calculateUptime(): number {
    if (this.healthHistory.length === 0) return 100;
    
    const healthyChecks = this.healthHistory.filter(check => check.status === 'healthy').length;
    return (healthyChecks / this.healthHistory.length) * 100;
  }

  private async generatePeriodicReport(): Promise<void> {
    console.log(chalk.blue('\n📊 Generating periodic report...'));
    
    const now = Date.now();
    const period = {
      start: this.startTime,
      end: now
    };
    
    const summary = {
      uptime: this.calculateUptime(),
      averageLatency: this.healthHistory.reduce((sum, check) => sum + check.latency, 0) / this.healthHistory.length,
      averageErrorRate: this.healthHistory.reduce((sum, check) => sum + check.errorRate, 0) / this.healthHistory.length,
      totalChecks: this.healthHistory.length,
      failedChecks: this.healthHistory.filter(check => check.status !== 'healthy').length
    };
    
    const trends = this.calculateTrends();
    const recentAlerts = this.alerts.filter(alert => alert.timestamp > now - (24 * 60 * 60 * 1000));
    const recommendations = this.generateRecommendations(summary, trends);
    
    const report: MonitoringReport = {
      period,
      summary,
      trends,
      alerts: recentAlerts,
      recommendations
    };
    
    // Save report
    const reportPath = join(process.cwd(), 'monitoring-data', 'reports', `report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log(chalk.green(`✅ Uptime: ${summary.uptime.toFixed(1)}%`));
    console.log(chalk.blue(`📈 Avg Latency: ${summary.averageLatency.toFixed(1)}ms`));
    console.log(chalk.blue(`📊 Avg Error Rate: ${summary.averageErrorRate.toFixed(1)}%`));
    console.log(chalk.blue(`🔢 Total Checks: ${summary.totalChecks}`));
    
    if (recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      recommendations.forEach(rec => console.log(chalk.yellow(`  - ${rec}`)));
    }
    
    console.log('');
  }

  private calculateTrends(): { latencyTrend: 'improving' | 'stable' | 'degrading'; errorTrend: 'improving' | 'stable' | 'degrading'; uptimeTrend: 'improving' | 'stable' | 'degrading'; } {
    // Simple trend calculation based on recent vs. older data
    const recentData = this.healthHistory.slice(-50);
    const olderData = this.healthHistory.slice(-100, -50);
    
    if (olderData.length < 10 || recentData.length < 10) {
      return {
        latencyTrend: 'stable',
        errorTrend: 'stable',
        uptimeTrend: 'stable'
      };
    }
    
    const recentLatency = recentData.reduce((sum, check) => sum + check.latency, 0) / recentData.length;
    const olderLatency = olderData.reduce((sum, check) => sum + check.latency, 0) / olderData.length;
    
    const recentErrorRate = recentData.reduce((sum, check) => sum + check.errorRate, 0) / recentData.length;
    const olderErrorRate = olderData.reduce((sum, check) => sum + check.errorRate, 0) / olderData.length;
    
    const recentUptime = (recentData.filter(check => check.status === 'healthy').length / recentData.length) * 100;
    const olderUptime = (olderData.filter(check => check.status === 'healthy').length / olderData.length) * 100;
    
    return {
      latencyTrend: recentLatency < olderLatency * 0.9 ? 'improving' : 
                    recentLatency > olderLatency * 1.1 ? 'degrading' : 'stable',
      errorTrend: recentErrorRate < olderErrorRate * 0.9 ? 'improving' :
                  recentErrorRate > olderErrorRate * 1.1 ? 'degrading' : 'stable',
      uptimeTrend: recentUptime > olderUptime * 1.01 ? 'improving' :
                   recentUptime < olderUptime * 0.99 ? 'degrading' : 'stable'
    };
  }

  private generateRecommendations(summary: any, trends: any): string[] {
    const recommendations: string[] = [];
    
    if (summary.uptime < 95) {
      recommendations.push('Uptime is below 95% - investigate frequent failures');
    }
    
    if (summary.averageLatency > 5000) {
      recommendations.push('Average latency is high - consider optimizing operations or checking network');
    }
    
    if (summary.averageErrorRate > 10) {
      recommendations.push('Error rate is high - review recent changes and system health');
    }
    
    if (trends.latencyTrend === 'degrading') {
      recommendations.push('Latency is trending upward - investigate performance bottlenecks');
    }
    
    if (trends.errorTrend === 'degrading') {
      recommendations.push('Error rate is increasing - check system stability and recent deployments');
    }
    
    return recommendations;
  }

  public stopMonitoring(): void {
    console.log(chalk.yellow('\n🛑 Stopping monitoring...'));
    
    this.isRunning = false;
    
    // Save final data
    this.saveMonitoringData();
    
    // Generate final report
    if (this.healthHistory.length > 0) {
      this.generatePeriodicReport();
    }
    
    console.log(chalk.green('✅ Monitoring stopped gracefully'));
    process.exit(0);
  }

  static async createDashboard(): Promise<void> {
    // Generate a simple HTML dashboard
    const statusPath = join(process.cwd(), 'monitoring-data', 'current-status.json');
    const healthPath = join(process.cwd(), 'monitoring-data', 'health-history.json');
    
    if (!existsSync(statusPath) || !existsSync(healthPath)) {
      console.log(chalk.yellow('⚠️  No monitoring data available for dashboard'));
      return;
    }
    
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    const healthHistory = JSON.parse(readFileSync(healthPath, 'utf8'));
    
    const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GhostSpeak Testnet Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { padding: 20px; border-radius: 8px; margin: 10px 0; }
        .healthy { background-color: #d4edda; color: #155724; }
        .degraded { background-color: #fff3cd; color: #856404; }
        .down { background-color: #f8d7da; color: #721c24; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🎯 GhostSpeak Testnet Monitor</h1>
    <div class="status ${status.status}">
        <h2>Current Status: ${status.status.toUpperCase()}</h2>
        <p>Last Updated: ${new Date(status.timestamp).toLocaleString()}</p>
        <p>Uptime: ${status.uptime?.toFixed(1) || 'N/A'}%</p>
        <p>Total Checks: ${status.totalChecks || 0}</p>
    </div>
    
    <h3>Recent Metrics</h3>
    <div class="metric">
        <strong>Average Latency</strong><br>
        ${healthHistory.slice(-10).reduce((sum, check) => sum + check.latency, 0) / Math.min(10, healthHistory.length) || 0}ms
    </div>
    <div class="metric">
        <strong>Error Rate</strong><br>
        ${(healthHistory.slice(-10).reduce((sum, check) => sum + check.errorRate, 0) / Math.min(10, healthHistory.length) || 0).toFixed(1)}%
    </div>
    
    <p><em>Auto-refresh every 30 seconds</em></p>
    <script>
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
    
    const dashboardPath = join(process.cwd(), 'monitoring-data', 'dashboard.html');
    writeFileSync(dashboardPath, dashboardHtml);
    
    console.log(chalk.blue(`📊 Dashboard created: ${dashboardPath}`));
  }
}

// Main execution
async function main(): Promise<void> {
  const config: MonitorConfig = {
    network: 'testnet',
    programId: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR',
    rpcUrl: process.env.TESTNET_RPC_URL || 'https://api.testnet.solana.com',
    checkInterval: 60000, // 1 minute
    alertThresholds: {
      latency: 10000, // 10 seconds
      errorRate: 20,   // 20%
      throughput: 0.1  // 0.1 ops/sec
    },
    retentionPeriod: 30 // 30 days
  };
  
  const monitor = new TestnetMonitor(config);
  
  // Handle command line arguments
  const command = process.argv[2];
  
  if (command === 'dashboard') {
    await TestnetMonitor.createDashboard();
    return;
  }
  
  // Start monitoring
  await monitor.startMonitoring();
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestnetMonitor, type MonitorConfig, type HealthCheck, type Alert, type MonitoringReport };