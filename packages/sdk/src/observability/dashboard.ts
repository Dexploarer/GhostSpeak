/**
 * Monitoring dashboard and visualization system
 */

import type { HealthStatus, MetricValue, PerformanceMetric } from './types';
import { ObservabilitySystem } from './observability';

export class MonitoringDashboard {
  private observability: ObservabilitySystem;
  private refreshInterval: NodeJS.Timer | null = null;
  private dashboardData: DashboardData = {
    system: {},
    health: { status: 'unknown', checks: [], timestamp: 0, uptime: 0, version: '' },
    metrics: {},
    performance: {},
    errors: {},
    alerts: {},
    lastUpdated: 0,
  };

  constructor(observability: ObservabilitySystem) {
    this.observability = observability;
  }

  // Start dashboard data collection
  start(refreshIntervalMs: number = 30000): void {
    this.refreshData();
    
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, refreshIntervalMs);

    console.log(`Dashboard started with ${refreshIntervalMs}ms refresh interval`);
  }

  // Stop dashboard
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    console.log('Dashboard stopped');
  }

  // Get current dashboard data
  getDashboardData(): DashboardData {
    return { ...this.dashboardData };
  }

  // Get dashboard HTML
  generateHTML(): string {
    const data = this.dashboardData;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GhostSpeak Observability Dashboard</title>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>🔍 GhostSpeak Observability Dashboard</h1>
            <div class="last-updated">Last Updated: ${new Date(data.lastUpdated).toLocaleString()}</div>
        </header>

        <div class="dashboard-grid">
            ${this.generateSystemCard(data.system)}
            ${this.generateHealthCard(data.health)}
            ${this.generateMetricsCard(data.metrics)}
            ${this.generatePerformanceCard(data.performance)}
            ${this.generateErrorsCard(data.errors)}
            ${this.generateAlertsCard(data.alerts)}
        </div>
    </div>

    <script>
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  // Refresh dashboard data
  private async refreshData(): Promise<void> {
    try {
      const health = await this.observability.getHealth().runHealthChecks();
      const metrics = this.observability.getMetrics().getAllMetrics();
      const errorStats = this.observability.getErrors().getErrorStats();
      const alertStats = this.observability.getAlerts().getAlertStats();
      const performanceStats = this.observability.getPerformance().getAllStats();

      this.dashboardData = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.env.npm_package_version || '1.0.0',
          environment: this.observability.getConfig().environment,
          nodeVersion: process.version,
        },
        health,
        metrics: this.formatMetricsForDashboard(metrics),
        performance: this.formatPerformanceForDashboard(performanceStats),
        errors: errorStats,
        alerts: alertStats,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  }

  // Format metrics for dashboard display
  private formatMetricsForDashboard(metrics: Map<string, MetricValue[]>): any {
    const formatted: any = {};
    
    for (const [name, values] of metrics.entries()) {
      if (values.length === 0) continue;
      
      const latest = values[values.length - 1];
      const previous = values.length > 1 ? values[values.length - 2] : null;
      
      formatted[name] = {
        current: latest.value,
        previous: previous?.value || 0,
        trend: previous ? (latest.value > previous.value ? 'up' : 'down') : 'stable',
        timestamp: latest.timestamp,
        unit: this.getMetricUnit(name),
      };
    }
    
    return formatted;
  }

  // Format performance data for dashboard
  private formatPerformanceForDashboard(stats: Map<string, any>): any {
    const formatted: any = {};
    
    for (const [name, stat] of stats.entries()) {
      formatted[name] = {
        count: stat.count,
        averageDuration: Math.round(stat.averageDuration),
        p95Duration: Math.round(stat.percentiles?.p95 || 0),
        errorRate: Math.round(stat.errorRate * 100),
        throughput: Math.round(stat.throughput * 100) / 100,
      };
    }
    
    return formatted;
  }

  // Get metric unit for display
  private getMetricUnit(metricName: string): string {
    if (metricName.includes('duration') || metricName.includes('latency')) return 'ms';
    if (metricName.includes('bytes') || metricName.includes('memory')) return 'bytes';
    if (metricName.includes('percent') || metricName.includes('rate')) return '%';
    if (metricName.includes('count') || metricName.includes('total')) return 'count';
    return '';
  }

  // Generate system status card
  private generateSystemCard(system: any): string {
    const uptimeHours = Math.floor((system.uptime || 0) / 3600);
    const memoryUsageMB = Math.round((system.memory?.heapUsed || 0) / 1024 / 1024);
    const memoryTotalMB = Math.round((system.memory?.heapTotal || 0) / 1024 / 1024);
    const memoryPercent = memoryTotalMB > 0 ? Math.round((memoryUsageMB / memoryTotalMB) * 100) : 0;

    return `
      <div class="card system-card">
        <h2>System Status</h2>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Uptime</div>
            <div class="stat-value">${uptimeHours}h</div>
          </div>
          <div class="stat">
            <div class="stat-label">Memory</div>
            <div class="stat-value">${memoryUsageMB}MB (${memoryPercent}%)</div>
          </div>
          <div class="stat">
            <div class="stat-label">Version</div>
            <div class="stat-value">${system.version || 'unknown'}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Environment</div>
            <div class="stat-value">${system.environment || 'unknown'}</div>
          </div>
        </div>
      </div>`;
  }

  // Generate health status card
  private generateHealthCard(health: any): string {
    const statusClass = health.status || 'unknown';
    const healthyChecks = (health.checks || []).filter((c: any) => c.status === 'healthy').length;
    const totalChecks = (health.checks || []).length;

    return `
      <div class="card health-card">
        <h2>Health Status</h2>
        <div class="health-status status-${statusClass}">
          <div class="status-indicator"></div>
          <div class="status-text">${health.status?.toUpperCase() || 'UNKNOWN'}</div>
        </div>
        <div class="health-summary">
          ${healthyChecks}/${totalChecks} checks passing
        </div>
        <div class="health-checks">
          ${(health.checks || []).map((check: any) => `
            <div class="health-check status-${check.status}">
              <span class="check-name">${check.name}</span>
              <span class="check-status">${check.status}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  // Generate metrics card
  private generateMetricsCard(metrics: any): string {
    const keyMetrics = [
      'ghostspeak_transactions_total',
      'ghostspeak_agents_total',
      'ghostspeak_messages_total',
      'ghostspeak_errors_total'
    ];

    return `
      <div class="card metrics-card">
        <h2>Key Metrics</h2>
        <div class="metrics-grid">
          ${keyMetrics.map(name => {
            const metric = metrics[name];
            if (!metric) return '';
            
            return `
              <div class="metric">
                <div class="metric-name">${this.formatMetricName(name)}</div>
                <div class="metric-value">
                  ${this.formatMetricValue(metric.current, metric.unit)}
                  <span class="metric-trend trend-${metric.trend}">
                    ${metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // Generate performance card
  private generatePerformanceCard(performance: any): string {
    const topOperations = Object.entries(performance)
      .sort(([,a]: any, [,b]: any) => b.count - a.count)
      .slice(0, 5);

    return `
      <div class="card performance-card">
        <h2>Performance</h2>
        <div class="performance-list">
          ${topOperations.map(([name, stats]: any) => `
            <div class="performance-item">
              <div class="performance-name">${name}</div>
              <div class="performance-stats">
                <span>Avg: ${stats.averageDuration}ms</span>
                <span>P95: ${stats.p95Duration}ms</span>
                <span>Errors: ${stats.errorRate}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  // Generate errors card
  private generateErrorsCard(errors: any): string {
    return `
      <div class="card errors-card">
        <h2>Errors</h2>
        <div class="error-stats">
          <div class="error-stat">
            <div class="error-stat-label">Total Errors</div>
            <div class="error-stat-value">${errors.totalErrors || 0}</div>
          </div>
          <div class="error-stat">
            <div class="error-stat-label">Unique Errors</div>
            <div class="error-stat-value">${errors.uniqueErrors || 0}</div>
          </div>
          <div class="error-stat">
            <div class="error-stat-label">Resolved</div>
            <div class="error-stat-value">${errors.resolvedErrors || 0}</div>
          </div>
        </div>
        <div class="top-components">
          <h3>Top Error Components</h3>
          ${(errors.topComponents || []).slice(0, 3).map((comp: any) => `
            <div class="component-error">
              <span class="component-name">${comp.component}</span>
              <span class="component-count">${comp.count}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  // Generate alerts card
  private generateAlertsCard(alerts: any): string {
    const criticalAlerts = alerts.alertsByLevel?.critical || 0;
    const warningAlerts = alerts.alertsByLevel?.warning || 0;
    const totalActive = alerts.activeAlerts || 0;

    return `
      <div class="card alerts-card">
        <h2>Alerts</h2>
        <div class="alert-summary">
          <div class="alert-level critical">
            <span class="alert-count">${criticalAlerts}</span>
            <span class="alert-label">Critical</span>
          </div>
          <div class="alert-level warning">
            <span class="alert-count">${warningAlerts}</span>
            <span class="alert-label">Warning</span>
          </div>
          <div class="alert-level info">
            <span class="alert-count">${totalActive - criticalAlerts - warningAlerts}</span>
            <span class="alert-label">Info</span>
          </div>
        </div>
      </div>`;
  }

  // Format metric name for display
  private formatMetricName(name: string): string {
    return name
      .replace('ghostspeak_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Format metric value for display
  private formatMetricValue(value: number, unit: string): string {
    if (unit === 'bytes') {
      if (value > 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)}GB`;
      if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
      if (value > 1024) return `${(value / 1024).toFixed(1)}KB`;
      return `${value}B`;
    }
    
    if (unit === 'ms') {
      if (value > 1000) return `${(value / 1000).toFixed(1)}s`;
      return `${value}ms`;
    }

    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }

    // Large numbers
    if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
    
    return value.toString();
  }

  // Get CSS styles
  private getCSS(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
        color: #333;
        line-height: 1.6;
      }
      
      .dashboard {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .dashboard-header {
        background: white;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .dashboard-header h1 {
        color: #2c3e50;
        font-size: 24px;
      }
      
      .last-updated {
        color: #666;
        font-size: 14px;
      }
      
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
      }
      
      .card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .card h2 {
        margin-bottom: 16px;
        color: #2c3e50;
        font-size: 18px;
        border-bottom: 2px solid #eee;
        padding-bottom: 8px;
      }
      
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .stat {
        text-align: center;
      }
      
      .stat-label {
        color: #666;
        font-size: 12px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      
      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #2c3e50;
      }
      
      .health-status {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 6px;
      }
      
      .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      
      .status-healthy .status-indicator { background: #27ae60; }
      .status-warning .status-indicator { background: #f39c12; }
      .status-critical .status-indicator { background: #e74c3c; }
      .status-unknown .status-indicator { background: #95a5a6; }
      
      .status-healthy { background: #d5f4e6; }
      .status-warning { background: #fef9e7; }
      .status-critical { background: #fadbd8; }
      .status-unknown { background: #eaeded; }
      
      .health-check {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .health-check:last-child {
        border-bottom: none;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      
      .metric {
        text-align: center;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
      }
      
      .metric-name {
        color: #666;
        font-size: 12px;
        margin-bottom: 4px;
      }
      
      .metric-value {
        font-size: 18px;
        font-weight: bold;
        color: #2c3e50;
      }
      
      .metric-trend {
        margin-left: 8px;
        font-size: 14px;
      }
      
      .trend-up { color: #27ae60; }
      .trend-down { color: #e74c3c; }
      .trend-stable { color: #95a5a6; }
      
      .performance-item {
        padding: 12px 0;
        border-bottom: 1px solid #eee;
      }
      
      .performance-item:last-child {
        border-bottom: none;
      }
      
      .performance-name {
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .performance-stats {
        font-size: 12px;
        color: #666;
      }
      
      .performance-stats span {
        margin-right: 12px;
      }
      
      .error-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 16px;
      }
      
      .error-stat {
        text-align: center;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
      }
      
      .error-stat-label {
        color: #666;
        font-size: 12px;
        margin-bottom: 4px;
      }
      
      .error-stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #e74c3c;
      }
      
      .component-error {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }
      
      .alert-summary {
        display: flex;
        justify-content: space-around;
      }
      
      .alert-level {
        text-align: center;
        padding: 12px;
        border-radius: 6px;
      }
      
      .alert-level.critical {
        background: #fadbd8;
        color: #e74c3c;
      }
      
      .alert-level.warning {
        background: #fef9e7;
        color: #f39c12;
      }
      
      .alert-level.info {
        background: #d5f4e6;
        color: #27ae60;
      }
      
      .alert-count {
        display: block;
        font-size: 24px;
        font-weight: bold;
      }
      
      .alert-label {
        font-size: 12px;
        text-transform: uppercase;
      }
      
      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
        
        .dashboard-header {
          flex-direction: column;
          gap: 10px;
        }
        
        .stat-grid,
        .metrics-grid,
        .error-stats {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  // Get JavaScript for interactive features
  private getJavaScript(): string {
    return `
      // Auto-refresh dashboard every 30 seconds
      setInterval(() => {
        window.location.reload();
      }, 30000);
      
      // Add click handlers for cards
      document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
          card.style.transform = card.style.transform === 'scale(1.02)' ? 'scale(1)' : 'scale(1.02)';
        });
      });
    `;
  }
}

// Dashboard data interface
interface DashboardData {
  system: any;
  health: any;
  metrics: any;
  performance: any;
  errors: any;
  alerts: any;
  lastUpdated: number;
}

// Export dashboard utilities
export function createDashboardServer(observability: ObservabilitySystem, port: number = 3001): any {
  const dashboard = new MonitoringDashboard(observability);
  dashboard.start();

  // Simple HTTP server for dashboard
  if (typeof require !== 'undefined') {
    const http = require('http');
    
    const server = http.createServer((req: any, res: any) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(dashboard.generateHTML());
    });

    server.listen(port, () => {
      console.log(`Dashboard server running at http://localhost:${port}`);
    });

    return { server, dashboard };
  }

  return { dashboard };
}