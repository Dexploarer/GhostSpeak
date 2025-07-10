/**
 * System monitoring and health checks
 */

import type { HealthCheck, HealthStatus, SystemHealth, MonitoringEvent } from './types';
import { MetricsCollector } from './metrics';

export class HealthMonitor {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private lastResults: Map<string, HealthCheck> = new Map();
  private startTime = Date.now();

  constructor() {
    this.registerCoreHealthChecks();
  }

  // Register a health check
  registerCheck(name: string, check: () => Promise<HealthCheck>): void {
    this.checks.set(name, check);
  }

  // Run all health checks
  async runHealthChecks(): Promise<SystemHealth> {
    const results: HealthCheck[] = [];
    
    for (const [name, checkFn] of this.checks.entries()) {
      try {
        const start = Date.now();
        const result = await Promise.race([
          checkFn(),
          new Promise<HealthCheck>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        result.duration = Date.now() - start;
        results.push(result);
        this.lastResults.set(name, result);
      } catch (error) {
        const failedCheck: HealthCheck = {
          name,
          status: 'critical',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          duration: 5000, // Timeout duration
        };
        results.push(failedCheck);
        this.lastResults.set(name, failedCheck);
      }
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(results);
    
    return {
      status: overallStatus,
      checks: results,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  // Run a specific health check
  async runCheck(name: string): Promise<HealthCheck> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      throw new Error(`Health check not found: ${name}`);
    }

    try {
      const start = Date.now();
      const result = await checkFn();
      result.duration = Date.now() - start;
      this.lastResults.set(name, result);
      return result;
    } catch (error) {
      const failedCheck: HealthCheck = {
        name,
        status: 'critical',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
      this.lastResults.set(name, failedCheck);
      return failedCheck;
    }
  }

  // Get last health check results
  getLastResults(): Map<string, HealthCheck> {
    return new Map(this.lastResults);
  }

  // Get specific check result
  getCheckResult(name: string): HealthCheck | undefined {
    return this.lastResults.get(name);
  }

  // Determine overall system status
  private determineOverallStatus(checks: HealthCheck[]): HealthStatus {
    if (checks.some(check => check.status === 'critical')) {
      return 'critical';
    }
    if (checks.some(check => check.status === 'warning')) {
      return 'warning';
    }
    if (checks.every(check => check.status === 'healthy')) {
      return 'healthy';
    }
    return 'unknown';
  }

  // Register core health checks
  private registerCoreHealthChecks(): void {
    // Memory usage check
    this.registerCheck('memory', async (): Promise<HealthCheck> => {
      const memUsage = process.memoryUsage();
      const usedMB = memUsage.heapUsed / 1024 / 1024;
      const totalMB = memUsage.heapTotal / 1024 / 1024;
      const usage = (usedMB / totalMB) * 100;

      let status: HealthStatus = 'healthy';
      let message = `Memory usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (${usage.toFixed(1)}%)`;

      if (usage > 90) {
        status = 'critical';
        message += ' - Critical memory usage';
      } else if (usage > 75) {
        status = 'warning';
        message += ' - High memory usage';
      }

      return {
        name: 'memory',
        status,
        message,
        timestamp: Date.now(),
        metadata: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
          usagePercent: usage,
        },
      };
    });

    // CPU usage check (approximate)
    this.registerCheck('cpu', async (): Promise<HealthCheck> => {
      const start = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const end = process.cpuUsage(start);
      
      const userUsage = (end.user / 1000000) * 10; // Convert to percentage
      const systemUsage = (end.system / 1000000) * 10;
      const totalUsage = userUsage + systemUsage;

      let status: HealthStatus = 'healthy';
      let message = `CPU usage: ${totalUsage.toFixed(1)}% (user: ${userUsage.toFixed(1)}%, system: ${systemUsage.toFixed(1)}%)`;

      if (totalUsage > 90) {
        status = 'critical';
        message += ' - Critical CPU usage';
      } else if (totalUsage > 75) {
        status = 'warning';
        message += ' - High CPU usage';
      }

      return {
        name: 'cpu',
        status,
        message,
        timestamp: Date.now(),
        metadata: {
          userUsage,
          systemUsage,
          totalUsage,
        },
      };
    });

    // Node.js event loop lag check
    this.registerCheck('eventloop', async (): Promise<HealthCheck> => {
      const start = Date.now();
      await new Promise(resolve => setImmediate(resolve));
      const lag = Date.now() - start;

      let status: HealthStatus = 'healthy';
      let message = `Event loop lag: ${lag}ms`;

      if (lag > 100) {
        status = 'critical';
        message += ' - Critical event loop lag';
      } else if (lag > 50) {
        status = 'warning';
        message += ' - High event loop lag';
      }

      return {
        name: 'eventloop',
        status,
        message,
        timestamp: Date.now(),
        metadata: { lag },
      };
    });

    // Process uptime check
    this.registerCheck('uptime', async (): Promise<HealthCheck> => {
      const uptime = process.uptime();
      const message = `Process uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

      return {
        name: 'uptime',
        status: 'healthy',
        message,
        timestamp: Date.now(),
        metadata: { uptime },
      };
    });
  }
}

// System metrics collector
export class SystemMetrics {
  private metricsCollector: MetricsCollector;
  private collectInterval: NodeJS.Timer | null = null;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  // Start collecting system metrics
  startCollection(intervalMs: number = 30000): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
    }

    this.collectInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    // Collect initial metrics
    this.collectSystemMetrics();
  }

  // Stop collecting metrics
  stopCollection(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
  }

  // Collect system metrics
  private collectSystemMetrics(): void {
    // Memory metrics
    const memUsage = process.memoryUsage();
    this.metricsCollector.setGauge('ghostspeak_memory_usage_bytes', memUsage.heapUsed);
    this.metricsCollector.setGauge('ghostspeak_memory_total_bytes', memUsage.heapTotal);
    this.metricsCollector.setGauge('ghostspeak_memory_external_bytes', memUsage.external);
    this.metricsCollector.setGauge('ghostspeak_memory_rss_bytes', memUsage.rss);

    // CPU metrics (approximation)
    const cpuUsage = process.cpuUsage();
    this.metricsCollector.setGauge('ghostspeak_cpu_user_microseconds', cpuUsage.user);
    this.metricsCollector.setGauge('ghostspeak_cpu_system_microseconds', cpuUsage.system);

    // Process metrics
    this.metricsCollector.setGauge('ghostspeak_uptime_seconds', process.uptime());
    this.metricsCollector.setGauge('ghostspeak_process_pid', process.pid);

    // Event loop lag
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      this.metricsCollector.setGauge('ghostspeak_eventloop_lag_milliseconds', lag);
    });
  }
}

// Resource monitor for tracking resource usage
export class ResourceMonitor {
  private resources: Map<string, number> = new Map();
  private limits: Map<string, number> = new Map();
  private callbacks: Map<string, (usage: number, limit: number) => void> = new Map();

  // Set resource limit
  setLimit(resource: string, limit: number): void {
    this.limits.set(resource, limit);
  }

  // Update resource usage
  updateUsage(resource: string, usage: number): void {
    const oldUsage = this.resources.get(resource) || 0;
    this.resources.set(resource, usage);

    // Check if limit exceeded
    const limit = this.limits.get(resource);
    if (limit && usage > limit) {
      const callback = this.callbacks.get(resource);
      if (callback) {
        callback(usage, limit);
      }
    }
  }

  // Register callback for resource limit violations
  onLimitExceeded(resource: string, callback: (usage: number, limit: number) => void): void {
    this.callbacks.set(resource, callback);
  }

  // Get resource usage
  getUsage(resource: string): number {
    return this.resources.get(resource) || 0;
  }

  // Get resource limit
  getLimit(resource: string): number | undefined {
    return this.limits.get(resource);
  }

  // Get usage percentage
  getUsagePercentage(resource: string): number {
    const usage = this.getUsage(resource);
    const limit = this.getLimit(resource);
    return limit ? (usage / limit) * 100 : 0;
  }

  // Get all resource statuses
  getAllStatuses(): Array<{
    resource: string;
    usage: number;
    limit?: number;
    percentage?: number;
    exceeded: boolean;
  }> {
    const statuses: Array<{
      resource: string;
      usage: number;
      limit?: number;
      percentage?: number;
      exceeded: boolean;
    }> = [];

    for (const [resource, usage] of this.resources.entries()) {
      const limit = this.limits.get(resource);
      const percentage = limit ? (usage / limit) * 100 : undefined;
      const exceeded = limit ? usage > limit : false;

      statuses.push({
        resource,
        usage,
        limit,
        percentage,
        exceeded,
      });
    }

    return statuses;
  }
}

// Application state monitor
export class ApplicationMonitor {
  private state: Map<string, any> = new Map();
  private watchers: Map<string, (oldValue: any, newValue: any) => void> = new Map();

  // Set application state
  setState(key: string, value: any): void {
    const oldValue = this.state.get(key);
    this.state.set(key, value);

    // Notify watchers
    const watcher = this.watchers.get(key);
    if (watcher && oldValue !== value) {
      watcher(oldValue, value);
    }
  }

  // Get application state
  getState(key: string): any {
    return this.state.get(key);
  }

  // Watch state changes
  watchState(key: string, callback: (oldValue: any, newValue: any) => void): void {
    this.watchers.set(key, callback);
  }

  // Get all state
  getAllState(): Map<string, any> {
    return new Map(this.state);
  }

  // Remove state
  removeState(key: string): void {
    this.state.delete(key);
    this.watchers.delete(key);
  }
}

// Monitoring event emitter
export class MonitoringEventEmitter {
  private listeners: Map<string, Array<(event: MonitoringEvent) => void>> = new Map();

  // Emit monitoring event
  emit(event: MonitoringEvent): void {
    const eventListeners = this.listeners.get(event.type) || [];
    eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in monitoring event listener:', error);
      }
    });
  }

  // Add event listener
  on(eventType: string, listener: (event: MonitoringEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  // Remove event listener
  off(eventType: string, listener: (event: MonitoringEvent) => void): void {
    const eventListeners = this.listeners.get(eventType) || [];
    const index = eventListeners.indexOf(listener);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  // Remove all listeners for event type
  removeAllListeners(eventType: string): void {
    this.listeners.delete(eventType);
  }
}

// Singleton instances
let healthMonitorInstance: HealthMonitor | null = null;
let resourceMonitorInstance: ResourceMonitor | null = null;
let applicationMonitorInstance: ApplicationMonitor | null = null;
let eventEmitterInstance: MonitoringEventEmitter | null = null;

export const getHealthMonitor = (): HealthMonitor => {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor();
  }
  return healthMonitorInstance;
};

export const getResourceMonitor = (): ResourceMonitor => {
  if (!resourceMonitorInstance) {
    resourceMonitorInstance = new ResourceMonitor();
  }
  return resourceMonitorInstance;
};

export const getApplicationMonitor = (): ApplicationMonitor => {
  if (!applicationMonitorInstance) {
    applicationMonitorInstance = new ApplicationMonitor();
  }
  return applicationMonitorInstance;
};

export const getMonitoringEventEmitter = (): MonitoringEventEmitter => {
  if (!eventEmitterInstance) {
    eventEmitterInstance = new MonitoringEventEmitter();
  }
  return eventEmitterInstance;
};