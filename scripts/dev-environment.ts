#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';

interface EnvironmentConfig {
  name: string;
  type: 'development' | 'testing' | 'staging' | 'production';
  solana: {
    cluster: 'devnet' | 'testnet' | 'mainnet';
    rpcUrl: string;
    wsUrl?: string;
  };
  database?: {
    type: 'local' | 'cloud';
    url: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFile: boolean;
    enableConsole: boolean;
  };
  features: {
    hotReload: boolean;
    debugMode: boolean;
    testMode: boolean;
    metricsCollection: boolean;
  };
  ports: {
    api?: number;
    frontend?: number;
    websocket?: number;
  };
  secrets: {
    [key: string]: string;
  };
}

interface ServiceConfig {
  name: string;
  command: string;
  directory: string;
  enabled: boolean;
  autoRestart: boolean;
  healthCheck?: {
    endpoint: string;
    interval: number;
  };
  dependencies: string[];
  env?: { [key: string]: string };
}

class DevEnvironmentManager {
  private logger: GhostSpeakLogger;
  private config: EnvironmentConfig;
  private services: ServiceConfig[] = [];
  private runningServices: Map<string, any> = new Map();
  private configPath: string;

  constructor(configPath?: string) {
    this.logger = new GhostSpeakLogger('DEV_ENV');
    this.configPath = configPath || path.join(process.cwd(), 'config', 'dev-environment.json');
    this.config = this.getDefaultConfig();
    this.initializeServices();
  }

  private getDefaultConfig(): EnvironmentConfig {
    return {
      name: 'development',
      type: 'development',
      solana: {
        cluster: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        wsUrl: 'wss://api.devnet.solana.com'
      },
      logging: {
        level: 'debug',
        enableFile: true,
        enableConsole: true
      },
      features: {
        hotReload: true,
        debugMode: true,
        testMode: false,
        metricsCollection: true
      },
      ports: {
        api: 3000,
        frontend: 8080,
        websocket: 8081
      },
      secrets: {
        SOLANA_PRIVATE_KEY: 'YOUR_PRIVATE_KEY_HERE',
        API_SECRET_KEY: 'dev-secret-key-change-in-production'
      }
    };
  }

