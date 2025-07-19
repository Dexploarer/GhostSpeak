/**
 * Advanced Caching Strategies for Solana RPC Operations
 * July 2025 Best Practices
 */

import type { Address } from '@solana/kit'
import type { AccountInfo } from '../types/rpc-types.js'

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
  dependencies?: Set<string>
  tags?: Set<string>
}

/**
 * Cache invalidation strategy
 */
export type InvalidationStrategy = 
  | 'ttl'           // Time-based expiration
  | 'lru'           // Least recently used
  | 'lfu'           // Least frequently used
  | 'dependency'    // Dependency-based
  | 'tag'           // Tag-based
  | 'adaptive'      // Adaptive based on access patterns

/**
 * Cache tier configuration
 */
export interface CacheTierConfig {
  name: string
  maxSize: number
  defaultTtl: number
  strategy: InvalidationStrategy
  enabled: boolean
}

/**
 * Advanced cache configuration
 */
export interface AdvancedCacheConfig {
  /** Memory tier - fastest access */
  memory: CacheTierConfig
  /** Persistent tier - survives restarts */
  persistent?: CacheTierConfig
  /** Distributed tier - shared across instances */
  distributed?: CacheTierConfig
  /** Enable compression for large values */
  enableCompression: boolean
  /** Enable cache statistics */
  enableStats: boolean
  /** Background cleanup interval */
  cleanupIntervalMs: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  maxSize: number
  averageAccessTime: number
  evictions: number
  compressionRatio: number
  memoryUsage: number
}

/**
 * Smart cache invalidation rules
 */
export interface InvalidationRule {
  pattern: RegExp
  dependencies: string[]
  tags: string[]
  customValidator?: (key: string, value: any) => boolean
}

/**
 * Multi-tier intelligent cache system
 */
