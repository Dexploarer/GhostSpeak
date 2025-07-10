/**
 * CLI Startup Optimizer
 *
 * Optimizes CLI startup time through lazy loading, module caching,
 * and intelligent initialization. Target: <100ms startup time.
 */

import { performance } from 'perf_hooks';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from '../../../../shared/logger';

/**
 * Startup metrics for monitoring
 */
interface StartupMetrics {
  totalTime: number;
  moduleLoadTime: number;
  configLoadTime: number;
  networkCheckTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  modulesLoaded: number;
  cacheHits: number;
}

/**
 * Lazy module loader for dynamic imports
 */
class LazyModuleLoader {
  private moduleCache = new Map<string, Promise<any>>();
  private loadedModules = new Set<string>();

  /**
   * Lazy load a module with caching
   */
  async loadModule<T>(modulePath: string): Promise<T> {
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath)!;
    }

    const loadPromise = import(modulePath);
    this.moduleCache.set(modulePath, loadPromise);

    try {
      const module = await loadPromise;
      this.loadedModules.add(modulePath);
      return module;
    } catch (error) {
      this.moduleCache.delete(modulePath);
      throw error;
    }
  }

  /**
   * Preload critical modules
   */
  async preloadCriticalModules(): Promise<void> {
    const criticalModules = [
      '@solana/web3.js',
      '../utils/logger.js',
      '../config/cli-config.js',
    ];

    const preloadPromises = criticalModules.map(
      module => this.loadModule(module).catch(() => {}) // Ignore errors during preload
    );

    await Promise.all(preloadPromises);
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      cachedModules: this.moduleCache.size,
      loadedModules: this.loadedModules.size,
      cacheHitRate: this.loadedModules.size / (this.moduleCache.size || 1),
    };
  }
}

/**
 * Configuration cache for fast access
 */
class ConfigCache {
  private cache = new Map<string, any>();
  private lastModified = new Map<string, number>();

  /**
   * Get cached configuration with file modification check
   */
  getCachedConfig(configPath: string): any | null {
    if (!this.cache.has(configPath)) {
      return null;
    }

    if (!existsSync(configPath)) {
      this.cache.delete(configPath);
      this.lastModified.delete(configPath);
      return null;
    }

    const stats = statSync(configPath);
    const lastMod = this.lastModified.get(configPath);

    if (lastMod && stats.mtimeMs > lastMod) {
      this.cache.delete(configPath);
      this.lastModified.delete(configPath);
      return null;
    }

    return this.cache.get(configPath);
  }

  /**
   * Cache configuration with modification time
   */
  setCachedConfig(configPath: string, config: any): void {
    if (existsSync(configPath)) {
      const stats = statSync(configPath);
      this.lastModified.set(configPath, stats.mtimeMs);
    }

    this.cache.set(configPath, config);
  }

  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [path, timestamp] of this.lastModified.entries()) {
      if (now - timestamp > maxAge) {
        this.cache.delete(path);
        this.lastModified.delete(path);
      }
    }
  }
}

/**
 * Network availability checker with caching
 */
class NetworkChecker {
  private cache = new Map<string, { result: boolean; timestamp: number }>();
  private readonly cacheDuration = 30000; // 30 seconds

  /**
   * Check network availability with caching
   */
  async checkNetwork(endpoint: string): Promise<boolean> {
    const cached = this.cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.result;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = response.ok;

      this.cache.set(endpoint, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.cache.set(endpoint, { result: false, timestamp: Date.now() });
      return false;
    }
  }

  /**
   * Check multiple endpoints in parallel
   */
  async checkMultipleEndpoints(endpoints: string[]): Promise<boolean[]> {
    const promises = endpoints.map(endpoint => this.checkNetwork(endpoint));
    return Promise.all(promises);
  }
}

/**
 * CLI Startup Optimizer
 */
export class StartupOptimizer {
  private moduleLoader = new LazyModuleLoader();
  private configCache = new ConfigCache();
  private networkChecker = new NetworkChecker();
  private metrics: StartupMetrics = {
    totalTime: 0,
    moduleLoadTime: 0,
    configLoadTime: 0,
    networkCheckTime: 0,
    memoryUsage: process.memoryUsage(),
    modulesLoaded: 0,
    cacheHits: 0,
  };

  /**
   * Initialize CLI with optimizations
   */
  async initializeCLI(): Promise<StartupMetrics> {
    const startTime = performance.now();

    try {
      // 1. Preload critical modules in parallel
      const moduleStartTime = performance.now();
      await this.moduleLoader.preloadCriticalModules();
      this.metrics.moduleLoadTime = performance.now() - moduleStartTime;

      // 2. Load configuration with caching
      const configStartTime = performance.now();
      await this.loadOptimizedConfig();
      this.metrics.configLoadTime = performance.now() - configStartTime;

      // 3. Check network availability (non-blocking)
      const networkStartTime = performance.now();
      this.checkNetworkInBackground();
      this.metrics.networkCheckTime = performance.now() - networkStartTime;

      // 4. Update metrics
      const loaderStats = this.moduleLoader.getStats();
      this.metrics.modulesLoaded = loaderStats.loadedModules;
      this.metrics.cacheHits = loaderStats.cachedModules;
      this.metrics.memoryUsage = process.memoryUsage();
      this.metrics.totalTime = performance.now() - startTime;

      return this.metrics;
    } catch (error) {
      this.metrics.totalTime = performance.now() - startTime;
      throw error;
    }
  }

