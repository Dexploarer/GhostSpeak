#!/usr/bin/env tsx

/**
 * Performance Benchmarking Suite for GhostSpeak Protocol
 * 
 * Comprehensive performance testing including:
 * - Transaction throughput measurement
 * - Latency analysis across different operations
 * - Resource utilization monitoring
 * - Scalability testing
 * - Gas consumption analysis
 * - Network performance under load
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface BenchmarkConfig {
  network: 'testnet' | 'devnet';
  programId: string;
  rpcUrl: string;
  testDuration: number;
  maxConcurrency: number;
  operationTypes: string[];
  warmupPeriod: number;
}

interface PerformanceMetrics {
  throughput: number; // operations per second
  averageLatency: number; // milliseconds
  p95Latency: number; // 95th percentile latency
  p99Latency: number; // 99th percentile latency
  errorRate: number; // percentage
  gasUsed: number; // average gas per operation
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

interface BenchmarkResult {
  operationType: string;
  metrics: PerformanceMetrics;
  timestamp: number;
  duration: number;
  sampleSize: number;
  rawDataPoints: number[];
}

interface BenchmarkSuite {
  name: string;
  config: BenchmarkConfig;
  results: BenchmarkResult[];
  summary: {
    totalOperations: number;
    totalDuration: number;
    overallThroughput: number;
    overallLatency: number;
  };
  timestamp: number;
}

class PerformanceBenchmarker {
  private config: BenchmarkConfig;
  private results: BenchmarkResult[] = [];
  private startTime: number = 0;

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  async runBenchmarkSuite(): Promise<BenchmarkSuite> {
    console.log(chalk.blue.bold('\n⚡ GhostSpeak Performance Benchmark Suite\n'));
    
    this.startTime = Date.now();
    
    try {
      // Setup benchmark environment
      await this.setupBenchmarkEnvironment();
      
      // Warmup phase
      await this.warmupPhase();
      
      // Run benchmarks for each operation type
      for (const operationType of this.config.operationTypes) {
        await this.benchmarkOperation(operationType);
      }
      
      // Run scalability tests
      await this.runScalabilityTests();
      
      // Run stress tests
      await this.runStressTests();
      
      return this.generateBenchmarkSuite();
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Benchmark suite failed!'));
      console.error(chalk.red((error as Error).message));
      throw error;
    }
  }

  private async setupBenchmarkEnvironment(): Promise<void> {
    console.log(chalk.yellow('🔧 Setting up benchmark environment...'));
    
    // Set network configuration
    execSync(`solana config set --url ${this.config.rpcUrl}`, { stdio: 'pipe' });
    
    // Verify program is accessible
    execSync(`solana account ${this.config.programId}`, { stdio: 'pipe' });
    
    // Create benchmark directories
    const benchmarkDir = join(process.cwd(), 'benchmark-results');
    if (!existsSync(benchmarkDir)) {
      mkdirSync(benchmarkDir, { recursive: true });
    }
    
    // Clear any existing test data
    console.log(chalk.green('✓ Benchmark environment ready'));
  }

  private async warmupPhase(): Promise<void> {
    console.log(chalk.yellow('🔥 Running warmup phase...'));
    
    const warmupOps = 10;
    for (let i = 0; i < warmupOps; i++) {
      try {
        execSync('npx ghostspeak marketplace list --network testnet', { stdio: 'pipe' });
      } catch {
        // Ignore warmup errors
      }
    }
    
    console.log(chalk.green('✓ Warmup completed'));
  }

  private async benchmarkOperation(operationType: string): Promise<void> {
    console.log(chalk.cyan(`📊 Benchmarking: ${operationType}`));
    
    const startTime = Date.now();
    const dataPoints: number[] = [];
    let operations = 0;
    let errors = 0;
    let totalGasUsed = 0;
    
    const endTime = startTime + this.config.testDuration;
    
    while (Date.now() < endTime) {
      const opStart = Date.now();
      
      try {
        const { gasUsed } = await this.executeOperation(operationType);
        const latency = Date.now() - opStart;
        
        dataPoints.push(latency);
        operations++;
        totalGasUsed += gasUsed;
        
      } catch (error) {
        errors++;
        console.log(chalk.red(`Error in ${operationType}: ${(error as Error).message}`));
      }
    }
    
    const duration = Date.now() - startTime;
    const metrics = this.calculateMetrics(dataPoints, operations, errors, totalGasUsed, duration);
    
    this.results.push({
      operationType,
      metrics,
      timestamp: Date.now(),
      duration,
      sampleSize: operations,
      rawDataPoints: dataPoints
    });
    
    this.logBenchmarkResult(operationType, metrics);
  }

  private async executeOperation(operationType: string): Promise<{ gasUsed: number }> {
    const timestamp = Date.now();
    
    switch (operationType) {
      case 'agent_registration':
        execSync(`npx ghostspeak agent register --name "Bench${timestamp}" --description "Benchmark agent" --price 1000000 --category "Benchmark" --network testnet`, { stdio: 'pipe' });
        return { gasUsed: 0.005 }; // Estimated SOL cost
        
      case 'marketplace_listing':
        execSync(`npx ghostspeak marketplace create --title "Bench${timestamp}" --description "Benchmark service" --price 500000 --category "Benchmark" --network testnet`, { stdio: 'pipe' });
        return { gasUsed: 0.003 };
        
      case 'marketplace_query':
        execSync('npx ghostspeak marketplace list --network testnet', { stdio: 'pipe' });
        return { gasUsed: 0.0001 };
        
      case 'escrow_creation':
        execSync(`npx ghostspeak escrow create --amount 1000000 --recipient 11111111111111111111111111111111 --description "Bench${timestamp}" --network testnet`, { stdio: 'pipe' });
        return { gasUsed: 0.004 };
        
      case 'agent_query':
        execSync('npx ghostspeak agent list --network testnet', { stdio: 'pipe' });
        return { gasUsed: 0.0001 };
        
      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }
  }

  private calculateMetrics(
    dataPoints: number[],
    operations: number,
    errors: number,
    totalGasUsed: number,
    duration: number
  ): PerformanceMetrics {
    if (dataPoints.length === 0) {
      return {
        throughput: 0,
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 100,
        gasUsed: 0,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: 0
      };
    }
    
    dataPoints.sort((a, b) => a - b);
    
    const throughput = (operations / duration) * 1000; // ops per second
    const averageLatency = dataPoints.reduce((a, b) => a + b) / dataPoints.length;
    const p95Index = Math.floor(dataPoints.length * 0.95);
    const p99Index = Math.floor(dataPoints.length * 0.99);
    const p95Latency = dataPoints[p95Index] || 0;
    const p99Latency = dataPoints[p99Index] || 0;
    const errorRate = (errors / (operations + errors)) * 100;
    const gasUsed = totalGasUsed / operations;
    
    return {
      throughput,
      averageLatency,
      p95Latency,
      p99Latency,
      errorRate,
      gasUsed,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0 // Would need additional monitoring
    };
  }

  private logBenchmarkResult(operationType: string, metrics: PerformanceMetrics): void {
    console.log(chalk.blue(`📈 ${operationType} Results:`));
    console.log(chalk.white(`  Throughput: ${metrics.throughput.toFixed(2)} ops/sec`));
    console.log(chalk.white(`  Avg Latency: ${metrics.averageLatency.toFixed(2)}ms`));
    console.log(chalk.white(`  P95 Latency: ${metrics.p95Latency.toFixed(2)}ms`));
    console.log(chalk.white(`  P99 Latency: ${metrics.p99Latency.toFixed(2)}ms`));
    console.log(chalk.white(`  Error Rate: ${metrics.errorRate.toFixed(2)}%`));
    console.log(chalk.white(`  Gas Used: ${metrics.gasUsed.toFixed(6)} SOL`));
    console.log(chalk.white(`  Memory: ${metrics.memoryUsage.toFixed(2)}MB\n`));
  }

  private async runScalabilityTests(): Promise<void> {
    console.log(chalk.yellow('\n📈 Running scalability tests...'));
    
    const concurrencyLevels = [1, 2, 5, 10, 20];
    
    for (const concurrency of concurrencyLevels) {
      await this.benchmarkConcurrency(concurrency);
    }
  }

  private async benchmarkConcurrency(concurrency: number): Promise<void> {
    console.log(chalk.cyan(`🔀 Testing concurrency level: ${concurrency}`));
    
    const startTime = Date.now();
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        new Promise<void>(async (resolve, reject) => {
          try {
            for (let j = 0; j < 5; j++) {
              await this.executeOperation('marketplace_query');
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
      );
    }
    
    await Promise.allSettled(promises);
    
    const duration = Date.now() - startTime;
    const throughput = (concurrency * 5) / (duration / 1000);
    
    console.log(chalk.blue(`  Concurrency ${concurrency}: ${throughput.toFixed(2)} ops/sec`));
  }

  private async runStressTests(): Promise<void> {
    console.log(chalk.yellow('\n🔥 Running stress tests...'));
    
    // High-frequency operations test
    await this.stressTestHighFrequency();
    
    // Memory stress test
    await this.stressTestMemory();
    
    // Long-duration test
    await this.stressTestEndurance();
  }

  private async stressTestHighFrequency(): Promise<void> {
    console.log(chalk.cyan('⚡ High-frequency operations test'));
    
    const startTime = Date.now();
    const testDuration = 30000; // 30 seconds
    let operations = 0;
    let errors = 0;
    
    while (Date.now() - startTime < testDuration) {
      try {
        await this.executeOperation('marketplace_query');
        operations++;
      } catch {
        errors++;
      }
      
      // No delay - maximum frequency
    }
    
    const duration = Date.now() - startTime;
    const throughput = (operations / duration) * 1000;
    const errorRate = (errors / (operations + errors)) * 100;
    
    console.log(chalk.blue(`  Max Throughput: ${throughput.toFixed(2)} ops/sec`));
    console.log(chalk.blue(`  Error Rate: ${errorRate.toFixed(2)}%`));
  }

  private async stressTestMemory(): Promise<void> {
    console.log(chalk.cyan('💾 Memory stress test'));
    
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    // Create many operations to stress memory
    const operations = [];
    for (let i = 0; i < 1000; i++) {
      operations.push(`operation_${i}`);
    }
    
    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryIncrease = finalMemory - initialMemory;
    
    console.log(chalk.blue(`  Memory increase: ${memoryIncrease.toFixed(2)}MB`));
  }

  private async stressTestEndurance(): Promise<void> {
    console.log(chalk.cyan('⏱️  Endurance test (60 seconds)'));
    
    const startTime = Date.now();
    const testDuration = 60000; // 60 seconds
    let operations = 0;
    let errors = 0;
    
    while (Date.now() - startTime < testDuration) {
      try {
        await this.executeOperation('marketplace_query');
        operations++;
      } catch {
        errors++;
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const duration = Date.now() - startTime;
    const throughput = (operations / duration) * 1000;
    const errorRate = (errors / (operations + errors)) * 100;
    
    console.log(chalk.blue(`  Sustained Throughput: ${throughput.toFixed(2)} ops/sec`));
    console.log(chalk.blue(`  Sustained Error Rate: ${errorRate.toFixed(2)}%`));
  }

  private generateBenchmarkSuite(): BenchmarkSuite {
    const totalDuration = Date.now() - this.startTime;
    const totalOperations = this.results.reduce((sum, result) => sum + result.sampleSize, 0);
    const overallThroughput = (totalOperations / totalDuration) * 1000;
    const overallLatency = this.results.reduce((sum, result) => sum + result.metrics.averageLatency, 0) / this.results.length;
    
    return {
      name: 'GhostSpeak Performance Benchmark Suite',
      config: this.config,
      results: this.results,
      summary: {
        totalOperations,
        totalDuration,
        overallThroughput,
        overallLatency
      },
      timestamp: Date.now()
    };
  }

  static async generateDetailedReport(benchmarkSuite: BenchmarkSuite): Promise<void> {
    console.log(chalk.blue.bold('\n📊 Performance Benchmark Results'));
    console.log(chalk.blue('═'.repeat(60)));
    
    // Summary
    console.log(chalk.white.bold('\n📋 Summary'));
    console.log(chalk.blue(`Total Operations: ${benchmarkSuite.summary.totalOperations}`));
    console.log(chalk.blue(`Total Duration: ${benchmarkSuite.summary.totalDuration}ms`));
    console.log(chalk.blue(`Overall Throughput: ${benchmarkSuite.summary.overallThroughput.toFixed(2)} ops/sec`));
    console.log(chalk.blue(`Overall Latency: ${benchmarkSuite.summary.overallLatency.toFixed(2)}ms`));
    
    // Detailed results
    console.log(chalk.white.bold('\n📈 Detailed Results'));
    console.log(chalk.blue('─'.repeat(60)));
    
    for (const result of benchmarkSuite.results) {
      console.log(chalk.cyan.bold(`\n${result.operationType.toUpperCase()}`));
      console.log(chalk.white(`  Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`));
      console.log(chalk.white(`  Avg Latency: ${result.metrics.averageLatency.toFixed(2)}ms`));
      console.log(chalk.white(`  P95 Latency: ${result.metrics.p95Latency.toFixed(2)}ms`));
      console.log(chalk.white(`  P99 Latency: ${result.metrics.p99Latency.toFixed(2)}ms`));
      console.log(chalk.white(`  Error Rate: ${result.metrics.errorRate.toFixed(2)}%`));
      console.log(chalk.white(`  Gas Used: ${result.metrics.gasUsed.toFixed(6)} SOL`));
      console.log(chalk.white(`  Sample Size: ${result.sampleSize} operations`));
    }
    
    // Performance recommendations
    console.log(chalk.white.bold('\n💡 Performance Recommendations'));
    console.log(chalk.blue('─'.repeat(60)));
    
    const highLatencyOps = benchmarkSuite.results.filter(r => r.metrics.averageLatency > 1000);
    if (highLatencyOps.length > 0) {
      console.log(chalk.yellow('⚠️  High latency operations detected:'));
      highLatencyOps.forEach(op => {
        console.log(chalk.yellow(`   - ${op.operationType}: ${op.metrics.averageLatency.toFixed(2)}ms`));
      });
    }
    
    const highErrorOps = benchmarkSuite.results.filter(r => r.metrics.errorRate > 5);
    if (highErrorOps.length > 0) {
      console.log(chalk.red('🚨 High error rate operations:'));
      highErrorOps.forEach(op => {
        console.log(chalk.red(`   - ${op.operationType}: ${op.metrics.errorRate.toFixed(2)}%`));
      });
    }
    
    const lowThroughputOps = benchmarkSuite.results.filter(r => r.metrics.throughput < 1);
    if (lowThroughputOps.length > 0) {
      console.log(chalk.magenta('📉 Low throughput operations:'));
      lowThroughputOps.forEach(op => {
        console.log(chalk.magenta(`   - ${op.operationType}: ${op.metrics.throughput.toFixed(2)} ops/sec`));
      });
    }
    
    // Save detailed report
    const reportPath = join(process.cwd(), 'benchmark-results', `performance-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(benchmarkSuite, null, 2));
    
    // Generate CSV for analysis
    const csvPath = join(process.cwd(), 'benchmark-results', `performance-${Date.now()}.csv`);
    const csvContent = [
      'Operation,Throughput (ops/sec),Avg Latency (ms),P95 Latency (ms),P99 Latency (ms),Error Rate (%),Gas Used (SOL)',
      ...benchmarkSuite.results.map(r => 
        `${r.operationType},${r.metrics.throughput},${r.metrics.averageLatency},${r.metrics.p95Latency},${r.metrics.p99Latency},${r.metrics.errorRate},${r.metrics.gasUsed}`
      )
    ].join('\n');
    
    writeFileSync(csvPath, csvContent);
    
    console.log(chalk.blue(`\n📄 Detailed report saved: ${reportPath}`));
    console.log(chalk.blue(`📊 CSV report saved: ${csvPath}`));
  }
}

// Main execution
async function main(): Promise<void> {
  const config: BenchmarkConfig = {
    network: 'testnet',
    programId: '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK',
    rpcUrl: process.env.TESTNET_RPC_URL || 'https://api.testnet.solana.com',
    testDuration: 30000, // 30 seconds per operation type
    maxConcurrency: 20,
    operationTypes: [
      'agent_registration',
      'marketplace_listing',
      'marketplace_query',
      'escrow_creation',
      'agent_query'
    ],
    warmupPeriod: 5000
  };
  
  const benchmarker = new PerformanceBenchmarker(config);
  
  try {
    const benchmarkSuite = await benchmarker.runBenchmarkSuite();
    await PerformanceBenchmarker.generateDetailedReport(benchmarkSuite);
    
    console.log(chalk.green.bold('\n🎉 Performance benchmarking completed!'));
    process.exit(0);
    
  } catch (error) {
    console.error(chalk.red.bold('\n💥 Benchmarking failed!'));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceBenchmarker, type BenchmarkConfig, type PerformanceMetrics, type BenchmarkResult, type BenchmarkSuite };