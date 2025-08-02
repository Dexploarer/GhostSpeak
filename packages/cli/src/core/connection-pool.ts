/**
 * Advanced Connection Pooling System for GhostSpeak CLI
 * 
 * Provides intelligent RPC connection pooling with health monitoring,
 * load balancing, and automatic failover for optimal performance.
 * 
 * @example
 * ```typescript
 * const poolManager = ConnectionPoolManager.getInstance()
 * 
 * // Get optimized connection
 * const connection = await poolManager.getConnection('devnet')
 * 
 * // Use connection for RPC calls
 * const result = await connection.call('getAccountInfo', [address])
 * 
 * // Connection is automatically returned to pool
 * ```
 */

import { EventEmitter } from 'events'
import { createSolanaRpc, type SolanaRpcApi } from '@solana/kit'
import { EventBus } from './event-system'

/**
 * Network types supported by the connection pool
 */
export type NetworkType = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet'

/**
 * Connection health status
 */
export type ConnectionHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/**
 * RPC endpoint configuration
 */
export interface RpcEndpoint {
  /** Endpoint URL */
  url: string
  /** Weight for load balancing (higher = more traffic) */
  weight: number
  /** Maximum concurrent connections */
  maxConnections: number
  /** Connection timeout in milliseconds */
  timeout: number
  /** Health check interval in milliseconds */
  healthCheckInterval: number
  /** Current health status */
  health: ConnectionHealth
  /** Last health check timestamp */
  lastHealthCheck: Date
  /** Response time statistics */
  responseTime: {
    current: number
    average: number
    min: number
    max: number
    samples: number[]
  }
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  /** Total connections in pool */
  totalConnections: number
  /** Active connections in use */
  activeConnections: number
  /** Idle connections available */
  idleConnections: number
  /** Total requests processed */
  totalRequests: number
  /** Average response time */
  averageResponseTime: number
  /** Pool hit rate */
  hitRate: number
  /** Number of connection failures */
  failures: number
  /** Health check results */
  healthStats: Record<string, ConnectionHealth>
}

/**
 * Connection wrapper with enhanced functionality
 */
export class PooledConnection extends EventEmitter {
  private rpc: SolanaRpcApi
  private endpoint: RpcEndpoint
  private createdAt: Date
  private lastUsed: Date
  private requestCount = 0
  private isActive = false
  private pool: ConnectionPool

  constructor(rpc: SolanaRpcApi, endpoint: RpcEndpoint, pool: ConnectionPool) {
    super()
    this.rpc = rpc
    this.endpoint = endpoint
    this.pool = pool
    this.createdAt = new Date()
    this.lastUsed = new Date()
  }

  /**
   * Execute RPC call with performance tracking
   */
  async call<T = unknown>(method: string, params?: unknown[]): Promise<T> {
    const startTime = Date.now()
    this.isActive = true
    this.requestCount++
    this.lastUsed = new Date()

    try {
      // Execute the RPC call using the rpc instance
      const result = await (this.rpc as any)[method]?.(...(params ?? []))
      
      // Track response time
      const responseTime = Date.now() - startTime
      this.updateResponseTime(responseTime)

      this.emit('request_completed', {
        method,
        responseTime,
        success: true
      })

      return result as T

    } catch {
      const responseTime = Date.now() - startTime
      this.updateResponseTime(responseTime)

      this.emit('request_failed', {
        method,
        responseTime,
        error
      })

      throw _error
    } finally {
      this.isActive = false
      // Return connection to pool
      this.pool.releaseConnection(this)
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      endpoint: this.endpoint.url,
      createdAt: this.createdAt,
      lastUsed: this.lastUsed,
      requestCount: this.requestCount,
      isActive: this.isActive,
      health: this.endpoint.health,
      responseTime: this.endpoint.responseTime
    }
  }

  /**
   * Check if connection is stale
   */
  isStale(maxIdleTime: number): boolean {
    return Date.now() - this.lastUsed.getTime() > maxIdleTime
  }

