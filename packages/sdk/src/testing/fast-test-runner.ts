/**
 * Fast Test Runner
 *
 * Ultra-fast test execution with memory optimization, connection pooling,
 * and intelligent resource management. Target: <10s test execution time.
 */

import { BankrunTestClient } from './bankrun-client';
import { PerformanceRpcClient } from '../rpc/connection-pool';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { performance } from 'perf_hooks';
import { logger } from '../../../../shared/logger';

/**
 * Test execution metrics
 */
interface TestExecutionMetrics {
  totalTime: number;
  testCount: number;
  successCount: number;
  failureCount: number;
  averageTestTime: number;
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
  };
  rpcMetrics: {
    totalRequests: number;
    cacheHits: number;
    averageResponseTime: number;
  };
}

/**
 * Fast test configuration
 */
interface FastTestConfig {
  maxConcurrency: number;
  memoryLimit: number; // MB
  timeoutPerTest: number; // ms
  cleanupInterval: number; // ms
  rpcEndpoints: string[];
  useCache: boolean;
  enableProfiling: boolean;
}

/**
 * Default fast test configuration
 */
const DEFAULT_FAST_TEST_CONFIG: FastTestConfig = {
  maxConcurrency: 10,
  memoryLimit: 100, // 100MB limit
  timeoutPerTest: 5000, // 5 seconds per test
  cleanupInterval: 1000, // Cleanup every 1 second
  rpcEndpoints: ['https://api.devnet.solana.com'],
  useCache: true,
  enableProfiling: false,
};

/**
 * Test case definition
 */
interface TestCase {
  name: string;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  test: (client: BankrunTestClient) => Promise<void>;
}

/**
 * Fast Test Runner optimized for speed and memory efficiency
 */
export class FastTestRunner {
  private config: FastTestConfig;
  private client: BankrunTestClient | null = null;
  private rpcClient: PerformanceRpcClient | null = null;
  private metrics: TestExecutionMetrics;
  private memoryMonitor: NodeJS.Timer | null = null;
  private cleanupTimer: NodeJS.Timer | null = null;
  private resourcePool: {
    keypairs: KeyPairSigner[];
    connections: any[];
  } = {
    keypairs: [],
    connections: [],
  };

