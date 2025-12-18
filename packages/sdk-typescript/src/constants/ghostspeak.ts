/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet - December 2025
 */
export const GHOSTSPEAK_PROGRAM_ID = address('4bJJNn4HgjZMZE59kRH4QBLbWa2NeZnUyf7AsThUWCGK')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: '4bJJNn4HgjZMZE59kRH4QBLbWa2NeZnUyf7AsThUWCGK',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: '4bJJNn4HgjZMZE59kRH4QBLbWa2NeZnUyf7AsThUWCGK',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: '4bJJNn4HgjZMZE59kRH4QBLbWa2NeZnUyf7AsThUWCGK',
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