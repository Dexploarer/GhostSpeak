/**
 * Alerting system for monitoring critical events and thresholds
 */

import { v4 as uuidv4 } from 'uuid';
import type { Alert, AlertRule, AlertAction, AlertLevel } from './types';
import { StructuredLogger } from './logger';
import { MetricsCollector } from './metrics';

export class AlertingSystem {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private logger: StructuredLogger;
  private metricsCollector: MetricsCollector;
  private evaluationInterval: NodeJS.Timer | null = null;

  constructor(logger: StructuredLogger, metricsCollector: MetricsCollector) {
    this.logger = logger;
    this.metricsCollector = metricsCollector;
    this.registerDefaultRules();
    this.startEvaluation();
  }

  // Create an alert
  createAlert(
    level: AlertLevel,
    title: string,
    message: string,
    component: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ): string {
    const alertId = uuidv4();
    const timestamp = Date.now();

    const alert: Alert = {
      id: alertId,
      level,
      title,
      message,
      timestamp,
      component,
      tags,
      metadata,
      resolved: false,
    };

    this.alerts.set(alertId, alert);

    // Log alert
    this.logger.warn(
      {
        alertId,
        level,
        component,
        tags,
        metadata,
      },
      `Alert created: ${title} - ${message}`
    );

    // Update metrics
    this.metricsCollector.increment('ghostspeak_alerts_total', {
      level,
      component,
    });

    // Execute alert actions
    this.executeAlertActions(alert);

    return alertId;
  }

  // Resolve an alert
  resolveAlert(alertId: string, resolvedBy?: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    this.logger.info(
      {
        alertId,
        level: alert.level,
        component: alert.component,
        resolvedBy,
        duration: alert.resolvedAt - alert.timestamp,
      },
      `Alert resolved: ${alert.title}`
    );

    this.metricsCollector.increment('ghostspeak_alerts_resolved_total', {
      level: alert.level,
      component: alert.component,
    });
  }

