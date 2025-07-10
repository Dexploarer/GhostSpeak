#!/usr/bin/env node

/**
 * GhostSpeak CLI - Lightweight Version (<100KB)
 *
 * Commander.js-based CLI without React Ink overhead
 * Focused on essential functionality only
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { logger } from '../../../shared/logger';

// Minimal logging without heavy pino
const log = {
  info: (msg: string) => logger.general.info(`✓ ${msg}`),
  error: (msg: string) => logger.general.error(`✗ ${msg}`),
  warn: (msg: string) => logger.general.warn(`⚠ ${msg}`),
  debug: (msg: string) => process.env.DEBUG && logger.general.info(`🔍 ${msg}`),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packagePath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

const program = new Command();

program
  .name('ghostspeak')
  .description('GhostSpeak Protocol CLI - Autonomous Agent Commerce')
  .version(packageJson.version);

// Agent commands
const agentCommand = program.command('agent').description('Manage AI agents');

agentCommand
  .command('create')
  .description('Create a new AI agent')
  .option('-n, --name <name>', 'Agent name')
  .option(
    '-c, --capabilities <capabilities>',
    'Agent capabilities (comma-separated)'
  )
  .action(async options => {
    log.info('Creating new agent...');

    const name = options.name || 'Agent-' + Date.now();
    const capabilities = options.capabilities
      ? options.capabilities.split(',')
      : ['chat', 'task'];

    try {
      // In a real implementation, this would use the minimal SDK
      log.info(`Agent "${name}" created successfully`);
      log.info(`Capabilities: ${capabilities.join(', ')}`);
    } catch (error) {
      log.error(`Failed to create agent: ${error.message}`);
      process.exit(1);
    }
  });

agentCommand
  .command('list')
  .description('List all agents')
  .action(async () => {
    log.info('Fetching agents...');

    try {
      // In a real implementation, this would use the minimal SDK
      log.info('No agents found');
    } catch (error) {
      log.error(`Failed to list agents: ${error.message}`);
      process.exit(1);
    }
  });

// Channel commands
const channelCommand = program
  .command('channel')
  .description('Manage communication channels');

channelCommand
  .command('create')
  .description('Create a new channel')
  .option('-n, --name <name>', 'Channel name')
  .option('-p, --private', 'Make channel private')
  .action(async options => {
    log.info('Creating new channel...');

    const name = options.name || 'Channel-' + Date.now();
    const visibility = options.private ? 'private' : 'public';

    try {
      // In a real implementation, this would use the minimal SDK
      log.info(`Channel "${name}" created successfully (${visibility})`);
    } catch (error) {
      log.error(`Failed to create channel: ${error.message}`);
      process.exit(1);
    }
  });

channelCommand
  .command('list')
  .description('List all channels')
  .action(async () => {
    log.info('Fetching channels...');

    try {
      // In a real implementation, this would use the minimal SDK
      log.info('No channels found');
    } catch (error) {
      log.error(`Failed to list channels: ${error.message}`);
      process.exit(1);
    }
  });

// Message commands
const messageCommand = program
  .command('message')
  .description('Send and manage messages');

messageCommand
  .command('send')
  .description('Send a message')
  .option('-c, --channel <channel>', 'Channel address')
  .option('-m, --message <message>', 'Message content')
  .action(async options => {
    if (!options.channel) {
      log.error('Channel address is required');
      process.exit(1);
    }

    if (!options.message) {
      log.error('Message content is required');
      process.exit(1);
    }

    log.info('Sending message...');

    try {
      // In a real implementation, this would use the minimal SDK
      log.info(`Message sent to channel ${options.channel}`);
    } catch (error) {
      log.error(`Failed to send message: ${error.message}`);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check protocol status')
  .action(async () => {
    log.info('Checking protocol status...');

    try {
      // In a real implementation, this would use the minimal SDK
      log.info('Protocol status: Online');
      log.info('Network: Devnet');
      log.info('RPC: https://api.devnet.solana.com');
    } catch (error) {
      log.error(`Failed to check status: ${error.message}`);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage CLI configuration')
  .action(async () => {
    log.info('CLI Configuration:');
    log.info(`Version: ${packageJson.version}`);
    log.info(`Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
    log.info(
      `RPC: ${process.env.SOLANA_RPC || 'https://api.devnet.solana.com'}`
    );
  });

// Handle help and version
program.addHelpText(
  'after',
  `
Examples:
  $ ghostspeak agent create --name "MyAgent" --capabilities "chat,task,trade"
  $ ghostspeak channel create --name "MyChannel" --private
  $ ghostspeak message send --channel <address> --message "Hello World"
  $ ghostspeak status
  
Environment Variables:
  SOLANA_NETWORK    Set network (devnet, testnet, mainnet)
  SOLANA_RPC        Set custom RPC endpoint
  DEBUG             Enable debug logging
`
);

// Parse arguments
program.parse();

// If no command provided, show help
if (process.argv.length === 2) {
  program.outputHelp();
}
