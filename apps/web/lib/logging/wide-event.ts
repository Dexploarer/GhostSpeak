/**
 * Wide Event Logging System
 *
 * Implements comprehensive request-level logging where each request emits
 * one structured event containing all relevant context for debugging and analytics.
 *
 * Instead of scattered logs, we emit one "wide event" per request with:
 * - Request context (method, path, timing)
 * - User context (ID, subscription, account details)
 * - Business context (cart, payment, features)
 * - Error context (type, code, message, retriable)
 * - Service context (version, deployment, region)
 */

import { randomUUID } from 'crypto'
import { getLoggingConfig, getLogLevel, isDetailedErrorLoggingEnabled, isPerformanceMonitoringEnabled } from './config'

// Wide Event Types
export interface WideEvent {
  // Core request context
  request_id: string
  trace_id?: string
  correlation_id?: string // Links related events across services
  timestamp: string
  method: string
  path: string
  status_code?: number
  duration_ms?: number
  outcome?: 'success' | 'error'

  // Service context
  service: string
  service_version?: string
  deployment_id?: string
  region?: string
  environment?: string

  // User context
  user?: {
    id?: string
    wallet_address?: string
    subscription_tier?: string
    account_age_days?: number
    lifetime_value_cents?: number
    is_authenticated?: boolean
    session_id?: string
  }

  // Business context (comprehensive)
  business?: {
    user_journey?: string // e.g., 'onboarding', 'agent_interaction', 'transaction_flow'
    feature_used?: string // e.g., 'ouija_report', 'agent_chat', 'wallet_connect'
    conversion_step?: number // Step in conversion funnel (1-10)
    business_value?: number // Business impact score
    user_intent?: string // What the user is trying to accomplish
  }

  // Frontend context
  frontend?: {
    user_agent?: string
    viewport_size?: string
    react_render_time_ms?: number
    component_name?: string
    user_interaction?: string // 'click', 'scroll', 'form_submit', etc.
    page_load_time_ms?: number
    dom_ready_time_ms?: number
  }

  // Backend context
  backend?: {
    database_queries?: number
    database_time_ms?: number
    external_api_calls?: number
    external_api_time_ms?: number
    cache_hits?: number
    cache_misses?: number
    memory_usage_mb?: number
    cpu_usage_percent?: number
  }

  // Service mesh context
  services?: {
    convex?: {
      queries_executed?: number
      mutations_executed?: number
      total_time_ms?: number
      cache_hit_rate?: number
    }
    elizaos?: {
      agent_id?: string
      actions_evaluated?: number
      action_triggered?: string
      llm_tokens_used?: number
      response_time_ms?: number
    }
    solana?: {
      rpc_calls?: number
      total_time_ms?: number
      network?: string
    }
    ai_gateway?: {
      model?: string
      tokens_used?: number
      response_time_ms?: number
      cost_cents?: number
    }
  }

  // Performance context
  performance?: {
    time_to_first_byte_ms?: number
    time_to_interactive_ms?: number
    largest_contentful_paint_ms?: number
    cumulative_layout_shift?: number
    first_input_delay_ms?: number
  }

  // Legacy business context (maintained for compatibility)
  cart?: {
    id?: string
    item_count?: number
    total_cents?: number
    coupon_applied?: string
  }

  payment?: {
    method?: string
    provider?: string
    latency_ms?: number
    attempt?: number
    amount_cents?: number
  }

  agent?: {
    address?: string
    name?: string
    status?: string
    tier?: string
    reputation_score?: number
  }

  // Feature flags and experimentation
  feature_flags?: Record<string, boolean | string>

  // Error context
  error?: {
    type?: string
    code?: string
    message?: string
    retriable?: boolean
    stack?: string
    stripe_decline_code?: string
    solana_error_code?: string
  }

  // Performance metrics
  performance?: {
    database_queries?: number
    external_api_calls?: number
    cache_hits?: number
    cache_misses?: number
  }

