/**
 * Enhanced RPC Connection Pool with Advanced Performance Optimization
 *
 * Implements connection pooling, response caching, and request optimization
 * with advanced monitoring, intelligent load balancing, and memory optimization.
 */

import { createSolanaRpc } from '@solana/rpc';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { Address } from '@solana/addresses';
import { getGlobalCache } from '../performance/advanced-cache.js';
import { getGlobalMonitor, monitored } from '../performance/monitoring.js';
import { CircularBuffer, PriorityQueue, ObjectPool } from '../performance/memory-optimization.js';

/**
 * Enhanced configuration for connection pool with performance optimization
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheSize: number;
  cacheTtl: number;
  endpoints: string[];
  commitment: Commitment;
  
  // Performance optimization settings
  enableAdvancedCaching: boolean;
  enablePerformanceMonitoring: boolean;
  enableMemoryOptimization: boolean;
  enableLoadBalancing: boolean;
  priorityQueueEnabled: boolean;
  circuitBreakerThreshold: number;
  adaptiveTimeout: boolean;
  compressionEnabled: boolean;
}

/**
 * Default configuration optimized for maximum performance
 */
export const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 20,
  requestTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheSize: 5000,
  cacheTtl: 60000, // 60 seconds
  endpoints: ['https://api.devnet.solana.com'],
  commitment: 'confirmed',
  
  // Performance optimization settings
  enableAdvancedCaching: true,
  enablePerformanceMonitoring: true,
  enableMemoryOptimization: true,
  enableLoadBalancing: true,
  priorityQueueEnabled: true,
  circuitBreakerThreshold: 5,
  adaptiveTimeout: true,
  compressionEnabled: true,
};

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Enhanced connection pool entry with performance metrics
 */
interface PoolConnection {
  rpc: Rpc<SolanaRpcApi>;
  endpoint: string;
  inUse: boolean;
  lastUsed: number;
  requestCount: number;
  errors: number;
  avgResponseTime: number;
  consecutiveErrors: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  lastErrorTime: number;
  healthScore: number;
}

/**
 * Request metrics for performance monitoring
 */
interface RequestMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorRate: number;
  connectionUtilization: number;
}

/**
 * Enhanced RPC Connection Pool Manager with Advanced Performance Optimization
 */
