/**
 * Solana Client Utilities using Modern Solana Web3.js v5
 *
 * Provides centralized Solana RPC client management with v5 for:
 * - Client-side operations (browser)
 * - Server-side operations (API routes)
 * - Singleton pattern for efficiency
 */

import { createSolanaRpc, type Rpc } from '@solana/rpc'
import type { SolanaRpcApi } from '@solana/rpc'
import { config } from '@/lib/config'

// Type for Solana RPC client
export type SolanaClient = Rpc<SolanaRpcApi>

// Singleton client for client-side usage
let _clientSideClient: SolanaClient | null = null

/**
 * Get or create the singleton Solana client for browser use
 * Uses NEXT_PUBLIC_SOLANA_RPC_URL from environment
 */
export function getSolanaClient(): SolanaClient {
  if (!_clientSideClient) {
    _clientSideClient = createSolanaRpc(config.solana.rpcUrl)
  }
  return _clientSideClient
}

/**
 * Create a new Solana client for server-side use (API routes)
 * Uses config.solana.rpcUrl
 *
 * @param rpcUrl - Optional custom RPC URL (falls back to config)
 */
export function createServerSolanaClient(rpcUrl?: string): SolanaClient {
  const url = rpcUrl || config.solana.rpcUrl
  return createSolanaRpc(url)
}

/**
 * Reset the client-side singleton (for testing or forced refresh)
 */
export function resetSolanaClient() {
  _clientSideClient = null
}

// Re-export commonly used Solana v5 functions for convenience
export { createSolanaRpc } from '@solana/rpc'
export type { Rpc, SolanaRpcApi } from '@solana/rpc'
