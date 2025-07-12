/**
 * Utility functions for CLI options handling
 */

import chalk from 'chalk';

/**
 * Valid Solana network options
 */
export const VALID_NETWORKS = ['devnet', 'testnet', 'mainnet-beta'] as const;
export type ValidNetwork = typeof VALID_NETWORKS[number];

/**
 * Check if verbose mode is enabled from command line arguments
 */
export function isVerboseMode(): boolean {
  return process.argv.includes('--verbose') || process.argv.includes('-v');
}

/**
 * Check if quiet mode is enabled from command line arguments
 */
export function isQuietMode(): boolean {
  return process.argv.includes('--quiet') || process.argv.includes('-q');
}

/**
 * Validate if a network string is a valid Solana network
 */
export function isValidNetwork(network: string): network is ValidNetwork {
  return VALID_NETWORKS.includes(network as ValidNetwork);
}

/**
 * Show network validation error and exit
 */
export function showNetworkValidationError(invalidNetwork: string): never {
  console.error(chalk.red('❌ Invalid network specified:'), chalk.yellow(invalidNetwork));
  console.error('');
  console.error(chalk.yellow('Valid networks:'));
  VALID_NETWORKS.forEach(network => {
    console.error(`  • ${chalk.cyan(network)}`);
  });
  console.error('');
  console.error(chalk.gray('Examples:'));
  console.error(chalk.gray('  ghostspeak --network devnet status'));
  console.error(chalk.gray('  ghostspeak --network mainnet-beta agent list'));
  console.error('');
  process.exit(1);
}

/**
 * Get and validate the network from command line arguments
 */
export function getNetwork(): ValidNetwork {
  const networkIndex = process.argv.findIndex(arg => arg === '--network' || arg === '-n');
  let network: string;
  
  if (networkIndex !== -1 && process.argv[networkIndex + 1]) {
    network = process.argv[networkIndex + 1];
  } else {
    network = process.env.SOLANA_NETWORK || 'devnet';
  }
  
  if (!isValidNetwork(network)) {
    showNetworkValidationError(network);
  }
  
  return network;
}