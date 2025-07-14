import type { RpcApi } from '../types/index.js'

/**
 * Utility functions for connection management
 */

/**
 * Create a connection with recommended settings for GhostSpeak
 */
export function createRecommendedConnection(endpoint: string): RpcApi {
  // TODO: Implement using @solana/kit Rpc with optimized settings
  throw new Error('Connection utilities not yet implemented - waiting for Codama generation')
}

/**
 * Health check for RPC connection
 */
export async function checkConnectionHealth(rpc: RpcApi): Promise<boolean> {
  try {
    // TODO: Implement health check
    throw new Error('Connection health check not yet implemented - waiting for Codama generation')
  } catch (error) {
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