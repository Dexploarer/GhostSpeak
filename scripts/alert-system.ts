#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { HealthChecker, HealthStatus } from './health-check.js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface AlertRule {
  id: string;
  name: string;
  type: 'health' | 'performance' | 'error' | 'security' | 'deployment';
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: AlertChannel[];
  cooldown?: number; // minutes
  lastTriggered?: string;
}

interface AlertCondition {
  metric?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'ne' | 'contains';
  value?: any;
  threshold?: number;
  duration?: number; // seconds
  pattern?: string;
}

interface AlertChannel {
  type: 'console' | 'file' | 'webhook' | 'email' | 'slack';
  config: { [key: string]: any };
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata?: { [key: string]: any };
  resolved?: boolean;
  resolvedAt?: string;
}

class AlertSystem {
  private logger: GhostSpeakLogger;
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private healthChecker: HealthChecker;
  private configFile: string;

  constructor() {
    this.logger = new GhostSpeakLogger('ALERTS');
    this.healthChecker = new HealthChecker();
    this.configFile = path.join(process.cwd(), 'config', 'alerts.json');
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'health-critical',
        name: 'Critical Service Down',
        type: 'health',
        condition: {
          metric: 'status',
          operator: 'eq',
          value: 'down'
        },
        severity: 'critical',
        enabled: true,
        channels: [
          { type: 'console', config: {}, enabled: true },
          { type: 'file', config: { filename: 'critical-alerts.log' }, enabled: true }
        ],
        cooldown: 5
      },
      {
        id: 'health-degraded',
        name: 'Service Degraded',
        type: 'health',
        condition: {
          metric: 'status',
          operator: 'eq',
          value: 'degraded'
        },
        severity: 'high',
        enabled: true,
        channels: [
          { type: 'console', config: {}, enabled: true },
          { type: 'file', config: { filename: 'alerts.log' }, enabled: true }
        ],
        cooldown: 15
      },
      {
        id: 'response-time-high',
        name: 'High Response Time',
        type: 'performance',
        condition: {
          metric: 'responseTime',
          operator: 'gt',
          threshold: 5000
        },
        severity: 'medium',
        enabled: true,
        channels: [
          { type: 'console', config: {}, enabled: true }
        ],
        cooldown: 10
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        type: 'performance',
        condition: {
          metric: 'memoryUsage',
          operator: 'gt',
          threshold: 1000 * 1024 * 1024 // 1GB
        },
        severity: 'medium',
        enabled: true,
        channels: [
          { type: 'console', config: {}, enabled: true }
        ],
        cooldown: 30
      },
      {
        id: 'deployment-failed',
        name: 'Deployment Failed',
        type: 'deployment',
        condition: {
          metric: 'success',
          operator: 'eq',
          value: false
        },
        severity: 'high',
        enabled: true,
        channels: [
          { type: 'console', config: {}, enabled: true },
          { type: 'file', config: { filename: 'deployment-alerts.log' }, enabled: true }
        ],
        cooldown: 0
      },
      {
        id: 'security-audit-fail',
        name: 'Security Audit Failure',
        type: 'security',
        condition: {
          pattern: 'vulnerabilities found'
        },
        severity: 'high',
        enabled: true,
        channels: [
          { type: 'console', config: {}, enabled: true },
          { type: 'file', config: { filename: 'security-alerts.log' }, enabled: true }
        ],
        cooldown: 60
      }
    ];
  }

  async loadConfig(): Promise<void> {
    try {
      const configPath = path.dirname(this.configFile);
      await fs.mkdir(configPath, { recursive: true });
      
      const configData = await fs.readFile(this.configFile, 'utf-8');
      const config = JSON.parse(configData);
      
      if (config.rules) {
        this.rules = config.rules;
      }
      
      this.logger.info('Alert configuration loaded', { rules: this.rules.length });
    } catch (error) {
      this.logger.warn('Could not load alert config, using defaults', { error: String(error) });
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    try {
      const config = {
        rules: this.rules,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
      this.logger.info('Alert configuration saved');
    } catch (error) {
      this.logger.error('Failed to save alert configuration', error);
    }
  }

  private shouldTriggerAlert(rule: AlertRule): boolean {
    if (!rule.enabled) return false;
    
    if (rule.cooldown && rule.lastTriggered) {
      const lastTriggered = new Date(rule.lastTriggered);
      const cooldownPeriod = rule.cooldown * 60 * 1000; // Convert minutes to milliseconds
      
      if (Date.now() - lastTriggered.getTime() < cooldownPeriod) {
        return false; // Still in cooldown period
      }
    }
    
    return true;
  }

  private async sendAlert(alert: Alert, channels: AlertChannel[]): Promise<void> {
    for (const channel of channels.filter(c => c.enabled)) {
      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        this.logger.error(`Failed to send alert to ${channel.type}`, error);
      }
    }
  }

  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        await this.sendToConsole(alert);
        break;
      case 'file':
        await this.sendToFile(alert, channel.config);
        break;
      case 'webhook':
        await this.sendToWebhook(alert, channel.config);
        break;
      case 'email':
        await this.sendToEmail(alert, channel.config);
        break;
      case 'slack':
        await this.sendToSlack(alert, channel.config);
        break;
      default:
        this.logger.warn(`Unknown alert channel type: ${channel.type}`);
    }
  }

  private async sendToConsole(alert: Alert): Promise<void> {
    const colors = {
      low: chalk.blue,
      medium: chalk.yellow,
      high: chalk.red,
      critical: chalk.red.bold
    };

    const icons = {
      low: '🔵',
      medium: '🟡',
      high: '🔴',
      critical: '🚨'
    };

    console.log(`\n${icons[alert.severity]} ${colors[alert.severity](`[${alert.severity.toUpperCase()}] ${alert.title}`)}`);
    console.log(colors[alert.severity](`Message: ${alert.message}`));
    console.log(chalk.gray(`Time: ${new Date(alert.timestamp).toLocaleString()}`));
    console.log(chalk.gray(`Alert ID: ${alert.id}`));
    
    if (alert.metadata && Object.keys(alert.metadata).length > 0) {
      console.log(chalk.gray(`Metadata: ${JSON.stringify(alert.metadata, null, 2)}`));
    }
    console.log();
  }

  private async sendToFile(alert: Alert, config: any): Promise<void> {
    const filename = config.filename || 'alerts.log';
    const alertsDir = path.join(process.cwd(), 'logs', 'alerts');
    await fs.mkdir(alertsDir, { recursive: true });
    
    const filePath = path.join(alertsDir, filename);
    const logEntry = {
      ...alert,
      formattedTime: new Date(alert.timestamp).toISOString()
    };
    
    await fs.appendFile(filePath, JSON.stringify(logEntry) + '\n');
  }

  private async sendToWebhook(alert: Alert, config: any): Promise<void> {
    // Placeholder for webhook implementation
    this.logger.info('Webhook alert sent (placeholder)', { url: config.url, alert: alert.id });
  }

  private async sendToEmail(alert: Alert, config: any): Promise<void> {
    // Placeholder for email implementation
    this.logger.info('Email alert sent (placeholder)', { to: config.to, alert: alert.id });
  }

  private async sendToSlack(alert: Alert, config: any): Promise<void> {
    // Placeholder for Slack implementation
    this.logger.info('Slack alert sent (placeholder)', { channel: config.channel, alert: alert.id });
  }

  private async createAlert(rule: AlertRule, title: string, message: string, metadata?: any): Promise<Alert> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      title,
      message,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      metadata,
      resolved: false
    };

    this.alerts.push(alert);
    
    // Update rule's last triggered time
    rule.lastTriggered = alert.timestamp;
    
    this.logger.info('Alert created', { 
      alertId: alert.id, 
      ruleId: rule.id, 
      severity: rule.severity 
    });

    return alert;
  }

  async checkHealthAlerts(): Promise<void> {
    try {
      const healthResults = await this.healthChecker.runHealthChecks();
      
      for (const result of healthResults) {
        const healthRules = this.rules.filter(r => r.type === 'health');
        
        for (const rule of healthRules) {
          if (!this.shouldTriggerAlert(rule)) continue;
          
          const condition = rule.condition;
          let shouldAlert = false;
          
          if (condition.metric === 'status' && condition.operator === 'eq') {
            shouldAlert = result.status === condition.value;
          } else if (condition.metric === 'responseTime' && condition.operator === 'gt') {
            shouldAlert = (result.responseTime || 0) > (condition.threshold || 0);
          }
          
          if (shouldAlert) {
            const alert = await this.createAlert(
              rule,
              `Health Alert: ${result.service}`,
              `Service ${result.service} is ${result.status}. ${result.details || ''}`,
              {
                service: result.service,
                status: result.status,
                responseTime: result.responseTime,
                details: result.details
              }
            );
            
            await this.sendAlert(alert, rule.channels);
          }
        }
      }
    } catch (error) {
      this.logger.error('Health check alerts failed', error);
    }
  }

  async checkPerformanceAlerts(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const performanceRules = this.rules.filter(r => r.type === 'performance');
      
      for (const rule of performanceRules) {
        if (!this.shouldTriggerAlert(rule)) continue;
        
        const condition = rule.condition;
        let shouldAlert = false;
        let alertData: any = {};
        
        if (condition.metric === 'memoryUsage' && condition.operator === 'gt') {
          shouldAlert = memoryUsage.heapUsed > (condition.threshold || 0);
          alertData = {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            threshold: condition.threshold,
            usageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
          };
        }
        
        if (shouldAlert) {
          const alert = await this.createAlert(
            rule,
            `Performance Alert: ${rule.name}`,
            `Memory usage is high: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            alertData
          );
          
          await this.sendAlert(alert, rule.channels);
        }
      }
    } catch (error) {
      this.logger.error('Performance alerts check failed', error);
    }
  }

  async checkLogAlerts(): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const errorLogPath = path.join(logsDir, 'error.log');
      
      // Check if error log exists and has recent entries
      try {
        const stats = await fs.stat(errorLogPath);
        const now = Date.now();
        const fileAge = now - stats.mtime.getTime();
        
        // If error log was modified in the last 5 minutes, check for patterns
        if (fileAge < 5 * 60 * 1000) {
          const content = await fs.readFile(errorLogPath, 'utf-8');
          const lines = content.split('\n').slice(-100); // Check last 100 lines
          
          const errorRules = this.rules.filter(r => r.type === 'error');
          
          for (const rule of errorRules) {
            if (!this.shouldTriggerAlert(rule)) continue;
            
            if (rule.condition.pattern) {
              const pattern = new RegExp(rule.condition.pattern, 'i');
              const matchingLines = lines.filter(line => pattern.test(line));
              
              if (matchingLines.length > 0) {
                const alert = await this.createAlert(
                  rule,
                  `Error Pattern Alert: ${rule.name}`,
                  `Found ${matchingLines.length} matching error patterns in logs`,
                  {
                    pattern: rule.condition.pattern,
                    matchCount: matchingLines.length,
                    recentMatches: matchingLines.slice(-3)
                  }
                );
                
                await this.sendAlert(alert, rule.channels);
              }
            }
          }
        }
      } catch (error) {
        // Error log doesn't exist or can't be read - that's actually good!
      }
    } catch (error) {
      this.logger.error('Log alerts check failed', error);
    }
  }

  async runAllChecks(): Promise<void> {
    this.logger.info('Running alert system checks');
    
    await Promise.all([
      this.checkHealthAlerts(),
      this.checkPerformanceAlerts(),
      this.checkLogAlerts()
    ]);
    
    this.logger.info('Alert system checks completed');
  }

  async startMonitoring(interval: number = 60000): Promise<void> {
    this.logger.info('Starting alert system monitoring', { intervalMs: interval });
    
    // Initial check
    await this.runAllChecks();
    
    // Set up recurring checks
    setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        this.logger.error('Alert monitoring cycle failed', error);
      }
    }, interval);
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    
    this.logger.info('Alert resolved', { alertId, resolvedAt: alert.resolvedAt });
    return true;
  }

  displayAlertsSummary(): void {
    const active = this.getActiveAlerts();
    const byStatus = active.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    console.log(chalk.bold.blue('\n🚨 Alert System Status'));
    console.log(`Total Active Alerts: ${active.length}`);
    console.log(`Critical: ${byStatus.critical || 0}`);
    console.log(`High: ${byStatus.high || 0}`);
    console.log(`Medium: ${byStatus.medium || 0}`);
    console.log(`Low: ${byStatus.low || 0}`);
    console.log(`\nTotal Rules: ${this.rules.length} (${this.rules.filter(r => r.enabled).length} enabled)`);
  }
}

async function main(): Promise<void> {
  program
    .name('alert-system')
    .description('GhostSpeak alert and notification system')
    .option('-m, --monitor', 'Start continuous monitoring')
    .option('-i, --interval <seconds>', 'Monitoring interval in seconds', '60')
    .option('-c, --check', 'Run one-time alert checks')
    .option('-s, --status', 'Show alert system status')
    .option('--resolve <alertId>', 'Resolve a specific alert')
    .parse();

  const options = program.opts();
  const alertSystem = new AlertSystem();

  await alertSystem.loadConfig();

  if (options.status) {
    alertSystem.displayAlertsSummary();
    return;
  }

  if (options.resolve) {
    const resolved = await alertSystem.resolveAlert(options.resolve);
    console.log(resolved 
      ? chalk.green(`✅ Alert ${options.resolve} resolved`)
      : chalk.red(`❌ Alert ${options.resolve} not found`)
    );
    return;
  }

  if (options.check) {
    console.log(chalk.blue('🔍 Running one-time alert checks...'));
    await alertSystem.runAllChecks();
    alertSystem.displayAlertsSummary();
    return;
  }

  if (options.monitor) {
    const interval = parseInt(options.interval) * 1000;
    console.log(chalk.blue(`🔄 Starting alert system monitoring (${options.interval}s intervals)...`));
    console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
    
    await alertSystem.startMonitoring(interval);
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n📴 Alert monitoring stopped'));
      process.exit(0);
    });
    
    // Keep alive
    await new Promise(() => {});
  } else {
    console.log(chalk.yellow('No action specified. Use --help for options.'));
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Alert system error:'), error);
    process.exit(1);
  });
}

export { AlertSystem, AlertRule, Alert };