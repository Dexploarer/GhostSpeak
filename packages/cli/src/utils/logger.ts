/**
 * Centralized logging utility for GhostSpeak CLI
 * Provides structured logging with different levels and contexts
 */

import pino from 'pino';

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';
const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

// Configure pino based on environment
const pinoConfig: pino.LoggerOptions = {
  level: isTest ? 'error' : isVerbose ? 'debug' : 'warn',
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
  cli: createLogger('cli'),
  command: createLogger('command'),
  config: createLogger('config'),
  ui: createLogger('ui'),
  agent: createLogger('agent'),
  marketplace: createLogger('marketplace'),
  dev: createLogger('dev'),
  status: createLogger('status'),
  general: createLogger('general'),
};

// Utility functions for common logging patterns
export const logCommandStart = (
  command: string,
  params?: Record<string, unknown>
) => {
  const log = createLogger('command');
  log.info({ command, params }, `Starting command: ${command}`);
};

export const logCommandSuccess = (
  command: string,
  result?: Record<string, unknown>
) => {
  const log = createLogger('command');
  log.info({ command, result }, `Successfully completed command: ${command}`);
};

export const logCommandError = (
  command: string,
  error: Error,
  context?: Record<string, unknown>
) => {
  const log = createLogger('command');
  log.error(
    { command, error: error.message, context },
    `Command failed: ${command}`
  );
};

// Type-safe logging interface
export interface LogContext {
  command?: string;
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
