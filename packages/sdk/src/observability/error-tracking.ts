/**
 * Error tracking, aggregation, and debugging tools
 */

import { v4 as uuidv4 } from 'uuid';
import type { ErrorContext, ErrorBreadcrumb, ErrorSummary } from './types';
import { StructuredLogger } from './logger';

export class ErrorTracker {
  private errors: Map<string, ErrorContext[]> = new Map();
  private summaries: Map<string, ErrorSummary> = new Map();
  private breadcrumbs: Map<string, ErrorBreadcrumb[]> = new Map();
  private maxBreadcrumbs = 50;
  private maxErrors = 1000;
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  // Capture error with context
  captureError(error: Error, context: Partial<ErrorContext> = {}): string {
    const errorId = uuidv4();
    const fingerprint = this.generateFingerprint(error, context);
    const timestamp = Date.now();

    const errorContext: ErrorContext = {
      error,
      component: context.component || 'unknown',
      operation: context.operation,
      agentId: context.agentId,
      userId: context.userId,
      requestId: context.requestId,
      timestamp,
      stackTrace: error.stack,
      breadcrumbs: this.getBreadcrumbs(context.requestId),
      metadata: context.metadata || {},
      tags: context.tags || [],
      fingerprint,
    };

    // Store error
    if (!this.errors.has(fingerprint)) {
      this.errors.set(fingerprint, []);
    }
    this.errors.get(fingerprint)!.push(errorContext);

    // Update or create summary
    this.updateErrorSummary(fingerprint, errorContext);

    // Log error
    this.logger.error(
      {
        errorId,
        fingerprint,
        component: errorContext.component,
        operation: errorContext.operation,
        error: error,
        metadata: errorContext.metadata,
        tags: errorContext.tags,
      },
      `Error captured: ${error.message}`
    );

    // Cleanup old errors if needed
    this.cleanup();

    return errorId;
  }

  // Add breadcrumb for debugging context
  addBreadcrumb(
    category: string,
    message: string,
    level: string = 'info',
    data?: Record<string, unknown>,
    requestId?: string
  ): void {
    const breadcrumb: ErrorBreadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data,
    };

    const key = requestId || 'global';
    if (!this.breadcrumbs.has(key)) {
      this.breadcrumbs.set(key, []);
    }

    const breadcrumbs = this.breadcrumbs.get(key)!;
    breadcrumbs.push(breadcrumb);

