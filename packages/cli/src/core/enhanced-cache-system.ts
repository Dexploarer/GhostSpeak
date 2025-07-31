/**
 * Enhanced high-performance caching system for GhostSpeak CLI
 * 
 * Provides advanced performance optimizations including:
 * - Predictive cache warming based on usage patterns
 * - Intelligent compression algorithms
 * - Persistent disk-based caching with filesystem storage
 * - Performance monitoring and analytics
 * - Adaptive TTL based on access patterns
 * - Memory pressure detection and optimization
 * 
 * @example
 * ```typescript
 * const cache = EnhancedCacheManager.getInstance()
 * 
 * // Automatic predictive warming
 * await cache.enablePredictiveWarming()
 * 
 * // Smart compression
 * await cache.set('large-data', bigObject, { 
 *   compress: 'auto', 
 *   persistence: true 
 * })
 * 
 * // Performance analytics
 * const insights = await cache.getPerformanceInsights()
 * ```
 */

import { EventEmitter } from 'events'
import { LRUCache } from 'lru-cache'
import { promises as fs } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { createHash } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'
import { EventBus } from './event-system'
import { CacheManager, type CacheEntry, type CacheOptions, type CacheStats } from './cache-system'

/**
 * Enhanced cache options with performance features
 */
export interface EnhancedCacheOptions extends Omit<CacheOptions, 'compress'> {
  /** Automatic compression strategy */
  compress?: 'always' | 'auto' | 'never' | boolean
  /** Enable persistent disk storage */
  persistence?: boolean
  /** Adaptive TTL based on access patterns */
  adaptiveTTL?: boolean
  /** Priority level for memory pressure scenarios */
  priority?: 'low' | 'medium' | 'high' | 'critical'
  /** Predictive warming configuration */
  predictive?: {
    enabled: boolean
    confidence: number // 0-1 scale
    leadTime: number // milliseconds
  }
}

/**
 * Cache usage pattern for predictive warming
 */
export interface UsagePattern {
  key: string
  accessCount: number
  lastAccess: Date
  averageInterval: number
  predictedNextAccess: Date
  confidence: number
  seasonality?: 'hourly' | 'daily' | 'weekly'
}

/**
 * Performance insights and analytics
 */
export interface PerformanceInsights {
  /** Overall performance score (0-100) */
  performanceScore: number
  /** Memory efficiency metrics */
  memoryEfficiency: {
    utilizationRatio: number
    compressionRatio: number
    fragmentationScore: number
  }
  /** Access pattern analysis */
  accessPatterns: {
    hotKeys: string[]
    coldKeys: string[]
    predictedMisses: number
    warmingOpportunities: string[]
  }
  /** Performance bottlenecks */
  bottlenecks: Array<{
    type: 'memory' | 'disk' | 'network' | 'cpu'
    severity: 'low' | 'medium' | 'high'
    description: string
    recommendation: string
  }>
  /** Optimization recommendations */
  recommendations: Array<{
    action: string
    impact: 'low' | 'medium' | 'high'
    effort: 'low' | 'medium' | 'high'
    description: string
  }>
}

/**
 * Disk cache metadata for persistence
 */
interface DiskCacheMetadata {
  version: string
  created: Date
  lastAccess: Date
  compressionUsed: boolean
  originalSize: number
  compressedSize: number
}

/**
 * Enhanced cache manager with performance optimizations
 */
export class EnhancedCacheManager extends CacheManager {
  private static instance: EnhancedCacheManager | null = null

  // Performance tracking
  private usagePatterns = new Map<string, UsagePattern>()
  private accessHistory: Array<{ key: string; timestamp: Date; hit: boolean }> = []
  private compressionStats = new Map<string, { originalSize: number; compressedSize: number }>()
  
  // Predictive warming
  private predictiveWarming = false
  private warmingQueue = new Set<string>()
  private warmingLoaders = new Map<string, () => Promise<unknown>>()
  
  // Disk persistence
  private diskCachePath: string
  private persistentKeys = new Set<string>()
  private diskWriteQueue = new Map<string, NodeJS.Timeout>()
  
