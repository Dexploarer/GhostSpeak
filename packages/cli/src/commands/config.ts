/**
 * Config Command - Configuration Management
 *
 * Manages CLI configuration including network settings, wallet paths, and preferences.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { logger } from '../utils/logger.js';

export interface ConfigOptions {
  show?: boolean;
  reset?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  try {
    if (options.reset) {
      await resetConfig();
    } else {
      await showConfig();
    }
  } catch (error) {
    logger.config.error('Config command failed:', error);
    throw error;
  }
}

async function showConfig(): Promise<void> {
  logger.general.info(chalk.cyan('⚙️  GhostSpeak Configuration'));
  logger.general.info(chalk.gray('─'.repeat(40)));

  const configManager = await ConfigManager.load();
  const config = configManager.get();

  logger.general.info(chalk.yellow('Current Configuration:'));
  logger.general.info(`  Network: ${config.network || 'devnet'}`);
  logger.general.info(
    `  RPC URL: ${config.rpcUrl || 'https://api.devnet.solana.com'}`
  );
  logger.general.info(
    `  Wallet Path: ${config.defaultAgent || 'not configured'}`
  );
  logger.general.info(`  Theme: ${config.theme || 'auto'}`);
  logger.general.info(
    `  Verbose Logging: ${config.verbose ? 'enabled' : 'disabled'}`
  );
  logger.general.info('');

  logger.general.info(chalk.green('✅ Configuration displayed successfully'));
}

async function resetConfig(): Promise<void> {
  logger.general.info(
    chalk.yellow('🔄 Resetting configuration to defaults...')
  );

  // Get ConfigManager instance and reset it
  const configManager = await ConfigManager.load();
  configManager.reset();
  await configManager.save();

  logger.general.info(chalk.green('✅ Configuration reset to defaults'));
  logger.general.info('');
  logger.general.info(
    chalk.gray('Run "ghostspeak config --show" to view current settings')
  );
}
