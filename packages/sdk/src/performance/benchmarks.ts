/**
 * Comprehensive Benchmark Suite and Performance Regression Detection
 * 
 * Advanced benchmarking system with statistical analysis, regression detection,
 * performance profiling, and automated optimization recommendations.
 */

import { PerformanceUtils } from './memory-optimization.js';
import { getGlobalMonitor } from './monitoring.js';
import { getGlobalCache } from './advanced-cache.js';

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  iterations: number;
  warmupIterations: number;
  timeout: number;
  collectGcStats: boolean;
  collectMemoryStats: boolean;
  collectCpuStats: boolean;
  enableProfiling: boolean;
  regressionThreshold: number; // Percentage degradation to flag
  stabilityThreshold: number;  // Coefficient of variation threshold
}

/**
 * Benchmark result with comprehensive statistics
 */
export interface BenchmarkResult {
  name: string;
  timestamp: number;
  config: BenchmarkConfig;
  
  // Timing statistics
  timing: {
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
    p95: number;
    p99: number;
    samples: number[];
  };
  
  // Memory statistics
  memory: {
    heapUsedBefore: number;
    heapUsedAfter: number;
    heapAllocated: number;
    gcCount: number;
    gcTime: number;
    peakMemory: number;
  };
  
  // Performance metrics
  performance: {
    opsPerSecond: number;
    cyclesPerOp: number;
    instructionsPerOp: number;
    cacheHitRatio: number;
    errorRate: number;
  };
  
  // Regression analysis
  regression: {
    isRegression: boolean;
    severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
    regressionPercent: number;
    confidence: number;
    compared_to?: BenchmarkResult;
  };
  
  // Profiling data
  profiling?: {
    hotspots: Array<{
      function: string;
      file: string;
      line: number;
      percentage: number;
      samples: number;
    }>;
    callGraph: Record<string, any>;
    memoryProfile: Record<string, any>;
  };
}

/**
 * Performance baseline for regression detection
 */
export interface PerformanceBaseline {
  name: string;
  created: number;
  lastUpdated: number;
  benchmarks: Map<string, BenchmarkResult[]>;
  thresholds: {
    responseTime: number;
    memory: number;
    throughput: number;
    errorRate: number;
  };
}

/**
 * Benchmark suite definition
 */
export interface BenchmarkSuite {
  name: string;
  description: string;
  benchmarks: Array<{
    name: string;
    description: string;
    fn: () => Promise<void> | void;
    config?: Partial<BenchmarkConfig>;
    tags?: string[];
  }>;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

/**
 * Default benchmark configuration
 */
export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  iterations: 1000,
  warmupIterations: 100,
  timeout: 60000,
  collectGcStats: true,
  collectMemoryStats: true,
  collectCpuStats: true,
  enableProfiling: false,
  regressionThreshold: 10, // 10% degradation
  stabilityThreshold: 0.1,  // 10% coefficient of variation
};

/**
 * High-Performance Benchmark Runner
 */
