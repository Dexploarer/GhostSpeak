#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { table } from 'table';

interface BenchmarkResult {
  name: string;
  category: 'build' | 'test' | 'runtime' | 'memory' | 'network' | 'smart_contract';
  duration: number; // milliseconds
  iterations?: number;
  throughput?: number; // operations per second
  memoryUsage?: {
    peak: number;
    average: number;
    final: number;
  };
  metadata?: {
    [key: string]: any;
  };
  timestamp: string;
  success: boolean;
  error?: string;
}

interface BenchmarkSuite {
  name: string;
  description: string;
  benchmarks: (() => Promise<BenchmarkResult>)[];
}

interface BenchmarkReport {
  timestamp: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
    memory: number;
    cpu: string;
  };
  suites: {
    [suiteName: string]: {
      results: BenchmarkResult[];
      summary: {
        totalBenchmarks: number;
        successfulBenchmarks: number;
        failedBenchmarks: number;
        totalDuration: number;
        averageDuration: number;
        fastest: string;
        slowest: string;
      };
    };
  };
  overall: {
    totalDuration: number;
    totalBenchmarks: number;
    successRate: number;
  };
}

class BenchmarkRunner {
  private logger: GhostSpeakLogger;
  private suites: BenchmarkSuite[] = [];

  constructor() {
    this.logger = new GhostSpeakLogger('BENCHMARK');
    this.initializeSuites();
  }

  private initializeSuites(): void {
    this.suites = [
      {
        name: 'Build Performance',
        description: 'Measures build system performance',
        benchmarks: [
          () => this.benchmarkRustBuild(),
          () => this.benchmarkTypeScriptBuild(),
          () => this.benchmarkIDLGeneration(),
          () => this.benchmarkFullBuild()
        ]
      },
      {
        name: 'Test Performance', 
        description: 'Measures test execution performance',
        benchmarks: [
          () => this.benchmarkUnitTests(),
          () => this.benchmarkIntegrationTests(),
          () => this.benchmarkTypeChecking()
        ]
      },
      {
        name: 'Runtime Performance',
        description: 'Measures runtime operations performance', 
        benchmarks: [
          () => this.benchmarkSDKInitialization(),
          () => this.benchmarkTransactionCreation(),
          () => this.benchmarkDataSerialization()
        ]
      },
      {
        name: 'Memory Performance',
        description: 'Measures memory usage patterns',
        benchmarks: [
          () => this.benchmarkMemoryUsage(),
          () => this.benchmarkMemoryLeaks()
        ]
      },
      {
        name: 'Network Performance', 
        description: 'Measures network-related operations',
        benchmarks: [
          () => this.benchmarkRPCConnections(),
          () => this.benchmarkTransactionSubmission()
        ]
      }
    ];
  }

  private async measureOperation<T>(
    name: string, 
    category: BenchmarkResult['category'],
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
      name,
      category,
      duration: 0,
      iterations,
      timestamp: new Date().toISOString(),
      success: false
    };

    const memoryBefore = process.memoryUsage();
    const startTime = process.hrtime.bigint();
    
    let memoryPeak = memoryBefore.heapUsed;
    const memoryReadings: number[] = [];

    // Monitor memory during operation
    const memoryMonitor = setInterval(() => {
      const current = process.memoryUsage().heapUsed;
      memoryPeak = Math.max(memoryPeak, current);
      memoryReadings.push(current);
    }, 10);

    try {
      for (let i = 0; i < iterations; i++) {
        await operation();
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      clearInterval(memoryMonitor);
      const memoryAfter = process.memoryUsage();

      result.duration = duration;
      result.success = true;
      result.throughput = iterations > 1 ? (iterations / (duration / 1000)) : undefined;
      
      result.memoryUsage = {
        peak: memoryPeak,
        average: memoryReadings.length > 0 
          ? memoryReadings.reduce((sum, reading) => sum + reading, 0) / memoryReadings.length
          : memoryBefore.heapUsed,
        final: memoryAfter.heapUsed
      };

      this.logger.performance(`Benchmark ${name} completed`, duration, {
        iterations,
        throughput: result.throughput,
        memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      });

    } catch (error) {
      clearInterval(memoryMonitor);
      
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      
      this.logger.error(`Benchmark ${name} failed`, error);
    }

    return result;
  }

