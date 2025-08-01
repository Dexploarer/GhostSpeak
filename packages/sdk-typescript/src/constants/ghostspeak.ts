/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet and ready for production use
 */
export const GHOSTSPEAK_PROGRAM_ID = address('CBpmFUfm5GBgdtx2G2exCQqMANhwa64S56kD8Wa3Ugv4')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: 'CBpmFUfm5GBgdtx2G2exCQqMANhwa64S56kD8Wa3Ugv4',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: 'CBpmFUfm5GBgdtx2G2exCQqMANhwa64S56kD8Wa3Ugv4',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: 'CBpmFUfm5GBgdtx2G2exCQqMANhwa64S56kD8Wa3Ugv4', // Same as devnet for now
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