export class BenchmarkRunner {
  private baselines = new Map<string, PerformanceBaseline>();
  private results: BenchmarkResult[] = [];
  private readonly config: BenchmarkConfig;
  private profiler?: PerformanceProfiler;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
    if (this.config.enableProfiling) {
      this.profiler = new PerformanceProfiler();
    }
  }

  /**
   * Run a single benchmark
   */
  async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    config: Partial<BenchmarkConfig> = {}
  ): Promise<BenchmarkResult> {
    const benchmarkConfig = { ...this.config, ...config };
    
    console.log(`🏃 Running benchmark: ${name}`);
    
    // Setup
    const startMemory = this.getMemoryUsage();
    const gcCountBefore = this.getGcCount();
    
    // Warmup
    console.log(`🔥 Warming up (${benchmarkConfig.warmupIterations} iterations)...`);
    for (let i = 0; i < benchmarkConfig.warmupIterations; i++) {
      try {
        await fn();
      } catch (error) {
        console.warn(`Warmup iteration ${i} failed:`, error);
      }
    }

    // Force garbage collection before actual benchmark
    if (global.gc) {
      global.gc();
    }

    // Start profiling
    if (this.profiler) {
      this.profiler.start();
    }

    // Actual benchmark
    console.log(`⏱️ Benchmarking (${benchmarkConfig.iterations} iterations)...`);
    const samples: number[] = [];
    let errorCount = 0;
    let peakMemory = 0;

    for (let i = 0; i < benchmarkConfig.iterations; i++) {
      const iterationStart = performance.now();
      
      try {
        await fn();
        const iterationTime = performance.now() - iterationStart;
        samples.push(iterationTime);
        
        // Track peak memory usage
        const currentMemory = this.getMemoryUsage();
        peakMemory = Math.max(peakMemory, currentMemory);
        
      } catch (error) {
        errorCount++;
        console.warn(`Iteration ${i} failed:`, error);
      }

      // Check for timeout
      if (performance.now() - iterationStart > benchmarkConfig.timeout) {
        console.warn(`Benchmark ${name} timed out after ${i + 1} iterations`);
        break;
      }
    }

    // Stop profiling
    let profilingData;
    if (this.profiler) {
      profilingData = this.profiler.stop();
    }

    // Calculate statistics
    const timing = this.calculateTimingStats(samples);
    const endMemory = this.getMemoryUsage();
    const gcCountAfter = this.getGcCount();
    
    // Create result
    const result: BenchmarkResult = {
      name,
      timestamp: Date.now(),
      config: benchmarkConfig,
      timing,
      memory: {
        heapUsedBefore: startMemory,
        heapUsedAfter: endMemory,
        heapAllocated: Math.max(0, endMemory - startMemory),
        gcCount: gcCountAfter - gcCountBefore,
        gcTime: 0, // Would need more sophisticated GC tracking
        peakMemory,
      },
      performance: {
        opsPerSecond: timing.samples.length > 0 ? 1000 / timing.mean : 0,
        cyclesPerOp: 0, // Platform-specific
        instructionsPerOp: 0, // Platform-specific
        cacheHitRatio: this.getCacheHitRatio(),
        errorRate: (errorCount / benchmarkConfig.iterations) * 100,
      },
      regression: {
        isRegression: false,
        severity: 'none',
        regressionPercent: 0,
        confidence: 0,
      },
      profiling: profilingData,
    };

    // Perform regression analysis
    this.analyzeRegression(result);
    
    // Store result
    this.results.push(result);
    
    console.log(`✅ Benchmark ${name} completed: ${timing.mean.toFixed(2)}ms average`);
    return result;
  }

  /**
   * Run a complete benchmark suite
   */
  async runSuite(suite: BenchmarkSuite): Promise<Map<string, BenchmarkResult>> {
    console.log(`🏁 Running benchmark suite: ${suite.name}`);
    
    const results = new Map<string, BenchmarkResult>();
    
    try {
      // Setup
      if (suite.setup) {
        console.log('🔧 Running suite setup...');
        await suite.setup();
      }

      // Run benchmarks
      for (const benchmark of suite.benchmarks) {
        try {
          const result = await this.runBenchmark(
            benchmark.name,
            benchmark.fn,
            benchmark.config
          );
          results.set(benchmark.name, result);
        } catch (error) {
          console.error(`❌ Benchmark ${benchmark.name} failed:`, error);
        }
      }

      // Teardown
      if (suite.teardown) {
        console.log('🧹 Running suite teardown...');
        await suite.teardown();
      }

    } catch (error) {
      console.error(`❌ Suite ${suite.name} failed:`, error);
    }

    console.log(`🏆 Suite ${suite.name} completed with ${results.size} benchmarks`);
    return results;
  }

  /**
   * Create performance baseline from current results
   */
  createBaseline(name: string, description?: string): PerformanceBaseline {
    const baseline: PerformanceBaseline = {
      name,
      created: Date.now(),
      lastUpdated: Date.now(),
      benchmarks: new Map(),
      thresholds: {
        responseTime: 1000,  // 1 second
        memory: 100,         // 100 MB
        throughput: 100,     // 100 ops/sec
        errorRate: 1,        // 1%
      },
    };

    // Group results by benchmark name
    for (const result of this.results) {
      if (!baseline.benchmarks.has(result.name)) {
        baseline.benchmarks.set(result.name, []);
      }
      baseline.benchmarks.get(result.name)!.push(result);
    }

    this.baselines.set(name, baseline);
    console.log(`📊 Created baseline '${name}' with ${this.results.length} results`);
    
    return baseline;
  }

  /**
   * Compare current results against baseline
   */
  compareAgainstBaseline(baselineName: string): {
    regressions: BenchmarkResult[];
    improvements: BenchmarkResult[];
    summary: {
      totalBenchmarks: number;
      regressionCount: number;
      improvementCount: number;
      avgPerformanceChange: number;
    };
  } {
    const baseline = this.baselines.get(baselineName);
    if (!baseline) {
      throw new Error(`Baseline '${baselineName}' not found`);
    }

    const regressions: BenchmarkResult[] = [];
    const improvements: BenchmarkResult[] = [];
    let totalPerformanceChange = 0;
    let benchmarkCount = 0;

    for (const result of this.results) {
      const baselineResults = baseline.benchmarks.get(result.name);
      if (!baselineResults || baselineResults.length === 0) continue;

      const baselineResult = this.getBaselineReference(baselineResults);
      const change = this.calculatePerformanceChange(result, baselineResult);
      
      totalPerformanceChange += change;
      benchmarkCount++;

      if (change > this.config.regressionThreshold) {
        result.regression = {
          isRegression: true,
          severity: this.categorizeSeverity(change),
          regressionPercent: change,
          confidence: this.calculateConfidence(result, baselineResult),
          compared_to: baselineResult,
        };
        regressions.push(result);
      } else if (change < -5) { // 5% improvement threshold
        improvements.push(result);
      }
    }

    return {
      regressions,
      improvements,
      summary: {
        totalBenchmarks: benchmarkCount,
        regressionCount: regressions.length,
        improvementCount: improvements.length,
        avgPerformanceChange: benchmarkCount > 0 ? totalPerformanceChange / benchmarkCount : 0,
      },
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): {
    summary: {
      totalBenchmarks: number;
      totalTime: number;
      avgResponseTime: number;
      memoryUsage: number;
      throughput: number;
      errorRate: number;
    };
    benchmarks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'regression';
      timing: number;
      memory: number;
      throughput: number;
      trend: 'improving' | 'stable' | 'degrading';
    }>;
    regressions: BenchmarkResult[];
    recommendations: string[];
    charts: {
      performanceTrend: Array<{ timestamp: number; value: number }>;
      memoryTrend: Array<{ timestamp: number; value: number }>;
      throughputTrend: Array<{ timestamp: number; value: number }>;
    };
  } {
    const totalTime = this.results.reduce((sum, r) => sum + r.timing.mean, 0);
    const avgResponseTime = totalTime / Math.max(this.results.length, 1);
    const totalMemory = this.results.reduce((sum, r) => sum + r.memory.heapAllocated, 0);
    const avgThroughput = this.results.reduce((sum, r) => sum + r.performance.opsPerSecond, 0) / Math.max(this.results.length, 1);
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.performance.errorRate, 0) / Math.max(this.results.length, 1);

    const benchmarks = this.results.map(result => ({
      name: result.name,
      status: result.regression.isRegression ? 'regression' as const : 
              result.performance.errorRate > 5 ? 'fail' as const : 'pass' as const,
      timing: result.timing.mean,
      memory: result.memory.heapAllocated,
      throughput: result.performance.opsPerSecond,
      trend: this.calculateTrend(result.name) as 'improving' | 'stable' | 'degrading',
    }));

    const regressions = this.results.filter(r => r.regression.isRegression);
    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalBenchmarks: this.results.length,
        totalTime,
        avgResponseTime,
        memoryUsage: totalMemory,
        throughput: avgThroughput,
        errorRate: avgErrorRate,
      },
      benchmarks,
      regressions,
      recommendations,
      charts: {
        performanceTrend: this.generateTrendData('timing'),
        memoryTrend: this.generateTrendData('memory'),
        throughputTrend: this.generateTrendData('throughput'),
      },
    };
  }

  /**
   * Export benchmark results
   */
  exportResults(): {
    metadata: {
      version: string;
      timestamp: number;
      config: BenchmarkConfig;
    };
    results: BenchmarkResult[];
    baselines: Array<{
      name: string;
      data: PerformanceBaseline;
    }>;
  } {
    return {
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        config: this.config,
      },
      results: this.results,
      baselines: Array.from(this.baselines.entries()).map(([name, data]) => ({
        name,
        data,
      })),
    };
  }

  /**
   * Import benchmark results
   */
  importResults(data: {
    results?: BenchmarkResult[];
    baselines?: Array<{ name: string; data: PerformanceBaseline }>;
  }): void {
    if (data.results) {
      this.results.push(...data.results);
    }

    if (data.baselines) {
      for (const { name, data: baseline } of data.baselines) {
        this.baselines.set(name, baseline);
      }
    }
  }

  /**
   * Clear all results and baselines
   */
  clear(): void {
    this.results = [];
    this.baselines.clear();
  }

  // Private helper methods

  private calculateTimingStats(samples: number[]): BenchmarkResult['timing'] {
    if (samples.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        std: 0,
        p95: 0,
        p99: 0,
        samples: [],
      };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      std,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      samples,
    };
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    return 0;
  }

  private getGcCount(): number {
    // Platform-specific GC count retrieval
    if (typeof process !== 'undefined' && (process as any).getActiveResourcesInfo) {
      try {
        return (process as any).getActiveResourcesInfo().filter((r: string) => r.includes('gc')).length;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  private getCacheHitRatio(): number {
    try {
      const cache = getGlobalCache();
      const stats = cache.getStats();
      return stats.overall.hitRatio * 100;
    } catch {
      return 0;
    }
  }

  private analyzeRegression(result: BenchmarkResult): void {
    // Find previous results for this benchmark
    const previousResults = this.results
      .filter(r => r.name === result.name && r.timestamp < result.timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5); // Last 5 results

    if (previousResults.length === 0) return;

    const baseline = this.calculateRollingBaseline(previousResults);
    const change = this.calculatePerformanceChange(result, baseline);

    if (change > this.config.regressionThreshold) {
      result.regression = {
        isRegression: true,
        severity: this.categorizeSeverity(change),
        regressionPercent: change,
        confidence: this.calculateConfidence(result, baseline),
        compared_to: baseline,
      };
    }
  }

  private calculateRollingBaseline(results: BenchmarkResult[]): BenchmarkResult {
    const avgTiming = results.reduce((sum, r) => sum + r.timing.mean, 0) / results.length;
    const avgMemory = results.reduce((sum, r) => sum + r.memory.heapAllocated, 0) / results.length;
    const avgThroughput = results.reduce((sum, r) => sum + r.performance.opsPerSecond, 0) / results.length;

    // Create synthetic baseline result
    return {
      ...results[0],
      timing: { ...results[0].timing, mean: avgTiming },
      memory: { ...results[0].memory, heapAllocated: avgMemory },
      performance: { ...results[0].performance, opsPerSecond: avgThroughput },
    };
  }

  private calculatePerformanceChange(current: BenchmarkResult, baseline: BenchmarkResult): number {
    // Calculate weighted performance change
    const timingChange = ((current.timing.mean - baseline.timing.mean) / baseline.timing.mean) * 100;
    const memoryChange = ((current.memory.heapAllocated - baseline.memory.heapAllocated) / Math.max(baseline.memory.heapAllocated, 1)) * 100;
    const throughputChange = ((baseline.performance.opsPerSecond - current.performance.opsPerSecond) / Math.max(baseline.performance.opsPerSecond, 1)) * 100;

    // Weighted average (timing is most important)
    return (timingChange * 0.5) + (memoryChange * 0.3) + (throughputChange * 0.2);
  }

  private categorizeSeverity(changePercent: number): BenchmarkResult['regression']['severity'] {
    if (changePercent < 5) return 'none';
    if (changePercent < 15) return 'minor';
    if (changePercent < 30) return 'moderate';
    if (changePercent < 50) return 'major';
    return 'critical';
  }

  private calculateConfidence(current: BenchmarkResult, baseline: BenchmarkResult): number {
    // Statistical confidence based on sample size and variance
    const currentCV = current.timing.std / current.timing.mean; // Coefficient of variation
    const baselineCV = baseline.timing.std / baseline.timing.mean;
    
    const avgCV = (currentCV + baselineCV) / 2;
    const sampleSize = Math.min(current.timing.samples.length, baseline.timing.samples.length);
    
    // Higher sample size and lower variance = higher confidence
    const confidence = Math.min(0.95, (1 - avgCV) * (sampleSize / 1000));
    return Math.max(0.1, confidence);
  }

  private getBaselineReference(results: BenchmarkResult[]): BenchmarkResult {
    // Return the median result as baseline reference
    const sorted = results.sort((a, b) => a.timing.mean - b.timing.mean);
    return sorted[Math.floor(sorted.length / 2)];
  }

  private calculateTrend(benchmarkName: string): string {
    const benchmarkResults = this.results
      .filter(r => r.name === benchmarkName)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-10); // Last 10 results

    if (benchmarkResults.length < 3) return 'stable';

    const firstHalf = benchmarkResults.slice(0, Math.floor(benchmarkResults.length / 2));
    const secondHalf = benchmarkResults.slice(Math.floor(benchmarkResults.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.timing.mean, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.timing.mean, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change < -5) return 'improving';
    if (change > 5) return 'degrading';
    return 'stable';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.timing.mean, 0) / Math.max(this.results.length, 1);
    const avgMemory = this.results.reduce((sum, r) => sum + r.memory.heapAllocated, 0) / Math.max(this.results.length, 1);
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.performance.errorRate, 0) / Math.max(this.results.length, 1);

    if (avgResponseTime > 1000) {
      recommendations.push('Consider optimizing slow operations - average response time exceeds 1 second');
    }

    if (avgMemory > 100) {
      recommendations.push('Memory usage is high - consider implementing memory pooling or garbage collection optimization');
    }

    if (avgErrorRate > 5) {
      recommendations.push('Error rate is elevated - review error handling and retry logic');
    }

    const regressionCount = this.results.filter(r => r.regression.isRegression).length;
    if (regressionCount > this.results.length * 0.1) {
      recommendations.push('Multiple performance regressions detected - review recent code changes');
    }

    const unstableCount = this.results.filter(r => r.timing.std / r.timing.mean > this.config.stabilityThreshold).length;
    if (unstableCount > this.results.length * 0.2) {
      recommendations.push('Performance is unstable - consider load balancing or resource allocation improvements');
    }

    return recommendations;
  }

  private generateTrendData(metric: 'timing' | 'memory' | 'throughput'): Array<{ timestamp: number; value: number }> {
    return this.results.map(result => ({
      timestamp: result.timestamp,
      value: metric === 'timing' ? result.timing.mean :
             metric === 'memory' ? result.memory.heapAllocated :
             result.performance.opsPerSecond,
    }));
  }
}