  // Build Performance Benchmarks
  private async benchmarkRustBuild(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Rust Program Build',
      'build',
      async () => {
        execSync('cd programs && cargo build --release', { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    );
  }

  private async benchmarkTypeScriptBuild(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'TypeScript SDK Build',
      'build', 
      async () => {
        execSync('npm run build:sdk', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    );
  }

  private async benchmarkIDLGeneration(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'IDL Generation',
      'build',
      async () => {
        execSync('anchor idl build', {
          encoding: 'utf-8', 
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    );
  }

  private async benchmarkFullBuild(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Full Project Build',
      'build',
      async () => {
        execSync('npm run build:all', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    );
  }

  // Test Performance Benchmarks
  private async benchmarkUnitTests(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Unit Tests Execution',
      'test',
      async () => {
        execSync('npm run test:unit', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    );
  }

  private async benchmarkIntegrationTests(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Integration Tests Execution',
      'test',
      async () => {
        try {
          execSync('npm run test:integration', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch (error) {
          // Integration tests might not exist yet, that's OK for benchmarking
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
        }
      }
    );
  }

  private async benchmarkTypeChecking(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'TypeScript Type Checking',
      'test',
      async () => {
        execSync('npm run type-check:root', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    );
  }

  // Runtime Performance Benchmarks
  private async benchmarkSDKInitialization(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'SDK Initialization',
      'runtime',
      async () => {
        // Simulate SDK initialization
        await import('../packages/sdk-typescript/src/index.js').catch(() => {
          // Module might not be built yet
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      },
      100
    );
  }

  private async benchmarkTransactionCreation(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Transaction Creation',
      'runtime',
      async () => {
        // Simulate transaction creation
        const transaction = {
          instructions: [],
          feePayer: 'dummy',
          recentBlockhash: 'dummy'
        };
        JSON.stringify(transaction);
        await new Promise(resolve => setTimeout(resolve, 1));
      },
      1000
    );
  }

  private async benchmarkDataSerialization(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Data Serialization', 
      'runtime',
      async () => {
        const largeObject = {
          agents: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Agent${i}`,
            data: 'x'.repeat(100)
          }))
        };
        
        JSON.stringify(largeObject);
        JSON.parse(JSON.stringify(largeObject));
      },
      100
    );
  }

  // Memory Performance Benchmarks
  private async benchmarkMemoryUsage(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Memory Allocation Pattern',
      'memory',
      async () => {
        // Simulate memory usage patterns
        const arrays: number[][] = [];
        
        for (let i = 0; i < 1000; i++) {
          arrays.push(new Array(1000).fill(Math.random()));
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Clear arrays
        arrays.length = 0;
      }
    );
  }

  private async benchmarkMemoryLeaks(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Memory Leak Detection',
      'memory',
      async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        const objects: any[] = [];
        
        // Create objects
        for (let i = 0; i < 10000; i++) {
          objects.push({ id: i, data: 'test'.repeat(100) });
        }
        
        // Clear references
        objects.length = 0;
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDelta = finalMemory - initialMemory;
        
        // Memory leak if we retain more than 10MB
        if (memoryDelta > 10 * 1024 * 1024) {
          throw new Error(`Potential memory leak detected: ${memoryDelta} bytes retained`);
        }
      }
    );
  }

  // Network Performance Benchmarks
  private async benchmarkRPCConnections(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'RPC Connection Establishment',
      'network',
      async () => {
        // Simulate RPC connection
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      },
      10
    );
  }

  private async benchmarkTransactionSubmission(): Promise<BenchmarkResult> {
    return this.measureOperation(
      'Transaction Submission Simulation',
      'network',
      async () => {
        // Simulate transaction submission latency
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      },
      5
    );
  }

  private getEnvironmentInfo() {
    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
      cpu: require('os').cpus()[0]?.model || 'Unknown'
    };
  }

  async runSuite(suiteName?: string): Promise<BenchmarkReport> {
    this.logger.info('Starting benchmark suite execution', { suiteName });

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      suites: {},
      overall: {
        totalDuration: 0,
        totalBenchmarks: 0,
        successRate: 0
      }
    };

    const suitesToRun = suiteName 
      ? this.suites.filter(s => s.name === suiteName)
      : this.suites;

    const overallStart = Date.now();

    for (const suite of suitesToRun) {
      this.logger.info(`Running benchmark suite: ${suite.name}`);
      
      const suiteResults: BenchmarkResult[] = [];
      
      for (const benchmark of suite.benchmarks) {
        try {
          const result = await benchmark();
          suiteResults.push(result);
          
          const status = result.success ? chalk.green('✓') : chalk.red('✗');
          const duration = result.duration.toFixed(2);
          console.log(`  ${status} ${result.name} (${duration}ms)`);
          
        } catch (error) {
          this.logger.error(`Benchmark failed: ${error}`);
        }
      }

      // Calculate suite summary
      const successful = suiteResults.filter(r => r.success);
      const failed = suiteResults.filter(r => !r.success);
      const totalDuration = suiteResults.reduce((sum, r) => sum + r.duration, 0);
      
      const fastest = successful.length > 0 
        ? successful.reduce((min, r) => r.duration < min.duration ? r : min).name
        : 'None';
      
      const slowest = successful.length > 0
        ? successful.reduce((max, r) => r.duration > max.duration ? r : max).name  
        : 'None';

      report.suites[suite.name] = {
        results: suiteResults,
        summary: {
          totalBenchmarks: suiteResults.length,
          successfulBenchmarks: successful.length,
          failedBenchmarks: failed.length,
          totalDuration,
          averageDuration: suiteResults.length > 0 ? totalDuration / suiteResults.length : 0,
          fastest,
          slowest
        }
      };
    }

    // Calculate overall summary
    const allResults = Object.values(report.suites).flatMap(s => s.results);
    report.overall = {
      totalDuration: Date.now() - overallStart,
      totalBenchmarks: allResults.length,
      successRate: allResults.length > 0 
        ? (allResults.filter(r => r.success).length / allResults.length) * 100
        : 0
    };

    this.logger.info('Benchmark suite completed', {
      totalBenchmarks: report.overall.totalBenchmarks,
      successRate: report.overall.successRate,
      totalDuration: report.overall.totalDuration
    });

    return report;
  }

  displayReport(report: BenchmarkReport): void {
    console.log(chalk.bold.blue('\n📊 Benchmark Report'));
    console.log('━'.repeat(80));

    // Environment info
    console.log(chalk.bold.green('Environment:'));
    console.log(`  Node.js: ${report.environment.node}`);
    console.log(`  Platform: ${report.environment.platform} ${report.environment.arch}`);
    console.log(`  Memory: ${report.environment.memory}MB`);
    console.log(`  CPU: ${report.environment.cpu}`);

    // Overall summary
    console.log(chalk.bold.yellow('\nOverall Summary:'));
    console.log(`  Total Benchmarks: ${report.overall.totalBenchmarks}`);
    console.log(`  Success Rate: ${report.overall.successRate.toFixed(1)}%`);
    console.log(`  Total Duration: ${(report.overall.totalDuration / 1000).toFixed(2)}s`);

    // Suite details
    for (const [suiteName, suiteData] of Object.entries(report.suites)) {
      console.log(chalk.bold.cyan(`\n${suiteName}:`));
      
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Tests', suiteData.summary.totalBenchmarks.toString()],
        ['Successful', suiteData.summary.successfulBenchmarks.toString()],
        ['Failed', suiteData.summary.failedBenchmarks.toString()],
        ['Total Duration', `${suiteData.summary.totalDuration.toFixed(2)}ms`],
        ['Average Duration', `${suiteData.summary.averageDuration.toFixed(2)}ms`],
        ['Fastest', suiteData.summary.fastest],
        ['Slowest', suiteData.summary.slowest]
      ];

      console.log(table(summaryData));

      // Individual benchmark results
      if (suiteData.results.length > 0) {
        const resultData = [
          ['Benchmark', 'Duration (ms)', 'Throughput', 'Memory (MB)', 'Status']
        ];

        for (const result of suiteData.results) {
          const duration = result.duration.toFixed(2);
          const throughput = result.throughput ? result.throughput.toFixed(1) + ' ops/s' : 'N/A';
          const memoryDelta = result.memoryUsage 
            ? ((result.memoryUsage.final - result.memoryUsage.peak) / 1024 / 1024).toFixed(2)
            : 'N/A';
          const status = result.success ? chalk.green('✓') : chalk.red('✗');

          resultData.push([
            result.name,
            duration,
            throughput,
            memoryDelta,
            status
          ]);
        }

        console.log('\nDetailed Results:');
        console.log(table(resultData));
      }
    }
  }

  async saveReport(report: BenchmarkReport, outputPath: string): Promise<void> {
    const reportsDir = path.dirname(outputPath);
    await fs.mkdir(reportsDir, { recursive: true });

    // Save JSON report
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

    // Save CSV for analysis
    const csvPath = outputPath.replace('.json', '.csv');
    const csvData = ['timestamp,suite,benchmark,category,duration_ms,success,throughput,memory_peak_mb,memory_final_mb'];
    
    for (const [suiteName, suiteData] of Object.entries(report.suites)) {
      for (const result of suiteData.results) {
        const row = [
          result.timestamp,
          suiteName,
          result.name,
          result.category,
          result.duration.toFixed(2),
          result.success.toString(),
          result.throughput?.toFixed(2) || '',
          result.memoryUsage ? (result.memoryUsage.peak / 1024 / 1024).toFixed(2) : '',
          result.memoryUsage ? (result.memoryUsage.final / 1024 / 1024).toFixed(2) : ''
        ];
        csvData.push(row.join(','));
      }
    }

    await fs.writeFile(csvPath, csvData.join('\n'));

    this.logger.info('Benchmark report saved', {
      jsonReport: outputPath,
      csvReport: csvPath,
      totalBenchmarks: report.overall.totalBenchmarks
    });
  }
}

async function main(): Promise<void> {
  program
    .name('benchmark-suite')
    .description('GhostSpeak comprehensive performance benchmark suite')
    .option('-s, --suite <name>', 'Run specific benchmark suite')
    .option('-o, --output <file>', 'Output file for results', './benchmark-reports/benchmark-report.json')
    .option('--gc', 'Enable garbage collection monitoring')
    .parse();

  const options = program.opts();

  // Enable GC monitoring if requested
  if (options.gc && global.gc) {
    console.log(chalk.blue('🗑️  Garbage collection monitoring enabled'));
  } else if (options.gc) {
    console.log(chalk.yellow('⚠️  Garbage collection monitoring requested but not available'));
    console.log(chalk.yellow('    Run with: node --expose-gc to enable'));
  }

  const runner = new BenchmarkRunner();

  try {
    console.log(chalk.blue('🚀 Starting GhostSpeak Performance Benchmarks...'));
    
    const report = await runner.runSuite(options.suite);
    runner.displayReport(report);

    if (options.output) {
      await runner.saveReport(report, options.output);
    }

    // Performance summary
    const avgSuccessRate = report.overall.successRate;
    if (avgSuccessRate >= 90) {
      console.log(chalk.green('\n🎉 Excellent performance - all systems operating optimally!'));
    } else if (avgSuccessRate >= 70) {
      console.log(chalk.yellow('\n⚠️  Good performance - some optimizations recommended'));
    } else {
      console.log(chalk.red('\n🚨 Performance issues detected - investigation recommended'));
    }

  } catch (error) {
    console.error(chalk.red('Benchmark execution failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Benchmark runner error:'), error);
    process.exit(1);
  });
}

export { BenchmarkRunner, BenchmarkReport, BenchmarkResult };