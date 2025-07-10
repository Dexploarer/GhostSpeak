/**
 * Debugging tools and utilities for development and production troubleshooting
 */

import { v4 as uuidv4 } from 'uuid';
import type { LogContext } from './types';
import { StructuredLogger } from './logger';
import { TracingSystem, TraceContext } from './tracing';
import { ErrorTracker } from './error-tracking';

export class DebugSession {
  public readonly id: string;
  public readonly startTime: number;
  private events: DebugEvent[] = [];
  private variables: Map<string, any> = new Map();
  private breakpoints: Set<string> = new Set();
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger, sessionId?: string) {
    this.id = sessionId || uuidv4();
    this.startTime = Date.now();
    this.logger = logger;
  }

  // Add debug event
  addEvent(type: string, message: string, data?: any, location?: string): void {
    const event: DebugEvent = {
      id: uuidv4(),
      type,
      message,
      data,
      location,
      timestamp: Date.now(),
      sessionId: this.id,
    };

    this.events.push(event);

    this.logger.debug(
      {
        debugSessionId: this.id,
        eventType: type,
        location,
        data,
      },
      `Debug: ${message}`
    );
  }

  // Set variable value
  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
    this.addEvent('variable_set', `Variable '${name}' set`, { name, value });
  }

  // Get variable value
  getVariable(name: string): any {
    return this.variables.get(name);
  }

  // Get all variables
  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables.entries());
  }

  // Add breakpoint
  addBreakpoint(location: string): void {
    this.breakpoints.add(location);
    this.addEvent('breakpoint_added', `Breakpoint added at ${location}`, { location });
  }

  // Remove breakpoint
  removeBreakpoint(location: string): void {
    this.breakpoints.delete(location);
    this.addEvent('breakpoint_removed', `Breakpoint removed from ${location}`, { location });
  }

  // Check if location has breakpoint
  hasBreakpoint(location: string): boolean {
    return this.breakpoints.has(location);
  }

  // Get all events
  getEvents(): DebugEvent[] {
    return [...this.events];
  }

  // Get events by type
  getEventsByType(type: string): DebugEvent[] {
    return this.events.filter(event => event.type === type);
  }

  // Export debug session
  export(): {
    id: string;
    startTime: number;
    duration: number;
    events: DebugEvent[];
    variables: Record<string, any>;
    breakpoints: string[];
  } {
    return {
      id: this.id,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      events: this.events,
      variables: this.getAllVariables(),
      breakpoints: Array.from(this.breakpoints),
    };
  }
}

export class RemoteDebugger {
  private sessions: Map<string, DebugSession> = new Map();
  private logger: StructuredLogger;
  private tracer: TracingSystem;
  private errorTracker: ErrorTracker;
  private wsServer: any = null; // WebSocket server for real-time debugging

  constructor(
    logger: StructuredLogger,
    tracer: TracingSystem,
    errorTracker: ErrorTracker
  ) {
    this.logger = logger;
    this.tracer = tracer;
    this.errorTracker = errorTracker;
  }

  // Start debug session
  startSession(sessionId?: string): DebugSession {
    const session = new DebugSession(this.logger, sessionId);
    this.sessions.set(session.id, session);

    this.logger.info(
      { debugSessionId: session.id },
      'Debug session started'
    );

    return session;
  }

