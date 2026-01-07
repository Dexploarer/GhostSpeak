/**
 * Wide Event Logging Configuration
 *
 * Environment-specific configuration for wide event logging
 */

import type { SamplingConfig } from './wide-event'

/**
 * Get logging configuration based on environment
 */
export function getLoggingConfig(): {
  enabled: boolean
  sampling: SamplingConfig
  service: {
    name: string
    version: string
    deploymentId?: string
    region?: string
  }
} {
  const nodeEnv = process.env.NODE_ENV || 'development'

  // Base configuration
  const config = {
    enabled: true,
    service: {
      name: process.env.SERVICE_NAME || 'ghostspeak-web',
      version: process.env.npm_package_version || '1.0.0',
      deploymentId: process.env.DEPLOYMENT_ID || process.env.VERCEL_DEPLOYMENT_ID,
      region: process.env.REGION || process.env.VERCEL_REGION || 'local',
    },
  }

  // Environment-specific sampling
  switch (nodeEnv) {
    case 'production':
      config.sampling = {
        error_rate: 1.0,        // Keep 100% of errors
        slow_request_threshold_ms: 2000,
        slow_request_rate: 1.0, // Keep 100% of slow requests
        success_rate: parseFloat(process.env.LOG_SUCCESS_RATE || '0.05'), // 5% of successes
        vip_users: (process.env.VIP_USERS || '').split(',').filter(Boolean),
        vip_wallets: (process.env.VIP_WALLETS || '').split(',').filter(Boolean),
        debug_features: ['debug_logging', 'full_trace', 'performance_monitoring'],
      }
      break

    case 'staging':
      config.sampling = {
        error_rate: 1.0,        // Keep 100% of errors
        slow_request_threshold_ms: 1000,
        slow_request_rate: 1.0, // Keep 100% of slow requests
        success_rate: 0.1,      // 10% of successes
        vip_users: [],
        vip_wallets: [],
        debug_features: ['debug_logging', 'staging_tests'],
      }
      break

    case 'development':
    default:
      config.sampling = {
        error_rate: 1.0,        // Keep 100% of errors
        slow_request_threshold_ms: 500,
        slow_request_rate: 1.0, // Keep 100% of slow requests
        success_rate: 0.5,      // 50% of successes for development
        vip_users: [],
        vip_wallets: [],
        debug_features: ['debug_logging', 'dev_mode'],
      }
      break
  }

  return config
}

/**
 * Get log level based on environment
 */
export function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  const level = process.env.LOG_LEVEL?.toLowerCase()

  switch (level) {
    case 'debug':
      return 'debug'
    case 'info':
      return 'info'
    case 'warn':
      return 'warn'
    case 'error':
      return 'error'
    default:
      // Default to info in production, debug in development
      return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
}

/**
 * Check if detailed error logging is enabled
 */
export function isDetailedErrorLoggingEnabled(): boolean {
  return process.env.DETAILED_ERROR_LOGGING === 'true' ||
         process.env.NODE_ENV === 'development'
}

/**
 * Check if performance monitoring is enabled
 */
export function isPerformanceMonitoringEnabled(): boolean {
  return process.env.PERFORMANCE_MONITORING === 'true' ||
         process.env.NODE_ENV !== 'production'
}