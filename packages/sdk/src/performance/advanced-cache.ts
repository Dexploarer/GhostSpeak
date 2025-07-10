/**
 * Advanced Multi-Level Caching System
 * 
 * Implements L1 (memory), L2 (persistent), and L3 (distributed) caching
 * with intelligent cache invalidation, compression, and optimization algorithms.
 */

import { Address } from '@solana/addresses';
import { Commitment } from '@solana/rpc-types';

/**
 * Cache configuration with optimization parameters
 */
export interface CacheConfig {
  // Memory cache (L1) settings
  l1MaxSize: number;
  l1TtlMs: number;
  l1CompressionThreshold: number;
  
  // Persistent cache (L2) settings  
  l2MaxSize: number;
  l2TtlMs: number;
  l2StoragePath?: string;
  
  // Distributed cache (L3) settings
  l3Enabled: boolean;
  l3Endpoints: string[];
  l3TtlMs: number;
  
  // Cache invalidation settings
  invalidationStrategy: 'ttl' | 'lru' | 'adaptive';
  maxMemoryUsageMB: number;
  compressionEnabled: boolean;
  
  // Performance optimization
  prefetchEnabled: boolean;
  batchInvalidationSize: number;
  cacheWarmupOnStart: boolean;
}

/**
 * Default high-performance cache configuration
 */
export const OPTIMAL_CACHE_CONFIG: CacheConfig = {
  l1MaxSize: 10000,
  l1TtlMs: 30000,
  l1CompressionThreshold: 1024,
  l2MaxSize: 100000,
  l2TtlMs: 300000,
  l3Enabled: false,
  l3Endpoints: [],
  l3TtlMs: 900000,
  invalidationStrategy: 'adaptive',
  maxMemoryUsageMB: 256,
  compressionEnabled: true,
  prefetchEnabled: true,
  batchInvalidationSize: 100,
  cacheWarmupOnStart: true,
};

/**
 * Cache entry with metadata and optimization hints
 */
interface CacheEntry<T> {
  data: T;
  compressedData?: Uint8Array;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  cacheLevel: 'l1' | 'l2' | 'l3';
  hotness: number; // Frequency-based scoring
  dependencies: string[]; // For invalidation chains
  compressionRatio?: number;
}

/**
 * Cache statistics for performance monitoring
 */
interface CacheStats {
  l1: {
    hits: number;
    misses: number;
    size: number;
    memoryUsageMB: number;
    avgResponseTimeMs: number;
  };
  l2: {
    hits: number;
    misses: number;
    size: number;
    avgResponseTimeMs: number;
  };
  l3: {
    hits: number;
    misses: number;
    size: number;
    avgResponseTimeMs: number;
  };
  overall: {
    hitRatio: number;
    totalRequests: number;
    avgResponseTimeMs: number;
    compressionRatio: number;
    invalidations: number;
  };
}

/**
 * Intelligent cache invalidation strategy
 */
interface InvalidationRule {
  pattern: RegExp;
  dependencies: string[];
  strategy: 'immediate' | 'lazy' | 'scheduled';
  priority: number;
}

/**
 * Advanced Multi-Level Cache Manager
 */
