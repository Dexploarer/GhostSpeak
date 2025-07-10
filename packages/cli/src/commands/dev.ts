/**
 * Dev Commands - Developer Tools and Utilities
 *
 * Provides development utilities including key management, testing, and debugging tools.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

export async function manageKeys(): Promise<void> {

  try {
    logger.general.info(chalk.cyan('🔑 Key Management'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    logger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));
    logger.general.info('');

    // Check for existing Solana wallet
    const solanaConfigPath = join(
      homedir(),
      '.config',
      'solana',
      'cli',
      'config.yml'
    );
    const solanaKeypairPath = join(homedir(), '.config', 'solana', 'id.json');

    logger.general.info(chalk.yellow('Wallet Status:'));

    if (existsSync(solanaConfigPath)) {
      logger.general.info(
        `  Config: ${chalk.green('✓ Found')} (${solanaConfigPath})`
      );

      try {
        const configContent = readFileSync(solanaConfigPath, 'utf8');
        const keypairPathMatch = configContent.match(/keypair_path:\s*(.+)/);
        if (keypairPathMatch) {
          const keypairPath = keypairPathMatch[1].trim();
          logger.general.info(
            `  Keypair: ${chalk.green('✓ Found')} (${keypairPath})`
          );

          if (existsSync(keypairPath)) {
            const keypairData = JSON.parse(readFileSync(keypairPath, 'utf8'));
            logger.general.info(
              `  Keypair Valid: ${chalk.green('✓ Yes')} (${keypairData.length} bytes)`
            );
          } else {
            logger.general.info(
              `  Keypair Valid: ${chalk.red('✗ File not found')}`
            );
          }
        }
      } catch (error) {
        logger.general.info(
          `  Config Parse: ${chalk.red('✗ Error parsing config')}`
        );
      }
    } else {
      logger.general.info(`  Config: ${chalk.red('✗ Not found')}`);
      logger.general.info(`  Keypair: ${chalk.red('✗ Not configured')}`);
    }

    logger.general.info('');

    // Show key management options
    logger.general.info(chalk.yellow('Key Management Options:'));
    logger.general.info('  • Generate new keypair: solana-keygen new');
    logger.general.info('  • Import existing keypair: solana-keygen recover');
    logger.general.info('  • Show public key: solana-keygen pubkey');
    logger.general.info('  • Set config: solana config set --keypair <path>');
    logger.general.info('');

    // Show network configuration
    logger.general.info(chalk.yellow('Network Configuration:'));
    logger.general.info('  • Set devnet: solana config set --url devnet');
    logger.general.info('  • Set testnet: solana config set --url testnet');
    logger.general.info(
      '  • Set mainnet: solana config set --url mainnet-beta'
    );
    logger.general.info('  • Show config: solana config get');
    logger.general.info('');

    // Show airdrop options for devnet
    if (config.network === 'devnet') {
      logger.general.info(chalk.yellow('Devnet Airdrop:'));
      logger.general.info('  • Request SOL: solana airdrop 2');
      logger.general.info('  • Check balance: solana balance');
      logger.general.info('');
    }

    logger.general.info(chalk.green('✅ Key management information displayed'));
  } catch (error) {
    logger.dev.error('Key management failed:', error);
    throw error;
  }
}
