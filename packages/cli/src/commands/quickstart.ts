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
import { logger } from '../utils/logger.js';
import { isVerboseMode } from '../utils/cli-options.js';

interface QuickstartOptions {
  skipWallet?: boolean;
  skipNetwork?: boolean;
}

export async function runQuickstart(
  options: QuickstartOptions = {}
): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());

  try {
    cliLogger.general.info(chalk.cyan('🚀 GhostSpeak Quickstart Guide'));
    cliLogger.general.info(
      chalk.gray('This will get you up and running in 5-10 minutes')
    );
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info('');

    // Step 1: Check prerequisites
    cliLogger.general.info(chalk.yellow('📋 Step 1: Checking Prerequisites'));
    await checkPrerequisites(cliLogger);

    // Step 2: Network configuration
    if (!options.skipNetwork) {
      cliLogger.general.info(chalk.yellow('\n🌐 Step 2: Network Configuration'));
      await configureNetwork(cliLogger);
    }

    // Step 3: Wallet setup
    if (!options.skipWallet) {
      cliLogger.general.info(chalk.yellow('\n💳 Step 3: Wallet Setup'));
      await setupWallet(cliLogger);
    }

    // Step 4: Test connection
    cliLogger.general.info(chalk.yellow('\n🔍 Step 4: Testing Connection'));
    await testConnection(cliLogger);

    // Step 5: Basic example
    cliLogger.general.info(chalk.yellow('\n🎯 Step 5: Next Steps'));
    showNextSteps(cliLogger);

    // Success message
    cliLogger.general.info(chalk.green('\n✅ Quickstart Complete!'));
    cliLogger.general.info(
      chalk.cyan("🎉 You're ready to start using GhostSpeak!")
    );
    
    // Check if Solana CLI was missing
    try {
      execSync('solana --version', { stdio: 'pipe' });
    } catch {
      cliLogger.general.info('');
      cliLogger.general.info(chalk.yellow('⚠️  Note: Solana CLI is not installed'));
      cliLogger.general.info(chalk.gray('   To access blockchain features, install it from:'));
      cliLogger.general.info(chalk.gray('   https://docs.solana.com/cli/install-solana-cli-tools'));
    }
  } catch (error) {
    cliLogger.general.error('Quickstart failed:', error instanceof Error ? error : { error: String(error) });
    throw error;
  }
}

async function checkPrerequisites(cliLogger: Logger): Promise<void> {
  const checks = [
    { name: 'Node.js', command: 'node --version', minVersion: '20.0.0', required: true },
    { name: 'Solana CLI', command: 'solana --version', minVersion: '1.18.0', required: false },
  ];

  for (const check of checks) {
    cliLogger.general.info(chalk.blue(`  Checking ${check.name}...`));

    try {
      const output = execSync(check.command, { encoding: 'utf8', stdio: 'pipe' }).trim();
      const version = output.split(' ').pop() || '';

      if (compareVersions(version, check.minVersion) >= 0) {
        cliLogger.general.info(chalk.green(`    ✓ ${check.name} ${version}`));
      } else {
        if (check.required) {
          cliLogger.general.info(
            chalk.red(
              `    ✗ ${check.name} ${version} (need ${check.minVersion}+)`
            )
          );
          throw new Error(`${check.name} version ${check.minVersion}+ required`);
        } else {
          cliLogger.general.info(
            chalk.yellow(
              `    ⚠ ${check.name} ${version} (need ${check.minVersion}+, optional)`
            )
          );
        }
      }
    } catch (error) {
      // Check if it's a version error or command not found
      if (error instanceof Error && error.message.includes('version')) {
        throw error;
      }
      
      if (check.required) {
        cliLogger.general.info(chalk.red(`    ✗ ${check.name} not found`));
        throw new Error(`${check.name} is required. Please install it first.`);
      } else {
        cliLogger.general.info(chalk.yellow(`    ⚠ ${check.name} not found (optional for quickstart)`));
        cliLogger.general.info(chalk.gray(`      Install instructions: https://docs.solana.com/cli/install-solana-cli-tools`));
      }
    }
  }
}