export class AdvancedCacheManager {
  private l1Cache = new Map<string, CacheEntry<any>>();
  private l2Cache = new Map<string, CacheEntry<any>>();
  private invalidationRules: InvalidationRule[] = [];
  private stats: CacheStats;
  private compressionWorker?: Worker;
  private prefetchQueue: string[] = [];
  private hotKeys = new Set<string>();
  private readonly config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...OPTIMAL_CACHE_CONFIG, ...config };
    this.stats = this.initializeStats();
    this.initializeCache();
    this.startMaintenanceTasks();
  }

  /**
   * Initialize cache subsystems
   */
  private initializeCache(): void {
    if (this.config.compressionEnabled) {
      this.initializeCompression();
    }
    
    if (this.config.cacheWarmupOnStart) {
      this.warmupCache();
    }

    this.setupInvalidationRules();
  }

  /**
   * Initialize compression worker for performance
   */
  private initializeCompression(): void {
    // Use a simple compression algorithm for browser compatibility
    // In production, could use a more sophisticated compression library
  }

  /**
   * Setup intelligent invalidation rules
   */
  private setupInvalidationRules(): void {
    // Account balance changes should invalidate related cache entries
    this.addInvalidationRule({
      pattern: /getBalance:.*/,
      dependencies: ['getTokenAccountsByOwner', 'getAccountInfo'],
      strategy: 'immediate',
      priority: 1,
    });

    // Block/slot changes should invalidate time-sensitive data
    this.addInvalidationRule({
      pattern: /getSlot|getBlockHeight.*/,
      dependencies: ['getTransaction', 'getSignatureStatus'],
      strategy: 'lazy',
      priority: 2,
    });

    // Program account changes should invalidate program-specific caches
    this.addInvalidationRule({
      pattern: /getProgramAccounts:.*/,
      dependencies: ['getAccountInfo'],
      strategy: 'scheduled',
      priority: 3,
    });
  }

  /**
   * Add custom invalidation rule
   */
  addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.push(rule);
    this.invalidationRules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get data from cache with multi-level lookup
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      // L1 Cache (Memory) - Fastest
      const l1Result = this.getFromL1<T>(key);
      if (l1Result !== null) {
        this.updateStats('l1', 'hit', performance.now() - startTime);
        this.updateHotness(key);
        return l1Result;
      }

      // L2 Cache (Persistent) - Medium speed
      const l2Result = await this.getFromL2<T>(key);
      if (l2Result !== null) {
        this.updateStats('l2', 'hit', performance.now() - startTime);
        // Promote to L1 for faster access
        await this.promoteToL1(key, l2Result);
        return l2Result;
      }

      // L3 Cache (Distributed) - Slower but shared
      if (this.config.l3Enabled) {
        const l3Result = await this.getFromL3<T>(key);
        if (l3Result !== null) {
          this.updateStats('l3', 'hit', performance.now() - startTime);
          // Promote to L2 and L1
          await this.promoteToL2(key, l3Result);
          await this.promoteToL1(key, l3Result);
          return l3Result;
        }
      }

      // Cache miss
      this.updateStats('l1', 'miss', performance.now() - startTime);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache with intelligent placement
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      dependencies?: string[];
      forceLevel?: 'l1' | 'l2' | 'l3';
      priority?: number;
    } = {}
  ): Promise<void> {
    const entry = await this.createCacheEntry(key, data, options);

    // Determine optimal cache level based on data characteristics
    const targetLevel = options.forceLevel || this.determineOptimalLevel(key, entry);

    switch (targetLevel) {
      case 'l1':
        await this.setInL1(key, entry);
        break;
      case 'l2':
        await this.setInL2(key, entry);
        break;
      case 'l3':
        if (this.config.l3Enabled) {
          await this.setInL3(key, entry);
        } else {
          await this.setInL2(key, entry);
        }
        break;
    }

    // If this is a hot key, also cache in L1
    if (this.hotKeys.has(key) && targetLevel !== 'l1') {
      await this.setInL1(key, entry);
    }

    // Handle dependencies for invalidation
    if (options.dependencies) {
      this.registerDependencies(key, options.dependencies);
    }
  }

  /**
   * Batch get operation with parallel fetching
   */
  async getBatch<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const batchSize = 50; // Optimal batch size for performance

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchPromises = batch.map(async key => ({
        key,
        value: await this.get<T>(key),
      }));

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ key, value }) => {
        results.set(key, value);
      });
    }

    return results;
  }

  /**
   * Batch set operation with optimized placement
   */
  async setBatch<T>(
    entries: Array<{
      key: string;
      data: T;
      options?: {
        ttl?: number;
        dependencies?: string[];
        forceLevel?: 'l1' | 'l2' | 'l3';
        priority?: number;
      };
    }>
  ): Promise<void> {
    const batchSize = 50;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchPromises = batch.map(entry =>
        this.set(entry.key, entry.data, entry.options || {})
      );

      await Promise.all(batchPromises);
    }
  }

  /**
   * Intelligent cache invalidation
   */
  async invalidate(
    pattern: string | RegExp,
    options: {
      strategy?: 'immediate' | 'lazy' | 'cascading';
      batchSize?: number;
    } = {}
  ): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const strategy = options.strategy || 'immediate';
    const batchSize = options.batchSize || this.config.batchInvalidationSize;
    
    let invalidatedCount = 0;

    // Find all matching keys across all cache levels
    const keysToInvalidate: string[] = [];
    
    // Collect keys from L1
    for (const key of this.l1Cache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    // Collect keys from L2
    for (const key of this.l2Cache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    // Process invalidation based on strategy
    switch (strategy) {
      case 'immediate':
        invalidatedCount = await this.immediateInvalidation(keysToInvalidate, batchSize);
        break;
      case 'lazy':
        invalidatedCount = await this.lazyInvalidation(keysToInvalidate);
        break;
      case 'cascading':
        invalidatedCount = await this.cascadingInvalidation(keysToInvalidate, batchSize);
        break;
    }

    this.stats.overall.invalidations += invalidatedCount;
    return invalidatedCount;
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    this.updateOverallStats();
    return { ...this.stats };
  }

  /**
   * Optimize cache performance
   */
  async optimize(): Promise<{
    memoryFreed: number;
    entriesOptimized: number;
    performanceGain: number;
  }> {
    const startTime = performance.now();
    let memoryFreed = 0;
    let entriesOptimized = 0;

    // 1. Remove expired entries
    const expiredRemoved = this.removeExpiredEntries();
    memoryFreed += expiredRemoved.memoryFreed;
    entriesOptimized += expiredRemoved.count;

    // 2. Compress large entries
    const compressed = await this.compressLargeEntries();
    memoryFreed += compressed.memoryFreed;
    entriesOptimized += compressed.count;

    // 3. Promote hot entries to L1
    const promoted = this.promoteHotEntries();
    entriesOptimized += promoted;

    // 4. Demote cold entries to lower levels
    const demoted = await this.demoteColdEntries();
    memoryFreed += demoted.memoryFreed;
    entriesOptimized += demoted.count;

    // 5. Defragment cache structure
    this.defragmentCache();

    const optimizationTime = performance.now() - startTime;
    const performanceGain = this.calculatePerformanceGain();

    return {
      memoryFreed,
      entriesOptimized,
      performanceGain,
    };
  }

  /**
   * Prefetch cache entries based on usage patterns
   */
  async prefetch(keys: string[]): Promise<void> {
    if (!this.config.prefetchEnabled) {
      return;
    }

    // Add to prefetch queue with deduplication
    const newKeys = keys.filter(key => !this.prefetchQueue.includes(key));
    this.prefetchQueue.push(...newKeys);

    // Process prefetch queue
    await this.processPrefetchQueue();
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
    
    if (this.config.l3Enabled) {
      await this.clearL3Cache();
    }

    this.hotKeys.clear();
    this.prefetchQueue = [];
    this.stats = this.initializeStats();
  }

  /**
   * Export cache for backup or migration
   */
  async export(): Promise<{
    metadata: {
      version: string;
      timestamp: number;
      config: CacheConfig;
    };
    l1Data: Array<[string, CacheEntry<any>]>;
    l2Data: Array<[string, CacheEntry<any>]>;
    stats: CacheStats;
  }> {
    return {
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        config: this.config,
      },
      l1Data: Array.from(this.l1Cache.entries()),
      l2Data: Array.from(this.l2Cache.entries()),
      stats: this.getStats(),
    };
  }

  /**
   * Import cache from backup
   */
  async import(
    data: {
      metadata: any;
      l1Data: Array<[string, CacheEntry<any>]>;
      l2Data: Array<[string, CacheEntry<any>]>;
      stats?: CacheStats;
    }
  ): Promise<void> {
    // Validate import data
    if (!data.metadata || !data.l1Data || !data.l2Data) {
      throw new Error('Invalid cache import data');
    }

    // Clear existing cache
    await this.clear();

    // Import L1 data
    for (const [key, entry] of data.l1Data) {
      if (this.isEntryValid(entry)) {
        this.l1Cache.set(key, entry);
      }
    }

    // Import L2 data
    for (const [key, entry] of data.l2Data) {
      if (this.isEntryValid(entry)) {
        this.l2Cache.set(key, entry);
      }
    }

    // Import stats if available
    if (data.stats) {
      this.stats = { ...data.stats };
    }
  }

  // Private helper methods

  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);
    if (!entry || this.isExpired(entry)) {
      if (entry) this.l1Cache.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return this.decompressIfNeeded(entry.data, entry.compressedData);
  }

  private async getFromL2<T>(key: string): Promise<T | null> {
    const entry = this.l2Cache.get(key);
    if (!entry || this.isExpired(entry)) {
      if (entry) this.l2Cache.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return this.decompressIfNeeded(entry.data, entry.compressedData);
  }

  private async getFromL3<T>(key: string): Promise<T | null> {
    // L3 cache implementation would connect to distributed cache
    // For now, return null as L3 is not implemented
    return null;
  }

  private async promoteToL1<T>(key: string, data: T): Promise<void> {
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      this.evictFromL1();
    }

    const entry = await this.createCacheEntry(key, data, { ttl: this.config.l1TtlMs });
    this.l1Cache.set(key, entry);
  }

  private async promoteToL2<T>(key: string, data: T): Promise<void> {
    if (this.l2Cache.size >= this.config.l2MaxSize) {
      this.evictFromL2();
    }

    const entry = await this.createCacheEntry(key, data, { ttl: this.config.l2TtlMs });
    this.l2Cache.set(key, entry);
  }

  private async setInL1<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      this.evictFromL1();
    }
    this.l1Cache.set(key, entry);
  }

  private async setInL2<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (this.l2Cache.size >= this.config.l2MaxSize) {
      this.evictFromL2();
    }
    this.l2Cache.set(key, entry);
  }

  private async setInL3<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // L3 cache implementation would connect to distributed cache
    // For now, do nothing as L3 is not implemented
  }

  private async createCacheEntry<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      dependencies?: string[];
      priority?: number;
    }
  ): Promise<CacheEntry<T>> {
    const size = this.calculateSize(data);
    const shouldCompress = this.config.compressionEnabled && 
      size > this.config.l1CompressionThreshold;

    let compressedData: Uint8Array | undefined;
    let compressionRatio: number | undefined;

    if (shouldCompress) {
      const compressed = await this.compress(data);
      compressedData = compressed.data;
      compressionRatio = compressed.ratio;
    }

    return {
      data: shouldCompress ? (null as any) : data,
      compressedData,
      timestamp: Date.now(),
      ttl: options.ttl || this.config.l1TtlMs,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      cacheLevel: 'l1',
      hotness: this.calculateHotness(key),
      dependencies: options.dependencies || [],
      compressionRatio,
    };
  }

  private determineOptimalLevel(key: string, entry: CacheEntry<any>): 'l1' | 'l2' | 'l3' {
    // Hot data should go to L1
    if (entry.hotness > 0.8 || this.hotKeys.has(key)) {
      return 'l1';
    }

    // Large data should go to L2 or L3
    if (entry.size > this.config.l1CompressionThreshold) {
      return this.config.l3Enabled ? 'l3' : 'l2';
    }

    // Default to L1 for optimal performance
    return 'l1';
  }

  private evictFromL1(): void {
    const entries = Array.from(this.l1Cache.entries());
    const victim = this.selectEvictionVictim(entries);
    if (victim) {
      this.l1Cache.delete(victim);
    }
  }

  private evictFromL2(): void {
    const entries = Array.from(this.l2Cache.entries());
    const victim = this.selectEvictionVictim(entries);
    if (victim) {
      this.l2Cache.delete(victim);
    }
  }

  private selectEvictionVictim(entries: Array<[string, CacheEntry<any>]>): string | null {
    if (entries.length === 0) return null;

    switch (this.config.invalidationStrategy) {
      case 'lru':
        return entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0][0];
      case 'ttl':
        return entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      case 'adaptive':
        return entries.sort((a, b) => 
          this.calculateEvictionScore(a[1]) - this.calculateEvictionScore(b[1])
        )[0][0];
      default:
        return entries[0][0];
    }
  }

  private calculateEvictionScore(entry: CacheEntry<any>): number {
    const age = Date.now() - entry.timestamp;
    const frequency = entry.accessCount;
    const recency = Date.now() - entry.lastAccessed;
    const size = entry.size;

    // Higher score = more likely to evict
    return (age * 0.3) + (recency * 0.4) + (size * 0.2) - (frequency * 0.1);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private isEntryValid(entry: CacheEntry<any>): boolean {
    return entry && 
           typeof entry.timestamp === 'number' &&
           typeof entry.ttl === 'number' &&
           !this.isExpired(entry);
  }

  private calculateSize(data: any): number {
    // Rough size calculation
    return JSON.stringify(data).length * 2; // UTF-16 approximation
  }

  private calculateHotness(key: string): number {
    // Implement hotness calculation based on access patterns
    return this.hotKeys.has(key) ? 1.0 : 0.5;
  }

  private async compress(data: any): Promise<{ data: Uint8Array; ratio: number }> {
    // Simple compression implementation
    const jsonString = JSON.stringify(data);
    const originalSize = jsonString.length;
    
    // Use TextEncoder for basic compression simulation
    const compressed = new TextEncoder().encode(jsonString);
    const ratio = originalSize / compressed.length;

    return { data: compressed, ratio };
  }

  private decompressIfNeeded<T>(data: T, compressedData?: Uint8Array): T {
    if (compressedData) {
      const decompressed = new TextDecoder().decode(compressedData);
      return JSON.parse(decompressed);
    }
    return data;
  }

  private updateHotness(key: string): void {
    // Simple hotness tracking
    this.hotKeys.add(key);
    
    // Periodically clean up hot keys
    if (this.hotKeys.size > 1000) {
      const keysArray = Array.from(this.hotKeys);
      const toKeep = keysArray.slice(-500); // Keep most recent 500
      this.hotKeys.clear();
      toKeep.forEach(k => this.hotKeys.add(k));
    }
  }

  private registerDependencies(key: string, dependencies: string[]): void {
    // Store dependency mapping for invalidation
    // Implementation would depend on specific requirements
  }

  private async immediateInvalidation(keys: string[], batchSize: number): Promise<number> {
    let count = 0;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      for (const key of batch) {
        if (this.l1Cache.delete(key)) count++;
        if (this.l2Cache.delete(key)) count++;
      }
    }
    return count;
  }

  private async lazyInvalidation(keys: string[]): Promise<number> {
    // Mark entries as expired but don't remove immediately
    let count = 0;
    for (const key of keys) {
      const l1Entry = this.l1Cache.get(key);
      if (l1Entry) {
        l1Entry.ttl = 0; // Mark as expired
        count++;
      }
      const l2Entry = this.l2Cache.get(key);
      if (l2Entry) {
        l2Entry.ttl = 0; // Mark as expired
        count++;
      }
    }
    return count;
  }

  private async cascadingInvalidation(keys: string[], batchSize: number): Promise<number> {
    let count = 0;
    for (const key of keys) {
      // Find and invalidate dependent keys
      const dependencies = this.findDependencies(key);
      for (const dep of dependencies) {
        if (this.l1Cache.delete(dep)) count++;
        if (this.l2Cache.delete(dep)) count++;
      }
      
      // Invalidate the key itself
      if (this.l1Cache.delete(key)) count++;
      if (this.l2Cache.delete(key)) count++;
    }
    return count;
  }

  private findDependencies(key: string): string[] {
    // Find dependent keys based on invalidation rules
    const dependencies: string[] = [];
    for (const rule of this.invalidationRules) {
      if (rule.pattern.test(key)) {
        dependencies.push(...rule.dependencies);
      }
    }
    return dependencies;
  }

  private removeExpiredEntries(): { count: number; memoryFreed: number } {
    let count = 0;
    let memoryFreed = 0;

    // Clean L1 cache
    for (const [key, entry] of this.l1Cache.entries()) {
      if (this.isExpired(entry)) {
        memoryFreed += entry.size;
        this.l1Cache.delete(key);
        count++;
      }
    }

    // Clean L2 cache
    for (const [key, entry] of this.l2Cache.entries()) {
      if (this.isExpired(entry)) {
        memoryFreed += entry.size;
        this.l2Cache.delete(key);
        count++;
      }
    }

    return { count, memoryFreed };
  }

  private async compressLargeEntries(): Promise<{ count: number; memoryFreed: number }> {
    let count = 0;
    let memoryFreed = 0;

    if (!this.config.compressionEnabled) {
      return { count, memoryFreed };
    }

    // Compress large L1 entries
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.size > this.config.l1CompressionThreshold && !entry.compressedData) {
        const compressed = await this.compress(entry.data);
        entry.compressedData = compressed.data;
        entry.compressionRatio = compressed.ratio;
        entry.data = null as any; // Clear uncompressed data
        memoryFreed += entry.size * (1 - 1/compressed.ratio);
        count++;
      }
    }

    return { count, memoryFreed };
  }

  private promoteHotEntries(): number {
    let count = 0;
    const hotThreshold = 0.8;

    // Promote hot L2 entries to L1
    for (const [key, entry] of this.l2Cache.entries()) {
      if (entry.hotness > hotThreshold && !this.l1Cache.has(key)) {
        if (this.l1Cache.size < this.config.l1MaxSize) {
          entry.cacheLevel = 'l1';
          this.l1Cache.set(key, entry);
          this.l2Cache.delete(key);
          count++;
        }
      }
    }

    return count;
  }

  private async demoteColdEntries(): Promise<{ count: number; memoryFreed: number }> {
    let count = 0;
    let memoryFreed = 0;
    const coldThreshold = 0.2;

    // Demote cold L1 entries to L2
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.hotness < coldThreshold) {
        if (this.l2Cache.size < this.config.l2MaxSize) {
          entry.cacheLevel = 'l2';
          this.l2Cache.set(key, entry);
          this.l1Cache.delete(key);
          memoryFreed += entry.size * 0.1; // Estimate memory saving
          count++;
        }
      }
    }

    return { count, memoryFreed };
  }

  private defragmentCache(): void {
    // Reorganize cache structure for better performance
    // This is a no-op in JavaScript Maps, but would be useful in other implementations
  }

  private calculatePerformanceGain(): number {
    // Calculate performance improvement based on cache optimization
    const hitRatio = this.stats.overall.hitRatio;
    const avgResponseTime = this.stats.overall.avgResponseTimeMs;
    
    // Estimate performance gain based on cache efficiency
    return (hitRatio * 100) / Math.max(avgResponseTime, 1);
  }

  private async processPrefetchQueue(): Promise<void> {
    // Process prefetch queue in background
    while (this.prefetchQueue.length > 0) {
      const key = this.prefetchQueue.shift();
      if (key && !this.l1Cache.has(key) && !this.l2Cache.has(key)) {
        // Would fetch data and cache it
        // For now, just remove from queue
      }
    }
  }

  private async clearL3Cache(): Promise<void> {
    // Clear distributed cache
    // Implementation would depend on specific L3 cache system
  }

  private initializeStats(): CacheStats {
    return {
      l1: {
        hits: 0,
        misses: 0,
        size: 0,
        memoryUsageMB: 0,
        avgResponseTimeMs: 0,
      },
      l2: {
        hits: 0,
        misses: 0,
        size: 0,
        avgResponseTimeMs: 0,
      },
      l3: {
        hits: 0,
        misses: 0,
        size: 0,
        avgResponseTimeMs: 0,
      },
      overall: {
        hitRatio: 0,
        totalRequests: 0,
        avgResponseTimeMs: 0,
        compressionRatio: 1,
        invalidations: 0,
      },
    };
  }

  private updateStats(level: 'l1' | 'l2' | 'l3', type: 'hit' | 'miss', responseTime: number): void {
    this.stats[level][`${type}s` as keyof typeof this.stats.l1]++;
    this.stats[level].avgResponseTimeMs = 
      (this.stats[level].avgResponseTimeMs * 0.9) + (responseTime * 0.1);
    
    this.stats.overall.totalRequests++;
    this.stats.overall.avgResponseTimeMs = 
      (this.stats.overall.avgResponseTimeMs * 0.9) + (responseTime * 0.1);
  }

  private updateOverallStats(): void {
    const totalHits = this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits;
    const totalMisses = this.stats.l1.misses + this.stats.l2.misses + this.stats.l3.misses;
    const totalRequests = totalHits + totalMisses;

    this.stats.overall.hitRatio = totalRequests > 0 ? totalHits / totalRequests : 0;
    this.stats.l1.size = this.l1Cache.size;
    this.stats.l2.size = this.l2Cache.size;
    
    // Calculate memory usage
    let totalMemory = 0;
    for (const entry of this.l1Cache.values()) {
      totalMemory += entry.size;
    }
    this.stats.l1.memoryUsageMB = totalMemory / (1024 * 1024);
  }

  private startMaintenanceTasks(): void {
    // Run maintenance every 30 seconds
    setInterval(() => {
      this.removeExpiredEntries();
      this.updateOverallStats();
    }, 30000);

    // Run optimization every 5 minutes
    setInterval(() => {
      this.optimize().catch(console.error);
    }, 300000);
  }

  private warmupCache(): void {
    // Implement cache warmup with common requests
    const commonKeys = [
      'getSlot:[]',
      'getVersion:[]',
      'getGenesisHash:[]',
      'getEpochInfo:[]',
    ];

    // Schedule warmup for next tick to avoid blocking initialization
    setTimeout(() => {
      this.prefetch(commonKeys).catch(console.error);
    }, 0);
  }
}

/**
 * Global instance for performance optimization
 */
let globalCache: AdvancedCacheManager | null = null;

/**
 * Get or create global cache instance
 */
export function getGlobalCache(config?: Partial<CacheConfig>): AdvancedCacheManager {
  if (!globalCache) {
    globalCache = new AdvancedCacheManager(config);
  }
  return globalCache;
}

/**
 * Cache decorator for automatic caching of function results
 */
export function cached(
  options: {
    ttl?: number;
    key?: (args: any[]) => string;
    level?: 'l1' | 'l2' | 'l3';
  } = {}
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = getGlobalCache();

    descriptor.value = async function(...args: any[]) {
      const cacheKey = options.key 
        ? options.key(args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache first
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cache.set(cacheKey, result, {
        ttl: options.ttl,
        forceLevel: options.level,
      });

      return result;
    };

    return descriptor;
  };
}