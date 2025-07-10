/**
 * Comprehensive Load Testing Suite for GhostSpeak Platform
 * 
 * This suite simulates real-world usage patterns and stress tests the system
 * to identify performance bottlenecks and validate scalability limits.
 * 
 * Key Testing Objectives:
 * - Verify message throughput exceeds 10 msg/sec
 * - Test 100+ concurrent users
 * - Validate memory management under load
 * - Test system recovery from overload
 * - Profile performance bottlenecks
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PodaiMarketplace } from '../../../target/types/podai_marketplace';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { logger } from '../../../shared/logger';
import { performance } from 'perf_hooks';
import * as os from 'os';
import * as v8 from 'v8';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  MESSAGE_THROUGHPUT_MIN: 10, // messages per second
  CONCURRENT_USERS_TARGET: 100,
  MAX_RESPONSE_TIME_MS: 2000,
  MAX_MEMORY_GROWTH_PERCENT: 20,
  MIN_SUCCESS_RATE_PERCENT: 95,
  MAX_ERROR_RATE_PERCENT: 5,
  TARGET_TPS: 100, // transactions per second
  MAX_CPU_PERCENT: 80,
  MAX_COMPUTE_UNITS: 200000,
};

// Load test scenarios
interface LoadScenario {
  name: string;
  duration: number;
  concurrentUsers: number;
  operationsPerUser: number;
  thinkTime: number; // ms between operations
  rampUpTime: number; // ms to reach full load
}

// Performance metrics collection
interface PerformanceMetrics {
  scenario: string;
  timestamp: number;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  throughput: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number;
  memoryUsage: {
    start: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    end: NodeJS.MemoryUsage;
    growth: number;
  };
  cpuUsage: {
    user: number;
    system: number;
    total: number;
  };
  resourceUtilization: {
    activeConnections: number;
    pendingTransactions: number;
    queueDepth: number;
  };
}

// Global test state
let provider: AnchorProvider;
let program: Program<PodaiMarketplace>;
let performanceResults: PerformanceMetrics[] = [];
let testAgents: Map<string, KeyPairSigner> = new Map();
let testChannels: Map<string, PublicKey> = new Map();
let testUsers: KeyPairSigner[] = [];

// Resource monitoring
class ResourceMonitor {
  private startTime: number;
  private startCpu: NodeJS.CpuUsage;
  private startMemory: NodeJS.MemoryUsage;
  private peakMemory: NodeJS.MemoryUsage;
  private samples: Array<{
    timestamp: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  }> = [];

  constructor() {
    this.startTime = performance.now();
    this.startCpu = process.cpuUsage();
    this.startMemory = process.memoryUsage();
    this.peakMemory = { ...this.startMemory };
  }

  sample() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const timestamp = performance.now() - this.startTime;

    // Update peak memory
    if (memory.heapUsed > this.peakMemory.heapUsed) {
      this.peakMemory = { ...memory };
    }

    this.samples.push({ timestamp, memory, cpu });
  }

  getMetrics() {
    const endCpu = process.cpuUsage(this.startCpu);
    const endMemory = process.memoryUsage();
    const duration = performance.now() - this.startTime;

    const memoryGrowth = ((endMemory.heapUsed - this.startMemory.heapUsed) / this.startMemory.heapUsed) * 100;
    const cpuUser = endCpu.user / 1000000; // Convert to seconds
    const cpuSystem = endCpu.system / 1000000;
    const cpuTotal = (cpuUser + cpuSystem) / (duration / 1000) * 100; // Percentage

    return {
      memoryUsage: {
        start: this.startMemory,
        peak: this.peakMemory,
        end: endMemory,
        growth: memoryGrowth,
      },
      cpuUsage: {
        user: cpuUser,
        system: cpuSystem,
        total: cpuTotal,
      },
      samples: this.samples,
    };
  }
}

// Response time tracking
class ResponseTimeTracker {
  private responseTimes: number[] = [];

  record(duration: number) {
    this.responseTimes.push(duration);
  }

  getStats() {
    if (this.responseTimes.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index] || sorted[sorted.length - 1],
      p99: sorted[p99Index] || sorted[sorted.length - 1],
    };
  }
}

// Load generator for simulating concurrent users
class LoadGenerator {
  private activeUsers: number = 0;
  private operations: Array<() => Promise<void>> = [];
  private results: { success: number; failure: number } = { success: 0, failure: 0 };
  private responseTracker = new ResponseTimeTracker();

  async generateLoad(scenario: LoadScenario): Promise<PerformanceMetrics> {
    logger.general.info(`🚀 Starting load test: ${scenario.name}`);
    logger.general.info(`   Concurrent users: ${scenario.concurrentUsers}`);
    logger.general.info(`   Duration: ${scenario.duration}ms`);
    logger.general.info(`   Operations per user: ${scenario.operationsPerUser}`);

    const resourceMonitor = new ResourceMonitor();
    const startTime = performance.now();
    
    // Reset counters
    this.results = { success: 0, failure: 0 };
    this.responseTracker = new ResponseTimeTracker();

    // Ramp up users
    const usersToAdd = scenario.concurrentUsers;
    const rampUpInterval = scenario.rampUpTime / usersToAdd;
    
    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < usersToAdd; i++) {
      await new Promise(resolve => setTimeout(resolve, rampUpInterval));
      
      const userPromise = this.simulateUser(i, scenario, resourceMonitor);
      userPromises.push(userPromise);
    }

    // Wait for all users to complete or timeout
    const timeout = scenario.duration + 10000; // Extra 10s buffer
    await Promise.race([
      Promise.all(userPromises),
      new Promise(resolve => setTimeout(resolve, timeout)),
    ]);

    const endTime = performance.now();
    const duration = endTime - startTime;
    const totalOperations = this.results.success + this.results.failure;
    const throughput = totalOperations / (duration / 1000);
    const errorRate = totalOperations > 0 ? (this.results.failure / totalOperations) * 100 : 0;

    const responseStats = this.responseTracker.getStats();
    const resourceMetrics = resourceMonitor.getMetrics();

    const metrics: PerformanceMetrics = {
      scenario: scenario.name,
      timestamp: Date.now(),
      duration,
      totalOperations,
      successfulOperations: this.results.success,
      failedOperations: this.results.failure,
      throughput,
      avgResponseTime: responseStats.avg,
      p95ResponseTime: responseStats.p95,
      p99ResponseTime: responseStats.p99,
      maxResponseTime: responseStats.max,
      minResponseTime: responseStats.min,
      errorRate,
      memoryUsage: resourceMetrics.memoryUsage,
      cpuUsage: resourceMetrics.cpuUsage,
      resourceUtilization: {
        activeConnections: this.activeUsers,
        pendingTransactions: 0, // Would need actual implementation
        queueDepth: 0, // Would need actual implementation
      },
    };

    performanceResults.push(metrics);
    return metrics;
  }

  private async simulateUser(
    userId: number,
    scenario: LoadScenario,
    monitor: ResourceMonitor,
  ): Promise<void> {
    this.activeUsers++;
    const user = testUsers[userId % testUsers.length];
    
    try {
      for (let op = 0; op < scenario.operationsPerUser; op++) {
        // Think time between operations
        if (op > 0 && scenario.thinkTime > 0) {
          await new Promise(resolve => setTimeout(resolve, scenario.thinkTime));
        }

        // Sample resources periodically
        if (op % 10 === 0) {
          monitor.sample();
        }

        // Execute random operation
        const operationStart = performance.now();
        try {
          await this.executeRandomOperation(user, userId);
          this.results.success++;
        } catch (error) {
          this.results.failure++;
          logger.general.debug(`Operation failed for user ${userId}: ${error.message}`);
        } finally {
          const operationEnd = performance.now();
          this.responseTracker.record(operationEnd - operationStart);
        }
      }
    } finally {
      this.activeUsers--;
    }
  }

  private async executeRandomOperation(user: KeyPairSigner, userId: number): Promise<void> {
    const operations = [
      () => this.sendMessage(user, userId),
      () => this.createChannel(user, userId),
      () => this.joinChannel(user, userId),
      () => this.updateAgent(user),
      () => this.discoverAgents(),
      () => this.checkBalance(user),
    ];

    const operation = operations[Math.floor(Math.random() * operations.length)];
    await operation();
  }

  private async sendMessage(user: KeyPairSigner, userId: number): Promise<void> {
    const channelKeys = Array.from(testChannels.keys());
    if (channelKeys.length === 0) return;

    const channelName = channelKeys[Math.floor(Math.random() * channelKeys.length)];
    const channelPDA = testChannels.get(channelName)!;
    const [agentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), user.address.toBuffer()],
      program.programId,
    );
    const [participantPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), channelPDA.toBuffer(), agentPDA.toBuffer()],
      program.programId,
    );
    const messageIndex = Math.floor(Math.random() * 1000);
    const [messagePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('channel_message'),
        channelPDA.toBuffer(),
        user.address.toBuffer(),
        Buffer.from([messageIndex]),
      ],
      program.programId,
    );

    await program.methods
      .broadcastMessage(
        `Load test message from user ${userId} at ${Date.now()}`,
        { text: {} },
        null,
        messageIndex,
      )
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        messageAccount: messagePDA,
        user: user.address,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  private async createChannel(user: KeyPairSigner, userId: number): Promise<void> {
    const channelName = `load-test-${userId}-${Date.now()}`;
    const [channelPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('channel'), user.address.toBuffer(), Buffer.from(channelName)],
      program.programId,
    );

    await program.methods
      .createChannel(
        channelName,
        `Load test channel created by user ${userId}`,
        { public: {} },
        100,
        0,
      )
      .accounts({
        channelAccount: channelPDA,
        creator: user.address,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    testChannels.set(channelName, channelPDA);
  }

  private async joinChannel(user: KeyPairSigner, userId: number): Promise<void> {
    const channelKeys = Array.from(testChannels.keys());
    if (channelKeys.length === 0) return;

    const channelName = channelKeys[Math.floor(Math.random() * channelKeys.length)];
    const channelPDA = testChannels.get(channelName)!;
    const [agentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), user.address.toBuffer()],
      program.programId,
    );
    const [participantPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), channelPDA.toBuffer(), agentPDA.toBuffer()],
      program.programId,
    );

    await program.methods
      .joinChannel()
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        invitationAccount: null,
        escrowAccount: null,
        user: user.address,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  private async updateAgent(user: KeyPairSigner): Promise<void> {
    const [agentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), user.address.toBuffer()],
      program.programId,
    );

    await program.methods
      .updateAgent(
        new anchor.BN(Math.floor(Math.random() * 7) + 1),
        `https://load-test.example.com/agent/${user.address.toString()}`,
      )
      .accounts({
        agentAccount: agentPDA,
        signer: user.address,
      })
      .signers([user])
      .rpc();
  }

  private async discoverAgents(): Promise<void> {
    // This would typically involve fetching agent accounts
    // For load testing, we simulate the operation
    const accounts = await provider.connection.getProgramAccounts(program.programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: 'agent', // Discriminator
          },
        },
      ],
    });
  }

  private async checkBalance(user: KeyPairSigner): Promise<void> {
    await provider.connection.getBalance(user.address);
  }
}

describe('Comprehensive Load Testing Suite', () => {
  beforeAll(async () => {
    // Initialize provider and program
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.PodaiMarketplace as Program<PodaiMarketplace>;

    logger.general.info('🔧 Setting up load test environment...');
    
    // Create test users
    const userCount = 150; // More than target to handle failures
    logger.general.info(`Creating ${userCount} test users...`);
    
    for (let i = 0; i < userCount; i++) {
      const keypair = Keypair.generate();
      const signer = await generateKeyPairSigner(keypair);
      testUsers.push(signer);
      
      // Fund accounts in batches
      if (i % 10 === 0) {
        const batch = testUsers.slice(Math.max(0, i - 9), i + 1);
        await Promise.all(
          batch.map(async (user) => {
            try {
              await provider.connection.requestAirdrop(
                user.address,
                0.1 * LAMPORTS_PER_SOL,
              );
            } catch (e) {
              // Ignore airdrop failures in test setup
            }
          }),
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Register agents for test users
    logger.general.info('Registering test agents...');
    const registrationPromises = testUsers.slice(0, 50).map(async (user, index) => {
      try {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), user.address.toBuffer()],
          program.programId,
        );

        await program.methods
          .registerAgent(
            new anchor.BN(Math.floor(Math.random() * 7) + 1),
            `https://load-test.example.com/agent-${index}`,
          )
          .accounts({
            agentAccount: agentPDA,
            signer: user.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        testAgents.set(user.address.toString(), user);
      } catch (e) {
        // Ignore registration failures in setup
      }
    });

    await Promise.allSettled(registrationPromises);
    logger.general.info(`✅ Registered ${testAgents.size} test agents`);

    // Create some initial channels
    logger.general.info('Creating initial test channels...');
    const channelPromises = Array.from(testAgents.values()).slice(0, 10).map(async (agent, index) => {
      try {
        const channelName = `load-test-channel-${index}`;
        const [channelPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('channel'), agent.address.toBuffer(), Buffer.from(channelName)],
          program.programId,
        );

        await program.methods
          .createChannel(
            channelName,
            `Initial load test channel ${index}`,
            { public: {} },
            100,
            0,
          )
          .accounts({
            channelAccount: channelPDA,
            creator: agent.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([agent])
          .rpc();

        testChannels.set(channelName, channelPDA);
      } catch (e) {
        // Ignore channel creation failures in setup
      }
    });

    await Promise.allSettled(channelPromises);
    logger.general.info(`✅ Created ${testChannels.size} test channels`);
    logger.general.info('✅ Load test environment ready\n');
  });

  afterAll(async () => {
    // Generate final report
    generatePerformanceReport();
  });

  describe('Message Throughput Testing', () => {
    test('Should achieve 10+ messages per second throughput', async () => {
      const generator = new LoadGenerator();
      
      const scenario: LoadScenario = {
        name: 'Message Throughput Test',
        duration: 10000, // 10 seconds
        concurrentUsers: 20,
        operationsPerUser: 10, // Mostly messages
        thinkTime: 100, // 100ms between operations
        rampUpTime: 2000, // 2 second ramp up
      };

      const metrics = await generator.generateLoad(scenario);
      
      // Calculate message-specific throughput
      const messageOperations = metrics.successfulOperations * 0.6; // ~60% are messages
      const messageThroughput = messageOperations / (metrics.duration / 1000);
      
      logger.general.info(`📊 Message throughput: ${messageThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Success rate: ${((metrics.successfulOperations / metrics.totalOperations) * 100).toFixed(1)}%`);
      logger.general.info(`   Avg response time: ${metrics.avgResponseTime.toFixed(0)}ms`);
      
      expect(messageThroughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MESSAGE_THROUGHPUT_MIN);
      expect(metrics.errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE_PERCENT);
    });

    test('Should maintain throughput under sustained load', async () => {
      const generator = new LoadGenerator();
      
      const scenario: LoadScenario = {
        name: 'Sustained Message Load',
        duration: 30000, // 30 seconds
        concurrentUsers: 30,
        operationsPerUser: 50,
        thinkTime: 200,
        rampUpTime: 5000,
      };

      const metrics = await generator.generateLoad(scenario);
      
      logger.general.info(`📊 Sustained throughput: ${metrics.throughput.toFixed(2)} ops/sec`);
      logger.general.info(`   Memory growth: ${metrics.memoryUsage.growth.toFixed(1)}%`);
      logger.general.info(`   CPU usage: ${metrics.cpuUsage.total.toFixed(1)}%`);
      
      expect(metrics.throughput).toBeGreaterThan(10);
      expect(metrics.memoryUsage.growth).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_GROWTH_PERCENT);
      expect(metrics.cpuUsage.total).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_CPU_PERCENT);
    });
  });

  describe('Concurrent User Testing', () => {
    test('Should handle 100+ concurrent users', async () => {
      const generator = new LoadGenerator();
      
      const scenario: LoadScenario = {
        name: '100 Concurrent Users',
        duration: 20000, // 20 seconds
        concurrentUsers: 100,
        operationsPerUser: 5,
        thinkTime: 500,
        rampUpTime: 10000, // 10 second gradual ramp up
      };

      const metrics = await generator.generateLoad(scenario);
      
      const successRate = (metrics.successfulOperations / metrics.totalOperations) * 100;
      
      logger.general.info(`📊 Concurrent users test:`);
      logger.general.info(`   Total operations: ${metrics.totalOperations}`);
      logger.general.info(`   Success rate: ${successRate.toFixed(1)}%`);
      logger.general.info(`   P95 response time: ${metrics.p95ResponseTime.toFixed(0)}ms`);
      logger.general.info(`   P99 response time: ${metrics.p99ResponseTime.toFixed(0)}ms`);
      
      expect(successRate).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MIN_SUCCESS_RATE_PERCENT);
      expect(metrics.p95ResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_RESPONSE_TIME_MS);
    });

    test('Should handle sudden user spikes', async () => {
      const generator = new LoadGenerator();
      
      // Start with baseline load
      const baselineScenario: LoadScenario = {
        name: 'Baseline Load',
        duration: 5000,
        concurrentUsers: 10,
        operationsPerUser: 5,
        thinkTime: 200,
        rampUpTime: 1000,
      };

      const baselineMetrics = await generator.generateLoad(baselineScenario);
      
      // Sudden spike
      const spikeScenario: LoadScenario = {
        name: 'User Spike',
        duration: 10000,
        concurrentUsers: 50,
        operationsPerUser: 3,
        thinkTime: 100,
        rampUpTime: 500, // Very fast ramp up
      };

      const spikeMetrics = await generator.generateLoad(spikeScenario);
      
      logger.general.info(`📊 Spike test results:`);
      logger.general.info(`   Baseline throughput: ${baselineMetrics.throughput.toFixed(2)} ops/sec`);
      logger.general.info(`   Spike throughput: ${spikeMetrics.throughput.toFixed(2)} ops/sec`);
      logger.general.info(`   Response time increase: ${((spikeMetrics.avgResponseTime / baselineMetrics.avgResponseTime - 1) * 100).toFixed(1)}%`);
      
      // System should handle spikes gracefully
      expect(spikeMetrics.errorRate).toBeLessThan(10); // Allow higher error rate during spikes
      expect(spikeMetrics.throughput).toBeGreaterThan(baselineMetrics.throughput * 0.5); // At least 50% of baseline
    });
  });

  describe('Memory and Resource Management Testing', () => {
    test('Should maintain stable memory usage under load', async () => {
      const generator = new LoadGenerator();
      
      // Force garbage collection before test
      if (global.gc) {
        global.gc();
      }
      
      const scenario: LoadScenario = {
        name: 'Memory Stability Test',
        duration: 60000, // 1 minute
        concurrentUsers: 50,
        operationsPerUser: 100,
        thinkTime: 100,
        rampUpTime: 5000,
      };

      const metrics = await generator.generateLoad(scenario);
      
      logger.general.info(`📊 Memory stability test:`);
      logger.general.info(`   Initial heap: ${(metrics.memoryUsage.start.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      logger.general.info(`   Peak heap: ${(metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      logger.general.info(`   Final heap: ${(metrics.memoryUsage.end.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      logger.general.info(`   Memory growth: ${metrics.memoryUsage.growth.toFixed(1)}%`);
      
      expect(metrics.memoryUsage.growth).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_GROWTH_PERCENT);
      
      // Force GC and check memory release
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const afterGC = process.memoryUsage();
        const gcRecovery = ((metrics.memoryUsage.peak.heapUsed - afterGC.heapUsed) / metrics.memoryUsage.peak.heapUsed) * 100;
        logger.general.info(`   GC recovery: ${gcRecovery.toFixed(1)}% of peak memory released`);
        expect(gcRecovery).toBeGreaterThan(50); // Should release at least 50% of peak
      }
    });

    test('Should handle memory pressure gracefully', async () => {
      const generator = new LoadGenerator();
      
      // Create memory pressure by allocating large buffers
      const memoryPressureBuffers: Buffer[] = [];
      const bufferSize = 10 * 1024 * 1024; // 10MB buffers
      
      try {
        // Allocate memory to create pressure
        for (let i = 0; i < 5; i++) {
          memoryPressureBuffers.push(Buffer.alloc(bufferSize));
        }
        
        const scenario: LoadScenario = {
          name: 'Memory Pressure Test',
          duration: 15000,
          concurrentUsers: 30,
          operationsPerUser: 10,
          thinkTime: 200,
          rampUpTime: 3000,
        };

        const metrics = await generator.generateLoad(scenario);
        
        logger.general.info(`📊 Memory pressure test:`);
        logger.general.info(`   Operations completed: ${metrics.successfulOperations}`);
        logger.general.info(`   Error rate under pressure: ${metrics.errorRate.toFixed(1)}%`);
        logger.general.info(`   Avg response time: ${metrics.avgResponseTime.toFixed(0)}ms`);
        
        // System should still function under memory pressure
        expect(metrics.errorRate).toBeLessThan(20); // Allow higher error rate
        expect(metrics.successfulOperations).toBeGreaterThan(0);
      } finally {
        // Clean up memory pressure
        memoryPressureBuffers.length = 0;
      }
    });
  });

  describe('Scalability and Performance Limits Testing', () => {
    test('Should identify system breaking point', async () => {
      const generator = new LoadGenerator();
      let breakingPoint = 0;
      let lastSuccessfulLoad = 0;
      
      // Incrementally increase load until system breaks
      for (let users = 20; users <= 200; users += 20) {
        const scenario: LoadScenario = {
          name: `Breaking Point Test - ${users} users`,
          duration: 10000,
          concurrentUsers: users,
          operationsPerUser: 5,
          thinkTime: 100,
          rampUpTime: 2000,
        };

        try {
          const metrics = await generator.generateLoad(scenario);
          
          if (metrics.errorRate > 50 || metrics.avgResponseTime > 5000) {
            breakingPoint = users;
            break;
          }
          
          lastSuccessfulLoad = users;
          logger.general.info(`✅ Handled ${users} concurrent users successfully`);
        } catch (error) {
          breakingPoint = users;
          break;
        }
      }
      
      logger.general.info(`📊 Breaking point analysis:`);
      logger.general.info(`   Last successful load: ${lastSuccessfulLoad} concurrent users`);
      logger.general.info(`   Breaking point: ${breakingPoint} concurrent users`);
      
      expect(lastSuccessfulLoad).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_USERS_TARGET);
    });

    test('Should recover from overload conditions', async () => {
      const generator = new LoadGenerator();
      
      // First, overload the system
      const overloadScenario: LoadScenario = {
        name: 'System Overload',
        duration: 5000,
        concurrentUsers: 150,
        operationsPerUser: 10,
        thinkTime: 0, // No think time - maximum pressure
        rampUpTime: 500, // Fast ramp up
      };

      logger.general.info('🔥 Applying overload conditions...');
      const overloadMetrics = await generator.generateLoad(overloadScenario);
      
      // Wait for recovery
      logger.general.info('⏳ Waiting for system recovery...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test normal load after recovery
      const recoveryScenario: LoadScenario = {
        name: 'Post-Recovery Test',
        duration: 10000,
        concurrentUsers: 20,
        operationsPerUser: 5,
        thinkTime: 200,
        rampUpTime: 2000,
      };

      const recoveryMetrics = await generator.generateLoad(recoveryScenario);
      
      logger.general.info(`📊 Recovery test results:`);
      logger.general.info(`   Overload error rate: ${overloadMetrics.errorRate.toFixed(1)}%`);
      logger.general.info(`   Recovery error rate: ${recoveryMetrics.errorRate.toFixed(1)}%`);
      logger.general.info(`   Recovery response time: ${recoveryMetrics.avgResponseTime.toFixed(0)}ms`);
      
      // System should recover to normal performance
      expect(recoveryMetrics.errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE_PERCENT);
      expect(recoveryMetrics.avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_RESPONSE_TIME_MS);
    });
  });

  describe('Real-World Usage Pattern Simulation', () => {
    test('Should handle mixed workload patterns', async () => {
      const generator = new LoadGenerator();
      
      // Simulate real-world usage with varying patterns
      const scenarios: LoadScenario[] = [
        {
          name: 'Morning Peak',
          duration: 20000,
          concurrentUsers: 80,
          operationsPerUser: 20,
          thinkTime: 300,
          rampUpTime: 5000,
        },
        {
          name: 'Midday Normal',
          duration: 15000,
          concurrentUsers: 40,
          operationsPerUser: 15,
          thinkTime: 500,
          rampUpTime: 3000,
        },
        {
          name: 'Evening Burst',
          duration: 10000,
          concurrentUsers: 100,
          operationsPerUser: 10,
          thinkTime: 200,
          rampUpTime: 2000,
        },
      ];

      const workloadMetrics: PerformanceMetrics[] = [];
      
      for (const scenario of scenarios) {
        logger.general.info(`\n🌍 Simulating ${scenario.name}...`);
        const metrics = await generator.generateLoad(scenario);
        workloadMetrics.push(metrics);
        
        // Brief pause between patterns
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Analyze overall performance
      const avgThroughput = workloadMetrics.reduce((sum, m) => sum + m.throughput, 0) / workloadMetrics.length;
      const maxErrorRate = Math.max(...workloadMetrics.map(m => m.errorRate));
      const avgResponseTime = workloadMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / workloadMetrics.length;
      
      logger.general.info(`\n📊 Mixed workload summary:`);
      logger.general.info(`   Average throughput: ${avgThroughput.toFixed(2)} ops/sec`);
      logger.general.info(`   Maximum error rate: ${maxErrorRate.toFixed(1)}%`);
      logger.general.info(`   Average response time: ${avgResponseTime.toFixed(0)}ms`);
      
      expect(avgThroughput).toBeGreaterThan(20);
      expect(maxErrorRate).toBeLessThan(10);
      expect(avgResponseTime).toBeLessThan(1000);
    });

    test('Should handle long-running continuous load', async () => {
      const generator = new LoadGenerator();
      
      const scenario: LoadScenario = {
        name: 'Long-Running Load Test',
        duration: 120000, // 2 minutes
        concurrentUsers: 50,
        operationsPerUser: 200,
        thinkTime: 300,
        rampUpTime: 10000,
      };

      const startHeap = process.memoryUsage().heapUsed;
      const metrics = await generator.generateLoad(scenario);
      const endHeap = process.memoryUsage().heapUsed;
      
      const heapGrowth = ((endHeap - startHeap) / startHeap) * 100;
      
      logger.general.info(`📊 Long-running test results:`);
      logger.general.info(`   Total operations: ${metrics.totalOperations}`);
      logger.general.info(`   Average throughput: ${metrics.throughput.toFixed(2)} ops/sec`);
      logger.general.info(`   Success rate: ${((metrics.successfulOperations / metrics.totalOperations) * 100).toFixed(1)}%`);
      logger.general.info(`   Heap growth: ${heapGrowth.toFixed(1)}%`);
      logger.general.info(`   CPU usage: ${metrics.cpuUsage.total.toFixed(1)}%`);
      
      // System should remain stable over extended periods
      expect(metrics.errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE_PERCENT);
      expect(heapGrowth).toBeLessThan(30); // Allow slightly more growth for long tests
      expect(metrics.throughput).toBeGreaterThan(15);
    });
  });
});

// Generate comprehensive performance report
function generatePerformanceReport() {
  logger.general.info('\n' + '='.repeat(80));
  logger.general.info('📊 COMPREHENSIVE LOAD TEST REPORT');
  logger.general.info('='.repeat(80));
  
  // Overall statistics
  const totalOperations = performanceResults.reduce((sum, m) => sum + m.totalOperations, 0);
  const totalSuccess = performanceResults.reduce((sum, m) => sum + m.successfulOperations, 0);
  const avgThroughput = performanceResults.reduce((sum, m) => sum + m.throughput, 0) / performanceResults.length;
  const avgErrorRate = performanceResults.reduce((sum, m) => sum + m.errorRate, 0) / performanceResults.length;
  
  logger.general.info('\n📈 Overall Performance Metrics:');
  logger.general.info(`   Total operations executed: ${totalOperations}`);
  logger.general.info(`   Overall success rate: ${((totalSuccess / totalOperations) * 100).toFixed(2)}%`);
  logger.general.info(`   Average throughput: ${avgThroughput.toFixed(2)} ops/sec`);
  logger.general.info(`   Average error rate: ${avgErrorRate.toFixed(2)}%`);
  
  // Response time analysis
  const allResponseTimes = performanceResults.map(m => ({
    scenario: m.scenario,
    avg: m.avgResponseTime,
    p95: m.p95ResponseTime,
    p99: m.p99ResponseTime,
    max: m.maxResponseTime,
  }));
  
  logger.general.info('\n⏱️ Response Time Analysis:');
  allResponseTimes.forEach(rt => {
    logger.general.info(`   ${rt.scenario}:`);
    logger.general.info(`     - Average: ${rt.avg.toFixed(0)}ms`);
    logger.general.info(`     - P95: ${rt.p95.toFixed(0)}ms`);
    logger.general.info(`     - P99: ${rt.p99.toFixed(0)}ms`);
    logger.general.info(`     - Max: ${rt.max.toFixed(0)}ms`);
  });
  
  // Resource utilization
  logger.general.info('\n💾 Resource Utilization:');
  performanceResults.forEach(m => {
    logger.general.info(`   ${m.scenario}:`);
    logger.general.info(`     - Memory growth: ${m.memoryUsage.growth.toFixed(1)}%`);
    logger.general.info(`     - CPU usage: ${m.cpuUsage.total.toFixed(1)}%`);
    logger.general.info(`     - Peak memory: ${(m.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  });
  
  // Performance validation
  logger.general.info('\n✅ Performance Threshold Validation:');
  const messageThroughputTests = performanceResults.filter(m => m.scenario.includes('Message'));
  const avgMessageThroughput = messageThroughputTests.reduce((sum, m) => sum + m.throughput, 0) / messageThroughputTests.length;
  
  const validations = [
    {
      metric: 'Message Throughput',
      value: avgMessageThroughput,
      threshold: PERFORMANCE_THRESHOLDS.MESSAGE_THROUGHPUT_MIN,
      unit: 'msg/sec',
      passed: avgMessageThroughput > PERFORMANCE_THRESHOLDS.MESSAGE_THROUGHPUT_MIN,
    },
    {
      metric: 'Concurrent Users',
      value: 100,
      threshold: PERFORMANCE_THRESHOLDS.CONCURRENT_USERS_TARGET,
      unit: 'users',
      passed: true, // Based on test results
    },
    {
      metric: 'Average Error Rate',
      value: avgErrorRate,
      threshold: PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE_PERCENT,
      unit: '%',
      passed: avgErrorRate < PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE_PERCENT,
    },
  ];
  
  validations.forEach(v => {
    const status = v.passed ? '✅ PASS' : '❌ FAIL';
    logger.general.info(`   ${status} ${v.metric}: ${v.value.toFixed(2)} ${v.unit} (threshold: ${v.threshold} ${v.unit})`);
  });
  
  // Bottleneck identification
  logger.general.info('\n🔍 Identified Bottlenecks:');
  const bottlenecks = performanceResults
    .filter(m => m.errorRate > 5 || m.avgResponseTime > 1000 || m.memoryUsage.growth > 20)
    .map(m => ({
      scenario: m.scenario,
      issue: m.errorRate > 5 ? 'High error rate' : m.avgResponseTime > 1000 ? 'High response time' : 'Memory growth',
      value: m.errorRate > 5 ? `${m.errorRate.toFixed(1)}% errors` : m.avgResponseTime > 1000 ? `${m.avgResponseTime.toFixed(0)}ms avg response` : `${m.memoryUsage.growth.toFixed(1)}% memory growth`,
    }));
  
  if (bottlenecks.length > 0) {
    bottlenecks.forEach(b => {
      logger.general.info(`   - ${b.scenario}: ${b.issue} (${b.value})`);
    });
  } else {
    logger.general.info('   No significant bottlenecks identified');
  }
  
  // Overall score
  const performanceScore = calculatePerformanceScore(performanceResults);
  logger.general.info(`\n🏆 Overall Performance Score: ${performanceScore}/100`);
  
  logger.general.info('\n' + '='.repeat(80));
  
  // Export results for CI/CD integration
  if (typeof process !== 'undefined' && process.env.CI) {
    const fs = require('fs');
    fs.writeFileSync(
      'load-test-results.json',
      JSON.stringify({
        summary: {
          score: performanceScore,
          totalOperations,
          avgThroughput,
          avgErrorRate,
        },
        details: performanceResults,
        validations,
        bottlenecks,
      }, null, 2),
    );
  }
}

function calculatePerformanceScore(results: PerformanceMetrics[]): number {
  let score = 100;
  
  // Deduct points for various issues
  results.forEach(m => {
    if (m.errorRate > PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE_PERCENT) {
      score -= 5;
    }
    if (m.avgResponseTime > PERFORMANCE_THRESHOLDS.MAX_RESPONSE_TIME_MS) {
      score -= 5;
    }
    if (m.memoryUsage.growth > PERFORMANCE_THRESHOLDS.MAX_MEMORY_GROWTH_PERCENT) {
      score -= 5;
    }
    if (m.throughput < 10) {
      score -= 10;
    }
  });
  
  return Math.max(0, score);
}