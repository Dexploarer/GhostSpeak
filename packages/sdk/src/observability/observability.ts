/**
 * Main observability system initialization and configuration
 */

import type { ObservabilityConfig } from './types';
import { DEFAULT_OBSERVABILITY_CONFIG, PRODUCTION_OBSERVABILITY_CONFIG } from './types';
import { LoggerFactory, StructuredLogger } from './logger';
import { MetricsCollector, getMetricsCollector } from './metrics';
import { TracingSystem, getTracer } from './tracing';
import { HealthMonitor, getHealthMonitor } from './monitoring';
import { ErrorTracker, getErrorTracker } from './error-tracking';
import { AnalyticsTracker, getAnalyticsTracker } from './analytics';
import { AlertingSystem, getAlertingSystem } from './alerts';
import { getPerformanceMonitor } from './performance';
import { getRemoteDebugger } from './debugging';

export class ObservabilitySystem {
  private config: ObservabilityConfig;
  private logger: StructuredLogger;
  private metrics: MetricsCollector;
  private tracer: TracingSystem;
  private health: HealthMonitor;
  private errors: ErrorTracker;
  private analytics: AnalyticsTracker;
  private alerts: AlertingSystem;
  private performance: any;
  private debugger: any;
  private initialized = false;

  constructor(config?: Partial<ObservabilityConfig>) {
    // Determine environment-specific config
    const baseConfig = process.env.NODE_ENV === 'production' 
      ? PRODUCTION_OBSERVABILITY_CONFIG 
      : DEFAULT_OBSERVABILITY_CONFIG;

    this.config = { ...baseConfig, ...config };
    
    // Initialize core components
    this.initializeComponents();
  }

  private initializeComponents(): void {
    try {
      // Initialize logger factory
      const loggerFactory = LoggerFactory.getInstance(this.config);
      this.logger = loggerFactory.createLogger('observability');

      this.logger.info(
        {
          config: this.config,
          environment: this.config.environment,
        },
        'Initializing GhostSpeak observability system'
      );

      // Initialize metrics
      this.metrics = getMetricsCollector();

      // Initialize tracing
      this.tracer = getTracer(this.config.samplingRate);

      // Initialize health monitoring
      this.health = getHealthMonitor();

      // Initialize error tracking
      this.errors = getErrorTracker(this.logger);

      // Initialize analytics
      this.analytics = getAnalyticsTracker(this.metrics);

      // Initialize alerting
      this.alerts = getAlertingSystem(this.logger, this.metrics);

      // Initialize performance monitoring
      this.performance = getPerformanceMonitor(this.metrics, this.logger);

      // Initialize debugger
      this.debugger = getRemoteDebugger(this.logger, this.tracer, this.errors);

      this.initialized = true;

      this.logger.info(
        {
          components: {
            logging: true,
            metrics: this.config.enableMetrics,
            tracing: this.config.enableTracing,
            health: this.config.enableHealthChecks,
            analytics: this.config.enableAnalytics,
            alerts: this.config.enableAlerts,
          },
        },
        'Observability system initialized successfully'
      );

      // Track system initialization
      if (this.config.enableAnalytics) {
        this.analytics.trackBusinessEvent(
          'system_initialized',
          1,
          'count',
          {
            environment: this.config.environment,
            version: process.env.npm_package_version || '1.0.0',
          }
        );
      }

    } catch (error) {
      console.error('Failed to initialize observability system:', error);
      throw error;
    }
  }

  // Get logger for component
  getLogger(component: string): StructuredLogger {
    this.ensureInitialized();
    const factory = LoggerFactory.getInstance();
    return factory.createLogger(component);
  }

  // Get metrics collector
  getMetrics(): MetricsCollector {
    this.ensureInitialized();
    return this.metrics;
  }

  // Get tracer
  getTracer(): TracingSystem {
    this.ensureInitialized();
    return this.tracer;
  }

  // Get health monitor
  getHealth(): HealthMonitor {
    this.ensureInitialized();
    return this.health;
  }

  // Get error tracker
  getErrors(): ErrorTracker {
    this.ensureInitialized();
    return this.errors;
  }

  // Get analytics tracker
  getAnalytics(): AnalyticsTracker {
    this.ensureInitialized();
    return this.analytics;
  }

  // Get alerting system
  getAlerts(): AlertingSystem {
    this.ensureInitialized();
    return this.alerts;
  }

  // Get performance monitor
  getPerformance(): any {
    this.ensureInitialized();
    return this.performance;
  }

  // Get debugger
  getDebugger(): any {
    this.ensureInitialized();
    return this.debugger;
  }