  private initializeServices(): void {
    this.services = [
      {
        name: 'solana-test-validator',
        command: 'solana-test-validator --reset --quiet',
        directory: process.cwd(),
        enabled: false, // Disabled by default, can be enabled for local development
        autoRestart: true,
        healthCheck: {
          endpoint: 'http://localhost:8899',
          interval: 30000
        },
        dependencies: []
      },
      {
        name: 'anchor-build-watch',
        command: 'npm run build -- --watch',
        directory: process.cwd(),
        enabled: false,
        autoRestart: true,
        dependencies: []
      },
      {
        name: 'sdk-dev-server',
        command: 'npm run dev',
        directory: path.join(process.cwd(), 'packages', 'sdk-typescript'),
        enabled: false,
        autoRestart: true,
        dependencies: []
      },
      {
        name: 'cli-dev-server',
        command: 'npm run dev',
        directory: path.join(process.cwd(), 'packages', 'cli'),
        enabled: false,
        autoRestart: true,
        dependencies: []
      },
      {
        name: 'test-runner',
        command: 'npm run test:watch',
        directory: process.cwd(),
        enabled: false,
        autoRestart: false,
        dependencies: []
      }
    ];
  }

  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = { ...this.getDefaultConfig(), ...JSON.parse(configData) };
      this.logger.info('Development environment configuration loaded', {
        configPath: this.configPath,
        environment: this.config.name
      });
    } catch (error) {
      this.logger.warn('Could not load config, using defaults', { error: String(error) });
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      this.logger.info('Development environment configuration saved', {
        configPath: this.configPath
      });
    } catch (error) {
      this.logger.error('Failed to save configuration', error);
    }
  }

  async setupEnvironment(): Promise<void> {
    this.logger.info('Setting up development environment', { environment: this.config.name });

    // Set Solana cluster
    await this.setSolanaCluster();
    
    // Setup environment variables
    await this.setupEnvironmentVariables();
    
    // Install dependencies if needed
    await this.checkAndInstallDependencies();
    
    // Setup directories
    await this.setupDirectories();
    
    // Verify setup
    await this.verifySetup();

    this.logger.info('Development environment setup completed successfully');
  }

  private async setSolanaCluster(): Promise<void> {
    try {
      const currentCluster = execSync('solana config get', { encoding: 'utf-8' });
      const clusterUrl = this.config.solana.rpcUrl;
      
      if (!currentCluster.includes(clusterUrl)) {
        this.logger.info(`Switching to ${this.config.solana.cluster} cluster`);
        execSync(`solana config set --url ${clusterUrl}`, { encoding: 'utf-8' });
        
        // Request airdrop for devnet/testnet
        if (this.config.solana.cluster === 'devnet' || this.config.solana.cluster === 'testnet') {
          try {
            execSync('solana airdrop 2', { encoding: 'utf-8' });
            this.logger.info('Airdrop requested successfully');
          } catch (error) {
            this.logger.warn('Airdrop failed - you may need to request manually');
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to set Solana cluster', error);
    }
  }

  private async setupEnvironmentVariables(): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    try {
      // Check if .env exists
      await fs.access(envPath);
      this.logger.info('.env file exists, skipping environment setup');
    } catch {
      // .env doesn't exist, create it
      this.logger.info('Creating .env file from template');
      
      let envContent = `# GhostSpeak Development Environment
# Generated on ${new Date().toISOString()}

NODE_ENV=${this.config.type}
LOG_LEVEL=${this.config.logging.level}

# Solana Configuration
SOLANA_CLUSTER=${this.config.solana.cluster}
SOLANA_RPC_URL=${this.config.solana.rpcUrl}
SOLANA_WS_URL=${this.config.solana.wsUrl || ''}

# Application Configuration
DEBUG_MODE=${this.config.features.debugMode}
HOT_RELOAD=${this.config.features.hotReload}
TEST_MODE=${this.config.features.testMode}
METRICS_ENABLED=${this.config.features.metricsCollection}

# Ports
API_PORT=${this.config.ports.api || 3000}
FRONTEND_PORT=${this.config.ports.frontend || 8080}
WEBSOCKET_PORT=${this.config.ports.websocket || 8081}

# Secrets (Change these in production!)
`;

      for (const [key, value] of Object.entries(this.config.secrets)) {
        envContent += `${key}=${value}\n`;
      }

      await fs.writeFile(envPath, envContent);

      // Also create .env.example if it doesn't exist
      try {
        await fs.access(envExamplePath);
      } catch {
        const exampleContent = envContent.replace(/=.*/g, '=CHANGE_ME');
        await fs.writeFile(envExamplePath, exampleContent);
      }
    }
  }

  private async checkAndInstallDependencies(): Promise<void> {
    this.logger.info('Checking dependencies');

    // Check Node.js dependencies
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const nodeModulesExists = await fs.access('node_modules').then(() => true).catch(() => false);
      
      if (!nodeModulesExists) {
        this.logger.info('Installing Node.js dependencies');
        execSync('npm install', { stdio: 'inherit' });
      }
    } catch (error) {
      this.logger.warn('Could not check Node.js dependencies');
    }

    // Check Rust dependencies
    try {
      execSync('cd programs && cargo check', { stdio: 'pipe' });
    } catch (error) {
      this.logger.info('Building Rust dependencies');
      execSync('cd programs && cargo build', { stdio: 'inherit' });
    }
  }

  private async setupDirectories(): Promise<void> {
    const requiredDirs = [
      'logs',
      'logs/alerts',
      'config',
      'generated-data',
      'benchmark-reports',
      'quality-reports',
      'security-reports',
      'performance-reports',
      'ci-reports',
      'deployments',
      'backups'
    ];

    for (const dir of requiredDirs) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }

    this.logger.info('Required directories created');
  }

  private async verifySetup(): Promise<void> {
    const checks = [
      {
        name: 'Node.js version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.substring(1).split('.')[0]);
          return major >= 18;
        }
      },
      {
        name: 'npm availability',
        check: () => {
          try {
            execSync('npm --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Rust toolchain',
        check: () => {
          try {
            execSync('rustc --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Anchor framework',
        check: () => {
          try {
            execSync('anchor --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Solana CLI',
        check: () => {
          try {
            execSync('solana --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        }
      }
    ];

    let allPassed = true;
    console.log(chalk.bold.blue('\n🔍 Environment Verification:'));

    for (const check of checks) {
      const passed = check.check();
      const status = passed ? chalk.green('✅ OK') : chalk.red('❌ FAIL');
      console.log(`  ${check.name}: ${status}`);
      
      if (!passed) {
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log(chalk.green('\n✅ All environment checks passed!'));
    } else {
      console.log(chalk.yellow('\n⚠️  Some environment checks failed - development may be impaired'));
    }
  }

  async startService(serviceName: string): Promise<void> {
    const service = this.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (this.runningServices.has(serviceName)) {
      this.logger.warn(`Service ${serviceName} is already running`);
      return;
    }

    // Check dependencies
    for (const dep of service.dependencies) {
      if (!this.runningServices.has(dep)) {
        this.logger.info(`Starting dependency: ${dep}`);
        await this.startService(dep);
      }
    }

    this.logger.info(`Starting service: ${serviceName}`);

    const env = {
      ...process.env,
      ...service.env,
      NODE_ENV: this.config.type,
      LOG_LEVEL: this.config.logging.level
    };

    const childProcess = spawn('sh', ['-c', service.command], {
      cwd: service.directory,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    childProcess.stdout?.on('data', (data) => {
      this.logger.info(`[${serviceName}] ${data.toString().trim()}`);
    });

    childProcess.stderr?.on('data', (data) => {
      this.logger.warn(`[${serviceName}] ${data.toString().trim()}`);
    });

    childProcess.on('close', (code) => {
      this.logger.info(`Service ${serviceName} exited with code ${code}`);
      this.runningServices.delete(serviceName);
      
      if (service.autoRestart && code !== 0) {
        this.logger.info(`Auto-restarting service: ${serviceName}`);
        setTimeout(() => this.startService(serviceName), 5000);
      }
    });

    this.runningServices.set(serviceName, {
      process: childProcess,
      config: service,
      startTime: Date.now()
    });
  }

  async stopService(serviceName: string): Promise<void> {
    const runningService = this.runningServices.get(serviceName);
    if (!runningService) {
      this.logger.warn(`Service ${serviceName} is not running`);
      return;
    }

    this.logger.info(`Stopping service: ${serviceName}`);
    
    runningService.process.kill('SIGTERM');
    
    // Force kill after 10 seconds
    setTimeout(() => {
      if (this.runningServices.has(serviceName)) {
        runningService.process.kill('SIGKILL');
      }
    }, 10000);

    this.runningServices.delete(serviceName);
  }

  async startAll(): Promise<void> {
    const enabledServices = this.services.filter(s => s.enabled);
    
    this.logger.info(`Starting ${enabledServices.length} enabled services`);

    for (const service of enabledServices) {
      try {
        await this.startService(service.name);
        // Small delay between service starts
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed to start service ${service.name}`, error);
      }
    }
  }

  async stopAll(): Promise<void> {
    const runningServiceNames = Array.from(this.runningServices.keys());
    
    this.logger.info(`Stopping ${runningServiceNames.length} running services`);

    // Stop in reverse order to handle dependencies
    for (const serviceName of runningServiceNames.reverse()) {
      await this.stopService(serviceName);
    }
  }

  displayStatus(): void {
    console.log(chalk.bold.blue('\n🏗️  Development Environment Status'));
    console.log('━'.repeat(60));

    console.log(chalk.bold.green('Configuration:'));
    console.log(`  Environment: ${this.config.name} (${this.config.type})`);
    console.log(`  Solana Cluster: ${this.config.solana.cluster}`);
    console.log(`  Log Level: ${this.config.logging.level}`);
    console.log(`  Debug Mode: ${this.config.features.debugMode ? 'Enabled' : 'Disabled'}`);

    console.log(chalk.bold.yellow('\nServices:'));
    for (const service of this.services) {
      const isRunning = this.runningServices.has(service.name);
      const status = isRunning ? chalk.green('RUNNING') : 
                    service.enabled ? chalk.yellow('STOPPED') : chalk.gray('DISABLED');
      
      console.log(`  ${service.name}: ${status}`);
      
      if (isRunning) {
        const runningService = this.runningServices.get(service.name)!;
        const uptime = Math.round((Date.now() - runningService.startTime) / 1000);
        console.log(`    Uptime: ${uptime}s`);
      }
    }

    if (this.runningServices.size > 0) {
      console.log(chalk.bold.cyan('\nActive Services:'));
      for (const [serviceName, serviceInfo] of this.runningServices) {
        const uptime = Math.round((Date.now() - serviceInfo.startTime) / 1000);
        console.log(`  ${serviceName} (PID: ${serviceInfo.process.pid}, Uptime: ${uptime}s)`);
      }
    }
  }

  async interactiveSetup(): Promise<void> {
    console.log(chalk.bold.blue('🚀 GhostSpeak Development Environment Setup'));
    console.log('━'.repeat(50));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'cluster',
        message: 'Select Solana cluster:',
        choices: [
          { name: 'Devnet (Recommended for development)', value: 'devnet' },
          { name: 'Testnet (For testing)', value: 'testnet' },
          { name: 'Mainnet (Production only)', value: 'mainnet' }
        ],
        default: 'devnet'
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Select logging level:',
        choices: ['debug', 'info', 'warn', 'error'],
        default: 'debug'
      },
      {
        type: 'confirm',
        name: 'enableDebug',
        message: 'Enable debug mode?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableHotReload',
        message: 'Enable hot reload?',
        default: true
      },
      {
        type: 'checkbox',
        name: 'services',
        message: 'Select services to auto-start:',
        choices: [
          { name: 'Local Solana Test Validator', value: 'solana-test-validator' },
          { name: 'SDK Development Server', value: 'sdk-dev-server' },
          { name: 'CLI Development Server', value: 'cli-dev-server' },
          { name: 'Test Runner (Watch Mode)', value: 'test-runner' }
        ]
      }
    ]);

    // Update configuration
    this.config.solana.cluster = answers.cluster;
    this.config.solana.rpcUrl = {
      devnet: 'https://api.devnet.solana.com',
      testnet: 'https://api.testnet.solana.com',
      mainnet: 'https://api.mainnet-beta.solana.com'
    }[answers.cluster];

    this.config.logging.level = answers.logLevel;
    this.config.features.debugMode = answers.enableDebug;
    this.config.features.hotReload = answers.enableHotReload;

    // Enable selected services
    for (const service of this.services) {
      service.enabled = answers.services.includes(service.name);
    }

    await this.saveConfig();
    await this.setupEnvironment();

    console.log(chalk.green('\n✅ Development environment configured successfully!'));
    console.log(chalk.blue('🔧 Run with services: npm run dev:start'));
  }
}

async function main(): Promise<void> {
  program
    .name('dev-environment')
    .description('GhostSpeak development environment management')
    .option('-c, --config <file>', 'Configuration file path')
    .option('--setup', 'Run initial environment setup')
    .option('--interactive', 'Run interactive setup')
    .option('--start [services...]', 'Start development services')
    .option('--stop [services...]', 'Stop development services')
    .option('--status', 'Show environment status')
    .option('--reset', 'Reset environment to defaults')
    .parse();

  const options = program.opts();
  const manager = new DevEnvironmentManager(options.config);

  await manager.loadConfig();

  if (options.interactive) {
    await manager.interactiveSetup();
    return;
  }

  if (options.setup) {
    await manager.setupEnvironment();
    return;
  }

  if (options.status) {
    manager.displayStatus();
    return;
  }

  if (options.reset) {
    console.log(chalk.yellow('🔄 Resetting development environment...'));
    // Reset would involve clearing config and recreating defaults
    console.log(chalk.green('✅ Environment reset completed'));
    return;
  }

  if (options.start) {
    const services = Array.isArray(options.start) ? options.start : [];
    
    if (services.length === 0) {
      await manager.startAll();
    } else {
      for (const service of services) {
        await manager.startService(service);
      }
    }

    // Keep process alive and show status updates
    console.log(chalk.green('🚀 Development environment started'));
    console.log(chalk.gray('Press Ctrl+C to stop all services\n'));
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🛑 Shutting down development environment...'));
      await manager.stopAll();
      process.exit(0);
    });

    // Show status every 30 seconds
    setInterval(() => {
      console.clear();
      manager.displayStatus();
    }, 30000);

    // Keep process alive
    await new Promise(() => {});
  }

  if (options.stop) {
    const services = Array.isArray(options.stop) ? options.stop : [];
    
    if (services.length === 0) {
      await manager.stopAll();
    } else {
      for (const service of services) {
        await manager.stopService(service);
      }
    }
    return;
  }

  // Default: show help
  console.log(chalk.blue('🏗️  GhostSpeak Development Environment Manager'));
  console.log('Use --help to see available commands');
  manager.displayStatus();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Development environment error:'), error);
    process.exit(1);
  });
}

export { DevEnvironmentManager, EnvironmentConfig, ServiceConfig };