  constructor(config: Partial<FastTestConfig> = {}) {
    this.config = { ...DEFAULT_FAST_TEST_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startMemoryMonitoring();
    this.startCleanupTimer();
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): TestExecutionMetrics {
    return {
      totalTime: 0,
      testCount: 0,
      successCount: 0,
      failureCount: 0,
      averageTestTime: 0,
      memoryUsage: {
        initial: process.memoryUsage(),
        peak: process.memoryUsage(),
        final: process.memoryUsage(),
      },
      rpcMetrics: {
        totalRequests: 0,
        cacheHits: 0,
        averageResponseTime: 0,
      },
    };
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!this.config.enableProfiling) return;

    this.memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();

      // Update peak memory usage
      if (usage.heapUsed > this.metrics.memoryUsage.peak.heapUsed) {
        this.metrics.memoryUsage.peak = usage;
      }

      // Force garbage collection if memory usage is high
      if (usage.heapUsed > this.config.memoryLimit * 1024 * 1024) {
        if (global.gc) {
          global.gc();
        }
      }
    }, 100);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform memory and resource cleanup
   */
  private performCleanup(): void {
    // Clear unused keypairs
    if (this.resourcePool.keypairs.length > 50) {
      this.resourcePool.keypairs.splice(
        0,
        this.resourcePool.keypairs.length - 25
      );
    }

    // Force garbage collection if available
    if (global.gc && this.config.enableProfiling) {
      global.gc();
    }
  }

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    // Initialize bankrun client
    this.client = new BankrunTestClient({
      programId: '4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385',
      computeUnitLimit: 1_400_000,
      preloadAccounts: [], // Minimize preloaded accounts for faster startup
    });

    await this.client.initialize();

    // Initialize performance RPC client
    this.rpcClient = new PerformanceRpcClient(this.config.rpcEndpoints, {
      maxConnections: this.config.maxConcurrency,
      cacheSize: this.config.useCache ? 1000 : 0,
      cacheTtl: 30000,
    });

    // Pre-generate keypairs for faster test execution
    await this.preGenerateKeypairs(20);

    logger.general.info(
      `✅ Fast test environment initialized in ${(performance.now() - startTime).toFixed(2)}ms`
    );
  }

  /**
   * Pre-generate keypairs for performance
   */
  private async preGenerateKeypairs(count: number): Promise<void> {
    const keypairs = [];

    for (let i = 0; i < count; i++) {
      const keypair = await generateKeyPairSigner();
      keypairs.push(keypair);
    }

    this.resourcePool.keypairs = keypairs;
  }

  /**
   * Get a keypair from the resource pool
   */
  getKeypair(): KeyPairSigner {
    if (this.resourcePool.keypairs.length === 0) {
      throw new Error('No keypairs available in resource pool');
    }
    return this.resourcePool.keypairs.pop()!;
  }

  /**
   * Return keypair to resource pool
   */
  returnKeypair(keypair: KeyPairSigner): void {
    this.resourcePool.keypairs.push(keypair);
  }

  /**
   * Run a single test case
   */
  async runTest(testCase: TestCase): Promise<{
    success: boolean;
    duration: number;
    error?: Error;
  }> {
    if (!this.client) {
      throw new Error('FastTestRunner not initialized');
    }

    const startTime = performance.now();
    const timeout = testCase.timeout || this.config.timeoutPerTest;

    try {
      // Setup if provided
      if (testCase.setup) {
        await testCase.setup();
      }

      // Run test with timeout
      await Promise.race([
        testCase.test(this.client),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        ),
      ]);

      // Teardown if provided
      if (testCase.teardown) {
        await testCase.teardown();
      }

      const duration = performance.now() - startTime;
      this.metrics.successCount++;

      return { success: true, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.metrics.failureCount++;

      return { success: false, duration, error: error as Error };
    } finally {
      this.metrics.testCount++;
      this.performCleanup();
    }
  }

  /**
   * Run multiple test cases with optimal concurrency
   */
  async runTests(testCases: TestCase[]): Promise<TestExecutionMetrics> {
    const startTime = performance.now();

    // Sort tests by priority
    const sortedTests = testCases.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return (
        priorityOrder[b.priority || 'normal'] -
        priorityOrder[a.priority || 'normal']
      );
    });

    // Execute tests with controlled concurrency
    const results = [];
    const concurrency = Math.min(this.config.maxConcurrency, testCases.length);

    for (let i = 0; i < sortedTests.length; i += concurrency) {
      const batch = sortedTests.slice(i, i + concurrency);
      const batchPromises = batch.map(testCase => this.runTest(testCase));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Update metrics
    this.metrics.totalTime = performance.now() - startTime;
    this.metrics.averageTestTime =
      this.metrics.totalTime / this.metrics.testCount;
    this.metrics.memoryUsage.final = process.memoryUsage();

    // Get RPC metrics if available
    if (this.rpcClient) {
      const rpcMetrics = this.rpcClient.getMetrics();
      this.metrics.rpcMetrics = {
        totalRequests: rpcMetrics.totalRequests,
        cacheHits: rpcMetrics.cacheHits,
        averageResponseTime: rpcMetrics.averageResponseTime,
      };
    }

    return { ...this.metrics };
  }

  /**
   * Run performance benchmark suite
   */
  async runBenchmark(): Promise<TestExecutionMetrics> {
    const benchmarkTests: TestCase[] = [
      {
        name: 'Fast Account Creation',
        priority: 'high',
        test: async client => {
          const keypairs = [];
          for (let i = 0; i < 5; i++) {
            const keypair = this.getKeypair();
            await client.requestAirdrop(keypair.address, 1000000000);
            keypairs.push(keypair);
          }

          // Verify all accounts are funded
          const balances = await Promise.all(
            keypairs.map(kp => client.getBalance(kp.address))
          );

          balances.forEach(balance => {
            if (balance === 0) throw new Error('Account not funded');
          });

          // Return keypairs to pool
          keypairs.forEach(kp => this.returnKeypair(kp));
        },
      },
      {
        name: 'Batch Transaction Processing',
        priority: 'high',
        test: async client => {
          const keypairs = [];
          for (let i = 0; i < 10; i++) {
            const keypair = this.getKeypair();
            await client.requestAirdrop(keypair.address, 2000000000);
            keypairs.push(keypair);
          }

          const transactions = [];
          for (let i = 0; i < 20; i++) {
            const fromKp = keypairs[i % keypairs.length];
            const toKp = keypairs[(i + 1) % keypairs.length];

            const tx = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: new PublicKey(fromKp.address),
                toPubkey: new PublicKey(toKp.address),
                lamports: 1000000,
              })
            );

            transactions.push({ transaction: tx, signers: [fromKp] });
          }

          const signatures = await client.batchExecute(transactions);
          if (signatures.length !== 20) {
            throw new Error('Batch execution failed');
          }

          // Return keypairs to pool
          keypairs.forEach(kp => this.returnKeypair(kp));
        },
      },
      {
        name: 'Memory Efficiency Test',
        priority: 'normal',
        test: async client => {
          const initialMemory = process.memoryUsage();

          // Create many temporary objects
          const objects = [];
          for (let i = 0; i < 1000; i++) {
            const keypair = this.getKeypair();
            objects.push({
              keypair,
              data: new Array(1000).fill(i),
              timestamp: Date.now(),
            });
          }

          // Process objects
          for (const obj of objects) {
            await client.getBalance(obj.keypair.address);
            this.returnKeypair(obj.keypair);
          }

          const finalMemory = process.memoryUsage();
          const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

          // Memory increase should be reasonable
          if (memoryIncrease > 20 * 1024 * 1024) {
            // 20MB
            throw new Error(`Memory usage too high: ${memoryIncrease} bytes`);
          }
        },
      },
      {
        name: 'Connection Pool Efficiency',
        priority: 'high',
        test: async () => {
          if (!this.rpcClient) return;

          const requests = [];
          for (let i = 0; i < 50; i++) {
            requests.push(
              this.rpcClient.execute('getSlot', [], { cacheable: true })
            );
          }

          const results = await Promise.all(requests);
          if (results.length !== 50) {
            throw new Error('Connection pool test failed');
          }
        },
      },
    ];

    return await this.runTests(benchmarkTests);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = [];

    report.push('🚀 FAST TEST RUNNER REPORT');
    report.push('='.repeat(50));
    report.push('');

    report.push(`Total Time: ${this.metrics.totalTime.toFixed(2)}ms`);
    report.push(`Test Count: ${this.metrics.testCount}`);
    report.push(
      `Success Rate: ${((this.metrics.successCount / this.metrics.testCount) * 100).toFixed(1)}%`
    );
    report.push(
      `Average Test Time: ${this.metrics.averageTestTime.toFixed(2)}ms`
    );
    report.push('');

    report.push('Memory Usage:');
    report.push(
      `  Initial: ${(this.metrics.memoryUsage.initial.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    report.push(
      `  Peak: ${(this.metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    report.push(
      `  Final: ${(this.metrics.memoryUsage.final.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    report.push('');

    report.push('RPC Metrics:');
    report.push(`  Total Requests: ${this.metrics.rpcMetrics.totalRequests}`);
    report.push(`  Cache Hits: ${this.metrics.rpcMetrics.cacheHits}`);
    report.push(
      `  Average Response Time: ${this.metrics.rpcMetrics.averageResponseTime.toFixed(2)}ms`
    );

    return report.join('\n');
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.client) {
      await this.client.close();
    }

    if (this.rpcClient) {
      await this.rpcClient.shutdown();
    }

    // Final cleanup
    this.resourcePool.keypairs = [];
    this.resourcePool.connections = [];

    logger.general.info('✅ Fast test runner shut down');
  }
}

/**
 * Helper function to create optimized test runner
 */
export function createFastTestRunner(
  config?: Partial<FastTestConfig>
): FastTestRunner {
  return new FastTestRunner(config);
}
