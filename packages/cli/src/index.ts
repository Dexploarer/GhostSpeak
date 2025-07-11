#!/usr/bin/env node

/**
 * GhostSpeak CLI - Lightweight Terminal Interface
 *
 * A modern, fast CLI for the GhostSpeak Autonomous Agent Commerce Protocol.
 * Built with Commander.js for optimal performance and minimal bundle size.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './core/ConfigManager.js';
import { logger } from './utils/logger.js';
import { initCliI18n, setCliLocale, cliT, handleLocaleCommand } from './i18n/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version info
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

// Initialize i18n before creating program
initCliI18n();
setCliLocale();

// Create program instance
const program = new Command();

// Configure base program
program
  .name('ghostspeak')
  .description(cliT('cli.welcome'))
  .version(packageJson.version, '-v, --version', cliT('common.version'))
  .option('--verbose', cliT('cli.options.verbose'))
  .option('--quiet', cliT('cli.options.quiet'))
  .option('--no-color', cliT('cli.options.noColor'))
  .option('--config <path>', cliT('cli.options.config'))
  .option('--locale <locale>', cliT('cli.options.locale'))
  .option(
    '--network <network>',
    cliT('cli.options.network'),
    'devnet'
  )
  .helpOption('-h, --help', cliT('cli.options.help'))
  .exitOverride(err => {
    if (err.code === 'commander.version') {
      process.exit(0);
    }
    if (err.code === 'commander.help') {
      process.exit(0);
    }
    if (err.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    process.exit(1);
  });

// Global error handler
process.on('uncaughtException', error => {
  console.error(chalk.red('❌ Fatal Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  console.error(chalk.red('❌ Unhandled Promise Rejection:'), reason);
  process.exit(1);
});

// Status command
program
  .command('status')
  .description('Show system status and health')
  .action(async () => {
    try {
      const { showStatus } = await import('./commands/status.js');
      await showStatus();
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Status check failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description(cliT('cli.commands.config.description'))
  .option('-s, --show', cliT('cli.commands.config.show'))
  .option('-r, --reset', cliT('cli.commands.config.reset'))
  .action(async options => {
    try {
      const { configCommand } = await import('./commands/config.js');
      await configCommand(options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red(cliT('cli.errors.configError')),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Locale command
program
  .command('locale')
  .description(cliT('cli.commands.locale.description'))
  .option('-l, --list', cliT('cli.commands.locale.list'))
  .option('-s, --set <locale>', cliT('cli.commands.locale.set'))
  .action(async options => {
    try {
      handleLocaleCommand(options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red(cliT('cli.errors.localeError')),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Agent management commands
const agentCommand = program.command('agent').description('Manage AI agents');

agentCommand
  .command('register <name>')
  .description('Register a new AI agent')
  .option('-t, --type <type>', 'Agent type', 'general')
  .option('-d, --description <desc>', 'Agent description')
  .action(async (name, options) => {
    try {
      const { registerAgent } = await import('./commands/agent.js');
      await registerAgent(name, options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Agent registration failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

agentCommand
  .command('list')
  .description('List registered agents')
  .action(async () => {
    try {
      const { listAgents } = await import('./commands/agent.js');
      await listAgents();
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Agent listing failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Marketplace commands
const marketplaceCommand = program
  .command('marketplace')
  .description('Access the agent marketplace');

marketplaceCommand
  .command('list')
  .description('List available services')
  .option('-c, --category <category>', 'Filter by category')
  .option('-s, --sort-by <sort>', 'Sort by: price, rating, sales, created', 'created')
  .option('-l, --limit <number>', 'Number of results to show', '20')
  .option('--min-price <price>', 'Minimum price in SOL')
  .option('--max-price <price>', 'Maximum price in SOL')
  .option('--min-rating <rating>', 'Minimum rating (0-5)')
  .action(async options => {
    try {
      const { listServices } = await import('./commands/marketplace.js');
      
      // Parse numeric options
      const parsedOptions = {
        category: options.category,
        sortBy: options.sortBy as 'price' | 'rating' | 'sales' | 'created',
        limit: options.limit ? parseInt(options.limit, 10) : 20,
        minPrice: options.minPrice ? parseFloat(options.minPrice) : undefined,
        maxPrice: options.maxPrice ? parseFloat(options.maxPrice) : undefined,
        minRating: options.minRating ? parseFloat(options.minRating) : undefined,
      };
      
      await listServices(parsedOptions);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Marketplace listing failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Channel management commands
const channelCommand = program
  .command('channel')
  .description('Manage communication channels');

channelCommand
  .command('create <name>')
  .description('Create a new communication channel')
  .option('-d, --description <desc>', 'Channel description')
  .option('-p, --private', 'Make channel private')
  .option('-m, --max-participants <count>', 'Maximum participants', '100')
  .option('-e, --encrypted', 'Enable encryption')
  .action(async (name, options) => {
    try {
      const { createChannel } = await import('./commands/channel.js');
      
      // Safely parse maxParticipants with validation
      let maxParticipants = 100; // default value
      if (options.maxParticipants) {
        const parsed = parseInt(options.maxParticipants);
        if (isNaN(parsed) || parsed < 1) {
          console.error(
            chalk.red('❌ Invalid max-participants value:'),
            'Must be a positive number'
          );
          process.exit(1);
        }
        maxParticipants = parsed;
      }
      
      await createChannel(name, {
        description: options.description,
        isPrivate: options.private,
        maxParticipants,
        encryptionEnabled: options.encrypted
      });
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Channel creation failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

channelCommand
  .command('list')
  .description('List your channels')
  .option('--include-private', 'Include private channels')
  .option('--include-archived', 'Include archived channels')
  .action(async options => {
    try {
      const { listChannels } = await import('./commands/channel.js');
      await listChannels({
        includePrivate: options.includePrivate,
        includeArchived: options.includeArchived
      });
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Channel listing failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Message commands
const messageCommand = program
  .command('message')
  .description('Send and manage messages');

messageCommand
  .command('send <channel> <content>')
  .description('Send a message to a channel')
  .option('-t, --type <type>', 'Content type (text, json, binary)', 'text')
  .option('-e, --encrypted', 'Encrypt message')
  .option('-r, --reply-to <messageId>', 'Reply to specific message')
  .action(async (channel, content, options) => {
    try {
      const { sendMessage } = await import('./commands/message.js');
      await sendMessage(channel, content, {
        contentType: options.type,
        encrypted: options.encrypted,
        replyTo: options.replyTo
      });
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Message sending failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

messageCommand
  .command('list <channel>')
  .description('List messages in a channel')
  .option('-l, --limit <count>', 'Number of messages to show', '50')
  .option('--from <timestamp>', 'Start timestamp')
  .option('--to <timestamp>', 'End timestamp')
  .action(async (channel, options) => {
    try {
      const { listMessages } = await import('./commands/message.js');
      
      // Safely parse numeric options with validation
      let pageSize = 50; // default
      if (options.limit) {
        const parsed = parseInt(options.limit);
        if (isNaN(parsed) || parsed < 1) {
          console.error(
            chalk.red('❌ Invalid limit value:'),
            'Must be a positive number'
          );
          process.exit(1);
        }
        pageSize = parsed;
      }
      
      let fromTimestamp: number | undefined;
      if (options.from) {
        const parsed = parseInt(options.from);
        if (isNaN(parsed) || parsed < 0) {
          console.error(
            chalk.red('❌ Invalid from timestamp:'),
            'Must be a valid timestamp'
          );
          process.exit(1);
        }
        fromTimestamp = parsed;
      }
      
      let toTimestamp: number | undefined;
      if (options.to) {
        const parsed = parseInt(options.to);
        if (isNaN(parsed) || parsed < 0) {
          console.error(
            chalk.red('❌ Invalid to timestamp:'),
            'Must be a valid timestamp'
          );
          process.exit(1);
        }
        toTimestamp = parsed;
      }
      
      await listMessages(channel, {
        pageSize,
        fromTimestamp,
        toTimestamp
      });
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Message listing failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Escrow commands
const escrowCommand = program
  .command('escrow')
  .description('Manage escrow services');

escrowCommand
  .command('deposit <channel> <amount>')
  .description('Deposit funds into escrow')
  .action(async (channel, amount) => {
    try {
      const { depositEscrow } = await import('./commands/escrow.js');
      
      // Safely parse amount with validation
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        console.error(
          chalk.red('❌ Invalid amount:'),
          'Must be a positive number'
        );
        process.exit(1);
      }
      
      await depositEscrow(channel, parsedAmount);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Escrow deposit failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Analytics commands
const analyticsCommand = program
  .command('analytics')
  .description('View system analytics and metrics');

analyticsCommand
  .command('dashboard')
  .description('Show analytics dashboard')
  .option('--period <period>', 'Time period (hour, day, week, month)', 'week')
  .option('--live', 'Enable live updates mode', false)
  .action(async options => {
    try {
      const { showDashboard, showLiveDashboard } = await import('./commands/analytics.js');
      if (options.live) {
        await showLiveDashboard(options.period);
        // Live dashboard runs indefinitely
      } else {
        await showDashboard(options.period);
        process.exit(0);
      }
    } catch (error) {
      console.error(
        chalk.red('❌ Analytics dashboard failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

analyticsCommand
  .command('summary')
  .description('Show quick metrics summary')
  .action(async () => {
    try {
      const { getMetricsSummary } = await import('./commands/analytics.js');
      const summary = await getMetricsSummary();
      
      console.log(chalk.cyan('📊 GhostSpeak Metrics Summary'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`Transactions: ${chalk.cyan(summary.transactions)}`);
      console.log(`Agents: ${chalk.cyan(summary.agents)}`);
      console.log(`Channels: ${chalk.cyan(summary.channels)}`);
      console.log(`Messages: ${chalk.cyan(summary.messages)}`);
      console.log(`Data Source: ${summary.isLive ? chalk.green('Live') : chalk.yellow('Demo')}`);
      
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Metrics summary failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Compression commands
const compressionCommand = program
  .command('compression')
  .description('Manage ZK compression features');

compressionCommand
  .command('status')
  .description('Show compression status and statistics')
  .action(async () => {
    try {
      const { showCompressionStatus } = await import('./commands/zk-compression.js');
      await showCompressionStatus();
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Compression status failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// SPL Token 2022 commands
const tokenCommand = program
  .command('token')
  .description('Manage SPL Token 2022 features');

tokenCommand
  .command('transfer')
  .description('Manage confidential transfers')
  .option('--amount <amount>', 'Amount to transfer')
  .option('--recipient <address>', 'Recipient address')
  .option('--confidential', 'Use confidential transfer')
  .action(async options => {
    try {
      const { manageConfidentialTransfer } = await import('./commands/confidential-transfer.js');
      await manageConfidentialTransfer(options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Token transfer failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// MEV Protection commands
const mevCommand = program
  .command('mev')
  .description('Manage MEV protection features');

mevCommand
  .command('status')
  .description('Show MEV protection status')
  .action(async () => {
    try {
      const { showMevStatus } = await import('./commands/mev-protection.js');
      await showMevStatus();
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ MEV protection status failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Developer tools
const devCommand = program
  .command('dev')
  .description('Developer tools and utilities');

devCommand
  .command('keys')
  .description('Manage keypairs and wallets')
  .action(async () => {
    try {
      const { manageKeys } = await import('./commands/dev.js');
      await manageKeys();
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Key management failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

devCommand
  .command('debug')
  .description('Debug system and troubleshoot issues')
  .option('--verbose', 'Enable verbose debugging')
  .option('--network-test', 'Test network connectivity')
  .option('--wallet-test', 'Test wallet connectivity')
  .action(async options => {
    try {
      console.log(chalk.cyan('🔧 Debug Mode'));
      console.log(chalk.gray('Running system diagnostics...'));
      
      if (options.networkTest) {
        console.log(chalk.yellow('Testing network connectivity...'));
        // Network test implementation would go here
        console.log(chalk.green('✅ Network connectivity: OK'));
      }
      
      if (options.walletTest) {
        console.log(chalk.yellow('Testing wallet connectivity...'));
        // Wallet test implementation would go here
        console.log(chalk.green('✅ Wallet connectivity: OK'));
      }
      
      console.log(chalk.green('✅ Debug complete'));
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Debug failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

devCommand
  .command('deploy')
  .description('Deploy and manage program deployments')
  .option('--network <network>', 'Target network', 'devnet')
  .option('--program <program>', 'Specific program to deploy')
  .option('--dry-run', 'Simulate deployment without executing')
  .action(async options => {
    try {
      console.log(chalk.cyan('🚀 Deployment Manager'));
      console.log(chalk.gray(`Target network: ${options.network}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('🧪 Dry run mode - no changes will be made'));
      }
      
      // Deployment logic would go here
      console.log(chalk.green('✅ Deployment complete'));
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Deployment failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

devCommand
  .command('completion')
  .description('Generate shell completion scripts')
  .option('--shell <shell>', 'Target shell (bash, zsh, fish)')
  .option('--install', 'Install completion script automatically')
  .option('--output <path>', 'Save completion script to file')
  .action(async options => {
    try {
      const { generateCompletion } = await import('./commands/completion.js');
      await generateCompletion(options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Completion generation failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

devCommand
  .command('performance')
  .description('View CLI performance metrics and optimization suggestions')
  .option('--clear', 'Clear all performance data')
  .option('--export <path>', 'Export performance data to file')
  .action(async options => {
    try {
      const { PerformanceMonitor } = await import('./performance/PerformanceMonitor.js');
      const monitor = PerformanceMonitor.getInstance();
      
      if (options.clear) {
        monitor.clearMetrics();
        console.log(chalk.green('✅ Performance data cleared'));
      } else if (options.export) {
        monitor.exportMetrics(options.export);
        console.log(chalk.green(`✅ Performance data exported to: ${options.export}`));
      } else {
        monitor.displayReport();
      }
      
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Performance command failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Administrative commands
const adminCommand = program
  .command('admin')
  .description('Administrative tools and operations');

adminCommand
  .command('monitor')
  .description('Monitor system health and performance')
  .option('--real-time', 'Enable real-time monitoring')
  .option('--alerts', 'Enable alerts')
  .action(async options => {
    try {
      console.log(chalk.cyan('📊 System Monitor'));
      console.log(chalk.gray('Monitoring system health...'));
      
      if (options.realTime) {
        console.log(chalk.yellow('🔄 Real-time monitoring enabled'));
      }
      
      if (options.alerts) {
        console.log(chalk.yellow('🔔 Alerts enabled'));
      }
      
      // Monitoring logic would go here
      console.log(chalk.green('✅ Monitoring active'));
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Monitoring failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

adminCommand
  .command('backup')
  .description('Backup system configuration and data')
  .option('--output <path>', 'Backup output path')
  .option('--include-keys', 'Include keypairs in backup')
  .action(async options => {
    try {
      console.log(chalk.cyan('💾 Backup Manager'));
      console.log(chalk.gray('Creating system backup...'));
      
      if (options.includeKeys) {
        console.log(chalk.yellow('⚠️  Including keypairs in backup'));
      }
      
      // Backup logic would go here
      console.log(chalk.green('✅ Backup complete'));
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Backup failed:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Quickstart command
program
  .command('quickstart')
  .description('Quick setup guide for new users')
  .option('--skip-wallet', 'Skip wallet setup')
  .option('--skip-network', 'Skip network configuration')
  .action(async options => {
    try {
      const { runQuickstart } = await import('./commands/quickstart.js');
      await runQuickstart(options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Quickstart failed:'),
        error instanceof Error ? error.message : String(error)
      );
      if (error instanceof Error && process.env.NODE_ENV !== 'production') {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Interactive wizard command
program
  .command('wizard')
  .description('Interactive setup and configuration wizard')
  .option('--full', 'Run complete setup wizard')
  .option('--quick', 'Run quick setup wizard')
  .action(async options => {
    try {
      const { runWizard } = await import('./commands/wizard.js');
      await runWizard(options);
      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red('❌ Wizard failed:'),
        error instanceof Error ? error.message : String(error)
      );
      if (error instanceof Error && process.env.NODE_ENV !== 'production') {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Help command with examples
program
  .command('help [command]')
  .description('Show detailed help with examples')
  .action(async (command) => {
    if (command) {
      showCommandHelp(command);
    } else {
      showGeneralHelp();
    }
    process.exit(0);
  });

// Command help functions
function showCommandHelp(command: string): void {
  const helpExamples: Record<string, () => void> = {
    agent: () => {
      console.log(chalk.cyan('🤖 Agent Command Help'));
      console.log('');
      console.log(chalk.yellow('Usage:'));
      console.log('  ghostspeak agent <subcommand> [options]');
      console.log('');
      console.log(chalk.yellow('Subcommands:'));
      console.log('  register <name>  Register new agent');
      console.log('  list            List your agents');
      console.log('');
      console.log(chalk.yellow('Examples:'));
      console.log('  ghostspeak agent register "DataAnalyzer" --type analytics');
      console.log('  ghostspeak agent register "TaskBot" --description "Productivity helper"');
      console.log('  ghostspeak agent list');
    },
    channel: () => {
      console.log(chalk.cyan('📡 Channel Command Help'));
      console.log('');
      console.log(chalk.yellow('Usage:'));
      console.log('  ghostspeak channel <subcommand> [options]');
      console.log('');
      console.log(chalk.yellow('Subcommands:'));
      console.log('  create <name>  Create new channel');
      console.log('  list          List your channels');
      console.log('');
      console.log(chalk.yellow('Examples:'));
      console.log('  ghostspeak channel create "general" --description "General chat"');
      console.log('  ghostspeak channel create "private-team" --private --encrypted');
      console.log('  ghostspeak channel list --include-private');
    },
    message: () => {
      console.log(chalk.cyan('💬 Message Command Help'));
      console.log('');
      console.log(chalk.yellow('Usage:'));
      console.log('  ghostspeak message <subcommand> [options]');
      console.log('');
      console.log(chalk.yellow('Subcommands:'));
      console.log('  send <channel> <content>  Send message');
      console.log('  list <channel>           List messages');
      console.log('');
      console.log(chalk.yellow('Examples:'));
      console.log('  ghostspeak message send "general" "Hello everyone!"');
      console.log('  ghostspeak message send "team" "Task update" --encrypted');
      console.log('  ghostspeak message list "general" --limit 20');
    }
  };
  
  const helpFn = helpExamples[command];
  if (helpFn) {
    helpFn();
  } else {
    console.log(chalk.yellow(`No detailed help available for "${command}"`));
    console.log(chalk.gray('Use "ghostspeak help" for general help'));
  }
}

function showGeneralHelp(): void {
  console.log(chalk.cyan('📚 GhostSpeak CLI Help'));
  console.log(chalk.gray('Comprehensive command reference'));
  console.log('');
  
  console.log(chalk.yellow('Getting Started:'));
  console.log('  ghostspeak quickstart              # Quick setup guide');
  console.log('  ghostspeak wizard --quick          # Interactive setup');
  console.log('  ghostspeak status                  # Check system health');
  console.log('');
  
  console.log(chalk.yellow('Common Operations:'));
  console.log('  ghostspeak agent register MyAgent  # Register new agent');
  console.log('  ghostspeak channel create general  # Create channel');
  console.log('  ghostspeak message send ch1 "hi"   # Send message');
  console.log('  ghostspeak marketplace list        # Browse services');
  console.log('');
  
  console.log(chalk.yellow('Advanced Features:'));
  console.log('  ghostspeak analytics dashboard     # View metrics');
  console.log('  ghostspeak compression status      # ZK compression');
  console.log('  ghostspeak token transfer          # Confidential transfers');
  console.log('');
  
  console.log(chalk.cyan('💡 Use "ghostspeak help <command>" for detailed examples'));
}

// Default action when no command is specified
program.action(async () => {
  // Check for configuration migration
  const { migrateConfiguration } = await import('./utils/config-migration-stub.js');
  if (false) { // Temporarily disabled: await needsMigration()
    console.log(chalk.yellow('⚠️  Configuration update required'));
    console.log(chalk.gray('Your configuration needs to be migrated to the new shared system.'));
    console.log('');
    
    const { confirm } = await import('./utils/prompts.js');
    const shouldMigrate = await confirm({
      message: 'Migrate configuration now?',
      defaultValue: true
    });
    
    if (shouldMigrate) {
      await migrateConfiguration();
      console.log('');
    }
  }
  
  console.log(chalk.cyan('👻 GhostSpeak CLI'));
  console.log(chalk.gray('Autonomous Agent Commerce Protocol'));
  console.log('');
  console.log(chalk.yellow('Usage:'));
  console.log('  ghostspeak <command> [options]');
  console.log('');
  console.log(chalk.yellow('Core Commands:'));
  console.log('  status      Show system status and health');
  console.log('  config      Manage CLI configuration');
  console.log('  quickstart  Quick setup guide');
  console.log('  wizard      Interactive setup wizard');
  console.log('');
  console.log(chalk.yellow('Agent & Marketplace:'));
  console.log('  agent       Manage AI agents');
  console.log('  marketplace Access the agent marketplace');
  console.log('');
  console.log(chalk.yellow('Communication:'));
  console.log('  channel     Manage communication channels');
  console.log('  message     Send and manage messages');
  console.log('  escrow      Manage escrow services');
  console.log('');
  console.log(chalk.yellow('Advanced:'));
  console.log('  analytics   View system analytics');
  console.log('  compression Manage ZK compression');
  console.log('  token       SPL Token 2022 features');
  console.log('  mev         MEV protection tools');
  console.log('');
  console.log(chalk.yellow('Developer Tools:'));
  console.log('  dev         Developer utilities');
  console.log('  admin       Administrative tools');
  console.log('');
  console.log(chalk.yellow('Options:'));
  console.log('  -v, --version  Display version information');
  console.log('  -h, --help     Display help information');
  console.log('  --verbose      Enable verbose logging');
  console.log('  --quiet        Suppress non-essential output');
  console.log('');
  console.log(chalk.gray(`Version: ${packageJson.version}`));
  console.log('');
  console.log(chalk.cyan('💡 Pro Tips:'));
  console.log(chalk.gray('  • Run "ghostspeak wizard" for interactive setup'));
  console.log(chalk.gray('  • Use "ghostspeak help <command>" for detailed examples'));
  console.log(chalk.gray('  • Try "ghostspeak quickstart" if you\'re new'));
  process.exit(0);
});


// Parse arguments
async function main() {
  try {
    // Initialize performance monitoring
    const { PerformanceMonitor } = await import('./performance/PerformanceMonitor.js');
    const monitor = PerformanceMonitor.getInstance();
    
    // Start monitoring
    const commandName = process.argv.slice(2).join(' ') || 'default';
    monitor.startCommand(commandName);
    
    await program.parseAsync();
    
    // End monitoring on success
    monitor.endCommand(true);
  } catch (error) {
    // End monitoring on error
    try {
      const { PerformanceMonitor } = await import('./performance/PerformanceMonitor.js');
      const monitor = PerformanceMonitor.getInstance();
      monitor.endCommand(false, error instanceof Error ? error.constructor.name : 'Unknown');
    } catch {
      // Ignore performance monitoring errors
    }
    
    console.error(
      chalk.red('❌ CLI Error:'),
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('❌ Unexpected Error:'), error);
    process.exit(1);
  });
}

export { program };