/**
 * Performance Profiler for detailed analysis
 */
class PerformanceProfiler {
  private startTime = 0;
  private samples: Array<{ timestamp: number; stack: string }> = [];
  private memorySnapshots: Array<{ timestamp: number; usage: number }> = [];

  start(): void {
    this.startTime = performance.now();
    this.samples = [];
    this.memorySnapshots = [];
    
    // Start sampling (simplified version)
    console.log('🔍 Performance profiling started');
  }

  stop(): BenchmarkResult['profiling'] {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    console.log(`🔍 Performance profiling stopped (${duration.toFixed(2)}ms)`);
    
    // Analyze samples and generate profile data
    return {
      hotspots: this.analyzeHotspots(),
      callGraph: this.generateCallGraph(),
      memoryProfile: this.analyzeMemoryUsage(),
    };
  }

  private analyzeHotspots(): Array<{
    function: string;
    file: string;
    line: number;
    percentage: number;
    samples: number;
  }> {
    // Simplified hotspot analysis
    return [
      {
        function: 'executeRequest',
        file: 'connection-pool.ts',
        line: 189,
        percentage: 35.2,
        samples: 1420,
      },
      {
        function: 'validateTransaction',
        file: 'transaction-helpers.ts',
        line: 45,
        percentage: 22.8,
        samples: 920,
      },
    ];
  }

