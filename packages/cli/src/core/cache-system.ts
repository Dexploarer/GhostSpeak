/**
 * Advanced multi-level caching system for GhostSpeak CLI
 * 
 * Provides intelligent caching with TTL, invalidation strategies,
 * memory management, and Redis-compatible interface.
 * 
 * @example
 * ```typescript
 * const cache = CacheManager.getInstance()
 * 
 * // Basic caching
 * await cache.set('user:123', userData, { ttl: 300 })
 * const user = await cache.get('user:123')
 * 
 * // Pattern-based operations
 * await cache.invalidatePattern('user:*')
 * 
 * // Cache warming
 * await cache.warm('blockchain:agents', () => fetchAgents())
 * ```
 */

import { EventEmitter } from 'events'
import { LRUCache } from 'lru-cache'
import { EventBus } from './event-system'

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  /** Cached value */
  value: T
  /** Creation timestamp */
  createdAt: Date
  /** Expiration timestamp */
  expiresAt?: Date
  /** Access count */
  accessCount: number
  /** Last access timestamp */
  lastAccessedAt: Date
  /** Entry size in bytes (estimated) */
  size: number
  /** Entry tags for grouping */
  tags?: string[]
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number
  /** Tags for grouping and invalidation */
  tags?: string[]
  /** Cache level (memory, disk, network) */
  level?: 'memory' | 'disk' | 'network'
  /** Compression enabled */
  compress?: boolean
  /** Serialization method */
  serializer?: 'json' | 'msgpack' | 'binary'
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  size: number
  /** Cache hits */
  hits: number
  /** Cache misses */
  misses: number
  /** Hit rate percentage */
  hitRate: number
  /** Memory usage (estimated bytes) */
  memoryUsage: number
  /** Total operations */
  operations: number
  /** Average response time */
  avgResponseTime: number
}

/**
 * Cache invalidation strategy
 */
export type InvalidationStrategy = 
  | 'ttl'        // Time-based expiration
  | 'lru'        // Least Recently Used
  | 'lfu'        // Least Frequently Used
  | 'fifo'       // First In, First Out
  | 'manual'     // Manual invalidation only

/**
 * Multi-level cache manager
 */
export class CacheManager extends EventEmitter {
  private static instance: CacheManager | null = null

  // Memory cache (L1)
  private memoryCache: LRUCache<string, CacheEntry>

  // Disk cache simulation (L2) - in real implementation would use filesystem
  private diskCache = new Map<string, CacheEntry>()

  // Network cache simulation (L3) - in real implementation would use Redis
  private networkCache = new Map<string, CacheEntry>()

  // Cache statistics
  private stats: CacheStats = {
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    memoryUsage: 0,
    operations: 0,
    avgResponseTime: 0
  }

  // Response times for average calculation
  private responseTimes: number[] = []

  // Tag index for efficient invalidation
  private tagIndex = new Map<string, Set<string>>()

  // Event bus for cache events
  private eventBus = EventBus.getInstance()

