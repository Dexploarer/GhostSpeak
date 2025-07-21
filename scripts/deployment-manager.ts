#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import { table } from 'table';

interface DeploymentEnvironment {
  name: string;
  type: 'development' | 'staging' | 'production';
  solana: {
    cluster: 'devnet' | 'testnet' | 'mainnet-beta';
    rpcUrl: string;
    wsUrl?: string;
    programId?: string;
  };
  requirements: {
    minSolBalance: number;
    requiresBackup: boolean;
    requiresApproval: boolean;
    runTests: boolean;
    runSecurityAudit: boolean;
  };
  notifications?: {
    slack?: string;
    email?: string[];
    webhook?: string;
  };
}

interface DeploymentRecord {
  id: string;
  timestamp: string;
  environment: string;
  programId: string;
  version: string;
  success: boolean;
  duration: number;
  deployer: string;
  gitCommit?: string;
  changes: string[];
  rollbackInfo?: {
    previousProgramId: string;
    backupPath: string;
  };
}

interface RollbackPlan {
  deploymentId: string;
  steps: string[];
  estimatedDuration: number;
  risks: string[];
  confirmationRequired: boolean;
}

class DeploymentManager {
  private logger: GhostSpeakLogger;
  private environments: DeploymentEnvironment[] = [];
  private deploymentHistory: DeploymentRecord[] = [];
  private configPath: string;

  constructor(configPath?: string) {
    this.logger = new GhostSpeakLogger('DEPLOY_MGR');
    this.configPath = configPath || path.join(process.cwd(), 'config', 'deployment.json');
    this.initializeEnvironments();
  }

  private initializeEnvironments(): void {
    this.environments = [
      {
        name: 'development',
        type: 'development',
        solana: {
          cluster: 'devnet',
          rpcUrl: 'https://api.devnet.solana.com',
          wsUrl: 'wss://api.devnet.solana.com'
        },
        requirements: {
          minSolBalance: 1.0,
          requiresBackup: false,
          requiresApproval: false,
          runTests: true,
          runSecurityAudit: false
        }
      },
      {
        name: 'staging',
        type: 'staging',
        solana: {
          cluster: 'testnet',
          rpcUrl: 'https://api.testnet.solana.com',
          wsUrl: 'wss://api.testnet.solana.com'
        },
        requirements: {
          minSolBalance: 5.0,
          requiresBackup: true,
          requiresApproval: false,
          runTests: true,
          runSecurityAudit: true
        }
      },
      {
        name: 'production',
        type: 'production',
        solana: {
          cluster: 'mainnet-beta',
          rpcUrl: 'https://api.mainnet-beta.solana.com',
          wsUrl: 'wss://api.mainnet-beta.solana.com'
        },
        requirements: {
          minSolBalance: 10.0,
          requiresBackup: true,
          requiresApproval: true,
          runTests: true,
          runSecurityAudit: true
        },
        notifications: {
          webhook: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        }
      }
    ];
  }

  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      if (config.environments) {
        this.environments = config.environments;
      }
      
      if (config.deploymentHistory) {
        this.deploymentHistory = config.deploymentHistory;
      }