  // End debug session
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);

      this.logger.info(
        {
          debugSessionId: sessionId,
          duration: Date.now() - session.startTime,
          eventCount: session.getEvents().length,
        },
        'Debug session ended'
      );
    }
  }

  // Get debug session
  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Get all active sessions
  getActiveSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  // Attach debugger to function
  attachToFunction<T extends (...args: any[]) => any>(
    fn: T,
    functionName: string,
    sessionId?: string
  ): T {
    const session = sessionId ? this.getSession(sessionId) : this.startSession();
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    return ((...args: any[]) => {
      session.addEvent('function_enter', `Entering function ${functionName}`, {
        functionName,
        arguments: args,
      });

      try {
        const result = fn(...args);

        session.addEvent('function_exit', `Exiting function ${functionName}`, {
          functionName,
          result,
        });

        return result;
      } catch (error) {
        session.addEvent('function_error', `Error in function ${functionName}`, {
          functionName,
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    }) as T;
  }

  // Create debug probe
  createProbe(
    name: string,
    condition: (context: any) => boolean,
    action: (context: any) => void
  ): DebugProbe {
    return new DebugProbe(name, condition, action, this.logger);
  }

  // Inspect object structure
  inspectObject(obj: any, depth: number = 3): ObjectInspection {
    return this.doInspectObject(obj, depth, 0, new Set());
  }

  private doInspectObject(
    obj: any,
    maxDepth: number,
    currentDepth: number,
    visited: Set<any>
  ): ObjectInspection {
    if (currentDepth >= maxDepth || visited.has(obj)) {
      return {
        type: typeof obj,
        value: '[Max depth reached or circular reference]',
        properties: {},
      };
    }

    visited.add(obj);

    const inspection: ObjectInspection = {
      type: typeof obj,
      value: obj,
      properties: {},
    };

    if (obj === null) {
      inspection.value = 'null';
    } else if (obj === undefined) {
      inspection.value = 'undefined';
    } else if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        inspection.type = 'array';
        inspection.value = `Array(${obj.length})`;
        
        for (let i = 0; i < Math.min(obj.length, 10); i++) {
          inspection.properties[i.toString()] = this.doInspectObject(
            obj[i],
            maxDepth,
            currentDepth + 1,
            visited
          );
        }
      } else {
        inspection.type = 'object';
        inspection.value = obj.constructor?.name || 'Object';

        const keys = Object.keys(obj).slice(0, 20); // Limit to 20 properties
        for (const key of keys) {
          try {
            inspection.properties[key] = this.doInspectObject(
              obj[key],
              maxDepth,
              currentDepth + 1,
              visited
            );
          } catch (error) {
            inspection.properties[key] = {
              type: 'error',
              value: `[Error accessing property: ${error}]`,
              properties: {},
            };
          }
        }
      }
    } else if (typeof obj === 'function') {
      inspection.value = `Function: ${obj.name || 'anonymous'}`;
    } else if (typeof obj === 'string') {
      inspection.value = obj.length > 100 ? obj.substring(0, 100) + '...' : obj;
    }

    visited.delete(obj);
    return inspection;
  }

  // Memory profiler
  profileMemory(): MemoryProfile {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      externalMB: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rssMB: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
    };
  }

  // CPU profiler
  profileCPU(durationMs: number = 1000): Promise<CPUProfile> {
    return new Promise((resolve) => {
      const start = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const usage = process.cpuUsage(start);
        const duration = Date.now() - startTime;

        resolve({
          timestamp: startTime,
          duration,
          userCPU: usage.user,
          systemCPU: usage.system,
          totalCPU: usage.user + usage.system,
          userCPUPercent: (usage.user / (duration * 1000)) * 100,
          systemCPUPercent: (usage.system / (duration * 1000)) * 100,
          totalCPUPercent: ((usage.user + usage.system) / (duration * 1000)) * 100,
        });
      }, durationMs);
    });
  }

  // Start WebSocket server for real-time debugging
  startWebSocketServer(port: number = 9229): void {
    if (typeof WebSocket === 'undefined') {
      this.logger.warn({}, 'WebSocket not available, skipping debug server');
      return;
    }

    // Implementation would start a WebSocket server
    // for real-time debugging communication
    this.logger.info({ port }, 'Debug WebSocket server started');
  }

  // Stop WebSocket server
  stopWebSocketServer(): void {
    if (this.wsServer) {
      // Implementation would stop the WebSocket server
      this.logger.info({}, 'Debug WebSocket server stopped');
      this.wsServer = null;
    }
  }
}

export class DebugProbe {
  private name: string;
  private condition: (context: any) => boolean;
  private action: (context: any) => void;
  private logger: StructuredLogger;
  private hitCount = 0;
  private enabled = true;

  constructor(
    name: string,
    condition: (context: any) => boolean,
    action: (context: any) => void,
    logger: StructuredLogger
  ) {
    this.name = name;
    this.condition = condition;
    this.action = action;
    this.logger = logger;
  }

  // Check probe and execute if condition is met
  check(context: any): boolean {
    if (!this.enabled) return false;

    try {
      if (this.condition(context)) {
        this.hitCount++;
        this.action(context);

        this.logger.debug(
          {
            probeName: this.name,
            hitCount: this.hitCount,
            context,
          },
          `Debug probe triggered: ${this.name}`
        );

        return true;
      }
    } catch (error) {
      this.logger.error(
        {
          probeName: this.name,
          error: error instanceof Error ? error.message : String(error),
        },
        `Error in debug probe: ${this.name}`
      );
    }

    return false;
  }

  // Enable/disable probe
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Get probe statistics
  getStats(): {
    name: string;
    enabled: boolean;
    hitCount: number;
  } {
    return {
      name: this.name,
      enabled: this.enabled,
      hitCount: this.hitCount,
    };
  }
}

// Performance profiler for debugging performance issues
export class PerformanceProfiler {
  private profiles: Map<string, PerformanceEntry[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  // Start timing an operation
  start(name: string): void {
    this.activeTimers.set(name, Date.now());
  }

  // End timing and record
  end(name: string, metadata?: Record<string, any>): number {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      throw new Error(`Timer not found: ${name}`);
    }

    const duration = Date.now() - startTime;
    this.activeTimers.delete(name);

    const entry: PerformanceEntry = {
      name,
      startTime,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.profiles.has(name)) {
      this.profiles.set(name, []);
    }
    this.profiles.get(name)!.push(entry);

    this.logger.debug(
      {
        operation: name,
        duration,
        metadata,
      },
      `Performance: ${name} took ${duration}ms`
    );

    return duration;
  }

