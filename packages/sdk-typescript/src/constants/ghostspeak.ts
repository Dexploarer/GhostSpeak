/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet - December 2025
 */
// ... (context if needed, but simple string replace is safer)
export const GHOSTSPEAK_PROGRAM_ID = address('GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9',
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