  /**
   * Update response time statistics
   */
  private updateResponseTime(responseTime: number): void {
    const stats = this.endpoint.responseTime
    stats.current = responseTime
    stats.min = Math.min(stats.min, responseTime)
    stats.max = Math.max(stats.max, responseTime)
    
    // Keep only recent samples for average calculation
    stats.samples.push(responseTime)
    if (stats.samples.length > 100) {
      stats.samples = stats.samples.slice(-100)
    }
    
    stats.average = stats.samples.reduce((sum, time) => sum + time, 0) / stats.samples.length
  }
}

/**
 * Connection pool for a specific network
 */
export class ConnectionPool extends EventEmitter {
  private network: NetworkType
  private endpoints: RpcEndpoint[]
  private connections: PooledConnection[] = []
  private activeConnections = new Set<PooledConnection>()
  private config: {
    minConnections: number
    maxConnections: number
    maxIdleTime: number
    healthCheckInterval: number
  }
  private healthCheckInterval: NodeJS.Timeout | null = null
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    hitRate: 0,
    failures: 0,
    healthStats: {}
  }

  constructor(
    network: NetworkType,
    endpoints: RpcEndpoint[],
    config = {
      minConnections: 2,
      maxConnections: 10,
      maxIdleTime: 300000, // 5 minutes
      healthCheckInterval: 30000 // 30 seconds
    }
  ) {
    super()
    this.network = network
    this.endpoints = endpoints
    this.config = config

    // Initialize minimum connections
    this.initializePool()
    
    // Start health checks
    this.startHealthChecks()
  }

  /**
   * Get connection from pool
   */
  async getConnection(): Promise<PooledConnection> {
    // Try to get idle connection first
    const idleConnection = this.getIdleConnection()
    if (idleConnection) {
      this.activeConnections.add(idleConnection)
      this.updateStats()
      return idleConnection
    }

    // Create new connection if under limit
    if (this.connections.length < this.config.maxConnections) {
      const connection = await this.createConnection()
      this.connections.push(connection)
      this.activeConnections.add(connection)
      this.updateStats()
      return connection
    }

    // Wait for connection to become available
    return this.waitForConnection()
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection: PooledConnection): void {
    this.activeConnections.delete(connection)
    this.updateStats()
    this.emit('connection_released', connection)
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return { ...this.stats }
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // Close all connections
    for (const connection of this.connections) {
      connection.removeAllListeners()
    }

    this.connections = []
    this.activeConnections.clear()
    this.emit('pool_closed')
  }

  /**
   * Initialize pool with minimum connections
   */
  private async initializePool(): Promise<void> {
    const promises = []
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection())
    }

    try {
      const connections = await Promise.all(promises)
      this.connections.push(...connections)
      this.updateStats()
    } catch (_error) {
      this.emit('pool_initializationerror', error)
    }
  }

  /**
   * Create new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const endpoint = this.selectEndpoint()
    
    try {
      const rpc = createSolanaRpc(endpoint.url) as unknown as SolanaRpcApi as unknown as SolanaRpcApi
      const connection = new PooledConnection(rpc, endpoint, this)
      
      // Setup connection event handlers
      connection.on('request_completed', (data) => {
        this.stats.totalRequests++
        this.updateAverageResponseTime(data.responseTime)
      })

      connection.on('request_failed', (_data) => {
        this.stats.failures++
        this.updateEndpointHealth(endpoint, 'degraded')
      })

      this.emit('connection_created', connection)
      return connection

    } catch {
      this.updateEndpointHealth(endpoint, 'unhealthy')
      throw new Error(`Failed to create connection to ${endpoint.url}: ${error}`)
    }
  }

  /**
   * Get idle connection from pool
   */
  private getIdleConnection(): PooledConnection | null {
    for (const connection of this.connections) {
      if (!this.activeConnections.has(connection) && !connection.isStale(this.config.maxIdleTime)) {
        return connection
      }
    }
    return null
  }

  /**
   * Wait for connection to become available
   */
  private async waitForConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout: No connections available'))
      }, 10000) // 10 second timeout

      const onConnectionReleased = (connection: PooledConnection) => {
        clearTimeout(timeout)
        this.off('connection_released', onConnectionReleased)
        this.activeConnections.add(connection)
        resolve(connection)
      }

      this.on('connection_released', onConnectionReleased)
    })
  }

  /**
   * Select best endpoint using weighted round-robin
   */
  private selectEndpoint(): RpcEndpoint {
    const healthyEndpoints = this.endpoints.filter(ep => 
      ep.health === 'healthy' || ep.health === 'unknown'
    )

    if (healthyEndpoints.length === 0) {
      // Fall back to degraded endpoints if no healthy ones
      const degradedEndpoints = this.endpoints.filter(ep => ep.health === 'degraded')
      if (degradedEndpoints.length > 0) {
        return degradedEndpoints[0]
      }
      // Last resort: use any endpoint
      return this.endpoints[0]
    }

    // Weighted selection based on performance and weight
    const totalWeight = healthyEndpoints.reduce((sum, ep) => {
      const performanceWeight = Math.max(1, 1000 / (ep.responseTime.average ?? 1000))
      return sum + ep.weight * performanceWeight
    }, 0)

    const random = Math.random() * totalWeight
    let currentWeight = 0

    for (const endpoint of healthyEndpoints) {
      const performanceWeight = Math.max(1, 1000 / (endpoint.responseTime.average ?? 1000))
      currentWeight += endpoint.weight * performanceWeight
      if (random <= currentWeight) {
        return endpoint
      }
    }

    return healthyEndpoints[0]
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health checks on all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const promises = this.endpoints.map(endpoint => this.checkEndpointHealth(endpoint))
    await Promise.allSettled(promises)
    this.cleanupStaleConnections()
  }

  /**
   * Check health of specific endpoint
   */
  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Simple health check - get latest blockhash
      const rpc = createSolanaRpc(endpoint.url) as unknown as SolanaRpcApi
      await (rpc as any).getLatestBlockhash?.()
      
      const responseTime = Date.now() - startTime
      endpoint.responseTime.current = responseTime
      endpoint.lastHealthCheck = new Date()
      
      // Determine health based on response time
      if (responseTime < 1000) {
        this.updateEndpointHealth(endpoint, 'healthy')
      } else if (responseTime < 3000) {
        this.updateEndpointHealth(endpoint, 'degraded')
      } else {
        this.updateEndpointHealth(endpoint, 'unhealthy')
      }

    } catch {
      this.updateEndpointHealth(endpoint, 'unhealthy')
      endpoint.lastHealthCheck = new Date()
    }
  }

  /**
   * Update endpoint health status
   */
  private updateEndpointHealth(endpoint: RpcEndpoint, health: ConnectionHealth): void {
    if (endpoint.health !== health) {
      const oldHealth = endpoint.health
      endpoint.health = health
      this.stats.healthStats[endpoint.url] = health
      
      this.emit('endpoint_health_changed', {
        endpoint: endpoint.url,
        oldHealth,
        newHealth: health
      })
    }
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const staleConnections = this.connections.filter(conn => 
      !this.activeConnections.has(conn) && conn.isStale(this.config.maxIdleTime)
    )

    for (const staleConnection of staleConnections) {
      const index = this.connections.indexOf(staleConnection)
      if (index > -1) {
        this.connections.splice(index, 1)
        staleConnection.removeAllListeners()
      }
    }

    this.updateStats()
  }

  /**
   * Update pool statistics
   */
  private updateStats(): void {
    this.stats.totalConnections = this.connections.length
    this.stats.activeConnections = this.activeConnections.size
    this.stats.idleConnections = this.connections.length - this.activeConnections.size
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.totalRequests - this.stats.failures) / this.stats.totalRequests) * 100 
      : 0

    // Update health stats
    for (const endpoint of this.endpoints) {
      this.stats.healthStats[endpoint.url] = endpoint.health
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.stats.averageResponseTime
    const totalRequests = this.stats.totalRequests
    
    // Running average calculation
    this.stats.averageResponseTime = totalRequests > 1
      ? ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests
      : responseTime
  }
}