    // Keep only recent breadcrumbs
    if (breadcrumbs.length > this.maxBreadcrumbs) {
      breadcrumbs.splice(0, breadcrumbs.length - this.maxBreadcrumbs);
    }
  }

  // Get error by fingerprint
  getErrors(fingerprint: string): ErrorContext[] {
    return this.errors.get(fingerprint) || [];
  }

  // Get error summary
  getErrorSummary(fingerprint: string): ErrorSummary | undefined {
    return this.summaries.get(fingerprint);
  }

  // Get all error summaries
  getAllErrorSummaries(): ErrorSummary[] {
    return Array.from(this.summaries.values());
  }

  // Get errors by component
  getErrorsByComponent(component: string): ErrorContext[] {
    const results: ErrorContext[] = [];
    for (const errors of this.errors.values()) {
      results.push(...errors.filter(e => e.component === component));
    }
    return results;
  }

  // Get errors by operation
  getErrorsByOperation(operation: string): ErrorContext[] {
    const results: ErrorContext[] = [];
    for (const errors of this.errors.values()) {
      results.push(...errors.filter(e => e.operation === operation));
    }
    return results;
  }

  // Get recent errors
  getRecentErrors(minutes: number = 60): ErrorContext[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const results: ErrorContext[] = [];
    
    for (const errors of this.errors.values()) {
      results.push(...errors.filter(e => e.timestamp > cutoff));
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Mark error as resolved
  resolveError(fingerprint: string): void {
    const summary = this.summaries.get(fingerprint);
    if (summary) {
      summary.resolved = true;
      this.logger.info(
        { fingerprint, component: summary.component },
        `Error resolved: ${summary.message}`
      );
    }
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    uniqueErrors: number;
    resolvedErrors: number;
    errorRate: number;
    topComponents: Array<{ component: string; count: number }>;
    topOperations: Array<{ operation: string; count: number }>;
  } {
    const summaries = Array.from(this.summaries.values());
    const totalErrors = summaries.reduce((sum, s) => sum + s.count, 0);
    const resolvedErrors = summaries.filter(s => s.resolved).length;

    // Count by component
    const componentCounts = new Map<string, number>();
    const operationCounts = new Map<string, number>();

    for (const errors of this.errors.values()) {
      for (const error of errors) {
        componentCounts.set(
          error.component,
          (componentCounts.get(error.component) || 0) + 1
        );
        
        if (error.operation) {
          operationCounts.set(
            error.operation,
            (operationCounts.get(error.operation) || 0) + 1
          );
        }
      }
    }

    const topComponents = Array.from(componentCounts.entries())
      .map(([component, count]) => ({ component, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topOperations = Array.from(operationCounts.entries())
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      uniqueErrors: summaries.length,
      resolvedErrors,
      errorRate: this.calculateErrorRate(),
      topComponents,
      topOperations,
    };
  }

  // Generate error fingerprint for grouping
  private generateFingerprint(error: Error, context: Partial<ErrorContext>): string {
    const components = [
      error.name,
      error.message.replace(/\d+/g, 'N'), // Replace numbers
      context.component,
      context.operation,
    ].filter(Boolean);

    return Buffer.from(components.join('|')).toString('base64').slice(0, 16);
  }

  // Update error summary
  private updateErrorSummary(fingerprint: string, errorContext: ErrorContext): void {
    const existing = this.summaries.get(fingerprint);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = errorContext.timestamp;
    } else {
      const summary: ErrorSummary = {
        fingerprint,
        message: errorContext.error.message,
        count: 1,
        firstSeen: errorContext.timestamp,
        lastSeen: errorContext.timestamp,
        component: errorContext.component,
        operation: errorContext.operation,
        resolved: false,
      };
      this.summaries.set(fingerprint, summary);
    }
  }

  // Get breadcrumbs for context
  private getBreadcrumbs(requestId?: string): ErrorBreadcrumb[] {
    const key = requestId || 'global';
    return [...(this.breadcrumbs.get(key) || [])];
  }

  // Calculate error rate
  private calculateErrorRate(): number {
    const recentErrors = this.getRecentErrors(60); // Last hour
    const recentMinutes = 60;
    return recentErrors.length / recentMinutes; // Errors per minute
  }

  // Clean up old errors
  private cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [fingerprint, errors] of this.errors.entries()) {
      const filteredErrors = errors.filter(e => e.timestamp > cutoff);
      
      if (filteredErrors.length === 0) {
        this.errors.delete(fingerprint);
        this.summaries.delete(fingerprint);
      } else {
        this.errors.set(fingerprint, filteredErrors);
      }
    }

    // Cleanup breadcrumbs
    for (const [key, breadcrumbs] of this.breadcrumbs.entries()) {
      const filteredBreadcrumbs = breadcrumbs.filter(b => b.timestamp > cutoff);
      this.breadcrumbs.set(key, filteredBreadcrumbs);
    }
  }
}

// Error boundary for React components
export class ErrorBoundary {
  private errorTracker: ErrorTracker;
  private fallbackComponent: any;

  constructor(errorTracker: ErrorTracker, fallbackComponent?: any) {
    this.errorTracker = errorTracker;
    this.fallbackComponent = fallbackComponent;
  }

  // Create React error boundary
  createReactBoundary() {
    const errorTracker = this.errorTracker;
    const fallbackComponent = this.fallbackComponent;

    return class extends (globalThis as any).React?.Component {
      constructor(props: any) {
        super(props);
        this.state = { hasError: false, errorId: null };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true };
      }

      componentDidCatch(error: Error, errorInfo: any) {
        const errorId = errorTracker.captureError(error, {
          component: 'React',
          operation: 'render',
          metadata: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
          },
        });

        this.setState({ errorId });
      }

      render() {
        if (this.state.hasError) {
          return fallbackComponent ? fallbackComponent(this.state.errorId) : 
                 (globalThis as any).React?.createElement('div', {}, 'Something went wrong');
        }

        return this.props.children;
      }
    };
  }
}

// Global error handlers
export class GlobalErrorHandler {
  private errorTracker: ErrorTracker;

  constructor(errorTracker: ErrorTracker) {
    this.errorTracker = errorTracker;
    this.setupGlobalHandlers();
  }

  // Setup global error handlers
  private setupGlobalHandlers(): void {
    // Unhandled promise rejections
    if (typeof globalThis !== 'undefined' && globalThis.process) {
      globalThis.process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.errorTracker.captureError(error, {
          component: 'process',
          operation: 'unhandledRejection',
          metadata: { promise: promise.toString() },
          tags: ['unhandled', 'promise'],
        });
      });

