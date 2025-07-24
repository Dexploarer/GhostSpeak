/**
 * Test IPFS provider for beta testing without external dependencies
 */

import './text-encoder-polyfill.js'
import type {
  IPFSProviderConfig,
  IPFSUploadOptions,
  IPFSUploadResult,
  IPFSRetrievalOptions,
  IPFSPinResult
} from '../types/ipfs-types.js'

interface IPFSProvider {
  upload(content: string | Uint8Array, options?: IPFSUploadOptions): Promise<IPFSUploadResult>
  retrieve(hash: string, options?: IPFSRetrievalOptions): Promise<string | Uint8Array>
  pin(hash: string): Promise<IPFSPinResult>
  unpin(hash: string): Promise<IPFSPinResult>
}

// Shared storage for all test IPFS provider instances
const sharedTestStorage = new Map<string, { content: string | Uint8Array; pinned: boolean }>()
let sharedUploadCount = 0

/**
 * In-memory test IPFS provider for development and testing
 * This provider simulates IPFS behavior without requiring external services
 */
export class TestIPFSProvider implements IPFSProvider {
  // Use shared storage across all instances
  private storage = sharedTestStorage
  private uploadCount = 0

  constructor(private config: IPFSProviderConfig) {
    console.log('🧪 Initialized TestIPFSProvider for local testing (shared storage)')
  }

  async upload(content: string | Uint8Array, options?: IPFSUploadOptions): Promise<IPFSUploadResult> {
    // Generate a fake but deterministic IPFS hash
    sharedUploadCount++
    const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content)
    const hash = `Qm${this.generateHash(contentStr)}_test_${sharedUploadCount}`
    
    // Store the content
    this.storage.set(hash, {
      content,
      pinned: options?.pin !== false
    })

    const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.length

    console.log(`📦 Test IPFS upload: ${hash} (${size} bytes)`)

    return {
      hash,
      uri: `ipfs://${hash}`,
      size,
      timestamp: Date.now(),
      pinned: options?.pin !== false,
      gateways: [
        `http://localhost:8080/ipfs/${hash}`,
        `https://test.ipfs.io/ipfs/${hash}`
      ]
    }
  }

  async retrieve(hash: string): Promise<string | Uint8Array> {
    const stored = this.storage.get(hash)
    
    if (!stored) {
      throw new Error(`Test IPFS: Content not found for hash ${hash}`)
    }

    console.log(`📥 Test IPFS retrieve: ${hash}`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return stored.content
  }

  async pin(hash: string): Promise<IPFSPinResult> {
    const stored = this.storage.get(hash)
    
    if (!stored) {
      return {
        hash,
        success: false,
        status: 'failed',
        error: `Content not found: ${hash}`
      }
    }

    stored.pinned = true
    console.log(`📌 Test IPFS pin: ${hash}`)

    return {
      hash,
      success: true,
      status: 'pinned'
    }
  }

  async unpin(hash: string): Promise<IPFSPinResult> {
    const stored = this.storage.get(hash)
    
    if (!stored) {
      return {
        hash,
        success: false,
        status: 'failed',
        error: `Content not found: ${hash}`
      }
    }

    stored.pinned = false
    console.log(`📌 Test IPFS unpin: ${hash}`)

    return {
      hash,
      success: true,
      status: 'pinned' // Status after operation
    }
  }

  /**
   * Generate a fake but consistent hash for testing
   */
  private generateHash(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to base58-like string (simplified for testing)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    let value = Math.abs(hash)
    
    while (value > 0 && result.length < 40) {
      result = chars[value % chars.length] + result
      value = Math.floor(value / chars.length)
    }
    
    // Pad to make it look like a real IPFS hash
    while (result.length < 40) {
      result = chars[Math.floor(Math.random() * chars.length)] + result
    }
    
    return result
  }

  /**
   * Get storage statistics for testing
   */
  getStats(): { count: number; totalSize: number; pinned: number } {
    let totalSize = 0
    let pinned = 0
    
    for (const data of this.storage.values()) {
      const size = typeof data.content === 'string' 
        ? new TextEncoder().encode(data.content).length 
        : data.content.length
      totalSize += size
      if (data.pinned) pinned++
    }
    
    return {
      count: this.storage.size,
      totalSize,
      pinned
    }
  }

  /**
   * Clear all stored content (for testing)
   */
  clear(): void {
    this.storage.clear()
    sharedUploadCount = 0
    console.log('🧹 Test IPFS storage cleared')
  }
  
  /**
   * Get the shared storage (for debugging)
   */
  static getSharedStorage(): Map<string, { content: string | Uint8Array; pinned: boolean }> {
    return sharedTestStorage
  }
}