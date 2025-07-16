import type { RpcApi } from '../types/index.js'

/**
 * Utility functions for connection management
 */

/**
 * Create a connection with recommended settings for GhostSpeak
 */
export function createRecommendedConnection(endpoint: string): RpcApi {
  const { createSolanaRpc } = require('@solana/kit')
  
  // Create RPC with optimized settings for GhostSpeak protocol
  const rpc = createSolanaRpc(endpoint, {
    // Add any specific configuration for optimal performance
  })
  
  return rpc
}

/**
 * Health check for RPC connection
 */
export async function checkConnectionHealth(rpc: RpcApi): Promise<boolean> {
  try {
    // Test basic RPC connectivity by getting latest blockhash
    const response = await rpc.getLatestBlockhash().send()
    
    // Check if we got a valid response with blockhash
    if (response && response.value && response.value.blockhash) {
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