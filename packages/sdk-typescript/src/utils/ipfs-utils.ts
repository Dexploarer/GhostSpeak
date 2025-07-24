/**
 * Utility functions for IPFS operations in GhostSpeak
 */

import './text-encoder-polyfill.js'
import type {
  IPFSConfig,
  IPFSContentMetadata,
  ContentStorageResult,
  IPFSUploadOptions,
  IPFSOperationResult
} from '../types/ipfs-types.js'
import { IPFSClient } from './ipfs-client.js'

/**
 * Default IPFS configuration for GhostSpeak
 */
export const DEFAULT_IPFS_CONFIG: IPFSConfig = {
  provider: {
    name: 'pinata',
    endpoint: 'https://api.pinata.cloud'
  },
  gateways: [
    'https://gateway.pinata.cloud',
    'https://ipfs.io',
    'https://cloudflare-ipfs.com',
    'https://gateway.ipfs.io'
  ],
  autoPinning: true,
  sizeThreshold: 800, // 800 bytes threshold to stay under Solana transaction limits
  maxRetries: 3,
  retryDelay: 1000,
  enableCache: true,
  cacheTTL: 300000 // 5 minutes
}

/**
 * IPFS utility class with convenience methods
 */
export class IPFSUtils {
  public client: IPFSClient

  constructor(config: IPFSConfig) {
    this.client = new IPFSClient(config)
  }

  /**
   * Store agent metadata with automatic IPFS/inline decision
   */
  async storeAgentMetadata(
    metadata: {
      name: string
      description: string
      capabilities: string[]
      serviceEndpoint: string
      agentId?: string
      [key: string]: unknown
    },
    options?: IPFSUploadOptions
  ): Promise<ContentStorageResult> {
    const metadataJson = JSON.stringify({
      ...metadata,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    })

    return this.client.storeContent(metadataJson, 'agent-metadata', {
      filename: `agent-${metadata.agentId ?? 'metadata'}.json`,
      metadata: {
        type: 'agent-metadata',
        agentId: metadata.agentId,
        name: metadata.name
      },
      contentType: 'application/json',
      ...options
    })
  }

