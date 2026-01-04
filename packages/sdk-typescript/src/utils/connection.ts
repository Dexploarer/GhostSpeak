import type { RpcApi } from '../types/index.js'
import { createSolanaClient } from './solana-client.js'

/**
 * Utility functions for connection management
 *
 * Now powered by Gill for simplified client management.
 */

/**
 * Create a connection with recommended settings for GhostSpeak
 *
 * @param endpoint - RPC endpoint URL or network moniker (devnet, mainnet, etc.)
 * @returns RPC API object
 */
export function createRecommendedConnection(endpoint: string): RpcApi {
  // Use Gill's createSolanaClient for unified client management
  const client = createSolanaClient({ urlOrMoniker: endpoint })
  // Return the rpc object for backward compatibility
  return client.rpc as RpcApi
}

/**
 * Health check for RPC connection
 */
export async function checkConnectionHealth(rpc: RpcApi): Promise<boolean> {
  try {
    // Test basic RPC connectivity by getting latest blockhash
    const response = await rpc.getLatestBlockhash().send()
    
    // Check if we got a valid response with blockhash
    if (response.value.blockhash) {
      return true
    }
    
    return false
  } catch (error) {
    console.warn('Connection health check failed:', error)
    return false
  }
}

/**
 * Get recommended commitment level for different operations
 */
export function getRecommendedCommitment(operationType: 'read' | 'write'): string {
  switch (operationType) {
    case 'read':
      return 'confirmed'
    case 'write':
      return 'confirmed'
    default:
      return 'confirmed'
  }
}