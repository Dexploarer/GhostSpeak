/**
 * Solana Client Utilities using Gill
 *
 * Provides centralized Solana RPC client management with Gill for:
 * - Client-side operations (browser)
 * - Server-side operations (API routes)
 * - Singleton pattern for efficiency
 */

import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

// Singleton client for client-side usage
let _clientSideClient: SolanaClient<any> | null = null

/**
 * Get or create the singleton Solana client for browser use
 * Uses NEXT_PUBLIC_SOLANA_RPC_URL from environment
 */
export function getSolanaClient(): SolanaClient<any> {
  if (!_clientSideClient) {
    const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    // Gill requires an object with urlOrMoniker
    _clientSideClient = createSolanaClient({ urlOrMoniker: url })
  }
  return _clientSideClient
}

/**
 * Create a new Solana client for server-side use (API routes)
 * Uses SOLANA_RPC_URL from server environment (can be different from client)
 *
 * @param rpcUrl - Optional custom RPC URL (falls back to env)
 */
export function createServerSolanaClient(rpcUrl?: string): SolanaClient<any> {
  const url =
    rpcUrl ||
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com'
  // Gill requires an object with urlOrMoniker
  return createSolanaClient({ urlOrMoniker: url })
}

/**
 * Reset the client-side singleton (for testing or forced refresh)
 */
export function resetSolanaClient() {
  _clientSideClient = null
}

// Re-export commonly used Gill functions for convenience
export {
  // Client creation
  createSolanaClient,

  // Type exports
  type SolanaClient,
} from 'gill'
