/**
 * Type definitions for observability components
 */

// Core configuration
export interface ObservabilityConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  environment: 'development' | 'staging' | 'production';
  enableTracing: boolean;
  enableMetrics: boolean;
  enableAnalytics: boolean;
  enableHealthChecks: boolean;
  enableAlerts: boolean;
  retentionPeriodDays: number;
  samplingRate: number;
  endpoints?: {
    metrics?: string;
    traces?: string;
    logs?: string;
    health?: string;
    alerts?: string;
  };
}

// Logging context
export interface LogContext {
  operation?: string;
  component?: string;
  agentId?: string;
  channelId?: string;
  messageId?: string;
  auctionId?: string;
  escrowId?: string;
  transactionId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  error?: Error;
  duration?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  [key: string]: unknown;
}

// Metrics
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  labels?: string[];
}

export interface MetricValue {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  tags?: string[];
}

// Tracing
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  component: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'timeout';
  error?: Error;
  tags?: Record<string, string>;
  logs?: TraceLog[];
}

export interface TraceLog {
  timestamp: number;
  level: string;
  message: string;
  fields?: Record<string, unknown>;
}

// Health monitoring
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  checks: HealthCheck[];
  timestamp: number;
  uptime: number;
  version: string;
}

// Alerts
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  component: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  resolved?: boolean;
  resolvedAt?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  level: AlertLevel;
  enabled: boolean;
  cooldownMs: number;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'pagerduty';
  config: Record<string, unknown>;
}

// Performance monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  component: string;
  operation?: string;
  percentiles?: Record<string, number>;
  labels?: Record<string, string>;
}

export interface PerformanceProfile {
  operation: string;
  component: string;
  samples: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  percentiles: Record<string, number>;
  errorRate: number;
  throughput: number;
}

// Error tracking
export interface ErrorContext {
  error: Error;
  component: string;
  operation?: string;
  agentId?: string;
  userId?: string;
  requestId?: string;
  timestamp: number;
  stackTrace?: string;
  breadcrumbs?: ErrorBreadcrumb[];
  metadata?: Record<string, unknown>;
  tags?: string[];
  fingerprint?: string;
}

export interface ErrorBreadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: string;
  data?: Record<string, unknown>;
}

export interface ErrorSummary {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  component: string;
  operation?: string;
  resolved: boolean;
}

// Monitoring events
export interface MonitoringEvent {
  id: string;
  type: 'metric' | 'trace' | 'log' | 'health' | 'alert' | 'error';
  timestamp: number;
  component: string;
  data: Record<string, unknown>;
  tags?: string[];
}

// Analytics events
export interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  component: string;
  action: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

// Business metrics
export interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  dimensions?: Record<string, string>;
  period?: 'hour' | 'day' | 'week' | 'month';
}

// Configuration validation
export const DEFAULT_OBSERVABILITY_CONFIG: ObservabilityConfig = {
  logLevel: 'info',
  environment: 'development',
  enableTracing: true,
  enableMetrics: true,
  enableAnalytics: true,
  enableHealthChecks: true,
  enableAlerts: true,
  retentionPeriodDays: 30,
  samplingRate: 1.0,
};

export const PRODUCTION_OBSERVABILITY_CONFIG: ObservabilityConfig = {
  logLevel: 'warn',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  enableAnalytics: true,
  enableHealthChecks: true,
  enableAlerts: true,
  retentionPeriodDays: 90,
  samplingRate: 0.1,
};