#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { execSync, spawn } from 'child_process';
import ora from 'ora';
import { HealthChecker } from './health-check.js';
import fs from 'fs/promises';
import path from 'path';

interface DeploymentConfig {
  environment: 'devnet' | 'testnet' | 'mainnet';
  programId?: string;
  skipTests?: boolean;
  skipHealthCheck?: boolean;
  autoConfirm?: boolean;
  backupFirst?: boolean;
}

interface DeploymentResult {
  success: boolean;
  environment: string;
  programId?: string;
  transactionId?: string;
  duration: number;
  error?: string;
  timestamp: string;
}

class AutomatedDeployment {
  private config: DeploymentConfig;
  private spinner: any;
  private startTime: number = 0;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    console.log(colors[level](`[${new Date().toISOString()}] ${message}`));
  }

  private async execCommand(command: string, description: string): Promise<string> {
    this.spinner = ora(description).start();
    
    try {
      const result = execSync(command, { 
        encoding: 'utf-8', 
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      this.spinner.succeed(description);
      return result;
    } catch (error) {
      this.spinner.fail(description);
      throw error;
    }
  }

  private async runPreDeploymentChecks(): Promise<void> {
    this.log('🔍 Running pre-deployment checks...', 'info');

    // Check environment setup
    await this.execCommand(
      `solana config get | grep -E "(RPC URL|Keypair Path)"`,
      'Verifying Solana CLI configuration'
    );

    // Check wallet balance
    const balance = await this.execCommand(
      'solana balance',
      'Checking wallet balance'
    );

    const balanceValue = parseFloat(balance.split(' ')[0]);
    if (balanceValue < 1.0) {
      throw new Error(`Insufficient balance: ${balanceValue} SOL (minimum 1.0 SOL required)`);
    }

    // Verify anchor version
    await this.execCommand(
      'anchor --version',
      'Verifying Anchor framework version'
    );

    // Check if program exists and get current state
    if (this.config.programId) {
      try {
        await this.execCommand(
          `solana account ${this.config.programId}`,
          'Checking current program deployment'
        );
      } catch {
        this.log('Program not currently deployed', 'warn');
      }
    }
  }

  private async backupCurrentState(): Promise<void> {
    if (!this.config.backupFirst || !this.config.programId) return;

    this.log('💾 Creating deployment backup...', 'info');

    const backupDir = path.join(process.cwd(), 'backups', new Date().toISOString().split('T')[0]);
    await fs.mkdir(backupDir, { recursive: true });

    // Backup current IDL
    try {
      const idl = await this.execCommand(
        `anchor idl fetch ${this.config.programId}`,
        'Backing up current IDL'
      );
      
      await fs.writeFile(path.join(backupDir, 'current-idl.json'), idl);
    } catch (error) {
      this.log('Could not backup current IDL - program may not exist', 'warn');
    }

    // Backup current deployment info
    const deploymentInfo = {
      programId: this.config.programId,
      environment: this.config.environment,
      backupDate: new Date().toISOString(),
      command: process.argv.join(' ')
    };

    await fs.writeFile(
      path.join(backupDir, 'deployment-info.json'), 
      JSON.stringify(deploymentInfo, null, 2)
    );

    this.log(`Backup created at: ${backupDir}`, 'success');
  }

  private async runQualityChecks(): Promise<void> {
    if (this.config.skipTests) {
      this.log('⚠️  Skipping quality checks as requested', 'warn');
      return;
    }

    this.log('🧪 Running quality assurance checks...', 'info');

    // Type checking
    await this.execCommand(
      'npm run type-check:root',
      'Running TypeScript type checking'
    );

    // Linting
    await this.execCommand(
      'npm run qa:lint',
      'Running linting checks'
    );

    // Format checking
    await this.execCommand(
      'npm run qa:format-check',
      'Checking code formatting'
    );

    // Security audit
    await this.execCommand(
      'npm run qa:audit',
      'Running security audit'
    );

    // Unit tests
    await this.execCommand(
      'npm run test:unit',
      'Running unit tests'
    );
  }

  private async buildProject(): Promise<void> {
    this.log('🔨 Building project...', 'info');

    // Clean build
    await this.execCommand(
      'npm run clean',
      'Cleaning previous builds'
    );

    // Build Rust program
    await this.execCommand(
      'anchor build',
      'Building Anchor program'
    );

    // Build packages
    await this.execCommand(
      'npm run build:packages',
      'Building TypeScript packages'
    );

    // Generate IDL
    await this.execCommand(
      'anchor idl build',
      'Generating program IDL'
    );
  }

  private async deployProgram(): Promise<{ programId: string; transactionId?: string }> {
    this.log(`🚀 Deploying to ${this.config.environment}...`, 'info');

    // Set the correct cluster
    const clusterUrl = {
      devnet: 'https://api.devnet.solana.com',
      testnet: 'https://api.testnet.solana.com', 
      mainnet: 'https://api.mainnet-beta.solana.com'
    }[this.config.environment];

    await this.execCommand(
      `solana config set --url ${clusterUrl}`,
      `Switching to ${this.config.environment}`
    );

    // Deploy the program
    const deployCommand = this.config.environment === 'mainnet' 
      ? 'anchor deploy --provider.cluster mainnet'
      : `anchor deploy --provider.cluster ${this.config.environment}`;

    const deployOutput = await this.execCommand(
      deployCommand,
      'Deploying program to blockchain'
    );

    // Extract program ID from deployment output
    const programIdMatch = deployOutput.match(/Program Id: ([A-Za-z0-9]{32,})/);
    const programId = programIdMatch ? programIdMatch[1] : this.config.programId || '';

    if (!programId) {
      throw new Error('Could not extract program ID from deployment output');
    }

    // If we have a program ID, try to initialize or upgrade IDL
    try {
      if (this.config.programId) {
        await this.execCommand(
          `anchor idl upgrade ${programId} --filepath target/idl/ghostspeak_marketplace.json`,
          'Upgrading program IDL'
        );
      } else {
        await this.execCommand(
          `anchor idl init ${programId} --filepath target/idl/ghostspeak_marketplace.json`,
          'Initializing program IDL'
        );
      }
    } catch (error) {
      this.log('IDL initialization/upgrade failed - continuing', 'warn');
    }

    return { programId };
  }

  private async runPostDeploymentTests(): Promise<void> {
    if (this.config.skipTests) {
      this.log('⚠️  Skipping post-deployment tests as requested', 'warn');
      return;
    }

    this.log('🧪 Running post-deployment tests...', 'info');

    // Integration tests
    await this.execCommand(
      'npm run test:integration',
      'Running integration tests'
    );

    // Performance tests
    try {
      await this.execCommand(
        'npm run test:perf',
        'Running performance tests'
      );
    } catch (error) {
      this.log('Performance tests failed - continuing', 'warn');
    }
  }

  private async runHealthCheck(): Promise<void> {
    if (this.config.skipHealthCheck) {
      this.log('⚠️  Skipping health check as requested', 'warn');
      return;
    }

    this.log('🏥 Running health check...', 'info');
    
    const healthChecker = new HealthChecker();
    const results = await healthChecker.runHealthChecks();
    
    const criticalIssues = results.filter(r => r.status === 'down');
    if (criticalIssues.length > 0) {
      this.log(`Health check failed: ${criticalIssues.length} critical issues`, 'error');
      throw new Error('Post-deployment health check failed');
    }

    this.log('Health check passed ✓', 'success');
  }

  private async saveDeploymentRecord(result: DeploymentResult): Promise<void> {
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    await fs.mkdir(deploymentsDir, { recursive: true });

    const deploymentFile = path.join(
      deploymentsDir, 
      `${this.config.environment}-deployments.json`
    );

    let deployments = [];
    try {
      const existingData = await fs.readFile(deploymentFile, 'utf-8');
      deployments = JSON.parse(existingData);
    } catch {
      // File doesn't exist, start fresh
    }

    deployments.push(result);

    // Keep only the last 50 deployments
    if (deployments.length > 50) {
      deployments = deployments.slice(-50);
    }

    await fs.writeFile(deploymentFile, JSON.stringify(deployments, null, 2));

    this.log(`Deployment record saved to ${deploymentFile}`, 'info');
  }

  async deploy(): Promise<DeploymentResult> {
    this.startTime = Date.now();
    
    const result: DeploymentResult = {
      success: false,
      environment: this.config.environment,
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      console.log(chalk.bold.blue(`\n🚀 GhostSpeak Automated Deployment`));
      console.log(chalk.gray(`Environment: ${this.config.environment.toUpperCase()}`));
      console.log(chalk.gray(`Started: ${new Date().toLocaleString()}\n`));

      await this.runPreDeploymentChecks();
      await this.backupCurrentState();
      await this.runQualityChecks();
      await this.buildProject();
      
      const deployResult = await this.deployProgram();
      result.programId = deployResult.programId;
      result.transactionId = deployResult.transactionId;

      await this.runPostDeploymentTests();
      await this.runHealthCheck();

      result.success = true;
      result.duration = Date.now() - this.startTime;

      console.log(chalk.bold.green('\n✅ Deployment completed successfully!'));
      console.log(chalk.gray(`Program ID: ${result.programId}`));
      console.log(chalk.gray(`Duration: ${Math.round(result.duration / 1000)}s`));
      console.log(chalk.gray(`Environment: ${this.config.environment}`));

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - this.startTime;
      result.error = error instanceof Error ? error.message : 'Unknown error';

      console.log(chalk.bold.red('\n❌ Deployment failed!'));
      console.log(chalk.red(`Error: ${result.error}`));
      console.log(chalk.gray(`Duration: ${Math.round(result.duration / 1000)}s`));

      throw error;
    } finally {
      await this.saveDeploymentRecord(result);
    }

    return result;
  }
}

async function main(): Promise<void> {
  program
    .name('automated-deployment')
    .description('GhostSpeak automated deployment system')
    .requiredOption('-e, --environment <env>', 'Target environment (devnet|testnet|mainnet)')
    .option('-p, --program-id <id>', 'Existing program ID for upgrades')
    .option('--skip-tests', 'Skip quality checks and tests')
    .option('--skip-health-check', 'Skip post-deployment health check')
    .option('--auto-confirm', 'Auto-confirm prompts (use with caution)')
    .option('--backup-first', 'Create backup before deployment')
    .parse();

  const options = program.opts();

  // Validate environment
  if (!['devnet', 'testnet', 'mainnet'].includes(options.environment)) {
    console.error(chalk.red('Invalid environment. Must be: devnet, testnet, or mainnet'));
    process.exit(1);
  }

  // Safety check for mainnet
  if (options.environment === 'mainnet' && !options.autoConfirm) {
    console.log(chalk.yellow.bold('⚠️  WARNING: You are about to deploy to MAINNET!'));
    console.log(chalk.yellow('This will use real SOL and deploy to the production network.'));
    console.log(chalk.yellow('Make sure you have thoroughly tested on devnet/testnet first.\n'));
    
    // In a real implementation, you'd want to add interactive confirmation here
    console.log(chalk.red('Mainnet deployment requires --auto-confirm flag for safety'));
    process.exit(1);
  }

  const config: DeploymentConfig = {
    environment: options.environment,
    programId: options.programId,
    skipTests: options.skipTests,
    skipHealthCheck: options.skipHealthCheck,
    autoConfirm: options.autoConfirm,
    backupFirst: options.backupFirst
  };

  const deployment = new AutomatedDeployment(config);
  
  try {
    const result = await deployment.deploy();
    console.log(chalk.green(`\n🎉 Deployment to ${result.environment} completed successfully!`));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`\n💥 Deployment failed: ${error}`));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Deployment system error:'), error);
    process.exit(1);
  });
}

export { AutomatedDeployment, DeploymentConfig, DeploymentResult };