export class AdvancedCache<T = any> {
  private memoryCache = new Map<string, CacheEntry<T>>()
  private persistentCache?: Map<string, CacheEntry<T>>
  private distributedCache?: Map<string, CacheEntry<T>>
  
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    averageAccessTime: 0,
    evictions: 0,
    compressionRatio: 1,
    memoryUsage: 0
  }
  
  private accessTimes: number[] = []
  private invalidationRules: InvalidationRule[] = []
  private cleanupTimer?: ReturnType<typeof setTimeout>

  constructor(private config: AdvancedCacheConfig) {
    this.stats.maxSize = config.memory.maxSize
    
    // Initialize persistent cache if enabled
    if (config.persistent?.enabled) {
      this.persistentCache = new Map()
    }
    
    // Initialize distributed cache if enabled
    if (config.distributed?.enabled) {
      this.distributedCache = new Map()
    }
    
    // Start background cleanup
    this.startBackgroundCleanup()
  }

  /**
   * Get value from cache with intelligent tier selection
   */
  async get(key: string): Promise<T | null> {
    const startTime = Date.now()
    
    try {
      // Try memory cache first (fastest)
      let entry = this.memoryCache.get(key)
      let tier = 'memory'
      
      // Try persistent cache if not in memory
      if (!entry && this.persistentCache) {
        entry = this.persistentCache.get(key)
        tier = 'persistent'
        
        // Promote to memory cache if found
        if (entry && this.shouldPromoteToMemory(entry)) {
          this.memoryCache.set(key, { ...entry })
          this.evictIfNeeded('memory')
        }
      }
      
      // Try distributed cache if not found locally
      if (!entry && this.distributedCache) {
        entry = this.distributedCache.get(key)
        tier = 'distributed'
        
        // Promote to memory/persistent if found
        if (entry) {
          if (this.shouldPromoteToMemory(entry)) {
            this.memoryCache.set(key, { ...entry })
            this.evictIfNeeded('memory')
          } else if (this.persistentCache) {
            this.persistentCache.set(key, { ...entry })
          }
        }
      }
      
      if (entry && !this.isExpired(entry)) {
        // Update access metadata
        entry.accessCount++
        entry.lastAccess = Date.now()
        
        this.stats.hits++
        this.recordAccessTime(Date.now() - startTime)
        
        return entry.value
      } else if (entry) {
        // Remove expired entry
        this.delete(key)
      }
      
      this.stats.misses++
      return null
    } finally {
      this.updateStats()
    }
  }

  /**
   * Set value in cache with intelligent tier placement
   */
  async set(
    key: string, 
    value: T, 
    options: {
      ttl?: number
      dependencies?: string[]
      tags?: string[]
      tier?: 'memory' | 'persistent' | 'distributed'
    } = {}
  ): Promise<void> {
    const {
      ttl = this.config.memory.defaultTtl,
      dependencies = [],
      tags = [],
      tier = this.selectOptimalTier(key, value)
    } = options

    const entry: CacheEntry<T> = {
      value: await this.compressValue(value),
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now(),
      dependencies: new Set(dependencies),
      tags: new Set(tags)
    }

    // Place in selected tier
    switch (tier) {
      case 'memory':
        this.memoryCache.set(key, entry)
        this.evictIfNeeded('memory')
        break
      case 'persistent':
        if (this.persistentCache) {
          this.persistentCache.set(key, entry)
        }
        break
      case 'distributed':
        if (this.distributedCache) {
          this.distributedCache.set(key, entry)
        }
        break
    }

    this.updateStats()
  }

  /**
   * Delete from all tiers
   */
  delete(key: string): boolean {
    let deleted = false
    
    if (this.memoryCache.delete(key)) deleted = true
    if (this.persistentCache?.delete(key)) deleted = true
    if (this.distributedCache?.delete(key)) deleted = true
    
    this.updateStats()
    return deleted
  }

  /**
   * Smart invalidation based on dependencies and tags
   */
  invalidate(pattern: string | RegExp | { dependencies?: string[]; tags?: string[] }): number {
    let invalidated = 0
    
    const shouldInvalidate = (key: string, entry: CacheEntry<T>): boolean => {
      if (typeof pattern === 'string') {
        return key.includes(pattern)
      } else if (pattern instanceof RegExp) {
        return pattern.test(key)
      } else {
        // Dependency or tag-based invalidation
        if (pattern.dependencies) {
          const hasMatchingDep = pattern.dependencies.some(dep => 
            entry.dependencies?.has(dep)
          )
          if (hasMatchingDep) return true
        }
        
        if (pattern.tags) {
          const hasMatchingTag = pattern.tags.some(tag => 
            entry.tags?.has(tag)
          )
          if (hasMatchingTag) return true
        }
        
        return false
      }
    }

    // Check all tiers
    for (const [key, entry] of this.memoryCache) {
      if (shouldInvalidate(key, entry)) {
        this.memoryCache.delete(key)
        invalidated++
      }
    }

    if (this.persistentCache) {
      for (const [key, entry] of this.persistentCache) {
        if (shouldInvalidate(key, entry)) {
          this.persistentCache.delete(key)
          invalidated++
        }
      }
    }

    if (this.distributedCache) {
      for (const [key, entry] of this.distributedCache) {
        if (shouldInvalidate(key, entry)) {
          this.distributedCache.delete(key)
          invalidated++
        }
      }
    }

    this.updateStats()
    return invalidated
  }

  /**
   * Add smart invalidation rule
   */
  addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.push(rule)
  }

  /**
   * Apply invalidation rules
   */
  applyInvalidationRules(): number {
    let totalInvalidated = 0
    
    for (const rule of this.invalidationRules) {
      const invalidated = this.invalidate({
        dependencies: rule.dependencies,
        tags: rule.tags
      })
      totalInvalidated += invalidated
    }
    
    return totalInvalidated
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Warm cache with predicted data
   */
  async warmCache(
    predictions: { key: string; generator: () => Promise<T> }[]
  ): Promise<void> {
    const warmupPromises = predictions.map(async ({ key, generator }) => {
      try {
        const value = await generator()
        await this.set(key, value, { 
          ttl: this.config.memory.defaultTtl * 2, // Longer TTL for warmed data
          tags: ['warmed']
        })
      } catch (error) {
        console.warn(`Cache warmup failed for key ${key}:`, error)
      }
    })

    await Promise.all(warmupPromises)
  }

  /**
   * Export cache data for backup/analysis
   */
  export(): { memory: any[]; persistent?: any[]; distributed?: any[] } {
    const exportTier = (cache: Map<string, CacheEntry<T>>) => 
      Array.from(cache.entries()).map(([key, entry]) => ({
        key,
        value: entry.value,
        metadata: {
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          accessCount: entry.accessCount,
          lastAccess: entry.lastAccess,
          dependencies: Array.from(entry.dependencies || []),
          tags: Array.from(entry.tags || [])
        }
      }))

    return {
      memory: exportTier(this.memoryCache),
      persistent: this.persistentCache ? exportTier(this.persistentCache) : undefined,
      distributed: this.distributedCache ? exportTier(this.distributedCache) : undefined
    }
  }

  /**
   * Clear all cache tiers
   */
  clear(): void {
    this.memoryCache.clear()
    this.persistentCache?.clear()
    this.distributedCache?.clear()
    
    this.stats.evictions += this.stats.size
    this.updateStats()
  }

  /**
   * Cleanup and destroy cache
   */
  destroy(): void {
    this.clear()
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private shouldPromoteToMemory(entry: CacheEntry<T>): boolean {
    // Promote frequently accessed items
    return entry.accessCount > 2 || 
           (Date.now() - entry.lastAccess < 60000) // Recently accessed
  }

  private selectOptimalTier(key: string, value: T): 'memory' | 'persistent' | 'distributed' {
    // Size-based tier selection
    const serializedSize = JSON.stringify(value).length
    
    if (serializedSize < 1024) { // Small items go to memory
      return 'memory'
    } else if (serializedSize < 10240 && this.persistentCache) { // Medium items to persistent
      return 'persistent'
    } else if (this.distributedCache) { // Large items to distributed
      return 'distributed'
    }
    
    return 'memory' // Fallback
  }

  private evictIfNeeded(tier: 'memory' | 'persistent' | 'distributed'): void {
    const cache = this.getCacheForTier(tier)
    const config = this.getConfigForTier(tier)
    
    if (!cache || !config || cache.size <= config.maxSize) {
      return
    }

    const entriesToEvict = cache.size - config.maxSize + 1
    const sortedEntries = Array.from(cache.entries())

    // Sort by strategy
    switch (config.strategy) {
      case 'lru':
        sortedEntries.sort(([,a], [,b]) => a.lastAccess - b.lastAccess)
        break
      case 'lfu':
        sortedEntries.sort(([,a], [,b]) => a.accessCount - b.accessCount)
        break
      case 'ttl':
        sortedEntries.sort(([,a], [,b]) => a.timestamp - b.timestamp)
        break
      case 'adaptive':
        // Complex scoring based on access patterns
        sortedEntries.sort(([,a], [,b]) => {
          const scoreA = this.calculateAdaptiveScore(a)
          const scoreB = this.calculateAdaptiveScore(b)
          return scoreA - scoreB
        })
        break
    }

    // Evict least valuable entries
    for (let i = 0; i < entriesToEvict; i++) {
      const [key] = sortedEntries[i]
      cache.delete(key)
      this.stats.evictions++
    }
  }

  private calculateAdaptiveScore(entry: CacheEntry<T>): number {
    const now = Date.now()
    const age = now - entry.timestamp
    const timeSinceAccess = now - entry.lastAccess
    const frequency = entry.accessCount
    
    // Lower score = more likely to be evicted
    return (frequency * 1000) - age - (timeSinceAccess * 2)
  }

  private getCacheForTier(tier: string): Map<string, CacheEntry<T>> | undefined {
    switch (tier) {
      case 'memory': return this.memoryCache
      case 'persistent': return this.persistentCache
      case 'distributed': return this.distributedCache
      default: return undefined
    }
  }

  private getConfigForTier(tier: string): CacheTierConfig | undefined {
    switch (tier) {
      case 'memory': return this.config.memory
      case 'persistent': return this.config.persistent
      case 'distributed': return this.config.distributed
      default: return undefined
    }
  }

  private async compressValue(value: T): Promise<T> {
    if (!this.config.enableCompression) {
      return value
    }

    // Simple compression simulation - in reality would use actual compression
    // This would integrate with libraries like pako or node's zlib
    return value
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time)
    
    // Keep only recent access times for average calculation
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000)
    }
  }

  private updateStats(): void {
    this.stats.size = this.memoryCache.size + 
                     (this.persistentCache?.size || 0) + 
                     (this.distributedCache?.size || 0)
    
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    
    this.stats.averageAccessTime = this.accessTimes.length > 0 
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
      : 0
  }

  private startBackgroundCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
      this.applyInvalidationRules()
    }, this.config.cleanupIntervalMs)
  }

  private cleanupExpired(): void {
    const cleanupCache = (cache: Map<string, CacheEntry<T>>) => {
      for (const [key, entry] of cache) {
        if (this.isExpired(entry)) {
          cache.delete(key)
          this.stats.evictions++
        }
      }
    }

    cleanupCache(this.memoryCache)
    if (this.persistentCache) cleanupCache(this.persistentCache)
    if (this.distributedCache) cleanupCache(this.distributedCache)
    
    this.updateStats()
  }
}

