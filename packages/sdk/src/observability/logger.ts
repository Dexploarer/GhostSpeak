/**
 * Enhanced logging system with structured logging, correlation IDs, and log aggregation
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import type { LogContext, ObservabilityConfig } from './types';

export class StructuredLogger {
  private logger: pino.Logger;
  private correlationId: string;
  private config: ObservabilityConfig;

  constructor(config: ObservabilityConfig, component: string) {
    this.config = config;
    this.correlationId = uuidv4();
    
    const pinoConfig: pino.LoggerOptions = {
      level: config.logLevel,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => ({
          ...object,
          correlationId: this.correlationId,
          environment: config.environment,
          timestamp: new Date().toISOString(),
        }),
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
      redact: {
        paths: [
          'secret',
          'password',
          'token',
          'key',
          'privateKey',
          'authorization',
          'cookie',
          'credentials',
        ],
        remove: true,
      },
    };

    // Environment-specific configuration
    if (config.environment === 'development') {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '[{component}] {msg}',
        },
      };
    }

    this.logger = pino(pinoConfig).child({ component });
  }

  // Create child logger with additional context
  child(context: Record<string, unknown>): StructuredLogger {
    const childLogger = new StructuredLogger(this.config, context.component as string || 'child');
    childLogger.logger = this.logger.child(context);
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }

  // Set correlation ID for request tracking
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  // Get current correlation ID
  getCorrelationId(): string {
    return this.correlationId;
  }

  // Structured logging methods
  debug(context: LogContext, message: string): void {
    this.logger.debug(this.enrichContext(context), message);
  }

  info(context: LogContext, message: string): void {
    this.logger.info(this.enrichContext(context), message);
  }

  warn(context: LogContext, message: string): void {
    this.logger.warn(this.enrichContext(context), message);
  }

  error(context: LogContext, message: string): void {
    this.logger.error(this.enrichContext(context), message);
  }

  fatal(context: LogContext, message: string): void {
    this.logger.fatal(this.enrichContext(context), message);
  }

  // Specialized logging methods
  logTransaction(
    operation: string,
    phase: 'start' | 'success' | 'error',
    context: LogContext = {}
  ): void {
    const enrichedContext = {
      ...context,
      operation,
      phase,
      transactionId: context.transactionId || uuidv4(),
    };

    switch (phase) {
      case 'start':
        this.info(enrichedContext, `Transaction started: ${operation}`);
        break;
      case 'success':
        this.info(enrichedContext, `Transaction completed: ${operation}`);
        break;
      case 'error':
        this.error(enrichedContext, `Transaction failed: ${operation}`);
        break;
    }
  }

  logPerformance(
    operation: string,
    duration: number,
    context: LogContext = {}
  ): void {
    this.debug(
      {
        ...context,
        operation,
        duration,
        performance: true,
      },
      `Performance: ${operation} took ${duration}ms`
    );
  }

  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: LogContext = {}
  ): void {
    const enrichedContext = {
      ...context,
      securityEvent: event,
      severity,
      security: true,
    };

    if (severity === 'critical' || severity === 'high') {
      this.error(enrichedContext, `Security event: ${event}`);
    } else if (severity === 'medium') {
      this.warn(enrichedContext, `Security event: ${event}`);
    } else {
      this.info(enrichedContext, `Security event: ${event}`);
    }
  }

  logBusinessEvent(
    event: string,
    value?: number,
    context: LogContext = {}
  ): void {
    this.info(
      {
        ...context,
        businessEvent: event,
        value,
        business: true,
      },
      `Business event: ${event}${value ? ` (value: ${value})` : ''}`
    );
  }

  // Enrich context with standard fields
  private enrichContext(context: LogContext): LogContext {
    return {
      ...context,
      correlationId: this.correlationId,
      timestamp: Date.now(),
      environment: this.config.environment,
    };
  }
}

// Log aggregation and correlation
export class LogAggregator {
  private logs: Map<string, LogContext[]> = new Map();
  private retentionMs: number;

  constructor(retentionDays: number = 7) {
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    this.startCleanupInterval();
  }

  // Add log to aggregation
  addLog(correlationId: string, log: LogContext): void {
    if (!this.logs.has(correlationId)) {
      this.logs.set(correlationId, []);
    }
    this.logs.get(correlationId)!.push(log);
  }

  // Get logs by correlation ID
  getLogs(correlationId: string): LogContext[] {
    return this.logs.get(correlationId) || [];
  }

  // Get logs by operation
  getLogsByOperation(operation: string): LogContext[] {
    const results: LogContext[] = [];
    for (const logs of this.logs.values()) {
      results.push(...logs.filter(log => log.operation === operation));
    }
    return results;
  }

  // Get logs by component
  getLogsByComponent(component: string): LogContext[] {
    const results: LogContext[] = [];
    for (const logs of this.logs.values()) {
      results.push(...logs.filter(log => log.component === component));
    }
    return results;
  }

  // Get error logs
  getErrorLogs(): LogContext[] {
    const results: LogContext[] = [];
    for (const logs of this.logs.values()) {
      results.push(...logs.filter(log => log.error));
    }
    return results;
  }

  // Get performance logs
  getPerformanceLogs(): LogContext[] {
    const results: LogContext[] = [];
    for (const logs of this.logs.values()) {
      results.push(...logs.filter(log => log.duration !== undefined));
    }
    return results;
  }

  // Clean up old logs
  private startCleanupInterval(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.retentionMs;
      for (const [correlationId, logs] of this.logs.entries()) {
        const filteredLogs = logs.filter(log => 
          (log.timestamp || 0) > cutoff
        );
        if (filteredLogs.length === 0) {
          this.logs.delete(correlationId);
        } else {
          this.logs.set(correlationId, filteredLogs);
        }
      }
    }, 60 * 60 * 1000); // Run cleanup every hour
  }

  // Get statistics
  getStats(): {
    totalLogs: number;
    correlationIds: number;
    errorCount: number;
    avgLogsPerCorrelation: number;
  } {
    let totalLogs = 0;
    let errorCount = 0;

    for (const logs of this.logs.values()) {
      totalLogs += logs.length;
      errorCount += logs.filter(log => log.error).length;
    }

    return {
      totalLogs,
      correlationIds: this.logs.size,
      errorCount,
      avgLogsPerCorrelation: this.logs.size > 0 ? totalLogs / this.logs.size : 0,
    };
  }
}

// Factory for creating loggers
export class LoggerFactory {
  private static instance: LoggerFactory;
  private config: ObservabilityConfig;
  private aggregator: LogAggregator;

  private constructor(config: ObservabilityConfig) {
    this.config = config;
    this.aggregator = new LogAggregator(config.retentionPeriodDays);
  }

  static getInstance(config?: ObservabilityConfig): LoggerFactory {
    if (!LoggerFactory.instance && config) {
      LoggerFactory.instance = new LoggerFactory(config);
    }
    return LoggerFactory.instance;
  }

  createLogger(component: string): StructuredLogger {
    return new StructuredLogger(this.config, component);
  }

  getAggregator(): LogAggregator {
    return this.aggregator;
  }
}

// Predefined logger instances
export const createComponentLogger = (component: string, config?: ObservabilityConfig): StructuredLogger => {
  const factory = LoggerFactory.getInstance(config);
  return factory.createLogger(component);
};

// Export convenience functions
export const logTransaction = (
  logger: StructuredLogger,
  operation: string,
  phase: 'start' | 'success' | 'error',
  context?: LogContext
): void => {
  logger.logTransaction(operation, phase, context);
};

export const logPerformance = (
  logger: StructuredLogger,
  operation: string,
  duration: number,
  context?: LogContext
): void => {
  logger.logPerformance(operation, duration, context);
};

export const logSecurity = (
  logger: StructuredLogger,
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context?: LogContext
): void => {
  logger.logSecurity(event, severity, context);
};