export class RpcConnectionPool {
  private connections: PoolConnection[] = [];
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: RequestMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    errorRate: 0,
    connectionUtilization: 0,
  };
  private responseTimes: CircularBuffer<number>;
  private requestQueue: PriorityQueue<any>;
  private connectionPool: ObjectPool<PoolConnection>;
  private advancedCache: any;
  private monitor: any;
  private readonly config: ConnectionPoolConfig;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    
    // Initialize performance optimization components
    this.responseTimes = new CircularBuffer(1000);
    this.requestQueue = new PriorityQueue(true);
    
    if (this.config.enableAdvancedCaching) {
      this.advancedCache = getGlobalCache();
    }
    
    if (this.config.enablePerformanceMonitoring) {
      this.monitor = getGlobalMonitor();
    }
    
    if (this.config.enableMemoryOptimization) {
      this.connectionPool = new ObjectPool(
        () => this.createConnection(),
        (conn) => this.resetConnection(conn),
        this.config.maxConnections
      );
    }
    
    this.initializePool();
    this.startCleanupTimer();
    
    console.log('🚀 Enhanced RPC Connection Pool initialized with performance optimization');
  }

  /**
   * Initialize enhanced connection pool with performance optimization
   */
  private initializePool(): void {
    for (let i = 0; i < this.config.maxConnections; i++) {
      const endpoint = this.config.endpoints[i % this.config.endpoints.length];
      const connection = this.createConnection(endpoint);
      this.connections.push(connection);
    }
  }
  
  /**
   * Create a new optimized connection
   */
  private createConnection(endpoint?: string): PoolConnection {
    const connectionEndpoint = endpoint || this.config.endpoints[0];
    const rpc = createSolanaRpc(connectionEndpoint);

    return {
      rpc,
      endpoint: connectionEndpoint,
      inUse: false,
      lastUsed: Date.now(),
      requestCount: 0,
      errors: 0,
      avgResponseTime: 0,
      consecutiveErrors: 0,
      circuitBreakerState: 'closed',
      lastErrorTime: 0,
      healthScore: 100,
    };
  }
  
  /**
   * Reset connection for reuse
   */
  private resetConnection(connection: PoolConnection): void {
    connection.inUse = false;
    connection.requestCount = 0;
    connection.errors = 0;
    connection.consecutiveErrors = 0;
    connection.circuitBreakerState = 'closed';
    connection.healthScore = 100;
  }

  /**
   * Get an available connection with intelligent selection
   */
  private getConnection(): PoolConnection | null {
    // Filter healthy connections
    const available = this.connections.filter(conn => 
      !conn.inUse && 
      conn.circuitBreakerState !== 'open' &&
      conn.healthScore > 50
    );

    if (available.length === 0) {
      // Try to use object pool if enabled
      if (this.config.enableMemoryOptimization && this.connectionPool) {
        return this.connectionPool.acquire();
      }
      return null;
    }

    // Intelligent connection selection based on performance
    const connection = this.config.enableLoadBalancing
      ? this.selectOptimalConnection(available)
      : available.sort((a, b) => a.lastUsed - b.lastUsed)[0];

    connection.inUse = true;
    connection.lastUsed = Date.now();
    return connection;
  }
  
  /**
   * Select optimal connection based on performance metrics
   */
  private selectOptimalConnection(connections: PoolConnection[]): PoolConnection {
    return connections.reduce((best, current) => {
      const bestScore = this.calculateConnectionScore(best);
      const currentScore = this.calculateConnectionScore(current);
      return currentScore > bestScore ? current : best;
    });
  }
  
  /**
   * Calculate connection performance score
   */
  private calculateConnectionScore(connection: PoolConnection): number {
    const errorPenalty = connection.consecutiveErrors * 10;
    const responsePenalty = connection.avgResponseTime > 1000 ? 20 : 0;
    const healthBonus = connection.healthScore;
    
    return Math.max(0, healthBonus - errorPenalty - responsePenalty);
  }

  /**
   * Release a connection back to the pool with performance tracking
   */
  private releaseConnection(connection: PoolConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    
    // Return to object pool if enabled
    if (this.config.enableMemoryOptimization && this.connectionPool) {
      this.connectionPool.release(connection);
    }
    
    // Update connection health score
    this.updateConnectionHealth(connection);
  }
  
  /**
   * Update connection health based on recent performance
   */
  private updateConnectionHealth(connection: PoolConnection): void {
    const errorRate = connection.errors / Math.max(connection.requestCount, 1);
    const avgResponseFactor = Math.min(1, 500 / Math.max(connection.avgResponseTime, 1));
    
    connection.healthScore = Math.min(100, Math.max(0, 
      (1 - errorRate) * 50 + avgResponseFactor * 50
    ));
  }

  /**
   * Generate optimized cache key for request
   */
  private getCacheKey(method: string, params: any[]): string {
    // Use advanced cache key generation if available
    if (this.config.enableAdvancedCaching && this.advancedCache) {
      return `rpc:${method}:${JSON.stringify(params, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      )}`;
    }
    
    return `${method}:${JSON.stringify(params, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    )}`;
  }

  /**
   * Get cached response if available and valid
   */
  private getCachedResponse<T>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Store response in cache
   */
  private setCachedResponse<T>(cacheKey: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTtl,
    });
  }

  /**
   * Execute RPC request with advanced performance optimization
   */
  @monitored({ operation: 'rpc-request' })
  async executeRequest<T>(
    method: string,
    params: any[],
    options: {
      cacheable?: boolean;
      cacheTtl?: number;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<T> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    // Use priority queue if enabled
    if (this.config.priorityQueueEnabled && options.priority) {
      return this.executeWithPriority(method, params, options);
    }

    // Check advanced cache first
    if (options.cacheable !== false) {
      const cacheKey = this.getCacheKey(method, params);
      
      if (this.config.enableAdvancedCaching && this.advancedCache) {
        const cachedResponse = await this.advancedCache.get<T>(cacheKey);
        if (cachedResponse !== null) {
          this.metrics.cacheHits++;
          return cachedResponse;
        }
      } else {
        const cachedResponse = this.getCachedResponse<T>(cacheKey);
        if (cachedResponse) {
          this.metrics.cacheHits++;
          return cachedResponse;
        }
      }
      
      this.metrics.cacheMisses++;
    }

    // Get connection from pool with intelligent selection
    const connection = await this.waitForConnection();
    if (!connection) {
      if (this.monitor) {
        this.monitor.recordError(new Error('No available connections'), { method, params });
      }
      throw new Error('No available connections in pool');
    }

    try {
      // Check circuit breaker
      if (connection.circuitBreakerState === 'open') {
        const timeSinceLastError = Date.now() - connection.lastErrorTime;
        if (timeSinceLastError < 60000) { // 1 minute timeout
          throw new Error('Circuit breaker is open for this connection');
        } else {
          connection.circuitBreakerState = 'half-open';
        }
      }

      // Execute request with adaptive timeout
      const timeout = this.config.adaptiveTimeout 
        ? this.calculateAdaptiveTimeout(connection)
        : this.config.requestTimeout;
        
      const result = await this.executeWithRetryAndTimeout(connection, method, params, timeout);

      // Cache successful response
      if (options.cacheable !== false) {
        const cacheKey = this.getCacheKey(method, params);
        
        if (this.config.enableAdvancedCaching && this.advancedCache) {
          await this.advancedCache.set(cacheKey, result, {
            ttl: options.cacheTtl,
            dependencies: [`method:${method}`],
          });
        } else {
          this.setCachedResponse(cacheKey, result, options.cacheTtl);
        }
      }

      // Update metrics and connection stats
      const responseTime = performance.now() - startTime;
      this.updateMetrics(responseTime, false);
      this.updateConnectionStats(connection, responseTime, true);
      
      // Record success in monitoring
      if (this.monitor) {
        this.monitor.recordResponseTime(responseTime, method);
        this.monitor.recordSuccess(method);
      }

      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.updateMetrics(responseTime, true);
      this.updateConnectionStats(connection, responseTime, false);
      
      // Update circuit breaker
      this.updateCircuitBreaker(connection, error as Error);
      
      // Record error in monitoring
      if (this.monitor) {
        this.monitor.recordError(error as Error, { method, params, connection: connection.endpoint });
      }
      
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  /**
   * Execute request with priority queue
   */
  private async executeWithPriority<T>(
    method: string,
    params: any[],
    options: { priority?: 'low' | 'normal' | 'high'; [key: string]: any }
  ): Promise<T> {
    const priorityValue = options.priority === 'high' ? 3 : 
                         options.priority === 'normal' ? 2 : 1;
    
    return new Promise((resolve, reject) => {
      this.requestQueue.enqueue({
        method,
        params,
        options,
        resolve,
        reject,
      }, priorityValue);
      
      // Process queue if not already processing
      this.processRequestQueue();
    });
  }
  
  /**
   * Process priority queue
   */
  private async processRequestQueue(): Promise<void> {
    while (!this.requestQueue.isEmpty()) {
      const request = this.requestQueue.dequeue();
      if (!request) break;
      
      try {
        const result = await this.executeRequest(
          request.method,
          request.params,
          { ...request.options, priority: undefined } // Remove priority to avoid recursion
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
  }
  
  /**
   * Calculate adaptive timeout based on connection performance
   */
  private calculateAdaptiveTimeout(connection: PoolConnection): number {
    const baseTimeout = this.config.requestTimeout;
    const performanceFactor = connection.avgResponseTime > 1000 ? 1.5 : 
                             connection.avgResponseTime > 500 ? 1.2 : 1.0;
    const errorFactor = connection.consecutiveErrors > 3 ? 1.3 : 1.0;
    
    return Math.min(baseTimeout * performanceFactor * errorFactor, baseTimeout * 2);
  }
  
  /**
   * Execute request with retry logic and timeout
   */
  private async executeWithRetryAndTimeout(
    connection: PoolConnection,
    method: string,
    params: any[],
    timeout: number
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const promise = this.executeRpcCall(connection, method, params);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );
        
        return await Promise.race([promise, timeoutPromise]);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }
  
  /**
   * Execute actual RPC call
   */
  private async executeRpcCall(connection: PoolConnection, method: string, params: any[]): Promise<any> {
    const rpc = connection.rpc as any;
    if (typeof rpc[method] === 'function') {
      return await rpc[method](...params);
    } else {
      throw new Error(`Method ${method} not found on RPC client`);
    }
  }
  
  /**
   * Update connection statistics
   */
  private updateConnectionStats(connection: PoolConnection, responseTime: number, success: boolean): void {
    connection.requestCount++;
    
    // Update average response time with exponential moving average
    const alpha = 0.1;
    connection.avgResponseTime = connection.avgResponseTime * (1 - alpha) + responseTime * alpha;
    
    if (!success) {
      connection.errors++;
      connection.consecutiveErrors++;
      connection.lastErrorTime = Date.now();
    } else {
      connection.consecutiveErrors = 0;
      
      // Improve circuit breaker state on success
      if (connection.circuitBreakerState === 'half-open') {
        connection.circuitBreakerState = 'closed';
      }
    }
    
    // Track response time in circular buffer
    this.responseTimes.push(responseTime);
  }
  
  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(connection: PoolConnection, error: Error): void {
    if (connection.consecutiveErrors >= this.config.circuitBreakerThreshold) {
      connection.circuitBreakerState = 'open';
      connection.lastErrorTime = Date.now();
      
      if (this.monitor) {
        this.monitor.recordError(new Error(`Circuit breaker opened for ${connection.endpoint}`), {
          connection: connection.endpoint,
          consecutiveErrors: connection.consecutiveErrors,
        });
      }
    }
  }

  /**
   * Execute multiple requests in parallel with intelligent batching
   */
  async batchExecute<T>(
    requests: Array<{
      method: string;
      params: any[];
      options?: {
        cacheable?: boolean;
        cacheTtl?: number;
        priority?: 'low' | 'normal' | 'high';
      };
    }>
  ): Promise<T[]> {
    const batchSize = Math.min(requests.length, this.config.maxConnections);
    const results: T[] = [];

    // Process requests in batches for optimal performance
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request =>
        this.executeRequest<T>(
          request.method,
          request.params,
          request.options || {}
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute requests with intelligent deduplication
   */
  async deduplicatedExecute<T>(
    requests: Array<{
      method: string;
      params: any[];
      options?: {
        cacheable?: boolean;
        cacheTtl?: number;
        priority?: 'low' | 'normal' | 'high';
      };
    }>
  ): Promise<T[]> {
    const uniqueRequests = new Map<
      string,
      {
        request: (typeof requests)[0];
        indices: number[];
      }
    >();

    // Group duplicate requests
    requests.forEach((request, index) => {
      const key = this.getCacheKey(request.method, request.params);
      if (!uniqueRequests.has(key)) {
        uniqueRequests.set(key, {
          request,
          indices: [index],
        });
      } else {
        uniqueRequests.get(key)!.indices.push(index);
      }
    });

    // Execute unique requests
    const uniqueResults = await Promise.all(
      Array.from(uniqueRequests.values()).map(({ request }) =>
        this.executeRequest<T>(
          request.method,
          request.params,
          request.options || {}
        )
      )
    );

    // Map results back to original order
    const results: T[] = new Array(requests.length);
    let resultIndex = 0;

    for (const { indices } of uniqueRequests.values()) {
      const result = uniqueResults[resultIndex++];
      indices.forEach(index => {
        results[index] = result;
      });
    }

    return results;
  }

  /**
   * Wait for available connection with timeout
   */
  private async waitForConnection(): Promise<PoolConnection | null> {
    const timeout = this.config.requestTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const connection = this.getConnection();
      if (connection) {
        return connection;
      }

      // Wait briefly before retrying
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    connection: PoolConnection,
    method: string,
    params: any[]
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        // Cast to any to access dynamic RPC methods
        const rpc = connection.rpc as any;
        if (typeof rpc[method] === 'function') {
          return await rpc[method](...params);
        } else {
          throw new Error(`Method ${method} not found on RPC client`);
        }
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retryAttempts - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.config.retryDelay * (attempt + 1))
          );
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, isError: boolean): void {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    this.metrics.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;

    this.metrics.errorRate = isError
      ? this.metrics.errorRate * 0.9 + 0.1
      : this.metrics.errorRate * 0.95;

    this.metrics.connectionUtilization =
      this.connections.filter(c => c.inUse).length / this.connections.length;
  }

  /**
   * Start cleanup timer for cache and connections
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupCache();
      this.cleanupConnections();
    }, 30000); // Every 30 seconds
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clean up stale connections
   */
  private cleanupConnections(): void {
    const now = Date.now();
    for (const connection of this.connections) {
      if (!connection.inUse && now - connection.lastUsed > 300000) {
        // 5 minutes
        // Mark for potential replacement
        connection.errors = 0;
        connection.requestCount = 0;
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed connection statistics
   */
  getConnectionStats(): Array<{
    endpoint: string;
    inUse: boolean;
    requestCount: number;
    errors: number;
    lastUsed: number;
  }> {
    return this.connections.map(conn => ({
      endpoint: conn.endpoint,
      inUse: conn.inUse,
      requestCount: conn.requestCount,
      errors: conn.errors,
      lastUsed: conn.lastUsed,
    }));
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Warm up cache with common requests
   */
  async warmupCache(): Promise<void> {
    // Common requests that benefit from caching
    const commonRequests = [
      ['getSlot', []],
      ['getVersion', []],
      ['getGenesisHash', []],
    ];

    const warmupPromises = commonRequests.map(
      ([method, params]) =>
        this.executeRequest(method, params, {
          cacheable: true,
          cacheTtl: 60000,
        }).catch(() => {}) // Ignore errors during warmup
    );

    await Promise.all(warmupPromises);
  }

  /**
   * Shutdown connection pool
   */
  async shutdown(): Promise<void> {
    // Wait for all connections to be released
    while (this.connections.some(conn => conn.inUse)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.connections = [];
    this.cache.clear();
  }
}

/**
 * Singleton instance for global use
 */
let globalPool: RpcConnectionPool | null = null;

/**
 * Get or create global connection pool
 */
export function getGlobalConnectionPool(
  config?: Partial<ConnectionPoolConfig>
): RpcConnectionPool {
  if (!globalPool) {
    globalPool = new RpcConnectionPool(config);
  }
  return globalPool;
}

/**
 * Helper function to create optimized RPC client with pooling
 */
export function createOptimizedRpcClient(endpoint: string): {
  rpc: Rpc<SolanaRpcApi>;
  pool: RpcConnectionPool;
} {
  const pool = new RpcConnectionPool({
    endpoints: [endpoint],
    maxConnections: 5,
  });

  // Create proxy RPC client that uses the pool
  const rpc = new Proxy({} as Rpc<SolanaRpcApi>, {
    get(target, prop) {
      if (typeof prop === 'string') {
        return (...args: any[]) => pool.executeRequest(prop, args);
      }
      return undefined;
    },
  });

  return { rpc, pool };
}

/**
 * Performance-optimized RPC client with advanced features
 */
export class PerformanceRpcClient {
  private pool: RpcConnectionPool;
  private requestQueue: Array<{
    method: string;
    params: any[];
    options?: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private processingQueue = false;

  constructor(endpoints: string[], config?: Partial<ConnectionPoolConfig>) {
    this.pool = new RpcConnectionPool({
      endpoints,
      maxConnections: 10,
      cacheSize: 2000,
      cacheTtl: 60000,
      ...config,
    });
    this.startQueueProcessor();
  }

  /**
   * Execute request with automatic queuing and deduplication
   */
  async execute<T>(
    method: string,
    params: any[],
    options: any = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        method,
        params,
        options,
        resolve,
        reject,
      });

      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process request queue with intelligent batching
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const batch = this.requestQueue.splice(0, 20); // Process up to 20 at once
      const requests = batch.map(item => ({
        method: item.method,
        params: item.params,
        options: item.options,
      }));

      const results = await this.pool.deduplicatedExecute(requests);

      // Resolve all promises
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      this.requestQueue.forEach(item => item.reject(error));
      this.requestQueue = [];
    } finally {
      this.processingQueue = false;

      // Process remaining queue if needed
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 10);
      }
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue && this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, 50); // Process every 50ms
  }

  /**
   * Get performance metrics
   */
  getMetrics(): RequestMetrics {
    return this.pool.getMetrics();
  }

  /**
   * Shutdown client
   */
  async shutdown(): Promise<void> {
    await this.pool.shutdown();
  }
}