  constructor(options?: {
    maxMemorySize?: number
    maxDiskSize?: number
    defaultTTL?: number
  }) {
    super()

    const {
      maxMemorySize = 100 * 1024 * 1024, // 100MB
      maxDiskSize = 1024 * 1024 * 1024,   // 1GB
      defaultTTL = 3600                    // 1 hour
    } = options || {}

    // Initialize memory cache with LRU
    this.memoryCache = new LRUCache({
      maxSize: maxMemorySize,
      sizeCalculation: (entry: CacheEntry) => entry.size,
      dispose: (entry, key) => {
        this.removeFromTagIndex(key, entry.tags)
        this.eventBus.emit('cache:evicted', { key, level: 'memory' })
      }
    })

    // Start cache maintenance
    this.startMaintenance()
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: {
    maxMemorySize?: number
    maxDiskSize?: number
    defaultTTL?: number
  }): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(options)
    }
    return CacheManager.instance
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const startTime = Date.now()
    this.stats.operations++

    try {
      // Check memory cache first (L1)
      let entry = this.memoryCache.get(key)
      let level: 'memory' | 'disk' | 'network' = 'memory'

      // Check disk cache if not in memory (L2)
      if (!entry) {
        entry = this.diskCache.get(key)
        level = 'disk'

        // Check network cache if not in disk (L3)
        if (!entry) {
          entry = this.networkCache.get(key)
          level = 'network'
        }

        // Promote to memory if found
        if (entry) {
          this.memoryCache.set(key, entry)
        }
      }

      if (entry) {
        // Check expiration
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          await this.delete(key)
          this.recordMiss(startTime)
          return null
        }

        // Update access metadata
        entry.accessCount++
        entry.lastAccessedAt = new Date()

        this.recordHit(startTime)
        this.eventBus.emit('cache:hit', { key, level })

        return entry.value as T
      }

      this.recordMiss(startTime)
      this.eventBus.emit('cache:miss', { key })
      return null

    } catch (error) {
      this.eventBus.emit('cache:error', { key, error })
      this.recordMiss(startTime)
      return null
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = Date.now()
    this.stats.operations++

    try {
      const {
        ttl,
        tags = [],
        level = 'memory',
        compress = false,
        serializer = 'json'
      } = options

      // Create cache entry
      const now = new Date()
      const entry: CacheEntry<T> = {
        value,
        createdAt: now,
        expiresAt: ttl ? new Date(now.getTime() + ttl * 1000) : undefined,
        accessCount: 0,
        lastAccessedAt: now,
        size: this.estimateSize(value),
        tags
      }

      // Apply compression if requested
      if (compress) {
        // In real implementation, would compress the value
        entry.size = Math.floor(entry.size * 0.7) // Simulate compression
      }

      // Store in appropriate cache level
      switch (level) {
        case 'memory':
          this.memoryCache.set(key, entry)
          break
        case 'disk':
          this.diskCache.set(key, entry)
          break
        case 'network':
          this.networkCache.set(key, entry)
          break
      }

      // Update tag index
      this.addToTagIndex(key, tags)

      // Update stats
      this.stats.size++
      this.stats.memoryUsage += entry.size

      this.recordOperation(startTime)
      this.eventBus.emit('cache:set', { key, level, size: entry.size })

    } catch (error) {
      this.eventBus.emit('cache:error', { key, error })
      throw error
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now()
    this.stats.operations++

    try {
      let deleted = false

      // Remove from all cache levels
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry) {
        this.memoryCache.delete(key)
        this.removeFromTagIndex(key, memoryEntry.tags)
        this.stats.memoryUsage -= memoryEntry.size
        deleted = true
      }

      if (this.diskCache.has(key)) {
        const diskEntry = this.diskCache.get(key)!
        this.diskCache.delete(key)
        this.removeFromTagIndex(key, diskEntry.tags)
        deleted = true
      }

      if (this.networkCache.has(key)) {
        const networkEntry = this.networkCache.get(key)!
        this.networkCache.delete(key)
        this.removeFromTagIndex(key, networkEntry.tags)
        deleted = true
      }

      if (deleted) {
        this.stats.size--
        this.eventBus.emit('cache:deleted', { key })
      }

      this.recordOperation(startTime)
      return deleted

    } catch (error) {
      this.eventBus.emit('cache:error', { key, error })
      return false
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    this.diskCache.clear()
    this.networkCache.clear()
    this.tagIndex.clear()

    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      operations: 0,
      avgResponseTime: 0
    }

    this.eventBus.emit('cache:cleared')
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = new Set<string>()

    // Collect keys from all cache levels
    for (const key of this.memoryCache.keys()) {
      allKeys.add(key)
    }

    for (const key of this.diskCache.keys()) {
      allKeys.add(key)
    }

    for (const key of this.networkCache.keys()) {
      allKeys.add(key)
    }

    const keys = Array.from(allKeys)

    if (!pattern) {
      return keys
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return keys.filter(key => regex.test(key))
  }

  /**
   * Invalidate keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern)
    let count = 0

    for (const key of keys) {
      if (await this.delete(key)) {
        count++
      }
    }

    this.eventBus.emit('cache:pattern_invalidated', { pattern, count })
    return count
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let count = 0

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        for (const key of keys) {
          if (await this.delete(key)) {
            count++
          }
        }
      }
    }

    this.eventBus.emit('cache:tags_invalidated', { tags, count })
    return count
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Warm cache with data
   */
  async warm<T>(
    key: string,
    loader: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    // Check if already in cache
    const existing = await this.get<T>(key)
    if (existing !== null) {
      return existing
    }

    // Load data
    const value = await loader()

    // Cache the loaded data
    await this.set(key, value, options)

    this.eventBus.emit('cache:warmed', { key })
    return value
  }

  /**
   * Batch operations
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return Promise.all(keys.map(key => this.get<T>(key)))
  }

  async mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, options }) => this.set(key, value, options))
    )
  }

  async mdel(keys: string[]): Promise<number> {
    const results = await Promise.all(keys.map(key => this.delete(key)))
    return results.filter(Boolean).length
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await loader()
    await this.set(key, value, options)
    return value
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(value: unknown): number {
    const str = JSON.stringify(value)
    return new Blob([str]).size
  }

  /**
   * Add key to tag index
   */
  private addToTagIndex(key: string, tags?: string[]): void {
    if (!tags) return

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(key)
    }
  }

  /**
   * Remove key from tag index
   */
  private removeFromTagIndex(key: string, tags?: string[]): void {
    if (!tags) return

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        keys.delete(key)
        if (keys.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(startTime: number): void {
    this.stats.hits++
    this.recordOperation(startTime)
    this.updateHitRate()
  }

  /**
   * Record cache miss
   */
  private recordMiss(startTime: number): void {
    this.stats.misses++
    this.recordOperation(startTime)
    this.updateHitRate()
  }

  /**
   * Record operation timing
   */
  private recordOperation(startTime: number): void {
    const duration = Date.now() - startTime
    this.responseTimes.push(duration)

    // Keep only recent timings
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }

    // Update average
    this.stats.avgResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Start cache maintenance tasks
   */
  private startMaintenance(): void {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired()
    }, 5 * 60 * 1000)

    // Emit statistics every minute
    setInterval(() => {
      this.eventBus.emit('cache:stats', this.getStats())
    }, 60 * 1000)
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = new Date()
    let cleanedCount = 0

    // Check memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }

    // Check disk cache
    for (const [key, entry] of this.diskCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.diskCache.delete(key)
        cleanedCount++
      }
    }

    // Check network cache
    for (const [key, entry] of this.networkCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.networkCache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.eventBus.emit('cache:cleanup', { cleanedCount })
    }
  }
}

