#!/usr/bin/env bun
/**
 * Load Test Runner
 * 
 * Orchestrates the execution of all performance and load tests
 * with proper configuration and reporting.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../shared/logger';

interface TestSuite {
  name: string;
  file: string;
  timeout: number;
  critical: boolean;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Channel Broadcast Performance',
    file: './channel-broadcast-load-test.ts',
    timeout: 300000, // 5 minutes
    critical: true,
  },
  {
    name: 'Comprehensive Load Testing',
    file: './comprehensive-load-test.ts',
    timeout: 600000, // 10 minutes
    critical: true,
  },
  {
    name: 'General Performance Tests',
    file: '../../../tests/performance/load-testing.test.ts',
    timeout: 180000, // 3 minutes
    critical: false,
  },
];

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  metrics?: {
    throughput?: number;
    errorRate?: number;
    avgResponseTime?: number;
    memoryGrowth?: number;
  };
}

class LoadTestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    logger.general.info('🚀 GHOSTSPEAK LOAD TEST SUITE');
    logger.general.info('=' .repeat(50));
    logger.general.info(`Starting at: ${new Date().toISOString()}`);
    logger.general.info(`Test environment: ${process.env.NODE_ENV || 'development'}`);
    logger.general.info('');

    // Check prerequisites
    await this.checkPrerequisites();

    // Run each test suite
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }

    // Generate final report
    this.generateFinalReport();
  }

  private async checkPrerequisites(): Promise<void> {
    logger.general.info('📋 Checking prerequisites...');

    // Check if Solana test validator is running
    try {
      const response = await fetch('http://localhost:8899', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      });

      if (!response.ok) {
        throw new Error('Solana test validator not responding');
      }

      logger.general.info('✅ Solana test validator is running');
    } catch (error) {
      logger.general.error('❌ Solana test validator is not running');
      logger.general.error('   Please start it with: solana-test-validator');
      process.exit(1);
    }

    // Check if program is deployed
    try {
      const programIdPath = path.join(__dirname, '../../../../target/deploy/podai_marketplace-keypair.json');
      if (!fs.existsSync(programIdPath)) {
        throw new Error('Program keypair not found');
      }
      logger.general.info('✅ Program artifacts found');
    } catch (error) {
      logger.general.warn('⚠️  Program may not be deployed');
      logger.general.warn('   Run: anchor deploy');
    }

    // Check system resources
    const os = await import('os');
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;

    logger.general.info(`📊 System resources:`);
    logger.general.info(`   CPU cores: ${cpuCount}`);
    logger.general.info(`   Total memory: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB`);
    logger.general.info(`   Free memory: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)}GB`);

    if (freeMemory < 2 * 1024 * 1024 * 1024) {
      logger.general.warn('⚠️  Low memory warning: Less than 2GB free');
    }

    logger.general.info('');
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    const suiteStart = Date.now();
    logger.general.info(`🧪 Running: ${suite.name}`);
    logger.general.info(`   File: ${suite.file}`);
    logger.general.info(`   Timeout: ${suite.timeout / 1000}s`);

    const result: TestResult = {
      suite: suite.name,
      passed: false,
      duration: 0,
      output: '',
    };

    try {
      const testOutput = await this.executeTest(suite);
      result.output = testOutput;
      result.passed = this.parseTestSuccess(testOutput);
      result.metrics = this.extractMetrics(testOutput);
      
      logger.general.info(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (result.metrics) {
        if (result.metrics.throughput) {
          logger.general.info(`   Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`);
        }
        if (result.metrics.errorRate !== undefined) {
          logger.general.info(`   Error rate: ${result.metrics.errorRate.toFixed(1)}%`);
        }
      }
    } catch (error) {
      result.passed = false;
      result.output = error.message;
      logger.general.error(`   Error: ${error.message}`);
    }

    result.duration = Date.now() - suiteStart;
    logger.general.info(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    logger.general.info('');

    this.results.push(result);

    // Stop if critical test fails
    if (suite.critical && !result.passed) {
      logger.general.error('❌ Critical test failed. Stopping test execution.');
      this.generateFinalReport();
      process.exit(1);
    }
  }

  private executeTest(suite: TestSuite): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      const testProcess = spawn('bun', ['test', suite.file, '--timeout', suite.timeout.toString()], {
        cwd: __dirname,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ANCHOR_PROVIDER_URL: process.env.ANCHOR_PROVIDER_URL || 'http://localhost:8899',
        },
      });

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stderr.write(text);
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Test process exited with code ${code}`));
        }
      });

      // Set timeout
      setTimeout(() => {
        testProcess.kill();
        reject(new Error(`Test timed out after ${suite.timeout}ms`));
      }, suite.timeout + 10000); // Extra 10s buffer
    });
  }

  private parseTestSuccess(output: string): boolean {
    // Look for test summary in output
    const passMatch = output.match(/(\d+) pass/);
    const failMatch = output.match(/(\d+) fail/);
    
    if (passMatch && failMatch) {
      const passed = parseInt(passMatch[1]);
      const failed = parseInt(failMatch[1]);
      return failed === 0 && passed > 0;
    }

    // Fallback: check for success indicators
    return output.includes('✅') && !output.includes('❌') && !output.includes('FAIL');
  }

  private extractMetrics(output: string): TestResult['metrics'] {
    const metrics: TestResult['metrics'] = {};

    // Extract throughput
    const throughputMatch = output.match(/throughput[:\s]+(\d+\.?\d*)\s*(msg\/sec|ops\/sec)/i);
    if (throughputMatch) {
      metrics.throughput = parseFloat(throughputMatch[1]);
    }

    // Extract error rate
    const errorRateMatch = output.match(/error rate[:\s]+(\d+\.?\d*)%/i);
    if (errorRateMatch) {
      metrics.errorRate = parseFloat(errorRateMatch[1]);
    }

    // Extract response time
    const responseTimeMatch = output.match(/avg(?:erage)?\s+response time[:\s]+(\d+\.?\d*)\s*ms/i);
    if (responseTimeMatch) {
      metrics.avgResponseTime = parseFloat(responseTimeMatch[1]);
    }

    // Extract memory growth
    const memoryMatch = output.match(/memory growth[:\s]+(\d+\.?\d*)%/i);
    if (memoryMatch) {
      metrics.memoryGrowth = parseFloat(memoryMatch[1]);
    }

    return Object.keys(metrics).length > 0 ? metrics : undefined;
  }

  private generateFinalReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const successRate = (passedTests / this.results.length) * 100;

    logger.general.info('\n' + '='.repeat(80));
    logger.general.info('📊 LOAD TEST SUMMARY REPORT');
    logger.general.info('='.repeat(80));
    
    logger.general.info(`\n📅 Test execution completed at: ${new Date().toISOString()}`);
    logger.general.info(`⏱️  Total duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
    logger.general.info(`\n📈 Results Overview:`);
    logger.general.info(`   Total tests: ${this.results.length}`);
    logger.general.info(`   Passed: ${passedTests} ✅`);
    logger.general.info(`   Failed: ${failedTests} ❌`);
    logger.general.info(`   Success rate: ${successRate.toFixed(1)}%`);

    logger.general.info(`\n📋 Test Details:`);
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      logger.general.info(`\n   ${result.suite}: ${status}`);
      logger.general.info(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
      
      if (result.metrics) {
        logger.general.info(`   Key Metrics:`);
        if (result.metrics.throughput) {
          logger.general.info(`     - Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`);
        }
        if (result.metrics.errorRate !== undefined) {
          logger.general.info(`     - Error Rate: ${result.metrics.errorRate.toFixed(1)}%`);
        }
        if (result.metrics.avgResponseTime) {
          logger.general.info(`     - Avg Response: ${result.metrics.avgResponseTime.toFixed(0)}ms`);
        }
        if (result.metrics.memoryGrowth !== undefined) {
          logger.general.info(`     - Memory Growth: ${result.metrics.memoryGrowth.toFixed(1)}%`);
        }
      }
    });

    // Performance validation against requirements
    logger.general.info(`\n🎯 Performance Requirements Validation:`);
    
    // Check message throughput requirement
    const broadcastTest = this.results.find(r => r.suite.includes('Broadcast'));
    const meetsThroughput = broadcastTest?.metrics?.throughput >= 10;
    logger.general.info(`   ${meetsThroughput ? '✅' : '❌'} Message throughput >= 10 msg/sec: ${broadcastTest?.metrics?.throughput?.toFixed(2) || 'N/A'} msg/sec`);

    // Check concurrent users
    const loadTest = this.results.find(r => r.suite.includes('Comprehensive'));
    const meetsConcurrency = loadTest?.passed || false;
    logger.general.info(`   ${meetsConcurrency ? '✅' : '❌'} 100+ concurrent users: ${meetsConcurrency ? 'Supported' : 'Not verified'}`);

    // Overall assessment
    const overallPass = successRate === 100 && meetsThroughput && meetsConcurrency;
    logger.general.info(`\n🏆 Overall Assessment: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

    if (overallPass) {
      logger.general.info('   ✨ All performance requirements met!');
      logger.general.info('   ✨ System is ready for production load.');
    } else {
      logger.general.info('   ⚠️  Some performance requirements not met.');
      logger.general.info('   ⚠️  Please review failed tests and optimize accordingly.');
    }

    // Export results for CI/CD
    this.exportResults();

    logger.general.info('\n' + '='.repeat(80));
  }

  private exportResults(): void {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        successRate: (this.results.filter(r => r.passed).length / this.results.length) * 100,
      },
      results: this.results,
      performanceMetrics: {
        messageThroughput: this.results.find(r => r.suite.includes('Broadcast'))?.metrics?.throughput || 0,
        concurrentUsers: 100, // Based on test configuration
        avgErrorRate: this.results.reduce((sum, r) => sum + (r.metrics?.errorRate || 0), 0) / this.results.length,
      },
    };

    const reportPath = path.join(__dirname, '../../load-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.general.info(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the tests
if (require.main === module) {
  const runner = new LoadTestRunner();
  runner.runAllTests().catch(error => {
    logger.general.error('Fatal error running load tests:', error);
    process.exit(1);
  });
}