  // Add alert rule
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    
    this.logger.info(
      {
        ruleId: rule.id,
        name: rule.name,
        level: rule.level,
        enabled: rule.enabled,
      },
      `Alert rule added: ${rule.name}`
    );
  }

  // Remove alert rule
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      
      this.logger.info(
        {
          ruleId,
          name: rule.name,
        },
        `Alert rule removed: ${rule.name}`
      );
    }
  }

  // Enable/disable rule
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      
      this.logger.info(
        {
          ruleId,
          name: rule.name,
          enabled,
        },
        `Alert rule ${enabled ? 'enabled' : 'disabled'}: ${rule.name}`
      );
    }
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Get alerts by level
  getAlertsByLevel(level: AlertLevel): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.level === level);
  }

  // Get alerts by component
  getAlertsByComponent(component: string): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.component === component);
  }

  // Get recent alerts
  getRecentAlerts(minutes: number = 60): Alert[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return Array.from(this.alerts.values())
      .filter(alert => alert.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get alert statistics
  getAlertStats(): {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    alertsByLevel: Record<AlertLevel, number>;
    alertsByComponent: Record<string, number>;
    averageResolutionTime: number;
  } {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(a => !a.resolved);
    const resolvedAlerts = allAlerts.filter(a => a.resolved);

    const alertsByLevel: Record<AlertLevel, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    const alertsByComponent: Record<string, number> = {};

    for (const alert of allAlerts) {
      alertsByLevel[alert.level]++;
      alertsByComponent[alert.component] = (alertsByComponent[alert.component] || 0) + 1;
    }

    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.resolvedAt! - alert.timestamp);
    }, 0);

    const averageResolutionTime = resolvedAlerts.length > 0 ? 
      totalResolutionTime / resolvedAlerts.length : 0;

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      alertsByLevel,
      alertsByComponent,
      averageResolutionTime,
    };
  }

  // Evaluate alert rules
  private evaluateRules(): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.cooldowns.get(rule.id) || 0;
      if (Date.now() - lastTriggered < rule.cooldownMs) {
        continue;
      }

      try {
        const shouldTrigger = this.evaluateCondition(rule.condition);
        
        if (shouldTrigger) {
          this.createAlert(
            rule.level,
            rule.name,
            `Alert rule triggered: ${rule.condition}`,
            'alerting_system',
            ['rule', rule.id],
            { ruleId: rule.id, condition: rule.condition }
          );

          this.cooldowns.set(rule.id, Date.now());
        }
      } catch (error) {
        this.logger.error(
          {
            ruleId: rule.id,
            condition: rule.condition,
            error: error instanceof Error ? error.message : String(error),
          },
          `Failed to evaluate alert rule: ${rule.name}`
        );
      }
    }
  }

  // Evaluate alert condition
  private evaluateCondition(condition: string): boolean {
    // Simple condition evaluation - in production, use a proper expression engine
    try {
      // Example conditions:
      // "memory_usage > 90"
      // "error_rate > 0.05"
      // "response_time > 5000"
      
      const metrics = this.metricsCollector.getAllMetrics();
      
      // Parse condition (simplified parser)
      const match = condition.match(/(\w+)\s*([><=!]+)\s*([\d.]+)/);
      if (!match) return false;
      
      const [, metricName, operator, threshold] = match;
      const thresholdValue = parseFloat(threshold);
      
      // Get metric value
      const metricValues = metrics.get(`ghostspeak_${metricName}`);
      if (!metricValues || metricValues.length === 0) return false;
      
      const latestValue = metricValues[metricValues.length - 1].value;
      
      switch (operator) {
        case '>':
          return latestValue > thresholdValue;
        case '<':
          return latestValue < thresholdValue;
        case '>=':
          return latestValue >= thresholdValue;
        case '<=':
          return latestValue <= thresholdValue;
        case '==':
        case '=':
          return latestValue === thresholdValue;
        case '!=':
          return latestValue !== thresholdValue;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Execute alert actions
  private executeAlertActions(alert: Alert): void {
    const rules = Array.from(this.rules.values()).filter(rule => 
      rule.level === alert.level || 
      (alert.level === 'critical' && rule.level === 'error')
    );

    for (const rule of rules) {
      for (const action of rule.actions) {
        this.executeAction(action, alert);
      }
    }
  }

  // Execute individual action
  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    try {
      switch (action.type) {
        case 'email':
          await this.sendEmailAlert(action.config, alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(action.config, alert);
          break;
        case 'log':
          this.logAlert(alert);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(action.config, alert);
          break;
        default:
          this.logger.warn(
            { actionType: action.type },
            `Unknown alert action type: ${action.type}`
          );
      }
    } catch (error) {
      this.logger.error(
        {
          actionType: action.type,
          alertId: alert.id,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to execute alert action`
      );
    }
  }

  // Send email alert
  private async sendEmailAlert(config: Record<string, unknown>, alert: Alert): Promise<void> {
    // Implementation would send email using configured email service
    this.logger.debug(
      {
        alertId: alert.id,
        to: config.to,
        subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
      },
      'Email alert sent'
    );
  }

  // Send webhook alert
  private async sendWebhookAlert(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const url = config.url as string;
    if (!url) return;

    const payload = {
      type: 'alert',
      alert: {
        id: alert.id,
        level: alert.level,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp,
        component: alert.component,
        tags: alert.tags,
        metadata: alert.metadata,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers as Record<string, string> || {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status}`);
    }

    this.logger.debug(
      {
        alertId: alert.id,
        url,
        status: response.status,
      },
      'Webhook alert sent'
    );
  }

  // Log alert
  private logAlert(alert: Alert): void {
    const logLevel = alert.level === 'critical' || alert.level === 'error' ? 'error' : 
                   alert.level === 'warning' ? 'warn' : 'info';

    this.logger[logLevel](
      {
        alertId: alert.id,
        component: alert.component,
        tags: alert.tags,
        metadata: alert.metadata,
      },
      `[ALERT] ${alert.title}: ${alert.message}`
    );
  }

  // Send PagerDuty alert
  private async sendPagerDutyAlert(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const integrationKey = config.integrationKey as string;
    if (!integrationKey) return;

    const payload = {
      routing_key: integrationKey,
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: `${alert.title}: ${alert.message}`,
        severity: this.mapAlertLevelToPagerDuty(alert.level),
        source: alert.component,
        component: alert.component,
        group: 'ghostspeak',
        class: alert.level,
        custom_details: {
          alert_id: alert.id,
          tags: alert.tags,
          metadata: alert.metadata,
        },
      },
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty request failed: ${response.status}`);
    }

    this.logger.debug(
      {
        alertId: alert.id,
        dedupKey: alert.id,
      },
      'PagerDuty alert sent'
    );
  }

  // Map alert level to PagerDuty severity
  private mapAlertLevelToPagerDuty(level: AlertLevel): string {
    switch (level) {
      case 'critical':
        return 'critical';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }

  // Register default alert rules
  private registerDefaultRules(): void {
    // High memory usage
    this.addRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: 'memory_usage_bytes > 1073741824', // 1GB
      level: 'warning',
      enabled: true,
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      actions: [
        { type: 'log', config: {} },
        { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL } },
      ],
    });

    // Critical memory usage
    this.addRule({
      id: 'critical_memory_usage',
      name: 'Critical Memory Usage',
      condition: 'memory_usage_bytes > 2147483648', // 2GB
      level: 'critical',
      enabled: true,
      cooldownMs: 2 * 60 * 1000, // 2 minutes
      actions: [
        { type: 'log', config: {} },
        { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL } },
      ],
    });

    // High error rate
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: 'errors_total > 10',
      level: 'error',
      enabled: true,
      cooldownMs: 10 * 60 * 1000, // 10 minutes
      actions: [
        { type: 'log', config: {} },
      ],
    });

    // RPC latency
    this.addRule({
      id: 'high_rpc_latency',
      name: 'High RPC Latency',
      condition: 'rpc_duration > 5000', // 5 seconds
      level: 'warning',
      enabled: true,
      cooldownMs: 15 * 60 * 1000, // 15 minutes
      actions: [
        { type: 'log', config: {} },
      ],
    });
  }

  // Start rule evaluation
  private startEvaluation(): void {
    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, 30 * 1000); // Evaluate every 30 seconds
  }

  // Stop rule evaluation
  stopEvaluation(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
  }

  // Cleanup old alerts
  cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff && alert.resolved) {
        this.alerts.delete(alertId);
      }
    }
  }
}

// Alert notification channels
export class AlertNotificationChannels {
  private webhooks: Map<string, string> = new Map();
  private emailConfig: any = null;
  private slackConfig: any = null;

  // Add webhook channel
  addWebhook(name: string, url: string): void {
    this.webhooks.set(name, url);
  }

  // Configure email notifications
  configureEmail(config: {
    smtp: { host: string; port: number; secure: boolean };
    auth: { user: string; pass: string };
    from: string;
    to: string[];
  }): void {
    this.emailConfig = config;
  }

  // Configure Slack notifications
  configureSlack(config: { webhookUrl: string; channel: string }): void {
    this.slackConfig = config;
  }

  // Send notification to all configured channels
  async notifyAll(alert: Alert): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Send to webhooks
    for (const [name, url] of this.webhooks.entries()) {
      notifications.push(this.sendWebhookNotification(url, alert));
    }

    // Send email if configured
    if (this.emailConfig) {
      notifications.push(this.sendEmailNotification(alert));
    }

    // Send Slack if configured
    if (this.slackConfig) {
      notifications.push(this.sendSlackNotification(alert));
    }

    await Promise.allSettled(notifications);
  }

  private async sendWebhookNotification(url: string, alert: Alert): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert }),
    });
  }

  private async sendEmailNotification(alert: Alert): Promise<void> {
    // Implementation would use nodemailer or similar
    console.log(`Email notification for alert: ${alert.title}`);
  }

  private async sendSlackNotification(alert: Alert): Promise<void> {
    const color = {
      info: '#36a64f',
      warning: '#ff9900',
      error: '#ff6600',
      critical: '#ff0000',
    }[alert.level];

    const payload = {
      channel: this.slackConfig.channel,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            { title: 'Level', value: alert.level.toUpperCase(), short: true },
            { title: 'Component', value: alert.component, short: true },
            { title: 'Time', value: new Date(alert.timestamp).toISOString(), short: true },
          ],
        },
      ],
    };

    await fetch(this.slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

// Singleton alerting system
let alertingSystemInstance: AlertingSystem | null = null;

export const getAlertingSystem = (
  logger?: StructuredLogger,
  metricsCollector?: MetricsCollector
): AlertingSystem => {
  if (!alertingSystemInstance && logger && metricsCollector) {
    alertingSystemInstance = new AlertingSystem(logger, metricsCollector);
  }
  if (!alertingSystemInstance) {
    throw new Error('AlertingSystem not initialized. Provide logger and metricsCollector instances.');
  }
  return alertingSystemInstance;
};