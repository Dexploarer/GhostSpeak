/**
 * Centralized logging utility for GhostSpeak SDK
 * Provides structured logging with different levels and contexts
 */

import pino from 'pino';

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

// Configure pino based on environment
const pinoConfig: pino.LoggerOptions = {
  level: isTest ? 'error' : isDevelopment ? 'debug' : 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        messageFormat: '{component} {msg}',
      },
    },
  }),
  ...(isProduction && {
    // Production optimizations
    redact: ['secret', 'password', 'token', 'key', 'privateKey'],
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  }),
};

// Create base logger
const baseLogger = pino(pinoConfig);

// Logger factory for different components
export const createLogger = (component: string) => {
  return baseLogger.child({ component });
};

// Predefined loggers for main components
export const logger = {
  agent: createLogger('agent'),
  auction: createLogger('auction'),
  escrow: createLogger('escrow'),
  marketplace: createLogger('marketplace'),
  message: createLogger('message'),
  channel: createLogger('channel'),
  analytics: createLogger('analytics'),
  transaction: createLogger('transaction'),
  compression: createLogger('compression'),
  security: createLogger('security'),
  bridge: createLogger('bridge'),
  reputation: createLogger('reputation'),
  general: createLogger('general'),
};

// Utility functions for common logging patterns
export const logTransactionStart = (
  component: string,
  operation: string,
  params?: Record<string, unknown>
) => {
  const log = createLogger(component);
  log.info({ operation, params }, `Starting ${operation}`);
};

export const logTransactionSuccess = (
  component: string,
  operation: string,
  result?: Record<string, unknown>
) => {
  const log = createLogger(component);
  log.info({ operation, result }, `Successfully completed ${operation}`);
};

export const logTransactionError = (
  component: string,
  operation: string,
  error: Error,
  context?: Record<string, unknown>
) => {
  const log = createLogger(component);
  log.error(
    { operation, error: error.message, context },
    `Failed ${operation}`
  );
};

export const logPerformanceMetric = (
  component: string,
  metric: string,
  value: number,
  unit: string = 'ms'
) => {
  const log = createLogger(component);
  log.debug({ metric, value, unit }, `Performance metric: ${metric}`);
};

// Type-safe logging interface
export interface LogContext {
  operation?: string;
  agentId?: string;
  channelId?: string;
  messageId?: string;
  auctionId?: string;
  escrowId?: string;
  transactionId?: string;
  userId?: string;
  error?: Error;
  duration?: number;
  [key: string]: unknown;
}

export const logWithContext = (
  component: string,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context: LogContext = {}
) => {
  const log = createLogger(component);
  log[level](context, message);
};

// Export default logger for backward compatibility
export default logger;