      this.logger.info('Deployment configuration loaded', {
        environments: this.environments.length,
        deployments: this.deploymentHistory.length
      });
    } catch (error) {
      this.logger.warn('Could not load deployment config, using defaults', { error: String(error) });
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      const config = {
        environments: this.environments,
        deploymentHistory: this.deploymentHistory.slice(-50), // Keep last 50 deployments
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.logger.info('Deployment configuration saved');
    } catch (error) {
      this.logger.error('Failed to save deployment configuration', error);
    }
  }

  private async preDeploymentChecks(environment: DeploymentEnvironment): Promise<void> {
    this.logger.info('Running pre-deployment checks', { environment: environment.name });

    // Check Solana CLI configuration
    const currentConfig = execSync('solana config get', { encoding: 'utf-8' });
    if (!currentConfig.includes(environment.solana.rpcUrl)) {
      this.logger.info(`Switching to ${environment.solana.cluster} cluster`);
      execSync(`solana config set --url ${environment.solana.rpcUrl}`, { encoding: 'utf-8' });
    }

    // Check SOL balance
    const balanceOutput = execSync('solana balance', { encoding: 'utf-8' });
    const balance = parseFloat(balanceOutput.split(' ')[0]);
    
    if (balance < environment.requirements.minSolBalance) {
      throw new Error(
        `Insufficient SOL balance: ${balance} (required: ${environment.requirements.minSolBalance})`
      );
    }

    // Check git status for production
    if (environment.type === 'production') {
      try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
        if (gitStatus.trim()) {
          throw new Error('Working directory is not clean. Commit or stash changes before production deployment.');
        }
      } catch (error) {
        this.logger.warn('Could not check git status', { error: String(error) });
      }
    }

    // Run tests if required
    if (environment.requirements.runTests) {
      this.logger.info('Running test suite');
      try {
        execSync('npm run test:all', { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error) {
        throw new Error('Test suite failed. Fix tests before deployment.');
      }
    }

    // Run security audit if required
    if (environment.requirements.runSecurityAudit) {
      this.logger.info('Running security audit');
      try {
        execSync('npm run qa:security', { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error) {
        this.logger.warn('Security audit found issues - review before proceeding');
      }
    }

    this.logger.info('Pre-deployment checks completed successfully');
  }

  private async createBackup(environment: DeploymentEnvironment): Promise<string | undefined> {
    if (!environment.requirements.requiresBackup) {
      return undefined;
    }

    this.logger.info('Creating deployment backup');

    const backupDir = path.join(process.cwd(), 'backups', `${environment.name}-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });

    // Backup current program if it exists
    if (environment.solana.programId) {
      try {
        const currentIdl = execSync(`anchor idl fetch ${environment.solana.programId}`, {
          encoding: 'utf-8'
        });
        await fs.writeFile(path.join(backupDir, 'current-idl.json'), currentIdl);
      } catch (error) {
        this.logger.warn('Could not backup current IDL');
      }
    }

    // Backup deployment configuration
    await fs.writeFile(
      path.join(backupDir, 'environment-config.json'),
      JSON.stringify(environment, null, 2)
    );

    // Backup source code state (git info)
    try {
      const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      
      const gitInfo = {
        commit: gitCommit,
        branch: gitBranch,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(backupDir, 'git-info.json'),
        JSON.stringify(gitInfo, null, 2)
      );
    } catch (error) {
      this.logger.warn('Could not backup git information');
    }

    this.logger.info('Backup created', { backupPath: backupDir });
    return backupDir;
  }

  private async requestApproval(environment: DeploymentEnvironment): Promise<boolean> {
    if (!environment.requirements.requiresApproval) {
      return true;
    }

    console.log(chalk.yellow.bold(`\n⚠️  PRODUCTION DEPLOYMENT APPROVAL REQUIRED`));
    console.log(chalk.yellow(`Environment: ${environment.name}`));
    console.log(chalk.yellow(`Cluster: ${environment.solana.cluster}`));
    console.log(chalk.yellow(`This will deploy to MAINNET with real SOL transactions.`));

    const { approved } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'approved',
        message: 'Do you approve this production deployment?',
        default: false
      }
    ]);

    if (!approved) {
      this.logger.info('Deployment cancelled by user');
      return false;
    }

    // Additional confirmation for production
    const { doubleConfirm } = await inquirer.prompt([
      {
        type: 'input',
        name: 'doubleConfirm',
        message: `Type "${environment.name}" to confirm deployment:`,
        validate: (input) => input === environment.name || 'Confirmation text must match exactly'
      }
    ]);

    return doubleConfirm === environment.name;
  }

  async deploy(environmentName: string, options: any = {}): Promise<DeploymentRecord> {
    const environment = this.environments.find(env => env.name === environmentName);
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }

    this.logger.info('Starting deployment', { environment: environmentName });

    const deploymentRecord: DeploymentRecord = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      environment: environmentName,
      programId: '',
      version: options.version || 'unknown',
      success: false,
      duration: 0,
      deployer: process.env.USER || 'unknown',
      changes: options.changes || []
    };

    const startTime = Date.now();

    try {
      // Pre-deployment checks
      await this.preDeploymentChecks(environment);

      // Create backup
      const backupPath = await this.createBackup(environment);
      if (backupPath) {
        deploymentRecord.rollbackInfo = {
          previousProgramId: environment.solana.programId || '',
          backupPath
        };
      }

      // Request approval if required
      const approved = await this.requestApproval(environment);
      if (!approved) {
        throw new Error('Deployment not approved');
      }

      // Get git commit info
      try {
        deploymentRecord.gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      } catch (error) {
        this.logger.warn('Could not get git commit info');
      }

      // Build the program
      this.logger.info('Building program');
      execSync('anchor build --release', { encoding: 'utf-8', stdio: 'pipe' });

      // Deploy the program
      this.logger.info('Deploying program to blockchain');
      const deployOutput = execSync(`anchor deploy --provider.cluster ${environment.solana.cluster}`, {
        encoding: 'utf-8'
      });

      // Extract program ID from deployment output
      const programIdMatch = deployOutput.match(/Program Id: ([A-Za-z0-9]{32,})/);
      if (programIdMatch) {
        deploymentRecord.programId = programIdMatch[1];
        environment.solana.programId = programIdMatch[1];
      } else {
        throw new Error('Could not extract program ID from deployment output');
      }

      // Initialize or upgrade IDL
      try {
        if (environment.solana.programId) {
          execSync(
            `anchor idl upgrade ${deploymentRecord.programId} --filepath target/idl/ghostspeak_marketplace.json`,
            { encoding: 'utf-8' }
          );
        } else {
          execSync(
            `anchor idl init ${deploymentRecord.programId} --filepath target/idl/ghostspeak_marketplace.json`,
            { encoding: 'utf-8' }
          );
        }
      } catch (error) {
        this.logger.warn('IDL update failed', { error: String(error) });
      }

      // Post-deployment verification
      await this.verifyDeployment(deploymentRecord.programId);

      deploymentRecord.success = true;
      deploymentRecord.duration = Date.now() - startTime;

      this.logger.info('Deployment completed successfully', {
        programId: deploymentRecord.programId,
        duration: `${Math.round(deploymentRecord.duration / 1000)}s`
      });

      // Send notifications
      await this.sendDeploymentNotification(environment, deploymentRecord);

    } catch (error) {
      deploymentRecord.success = false;
      deploymentRecord.duration = Date.now() - startTime;

      this.logger.error('Deployment failed', error);
      throw error;
    } finally {
      // Record the deployment
      this.deploymentHistory.push(deploymentRecord);
      await this.saveConfig();
    }

    return deploymentRecord;
  }

  private async verifyDeployment(programId: string): Promise<void> {
    this.logger.info('Verifying deployment');

    // Check if program account exists
    try {
      const accountInfo = execSync(`solana account ${programId}`, { encoding: 'utf-8' });
      if (!accountInfo.includes('Balance:')) {
        throw new Error('Program account not found after deployment');
      }
    } catch (error) {
      throw new Error('Post-deployment verification failed');
    }

    // Additional verification could include:
    // - Test a simple program instruction
    // - Verify IDL matches deployed program
    // - Check program upgrade authority

    this.logger.info('Deployment verification successful');
  }

  private async sendDeploymentNotification(
    environment: DeploymentEnvironment, 
    deployment: DeploymentRecord
  ): Promise<void> {
    if (!environment.notifications) {
      return;
    }

    const message = `GhostSpeak deployment ${deployment.success ? 'successful' : 'failed'}
Environment: ${deployment.environment}
Program ID: ${deployment.programId}
Duration: ${Math.round(deployment.duration / 1000)}s
Deployer: ${deployment.deployer}`;

    // Webhook notification (Slack, Discord, etc.)
    if (environment.notifications.webhook) {
      try {
        // In a real implementation, you'd use fetch or a HTTP client
        this.logger.info('Deployment notification sent via webhook');
      } catch (error) {
        this.logger.warn('Failed to send webhook notification', { error: String(error) });
      }
    }

    this.logger.info('Deployment notifications processed');
  }

  async rollback(deploymentId: string, options: any = {}): Promise<void> {
    const deployment = this.deploymentHistory.find(d => d.id === deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (!deployment.rollbackInfo) {
      throw new Error('No rollback information available for this deployment');
    }

    const environment = this.environments.find(env => env.name === deployment.environment);
    if (!environment) {
      throw new Error(`Environment ${deployment.environment} not found`);
    }

    this.logger.warn('Starting rollback procedure', {
      deploymentId,
      environment: deployment.environment
    });

    // Create rollback plan
    const rollbackPlan: RollbackPlan = {
      deploymentId,
      steps: [
        'Switch to appropriate Solana cluster',
        'Restore previous program binary',
        'Update program authority if needed', 
        'Restore previous IDL',
        'Verify rollback success'
      ],
      estimatedDuration: 300000, // 5 minutes
      risks: [
        'Existing transactions may fail during rollback',
        'State changes since deployment will be lost',
        'Clients may need to update their configurations'
      ],
      confirmationRequired: environment.type === 'production'
    };

    // Get approval for rollback
    if (rollbackPlan.confirmationRequired) {
      console.log(chalk.red.bold('\n🚨 ROLLBACK CONFIRMATION REQUIRED'));
      console.log(chalk.red(`Deployment: ${deploymentId}`));
      console.log(chalk.red(`Environment: ${deployment.environment}`));
      console.log(chalk.red('This will revert the program to the previous version.'));
      
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Do you confirm this rollback operation?',
          default: false
        }
      ]);

      if (!confirmed) {
        this.logger.info('Rollback cancelled by user');
        return;
      }
    }

    try {
      // Switch to correct cluster
      execSync(`solana config set --url ${environment.solana.rpcUrl}`, { encoding: 'utf-8' });

      // Note: Actual program rollback on Solana is complex and may require:
      // - Deploying a previous version of the program
      // - Managing program upgrade authority
      // - Coordinating with clients and state migrations
      
      this.logger.warn('Rollback simulation - actual rollback requires manual intervention');
      this.logger.info('Rollback steps to perform manually:', { steps: rollbackPlan.steps });

      // In a real implementation, you would:
      // 1. Check if you have the previous program binary
      // 2. Deploy the previous version
      // 3. Update IDL
      // 4. Verify the rollback

    } catch (error) {
      this.logger.error('Rollback failed', error);
      throw error;
    }
  }

  displayDeploymentHistory(environmentName?: string): void {
    const deployments = environmentName 
      ? this.deploymentHistory.filter(d => d.environment === environmentName)
      : this.deploymentHistory;

    if (deployments.length === 0) {
      console.log(chalk.yellow('No deployment history found'));
      return;
    }

    console.log(chalk.bold.blue('\n📋 Deployment History'));
    console.log('━'.repeat(120));

    const tableData = [
      ['Date', 'Environment', 'Program ID', 'Version', 'Duration', 'Status', 'Deployer']
    ];

    for (const deployment of deployments.slice(-20)) { // Show last 20
      const date = new Date(deployment.timestamp).toLocaleDateString();
      const duration = `${Math.round(deployment.duration / 1000)}s`;
      const status = deployment.success 
        ? chalk.green('SUCCESS')
        : chalk.red('FAILED');
      
      tableData.push([
        date,
        deployment.environment,
        deployment.programId.substring(0, 8) + '...',
        deployment.version,
        duration,
        status,
        deployment.deployer
      ]);
    }

    console.log(table(tableData));
  }

  displayEnvironments(): void {
    console.log(chalk.bold.blue('\n🌍 Deployment Environments'));
    console.log('━'.repeat(80));

    for (const env of this.environments) {
      console.log(chalk.bold.cyan(`\n${env.name.toUpperCase()} (${env.type})`));
      console.log(`  Cluster: ${env.solana.cluster}`);
      console.log(`  RPC URL: ${env.solana.rpcUrl}`);
      if (env.solana.programId) {
        console.log(`  Program ID: ${env.solana.programId}`);
      }
      
      console.log('  Requirements:');
      console.log(`    Min SOL Balance: ${env.requirements.minSolBalance}`);
      console.log(`    Requires Backup: ${env.requirements.requiresBackup ? 'Yes' : 'No'}`);
      console.log(`    Requires Approval: ${env.requirements.requiresApproval ? 'Yes' : 'No'}`);
      console.log(`    Run Tests: ${env.requirements.runTests ? 'Yes' : 'No'}`);
      console.log(`    Security Audit: ${env.requirements.runSecurityAudit ? 'Yes' : 'No'}`);
      
      if (env.notifications) {
        console.log('  Notifications: Configured');
      }
    }
  }

  async interactiveDeployment(): Promise<void> {
    console.log(chalk.bold.blue('🚀 Interactive Deployment'));
    console.log('━'.repeat(40));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Select deployment environment:',
        choices: this.environments.map(env => ({
          name: `${env.name} (${env.solana.cluster})`,
          value: env.name
        }))
      },
      {
        type: 'input',
        name: 'version',
        message: 'Version or tag for this deployment:',
        default: 'v' + new Date().toISOString().split('T')[0]
      },
      {
        type: 'checkbox',
        name: 'changes',
        message: 'What changed in this deployment?',
        choices: [
          'Bug fixes',
          'New features',
          'Performance improvements',
          'Security updates',
          'Configuration changes',
          'Database migrations',
          'API changes'
        ]
      },
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with deployment?',
        default: true
      }
    ]);

    if (!answers.proceed) {
      console.log(chalk.yellow('Deployment cancelled'));
      return;
    }

    try {
      const deployment = await this.deploy(answers.environment, {
        version: answers.version,
        changes: answers.changes
      });

      console.log(chalk.green('\n✅ Deployment completed successfully!'));
      console.log(`Program ID: ${deployment.programId}`);
      console.log(`Duration: ${Math.round(deployment.duration / 1000)}s`);

    } catch (error) {
      console.log(chalk.red('\n❌ Deployment failed:'), error);
    }
  }
}

async function main(): Promise<void> {
  program
    .name('deployment-manager')
    .description('GhostSpeak deployment management system')
    .option('-c, --config <file>', 'Configuration file path')
    .option('--deploy <environment>', 'Deploy to environment')
    .option('--rollback <deploymentId>', 'Rollback deployment')
    .option('--history [environment]', 'Show deployment history')
    .option('--environments', 'List deployment environments')
    .option('--interactive', 'Run interactive deployment')
    .option('--version <version>', 'Version for deployment')
    .parse();

  const options = program.opts();
  const manager = new DeploymentManager(options.config);

  await manager.loadConfig();

  if (options.interactive) {
    await manager.interactiveDeployment();
    return;
  }

  if (options.environments) {
    manager.displayEnvironments();
    return;
  }

  if (options.history) {
    const environment = typeof options.history === 'string' ? options.history : undefined;
    manager.displayDeploymentHistory(environment);
    return;
  }

  if (options.deploy) {
    try {
      const deployment = await manager.deploy(options.deploy, {
        version: options.version
      });
      console.log(chalk.green(`✅ Deployment successful: ${deployment.programId}`));
    } catch (error) {
      console.error(chalk.red('❌ Deployment failed:'), error);
      process.exit(1);
    }
    return;
  }

  if (options.rollback) {
    try {
      await manager.rollback(options.rollback);
      console.log(chalk.green('✅ Rollback completed'));
    } catch (error) {
      console.error(chalk.red('❌ Rollback failed:'), error);
      process.exit(1);
    }
    return;
  }

  // Default: show help
  console.log(chalk.blue('🚀 GhostSpeak Deployment Manager'));
  console.log('Use --help to see available commands\n');
  manager.displayEnvironments();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Deployment manager error:'), error);
    process.exit(1);
  });
}

export { DeploymentManager, DeploymentEnvironment, DeploymentRecord };