#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { DataGenerator, Agent, Task, Transaction } from './data-generator.js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface LoadTestConfig {
  duration: number; // minutes
  concurrency: number;
  rampUp: number; // seconds
  targetTPS: number; // transactions per second
  environment: 'devnet' | 'testnet' | 'local';
  scenarios: LoadScenario[];
}

interface LoadScenario {
  name: string;
  weight: number; // percentage of total load
  operation: 'create_agent' | 'create_task' | 'submit_bid' | 'complete_task' | 'dispute_task' | 'transfer_payment';
  parameters?: { [key: string]: any };
}

interface LoadTestResult {
  scenario: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  responseSize?: number;
  metadata?: { [key: string]: any };
}

interface LoadTestSummary {
  totalDuration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  actualTPS: number;
  errorRate: number;
  byScenario: { [key: string]: any };
}

class LoadSimulator {
  private logger: GhostSpeakLogger;
  private config: LoadTestConfig;
  private dataGenerator: DataGenerator;
  private testData: {
    agents: Agent[];
    tasks: Task[];
    transactions: Transaction[];
  };
  private results: LoadTestResult[] = [];
  private startTime: number = 0;
  private isRunning: boolean = false;

  constructor(config: LoadTestConfig) {
    this.logger = new GhostSpeakLogger('LOAD_SIM');
    this.config = config;
    this.dataGenerator = new DataGenerator();
    this.testData = { agents: [], tasks: [], transactions: [] };
  }

  private async prepareTestData(): Promise<void> {
    this.logger.info('Preparing test data for load simulation');

    // Generate synthetic data for realistic load testing
    this.testData.agents = this.dataGenerator.generateAgents(1000);
    this.testData.tasks = this.dataGenerator.generateTasks(500, this.testData.agents);
    this.testData.transactions = this.dataGenerator.generateTransactions(100, this.testData.agents, this.testData.tasks);

    this.logger.info('Test data prepared', {
      agents: this.testData.agents.length,
      tasks: this.testData.tasks.length,
      transactions: this.testData.transactions.length
    });
  }

  private async simulateOperation(operation: string, parameters: any = {}): Promise<LoadTestResult> {
    const startTime = Date.now();
    const result: LoadTestResult = {
      scenario: operation,
      operation,
      startTime,
      endTime: 0,
      duration: 0,
      success: false
    };

    try {
      switch (operation) {
        case 'create_agent':
          await this.simulateCreateAgent(parameters);
          break;
        case 'create_task':
          await this.simulateCreateTask(parameters);
          break;
        case 'submit_bid':
          await this.simulateSubmitBid(parameters);
          break;
        case 'complete_task':
          await this.simulateCompleteTask(parameters);
          break;
        case 'dispute_task':
          await this.simulateDisputeTask(parameters);
          break;
        case 'transfer_payment':
          await this.simulateTransferPayment(parameters);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      result.success = true;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
    }

    return result;
  }

  private async simulateCreateAgent(params: any): Promise<void> {
    // Simulate blockchain transaction delay
    await this.simulateNetworkDelay();
    
    // Simulate actual agent creation logic (placeholder)
    const processingTime = this.randomDelay(100, 2000);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Random success/failure based on network conditions
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Agent registration failed - network congestion');
    }
  }

  private async simulateCreateTask(params: any): Promise<void> {
    await this.simulateNetworkDelay();
    
    const processingTime = this.randomDelay(150, 1500);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    if (Math.random() < 0.03) { // 3% failure rate
      throw new Error('Task creation failed - validation error');
    }
  }