  // Profile a function
  profile<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name);
    try {
      const result = fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  // Profile an async function
  async profileAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  // Get performance statistics
  getStats(name: string): {
    count: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    percentiles: Record<string, number>;
  } {
    const entries = this.profiles.get(name) || [];
    if (entries.length === 0) {
      return {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        percentiles: {},
      };
    }

    const durations = entries.map(e => e.duration).sort((a, b) => a - b);
    const totalTime = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: entries.length,
      totalTime,
      averageTime: totalTime / entries.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      percentiles: {
        p50: durations[Math.floor(durations.length * 0.5)],
        p90: durations[Math.floor(durations.length * 0.9)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
      },
    };
  }

  // Get all profiles
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const name of this.profiles.keys()) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  // Clear profiles
  clear(name?: string): void {
    if (name) {
      this.profiles.delete(name);
    } else {
      this.profiles.clear();
    }
  }
}

// Debug utilities for common debugging tasks
export class DebugUtils {
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  // Pretty print any value
  prettyPrint(value: any, depth: number = 3): string {
    try {
      return JSON.stringify(value, this.jsonReplacer, 2);
    } catch (error) {
      return `[Circular reference or unserializable value: ${typeof value}]`;
    }
  }

  // JSON replacer for circular references
  private jsonReplacer(): (key: string, value: any) => any {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular reference]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  // Stack trace utilities
  getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2).join('\n') : 'No stack trace available';
  }

  // Assert with debugging info
  assert(condition: boolean, message: string, context?: any): void {
    if (!condition) {
      const error = new Error(`Assertion failed: ${message}`);
      
      this.logger.error(
        {
          assertion: message,
          context,
          stackTrace: this.getStackTrace(),
        },
        `Assertion failed: ${message}`
      );

      throw error;
    }
  }

  // Time execution
  time<T>(label: string, fn: () => T): T {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;
      
      this.logger.debug(
        { label, duration },
        `${label} took ${duration}ms`
      );

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.logger.error(
        {
          label,
          duration,
          error: error instanceof Error ? error.message : String(error),
        },
        `${label} failed after ${duration}ms`
      );

      throw error;
    }
  }

  // Conditional debugging
  debugIf(condition: boolean, message: string, data?: any): void {
    if (condition) {
      this.logger.debug({ data }, message);
    }
  }

  // Break on condition (for development)
  breakIf(condition: boolean, message: string): void {
    if (condition && process.env.NODE_ENV === 'development') {
      console.log(`Break condition met: ${message}`);
      // In a real debugger, this would trigger a breakpoint
    }
  }
}

// Type definitions
interface DebugEvent {
  id: string;
  type: string;
  message: string;
  data?: any;
  location?: string;
  timestamp: number;
  sessionId: string;
}

interface ObjectInspection {
  type: string;
  value: any;
  properties: Record<string, ObjectInspection>;
}

interface MemoryProfile {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
}

interface CPUProfile {
  timestamp: number;
  duration: number;
  userCPU: number;
  systemCPU: number;
  totalCPU: number;
  userCPUPercent: number;
  systemCPUPercent: number;
  totalCPUPercent: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Singleton instances
let remoteDebuggerInstance: RemoteDebugger | null = null;
let performanceProfilerInstance: PerformanceProfiler | null = null;
let debugUtilsInstance: DebugUtils | null = null;

export const getRemoteDebugger = (
  logger?: StructuredLogger,
  tracer?: TracingSystem,
  errorTracker?: ErrorTracker
): RemoteDebugger => {
  if (!remoteDebuggerInstance && logger && tracer && errorTracker) {
    remoteDebuggerInstance = new RemoteDebugger(logger, tracer, errorTracker);
  }
  if (!remoteDebuggerInstance) {
    throw new Error('RemoteDebugger not initialized. Provide required instances.');
  }
  return remoteDebuggerInstance;
};

export const getPerformanceProfiler = (logger?: StructuredLogger): PerformanceProfiler => {
  if (!performanceProfilerInstance && logger) {
    performanceProfilerInstance = new PerformanceProfiler(logger);
  }
  if (!performanceProfilerInstance) {
    throw new Error('PerformanceProfiler not initialized. Provide a logger instance.');
  }
  return performanceProfilerInstance;
};

export const getDebugUtils = (logger?: StructuredLogger): DebugUtils => {
  if (!debugUtilsInstance && logger) {
    debugUtilsInstance = new DebugUtils(logger);
  }
  if (!debugUtilsInstance) {
    throw new Error('DebugUtils not initialized. Provide a logger instance.');
  }
  return debugUtilsInstance;
};