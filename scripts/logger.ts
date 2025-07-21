#!/usr/bin/env tsx

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const logColors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  http: 'magenta',
  verbose: 'grey',
  debug: 'white',
  silly: 'rainbow'
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, module = 'APP', ...meta } = info;
    
    let logMessage = `[${timestamp}] [${module}] ${level}: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the winston logger
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { 
    service: 'ghostspeak',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      tailable: true
    }),
    
    // File transport for application logs (info and above)
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 2
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 2
    })
  ]
});

// Enhanced logger with additional methods
class GhostSpeakLogger {
  private winston: winston.Logger;
  private context: string;

  constructor(context: string = 'APP') {
    this.winston = logger;
    this.context = context;
  }

  // Create child logger with context
  child(context: string): GhostSpeakLogger {
    return new GhostSpeakLogger(`${this.context}:${context}`);
  }

  // Standard log methods
  error(message: string, error?: Error | unknown, metadata?: object): void {
    const meta = { module: this.context, ...metadata };
    
    if (error instanceof Error) {
      this.winston.error(message, { 
        ...meta,
        stack: error.stack,
        errorMessage: error.message,
        errorName: error.name
      });
    } else if (error) {
      this.winston.error(message, { ...meta, error: String(error) });
    } else {
      this.winston.error(message, meta);
    }
  }

  warn(message: string, metadata?: object): void {
    this.winston.warn(message, { module: this.context, ...metadata });
  }

  info(message: string, metadata?: object): void {
    this.winston.info(message, { module: this.context, ...metadata });
  }

  debug(message: string, metadata?: object): void {
    this.winston.debug(message, { module: this.context, ...metadata });
  }

  verbose(message: string, metadata?: object): void {
    this.winston.verbose(message, { module: this.context, ...metadata });
  }

  // Specialized logging methods
  blockchain(message: string, metadata?: object): void {
    this.winston.info(`[BLOCKCHAIN] ${message}`, { 
      module: this.context, 
      category: 'blockchain',
      ...metadata 
    });
  }

  transaction(message: string, txId?: string, metadata?: object): void {
    this.winston.info(`[TX] ${message}`, { 
      module: this.context, 
      category: 'transaction',
      transactionId: txId,
      ...metadata 
    });
  }

  performance(message: string, duration?: number, metadata?: object): void {
    this.winston.info(`[PERF] ${message}`, { 
      module: this.context, 
      category: 'performance',
      durationMs: duration,
      ...metadata 
    });
  }

  security(message: string, metadata?: object): void {
    this.winston.warn(`[SECURITY] ${message}`, { 
      module: this.context, 
      category: 'security',
      ...metadata 
    });
  }

  // Metrics logging
  metric(name: string, value: number, unit?: string, metadata?: object): void {
    this.winston.info(`[METRIC] ${name}: ${value}${unit || ''}`, {
      module: this.context,
      category: 'metrics',
      metricName: name,
      metricValue: value,
      metricUnit: unit,
      ...metadata
    });
  }

  // Request logging
  request(method: string, url: string, statusCode: number, duration: number, metadata?: object): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    this.winston.log(level, `[HTTP] ${method} ${url} ${statusCode} ${duration}ms`, {
      module: this.context,
      category: 'http',
      method,
      url,
      statusCode,
      duration,
      ...metadata
    });
  }

  // Development helpers
  trace(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      this.winston.debug(`[TRACE] ${message}`, {
        module: this.context,
        category: 'trace',
        data: data ? JSON.stringify(data, null, 2) : undefined
      });
    }
  }

  // Critical system events
  critical(message: string, metadata?: object): void {
    this.winston.error(`[CRITICAL] ${message}`, {
      module: this.context,
      category: 'critical',
      ...metadata
    });
    
    // In production, this might trigger alerts
    if (process.env.NODE_ENV === 'production') {
      console.error(chalk.red.bold(`🚨 CRITICAL: ${message}`));
    }
  }

  // Deployment events
  deployment(message: string, environment: string, metadata?: object): void {
    this.winston.info(`[DEPLOY] ${message}`, {
      module: this.context,
      category: 'deployment',
      environment,
      ...metadata
    });
  }

  // Health check results
  health(service: string, status: 'healthy' | 'degraded' | 'down', metadata?: object): void {
    const level = status === 'down' ? 'error' : status === 'degraded' ? 'warn' : 'info';
    
    this.winston.log(level, `[HEALTH] ${service}: ${status.toUpperCase()}`, {
      module: this.context,
      category: 'health',
      service,
      status,
      ...metadata
    });
  }

  // Audit trail
  audit(action: string, user: string, metadata?: object): void {
    this.winston.info(`[AUDIT] ${user} performed ${action}`, {
      module: this.context,
      category: 'audit',
      action,
      user,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
}

// Create default logger instance
const defaultLogger = new GhostSpeakLogger();

// Export both the class and default instance
export { GhostSpeakLogger, defaultLogger as logger };
export default defaultLogger;

// Example usage and testing function
export function testLogger(): void {
  const testLogger = new GhostSpeakLogger('TEST');
  
  console.log(chalk.blue('\n🧪 Testing GhostSpeak Logger...'));
  
  testLogger.info('Logger test started');
  testLogger.debug('Debug message with metadata', { testData: 'example' });
  testLogger.warn('Warning message', { component: 'test-suite' });
  testLogger.error('Error message', new Error('Test error'), { context: 'testing' });
  
  testLogger.blockchain('Program deployed successfully', { programId: 'test123' });
  testLogger.transaction('Transaction confirmed', 'tx456', { slot: 12345 });
  testLogger.performance('Operation completed', 1250, { operation: 'build' });
  testLogger.metric('response_time', 85, 'ms', { endpoint: '/health' });
  
  const childLogger = testLogger.child('CHILD');
  childLogger.info('Child logger message');
  
  console.log(chalk.green('✅ Logger test completed - check logs/ directory'));
}