  /**
   * Store channel message content with automatic IPFS/inline decision
   */
  async storeChannelMessage(
    message: {
      content: string
      messageType?: number
      attachments?: string[]
      channelId?: string
      sender?: string
      [key: string]: unknown
    },
    options?: IPFSUploadOptions
  ): Promise<ContentStorageResult> {
    const messageJson = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })

    return this.client.storeContent(messageJson, 'channel-message', {
      filename: `message-${Date.now()}.json`,
      metadata: {
        type: 'channel-message',
        channelId: message.channelId,
        messageType: message.messageType ?? 0
      },
      contentType: 'application/json',
      ...options
    })
  }

  /**
   * Store file attachments on IPFS
   */
  async storeFileAttachment(
    fileContent: Uint8Array | string,
    filename: string,
    contentType: string,
    options?: IPFSUploadOptions
  ): Promise<ContentStorageResult> {
    const content = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent)
    
    return this.client.storeContent(content, 'file-attachment', {
      filename,
      contentType,
      metadata: {
        type: 'file-attachment',
        originalFilename: filename,
        mimeType: contentType
      },
      ...options
    })
  }

  /**
   * Retrieve and parse agent metadata
   */
  async retrieveAgentMetadata(uri: string): Promise<{
    name: string
    description: string
    capabilities: string[]
    serviceEndpoint: string
    agentId?: string
    createdAt?: string
    [key: string]: unknown
  }> {
    const content = await this.client.retrieveContent(uri)
    const parsed: unknown = JSON.parse(content)
    
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Retrieved agent metadata is not a valid object')
    }
    
    return parsed as {
      name: string
      description: string
      capabilities: string[]
      serviceEndpoint: string
      agentId?: string
      createdAt?: string
      [key: string]: unknown
    }
  }

  /**
   * Retrieve and parse channel message content
   */
  async retrieveChannelMessage(uri: string): Promise<{
    content: string
    messageType?: number
    attachments?: string[]
    timestamp?: string
    [key: string]: unknown
  }> {
    const content = await this.client.retrieveContent(uri)
    const parsed: unknown = JSON.parse(content)
    
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Retrieved channel message is not a valid object')
    }
    
    return parsed as {
      content: string
      messageType?: number
      attachments?: string[]
      timestamp?: string
      [key: string]: unknown
    }
  }

  /**
   * Batch upload multiple content items
   */
  async batchUpload(
    items: {
      content: string
      type: IPFSContentMetadata['type']
      filename?: string
      options?: IPFSUploadOptions
    }[]
  ): Promise<IPFSOperationResult<ContentStorageResult>[]> {
    const results = await Promise.allSettled(
      items.map(item => 
        this.client.storeContent(item.content, item.type, {
          filename: item.filename,
          ...item.options
        })
      )
    )

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return {
          success: true,
          data: result.value
        }
      } else {
        return {
          success: false,
          error: 'UPLOAD_FAILED' as const,
          message: result.reason instanceof Error ? result.reason.message : String(result.reason)
        }
      }
    })
  }

  /**
   * Pin existing content by hash
   */
  async pinContent(hash: string): Promise<IPFSOperationResult<boolean>> {
    const result = await this.client.pin(hash)
    return {
      ...result,
      data: result.success
    }
  }

  /**
   * Check if a URI uses IPFS storage
   */
  isIPFSUri(uri: string): boolean {
    return uri.startsWith('ipfs://')
  }

  /**
   * Extract IPFS hash from URI
   */
  extractIPFSHash(uri: string): string | null {
    if (!this.isIPFSUri(uri)) {
      return null
    }
    return uri.replace('ipfs://', '')
  }

  /**
   * Convert IPFS hash to gateway URLs
   */
  getGatewayUrls(hash: string, gateways?: string[]): string[] {
    const defaultGateways = gateways ?? DEFAULT_IPFS_CONFIG.gateways ?? []
    return defaultGateways.map(gateway => `${gateway}/ipfs/${hash}`)
  }

  /**
   * Validate IPFS hash format
   */
  isValidIPFSHash(hash: string): boolean {
    // Basic validation for IPFS hash (CIDv0 or CIDv1)
    if (hash.length < 44) return false
    
    // CIDv0: starts with Qm and is 46 characters
    if (hash.startsWith('Qm') && hash.length === 46) {
      return /^Qm[A-Za-z0-9]{44}$/.test(hash)
    }
    
    // CIDv1: more complex validation
    if (hash.length > 46) {
      return /^[A-Za-z0-9]+$/.test(hash)
    }
    
    return false
  }

  /**
   * Calculate content size to determine if IPFS should be used
   */
  shouldUseIPFS(content: string, threshold?: number): boolean {
    const size = new TextEncoder().encode(content).length
    const sizeThreshold = threshold ?? DEFAULT_IPFS_CONFIG.sizeThreshold ?? 800
    return size > sizeThreshold
  }

  /**
   * Compress content before IPFS upload using modern compression APIs
   */
  async compressContent(content: string): Promise<{ compressed: string; algorithm: string }> {
    try {
      // Use browser CompressionStream if available (Node.js 18+ and modern browsers)
      if (typeof CompressionStream !== 'undefined') {
        const compressedStream = new CompressionStream('gzip')
        const writer = compressedStream.writable.getWriter()
        const reader = compressedStream.readable.getReader()
        
        // Encode string to Uint8Array
        const encoder = new TextEncoder()
        const input = encoder.encode(content)
        
        // Start compression
        const writePromise = writer.write(input).then(() => writer.close())
        const chunks: Uint8Array[] = []
        
        // Read compressed chunks
        const readCompressed = async (): Promise<void> => {
          const { done, value } = await reader.read()
          if (!done && value) {
            chunks.push(value)
            await readCompressed()
          }
        }
        
        await Promise.all([writePromise, readCompressed()])
        
        // Combine chunks and encode as base64
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const compressedData = new Uint8Array(totalLength)
        let offset = 0
        
        for (const chunk of chunks) {
          compressedData.set(chunk, offset)
          offset += chunk.length
        }
        
        // Convert to base64 for storage
        const compressed = Buffer.from(compressedData).toString('base64')
        
        return {
          compressed,
          algorithm: 'gzip'
        }
      } else {
        // Fallback to no compression in environments without support
        console.warn('Compression not available in this environment, storing uncompressed')
        return {
          compressed: content,
          algorithm: 'none'
        }
      }
    } catch (error) {
      console.warn('Compression failed, falling back to uncompressed:', error)
      return {
        compressed: content,
        algorithm: 'none'
      }
    }
  }

  /**
   * Decompress content after IPFS retrieval using modern decompression APIs
   */
  async decompressContent(compressed: string, algorithm: string): Promise<string> {
    if (algorithm === 'none') {
      return compressed
    }
    
    try {
      if (algorithm === 'gzip') {
        // Use browser DecompressionStream if available (Node.js 18+ and modern browsers)
        if (typeof DecompressionStream !== 'undefined') {
          const decompressedStream = new DecompressionStream('gzip')
          const writer = decompressedStream.writable.getWriter()
          const reader = decompressedStream.readable.getReader()
          
          // Decode base64 to Uint8Array
          const compressedData = Buffer.from(compressed, 'base64')
          
          // Start decompression
          const writePromise = writer.write(compressedData).then(() => writer.close())
          const chunks: Uint8Array[] = []
          
          // Read decompressed chunks
          const readDecompressed = async (): Promise<void> => {
            const { done, value } = await reader.read()
            if (!done && value) {
              chunks.push(value)
              await readDecompressed()
            }
          }
          
          await Promise.all([writePromise, readDecompressed()])
          
          // Combine chunks and decode to string
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
          const decompressedData = new Uint8Array(totalLength)
          let offset = 0
          
          for (const chunk of chunks) {
            decompressedData.set(chunk, offset)
            offset += chunk.length
          }
          
          // Convert to string
          const decoder = new TextDecoder()
          return decoder.decode(decompressedData)
          
        } else {
          console.warn('Decompression not available in this environment, returning compressed data')
          return compressed
        }
      } else {
        console.warn(`Unknown compression algorithm: ${algorithm}`)
        return compressed
      }
    } catch (error) {
      console.error('Decompression failed, returning compressed data:', error)
      return compressed
    }
  }

  /**
   * Get client stats
   */
  getStats(): {
    cacheStats: { size: number; keys: string[] }
    config: IPFSConfig
  } {
    return {
      cacheStats: this.client.getCacheStats(),
      config: DEFAULT_IPFS_CONFIG
    }
  }

  /**
   * Clear client cache
   */
  clearCache(): void {
    this.client.clearCache()
  }
}