/**
 * Global connection pool manager
 */
export class ConnectionPoolManager extends EventEmitter {
  private static instance: ConnectionPoolManager | null = null
  private pools = new Map<NetworkType, ConnectionPool>()
  private eventBus = EventBus.getInstance()
  private defaultEndpoints: Record<NetworkType, RpcEndpoint[]> = {
    'mainnet-beta': [
      {
        url: 'https://api.mainnet-beta.solana.com',
        weight: 10,
        maxConnections: 5,
        timeout: 30000,
        healthCheckInterval: 60000,
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      },
      {
        url: 'https://solana-api.projectserum.com',
        weight: 8,
        maxConnections: 3,
        timeout: 30000,
        healthCheckInterval: 60000,
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      }
    ],
    'testnet': [
      {
        url: 'https://api.testnet.solana.com',
        weight: 10,
        maxConnections: 5,
        timeout: 30000,
        healthCheckInterval: 60000,
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      }
    ],
    'devnet': [
      {
        url: 'https://api.devnet.solana.com',
        weight: 10,
        maxConnections: 5,
        timeout: 30000,
        healthCheckInterval: 60000,
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      }
    ],
    'localnet': [
      {
        url: 'http://localhost:8899',
        weight: 10,
        maxConnections: 3,
        timeout: 10000,
        healthCheckInterval: 30000,
        health: 'unknown',
        lastHealthCheck: new Date(),
        responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
      }
    ]
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager()
    }
    return ConnectionPoolManager.instance
  }

  /**
   * Get connection for network
   */
  async getConnection(network: NetworkType): Promise<PooledConnection> {
    let pool = this.pools.get(network)
    
    if (!pool) {
      pool = await this.createPool(network)
      this.pools.set(network, pool)
    }

    return pool.getConnection()
  }

  /**
   * Add custom RPC endpoint
   */
  addEndpoint(network: NetworkType, endpoint: RpcEndpoint): void {
    if (!this.defaultEndpoints[network]) {
      this.defaultEndpoints[network] = []
    }
    this.defaultEndpoints[network].push(endpoint)

    // If pool exists, recreate it with new endpoints
    const existingPool = this.pools.get(network)
    if (existingPool) {
      existingPool.close()
      this.pools.delete(network)
    }

    this.eventBus.emit('connection_pool:endpoint_added', { network, endpoint })
  }

  /**
   * Get statistics for all pools
   */
  getAllStats(): Record<NetworkType, PoolStats> {
    const stats: Record<string, PoolStats> = {}
    
    for (const [network, pool] of this.pools) {
      stats[network] = pool.getStats()
    }

    return stats as Record<NetworkType, PoolStats>
  }

  /**
   * Close all pools
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map(pool => pool.close())
    await Promise.all(promises)
    this.pools.clear()
    this.eventBus.emit('connection_pool:all_closed')
  }

  /**
   * Create pool for network
   */
  private async createPool(network: NetworkType): Promise<ConnectionPool> {
    const endpoints = this.defaultEndpoints[network] ?? []
    
    if (endpoints.length === 0) {
      throw new Error(`No RPC endpoints configured for network: ${network}`)
    }

    const pool = new ConnectionPool(network, endpoints)
    
    // Forward pool events to event bus
    pool.on('connection_created', (connection) => {
      this.eventBus.emit('connection_pool:connection_created', { network, connection })
    })

    pool.on('endpoint_health_changed', (data) => {
      this.eventBus.emit('connection_pool:health_changed', { network, ...data })
    })

    return pool
  }
}

// Export singleton instance
export const connectionPoolManager = ConnectionPoolManager.getInstance()