async function configureNetwork(cliLogger: Logger): Promise<void> {
  cliLogger.general.info(chalk.blue('  Configuring Solana network...'));

  try {
    // Check if Solana CLI is available
    try {
      execSync('solana --version', { stdio: 'pipe' });
    } catch {
      cliLogger.general.info(chalk.yellow('    ⚠ Solana CLI not found - skipping network configuration'));
      cliLogger.general.info(chalk.gray('      You can configure it later with: solana config set --url https://api.devnet.solana.com'));
      return;
    }
    
    // Set to devnet for quickstart
    execSync('solana config set --url https://api.devnet.solana.com', {
      stdio: 'pipe',
    });

    // Verify configuration
    const config = execSync('solana config get', { encoding: 'utf8' });

    if (config.includes('devnet')) {
      cliLogger.general.info(chalk.green('    ✓ Network configured to devnet'));
    } else {
      throw new Error('Failed to configure network');
    }
  } catch (error) {
    cliLogger.general.info(chalk.red('    ✗ Network configuration failed'));
    if (error instanceof Error) {
      cliLogger.general.info(chalk.red(`    Error: ${error.message}`));
    }
    throw new Error('Failed to configure Solana network. Make sure Solana CLI is installed and working.');
  }
}

async function setupWallet(cliLogger: Logger): Promise<void> {
  cliLogger.general.info(chalk.blue('  Setting up wallet...'));

  try {
    // Check if Solana CLI is available
    try {
      execSync('solana --version', { stdio: 'pipe' });
    } catch {
      cliLogger.general.info(chalk.yellow('    ⚠ Solana CLI not found - skipping wallet setup'));
      cliLogger.general.info(chalk.gray('      You can set up a wallet later with: solana-keygen new'));
      return;
    }
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');

    if (!existsSync(walletPath)) {
      cliLogger.general.info(chalk.blue('    Creating new wallet keypair...'));
      try {
        execSync('solana-keygen new --no-bip39-passphrase --force', {
          stdio: 'pipe',
        });
      } catch (keygenError) {
        throw new Error('Failed to create wallet keypair. Make sure Solana CLI is properly installed.');
      }
    }

    // Request airdrop for devnet
    try {
      cliLogger.general.info(chalk.blue('    Requesting devnet SOL...'));
      execSync('solana airdrop 2', { stdio: 'pipe' });
    } catch (airdropError) {
      // Airdrop might fail, but that's okay for quickstart
      cliLogger.general.info(
        chalk.yellow('    ⚠ Airdrop failed (normal on devnet)')
      );
    }

    // Check balance
    const balance = execSync('solana balance', { encoding: 'utf8' }).trim();
    cliLogger.general.info(
      chalk.green(`    ✓ Wallet ready - Balance: ${balance}`)
    );
  } catch (error) {
    cliLogger.general.info(chalk.red('    ✗ Wallet setup failed'));
    if (error instanceof Error) {
      cliLogger.general.info(chalk.red(`    Error: ${error.message}`));
    }
    throw error;
  }
}

async function testConnection(cliLogger: Logger): Promise<void> {
  cliLogger.general.info(chalk.blue('  Testing connection to Solana...'));

  try {
    // Check if Solana CLI is available
    try {
      execSync('solana --version', { stdio: 'pipe' });
    } catch {
      cliLogger.general.info(chalk.yellow('    ⚠ Solana CLI not found - skipping connection test'));
      cliLogger.general.info(chalk.gray('      Install Solana CLI to test blockchain connectivity'));
      return;
    }
    const blockHeight = execSync('solana block-height', {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    cliLogger.general.info(
      chalk.green(`    ✓ Connected to Solana - Block Height: ${blockHeight}`)
    );
  } catch (error) {
    cliLogger.general.info(chalk.red('    ✗ Connection test failed'));
    if (error instanceof Error) {
      cliLogger.general.info(chalk.red(`    Error: ${error.message}`));
    }
    throw new Error('Failed to connect to Solana network. Check your network configuration and internet connection.');
  }
}

function showNextSteps(cliLogger: Logger): void {
  cliLogger.general.info(chalk.blue('  Available commands:'));
  cliLogger.general.info(
    chalk.gray('    • ghostspeak status      - Show system status')
  );
  cliLogger.general.info(
    chalk.gray('    • ghostspeak config      - Manage configuration')
  );
  cliLogger.general.info(
    chalk.gray('    • ghostspeak agent list  - List your agents')
  );
  cliLogger.general.info(
    chalk.gray('    • ghostspeak marketplace - Browse services')
  );
  cliLogger.general.info(chalk.gray('    • ghostspeak dev keys    - Manage keys'));
  cliLogger.general.info('');
  cliLogger.general.info(chalk.yellow('  Next steps:'));
  cliLogger.general.info(
    chalk.gray(
      '    • Run "ghostspeak agent register MyAgent" to create your first agent'
    )
  );
  cliLogger.general.info(
    chalk.gray(
      '    • Explore the marketplace with "ghostspeak marketplace list"'
    )
  );
  cliLogger.general.info(
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
