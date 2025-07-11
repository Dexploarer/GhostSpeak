import { existsSync } from 'fs';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private verbose: boolean;
  private readonly logFile?: string;
  private logs: LogEntry[] = [];
  
  // Add general logger property for compatibility
  public readonly general = {
    info: (message: string, context?: Record<string, unknown>) => {
      this.info(message, context);
    },
    error: (message: string, context?: Record<string, unknown>) => {
      this.error(message, context);
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      this.warn(message, context);
    },
    debug: (message: string, context?: Record<string, unknown>) => {
      this.debug(message, context);
    },
  };

  constructor(verbose: boolean = false, logFile?: string) {
    this.verbose = verbose;
    this.logFile = logFile || join(homedir(), '.ghostspeak', 'logs', 'cli.log');
  }

  private async ensureLogDirectory(): Promise<void> {
    if (this.logFile) {
      const logDir = dirname(this.logFile);
      if (!existsSync(logDir)) {
        await mkdir(logDir, { recursive: true });
      }
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    // For CLI output, we don't need timestamps - just the formatted message
    return message;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.logFile) return;

    try {
      await this.ensureLogDirectory();

      const logLine = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
      const contextLine = entry.context
        ? ` | Context: ${JSON.stringify(entry.context)}`
        : '';

      await appendFile(this.logFile, `${logLine}${contextLine}\n`, 'utf8');
    } catch (error) {
      // Silently fail file logging to avoid infinite loops
      if (this.verbose) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    // Store in memory
    this.logs.push(entry);

    // Console output based on level and verbose setting - do this FIRST and synchronously
    const shouldOutput =
      this.verbose || ['warn', 'error', 'success'].includes(level);

    if (shouldOutput) {
      console.log(this.formatMessage(level, message));

      if (context && this.verbose) {
        console.log(chalk.gray('Context:'), context);
      }
    }

    // Write to file asynchronously (don't await to avoid blocking)
    this.writeToFile(entry).catch(() => {
      // Silently fail file logging
    });
  }

  debug(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('error', message, context);
  }

  success(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('success', message, context);
  }

  // Utility methods
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  isVerbose(): boolean {
    return this.verbose;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }

  async exportLogs(filePath?: string): Promise<string> {
    const exportPath =
      filePath || join(homedir(), '.ghostspeak', 'exported-logs.json');
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs,
    };

    await this.ensureLogDirectory();
    await writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');

    return exportPath;
  }

  // Specialized logging methods
  async logTransaction(
    transactionId: string,
    status: 'pending' | 'confirmed' | 'failed',
    details?: Record<string, unknown>
  ): Promise<void> {
    const message = `Transaction ${transactionId}: ${status}`;
    const context = { transactionId, status, ...details };

    switch (status) {
      case 'pending':
        await this.info(message, context);
        break;
      case 'confirmed':
        await this.success(message, context);
        break;
      case 'failed':
        await this.error(message, context);
        break;
    }
  }

  async logAgentAction(
    agentName: string,
    action: string,
    result: 'success' | 'failure',
    details?: Record<string, unknown>
  ): Promise<void> {
    const message = `Agent ${agentName} ${action}: ${result}`;
    const context = { agentName, action, result, ...details };

    if (result === 'success') {
      await this.success(message, context);
    } else {
      await this.error(message, context);
    }
  }

  async logNetworkEvent(
    event: string,
    network: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const message = `Network ${network}: ${event}`;
    const context = { event, network, ...details };

    await this.info(message, context);
  }

  // Performance logging
  startTimer(label: string): () => Promise<void> {
    const startTime = Date.now();

    return async () => {
      const duration = Date.now() - startTime;
      await this.debug(`Timer ${label}: ${duration}ms`, { label, duration });
    };
  }

  async logPerformance(
    operation: string,
    duration: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    const message = `Performance ${operation}: ${duration}ms`;
    const context = { operation, duration, ...details };

    if (duration > 5000) {
      // Warn if operation takes more than 5 seconds
      await this.warn(message, context);
    } else {
      await this.debug(message, context);
    }
  }
}
