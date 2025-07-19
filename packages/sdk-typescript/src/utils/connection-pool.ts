/**
 * Connection Pool and Caching for Solana RPC Client
 * July 2025 Best Practices
 */

import { SolanaRpcClient, type SolanaRpcClientConfig } from './rpc-client.js'
import type { Address, Signature } from '@solana/kit'
import type { AccountInfo } from '../types/rpc-types.js'

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /** Maximum number of connections in the pool */
  maxConnections: number
  /** Minimum number of connections to maintain */
  minConnections: number
  /** Connection idle timeout in milliseconds */
  idleTimeoutMs: number
  /** Maximum connection age in milliseconds */
  maxAgeMs: number
  /** Connection validation interval in milliseconds */
  validationIntervalMs: number
  /** Enable connection health checks */
  enableHealthChecks: boolean
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of items in cache */
  maxSize: number
  /** Default TTL in milliseconds */
  defaultTtlMs: number
  /** Account data TTL in milliseconds */
  accountTtlMs: number
  /** Transaction data TTL in milliseconds */
  transactionTtlMs: number
  /** Enable cache statistics */
  enableStats: boolean
}

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  totalRequests: number
  failedRequests: number
  averageResponseTime: number
  cacheHits: number
  cacheMisses: number
  cacheSize: number
}

/**
 * Connection wrapper with metadata
 */
interface PooledConnection {
  client: SolanaRpcClient
  created: number
  lastUsed: number
  inUse: boolean
  healthy: boolean
  requestCount: number
  endpoint: string
}

/**
 * RPC Connection Pool with caching and load balancing
 */
