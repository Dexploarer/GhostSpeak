/**
 * Quickstart Commands - Quick Setup Guide
 *
 * Provides a guided setup process for new users to get started quickly.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../../../../shared/logger';

interface QuickstartOptions {
  skipWallet?: boolean;
  skipNetwork?: boolean;
}

export async function runQuickstart(
  options: QuickstartOptions = {}
): Promise<void> {
  const logger = new Logger(false);

  try {
    logger.general.info(chalk.cyan('🚀 GhostSpeak Quickstart Guide'));
    logger.general.info(
      chalk.gray('This will get you up and running in 5-10 minutes')
    );
    logger.general.info(chalk.gray('─'.repeat(50)));
    logger.general.info('');

    // Step 1: Check prerequisites
    logger.general.info(chalk.yellow('📋 Step 1: Checking Prerequisites'));
    await checkPrerequisites();

    // Step 2: Network configuration
    if (!options.skipNetwork) {
      logger.general.info(chalk.yellow('\n🌐 Step 2: Network Configuration'));
      await configureNetwork();
    }

    // Step 3: Wallet setup
    if (!options.skipWallet) {
      logger.general.info(chalk.yellow('\n💳 Step 3: Wallet Setup'));
      await setupWallet();
    }

    // Step 4: Test connection
    logger.general.info(chalk.yellow('\n🔍 Step 4: Testing Connection'));
    await testConnection();

    // Step 5: Basic example
    logger.general.info(chalk.yellow('\n🎯 Step 5: Next Steps'));
    showNextSteps();

    // Success message
    logger.general.info(chalk.green('\n✅ Quickstart Complete!'));
    logger.general.info(
      chalk.cyan("🎉 You're ready to start using GhostSpeak!")
    );
  } catch (error) {
    logger.error('Quickstart failed:', error);
    throw error;
  }
}

async function checkPrerequisites(): Promise<void> {
  const checks = [
    { name: 'Node.js', command: 'node --version', minVersion: '20.0.0' },
    { name: 'Solana CLI', command: 'solana --version', minVersion: '1.18.0' },
  ];

  for (const check of checks) {
    logger.general.info(chalk.blue(`  Checking ${check.name}...`));

    try {
      const output = execSync(check.command, { encoding: 'utf8' }).trim();
      const version = output.split(' ').pop() || '';

      if (compareVersions(version, check.minVersion) >= 0) {
        logger.general.info(chalk.green(`    ✓ ${check.name} ${version}`));
      } else {
        logger.general.info(
          chalk.red(
            `    ✗ ${check.name} ${version} (need ${check.minVersion}+)`
          )
        );
        throw new Error(`${check.name} version ${check.minVersion}+ required`);
      }
    } catch (error) {
      logger.general.info(chalk.red(`    ✗ ${check.name} not found`));
      throw new Error(`${check.name} is required. Please install it first.`);
    }
  }
}

async function configureNetwork(): Promise<void> {
  logger.general.info(chalk.blue('  Configuring Solana network...'));

  try {
    // Set to devnet for quickstart
    execSync('solana config set --url https://api.devnet.solana.com', {
      stdio: 'pipe',
    });

    // Verify configuration
    const config = execSync('solana config get', { encoding: 'utf8' });

    if (config.includes('devnet')) {
      logger.general.info(chalk.green('    ✓ Network configured to devnet'));
    } else {
      throw new Error('Failed to configure network');
    }
  } catch (error) {
    logger.general.info(chalk.red('    ✗ Network configuration failed'));
    throw error;
  }
}

async function setupWallet(): Promise<void> {
  logger.general.info(chalk.blue('  Setting up wallet...'));

  try {
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');

    if (!existsSync(walletPath)) {
      logger.general.info(chalk.blue('    Creating new wallet keypair...'));
      execSync('solana-keygen new --no-bip39-passphrase --force', {
        stdio: 'pipe',
      });
    }

    // Request airdrop for devnet
    try {
      logger.general.info(chalk.blue('    Requesting devnet SOL...'));
      execSync('solana airdrop 2', { stdio: 'pipe' });
    } catch (airdropError) {
      // Airdrop might fail, but that's okay for quickstart
      logger.general.info(
        chalk.yellow('    ⚠ Airdrop failed (normal on devnet)')
      );
    }

    // Check balance
    const balance = execSync('solana balance', { encoding: 'utf8' }).trim();
    logger.general.info(
      chalk.green(`    ✓ Wallet ready - Balance: ${balance}`)
    );
  } catch (error) {
    logger.general.info(chalk.red('    ✗ Wallet setup failed'));
    throw error;
  }
}

async function testConnection(): Promise<void> {
  logger.general.info(chalk.blue('  Testing connection to Solana...'));

  try {
    const blockHeight = execSync('solana block-height', {
      encoding: 'utf8',
    }).trim();
    logger.general.info(
      chalk.green(`    ✓ Connected to Solana - Block Height: ${blockHeight}`)
    );
  } catch (error) {
    logger.general.info(chalk.red('    ✗ Connection test failed'));
    throw error;
  }
}

function showNextSteps(): void {
  logger.general.info(chalk.blue('  Available commands:'));
  logger.general.info(
    chalk.gray('    • ghostspeak status      - Show system status')
  );
  logger.general.info(
    chalk.gray('    • ghostspeak config      - Manage configuration')
  );
  logger.general.info(
    chalk.gray('    • ghostspeak agent list  - List your agents')
  );
  logger.general.info(
    chalk.gray('    • ghostspeak marketplace - Browse services')
  );
  logger.general.info(chalk.gray('    • ghostspeak dev keys    - Manage keys'));
  logger.general.info('');
  logger.general.info(chalk.yellow('  Next steps:'));
  logger.general.info(
    chalk.gray(
      '    • Run "ghostspeak agent register MyAgent" to create your first agent'
    )
  );
  logger.general.info(
    chalk.gray(
      '    • Explore the marketplace with "ghostspeak marketplace list"'
    )
  );
  logger.general.info(
    chalk.gray('    • Check system status with "ghostspeak status"')
  );
}

function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1
    .replace(/[^0-9.]/g, '')
    .split('.')
    .map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}