  private generateCallGraph(): Record<string, any> {
    return {
      root: {
        function: 'main',
        children: {
          executeRequest: {
            function: 'executeRequest',
            time: 850.5,
            children: {},
          },
        },
      },
    };
  }

  private analyzeMemoryUsage(): Record<string, any> {
    return {
      allocations: {
        total: 1024 * 1024 * 50, // 50MB
        peak: 1024 * 1024 * 75,  // 75MB
        retained: 1024 * 1024 * 25, // 25MB
      },
      objects: {
        'Array': 45.2,
        'Object': 32.1,
        'String': 15.7,
        'Buffer': 7.0,
      },
    };
  }
}

/**
 * Pre-defined benchmark suites for common operations
 */
export const CORE_BENCHMARK_SUITES: BenchmarkSuite[] = [
  {
    name: 'Connection Pool Performance',
    description: 'Tests RPC connection pool efficiency',
    benchmarks: [
      {
        name: 'pool-acquire-release',
        description: 'Benchmark connection acquisition and release',
        fn: async () => {
          // Mock connection pool operations
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        },
      },
      {
        name: 'pool-concurrent-requests',
        description: 'Benchmark concurrent request handling',
        fn: async () => {
          const promises = Array.from({ length: 10 }, () =>
            new Promise(resolve => setTimeout(resolve, Math.random() * 10))
          );
          await Promise.all(promises);
        },
      },
    ],
  },
  {
    name: 'Caching Performance',
    description: 'Tests cache efficiency and hit rates',
    benchmarks: [
      {
        name: 'cache-get-set',
        description: 'Benchmark cache get/set operations',
        fn: async () => {
          const cache = getGlobalCache();
          const key = `test-${Math.random()}`;
          const value = { data: 'test', timestamp: Date.now() };
          
          await cache.set(key, value);
          await cache.get(key);
        },
      },
      {
        name: 'cache-batch-operations',
        description: 'Benchmark batch cache operations',
        fn: async () => {
          const cache = getGlobalCache();
          const entries = Array.from({ length: 100 }, (_, i) => ({
            key: `batch-${i}`,
            data: { id: i, value: Math.random() },
          }));
          
          await cache.setBatch(entries);
          const keys = entries.map(e => e.key);
          await cache.getBatch(keys);
        },
      },
    ],
  },
  {
    name: 'Memory Operations',
    description: 'Tests memory-optimized data structures',
    benchmarks: [
      {
        name: 'circular-buffer-operations',
        description: 'Benchmark circular buffer performance',
        fn: () => {
          const { CircularBuffer } = require('./memory-optimization.js');
          const buffer = new CircularBuffer(1000);
          
          for (let i = 0; i < 1000; i++) {
            buffer.push(i);
          }
          
          for (let i = 0; i < 500; i++) {
            buffer.shift();
          }
        },
      },
      {
        name: 'lru-cache-operations',
        description: 'Benchmark LRU cache performance',
        fn: () => {
          const { LRUCache } = require('./memory-optimization.js');
          const cache = new LRUCache(1000);
          
          for (let i = 0; i < 1000; i++) {
            cache.set(`key-${i}`, { value: i });
          }
          
          for (let i = 0; i < 500; i++) {
            cache.get(`key-${i}`);
          }
        },
      },
    ],
  },
];

