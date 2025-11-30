/**
 * Turso Database Configuration Module
 * 
 * Handles environment variable configuration for Turso database connection.
 * Provides graceful defaults when database is not configured (optional feature).
 * 
 * @module database/config
 */

/**
 * Turso database configuration
 */
export interface TursoConfig {
    /**
     * Turso database URL (libsql://...)
     */
    url: string | null

    /**
     * Turso authentication token
     */
    authToken: string | null

    /**
     * Whether database is enabled (both URL and token present)
     */
    enabled: boolean

    /**
     * Environment mode
     */
    mode: 'development' | 'production'

    /**
     * Connection pool configuration
     */
    pool: {
        /**
         * Maximum number of concurrent connections
         */
        max: number

        /**
         * Minimum number of idle connections
         */
        min: number

        /**
         * Connection timeout in milliseconds
         */
        connectionTimeoutMs: number

        /**
         * Idle timeout in milliseconds
         */
        idleTimeoutMs: number
    }
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<TursoConfig, 'url' | 'authToken' | 'enabled'> = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    pool: {
        max: 10,
        min: 2,
        connectionTimeoutMs: 5000,
        idleTimeoutMs: 30000
    }
}

/**
 * Get Turso database configuration from environment variables
 * 
 * Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from environment.
 * If either is missing, returns disabled configuration (graceful fallback).
 * 
 * @returns Turso configuration object
 * 
 * @example
 * ```typescript
 * const config = getTursoConfig()
 * if (config.enabled) {
 *   console.log('Database enabled:', config.url)
 * } else {
 *   console.log('Database not configured, using on-chain only')
 * }
 * ```
 */
export function getTursoConfig(): TursoConfig {
    const url = process.env.TURSO_DATABASE_URL ?? null
    const authToken = process.env.TURSO_AUTH_TOKEN ?? null

    // Database is only enabled if both URL and token are provided
    const enabled = Boolean(url && authToken)

    if (!enabled && (url ?? authToken)) {
        // Warn if only one is set (likely configuration error)
        console.warn(
            '[GhostSpeak Database] Incomplete Turso configuration detected. ' +
            'Both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required. ' +
            'Falling back to on-chain only mode.'
        )
    }

    return {
        url,
        authToken,
        enabled,
        ...DEFAULT_CONFIG
    }
}

/**
 * Validate Turso configuration
 * 
 * Checks if configuration is valid and ready to use.
 * 
 * @param config - Configuration to validate
 * @returns True if configuration is valid
 */
export function validateConfig(config: TursoConfig): boolean {
    if (!config.enabled) {
        return false
    }

    if (!config.url || !config.authToken) {
        return false
    }

    // Validate URL format
    if (!config.url.startsWith('libsql://') && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
        console.error('[GhostSpeak Database] Invalid TURSO_DATABASE_URL format. Expected libsql://, http://, or https://')
        return false
    }

    return true
}

/**
 * Get configuration summary for logging
 * 
 * Returns safe configuration summary (without sensitive data)
 * 
 * @param config - Configuration to summarize
 * @returns Configuration summary
 */
export function getConfigSummary(config: TursoConfig): Record<string, unknown> {
    return {
        enabled: config.enabled,
        mode: config.mode,
        url: config.url ? '***' : null,
        authToken: config.authToken ? '***' : null,
        pool: config.pool
    }
}
