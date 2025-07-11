/**
 * Utility functions for CLI options handling
 */

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
 * Get the network from command line arguments
 */
export function getNetwork(): string {
  const networkIndex = process.argv.findIndex(arg => arg === '--network' || arg === '-n');
  if (networkIndex !== -1 && process.argv[networkIndex + 1]) {
    return process.argv[networkIndex + 1];
  }
  return process.env.SOLANA_NETWORK || 'devnet';
}