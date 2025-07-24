/**
 * Test IPFS configuration for beta testing and development
 */

import type { IPFSConfig } from '../types/ipfs-types.js'

/**
 * Test IPFS configuration that uses the in-memory test provider
 * This configuration does not require any external services
 */
export const TEST_IPFS_CONFIG: IPFSConfig = {
  provider: {
    name: 'test',
    endpoint: 'http://localhost:8080' // Fake endpoint for testing
  },
  gateways: [
    'http://localhost:8080',
    'https://test.ipfs.io'
  ],
  autoPinning: true,
  sizeThreshold: 400, // Lower threshold for testing (400 bytes)
  maxRetries: 2,
  retryDelay: 500,
  enableCache: true,
  cacheTTL: 60000 // 1 minute for testing
}

/**
 * Create a test IPFS configuration with custom options
 */
export function createTestIPFSConfig(options?: Partial<IPFSConfig>): IPFSConfig {
  return {
    ...TEST_IPFS_CONFIG,
    ...options,
    provider: {
      ...TEST_IPFS_CONFIG.provider,
      ...(options?.provider ?? {})
    }
  }
}