  /**
   * Load configuration with caching
   */
  private async loadOptimizedConfig(): Promise<void> {
    const configPaths = [
      join(process.cwd(), 'ghostspeak.config.js'),
      join(process.cwd(), 'ghostspeak.config.json'),
      join(process.env.HOME || '~', '.ghostspeak', 'config.json'),
    ];

    for (const configPath of configPaths) {
      let config = this.configCache.getCachedConfig(configPath);

      if (!config && existsSync(configPath)) {
        try {
          if (configPath.endsWith('.json')) {
            const fs = await this.moduleLoader.loadModule('fs/promises');
            const content = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(content);
          } else {
            config = await this.moduleLoader.loadModule(configPath);
          }

          this.configCache.setCachedConfig(configPath, config);
        } catch (error) {
          logger.general.warn(
            `Failed to load config from ${configPath}:`,
            error
          );
          continue;
        }
      }

      if (config) {
        // Store configuration globally for CLI use
        (global as any).__ghostspeak_config = config;
        break;
      }
    }
  }

  /**
   * Check network availability in background
   */
  private async checkNetworkInBackground(): Promise<void> {
    const endpoints = [
      'https://api.devnet.solana.com',
      'https://api.mainnet-beta.solana.com',
      'https://api.testnet.solana.com',
    ];

    // Non-blocking network check
    this.networkChecker
      .checkMultipleEndpoints(endpoints)
      .then(results => {
        (global as any).__ghostspeak_network_status = {
          devnet: results[0],
          mainnet: results[1],
          testnet: results[2],
          checked: true,
        };
      })
      .catch(() => {
        (global as any).__ghostspeak_network_status = {
          devnet: false,
          mainnet: false,
          testnet: false,
          checked: false,
        };
      });
  }

  /**
   * Get lazy-loaded module
   */
  async getModule<T>(modulePath: string): Promise<T> {
    return this.moduleLoader.loadModule<T>(modulePath);
  }

  /**
   * Get cached configuration
   */
  getCachedConfig(configPath: string): any | null {
    return this.configCache.getCachedConfig(configPath);
  }

  /**
   * Get network status
   */
  getNetworkStatus(): any {
    return (
      (global as any).__ghostspeak_network_status || {
        devnet: null,
        mainnet: null,
        testnet: null,
        checked: false,
      }
    );
  }

  /**
   * Get startup metrics
   */
  getMetrics(): StartupMetrics {
    return { ...this.metrics };
  }

  /**
   * Cleanup caches and timers
   */
  cleanup(): void {
    this.configCache.cleanup();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = [];

    report.push('⚡ CLI STARTUP PERFORMANCE REPORT');
    report.push('='.repeat(40));
    report.push('');
    report.push(`Total Startup Time: ${this.metrics.totalTime.toFixed(2)}ms`);
    report.push(
      `Module Load Time: ${this.metrics.moduleLoadTime.toFixed(2)}ms`
    );
    report.push(
      `Config Load Time: ${this.metrics.configLoadTime.toFixed(2)}ms`
    );
    report.push(
      `Network Check Time: ${this.metrics.networkCheckTime.toFixed(2)}ms`
    );
    report.push('');
    report.push(`Modules Loaded: ${this.metrics.modulesLoaded}`);
    report.push(`Cache Hits: ${this.metrics.cacheHits}`);
    report.push(
      `Memory Usage: ${(this.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    report.push('');

    const networkStatus = this.getNetworkStatus();
    if (networkStatus.checked) {
      report.push('Network Status:');
      report.push(`  Devnet: ${networkStatus.devnet ? '✅' : '❌'}`);
      report.push(`  Mainnet: ${networkStatus.mainnet ? '✅' : '❌'}`);
      report.push(`  Testnet: ${networkStatus.testnet ? '✅' : '❌'}`);
    }

    return report.join('\n');
  }
}

/**
 * Global startup optimizer instance
 */
let globalOptimizer: StartupOptimizer | null = null;

/**
 * Get or create global startup optimizer
 */
export function getStartupOptimizer(): StartupOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new StartupOptimizer();
  }
  return globalOptimizer;
}

/**
 * Initialize CLI with optimizations
 */
export async function initializeOptimizedCLI(): Promise<StartupMetrics> {
  const optimizer = getStartupOptimizer();
  return optimizer.initializeCLI();
}

/**
 * Cleanup optimizer resources
 */
export function cleanupOptimizer(): void {
  if (globalOptimizer) {
    globalOptimizer.cleanup();
    globalOptimizer = null;
  }
}