      // Uncaught exceptions
      globalThis.process.on('uncaughtException', (error) => {
        this.errorTracker.captureError(error, {
          component: 'process',
          operation: 'uncaughtException',
          tags: ['uncaught', 'exception'],
        });
      });
    }

    // Browser error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        this.errorTracker.captureError(error, {
          component: 'window',
          operation: 'error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
          tags: ['window', 'error'],
        });
      });

      // Unhandled promise rejections in browser
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.errorTracker.captureError(error, {
          component: 'window',
          operation: 'unhandledrejection',
          tags: ['unhandled', 'promise', 'browser'],
        });
      });
    }
  }
}

// Error reporting service
export class ErrorReportingService {
  private errorTracker: ErrorTracker;
  private webhookUrl?: string;

  constructor(errorTracker: ErrorTracker, webhookUrl?: string) {
    this.errorTracker = errorTracker;
    this.webhookUrl = webhookUrl;
  }

  // Generate error report
  generateErrorReport(timeframe: 'hour' | 'day' | 'week' = 'day'): {
    summary: any;
    topErrors: ErrorSummary[];
    recentErrors: ErrorContext[];
    stats: any;
  } {
    const minutes = timeframe === 'hour' ? 60 : timeframe === 'day' ? 1440 : 10080;
    
    return {
      summary: this.errorTracker.getErrorStats(),
      topErrors: this.errorTracker.getAllErrorSummaries()
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentErrors: this.errorTracker.getRecentErrors(minutes).slice(0, 20),
      stats: this.errorTracker.getErrorStats(),
    };
  }

  // Send error report via webhook
  async sendErrorReport(report: any): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error_report',
          timestamp: Date.now(),
          report,
        }),
      });
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  // Schedule periodic error reports
  scheduleReports(intervalMs: number = 60 * 60 * 1000): void {
    setInterval(async () => {
      const report = this.generateErrorReport('hour');
      await this.sendErrorReport(report);
    }, intervalMs);
  }
}

// Debugging utilities
export class DebugHelper {
  private errorTracker: ErrorTracker;

  constructor(errorTracker: ErrorTracker) {
    this.errorTracker = errorTracker;
  }

  // Add debug breadcrumb
  debug(message: string, data?: Record<string, unknown>, requestId?: string): void {
    this.errorTracker.addBreadcrumb('debug', message, 'debug', data, requestId);
  }

  // Add user action breadcrumb
  userAction(action: string, target?: string, data?: Record<string, unknown>, requestId?: string): void {
    this.errorTracker.addBreadcrumb('user', `User ${action}${target ? ` on ${target}` : ''}`, 'info', {
      action,
      target,
      ...data,
    }, requestId);
  }

  // Add navigation breadcrumb
  navigation(from: string, to: string, requestId?: string): void {
    this.errorTracker.addBreadcrumb('navigation', `Navigated from ${from} to ${to}`, 'info', {
      from,
      to,
    }, requestId);
  }

  // Add API call breadcrumb
  apiCall(method: string, url: string, status?: number, duration?: number, requestId?: string): void {
    this.errorTracker.addBreadcrumb('api', `${method} ${url}`, 'info', {
      method,
      url,
      status,
      duration,
    }, requestId);
  }

  // Get debug information for error analysis
  getDebugInfo(fingerprint: string): {
    errors: ErrorContext[];
    summary: ErrorSummary | undefined;
    relatedBreadcrumbs: ErrorBreadcrumb[];
  } {
    const errors = this.errorTracker.getErrors(fingerprint);
    const summary = this.errorTracker.getErrorSummary(fingerprint);
    
    // Get breadcrumbs from recent errors
    const relatedBreadcrumbs: ErrorBreadcrumb[] = [];
    for (const error of errors.slice(-5)) {
      if (error.breadcrumbs) {
        relatedBreadcrumbs.push(...error.breadcrumbs);
      }
    }

    return {
      errors,
      summary,
      relatedBreadcrumbs: relatedBreadcrumbs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20),
    };
  }
}

// Singleton instances
let errorTrackerInstance: ErrorTracker | null = null;
let globalErrorHandlerInstance: GlobalErrorHandler | null = null;

export const getErrorTracker = (logger?: StructuredLogger): ErrorTracker => {
  if (!errorTrackerInstance && logger) {
    errorTrackerInstance = new ErrorTracker(logger);
    globalErrorHandlerInstance = new GlobalErrorHandler(errorTrackerInstance);
  }
  if (!errorTrackerInstance) {
    throw new Error('ErrorTracker not initialized. Provide a logger instance.');
  }
  return errorTrackerInstance;
};

export const getDebugHelper = (errorTracker?: ErrorTracker): DebugHelper => {
  const tracker = errorTracker || getErrorTracker();
  return new DebugHelper(tracker);
};