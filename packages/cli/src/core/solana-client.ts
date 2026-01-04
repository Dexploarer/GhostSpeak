/**
 * Centralized Solana Client Utilities using Gill
 *
 * Provides centralized Solana RPC client management with Gill for:
 * - Singleton pattern for efficiency
 * - Custom RPC URL support
 * - Network-specific clients
 */

import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'
import { loadConfig } from '../utils/config.js'

// Singleton client for CLI usage
let _client: SolanaClient<any> | null = null

// Cached config for client creation
let _cachedRpcUrl: string | null = null

/**
 * Get the default RPC URL based on network configuration
 */
function getDefaultRpcUrl(): string {
  const config = loadConfig()

  // If custom RPC URL is configured, use it
  if (config.rpcUrl) {
    return config.rpcUrl
  }

  // Otherwise use default URLs based on network
  switch (config.network) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com'
    case 'testnet':
      return 'https://api.testnet.solana.com'
    case 'localnet':
      return 'http://localhost:8899'
    case 'devnet':
    default:
      return 'https://api.devnet.solana.com'
  }
}

/**
 * Get or create the singleton Solana client
 * Uses the configured RPC URL from config
 */
export function getSolanaClient(): SolanaClient<any> {
  const rpcUrl = getDefaultRpcUrl()

  // Reset client if RPC URL has changed
  if (_cachedRpcUrl !== rpcUrl) {
    _client = null
    _cachedRpcUrl = rpcUrl
  }

  if (!_client) {
    // Gill requires an object with urlOrMoniker
    _client = createSolanaClient({ urlOrMoniker: rpcUrl })
  }

  return _client
}

/**
 * Reset the singleton client (for testing or forced refresh)
 */
export function resetSolanaClient(): void {
  _client = null
  _cachedRpcUrl = null
}

/**
 * Create a custom Solana client with a specific RPC URL
 * Use this when you need a client with different settings than the global config
 *
 * @param rpcUrl - The RPC URL to connect to
 */
export function createCustomClient(rpcUrl: string): SolanaClient<any> {
  return createSolanaClient({ urlOrMoniker: rpcUrl })
}

/**
 * Create a network-specific Solana client
 * Useful when you need to interact with a specific network regardless of config
 *
 * @param network - The network to connect to
 */
export function createNetworkClient(network: 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet'): SolanaClient<any> {
  // Gill supports monikers for standard networks
  const moniker = network === 'localnet' ? 'localnet' : network
  return createSolanaClient({ urlOrMoniker: moniker })
}

// Re-export commonly used Gill functions for convenience
export {
  // Client creation
  createSolanaClient,

  // Type exports
  type SolanaClient,
} from 'gill'