/**
 * Create an IPFS utility instance with configuration
 */
export function createIPFSUtils(config?: Partial<IPFSConfig>): IPFSUtils {
  const finalConfig: IPFSConfig = {
    ...DEFAULT_IPFS_CONFIG,
    ...config,
    provider: {
      ...DEFAULT_IPFS_CONFIG.provider,
      ...config?.provider
    }
  }
  
  return new IPFSUtils(finalConfig)
}

/**
 * Helper function to determine optimal storage method
 */
export function determineStorageMethod(
  content: string,
  options?: {
    sizeThreshold?: number
    forceIPFS?: boolean
    forceInline?: boolean
  }
): 'inline' | 'ipfs' {
  if (options?.forceInline) return 'inline'
  if (options?.forceIPFS) return 'ipfs'
  
  const size = new TextEncoder().encode(content).length
  const threshold = options?.sizeThreshold ?? DEFAULT_IPFS_CONFIG.sizeThreshold ?? 800
  
  return size > threshold ? 'ipfs' : 'inline'
}

/**
 * Create metadata URI with automatic storage decision
 */
export async function createMetadataUri(
  metadata: Record<string, unknown>,
  ipfsUtils?: IPFSUtils,
  options?: {
    type?: IPFSContentMetadata['type']
    filename?: string
    forceIPFS?: boolean
  }
): Promise<string> {
  const metadataJson = JSON.stringify(metadata)
  const storageMethod = determineStorageMethod(metadataJson, { 
    forceIPFS: options?.forceIPFS 
  })
  
  if (storageMethod === 'inline' || !ipfsUtils) {
    // Store as data URI
    const encoded = Buffer.from(metadataJson).toString('base64')
    return `data:application/json;base64,${encoded}`
  } else {
    // Store on IPFS
    const result = await ipfsUtils.client.storeContent(
      metadataJson, 
      options?.type ?? 'custom',
      {
        filename: options?.filename,
        contentType: 'application/json'
      }
    )
    return result.uri
  }
}