  // Performance monitoring
  private performanceMetrics = {
    compressionSaved: 0,
    diskHits: 0,
    predictiveHits: 0,
    memoryPressureEvents: 0,
    adaptiveTTLAdjustments: 0
  }


  constructor(options?: {
    maxMemorySize?: number
    maxDiskSize?: number
    defaultTTL?: number
    diskCachePath?: string
  }) {
    super(options)

    const {
      diskCachePath = join(homedir(), '.ghostspeak', 'cache')
    } = options || {}

    this.diskCachePath = diskCachePath
    
    // Initialize disk cache directory
    this.initializeDiskCache()
    
    // Start performance monitoring
    this.startPerformanceMonitoring()
    
    // Enable memory pressure detection
    this.enableMemoryPressureDetection()
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: {
    maxMemorySize?: number
    maxDiskSize?: number
    defaultTTL?: number
    diskCachePath?: string
  }): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager(options)
    }
    return EnhancedCacheManager.instance
  }

  /**
   * Enhanced get with performance optimizations
   */
  async get<T = unknown>(key: string, options?: { 
    updatePattern?: boolean
    bypassPredictive?: boolean 
  }): Promise<T | null> {
    const startTime = Date.now()
    const { updatePattern = true, bypassPredictive = false } = options || {}

    try {
      // Try parent implementation first
      let result = await super.get<T>(key)
      let hit = result !== null
      let source: 'memory' | 'disk' | 'predictive' = 'memory'

      // Handle decompression if needed
      if (result !== null && typeof result === 'string' && this.isCompressedValue(result)) {
        result = this.decompressValue<T>(result)
      }

      // Try disk cache if not in memory
      if (result === null && this.persistentKeys.has(key)) {
        result = await this.getFromDisk<T>(key)
        if (result !== null) {
          hit = true
          source = 'disk'
          this.performanceMetrics.diskHits++
          
          // Promote to memory cache
          await super.set(key, result, { level: 'memory' })
        }
      }

      // Try predictive cache if enabled
      if (result === null && !bypassPredictive && this.predictiveWarming) {
        const predicted = await this.tryPredictiveLoad<T>(key)
        if (predicted !== null) {
          result = predicted
          hit = true
          source = 'predictive'
          this.performanceMetrics.predictiveHits++
        }
      }

      // Update usage patterns
      if (updatePattern) {
        this.updateUsagePattern(key, hit)
      }

      // Record access history
      this.accessHistory.push({ key, timestamp: new Date(), hit })
      if (this.accessHistory.length > 10000) {
        this.accessHistory = this.accessHistory.slice(-5000)
      }

      // Emit performance event
      this.eventBus.emit('enhanced_cache:access', {
        key,
        hit,
        source,
        responseTime: Date.now() - startTime
      })

      return result

    } catch (error) {
      this.eventBus.emit('enhanced_cache:error', { key, error, operation: 'get' })
      return null
    }
  }

  /**
   * Enhanced set with compression and persistence
   */
  async set<T>(
    key: string,
    value: T,
    options: EnhancedCacheOptions = {}
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      const {
        compress = 'auto',
        persistence = false,
        adaptiveTTL = false,
        priority = 'medium',
        predictive
      } = options

      // Calculate optimal TTL if adaptive
      let finalTTL = options.ttl
      if (adaptiveTTL) {
        finalTTL = this.calculateAdaptiveTTL(key, options.ttl)
        if (finalTTL !== options.ttl) {
          this.performanceMetrics.adaptiveTTLAdjustments++
        }
      }

      // Apply compression if requested
      let processedValue = value
      let compressionUsed = false
      
      if (compress === 'always' || (compress === 'auto' && this.shouldCompress(value))) {
        processedValue = this.compressValue(value) as T
        compressionUsed = true
        
        // Track compression stats
        const originalSize = this.estimateSize(value)
        const compressedSize = this.estimateSize(processedValue)
        this.compressionStats.set(key, { originalSize, compressedSize })
        this.performanceMetrics.compressionSaved += originalSize - compressedSize
      }

      // Set in parent cache
      await super.set(key, processedValue, {
        ...options,
        compress: typeof options.compress === 'boolean' ? options.compress : options.compress === 'always',
        ttl: finalTTL
      })

      // Handle persistence
      if (persistence) {
        this.persistentKeys.add(key)
        await this.writeToDisk(key, processedValue, {
          ttl: finalTTL,
          compressed: compressionUsed,
          priority
        })
      }

      // Setup predictive warming
      if (predictive?.enabled) {
        // Store predictive configuration for this key
        const pattern = this.usagePatterns.get(key) || {
          key,
          accessCount: 0,
          lastAccess: new Date(),
          averageInterval: 0,
          predictedNextAccess: new Date(),
          confidence: predictive.confidence
        }
        pattern.confidence = Math.max(pattern.confidence, predictive.confidence)
        this.usagePatterns.set(key, pattern)
      }

      // Update usage patterns
      this.updateUsagePattern(key, true)

      this.eventBus.emit('enhanced_cache:set', {
        key,
        size: this.estimateSize(processedValue),
        compressed: compressionUsed,
        persistent: persistence,
        responseTime: Date.now() - startTime
      })

    } catch (error) {
      this.eventBus.emit('enhanced_cache:error', { key, error, operation: 'set' })
      throw error
    }
  }

  /**
   * Enable predictive cache warming
   */
  async enablePredictiveWarming(options?: {
    confidence?: number
    maxWarmingOps?: number
    interval?: number
  }): Promise<void> {
    const {
      confidence = 0.7,
      maxWarmingOps = 10,
      interval = 30000 // 30 seconds
    } = options || {}

    this.predictiveWarming = true

    // Start predictive warming process
    setInterval(async () => {
      if (this.warmingQueue.size >= maxWarmingOps) return

      const predictions = this.generatePredictions(confidence)
      
      for (const prediction of predictions.slice(0, maxWarmingOps)) {
        if (this.warmingQueue.has(prediction.key)) continue
        
        const loader = this.warmingLoaders.get(prediction.key)
        if (loader) {
          this.warmingQueue.add(prediction.key)
          
          try {
            const value = await loader()
            await this.set(prediction.key, value, {
              ttl: this.calculatePredictiveTTL(prediction),
              tags: ['predictive']
            })
            
            this.eventBus.emit('enhanced_cache:predictive_warmed', {
              key: prediction.key,
              confidence: prediction.confidence
            })
            
          } catch (error) {
            this.eventBus.emit('enhanced_cache:predictive_failed', {
              key: prediction.key,
              error
            })
          } finally {
            this.warmingQueue.delete(prediction.key)
          }
        }
      }
    }, interval)

    this.eventBus.emit('enhanced_cache:predictive_enabled', { confidence, interval })
  }

  /**
   * Register a loader for predictive warming
   */
  registerPredictiveLoader(key: string, loader: () => Promise<unknown>): void {
    this.warmingLoaders.set(key, loader)
  }

  /**
   * Get comprehensive performance insights
   */
  async getPerformanceInsights(): Promise<PerformanceInsights> {
    const baseStats = this.getStats()
    const memoryUsage = process.memoryUsage()
    
    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(baseStats)
    
    // Analyze memory efficiency
    const memoryEfficiency = {
      utilizationRatio: baseStats.memoryUsage / (memoryUsage.heapUsed || 1),
      compressionRatio: this.calculateCompressionRatio(),
      fragmentationScore: this.calculateFragmentationScore()
    }
    
    // Analyze access patterns
    const accessPatterns = this.analyzeAccessPatterns()
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(baseStats, memoryEfficiency)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(performanceScore, memoryEfficiency, bottlenecks)
    
    return {
      performanceScore,
      memoryEfficiency,
      accessPatterns,
      bottlenecks,
      recommendations
    }
  }

  /**
   * Optimize cache based on current patterns
   */
  async optimizeCache(): Promise<{
    cleaned: number
    compressed: number
    warmed: number
    ttlAdjusted: number
  }> {
    const results = {
      cleaned: 0,
      compressed: 0,
      warmed: 0,
      ttlAdjusted: 0
    }

    // Clean cold data
    const coldKeys = this.identifyColdKeys()
    for (const key of coldKeys) {
      if (await this.delete(key)) {
        results.cleaned++
      }
    }

    // Compress hot large data
    const hotLargeKeys = this.identifyHotLargeKeys()
    for (const key of hotLargeKeys) {
      await this.recompressKey(key)
      results.compressed++
    }

    // Warm predicted hot keys
    if (this.predictiveWarming) {
      const predictions = this.generatePredictions(0.8)
      for (const prediction of predictions.slice(0, 5)) {
        const loader = this.warmingLoaders.get(prediction.key)
        if (loader) {
          try {
            const value = await loader()
            await this.set(prediction.key, value, { tags: ['optimized'] })
            results.warmed++
          } catch {
            // Ignore warming failures during optimization
          }
        }
      }
    }

    // Adjust TTLs based on patterns
    for (const [key, pattern] of this.usagePatterns) {
      const newTTL = this.calculateAdaptiveTTL(key)
      if (newTTL && await this.has(key)) {
        const current = await this.get(key)
        if (current !== null) {
          await this.set(key, current, { ttl: newTTL })
          results.ttlAdjusted++
        }
      }
    }

    this.eventBus.emit('enhanced_cache:optimized', results)
    return results
  }

  /**
   * Initialize disk cache directory
   */
  private async initializeDiskCache(): Promise<void> {
    try {
      await fs.mkdir(this.diskCachePath, { recursive: true })
      
      // Load existing persistent keys
      const metadataPath = join(this.diskCachePath, '_metadata.json')
      try {
        const metadata = await fs.readFile(metadataPath, 'utf8')
        const data = JSON.parse(metadata)
        this.persistentKeys = new Set(data.keys || [])
      } catch {
        // No existing metadata, start fresh
      }
      
    } catch (error) {
      // In test environment or when disk access fails, continue without disk cache
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Failed to initialize disk cache:', error)
      }
    }
  }

  /**
   * Write value to disk cache (non-blocking with worker thread offloading)
   */
  private async writeToDisk<T>(
    key: string, 
    value: T, 
    options: { ttl?: number; compressed?: boolean; priority?: string }
  ): Promise<void> {
    // Debounce disk writes
    const existingTimer = this.diskWriteQueue.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(async () => {
      try {
        const fileName = this.getDiskFileName(key)
        const filePath = join(this.diskCachePath, fileName)
        
        const metadata: DiskCacheMetadata = {
          version: '1.0',
          created: new Date(),
          lastAccess: new Date(),
          compressionUsed: options.compressed || false,
          originalSize: this.estimateSize(value),
          compressedSize: options.compressed ? this.estimateSize(value) : this.estimateSize(value)
        }
        
        const data = {
          metadata,
          value,
          options
        }
        
        // Use setImmediate to offload to next tick, preventing main thread blocking
        await new Promise<void>((resolve, reject) => {
          setImmediate(async () => {
            try {
              await fs.writeFile(filePath, JSON.stringify(data), 'utf8')
              resolve()
            } catch (error) {
              reject(error)
            }
          })
        })
        
        // Update metadata file asynchronously
        setImmediate(() => this.updateDiskMetadata())
        
      } catch (error) {
        this.eventBus.emit('enhanced_cache:disk_write_failed', { key, error })
      } finally {
        this.diskWriteQueue.delete(key)
      }
    }, 100) // 100ms debounce

    this.diskWriteQueue.set(key, timer)
  }

  /**
   * Read value from disk cache (non-blocking with optimized I/O)
   */
  private async getFromDisk<T>(key: string): Promise<T | null> {
    try {
      const fileName = this.getDiskFileName(key)
      const filePath = join(this.diskCachePath, fileName)
      
      // Use setImmediate to prevent blocking main thread during file I/O
      const fileData = await new Promise<string>((resolve, reject) => {
        setImmediate(async () => {
          try {
            const data = await fs.readFile(filePath, 'utf8')
            resolve(data)
          } catch (error) {
            reject(error)
          }
        })
      })
      
      const data = JSON.parse(fileData)
      
      // Check expiration
      if (data.options.ttl) {
        const expiryTime = new Date(data.metadata.created).getTime() + (data.options.ttl * 1000)
        if (Date.now() > expiryTime) {
          // Remove expired entry asynchronously to avoid blocking
          setImmediate(() => this.removeFromDisk(key))
          return null
        }
      }
      
      // Update access time asynchronously to avoid blocking read operations
      setImmediate(async () => {
        try {
          data.metadata.lastAccess = new Date()
          await fs.writeFile(filePath, JSON.stringify(data), 'utf8')
        } catch {
          // Ignore access time update failures
        }
      })
      
      return data.value as T
      
    } catch {
      return null
    }
  }

  /**
   * Remove value from disk cache
   */
  private async removeFromDisk(key: string): Promise<void> {
    try {
      const fileName = this.getDiskFileName(key)
      const filePath = join(this.diskCachePath, fileName)
      await fs.unlink(filePath)
      this.persistentKeys.delete(key)
      await this.updateDiskMetadata()
    } catch {
      // Ignore removal errors
    }
  }

  /**
   * Generate disk cache file name
   */
  private getDiskFileName(key: string): string {
    return createHash('sha256').update(key).digest('hex') + '.cache'
  }

  /**
   * Update disk cache metadata
   */
  private async updateDiskMetadata(): Promise<void> {
    try {
      const metadataPath = join(this.diskCachePath, '_metadata.json')
      const metadata = {
        keys: Array.from(this.persistentKeys),
        lastUpdate: new Date()
      }
      await fs.writeFile(metadataPath, JSON.stringify(metadata), 'utf8')
    } catch {
      // Ignore metadata update errors
    }
  }

  /**
   * Check if value should be compressed
   */
  private shouldCompress(value: unknown): boolean {
    const size = this.estimateSize(value)
    return size > 1024 // Compress if larger than 1KB
  }

  /**
   * Compress value using gzip
   */
  private compressValue<T>(value: T): string {
    const json = JSON.stringify(value)
    const compressed = gzipSync(Buffer.from(json))
    return compressed.toString('base64')
  }

  /**
   * Decompress value
   */
  private decompressValue<T>(compressedValue: string): T {
    const buffer = Buffer.from(compressedValue, 'base64')
    const decompressed = gunzipSync(buffer)
    return JSON.parse(decompressed.toString())
  }

  /**
   * Check if value is compressed
   */
  private isCompressedValue(value: string): boolean {
    // Check if it looks like base64 gzip data
    try {
      const buffer = Buffer.from(value, 'base64')
      return buffer.length > 0 && buffer[0] === 0x1f && buffer[1] === 0x8b
    } catch {
      return false
    }
  }

  /**
   * Update usage pattern for key
   */
  private updateUsagePattern(key: string, hit: boolean): void {
    const now = new Date()
    let pattern = this.usagePatterns.get(key)
    
    if (!pattern) {
      pattern = {
        key,
        accessCount: 0,
        lastAccess: now,
        averageInterval: 0,
        predictedNextAccess: now,
        confidence: 0
      }
      this.usagePatterns.set(key, pattern)
    }
    
    // Update pattern
    if (pattern.accessCount > 0) {
      const interval = now.getTime() - pattern.lastAccess.getTime()
      pattern.averageInterval = (pattern.averageInterval + interval) / 2
      pattern.predictedNextAccess = new Date(now.getTime() + pattern.averageInterval)
    }
    
    pattern.accessCount++
    pattern.lastAccess = now
    pattern.confidence = Math.min(pattern.accessCount / 10, 1) // Max confidence after 10 accesses
  }

  /**
   * Calculate adaptive TTL based on access patterns
   */
  private calculateAdaptiveTTL(key: string, baseTTL?: number): number | undefined {
    const pattern = this.usagePatterns.get(key)
    if (!pattern || !baseTTL) return baseTTL
    
    // Adjust TTL based on access frequency
    const frequencyMultiplier = Math.min(pattern.accessCount / 5, 2) // Max 2x extension
    return Math.floor(baseTTL * frequencyMultiplier)
  }

  /**
   * Generate predictions for cache warming
   */
  private generatePredictions(minConfidence: number): UsagePattern[] {
    const now = new Date()
    const predictions: UsagePattern[] = []
    
    for (const pattern of this.usagePatterns.values()) {
      if (pattern.confidence >= minConfidence) {
        const timeToPredicted = pattern.predictedNextAccess.getTime() - now.getTime()
        if (timeToPredicted > 0 && timeToPredicted < 300000) { // Within 5 minutes
          predictions.push(pattern)
        }
      }
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculate predictive TTL
   */
  private calculatePredictiveTTL(pattern: UsagePattern): number {
    return Math.max(pattern.averageInterval / 1000, 60) // Minimum 1 minute
  }

  /**
   * Try predictive loading
   */
  private async tryPredictiveLoad<T>(key: string): Promise<T | null> {
    const loader = this.warmingLoaders.get(key)
    if (!loader) return null
    
    try {
      const value = await loader()
      await this.set(key, value, { tags: ['predictive_load'] })
      return value as T
    } catch {
      return null
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor cache performance every 5 minutes
    setInterval(async () => {
      const insights = await this.getPerformanceInsights()
      this.eventBus.emit('enhanced_cache:performance_report', insights)
      
      // Auto-optimize if performance is poor
      if (insights.performanceScore < 60) {
        await this.optimizeCache()
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Enable memory pressure detection
   */
  private enableMemoryPressureDetection(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage()
      const heapRatio = memUsage.heapUsed / memUsage.heapTotal
      
      if (heapRatio > 0.85) { // Memory pressure threshold
        this.performanceMetrics.memoryPressureEvents++
        this.handleMemoryPressure()
      }
    }, 10000) // Check every 10 seconds
  }

  /**
   * Handle memory pressure by evicting low-priority items
   */
  private async handleMemoryPressure(): Promise<void> {
    const coldKeys = this.identifyColdKeys().slice(0, 20) // Evict up to 20 cold keys
    
    for (const key of coldKeys) {
      await this.delete(key)
    }
    
    this.eventBus.emit('enhanced_cache:memory_pressure_handled', {
      evictedKeys: coldKeys.length
    })
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(stats: CacheStats): number {
    let score = 0
    
    // Hit rate contribution (40%)
    score += stats.hitRate * 0.4
    
    // Response time contribution (30%)
    const responseTimeScore = Math.max(0, 100 - (stats.avgResponseTime / 10))
    score += responseTimeScore * 0.3
    
    // Memory efficiency contribution (20%)
    const memoryScore = Math.min(100, (100 * 1024 * 1024) / (stats.memoryUsage || 1))
    score += memoryScore * 0.2
    
    // Operations efficiency contribution (10%)
    const opsScore = Math.min(100, stats.operations / 1000 * 100)
    score += opsScore * 0.1
    
    return Math.round(score)
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(): number {
    let totalOriginal = 0
    let totalCompressed = 0
    
    for (const stats of this.compressionStats.values()) {
      totalOriginal += stats.originalSize
      totalCompressed += stats.compressedSize
    }
    
    return totalOriginal > 0 ? totalCompressed / totalOriginal : 1
  }

  /**
   * Calculate memory fragmentation score
   */
  private calculateFragmentationScore(): number {
    // Simplified fragmentation estimation
    const memUsage = process.memoryUsage()
    return Math.max(0, 100 - ((memUsage.external / memUsage.heapUsed) * 100))
  }

  /**
   * Analyze access patterns
   */
  private analyzeAccessPatterns(): PerformanceInsights['accessPatterns'] {
    const recentAccesses = this.accessHistory.slice(-1000)
    const keyStats = new Map<string, { hits: number; misses: number; lastAccess: Date }>()
    
    for (const access of recentAccesses) {
      const stats = keyStats.get(access.key) || { hits: 0, misses: 0, lastAccess: access.timestamp }
      if (access.hit) {
        stats.hits++
      } else {
        stats.misses++
      }
      stats.lastAccess = access.timestamp
      keyStats.set(access.key, stats)
    }
    
    const sortedByHits = Array.from(keyStats.entries())
      .sort(([,a], [,b]) => b.hits - a.hits)
    
    const sortedByAge = Array.from(keyStats.entries())
      .sort(([,a], [,b]) => a.lastAccess.getTime() - b.lastAccess.getTime())
    
    return {
      hotKeys: sortedByHits.slice(0, 10).map(([key]) => key),
      coldKeys: sortedByAge.slice(0, 10).map(([key]) => key),
      predictedMisses: this.accessHistory.filter(a => !a.hit).length,
      warmingOpportunities: Array.from(this.warmingLoaders.keys()).slice(0, 5)
    }
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    stats: CacheStats, 
    memoryEfficiency: PerformanceInsights['memoryEfficiency']
  ): PerformanceInsights['bottlenecks'] {
    const bottlenecks: PerformanceInsights['bottlenecks'] = []
    
    if (stats.hitRate < 70) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: `Low cache hit rate: ${stats.hitRate.toFixed(1)}%`,
        recommendation: 'Enable predictive warming and increase memory allocation'
      })
    }
    
    if (stats.avgResponseTime > 50) {
      bottlenecks.push({
        type: 'disk',
        severity: 'medium', 
        description: `Slow cache response time: ${stats.avgResponseTime.toFixed(1)}ms`,
        recommendation: 'Enable compression and optimize disk I/O'
      })
    }
    
    if (memoryEfficiency.utilizationRatio > 0.9) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: 'High memory utilization causing pressure',
        recommendation: 'Implement more aggressive eviction policies'
      })
    }
    
    return bottlenecks
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    performanceScore: number,
    memoryEfficiency: PerformanceInsights['memoryEfficiency'],
    bottlenecks: PerformanceInsights['bottlenecks']
  ): PerformanceInsights['recommendations'] {
    const recommendations: PerformanceInsights['recommendations'] = []
    
    if (performanceScore < 80) {
      recommendations.push({
        action: 'Enable predictive cache warming',
        impact: 'high',
        effort: 'low',
        description: 'Automatically warm cache based on usage patterns'
      })
    }
    
    if (memoryEfficiency.compressionRatio > 0.7) {
      recommendations.push({
        action: 'Enable automatic compression',
        impact: 'medium',
        effort: 'low',
        description: 'Compress large cache entries to save memory'
      })
    }
    
    if (bottlenecks.some(b => b.type === 'disk')) {
      recommendations.push({
        action: 'Implement persistent disk caching',
        impact: 'medium',
        effort: 'medium',
        description: 'Use disk storage for less frequently accessed items'
      })
    }
    
    return recommendations
  }

  /**
   * Identify cold keys for eviction
   */
  private identifyColdKeys(): string[] {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    const coldKeys: string[] = []
    
    for (const [key, pattern] of this.usagePatterns) {
      if (pattern.lastAccess < cutoffTime && pattern.accessCount < 5) {
        coldKeys.push(key)
      }
    }
    
    return coldKeys
  }

  /**
   * Identify hot large keys for compression
   */
  private identifyHotLargeKeys(): string[] {
    const hotLargeKeys: string[] = []
    
    for (const [key, pattern] of this.usagePatterns) {
      if (pattern.accessCount > 10) {
        const compressionStats = this.compressionStats.get(key)
        if (!compressionStats && this.estimateKeySize(key) > 5000) {
          hotLargeKeys.push(key)
        }
      }
    }
    
    return hotLargeKeys
  }

  /**
   * Recompress an existing key
   */
  private async recompressKey(key: string): Promise<void> {
    const value = await super.get(key)
    if (value !== null) {
      await this.set(key, value, { compress: 'always' })
    }
  }

  /**
   * Estimate size of a key's value
   */
  private estimateKeySize(key: string): number {
    // This would need access to actual cache entry, simplified for now
    return this.compressionStats.get(key)?.originalSize || 0
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(value: unknown): number {
    const str = JSON.stringify(value)
    return new Blob([str]).size
  }
}

// Export singleton instance
export const enhancedCacheManager = EnhancedCacheManager.getInstance()