export class SolanaConnectionPool {
  private connections: Map<string, PooledConnection[]> = new Map()
  private cache: Map<string, CacheEntry<any>> = new Map()
  private config: ConnectionPoolConfig
  private cacheConfig: CacheConfig
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheSize: 0
  }
  private responseTimeSum = 0
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(
    poolConfig: Partial<ConnectionPoolConfig> = {},
    cacheConfig: Partial<CacheConfig> = {}
  ) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      idleTimeoutMs: 300000, // 5 minutes
      maxAgeMs: 3600000, // 1 hour
      validationIntervalMs: 60000, // 1 minute
      enableHealthChecks: true,
      ...poolConfig
    }

    this.cacheConfig = {
      maxSize: 10000,
      defaultTtlMs: 30000, // 30 seconds
      accountTtlMs: 10000, // 10 seconds for account data
      transactionTtlMs: 300000, // 5 minutes for transaction data
      enableStats: true,
      ...cacheConfig
    }

    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Get or create a connection for the endpoint
   */
  async getConnection(endpoint: string, clientConfig?: Partial<SolanaRpcClientConfig>): Promise<SolanaRpcClient> {
    const pool = this.connections.get(endpoint) || []
    
    // Find an available connection
    let connection = pool.find(conn => !conn.inUse && conn.healthy)
    
    if (!connection) {
      // Create new connection if under limit
      if (pool.length < this.config.maxConnections) {
        connection = await this.createConnection(endpoint, clientConfig)
        pool.push(connection)
        this.connections.set(endpoint, pool)
      } else {
        // Wait for available connection or reuse oldest
        connection = pool.reduce((oldest, current) => 
          current.lastUsed < oldest.lastUsed ? current : oldest
        )
        
        if (connection.inUse) {
          // Force create new connection if all are busy
          connection = await this.createConnection(endpoint, clientConfig)
          pool.push(connection)
          this.connections.set(endpoint, pool)
        }
      }
    }

    // Mark connection as in use
    connection.inUse = true
    connection.lastUsed = Date.now()
    connection.requestCount++

    this.updateStats()
    return connection.client
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(endpoint: string, client: SolanaRpcClient): void {
    const pool = this.connections.get(endpoint)
    if (!pool) return

    const connection = pool.find(conn => conn.client === client)
    if (connection) {
      connection.inUse = false
      connection.lastUsed = Date.now()
      this.updateStats()
    }
  }

  /**
   * Get cached value
   */
  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      if (this.cacheConfig.enableStats) {
        this.stats.cacheMisses++
      }
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.cacheConfig.enableStats) {
        this.stats.cacheMisses++
      }
      return null
    }

    if (this.cacheConfig.enableStats) {
      this.stats.cacheHits++
    }
    return entry.value
  }

  /**
   * Set cached value
   */
  setCached<T>(key: string, value: T, ttl?: number): void {
    // Check cache size limit
    if (this.cache.size >= this.cacheConfig.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.cacheConfig.defaultTtlMs
    }

    this.cache.set(key, entry)
    this.updateStats()
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    this.updateStats()
  }

  /**
   * Get cached account info
   */
  async getCachedAccountInfo(endpoint: string, address: Address): Promise<AccountInfo | null> {
    const cacheKey = `account:${endpoint}:${address}`
    const cached = this.getCached<AccountInfo>(cacheKey)
    if (cached) return cached

    const client = await this.getConnection(endpoint)
    try {
      const startTime = Date.now()
      const account = await client.getAccountInfo(address)
      this.recordResponseTime(Date.now() - startTime)
      
      if (account) {
        this.setCached(cacheKey, account, this.cacheConfig.accountTtlMs)
      }
      
      return account
    } catch (error) {
      this.stats.failedRequests++
      throw error
    } finally {
      this.releaseConnection(endpoint, client)
    }
  }

  /**
   * Get cached transaction
   */
  async getCachedTransaction(endpoint: string, signature: Signature): Promise<any | null> {
    const cacheKey = `transaction:${endpoint}:${signature}`
    const cached = this.getCached<any>(cacheKey)
    if (cached) return cached

    const client = await this.getConnection(endpoint)
    try {
      const startTime = Date.now()
      const transaction = await client.getTransaction(signature)
      this.recordResponseTime(Date.now() - startTime)
      
      if (transaction) {
        this.setCached(cacheKey, transaction, this.cacheConfig.transactionTtlMs)
      }
      
      return transaction
    } catch (error) {
      this.stats.failedRequests++
      throw error
    } finally {
      this.releaseConnection(endpoint, client)
    }
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
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Clear cache
    this.clearCache()

    // Close all connections
    for (const [endpoint, pool] of this.connections) {
      pool.forEach(conn => {
        // Note: SolanaRpcClient doesn't have a close method in the current implementation
        // This would be added if needed for proper cleanup
      })
    }

    this.connections.clear()
  }

  /**
   * Create a new connection
   */
  private async createConnection(
    endpoint: string,
    clientConfig?: Partial<SolanaRpcClientConfig>
  ): Promise<PooledConnection> {
    const client = new SolanaRpcClient({
      endpoint,
      ...clientConfig
    })

    const connection: PooledConnection = {
      client,
      created: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
      healthy: true,
      requestCount: 0,
      endpoint
    }

    this.stats.totalConnections++
    
    // Test connection health if enabled
    if (this.config.enableHealthChecks) {
      try {
        await client.getHealth()
      } catch {
        connection.healthy = false
      }
    }

    return connection
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    let totalConnections = 0
    let activeConnections = 0
    let idleConnections = 0

    for (const pool of this.connections.values()) {
      totalConnections += pool.length
      activeConnections += pool.filter(conn => conn.inUse).length
      idleConnections += pool.filter(conn => !conn.inUse).length
    }

    this.stats.totalConnections = totalConnections
    this.stats.activeConnections = activeConnections
    this.stats.idleConnections = idleConnections
    this.stats.cacheSize = this.cache.size
  }

  /**
   * Record response time
   */
  private recordResponseTime(responseTime: number): void {
    this.stats.totalRequests++
    this.responseTimeSum += responseTime
    this.stats.averageResponseTime = this.responseTimeSum / this.stats.totalRequests
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.config.validationIntervalMs)
  }

  /**
   * Cleanup expired connections and cache entries
   */
  private cleanup(): void {
    const now = Date.now()

    // Cleanup connections
    for (const [endpoint, pool] of this.connections) {
      const activePool = pool.filter(conn => {
        // Remove old or idle connections
        const isExpired = now - conn.created > this.config.maxAgeMs
        const isIdle = !conn.inUse && now - conn.lastUsed > this.config.idleTimeoutMs
        const shouldRemove = isExpired || (isIdle && pool.length > this.config.minConnections)
        
        if (shouldRemove) {
          this.stats.totalConnections--
        }
        
        return !shouldRemove
      })

      if (activePool.length === 0) {
        this.connections.delete(endpoint)
      } else {
        this.connections.set(endpoint, activePool)
      }
    }

    // Cleanup cache
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }

    this.updateStats()
  }
}

/**
 * Global connection pool instance
 */
let globalPool: SolanaConnectionPool | null = null

/**
 * Get or create global connection pool
 */
export function getGlobalConnectionPool(
  poolConfig?: Partial<ConnectionPoolConfig>,
  cacheConfig?: Partial<CacheConfig>
): SolanaConnectionPool {
  if (!globalPool) {
    globalPool = new SolanaConnectionPool(poolConfig, cacheConfig)
  }
  return globalPool
}

/**
 * Set global connection pool
 */
export function setGlobalConnectionPool(pool: SolanaConnectionPool): void {
  globalPool = pool
}

/**
 * Close global connection pool
 */
export async function closeGlobalConnectionPool(): Promise<void> {
  if (globalPool) {
    await globalPool.close()
    globalPool = null
  }
}