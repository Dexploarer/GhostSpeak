#!/usr/bin/env bun

/**
 * ghostspeak CLI - Modern Terminal Interface
 *
 * A React Ink-powered CLI for the ghostspeak platform.
 * Provides an immersive, interactive experience for AI agent commerce.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import chalk from 'chalk';
import { Command } from 'commander';
import gradient from 'gradient-string';
import { render } from 'ink';

import { GhostSpeakApp } from './components/App.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { ConfigManager } from './core/ConfigManager.js';
import { Logger } from './core/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version info
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

// Enhanced ASCII art for ghostspeak
const ghostArt = `
    ╭─────────────────────────────────────────╮
    │                                         │
    │     👻  G H O S T S P E A K  👻        │
    │                                         │
    │    Autonomous Agent Commerce Protocol   │
    │                                         │
    ╰─────────────────────────────────────────╯
`;

const program = new Command();

// Configure CLI
program
  .name('ghostspeak')
  .description('Modern CLI for ghostspeak - Autonomous Agent Commerce Protocol')
  .version(packageJson.version)
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--config <path>', 'Path to configuration file')
  .option(
    '--network <network>',
    'Solana network (devnet, testnet, mainnet-beta)',
    'devnet'
  );

// Interactive mode (default)
program
  .command('start', { isDefault: true })
  .description('Start interactive ghostspeak CLI')
  .option('--welcome', 'Show welcome screen', true)
  .action(async options => {
    try {
      const config = await ConfigManager.load(program.opts().config);
      const logger = new Logger(program.opts().verbose);

      // Render the main app
      if (options.welcome) {
        // Show welcome screen first
        const { waitUntilExit } = render(
          <WelcomeScreen
            version={packageJson.version}
            onComplete={async () => {
              // Then show main app
              const { waitUntilExit: appWait } = render(
                <GhostSpeakApp
                  config={config}
                  logger={logger}
                  network={program.opts().network}
                  verbose={program.opts().verbose}
                  quiet={program.opts().quiet}
                />
              );
              await appWait;
            }}
          />
        );
        await waitUntilExit();
      } else {
        const { waitUntilExit } = render(
          <GhostSpeakApp
            config={config}
            logger={logger}
            network={program.opts().network}
            verbose={program.opts().verbose}
            quiet={program.opts().quiet}
          />
        );
        await waitUntilExit();
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to start ghostspeak CLI:'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Agent management commands
program
  .command('agent')
  .description('Manage AI agents')
  .command('register <name>')
  .description('Register a new AI agent')
  .option('-t, --type <type>', 'Agent type', 'general')
  .option('-d, --description <desc>', 'Agent description')
  .action(async (name, options) => {
    const { registerAgent } = await import('./commands/agent.js');
    await registerAgent(name, options);
  });

// Channel management commands
program
  .command('channel')
  .description('Manage communication channels')
  .command('create <name>')
  .description('Create a new channel')
  .option('-p, --private', 'Create private channel')
  .option('-d, --description <desc>', 'Channel description')
  .action(async (name, options) => {
    const { createChannel } = await import('./commands/channel.js');
    await createChannel(name, options);
  });

// Marketplace commands
program
  .command('marketplace')
  .description('Access the agent marketplace')
  .command('list')
  .description('List available services')
  .option('-c, --category <category>', 'Filter by category')
  .action(async options => {
    const { listServices } = await import('./commands/marketplace.js');
    await listServices(options);
  });

// Developer commands
program
  .command('dev')
  .description('Developer tools and utilities')
  .command('keys')
  .description('Manage keypairs and wallets')
  .action(async () => {
    const { manageKeys } = await import('./commands/dev.js');
    await manageKeys();
  });

// Configuration commands
program
  .command('config')
  .description('Manage CLI configuration')
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    const { showConfig } = await import('./commands/config.js');
    await showConfig();
  });

// Status and health commands
program
  .command('status')
  .description('Show system status and health')
  .action(async () => {
    const { showStatus } = await import('./commands/status.js');
    await showStatus();
  });

// Version with fancy output
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(gradient.pastel(ghostArt));
    console.log(chalk.cyan(`Version: ${packageJson.version}`));
    console.log(chalk.gray(`Node.js: ${process.version}`));
    console.log(chalk.gray(`Platform: ${process.platform}`));
  });

// Handle unknown commands
program.command('*').action(cmd => {
  console.log(chalk.red(`❌ Unknown command: ${cmd}`));
  console.log(
    chalk.yellow('💡 Run "ghostspeak --help" to see available commands')
  );
  process.exit(1);
});

// Error handling
program.exitOverride(err => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red('❌ CLI Error:'), err.message);
  process.exit(1);
});

// Parse arguments and run
async function main() {
  try {
    await program.parseAsync();
  } catch (error) {
    console.error(chalk.red('❌ Fatal Error:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('❌ Unexpected Error:'));
    console.error(error);
    process.exit(1);
  });
}
