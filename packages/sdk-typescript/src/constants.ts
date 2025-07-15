/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet and ready for production use
 */
export const GHOSTSPEAK_PROGRAM_ID = address('5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK', // Will be updated for mainnet
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