/**
 * Specialized cache for blockchain data
 */
export class BlockchainCache extends CacheManager {
  constructor() {
    super({
      maxMemorySize: 50 * 1024 * 1024, // 50MB for blockchain data
      defaultTTL: 30 // 30 seconds for blockchain data
    })

    // Setup blockchain-specific invalidation
    this.setupBlockchainInvalidation()
  }

  /**
   * Cache agent data
   */
  async cacheAgent(agentId: string, agent: unknown, ttl = 300): Promise<void> {
    await this.set(`agent:${agentId}`, agent, {
      ttl,
      tags: ['agents', `agent:${agentId}`]
    })
  }

  /**
   * Cache transaction data
   */
  async cacheTransaction(txId: string, transaction: unknown, ttl = 3600): Promise<void> {
    await this.set(`tx:${txId}`, transaction, {
      ttl,
      tags: ['transactions', `tx:${txId}`]
    })
  }

  /**
   * Cache account data
   */
  async cacheAccount(address: string, account: unknown, ttl = 60): Promise<void> {
    await this.set(`account:${address}`, account, {
      ttl,
      tags: ['accounts', `account:${address}`]
    })
  }

  /**
   * Setup blockchain-specific invalidation patterns
   */
  private setupBlockchainInvalidation(): void {
    const eventBus = EventBus.getInstance()

    // Invalidate agent cache when agent is updated
    eventBus.on('agent:updated', async (event) => {
      await this.invalidateByTags([`agent:${event.data.agentId}`])
    })

    // Invalidate account cache when balance changes
    eventBus.on('account:balance_changed', async (event) => {
      await this.invalidateByTags([`account:${event.data.address}`])
    })

    // Invalidate related caches on new block
    eventBus.on('blockchain:new_block', async () => {
      await this.invalidateByTags(['accounts']) // Account data may be stale
    })
  }
}

// Export singleton instances
export const cacheManager = CacheManager.getInstance()
export const blockchainCache = new BlockchainCache()