  private async simulateSubmitBid(params: any): Promise<void> {
    await this.simulateNetworkDelay();
    
    const processingTime = this.randomDelay(50, 800);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Bid submission failed - task no longer available');
    }
  }

  private async simulateCompleteTask(params: any): Promise<void> {
    await this.simulateNetworkDelay();
    
    // Task completion takes longer due to verification
    const processingTime = this.randomDelay(500, 3000);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    if (Math.random() < 0.04) { // 4% failure rate
      throw new Error('Task completion failed - verification timeout');
    }
  }

  private async simulateDisputeTask(params: any): Promise<void> {
    await this.simulateNetworkDelay();
    
    const processingTime = this.randomDelay(200, 2000);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    if (Math.random() < 0.01) { // 1% failure rate
      throw new Error('Dispute creation failed - invalid evidence');
    }
  }

  private async simulateTransferPayment(params: any): Promise<void> {
    // Payment operations are typically faster but have network dependency
    await this.simulateNetworkDelay();
    
    const processingTime = this.randomDelay(300, 1000);
    await new Promise(resolve => setTimeout(resolve, processingTime));

    if (Math.random() < 0.08) { // 8% failure rate for payment issues
      throw new Error('Payment transfer failed - insufficient balance or network error');
    }
  }

  private async simulateNetworkDelay(): Promise<void> {
    // Simulate blockchain network conditions
    const networkConditions = {
      local: { min: 10, max: 50 },
      devnet: { min: 500, max: 2000 },
      testnet: { min: 800, max: 3000 }
    };

    const { min, max } = networkConditions[this.config.environment];
    const delay = this.randomDelay(min, max);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private selectRandomScenario(): LoadScenario {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const scenario of this.config.scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }

    // Fallback to first scenario
    return this.config.scenarios[0];
  }

  private async executeLoadTest(): Promise<void> {
    const targetDuration = this.config.duration * 60 * 1000; // Convert to milliseconds
    const targetRequests = Math.floor((targetDuration / 1000) * this.config.targetTPS);
    const requestInterval = 1000 / this.config.targetTPS;

    this.logger.info('Starting load test execution', {
      targetDuration: `${this.config.duration}m`,
      targetTPS: this.config.targetTPS,
      targetRequests,
      concurrency: this.config.concurrency
    });

    const workers: Promise<void>[] = [];
    
    for (let i = 0; i < this.config.concurrency; i++) {
      const worker = this.runWorker(i, targetDuration, requestInterval);
      workers.push(worker);

      // Ramp up delay
      if (this.config.rampUp > 0) {
        const rampUpDelay = (this.config.rampUp * 1000) / this.config.concurrency;
        await new Promise(resolve => setTimeout(resolve, rampUpDelay));
      }
    }

    await Promise.all(workers);
  }

  private async runWorker(workerId: number, duration: number, interval: number): Promise<void> {
    const workerLogger = this.logger.child(`WORKER-${workerId}`);
    const endTime = Date.now() + duration;
    let requestCount = 0;

    workerLogger.debug('Worker started');

    while (Date.now() < endTime && this.isRunning) {
      const scenario = this.selectRandomScenario();
      
      try {
        const result = await this.simulateOperation(scenario.operation, scenario.parameters);
        result.scenario = scenario.name;
        result.metadata = { workerId, requestCount };
        
        this.results.push(result);
        requestCount++;

        // Maintain target TPS with jitter
        const jitter = interval * 0.1 * (Math.random() - 0.5); // ±5% jitter
        await new Promise(resolve => setTimeout(resolve, interval + jitter));

      } catch (error) {
        workerLogger.error('Worker operation failed', error);
      }
    }

    workerLogger.debug('Worker completed', { requestCount });
  }

  private generateSummary(): LoadTestSummary {
    const totalDuration = Date.now() - this.startTime;
    const successfulResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);

    const durations = this.results.map(r => r.duration);
    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const byScenario = this.results.reduce((acc, result) => {
      const scenario = result.scenario;
      if (!acc[scenario]) {
        acc[scenario] = {
          total: 0,
          successful: 0,
          failed: 0,
          avgResponseTime: 0,
          minResponseTime: Number.MAX_SAFE_INTEGER,
          maxResponseTime: 0
        };
      }

      acc[scenario].total++;
      if (result.success) {
        acc[scenario].successful++;
      } else {
        acc[scenario].failed++;
      }

      acc[scenario].minResponseTime = Math.min(acc[scenario].minResponseTime, result.duration);
      acc[scenario].maxResponseTime = Math.max(acc[scenario].maxResponseTime, result.duration);

      return acc;
    }, {} as any);

    // Calculate average response times for scenarios
    Object.keys(byScenario).forEach(scenario => {
      const scenarioResults = this.results.filter(r => r.scenario === scenario);
      const totalDuration = scenarioResults.reduce((sum, r) => sum + r.duration, 0);
      byScenario[scenario].avgResponseTime = totalDuration / scenarioResults.length;
    });

    return {
      totalDuration,
      totalRequests: this.results.length,
      successfulRequests: successfulResults.length,
      failedRequests: failedResults.length,
      averageResponseTime,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      actualTPS: this.results.length / (totalDuration / 1000),
      errorRate: (failedResults.length / this.results.length) * 100,
      byScenario
    };
  }

  private displayResults(summary: LoadTestSummary): void {
    console.log(chalk.bold.blue('\n📊 Load Test Results'));
    console.log('━'.repeat(60));
    
    console.log(chalk.green(`✅ Successful Requests: ${summary.successfulRequests}`));
    console.log(chalk.red(`❌ Failed Requests: ${summary.failedRequests}`));
    console.log(chalk.blue(`📈 Total Requests: ${summary.totalRequests}`));
    console.log(chalk.blue(`⏱️  Total Duration: ${Math.round(summary.totalDuration / 1000)}s`));
    console.log(chalk.blue(`🎯 Target TPS: ${this.config.targetTPS}`));
    console.log(chalk.blue(`📊 Actual TPS: ${summary.actualTPS.toFixed(2)}`));
    console.log(chalk.blue(`🔴 Error Rate: ${summary.errorRate.toFixed(2)}%`));
    console.log(chalk.blue(`⚡ Avg Response Time: ${Math.round(summary.averageResponseTime)}ms`));
    console.log(chalk.blue(`⚡ Min Response Time: ${summary.minResponseTime}ms`));
    console.log(chalk.blue(`⚡ Max Response Time: ${summary.maxResponseTime}ms`));

    console.log(chalk.bold.yellow('\n📋 Results by Scenario:'));
    Object.entries(summary.byScenario).forEach(([scenario, stats]: [string, any]) => {
      console.log(chalk.cyan(`\n${scenario}:`));
      console.log(`  Total: ${stats.total}`);
      console.log(`  Success: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
      console.log(`  Failed: ${stats.failed}`);
      console.log(`  Avg Response: ${Math.round(stats.avgResponseTime)}ms`);
      console.log(`  Min Response: ${stats.minResponseTime}ms`);
      console.log(`  Max Response: ${stats.maxResponseTime}ms`);
    });
  }

  private async saveResults(outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    const summary = this.generateSummary();
    const timestamp = new Date().toISOString().replace(/:/g, '-');

    // Save detailed results
    const resultsFile = path.join(outputDir, `load-test-results-${timestamp}.json`);
    await fs.writeFile(resultsFile, JSON.stringify({
      config: this.config,
      summary,
      results: this.results
    }, null, 2));

    // Save summary
    const summaryFile = path.join(outputDir, `load-test-summary-${timestamp}.json`);
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));

    // Save CSV for analysis
    const csvFile = path.join(outputDir, `load-test-data-${timestamp}.csv`);
    const csvHeader = 'timestamp,scenario,operation,duration,success,error\n';
    const csvRows = this.results.map(r => 
      `${r.startTime},${r.scenario},${r.operation},${r.duration},${r.success},${r.error || ''}`
    ).join('\n');
    await fs.writeFile(csvFile, csvHeader + csvRows);

    this.logger.info('Load test results saved', {
      resultsFile,
      summaryFile,
      csvFile,
      totalResults: this.results.length
    });
  }

  async run(outputDir?: string): Promise<LoadTestSummary> {
    this.logger.info('Starting load simulation', {
      duration: `${this.config.duration}m`,
      concurrency: this.config.concurrency,
      targetTPS: this.config.targetTPS,
      environment: this.config.environment
    });

    this.startTime = Date.now();
    this.isRunning = true;

    try {
      await this.prepareTestData();
      await this.executeLoadTest();

      const summary = this.generateSummary();
      this.displayResults(summary);

      if (outputDir) {
        await this.saveResults(outputDir);
      }

      this.logger.info('Load simulation completed successfully');
      return summary;

    } catch (error) {
      this.logger.error('Load simulation failed', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    this.logger.info('Stopping load simulation...');
    this.isRunning = false;
  }
}

function createDefaultConfig(): LoadTestConfig {
  return {
    duration: 5, // minutes
    concurrency: 10,
    rampUp: 30, // seconds
    targetTPS: 10,
    environment: 'devnet',
    scenarios: [
      {
        name: 'Agent Registration',
        weight: 20,
        operation: 'create_agent'
      },
      {
        name: 'Task Creation',
        weight: 25,
        operation: 'create_task'
      },
      {
        name: 'Bid Submission',
        weight: 30,
        operation: 'submit_bid'
      },
      {
        name: 'Task Completion',
        weight: 15,
        operation: 'complete_task'
      },
      {
        name: 'Payment Transfer',
        weight: 8,
        operation: 'transfer_payment'
      },
      {
        name: 'Dispute Creation',
        weight: 2,
        operation: 'dispute_task'
      }
    ]
  };
}

async function main(): Promise<void> {
  program
    .name('load-simulator')
    .description('GhostSpeak load testing and simulation tool')
    .option('-d, --duration <minutes>', 'Test duration in minutes', '5')
    .option('-c, --concurrency <number>', 'Number of concurrent workers', '10')
    .option('-t, --tps <number>', 'Target transactions per second', '10')
    .option('-r, --ramp-up <seconds>', 'Ramp up time in seconds', '30')
    .option('-e, --environment <env>', 'Target environment (local|devnet|testnet)', 'devnet')
    .option('-o, --output <dir>', 'Output directory for results', './load-test-results')
    .option('--config <file>', 'Load test configuration file')
    .parse();

  const options = program.opts();

  let config: LoadTestConfig;

  if (options.config) {
    try {
      const configData = await fs.readFile(options.config, 'utf-8');
      config = JSON.parse(configData);
      console.log(chalk.blue(`📁 Loaded configuration from ${options.config}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load config file: ${error}`));
      process.exit(1);
    }
  } else {
    config = createDefaultConfig();
    config.duration = parseInt(options.duration);
    config.concurrency = parseInt(options.concurrency);
    config.targetTPS = parseInt(options.tps);
    config.rampUp = parseInt(options.rampUp);
    config.environment = options.environment;
  }

  const simulator = new LoadSimulator(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Stopping load simulation...'));
    simulator.stop();
  });

  try {
    await simulator.run(options.output);
    console.log(chalk.green('\n🎉 Load simulation completed successfully!'));
  } catch (error) {
    console.error(chalk.red('\n💥 Load simulation failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Load simulator error:'), error);
    process.exit(1);
  });
}

export { LoadSimulator, LoadTestConfig, LoadTestResult, LoadTestSummary };