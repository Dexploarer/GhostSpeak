/**
 * Configuration Migration - Temporary stub for testing analytics
 */

import chalk from 'chalk';
import { logger } from './logger.js';

export async function migrateConfiguration(): Promise<boolean> {
  logger.general.info(chalk.yellow('🚧 Configuration migration temporarily disabled'));
  return false; // Nothing to migrate for now
}

export function getDefaultRpcUrl(network: string): string {
  switch (network) {
    case 'mainnet':
      return 'https://api.mainnet-beta.solana.com';
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    default:
      return 'https://api.devnet.solana.com';
  }
}