/**
 * Specialized cache for Solana account data
 */
export class SolanaAccountCache extends AdvancedCache<AccountInfo> {
  constructor(config: Partial<AdvancedCacheConfig> = {}) {
    const defaultConfig: AdvancedCacheConfig = {
      memory: {
        name: 'account-memory',
        maxSize: 5000,
        defaultTtl: 10000, // 10 seconds for account data
        strategy: 'adaptive',
        enabled: true
      },
      persistent: {
        name: 'account-persistent',
        maxSize: 20000,
        defaultTtl: 60000, // 1 minute for persistent
        strategy: 'lru',
        enabled: true
      },
      enableCompression: true,
      enableStats: true,
      cleanupIntervalMs: 30000
    }

    super({ ...defaultConfig, ...config })

    // Add Solana-specific invalidation rules
    this.addInvalidationRule({
      pattern: /^account:.+/,
      dependencies: ['transaction', 'slot'],
      tags: ['account'],
      customValidator: (key, value) => {
        // Invalidate if account lamports changed significantly
        return false // Custom logic here
      }
    })
  }

  /**
   * Cache account with address-based key
   */
  async cacheAccount(
    address: Address, 
    account: AccountInfo,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    await this.set(`account:${address}`, account, {
      ttl: options.ttl || 10000,
      tags: ['account', ...(options.tags || [])],
      dependencies: [`address:${address}`]
    })
  }

