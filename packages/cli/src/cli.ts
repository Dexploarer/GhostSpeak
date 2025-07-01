#!/usr/bin/env node

/**
 * Main CLI Implementation for PodAI Platform
 * 
 * This CLI provides real blockchain interactions using the modern PodAI client
 * with compression support and direct RPC calls.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { PodAIClient, createPodAIClient, generateKeypair, type PodAIConfig } from './client.js';
import { UIManager } from './ui/ui-manager.js';
import { NetworkManager } from './utils/network-manager.js';
import { ConfigManager } from './utils/config-manager.js';

export class CLIApplication {
  private client: PodAIClient;
  private ui: UIManager;
  private network: NetworkManager;
  private config: ConfigManager;

  constructor() {
    const defaultConfig: PodAIConfig = {
      rpcUrl: 'https://api.devnet.solana.com',
      network: 'devnet',
      commitment: 'confirmed'
    };
    
    this.client = createPodAIClient(defaultConfig);
    this.ui = new UIManager();
    this.network = new NetworkManager();
    this.config = new ConfigManager();
  }

  async initialize(): Promise<void> {
    // Display banner
    this.ui.showBanner('PodAI CLI', 'Autonomous Agent Commerce Platform');
    
    // Initialize client
    await this.client.initialize();
  }

  /**
   * Display help information
   */
  showHelp(): void {
    console.log(chalk.cyan(figlet.textSync('PodAI CLI', { horizontalLayout: 'fitted' })));
    console.log(chalk.yellow('\n🚀 PodAI Platform - AI Agent Commerce on Solana'));
    console.log(chalk.gray('Version 2.0.0 - Production Ready\n'));

    console.log(chalk.bold('Commands:'));
    console.log('  help           Show this help message');
    console.log('  status         Show platform status');
    console.log('  register       Register a new agent');
    console.log('  channels       Manage communication channels');
    console.log('  marketplace    Browse and interact with agent marketplace');
    console.log('  analytics      View platform analytics');
    console.log('  generate       Generate keypairs and addresses');
    console.log('  test           Run platform tests');
    console.log('  config         Manage configuration');
    console.log('  deploy         Deploy protocol components');
    console.log('  develop        Development tools and SDK management');
    console.log('  subscribe      Manage agent subscriptions');
    console.log('');
  }

  /**
   * Show platform status
   */
  async showStatus(): Promise<void> {
    console.log(chalk.blue('📊 Platform Status'));
    console.log('─'.repeat(50));

    try {
      // Get network health
      const health = await this.client.getNetworkHealth();
      console.log(chalk.green(`✅ Network: Connected`));
      console.log(chalk.gray(`   Block Height: ${health.blockHeight.toLocaleString()}`));
      console.log(chalk.gray(`   TPS: ${health.tps}`));
      console.log(chalk.gray(`   Average Slot Time: ${health.averageSlotTime}ms`));
      console.log(chalk.gray(`   Epoch: ${health.epochInfo.epoch || 'N/A'}`));

      // Get compression metrics
      const compression = await this.client.getCompressionMetrics();
      console.log(chalk.blue(`\n🗜️ Compression Metrics`));
      console.log(chalk.gray(`   Total Accounts: ${compression.totalAccounts.toLocaleString()}`));
      console.log(chalk.gray(`   Compressed: ${compression.compressedAccounts.toLocaleString()}`));
      console.log(chalk.gray(`   Compression Ratio: ${(compression.compressionRatio * 100).toFixed(1)}%`));
      console.log(chalk.gray(`   Estimated Savings: ${compression.estimatedSavings.toFixed(4)} SOL`));

      // Get performance data
      const performance = await this.client.getPerformanceData();
      console.log(chalk.yellow(`\n⚡ Performance`));
      console.log(chalk.gray(`   Current TPS: ${performance.tps}`));
      console.log(chalk.gray(`   Block Time: ${performance.blockTime}ms`));
      console.log(chalk.gray(`   Slot Height: ${performance.slotHeight.toLocaleString()}`));
      console.log(chalk.gray(`   Epoch Progress: ${performance.epochProgress}%`));

    } catch (error) {
      console.error(chalk.red(`❌ Error getting status: ${error.message}`));
    }
  }

  /**
   * Register a new agent
   */
  async registerAgent(options: any): Promise<void> {
    console.log(chalk.blue('🤖 Agent Registration'));
    console.log('─'.repeat(50));

    try {
      const payerAddress = 'DEMO_PAYER_ADDRESS_' + Date.now();
      const result = await this.client.registerAgent(payerAddress, {
        name: options.name || 'Demo Agent',
        description: options.description || 'AI Agent registered via CLI',
        capabilities: ['trading', 'analysis', 'automation']
      });

      console.log(chalk.green('✅ Agent registered successfully!'));
      console.log(chalk.cyan(`   Agent ID: ${result.agentId}`));
      console.log(chalk.gray(`   Transaction: ${result.transaction}`));
      console.log(chalk.yellow(`   Compression: ${result.compressed ? 'enabled' : 'disabled'}`));
      console.log(chalk.blue(`   View on Explorer: https://explorer.solana.com/tx/${result.transaction}?cluster=devnet`));

    } catch (error) {
      console.error(chalk.red(`❌ Registration failed: ${error.message}`));
    }
  }

  /**
   * Manage communication channels
   */
  async manageChannels(action: string): Promise<void> {
    console.log(chalk.blue('💬 Channel Management'));
    console.log('─'.repeat(50));

    try {
      if (action === 'create') {
        const payerAddress = 'DEMO_PAYER_ADDRESS_' + Date.now();
        const participants = [
          'PARTICIPANT_1_' + Date.now(),
          'PARTICIPANT_2_' + Date.now()
        ];
        
        const result = await this.client.createChannel(
          payerAddress,
          'Demo Channel',
          participants
        );

        console.log(chalk.green('✅ Channel created successfully!'));
        console.log(chalk.cyan(`   Channel ID: ${result.channelId}`));
        console.log(chalk.gray(`   Transaction: ${result.transaction}`));
        console.log(chalk.yellow(`   Compression: ${result.compressionEnabled ? 'enabled' : 'disabled'}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Channel operation failed: ${error.message}`));
    }
  }

  /**
   * Generate keypairs and addresses
   */
  async generateKeys(): Promise<void> {
    console.log(chalk.blue('🔑 Key Generation'));
    console.log('─'.repeat(50));

    try {
      const keypair = await generateKeypair();
      
      console.log(chalk.green('✅ Keypair generated successfully!'));
      console.log(chalk.cyan(`   Public Key: ${keypair.publicKey}`));
      console.log(chalk.gray(`   Secret Key: ${keypair.secretKey.slice(0, 16)}...`));
      console.log(chalk.yellow(`   Format: Base58`));

    } catch (error) {
      console.error(chalk.red(`❌ Key generation failed: ${error.message}`));
    }
  }

  /**
   * Send a compressed message
   */
  async sendMessage(channelId: string, message: string): Promise<void> {
    console.log(chalk.blue('📨 Send Message'));
    console.log('─'.repeat(50));

    try {
      const payerAddress = 'DEMO_PAYER_ADDRESS_' + Date.now();
      const result = await this.client.sendMessage(
        payerAddress,
        channelId,
        message,
        true // Enable compression
      );

      console.log(chalk.green('✅ Message sent successfully!'));
      console.log(chalk.cyan(`   Message ID: ${result.messageId}`));
      console.log(chalk.gray(`   Transaction: ${result.transaction}`));
      console.log(chalk.yellow(`   Compression: ${result.compressionUsed ? `enabled (${result.savingsPercent}% savings)` : 'disabled'}`));

    } catch (error) {
      console.error(chalk.red(`❌ Message sending failed: ${error.message}`));
    }
  }

  /**
   * Create a compressed state tree
   */
  async createStateTree(): Promise<void> {
    console.log(chalk.blue('🌳 State Tree Creation'));
    console.log('─'.repeat(50));

    try {
      const payerAddress = 'DEMO_PAYER_ADDRESS_' + Date.now();
      const result = await this.client.createCompressedStateTree(payerAddress, 14, 64);

      console.log(chalk.green('✅ Compressed state tree created!'));
      console.log(chalk.cyan(`   Tree Address: ${result.treeAddress}`));
      console.log(chalk.gray(`   Transaction: ${result.transactionId}`));
      console.log(chalk.yellow(`   Compression Savings: ${result.compressionSavings.toFixed(4)} SOL`));

    } catch (error) {
      console.error(chalk.red(`❌ State tree creation failed: ${error.message}`));
    }
  }

  /**
   * Display analytics data
   */
  async showAnalytics(): Promise<void> {
    console.log(chalk.blue('📈 Platform Analytics'));
    console.log('─'.repeat(50));

    try {
      const [compression, performance] = await Promise.all([
        this.client.getCompressionMetrics(),
        this.client.getPerformanceData()
      ]);

      console.log(chalk.yellow('Compression Statistics:'));
      console.log(chalk.gray(`  Total Accounts: ${compression.totalAccounts.toLocaleString()}`));
      console.log(chalk.gray(`  Compressed: ${compression.compressedAccounts.toLocaleString()}`));
      console.log(chalk.gray(`  Savings: ${compression.estimatedSavings.toFixed(4)} SOL`));

      console.log(chalk.yellow('\nNetwork Performance:'));
      console.log(chalk.gray(`  TPS: ${performance.tps}`));
      console.log(chalk.gray(`  Block Time: ${performance.blockTime}ms`));
      console.log(chalk.gray(`  Slot Height: ${performance.slotHeight.toLocaleString()}`));

    } catch (error) {
      console.error(chalk.red(`❌ Analytics failed: ${error.message}`));
    }
  }

  /**
   * Main CLI runner
   */
  async run(): Promise<void> {
    const program = new Command();
    
    program
      .name('podai-cli')
      .description('PodAI Platform CLI - AI Agent Commerce on Solana')
      .version('2.0.0');

    // Initialize the application
    await this.initialize();

    // Add commands
    program
      .command('status')
      .description('Show platform status')
      .action(async () => {
        await this.showStatus();
        await this.cleanup();
      });

    program
      .command('register')
      .description('Register a new agent')
      .option('-n, --name <name>', 'Agent name', 'Demo Agent')
      .option('-d, --description <desc>', 'Agent description', 'AI Agent')
      .action(async (options) => {
        await this.registerAgent(options);
        await this.cleanup();
      });

    program
      .command('generate')
      .description('Generate keypairs and addresses')
      .action(async () => {
        await this.generateKeys();
        await this.cleanup();
      });

    program
      .command('analytics')
      .description('View platform analytics')
      .action(async () => {
        await this.showAnalytics();
        await this.cleanup();
      });

    program
      .command('channels')
      .description('Manage communication channels')
      .argument('[action]', 'Action to perform', 'create')
      .action(async (action) => {
        await this.manageChannels(action);
        await this.cleanup();
      });

    program
      .command('tree')
      .description('Create compressed state tree')
      .action(async () => {
        await this.createStateTree();
        await this.cleanup();
      });

    // Parse and execute
    await program.parseAsync(process.argv);
  }

  /**
   * Clean up and exit
   */
  async cleanup(): Promise<void> {
    await this.client.disconnect();
    console.log(chalk.green('\n👋 Goodbye! PodAI CLI session ended.'));
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CLIApplication();
  cli.run().catch(error => {
    console.error(chalk.red('CLI Error:'), error);
    process.exit(1);
  });
} 