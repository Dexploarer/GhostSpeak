/**
 * Centralized Solana Client Utilities using Gill
 *
 * This module provides a unified interface for creating and managing
 * Solana RPC clients using the Gill library. It serves as the single
 * source of truth for all RPC client operations in the SDK.
 *
 * Gill is a modern Solana JavaScript/TypeScript SDK built on top of
 * @solana/kit (formerly web3.js v2) that provides:
 * - Simplified client creation
 * - Built-in transaction confirmation
 * - Network moniker support (devnet, mainnet, localnet)
 *
 * @example
 * ```typescript
 * import { createSolanaClient, getDefaultSolanaClient } from './solana-client.js'
 *
 * // Create a client with custom endpoint
 * const client = createSolanaClient({ urlOrMoniker: 'https://my-rpc.com' })
 *
 * // Get the default singleton client
 * const defaultClient = getDefaultSolanaClient()
 *
 * // Use the RPC
 * const balance = await client.rpc.getBalance(address).send()
 * ```
 */

import { createSolanaClient as gillCreateSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

// Re-export Gill types and functions for convenience
export { createSolanaClient as gillCreateSolanaClient } from 'gill'
export type { SolanaClient } from 'gill'

/**
 * Configuration options for creating a Solana client
 */
export interface SolanaClientConfig {
  /** RPC URL or network moniker (devnet, mainnet, localnet, testnet) */
  urlOrMoniker: string
}

/**
 * Network monikers supported by Gill
 */
export type NetworkMoniker = 'devnet' | 'mainnet' | 'localnet' | 'testnet'

// Default RPC endpoints for each network
const DEFAULT_ENDPOINTS: Record<NetworkMoniker, string> = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  localnet: 'http://127.0.0.1:8899',
  testnet: 'https://api.testnet.solana.com',
}

// Singleton client instance
let _defaultClient: SolanaClient<any> | null = null
let _cachedEndpoint: string | null = null

/**
 * Create a new Solana client using Gill
 *
 * This is a wrapper around Gill's createSolanaClient that provides
 * additional configuration options and a consistent interface.
 *
 * @param config - Configuration options for the client
 * @returns A new SolanaClient instance
 *
 * @example
 * ```typescript
 * // Using a network moniker
 * const devnetClient = createSolanaClient({ urlOrMoniker: 'devnet' })
 *
 * // Using a custom RPC URL
 * const customClient = createSolanaClient({
 *   urlOrMoniker: 'https://my-rpc-provider.com'
 * })
 * ```
 */
export function createSolanaClient(config: SolanaClientConfig): SolanaClient<any> {
  return gillCreateSolanaClient({ urlOrMoniker: config.urlOrMoniker })
}

/**
 * Get or create the default singleton Solana client
 *
 * This function provides a singleton pattern for SDK-wide RPC operations.
 * The client is lazily initialized and reused across all calls.
 *
 * If an endpoint is provided and differs from the cached endpoint,
 * a new client will be created.
 *
 * @param endpoint - Optional RPC endpoint or network moniker
 * @returns The singleton SolanaClient instance
 *
 * @example
 * ```typescript
 * // Get default client (devnet)
 * const client = getDefaultSolanaClient()
 *
 * // Get client for specific endpoint
 * const mainnetClient = getDefaultSolanaClient('mainnet')
 *
 * // Use custom RPC
 * const customClient = getDefaultSolanaClient('https://my-rpc.com')
 * ```
 */
export function getDefaultSolanaClient(endpoint?: string): SolanaClient<any> {
  const targetEndpoint = endpoint || DEFAULT_ENDPOINTS.devnet

  // Reset client if endpoint has changed
  if (_cachedEndpoint !== targetEndpoint) {
    _defaultClient = null
    _cachedEndpoint = targetEndpoint
  }

  if (!_defaultClient) {
    _defaultClient = gillCreateSolanaClient({ urlOrMoniker: targetEndpoint })
  }

  return _defaultClient
}

/**
 * Reset the default singleton client
 *
 * This is useful for testing or when you need to force a client refresh.
 * After calling this function, the next call to getDefaultSolanaClient
 * will create a new client instance.
 *
 * @example
 * ```typescript
 * // In tests
 * beforeEach(() => {
 *   resetDefaultClient()
 * })
 * ```
 */
export function resetDefaultClient(): void {
  _defaultClient = null
  _cachedEndpoint = null
}

/**
 * Create a network-specific Solana client
 *
 * This is a convenience function for creating clients connected
 * to standard Solana networks using Gill's network moniker support.
 *
 * @param network - The network to connect to
 * @returns A new SolanaClient instance connected to the specified network
 *
 * @example
 * ```typescript
 * const devnetClient = createNetworkClient('devnet')
 * const mainnetClient = createNetworkClient('mainnet')
 * ```
 */
export function createNetworkClient(network: NetworkMoniker): SolanaClient<any> {
  // Gill supports these monikers directly
  return gillCreateSolanaClient({ urlOrMoniker: network })
}

/**
 * Check if an endpoint is a network moniker
 *
 * @param endpoint - The endpoint string to check
 * @returns True if the endpoint is a recognized network moniker
 */
export function isNetworkMoniker(endpoint: string): endpoint is NetworkMoniker {
  return ['devnet', 'mainnet', 'localnet', 'testnet'].includes(endpoint)
}

/**
 * Get the default RPC URL for a network
 *
 * @param network - The network moniker
 * @returns The default RPC URL for the network
 */
export function getDefaultEndpoint(network: NetworkMoniker): string {
  return DEFAULT_ENDPOINTS[network]
}

/**
 * Detect the network from an RPC endpoint URL
 *
 * @param endpoint - The RPC endpoint URL
 * @returns The detected network or 'unknown'
 */
export function detectNetworkFromEndpoint(
  endpoint: string
): NetworkMoniker | 'unknown' {
  const lowerEndpoint = endpoint.toLowerCase()

  if (
    lowerEndpoint.includes('devnet') ||
    lowerEndpoint.includes('api.devnet.solana.com')
  ) {
    return 'devnet'
  }

  if (
    lowerEndpoint.includes('mainnet') ||
    lowerEndpoint.includes('api.mainnet-beta.solana.com')
  ) {
    return 'mainnet'
  }

  if (
    lowerEndpoint.includes('testnet') ||
    lowerEndpoint.includes('api.testnet.solana.com')
  ) {
    return 'testnet'
  }

  if (
    lowerEndpoint.includes('localhost') ||
    lowerEndpoint.includes('127.0.0.1')
  ) {
    return 'localnet'
  }

  return 'unknown'
}
