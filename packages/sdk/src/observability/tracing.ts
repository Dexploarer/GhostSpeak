/**
 * Distributed tracing system for request flow tracking and performance monitoring
 */

import { v4 as uuidv4 } from 'uuid';
import type { TraceContext, TraceLog } from './types';

export class TracingSystem {
  private traces: Map<string, TraceContext> = new Map();
  private spans: Map<string, TraceContext> = new Map();
  private activeSpan: TraceContext | null = null;
  private samplingRate: number;

  constructor(samplingRate: number = 1.0) {
    this.samplingRate = samplingRate;
  }

  // Start a new trace
  startTrace(operation: string, component: string): TraceContext {
    const traceId = uuidv4();
    const spanId = uuidv4();
    
    const trace: TraceContext = {
      traceId,
      spanId,
      operation,
      component,
      startTime: Date.now(),
      status: 'success',
      tags: {},
      logs: [],
    };

    this.traces.set(traceId, trace);
    this.spans.set(spanId, trace);
    this.activeSpan = trace;

    return trace;
  }

  // Start a child span
  startSpan(
    operation: string,
    component: string,
    parentSpan?: TraceContext
  ): TraceContext {
    const parent = parentSpan || this.activeSpan;
    
    if (!parent) {
      return this.startTrace(operation, component);
    }

    const spanId = uuidv4();
    const span: TraceContext = {
      traceId: parent.traceId,
      spanId,
      parentSpanId: parent.spanId,
      operation,
      component,
      startTime: Date.now(),
      status: 'success',
      tags: {},
      logs: [],
    };

    this.spans.set(spanId, span);
    this.activeSpan = span;

    return span;
  }

  // Finish a span
  finishSpan(
    span: TraceContext,
    status: 'success' | 'error' | 'timeout' = 'success',
    error?: Error
  ): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    
    if (error) {
      span.error = error;
      span.tags!.error = error.message;
    }

    // If this was the active span, set parent as active
    if (this.activeSpan?.spanId === span.spanId) {
      if (span.parentSpanId) {
        this.activeSpan = this.spans.get(span.parentSpanId) || null;
      } else {
        this.activeSpan = null;
      }
    }
  }

  // Add tag to span
  addTag(span: TraceContext, key: string, value: string): void {
    span.tags![key] = value;
  }

  // Add log to span
  addLog(span: TraceContext, level: string, message: string, fields?: Record<string, unknown>): void {
    const log: TraceLog = {
      timestamp: Date.now(),
      level,
      message,
      fields,
    };
    span.logs!.push(log);
  }

  // Get trace by ID
  getTrace(traceId: string): TraceContext | undefined {
    return this.traces.get(traceId);
  }

  // Get span by ID
  getSpan(spanId: string): TraceContext | undefined {
    return this.spans.get(spanId);
  }

  // Get all spans for a trace
  getTraceSpans(traceId: string): TraceContext[] {
    return Array.from(this.spans.values()).filter(span => span.traceId === traceId);
  }

  // Get active span
  getActiveSpan(): TraceContext | null {
    return this.activeSpan;
  }

  // Trace a function execution
  async traceFunction<T>(
    operation: string,
    component: string,
    fn: (span: TraceContext) => Promise<T> | T,
    parentSpan?: TraceContext
  ): Promise<T> {
    // Apply sampling
    if (Math.random() > this.samplingRate) {
      return fn(null as any); // Skip tracing but still execute function
    }

    const span = this.startSpan(operation, component, parentSpan);
    
    try {
      const result = await fn(span);
      this.finishSpan(span, 'success');
      return result;
    } catch (error) {
      this.finishSpan(span, 'error', error as Error);
      throw error;
    }
  }

  // Export traces in Jaeger format
  exportJaegerTraces(): any[] {
    const traces = Array.from(this.traces.values());
    
    return traces.map(trace => {
      const spans = this.getTraceSpans(trace.traceId);
      
      return {
        traceID: trace.traceId,
        spans: spans.map(span => ({
          traceID: span.traceId,
          spanID: span.spanId,
          parentSpanID: span.parentSpanId,
          operationName: span.operation,
          startTime: span.startTime * 1000, // Convert to microseconds
          duration: (span.duration || 0) * 1000,
          tags: Object.entries(span.tags || {}).map(([key, value]) => ({
            key,
            value: value.toString(),
            type: 'string',
          })),
          logs: span.logs?.map(log => ({
            timestamp: log.timestamp * 1000,
            fields: [
              { key: 'level', value: log.level },
              { key: 'message', value: log.message },
              ...Object.entries(log.fields || {}).map(([key, value]) => ({
                key,
                value: JSON.stringify(value),
              })),
            ],
          })) || [],
          process: {
            serviceName: 'ghostspeak',
            tags: [
              { key: 'component', value: span.component },
            ],
          },
        })),
      };
    });
  }

  // Clean up old traces
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    // Remove old traces
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < cutoff) {
        this.traces.delete(traceId);
        
        // Remove associated spans
        for (const [spanId, span] of this.spans.entries()) {
          if (span.traceId === traceId) {
            this.spans.delete(spanId);
          }
        }
      }
    }
  }

  // Get tracing statistics
  getStats(): {
    totalTraces: number;
    totalSpans: number;
    averageSpansPerTrace: number;
    averageTraceDuration: number;
    errorRate: number;
  } {
    const traces = Array.from(this.traces.values());
    const spans = Array.from(this.spans.values());
    
    const completedTraces = traces.filter(t => t.endTime);
    const totalDuration = completedTraces.reduce((sum, t) => sum + (t.duration || 0), 0);
    const errorCount = spans.filter(s => s.status === 'error').length;
    
    return {
      totalTraces: traces.length,
      totalSpans: spans.length,
      averageSpansPerTrace: traces.length > 0 ? spans.length / traces.length : 0,
      averageTraceDuration: completedTraces.length > 0 ? totalDuration / completedTraces.length : 0,
      errorRate: spans.length > 0 ? errorCount / spans.length : 0,
    };
  }
}