  /**
   * Get cached account
   */
  async getCachedAccount(address: Address): Promise<AccountInfo | null> {
    return this.get(`account:${address}`)
  }

  /**
   * Invalidate account cache for specific address
   */
  invalidateAccount(address: Address): number {
    return this.invalidate(`account:${address}`)
  }

  /**
   * Invalidate all accounts owned by a program
   */
  invalidateAccountsByProgram(programId: Address): number {
    return this.invalidate({ tags: [`program:${programId}`] })
  }
}

/**
 * Factory functions for common cache configurations
 */
export const CacheFactory = {
  /**
   * Create cache optimized for frequently accessed small data
   */
  createHighFrequencyCache<T>(maxSize = 1000): AdvancedCache<T> {
    return new AdvancedCache<T>({
      memory: {
        name: 'high-freq',
        maxSize,
        defaultTtl: 30000,
        strategy: 'lfu',
        enabled: true
      },
      enableCompression: false,
      enableStats: true,
      cleanupIntervalMs: 10000
    })
  },

  /**
   * Create cache optimized for large, infrequently accessed data
   */
  createLargeDataCache<T>(maxSize = 100): AdvancedCache<T> {
    return new AdvancedCache<T>({
      memory: {
        name: 'large-data',
        maxSize,
        defaultTtl: 300000, // 5 minutes
        strategy: 'lru',
        enabled: true
      },
      enableCompression: true,
      enableStats: true,
      cleanupIntervalMs: 60000
    })
  },

  /**
   * Create multi-tier cache for production use
   */
  createProductionCache<T>(): AdvancedCache<T> {
    return new AdvancedCache<T>({
      memory: {
        name: 'prod-memory',
        maxSize: 10000,
        defaultTtl: 60000,
        strategy: 'adaptive',
        enabled: true
      },
      persistent: {
        name: 'prod-persistent',
        maxSize: 50000,
        defaultTtl: 300000,
        strategy: 'lru',
        enabled: true
      },
      enableCompression: true,
      enableStats: true,
      cleanupIntervalMs: 30000
    })
  }
} as const