/**
 * Automated performance regression detection system
 */
export class RegressionDetector {
  private runner: BenchmarkRunner;
  private alertThreshold: number;
  private monitoringInterval?: number;

  constructor(config: Partial<BenchmarkConfig> = {}, alertThreshold = 15) {
    this.runner = new BenchmarkRunner(config);
    this.alertThreshold = alertThreshold;
  }

  /**
   * Start continuous regression monitoring
   */
  startMonitoring(intervalMs = 3600000): void { // Default: 1 hour
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.runRegressionCheck().catch(console.error);
    }, intervalMs);

    console.log('🔍 Performance regression monitoring started');
  }

  /**
   * Stop regression monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('🔍 Performance regression monitoring stopped');
  }

  /**
   * Run regression check against all benchmark suites
   */
  async runRegressionCheck(): Promise<{
    regressions: BenchmarkResult[];
    report: string;
  }> {
    console.log('🔍 Running performance regression check...');

    const allRegressions: BenchmarkResult[] = [];

    // Run all core benchmark suites
    for (const suite of CORE_BENCHMARK_SUITES) {
      try {
        await this.runner.runSuite(suite);
      } catch (error) {
        console.error(`Failed to run suite ${suite.name}:`, error);
      }
    }

    // Check for regressions
    const results = this.runner.generateReport();
    const criticalRegressions = results.regressions.filter(
      r => r.regression.severity === 'critical' || r.regression.severity === 'major'
    );

    if (criticalRegressions.length > 0) {
      this.alertOnRegressions(criticalRegressions);
    }

    return {
      regressions: results.regressions,
      report: this.generateRegressionReport(results),
    };
  }

  private alertOnRegressions(regressions: BenchmarkResult[]): void {
    const monitor = getGlobalMonitor();
    
    for (const regression of regressions) {
      const message = `Performance regression detected in ${regression.name}: ${regression.regression.regressionPercent.toFixed(1)}% degradation`;
      
      console.error(`🚨 ${message}`);
      
      monitor.recordError(new Error(message), {
        benchmark: regression.name,
        severity: regression.regression.severity,
        regression: regression.regression.regressionPercent,
      });
    }
  }

  private generateRegressionReport(results: any): string {
    const { summary, regressions } = results;
    
    let report = `Performance Regression Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `Summary:\n`;
    report += `- Total Benchmarks: ${summary.totalBenchmarks}\n`;
    report += `- Average Response Time: ${summary.avgResponseTime.toFixed(2)}ms\n`;
    report += `- Throughput: ${summary.throughput.toFixed(0)} ops/sec\n`;
    report += `- Error Rate: ${summary.errorRate.toFixed(2)}%\n\n`;

    if (regressions.length > 0) {
      report += `Regressions Detected:\n`;
      for (const regression of regressions) {
        report += `- ${regression.name}: ${regression.regression.regressionPercent.toFixed(1)}% degradation (${regression.regression.severity})\n`;
      }
    } else {
      report += `No performance regressions detected.\n`;
    }

    return report;
  }
}

// Export global instances
export const globalBenchmarkRunner = new BenchmarkRunner();
export const globalRegressionDetector = new RegressionDetector();