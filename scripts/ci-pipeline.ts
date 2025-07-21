#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';
import { HealthChecker } from './health-check.js';
import { AutomatedDeployment } from './automated-deployment.js';
import fs from 'fs/promises';
import path from 'path';

interface CIConfig {
  skipTests?: boolean;
  skipLinting?: boolean;
  skipSecurity?: boolean;
  skipDeployment?: boolean;
  environment: 'devnet' | 'testnet';
  notification?: boolean;
  parallel?: boolean;
}

interface CIResult {
  success: boolean;
  duration: number;
  timestamp: string;
  stages: {
    [key: string]: {
      success: boolean;
      duration: number;
      error?: string;
    };
  };
}

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

class CIPipeline {
  private config: CIConfig;
  private startTime: number = 0;
  private stageResults: { [key: string]: any } = {};

  constructor(config: CIConfig) {
    this.config = config;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    console.log(colors[level](`[CI] [${new Date().toISOString()}] ${message}`));
  }

  private async execCommand(command: string, description: string, timeout: number = 120000): Promise<string> {
    const spinner = ora(description).start();
    const stageStart = Date.now();
    
    try {
      const result = execSync(command, { 
        encoding: 'utf-8', 
        timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const duration = Date.now() - stageStart;
      spinner.succeed(`${description} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - stageStart;
      spinner.fail(`${description} (${duration}ms)`);
      throw error;
    }
  }

  private async runStage(name: string, fn: () => Promise<void>): Promise<void> {
    const stageStart = Date.now();
    console.log(chalk.bold.blue(`\n📋 Stage: ${name}`));
    
    try {
      await fn();
      this.stageResults[name] = {
        success: true,
        duration: Date.now() - stageStart
      };
      this.log(`Stage '${name}' completed successfully`, 'success');
    } catch (error) {
      this.stageResults[name] = {
        success: false,
        duration: Date.now() - stageStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.log(`Stage '${name}' failed: ${error}`, 'error');
      throw error;
    }
  }

  private async stageEnvironmentSetup(): Promise<void> {
    await this.runStage('Environment Setup', async () => {
      // Verify Node.js version
      await this.execCommand('node --version', 'Checking Node.js version');
      
      // Verify npm
      await this.execCommand('npm --version', 'Checking npm version');
      
      // Verify Rust and Cargo
      await this.execCommand('rustc --version', 'Checking Rust version');
      await this.execCommand('cargo --version', 'Checking Cargo version');
      
      // Verify Anchor
      await this.execCommand('anchor --version', 'Checking Anchor version');
      
      // Verify Solana CLI
      await this.execCommand('solana --version', 'Checking Solana CLI version');
      
      // Check available disk space
      const diskSpace = await this.execCommand('df -h .', 'Checking disk space');
      this.log(`Disk space info:\n${diskSpace}`, 'info');
    });
  }

  private async stageDependencyInstallation(): Promise<void> {
    await this.runStage('Dependency Installation', async () => {
      // Clean install for reproducible builds
      await this.execCommand('npm ci', 'Installing npm dependencies', 180000);
      
      // Verify Rust dependencies
      await this.execCommand('cd programs && cargo check', 'Checking Rust dependencies', 180000);
    });
  }

  private async stageCodeQuality(): Promise<void> {
    if (this.config.skipLinting) {
      this.log('Skipping code quality stage as requested', 'warn');
      return;
    }

    await this.runStage('Code Quality', async () => {
      // TypeScript type checking
      await this.execCommand('npm run type-check:root', 'TypeScript type checking');
      
      // Package type checking
      await this.execCommand('npm run type-check:packages', 'Package type checking');
      
      // Rust linting
      await this.execCommand('npm run lint:rust', 'Rust linting (Clippy)');
      
      // TypeScript linting
      await this.execCommand('npm run lint:ts', 'TypeScript linting (ESLint)');
      
      // Format checking
      await this.execCommand('npm run qa:format-check', 'Code format checking');
    });
  }

  private async stageSecurityAuditing(): Promise<void> {
    if (this.config.skipSecurity) {
      this.log('Skipping security auditing as requested', 'warn');
      return;
    }

    await this.runStage('Security Auditing', async () => {
      // npm audit
      try {
        await this.execCommand('npm audit --audit-level high', 'npm security audit');
      } catch (error) {
        this.log('npm audit found issues - check output above', 'warn');
        // Don't fail the pipeline for audit warnings, just log them
      }
      
      // Cargo audit
      try {
        await this.execCommand('cd programs && cargo audit', 'Cargo security audit');
      } catch (error) {
        this.log('Cargo audit found issues - check output above', 'warn');
      }
      
      // Custom security checks could go here
    });
  }

  private async stageBuild(): Promise<void> {
    await this.runStage('Build', async () => {
      // Clean previous builds
      await this.execCommand('npm run clean', 'Cleaning previous builds');
      
      // Build Anchor program
      await this.execCommand('anchor build', 'Building Anchor program', 300000);
      
      // Generate IDL
      await this.execCommand('anchor idl build', 'Generating IDL');
      
      // Build packages
      await this.execCommand('npm run build:packages', 'Building TypeScript packages', 180000);
    });
  }

  private async runTestSuite(name: string, command: string, timeout: number = 120000): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const output = await this.execCommand(command, `Running ${name}`, timeout);
      return {
        name,
        success: true,
        duration: Date.now() - startTime,
        output
      };
    } catch (error) {
      return {
        name,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async stageTesting(): Promise<void> {
    if (this.config.skipTests) {
      this.log('Skipping testing stage as requested', 'warn');
      return;
    }

    await this.runStage('Testing', async () => {
      const testSuites = [
        { name: 'Unit Tests', command: 'npm run test:unit', timeout: 120000 },
        { name: 'Integration Tests', command: 'npm run test:integration', timeout: 180000 },
        { name: 'Security Tests', command: 'npm run test:security', timeout: 120000 }
      ];

      let testResults: TestResult[] = [];

      if (this.config.parallel) {
        // Run tests in parallel
        this.log('Running tests in parallel...', 'info');
        const promises = testSuites.map(suite => 
          this.runTestSuite(suite.name, suite.command, suite.timeout)
        );
        testResults = await Promise.all(promises);
      } else {
        // Run tests sequentially
        this.log('Running tests sequentially...', 'info');
        for (const suite of testSuites) {
          const result = await this.runTestSuite(suite.name, suite.command, suite.timeout);
          testResults.push(result);
        }
      }

      // Check results
      const failedTests = testResults.filter(r => !r.success);
      if (failedTests.length > 0) {
        this.log(`${failedTests.length} test suites failed:`, 'error');
        failedTests.forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error');
        });
        throw new Error(`${failedTests.length} test suites failed`);
      }

      this.log(`All ${testResults.length} test suites passed ✓`, 'success');
    });
  }

  private async stageHealthCheck(): Promise<void> {
    await this.runStage('Health Check', async () => {
      const healthChecker = new HealthChecker();
      const results = await healthChecker.runHealthChecks();
      
      const criticalIssues = results.filter(r => r.status === 'down');
      const warnings = results.filter(r => r.status === 'degraded');
      
      if (criticalIssues.length > 0) {
        throw new Error(`Health check failed: ${criticalIssues.length} critical issues`);
      }
      
      if (warnings.length > 0) {
        this.log(`Health check passed with ${warnings.length} warnings`, 'warn');
      } else {
        this.log('Health check passed ✓', 'success');
      }
    });
  }

  private async stageDeployment(): Promise<void> {
    if (this.config.skipDeployment) {
      this.log('Skipping deployment stage as requested', 'warn');
      return;
    }

    await this.runStage('Deployment', async () => {
      const deployment = new AutomatedDeployment({
        environment: this.config.environment,
        skipTests: true, // We already ran tests
        skipHealthCheck: true, // We already ran health check
        autoConfirm: true
      });
      
      const result = await deployment.deploy();
      
      if (!result.success) {
        throw new Error(`Deployment failed: ${result.error}`);
      }
      
      this.log(`Deployment successful - Program ID: ${result.programId}`, 'success');
    });
  }

  private async generateReport(result: CIResult): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'ci-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportFile = path.join(reportsDir, `ci-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
    await fs.writeFile(reportFile, JSON.stringify(result, null, 2));
    
    // Also generate a human-readable summary
    const summaryFile = path.join(reportsDir, 'ci-summary.md');
    const summary = this.generateMarkdownSummary(result);
    await fs.writeFile(summaryFile, summary);
    
    this.log(`CI report saved to ${reportFile}`, 'info');
    this.log(`CI summary saved to ${summaryFile}`, 'info');
  }

  private generateMarkdownSummary(result: CIResult): string {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const duration = Math.round(result.duration / 1000);
    
    let summary = `# CI Pipeline Report\n\n`;
    summary += `**Status:** ${status}\n`;
    summary += `**Duration:** ${duration}s\n`;
    summary += `**Timestamp:** ${result.timestamp}\n\n`;
    summary += `## Stage Results\n\n`;
    
    for (const [stage, stageResult] of Object.entries(result.stages)) {
      const stageStatus = stageResult.success ? '✅' : '❌';
      const stageDuration = Math.round(stageResult.duration / 1000);
      
      summary += `### ${stage} ${stageStatus}\n`;
      summary += `Duration: ${stageDuration}s\n`;
      
      if (stageResult.error) {
        summary += `Error: \`${stageResult.error}\`\n`;
      }
      summary += '\n';
    }
    
    return summary;
  }

  async run(): Promise<CIResult> {
    this.startTime = Date.now();
    
    console.log(chalk.bold.blue('\n🔄 GhostSpeak CI Pipeline'));
    console.log(chalk.gray(`Environment: ${this.config.environment.toUpperCase()}`));
    console.log(chalk.gray(`Started: ${new Date().toLocaleString()}`));
    console.log(chalk.gray('━'.repeat(80)));

    const result: CIResult = {
      success: false,
      duration: 0,
      timestamp: new Date().toISOString(),
      stages: {}
    };

    try {
      await this.stageEnvironmentSetup();
      await this.stageDependencyInstallation();
      await this.stageCodeQuality();
      await this.stageSecurityAuditing();
      await this.stageBuild();
      await this.stageTesting();
      await this.stageHealthCheck();
      await this.stageDeployment();

      result.success = true;
      console.log(chalk.bold.green('\n🎉 CI Pipeline completed successfully!'));

    } catch (error) {
      result.success = false;
      console.log(chalk.bold.red('\n💥 CI Pipeline failed!'));
      console.log(chalk.red(`Error: ${error}`));
    } finally {
      result.duration = Date.now() - this.startTime;
      result.stages = this.stageResults;
      
      console.log(chalk.gray(`\nTotal duration: ${Math.round(result.duration / 1000)}s`));
      
      await this.generateReport(result);
    }

    return result;
  }
}

async function main(): Promise<void> {
  program
    .name('ci-pipeline')
    .description('GhostSpeak comprehensive CI/CD pipeline')
    .option('-e, --environment <env>', 'Target environment (devnet|testnet)', 'devnet')
    .option('--skip-tests', 'Skip testing stage')
    .option('--skip-linting', 'Skip code quality stage')
    .option('--skip-security', 'Skip security auditing')
    .option('--skip-deployment', 'Skip deployment stage')
    .option('--parallel', 'Run tests in parallel')
    .option('--notification', 'Enable notifications (future feature)')
    .parse();

  const options = program.opts();

  if (!['devnet', 'testnet'].includes(options.environment)) {
    console.error(chalk.red('Invalid environment. CI pipeline supports: devnet, testnet'));
    process.exit(1);
  }

  const config: CIConfig = {
    environment: options.environment,
    skipTests: options.skipTests,
    skipLinting: options.skipLinting,
    skipSecurity: options.skipSecurity,
    skipDeployment: options.skipDeployment,
    parallel: options.parallel,
    notification: options.notification
  };

  const pipeline = new CIPipeline(config);
  
  try {
    const result = await pipeline.run();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('CI Pipeline system error:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('CI Pipeline error:'), error);
    process.exit(1);
  });
}

export { CIPipeline, CIConfig, CIResult };