  // Custom metadata (flexible extension)
  metadata?: Record<string, unknown>
}

// Sampling configuration
export interface SamplingConfig {
  error_rate: number // 0.0 to 1.0, percentage of errors to keep
  slow_request_threshold_ms: number // requests slower than this are always kept
  slow_request_rate: number // 0.0 to 1.0, percentage of slow requests to keep
  success_rate: number // 0.0 to 1.0, percentage of successful requests to keep
  vip_users: string[] // user IDs that are always logged
  vip_wallets: string[] // wallet addresses that are always logged
  debug_features: string[] // feature flags that trigger full logging
}

/**
 * Default sampling configuration
 * - Keep 100% of errors
 * - Keep 100% of slow requests (>2s)
 * - Keep 5% of successful requests
 * - Always keep VIP users/wallets
 * - Always keep requests with debug feature flags
 */
export const DEFAULT_SAMPLING: SamplingConfig = {
  error_rate: 1.0, // 100% of errors
  slow_request_threshold_ms: 2000, // 2 seconds
  slow_request_rate: 1.0, // 100% of slow requests
  success_rate: 0.05, // 5% of successful requests
  vip_users: [],
  vip_wallets: [],
  debug_features: ['debug_logging', 'full_trace'],
}

/**
 * Wide Event Logger
 *
 * Handles creation, enrichment, and emission of wide events
 */
export class WideEventLogger {
  private sampling: SamplingConfig
  private serviceName: string
  private serviceVersion: string
  private deploymentId?: string
  private region?: string
  private environment: string
  private logLevel: string
  private detailedErrors: boolean
  private performanceMonitoring: boolean

  constructor(options?: {
    serviceName?: string
    serviceVersion?: string
    deploymentId?: string
    region?: string
    environment?: string
    sampling?: Partial<SamplingConfig>
  }) {
    // Use configuration from environment, with options as override
    const config = getLoggingConfig()

    this.serviceName = options?.serviceName || config.service.name
    this.serviceVersion = options?.serviceVersion || config.service.version
    this.deploymentId = options?.deploymentId || config.service.deploymentId
    this.region = options?.region || config.service.region
    this.environment = options?.environment || process.env.NODE_ENV || 'development'

    this.sampling = {
      ...config.sampling,
      ...options?.sampling,
    }

    this.logLevel = getLogLevel()
    this.detailedErrors = isDetailedErrorLoggingEnabled()
    this.performanceMonitoring = isPerformanceMonitoringEnabled()
  }

  /**
   * Create a new wide event with initial request context
   */
  createEvent(request: {
    method: string
    path: string
    userId?: string
    walletAddress?: string
    sessionId?: string
    traceId?: string
  }): WideEvent {
    const event: WideEvent = {
      request_id: randomUUID(),
      trace_id: request.traceId || randomUUID(),
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.path,

      service: this.serviceName,
      service_version: this.serviceVersion,
      deployment_id: this.deploymentId,
      region: this.region,
      environment: this.environment,

      user: {
        id: request.userId,
        wallet_address: request.walletAddress,
        session_id: request.sessionId,
        is_authenticated: !!(request.userId || request.walletAddress),
      },
    }

    return event
  }

  /**
   * Enrich event with user context
   */
  enrichWithUser(event: WideEvent, user: {
    subscription_tier?: string
    account_age_days?: number
    lifetime_value_cents?: number
  }): void {
    if (!event.user) event.user = {}

    event.user.subscription_tier = user.subscription_tier
    event.user.account_age_days = user.account_age_days
    event.user.lifetime_value_cents = user.lifetime_value_cents
  }