  // Get current configuration
  getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<ObservabilityConfig>): void {
    this.config = { ...this.config, ...updates };
    
    this.logger.info(
      { updates },
      'Observability configuration updated'
    );
  }

  // Setup Solana-specific monitoring
  setupSolanaMonitoring(rpcEndpoint: string, programId: string): void {
    this.ensureInitialized();

    const { SolanaHealthChecks } = require('./health');
    const { GhostSpeakHealthChecks } = require('./health');

    // Setup Solana health checks
    const solanaHealth = new SolanaHealthChecks(rpcEndpoint);
    solanaHealth.registerSolanaChecks();

    // Setup GhostSpeak protocol health checks
    const protocolHealth = new GhostSpeakHealthChecks(programId, rpcEndpoint);
    protocolHealth.registerProtocolChecks();

    this.logger.info(
      {
        rpcEndpoint,
        programId,
      },
      'Solana-specific monitoring configured'
    );
  }

  // Setup instrumentation for SDK operations
  instrumentSDK(): void {
    this.ensureInitialized();

    // Register SDK-specific metrics
    this.metrics.registerMetric({
      name: 'ghostspeak_sdk_operations_total',
      type: 'counter',
      description: 'Total SDK operations',
      labels: ['operation', 'status'],
    });

    this.metrics.registerMetric({
      name: 'ghostspeak_sdk_operation_duration',
      type: 'histogram',
      description: 'SDK operation duration',
      unit: 'milliseconds',
      labels: ['operation'],
    });

    // Setup operation-specific thresholds
    this.performance.setThreshold('sdk_agent_creation', {
      maxDuration: 10000, // 10 seconds
      maxMemory: 50 * 1024 * 1024, // 50MB
    });

    this.performance.setThreshold('sdk_transaction_send', {
      maxDuration: 30000, // 30 seconds
      maxMemory: 25 * 1024 * 1024, // 25MB
    });

    this.logger.info({}, 'SDK instrumentation configured');
  }

  // Start background monitoring
  startMonitoring(): void {
    this.ensureInitialized();

    // Start health check interval
    setInterval(async () => {
      if (this.config.enableHealthChecks) {
        await this.health.runHealthChecks();
      }
    }, 60000); // Every minute

    // Start metrics cleanup
    setInterval(() => {
      if (this.config.enableMetrics) {
        this.metrics.cleanup(this.config.retentionPeriodDays * 24 * 60 * 60 * 1000);
      }
    }, 60 * 60 * 1000); // Every hour

    // Start tracing cleanup
    setInterval(() => {
      if (this.config.enableTracing) {
        this.tracer.cleanup(24 * 60 * 60 * 1000); // 24 hours
      }
    }, 60 * 60 * 1000); // Every hour

    // Start alert cleanup
    setInterval(() => {
      if (this.config.enableAlerts) {
        this.alerts.cleanup(7 * 24 * 60 * 60 * 1000); // 7 days
      }
    }, 60 * 60 * 1000); // Every hour

    this.logger.info({}, 'Background monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.ensureInitialized();

    // Stop alerting evaluation
    this.alerts.stopEvaluation();

    // Stop debug server
    this.debugger.stopWebSocketServer();

    this.logger.info({}, 'Monitoring stopped');
  }

  // Generate comprehensive status report
  async generateStatusReport(): Promise<{
    system: any;
    health: any;
    metrics: any;
    errors: any;
    performance: any;
    alerts: any;
  }> {
    this.ensureInitialized();

    const [health] = await Promise.all([
      this.health.runHealthChecks(),
    ]);

    return {
      system: {
        initialized: this.initialized,
        config: this.config,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      },
      health,
      metrics: {
        total: this.metrics.getAllMetrics().size,
        recent: Object.keys(this.metrics.getMetricSummary('ghostspeak_uptime_seconds', 60000)),
      },
      errors: this.errors.getErrorStats(),
      performance: {
        stats: Array.from(this.performance.getAllStats().entries()).slice(0, 10),
        slow: this.performance.getSlowOperations(1000).length,
      },
      alerts: this.alerts.getAlertStats(),
    };
  }

  // Export data for external systems
  exportData(format: 'json' | 'prometheus' | 'jaeger' = 'json'): string {
    this.ensureInitialized();

    switch (format) {
      case 'prometheus':
        return this.metrics.exportPrometheus();
      
      case 'jaeger':
        return JSON.stringify(this.tracer.exportJaegerTraces(), null, 2);
      
      case 'json':
      default:
        return JSON.stringify({
          metrics: Array.from(this.metrics.getAllMetrics().entries()),
          traces: this.tracer.exportJaegerTraces(),
          errors: this.errors.getAllErrorSummaries(),
          analytics: this.analytics.getAnalyticsSummary(),
        }, null, 2);
    }
  }

  // Ensure system is initialized
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Observability system not initialized');
    }
  }
}

// Global observability instance
let globalObservability: ObservabilitySystem | null = null;

// Initialize global observability system
export function initializeObservability(config?: Partial<ObservabilityConfig>): ObservabilitySystem {
  if (globalObservability) {
    return globalObservability;
  }

  globalObservability = new ObservabilitySystem(config);
  return globalObservability;
}

// Get global observability instance
export function getObservability(): ObservabilitySystem {
  if (!globalObservability) {
    throw new Error('Observability system not initialized. Call initializeObservability() first.');
  }
  return globalObservability;
}

// Convenience functions for common operations
export function withObservability<T>(
  operation: string,
  fn: () => Promise<T> | T,
  component?: string
): Promise<T> {
  const obs = getObservability();
  const logger = obs.getLogger(component || 'sdk');
  const tracer = obs.getTracer();
  const performance = obs.getPerformance();

  return tracer.traceFunction(operation, component || 'sdk', async (span) => {
    const measurementId = performance.startMeasurement(operation, component);
    
    try {
      logger.debug({ operation }, `Starting ${operation}`);
      const result = await fn();
      
      performance.endMeasurement(measurementId);
      logger.debug({ operation }, `Completed ${operation}`);
      
      return result;
    } catch (error) {
      performance.endMeasurement(measurementId, { error: true });
      obs.getErrors().captureError(error as Error, {
        component: component || 'sdk',
        operation,
      });
      
      logger.error(
        { operation, error: error instanceof Error ? error.message : String(error) },
        `Failed ${operation}`
      );
      
      throw error;
    }
  });
}

// Decorator for automatic observability
export function observed(operation?: string, component?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;
    const componentName = component || target.constructor.name;
    
    descriptor.value = async function (...args: any[]) {
      return withObservability(operationName, () => method.apply(this, args), componentName);
    };
    
    return descriptor;
  };
}

// Export main types and utilities
export type { ObservabilityConfig } from './types';
export { DEFAULT_OBSERVABILITY_CONFIG, PRODUCTION_OBSERVABILITY_CONFIG } from './types';