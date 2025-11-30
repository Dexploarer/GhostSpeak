/**
 * Turso Database Connection Manager
 * 
 * Provides singleton connection management with health checks,
 * retry logic, and graceful error handling.
 * 
 * @module database/connection
 */

import { createClient, type Client } from '@libsql/client'
import { getTursoConfig, validateConfig, type TursoConfig } from './config.js'

/**
 * Connection state
 */
interface ConnectionState {
    client: Client | null
    initialized: boolean
    healthy: boolean
    lastError: Error | null
    retryCount: number
    lastConnectAttempt: number
}

/**
 * Retry configuration
 */
interface RetryConfig {
    maxRetries: number
    initialDelayMs: number
    maxDelayMs: number
    backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
}

/**
 * Singleton connection state
 */
let connectionState: ConnectionState = {
    client: null,
    initialized: false,
    healthy: false,
    lastError: null,
    retryCount: 0,
    lastConnectAttempt: 0
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(retryCount: number, config: RetryConfig): number {
    const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount),
        config.maxDelayMs
    )
    return delay
}

/**
 * Initialize database connection with retry logic
 * 
 * @param config - Turso configuration
 * @param retryConfig - Retry configuration
 * @returns Database client
 * @throws Error if connection fails after all retries
 */
async function initializeConnection(
    config: TursoConfig,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Client> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
            connectionState.lastConnectAttempt = Date.now()

            if (attempt > 0) {
                const delay = getRetryDelay(attempt - 1, retryConfig)
                console.log(`[GhostSpeak Database] Retrying connection (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}) after ${delay}ms...`)
                await sleep(delay)
            }

            // Create libsql client
            const client = createClient({
                url: config.url!,
                authToken: config.authToken!
            })

            // Test connection with simple query
            await client.execute('SELECT 1')

            console.log('[GhostSpeak Database] Connection established successfully')
            connectionState.retryCount = attempt
            connectionState.healthy = true
            connectionState.lastError = null

            return client

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.error(`[GhostSpeak Database] Connection attempt ${attempt + 1} failed:`, lastError.message)

            if (attempt === retryConfig.maxRetries) {
                connectionState.healthy = false
                connectionState.lastError = lastError
                break
            }
        }
    }

    throw new Error(
        `Failed to connect to Turso database after ${retryConfig.maxRetries + 1} attempts. ` +
        `Last error: ${lastError?.message ?? 'Unknown error'}`
    )
}

/**
 * Get database connection (singleton pattern with lazy initialization)
 * 
 * Returns existing connection if available, otherwise creates new one.
 * Throws error if database is not configured or connection fails.
 * 
 * @returns Database client
 * @throws Error if database not configured or connection fails
 * 
 * @example
 * ```typescript
 * try {
 *   const db = await getConnection()
 *   const result = await db.execute('SELECT * FROM agents LIMIT 10')
 *   console.log('Query successful:', result.rows.length)
 * } catch (error) {
 *   console.error('Database not available:', error)
 *   // Fallback to on-chain only
 * }
 * ```
 */
export async function getConnection(): Promise<Client> {
    const config = getTursoConfig()

    // Check if database is configured
    if (!config.enabled) {
        throw new Error(
            'Turso database not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.'
        )
    }

    // Validate configuration
    if (!validateConfig(config)) {
        throw new Error('Invalid Turso database configuration')
    }

    // Return existing connection if available and healthy
    if (connectionState.client && connectionState.healthy) {
        return connectionState.client
    }

    // Initialize new connection
    if (!connectionState.initialized || !connectionState.healthy) {
        connectionState.initialized = true
        connectionState.client = await initializeConnection(config)
    }

    return connectionState.client!
}

/**
 * Check database connection health
 * 
 * Executes simple query to verify connection is working.
 * Updates connection state based on result.
 * 
 * @returns True if connection is healthy
 * 
 * @example
 * ```typescript
 * const isHealthy = await ping()
 * if (!isHealthy) {
 *   console.warn('Database connection unhealthy, reconnecting...')
 *   await disconnect()
 *   await getConnection() // Reconnect
 * }
 * ```
 */
export async function ping(): Promise<boolean> {
    try {
        const client = await getConnection()
        const result = await client.execute('SELECT 1 as ping')

        connectionState.healthy = true
        connectionState.lastError = null

        return result.rows.length === 1

    } catch (error) {
        connectionState.healthy = false
        connectionState.lastError = error instanceof Error ? error : new Error(String(error))
        console.error('[GhostSpeak Database] Health check failed:', connectionState.lastError.message)
        return false
    }
}

/**
 * Disconnect from database
 * 
 * Closes connection and resets state. Safe to call multiple times.
 * 
 * @example
 * ```typescript
 * // Clean shutdown
 * await disconnect()
 * console.log('Database connection closed')
 * ```
 */
export async function disconnect(): Promise<void> {
    if (connectionState.client) {
        try {
            // libsql client doesn't have explicit close method
            // Just reset state to allow reconnection
            connectionState.client = null
            connectionState.initialized = false
            connectionState.healthy = false
            console.log('[GhostSpeak Database] Connection closed')
        } catch (error) {
            console.error('[GhostSpeak Database] Error during disconnect:', error)
        }
    }
}

/**
 * Get connection state (for monitoring and debugging)
 * 
 * @returns Current connection state (without sensitive data)
 */
export function getConnectionState(): Omit<ConnectionState, 'client'> {
    return {
        initialized: connectionState.initialized,
        healthy: connectionState.healthy,
        lastError: connectionState.lastError,
        retryCount: connectionState.retryCount,
        lastConnectAttempt: connectionState.lastConnectAttempt
    }
}

/**
 * Check if database is available
 * 
 * Non-throwing check for database availability.
 * 
 * @returns True if database is configured and connection can be established
 */
export async function isAvailable(): Promise<boolean> {
    const config = getTursoConfig()

    if (!config.enabled) {
        return false
    }

    try {
        await getConnection()
        return true
    } catch {
        return false
    }
}

/**
 * Reset connection state (useful for testing)
 * 
 * @internal
 */
export function resetConnectionState(): void {
    connectionState = {
        client: null,
        initialized: false,
        healthy: false,
        lastError: null,
        retryCount: 0,
        lastConnectAttempt: 0
    }
}