  /**
   * Enrich event with business context (cart, payment, etc.)
   */
  enrichWithBusiness(event: WideEvent, context: {
    cart?: WideEvent['cart']
    payment?: WideEvent['payment']
    agent?: WideEvent['agent']
    feature_flags?: Record<string, boolean | string>
    performance?: WideEvent['performance']
    metadata?: Record<string, unknown>
  }): void {
    if (context.cart) event.cart = { ...event.cart, ...context.cart }
    if (context.payment) event.payment = { ...event.payment, ...context.payment }
    if (context.agent) event.agent = { ...event.agent, ...context.agent }
    if (context.feature_flags) event.feature_flags = { ...event.feature_flags, ...context.feature_flags }
    if (context.performance) event.performance = { ...event.performance, ...context.performance }
    if (context.metadata) event.metadata = { ...event.metadata, ...context.metadata }
  }

  /**
   * Complete event with final status and timing
   */
  completeEvent(event: WideEvent, result: {
    statusCode?: number
    durationMs?: number
    error?: Error | { type: string; code?: string; message: string; retriable?: boolean }
  }): void {
    event.status_code = result.statusCode
    event.duration_ms = result.durationMs
    event.outcome = result.error ? 'error' : 'success'

    if (result.error) {
      if (result.error instanceof Error) {
        event.error = {
          type: result.error.name,
          message: result.error.message,
          stack: process.env.NODE_ENV === 'development' ? result.error.stack : undefined,
        }
      } else {
        event.error = result.error
      }
    }
  }

  /**
   * Determine if this event should be sampled (kept) or dropped
   */
  shouldSample(event: WideEvent): boolean {
    // Always keep errors
    if (event.status_code && event.status_code >= 400) return true
    if (event.error) return true

    // Always keep slow requests
    if (event.duration_ms && event.duration_ms > this.sampling.slow_request_threshold_ms) return true

    // Always keep VIP users
    if (event.user?.id && this.sampling.vip_users.includes(event.user.id)) return true
    if (event.user?.wallet_address && this.sampling.vip_wallets.includes(event.user.wallet_address)) return true

    // Always keep requests with debug feature flags
    if (event.feature_flags) {
      for (const flag of this.sampling.debug_features) {
        if (event.feature_flags[flag]) return true
      }
    }

    // Sample successful requests based on rate
    return Math.random() < this.sampling.success_rate
  }

  /**
   * Emit the wide event to logging system
   */
  emit(event: WideEvent): void {
    if (!this.shouldSample(event)) {
      return // Drop this event per sampling rules
    }

    const logLevel = event.outcome === 'error' ? 'error' : event.status_code && event.status_code >= 400 ? 'warn' : 'info'

    // Check if we should log at this level
    if (!this.shouldLogAtLevel(logLevel)) {
      return
    }

    // Clean up error details based on configuration
    const cleanEvent = { ...event }
    if (!this.detailedErrors && cleanEvent.error?.stack) {
      delete cleanEvent.error.stack
    }

    const logData = {
      level: logLevel,
      message: `${event.method} ${event.path} - ${event.status_code || 'unknown'} (${event.duration_ms || 0}ms)`,
      event: cleanEvent,
      timestamp: new Date().toISOString(),
    }

    // Console logging for development/debugging
    if (this.environment === 'development' || this.logLevel === 'debug') {
      console.log(JSON.stringify(logData, null, 2))
    }

    // Production logging would go here
    // Example: DataDog, CloudWatch, etc.
    // await datadogLogger.log(logData)
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLogAtLevel(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }
}

// Global logger instance
let globalLogger: WideEventLogger | null = null

/**
 * Get or create the global wide event logger
 */
export function getWideEventLogger(): WideEventLogger {
  if (!globalLogger) {
    globalLogger = new WideEventLogger()
  }

  return globalLogger
}

/**
 * Create a request-scoped wide event
 */
export function createRequestEvent(request: {
  method: string
  path: string
  userId?: string
  walletAddress?: string
  sessionId?: string
  traceId?: string
}): WideEvent {
  return getWideEventLogger().createEvent(request)
}

/**
 * Emit a completed wide event
 */
export function emitWideEvent(event: WideEvent): void {
  getWideEventLogger().emit(event)
}