// Decorators for automatic tracing
export function traced(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = async function (...args: any[]) {
      const tracer = getTracer();
      return await tracer.traceFunction(
        operationName,
        target.constructor.name,
        async (span) => {
          span.tags!.method = propertyName;
          span.tags!.class = target.constructor.name;
          return await method.apply(this, args);
        }
      );
    };
    
    return descriptor;
  };
}

// Context manager for manual span management
export class SpanContext {
  private tracer: TracingSystem;
  private span: TraceContext;

  constructor(tracer: TracingSystem, span: TraceContext) {
    this.tracer = tracer;
    this.span = span;
  }

  addTag(key: string, value: string): SpanContext {
    this.tracer.addTag(this.span, key, value);
    return this;
  }

  addLog(level: string, message: string, fields?: Record<string, unknown>): SpanContext {
    this.tracer.addLog(this.span, level, message, fields);
    return this;
  }

  setError(error: Error): SpanContext {
    this.span.error = error;
    this.span.status = 'error';
    this.span.tags!.error = error.message;
    return this;
  }

  finish(status?: 'success' | 'error' | 'timeout'): void {
    this.tracer.finishSpan(this.span, status);
  }

  getSpan(): TraceContext {
    return this.span;
  }
}

// Correlation ID tracking
export class CorrelationTracker {
  private correlations: Map<string, string> = new Map();

  setCorrelation(requestId: string, traceId: string): void {
    this.correlations.set(requestId, traceId);
  }

  getCorrelation(requestId: string): string | undefined {
    return this.correlations.get(requestId);
  }

  removeCorrelation(requestId: string): void {
    this.correlations.delete(requestId);
  }

  getAllCorrelations(): Map<string, string> {
    return new Map(this.correlations);
  }
}

// Performance tracking with traces
export class TracedPerformanceMonitor {
  private tracer: TracingSystem;
  private performanceData: Map<string, number[]> = new Map();

  constructor(tracer: TracingSystem) {
    this.tracer = tracer;
  }

  async measureOperation<T>(
    operation: string,
    component: string,
    fn: () => Promise<T> | T
  ): Promise<{ result: T; duration: number; span: TraceContext }> {
    const span = this.tracer.startSpan(operation, component);
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.tracer.addTag(span, 'duration_ms', duration.toString());
      this.tracer.finishSpan(span, 'success');
      
      // Store performance data
      if (!this.performanceData.has(operation)) {
        this.performanceData.set(operation, []);
      }
      this.performanceData.get(operation)!.push(duration);
      
      return { result, duration, span };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.tracer.addTag(span, 'duration_ms', duration.toString());
      this.tracer.finishSpan(span, 'error', error as Error);
      throw error;
    }
  }

  getOperationStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    percentiles: Record<string, number>;
  } {
    const durations = this.performanceData.get(operation) || [];
    
    if (durations.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, percentiles: {} };
    }

    const sorted = durations.slice().sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      average: sum / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      percentiles: {
        p50: sorted[Math.floor(durations.length * 0.5)],
        p90: sorted[Math.floor(durations.length * 0.9)],
        p95: sorted[Math.floor(durations.length * 0.95)],
        p99: sorted[Math.floor(durations.length * 0.99)],
      },
    };
  }
}

// Singleton tracer instance
let tracerInstance: TracingSystem | null = null;
let correlationInstance: CorrelationTracker | null = null;

export const getTracer = (samplingRate?: number): TracingSystem => {
  if (!tracerInstance) {
    tracerInstance = new TracingSystem(samplingRate);
  }
  return tracerInstance;
};

export const getCorrelationTracker = (): CorrelationTracker => {
  if (!correlationInstance) {
    correlationInstance = new CorrelationTracker();
  }
  return correlationInstance;
};

export const createSpanContext = (
  operation: string,
  component: string,
  parentSpan?: TraceContext
): SpanContext => {
  const tracer = getTracer();
  const span = tracer.startSpan(operation, component, parentSpan);
  return new SpanContext(tracer, span);
};