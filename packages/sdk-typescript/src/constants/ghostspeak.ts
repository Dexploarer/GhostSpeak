/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet and ready for production use
 */
export const GHOSTSPEAK_PROGRAM_ID = address('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: '5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: '5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: '5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG', // Same as devnet for now
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