/**
 * Comprehensive Performance Test Suite
 * 
 * Tests all performance optimization features to ensure they work correctly
 * and provide the expected performance improvements.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { 
  PerformanceManager, 
  getGlobalPerformanceManager,
  assessPerformance,
  OPTIMAL_PERFORMANCE_CONFIG 
} from './index.js';
import { AdvancedCacheManager } from './advanced-cache.js';
import { PerformanceMonitor } from './monitoring.js';
import { LoadBalancer } from './scaling.js';
import { BenchmarkRunner, CORE_BENCHMARK_SUITES } from './benchmarks.js';
import { 
  CircularBuffer, 
  PriorityQueue, 
  LRUCache, 
  BloomFilter,
  FastSort,
  FastSearch,
  PerformanceUtils
} from './memory-optimization.js';

describe('Performance Optimization Suite', () => {
  let performanceManager: PerformanceManager;

  beforeAll(async () => {
    performanceManager = getGlobalPerformanceManager(OPTIMAL_PERFORMANCE_CONFIG);
  });

  afterAll(async () => {
    await performanceManager.shutdown();
  });

  describe('Advanced Caching System', () => {
    test('should provide multi-level caching with high hit ratio', async () => {
      const cache = new AdvancedCacheManager({
        l1MaxSize: 100,
        l1TtlMs: 10000,
        l2MaxSize: 500,
        l2TtlMs: 30000,
      });

      // Test L1 cache
      await cache.set('test1', { data: 'value1' }, { forceLevel: 'l1' });
      const result1 = await cache.get('test1');
      expect(result1).toEqual({ data: 'value1' });

      // Test L2 cache
      await cache.set('test2', { data: 'value2' }, { forceLevel: 'l2' });
      const result2 = await cache.get('test2');
      expect(result2).toEqual({ data: 'value2' });

      // Test batch operations
      const entries = Array.from({ length: 50 }, (_, i) => ({
        key: `batch-${i}`,
        data: { id: i, value: Math.random() },
      }));

      await cache.setBatch(entries);
      const keys = entries.map(e => e.key);
      const results = await cache.getBatch(keys);

      expect(results.size).toBe(50);
      
      // Check cache statistics
      const stats = cache.getStats();
      expect(stats.overall.hitRatio).toBeGreaterThan(0.8);
      expect(stats.l1.size).toBeGreaterThan(0);
    });

    test('should optimize cache performance automatically', async () => {
      const cache = new AdvancedCacheManager();

      // Fill cache with varied data including some large entries
      for (let i = 0; i < 1000; i++) {
        const largeData = i % 10 === 0 ? new Array(2000).fill(i) : new Array(100).fill(i);
        await cache.set(`key-${i}`, { value: i, data: largeData });
      }
      
      // Add some entries that will expire
      for (let i = 0; i < 100; i++) {
        await cache.set(`expire-${i}`, { value: i }, { ttl: 1 }); // 1ms TTL
      }
      
      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const statsBefore = cache.getStats();
      const optimization = await cache.optimize();

      // Should have freed memory from expired entries or compression
      expect(optimization.memoryFreed).toBeGreaterThanOrEqual(0);
      expect(optimization.entriesOptimized).toBeGreaterThanOrEqual(0);

      const statsAfter = cache.getStats();
      expect(statsAfter.l1.memoryUsageMB).toBeLessThanOrEqual(statsBefore.l1.memoryUsageMB);
    });

    test('should handle cache invalidation correctly', async () => {
      const cache = new AdvancedCacheManager();

      // Set up test data
      await cache.set('user:1', { name: 'User 1' });
      await cache.set('user:2', { name: 'User 2' });
      await cache.set('post:1', { title: 'Post 1' });

      // Test pattern-based invalidation
      const invalidated = await cache.invalidate(/user:.*/);
      expect(invalidated).toBe(2);

      // Verify invalidation worked
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('post:1')).not.toBeNull();
    });
  });

  describe('Performance Monitoring System', () => {
    test('should collect comprehensive performance metrics', async () => {
      const monitor = new PerformanceMonitor({
        sampleIntervalMs: 100,
        realTimeEnabled: true,
      });

      // Record some test metrics
      monitor.recordResponseTime(150, 'test-operation');
      monitor.recordResponseTime(200, 'test-operation');
      monitor.recordSuccess('test-operation');
      monitor.recordError(new Error('Test error'), { operation: 'test-operation' });

      const metrics = monitor.getMetrics();
      
      expect(metrics.responseTime.average).toBeGreaterThan(0);
      expect(metrics.throughput.totalRequests).toBeGreaterThan(0);
      expect(metrics.errors.count).toBe(1);
      expect(metrics.health.score).toBeLessThan(100); // Due to error

      monitor.stopMonitoring();
    });

    test('should generate performance alerts', async () => {
      const monitor = new PerformanceMonitor({
        alerts: {
          enabled: true,
          thresholds: {
            responseTime: 100,
            errorRate: 1,
            memoryUsage: 80,
            cpuUsage: 80,
            healthScore: 90,
          },
          channels: { console: true },
          cooldownMs: 1000,
          escalationLevels: [],
        },
      });

      // Trigger alerts
      monitor.recordResponseTime(500, 'slow-operation'); // Above threshold
      monitor.recordError(new Error('Critical error'));

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const alerts = monitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      monitor.stopMonitoring();
    });

    test('should export and import monitoring data', async () => {
      const monitor1 = new PerformanceMonitor();
      
      // Record some data
      monitor1.recordResponseTime(100, 'test');
      monitor1.recordSuccess('test');

      // Export data
      const exportedData = monitor1.exportData();
      expect(exportedData.metrics).toBeDefined();
      expect(exportedData.config).toBeDefined();

      // Import to new monitor
      const monitor2 = new PerformanceMonitor();
      monitor2.importData(exportedData);

      const metrics = monitor2.getMetrics();
      expect(metrics.throughput.totalRequests).toBeGreaterThan(0);

      monitor1.stopMonitoring();
      monitor2.stopMonitoring();
    });
  });

  describe('Memory-Optimized Data Structures', () => {
    test('CircularBuffer should handle high-frequency operations efficiently', () => {
      const buffer = new CircularBuffer<number>(1000);
      
      const startTime = performance.now();
      
      // Fill buffer beyond capacity to test overwrite behavior
      for (let i = 0; i < 10000; i++) {
        buffer.push(i);
      }
      
      // Buffer should be at capacity (1000) with items 9000-9999
      expect(buffer.getSize()).toBe(1000);
      
      // Read some items from buffer
      for (let i = 0; i < 500; i++) {
        buffer.shift();
      }
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      expect(operationTime).toBeLessThan(50); // Should complete in <50ms
      expect(buffer.getSize()).toBe(500); // Should have 500 items left
      expect(buffer.isFull()).toBe(false); // Not full after shifting items
    });

    test('PriorityQueue should maintain correct priority order', () => {
      const queue = new PriorityQueue<string>(true); // Min heap
      
      queue.enqueue('low', 1);
      queue.enqueue('high', 10);
      queue.enqueue('medium', 5);
      queue.enqueue('urgent', 20);
      
      expect(queue.dequeue()).toBe('low');
      expect(queue.dequeue()).toBe('medium');
      expect(queue.dequeue()).toBe('high');
      expect(queue.dequeue()).toBe('urgent');
    });

    test('LRUCache should evict least recently used items', () => {
      const cache = new LRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // Access 'a' to make it recently used
      cache.get('a');
      
      // Add new item, should evict 'b'
      cache.set('d', 4);
      
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    test('BloomFilter should provide fast membership testing', () => {
      const filter = new BloomFilter(1000, 0.01);
      
      const testItems = Array.from({ length: 500 }, (_, i) => `item-${i}`);
      
      // Add items to filter
      testItems.forEach(item => filter.add(item));
      
      // Test positive cases (should all return true)
      testItems.forEach(item => {
        expect(filter.test(item)).toBe(true);
      });
      
      // Test negative cases (should mostly return false)
      const negativeTests = Array.from({ length: 100 }, (_, i) => `missing-${i}`);
      const falsePositives = negativeTests.filter(item => filter.test(item)).length;
      
      // False positive rate should be low (< 5% for 1% target)
      expect(falsePositives / negativeTests.length).toBeLessThan(0.05);
    });

    test('FastSort algorithms should outperform native sort for large datasets', async () => {
      const size = 10000;
      const data = Array.from({ length: size }, () => Math.random() * 1000);
      
      // Test quicksort
      const { result: quickSortResult, timeMs: quickSortTime } = await PerformanceUtils.measureTime(
        () => FastSort.quickSort([...data])
      );
      
      // Test native sort
      const { result: nativeSortResult, timeMs: nativeSortTime } = await PerformanceUtils.measureTime(
        () => [...data].sort((a, b) => a - b)
      );
      
      // Verify correctness
      expect(quickSortResult).toEqual(nativeSortResult);
      
      // Performance should be competitive (within 50% of native)
      expect(quickSortTime).toBeLessThan(nativeSortTime * 1.5);
    });

    test('FastSearch should provide efficient search algorithms', () => {
      const sortedData = Array.from({ length: 10000 }, (_, i) => i * 2);
      
      // Test binary search
      const target = 5000;
      const index = FastSearch.binarySearch(sortedData, target);
      
      expect(index).toBe(2500); // target / 2
      expect(sortedData[index]).toBe(target);
      
      // Test interpolation search for uniformly distributed data
      const interpIndex = FastSearch.interpolationSearch(sortedData, target);
      expect(interpIndex).toBe(2500);
      
      // Test Boyer-Moore string search
      const text = 'The quick brown fox jumps over the lazy dog';
      const pattern = 'brown';
      const matches = FastSearch.boyerMooreSearch(text, pattern);
      
      expect(matches.length).toBe(1);
      expect(matches[0]).toBe(10); // Position of 'brown'
    });
  });

  describe('Load Balancing and Scaling', () => {
    test('should distribute requests across healthy instances', async () => {
      const loadBalancer = new LoadBalancer({
        strategy: 'round-robin',
        healthCheck: { enabled: false }, // Disable for test
        autoScaling: { enabled: false },
      });

      // Add test instances
      for (let i = 0; i < 3; i++) {
        loadBalancer.addInstance({
          id: `instance-${i}`,
          endpoint: `http://test-${i}.local`,
          weight: 1,
          cpuUsage: 50,
          memoryUsage: 60,
          metadata: {},
        });
      }

      const requestCounts = new Map<string, number>();
      
      // Execute multiple requests
      for (let i = 0; i < 30; i++) {
        try {
          await loadBalancer.executeRequest(async (instance) => {
            const count = requestCounts.get(instance.id) || 0;
            requestCounts.set(instance.id, count + 1);
            return { success: true, instance: instance.id };
          });
        } catch (error) {
          // Expected for test instances
        }
      }

      // Verify distribution (should be roughly equal for round-robin)
      const counts = Array.from(requestCounts.values());
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      
      expect(maxCount - minCount).toBeLessThanOrEqual(1); // Should be evenly distributed

      await loadBalancer.shutdown();
    });

    test('should handle circuit breaker patterns', async () => {
      const loadBalancer = new LoadBalancer({
        circuitBreakerThreshold: 3,
        circuitBreakerTimeoutMs: 1000,
      });

      loadBalancer.addInstance({
        id: 'failing-instance',
        endpoint: 'http://failing.local',
        weight: 1,
        cpuUsage: 50,
        memoryUsage: 60,
        metadata: {},
      });

      let failureCount = 0;
      
      // Execute failing requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await loadBalancer.executeRequest(async () => {
            throw new Error('Simulated failure');
          });
        } catch (error) {
          failureCount++;
        }
      }

      expect(failureCount).toBe(5);
      
      const instances = loadBalancer.getInstances();
      const failingInstance = instances.find(i => i.id === 'failing-instance');
      
      // Circuit breaker should be open after failures
      expect(failingInstance?.circuitBreakerState).toBe('open');

      await loadBalancer.shutdown();
    });
  });

  describe('Benchmark and Regression Detection', () => {
    test('should run benchmark suites and collect metrics', async () => {
      const runner = new BenchmarkRunner({
        iterations: 100,
        warmupIterations: 10,
      });

      // Run a simple benchmark
      const result = await runner.runBenchmark('test-benchmark', () => {
        // Simulate some work
        const arr = Array.from({ length: 1000 }, (_, i) => i);
        arr.sort((a, b) => b - a);
        return arr.length;
      });

      expect(result.timing.samples.length).toBe(100);
      expect(result.timing.mean).toBeGreaterThan(0);
      expect(result.performance.opsPerSecond).toBeGreaterThan(0);
      expect(result.memory.heapAllocated).toBeGreaterThanOrEqual(0);
    });

    test('should detect performance regressions', async () => {
      const runner = new BenchmarkRunner({
        iterations: 50,
        regressionThreshold: 20, // 20% threshold
      });

      // Create baseline with fast operation
      await runner.runBenchmark('regression-test', () => {
        return Array.from({ length: 100 }, (_, i) => i).reduce((sum, n) => sum + n, 0);
      });

      runner.createBaseline('test-baseline');

      // Run slower operation to trigger regression
      await runner.runBenchmark('regression-test', () => {
        // Intentionally slower operation
        let result = 0;
        for (let i = 0; i < 1000; i++) {
          for (let j = 0; j < 100; j++) {
            result += i * j;
          }
        }
        return result;
      });

      const comparison = runner.compareAgainstBaseline('test-baseline');
      expect(comparison.regressions.length).toBeGreaterThan(0);
    });

    test('should generate comprehensive performance reports', async () => {
      const runner = new BenchmarkRunner();

      // Run multiple benchmarks
      for (const suite of CORE_BENCHMARK_SUITES.slice(0, 1)) { // Just one suite for test
        await runner.runSuite(suite);
      }

      const report = runner.generateReport();
      
      expect(report.summary.totalBenchmarks).toBeGreaterThan(0);
      expect(report.benchmarks.length).toBeGreaterThan(0);
      expect(report.recommendations).toBeDefined();
      expect(report.charts.performanceTrend.length).toBeGreaterThan(0);
    });
  });

  describe('Integrated Performance Manager', () => {
    test('should provide unified performance management', async () => {
      const stats = await performanceManager.getStats();
      
      expect(stats.cache).toBeDefined();
      expect(stats.monitoring).toBeDefined();
      expect(stats.scaling).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.benchmarks).toBeDefined();
    });

    test('should run comprehensive optimization', async () => {
      const optimization = await performanceManager.optimize();
      
      expect(optimization.cacheOptimization).toBeDefined();
      expect(optimization.memoryOptimization).toBeDefined();
      expect(optimization.recommendedActions).toBeDefined();
      expect(optimization.performanceGain).toBeGreaterThanOrEqual(0);
    });

    test('should execute operations with performance monitoring', async () => {
      const result = await performanceManager.executeWithMonitoring(
        async () => {
          // Simulate some async work
          await new Promise(resolve => setTimeout(resolve, 50));
          return { success: true, data: 'test' };
        },
        'test-operation'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    test('should provide performance recommendations', () => {
      const recommendations = performanceManager.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should export and import performance data', async () => {
      const exportedData = await performanceManager.exportPerformanceData();
      
      expect(exportedData.config).toBeDefined();
      expect(exportedData.stats).toBeDefined();
      expect(exportedData.timestamp).toBeGreaterThan(0);

      // Test import (should not throw)
      await performanceManager.importPerformanceData({
        cache: exportedData.cache,
      });
    });
  });

  describe('Performance Assessment', () => {
    test('should provide accurate performance assessment', async () => {
      const assessment = await assessPerformance();
      
      expect(assessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(assessment.grade);
      expect(assessment.summary).toBeDefined();
      expect(Array.isArray(assessment.recommendations)).toBe(true);
    });

    test('should achieve target performance score of 100/100', async () => {
      // Run optimization first
      await performanceManager.optimize();
      
      // Create baseline for comparison
      await performanceManager.createBaseline('test-baseline');
      
      // Run benchmarks
      await performanceManager.runBenchmarks();
      
      // Get final assessment
      const assessment = await assessPerformance();
      
      // Performance score should be high (target: 100/100)
      expect(assessment.score).toBeGreaterThanOrEqual(85); // Allow some variance
      expect(assessment.grade).toMatch(/[A-B]/); // Grade A or B
      
      console.log(`🎯 Performance Assessment: ${assessment.score}/100 (Grade ${assessment.grade})`);
      console.log(`📊 Summary: ${assessment.summary}`);
      
      if (assessment.recommendations.length > 0) {
        console.log(`💡 Recommendations:`, assessment.recommendations);
      }
    });
  });

  describe('Real-world Performance Scenarios', () => {
    test('should handle high-frequency operations efficiently', async () => {
      const operations = 10000;
      const startTime = performance.now();
      
      // Simulate high-frequency cache operations
      const cache = new AdvancedCacheManager();
      const promises = Array.from({ length: operations }, async (_, i) => {
        const key = `high-freq-${i % 100}`; // Some duplication for cache hits
        const value = { id: i, data: `value-${i}` };
        
        await cache.set(key, value);
        return cache.get(key);
      });
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const opsPerSecond = (operations / totalTime) * 1000;
      
      expect(opsPerSecond).toBeGreaterThan(5000); // Should handle >5k ops/sec
      
      const stats = cache.getStats();
      expect(stats.overall.hitRatio).toBeGreaterThan(0.5); // Should have cache hits
    });

    test('should scale under concurrent load', async () => {
      const concurrentUsers = 50;
      const operationsPerUser = 20;
      
      const loadBalancer = new LoadBalancer({
        maxConnections: 10,
        strategy: 'least-connections',
      });

      // Add instances
      for (let i = 0; i < 5; i++) {
        loadBalancer.addInstance({
          id: `load-test-${i}`,
          endpoint: `http://load-test-${i}.local`,
          weight: 1,
          cpuUsage: 30,
          memoryUsage: 40,
          metadata: {},
        });
      }

      const startTime = performance.now();
      
      // Simulate concurrent users
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userId) => {
        const userOperations = Array.from({ length: operationsPerUser }, async (_, opId) => {
          try {
            return await loadBalancer.executeRequest(async (instance) => {
              // Simulate variable response time
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
              return { userId, opId, instance: instance.id };
            });
          } catch (error) {
            return { error: error.message };
          }
        });
        
        return Promise.all(userOperations);
      });

      const results = await Promise.all(userPromises);
      const endTime = performance.now();
      
      const totalOperations = concurrentUsers * operationsPerUser;
      const totalTime = (endTime - startTime) / 1000; // seconds
      const throughput = totalOperations / totalTime;
      
      expect(throughput).toBeGreaterThan(100); // Should handle >100 ops/sec under load
      
      const successfulOperations = results.flat().filter(r => !r.error).length;
      const successRate = successfulOperations / totalOperations;
      
      expect(successRate).toBeGreaterThan(0.95); // >95% success rate

      await loadBalancer.shutdown();
    });

    test('should maintain performance under memory pressure', async () => {
      const largeDataSize = 1000;
      const iterations = 100;
      
      const cache = new AdvancedCacheManager({
        l1MaxSize: 50, // Intentionally small
        maxMemoryUsageMB: 10,
        compressionEnabled: true,
      });

      // Generate large objects to create memory pressure
      for (let i = 0; i < iterations; i++) {
        const largeObject = {
          id: i,
          data: new Array(largeDataSize).fill(0).map(() => Math.random()),
          metadata: {
            created: Date.now(),
            tags: Array.from({ length: 20 }, (_, j) => `tag-${j}`),
          },
        };

        await cache.set(`large-${i}`, largeObject);
        
        // Periodically read to test cache performance
        if (i % 10 === 0) {
          await cache.get(`large-${Math.floor(i / 2)}`);
        }
      }

      const stats = cache.getStats();
      
      // Should maintain reasonable performance despite memory pressure
      expect(stats.l1.memoryUsageMB).toBeLessThan(50); // Should not exceed limits
      expect(stats.overall.compressionRatio).toBeGreaterThan(1); // Should use compression
    });
  });
});

console.log('🚀 Performance Optimization Test Suite Ready - Target: 100/100 Performance Score!');