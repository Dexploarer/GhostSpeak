/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet and ready for production use
 */
export const GHOSTSPEAK_PROGRAM_ID = address('Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS',
    rpcUrl: 'https://api.mainnet-beta.solana.com'
  }
} as const

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  network: 'devnet' as keyof typeof NETWORK_CONFIG,
  confirmations: 1,
  timeout: 30000,
  maxRetries: 3
} as const