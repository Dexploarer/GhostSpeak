/**
 * IPFS client implementation with multiple provider support
 */

import './text-encoder-polyfill.js'

// Use global fetch (available in Node.js 18+ and all modern browsers)
declare const fetch: typeof globalThis.fetch
// Node.js globals for Buffer operations
declare const btoa: (str: string) => string
declare const crypto: typeof globalThis.crypto

import type {
  IPFSConfig,
  IPFSProviderConfig,
  IPFSUploadOptions,
  IPFSUploadResult,
  IPFSRetrievalOptions,
  IPFSRetrievalResult,
  IPFSPinResult,
  IPFSOperationResult,
  ContentStorageResult,
  IPFSContentMetadata
} from '../types/ipfs-types.js'
import { isIPFSUploadResponse } from '../types/index.js'
import { TestIPFSProvider } from './test-ipfs-provider.js'

/**
 * Provider interface for different IPFS services
 */
interface IPFSProvider {
  upload(content: string | Uint8Array, options?: IPFSUploadOptions): Promise<IPFSUploadResult>
  retrieve(hash: string, options?: IPFSRetrievalOptions): Promise<string | Uint8Array>
  pin(hash: string): Promise<IPFSPinResult>
  unpin(hash: string): Promise<IPFSPinResult>
}

/**
 * Pinata IPFS provider implementation
 */
class PinataProvider implements IPFSProvider {
  constructor(private config: IPFSProviderConfig) {}

  async upload(content: string | Uint8Array, options?: IPFSUploadOptions): Promise<IPFSUploadResult> {
    const endpoint = this.config.endpoint ?? 'https://api.pinata.cloud'
    const formData = new FormData()
    
    // Convert content to blob with proper type casting
    const blob = new Blob([content as BlobPart], { 
      type: options?.contentType ?? 'application/octet-stream' 
    })
    formData.append('file', blob, options?.filename ?? 'content')
    
    // Add metadata if provided
    if (options?.metadata) {
      formData.append('pinataMetadata', JSON.stringify({
        name: options.filename ?? 'ghostspeak-content',
        keyvalues: options.metadata
      }))
    }

    const response = await fetch(`${endpoint}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.jwt ?? this.config.apiKey}`,
        ...this.config.headers
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed: ${response.status} ${errorText}`)
    }

    const result: unknown = await response.json()
    const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.length

    if (!isIPFSUploadResponse(result)) {
      throw new Error('Invalid IPFS upload response format')
    }

    return {
      hash: result.IpfsHash,
      uri: `ipfs://${result.IpfsHash}`,
      size,
      timestamp: Date.now(),
      pinned: true, // Pinata automatically pins
      gateways: [
        `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        `https://ipfs.io/ipfs/${result.IpfsHash}`
      ]
    }
  }

  async retrieve(hash: string, options?: IPFSRetrievalOptions): Promise<string | Uint8Array> {
    const gateway = options?.gateway ?? 'https://gateway.pinata.cloud'
    const url = `${gateway}/ipfs/${hash}`
    
    const response = await fetch(url, {
      signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined
    })

    if (!response.ok) {
      throw new Error(`Failed to retrieve from IPFS: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.startsWith('text/') || contentType?.includes('json')) {
      return response.text()
    } else {
      return new Uint8Array(await response.arrayBuffer())
    }
  }

  async pin(hash: string): Promise<IPFSPinResult> {
    const endpoint = this.config.endpoint ?? 'https://api.pinata.cloud'
    
    const response = await fetch(`${endpoint}/pinning/pinByHash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.jwt ?? this.config.apiKey}`,
        ...this.config.headers
      },
      body: JSON.stringify({ hashToPin: hash })
    })

    const success = response.ok
    return {
      hash,
      success,
      status: success ? 'pinned' : 'failed',
      error: success ? undefined : `Pin failed: ${response.status}`
    }
  }

  async unpin(hash: string): Promise<IPFSPinResult> {
    const endpoint = this.config.endpoint ?? 'https://api.pinata.cloud'
    
    const response = await fetch(`${endpoint}/pinning/unpin/${hash}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.jwt ?? this.config.apiKey}`,
        ...this.config.headers
      }
    })

    const success = response.ok
    return {
      hash,
      success,
      status: success ? 'pinned' : 'failed', // Status after unpin
      error: success ? undefined : `Unpin failed: ${response.status}`
    }
  }
}

/**
 * HTTP Client provider for generic IPFS nodes
 */
class HttpClientProvider implements IPFSProvider {
  constructor(private config: IPFSProviderConfig) {}

  async upload(content: string | Uint8Array, options?: IPFSUploadOptions): Promise<IPFSUploadResult> {
    const endpoint = this.config.endpoint ?? 'http://localhost:5001'
    const formData = new FormData()
    
    const blob = new Blob([content as BlobPart], { 
      type: options?.contentType ?? 'application/octet-stream' 
    })
    formData.append('file', blob, options?.filename ?? 'content')

    const response = await fetch(`${endpoint}/api/v0/add`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`IPFS HTTP upload failed: ${response.status}`)
    }

    const result: unknown = await response.json()
    const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.length

    // Validate IPFS HTTP API response format
    if (typeof result !== 'object' || result === null) {
      throw new Error('Invalid IPFS HTTP API response')
    }
    
    const ipfsResult = result as Record<string, unknown>
    if (typeof ipfsResult.Hash !== 'string') {
      throw new Error('IPFS HTTP API response missing Hash field')
    }

    const hash = ipfsResult.Hash as string
    return {
      hash,
      uri: `ipfs://${hash}`,
      size,
      timestamp: Date.now(),
      pinned: options?.pin !== false, // Default to pinned
      gateways: [
        `${endpoint}/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`
      ]
    }
  }

  async retrieve(hash: string, options?: IPFSRetrievalOptions): Promise<string | Uint8Array> {
    const gateway = options?.gateway ?? this.config.endpoint?.replace('/api/v0', '') ?? 'https://ipfs.io'
    const url = `${gateway}/ipfs/${hash}`
    
    const response = await fetch(url, {
      signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined
    })

    if (!response.ok) {
      throw new Error(`Failed to retrieve from IPFS: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.startsWith('text/') || contentType?.includes('json')) {
      return response.text()
    } else {
      return new Uint8Array(await response.arrayBuffer())
    }
  }

  async pin(hash: string): Promise<IPFSPinResult> {
    const endpoint = this.config.endpoint ?? 'http://localhost:5001'
    
    const response = await fetch(`${endpoint}/api/v0/pin/add?arg=${hash}`, {
      method: 'POST'
    })

    const success = response.ok
    return {
      hash,
      success,
      status: success ? 'pinned' : 'failed',
      error: success ? undefined : `Pin failed: ${response.status}`
    }
  }

  async unpin(hash: string): Promise<IPFSPinResult> {
    const endpoint = this.config.endpoint ?? 'http://localhost:5001'
    
    const response = await fetch(`${endpoint}/api/v0/pin/rm?arg=${hash}`, {
      method: 'POST'
    })

    const success = response.ok
    return {
      hash,
      success,
      status: success ? 'pinned' : 'failed',
      error: success ? undefined : `Unpin failed: ${response.status}`
    }
  }
}

/**
 * Main IPFS client with multiple provider support and fallback
 */
export class IPFSClient {
  private providers: IPFSProvider[] = []
  private cache = new Map<string, { content: string | Uint8Array; timestamp: number }>()

  constructor(private config: IPFSConfig) {
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Initialize primary provider
    this.providers.push(this.createProvider(this.config.provider))
    
    // Initialize fallback providers
    if (this.config.fallbackProviders) {
      for (const providerConfig of this.config.fallbackProviders) {
        this.providers.push(this.createProvider(providerConfig))
      }
    }
  }

  private createProvider(config: IPFSProviderConfig): IPFSProvider {
    switch (config.name) {
      case 'pinata':
        return new PinataProvider(config)
      case 'ipfs-http-client':
      case 'custom':
        return new HttpClientProvider(config)
      case 'test':
        return new TestIPFSProvider(config)
      default:
        throw new Error(`Unsupported IPFS provider: ${config.name}`)
    }
  }

  /**
   * Upload content to IPFS with automatic fallback
   */
  async upload(content: string | Uint8Array, options?: IPFSUploadOptions): Promise<IPFSOperationResult<IPFSUploadResult>> {
    const startTime = Date.now()
    let lastError: Error | undefined

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i]
      
      try {
        console.log(`📤 Attempting IPFS upload with provider ${i + 1}/${this.providers.length}`)
        const result = await this.withRetry(
          () => provider.upload(content, options),
          this.config.maxRetries ?? 3,
          this.config.retryDelay ?? 1000
        )
        
        console.log(`✅ IPFS upload successful: ${result.hash}`)
        return {
          success: true,
          data: result,
          duration: Date.now() - startTime,
          provider: this.config.provider.name
        }
      } catch (error) {
        console.warn(`❌ Provider ${i + 1} upload failed:`, error instanceof Error ? error.message : String(error))
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    return {
      success: false,
      error: 'UPLOAD_FAILED',
      message: `All providers failed. Last error: ${lastError?.message}`,
      duration: Date.now() - startTime
    }
  }

  /**
   * Retrieve content from IPFS with caching and fallback
   */
  async retrieve(hash: string, options?: IPFSRetrievalOptions): Promise<IPFSOperationResult<IPFSRetrievalResult>> {
    const startTime = Date.now()
    
    // Check cache first
    if (this.config.enableCache && options?.cache !== false) {
      const cached = this.cache.get(hash)
      if (cached && (Date.now() - cached.timestamp) < (this.config.cacheTTL ?? 300000)) {
        return {
          success: true,
          data: {
            content: cached.content,
            size: typeof cached.content === 'string' ? cached.content.length : cached.content.length,
            hash,
            gateway: 'cache',
            fromCache: true
          },
          duration: Date.now() - startTime
        }
      }
    }

    let lastError: Error | undefined
    const gateways = options?.gateway ? [options.gateway] : (this.config.gateways ?? ['https://ipfs.io'])

    for (const gateway of gateways) {
      for (const provider of this.providers) {
        try {
          const content = await this.withRetry(
            () => provider.retrieve(hash, { ...options, gateway }),
            this.config.maxRetries ?? 3,
            this.config.retryDelay ?? 1000
          )

          // Cache the result
          if (this.config.enableCache) {
            this.cache.set(hash, { content, timestamp: Date.now() })
          }

          return {
            success: true,
            data: {
              content,
              size: typeof content === 'string' ? content.length : content.length,
              hash,
              gateway,
              fromCache: false
            },
            duration: Date.now() - startTime
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
        }
      }
    }

    return {
      success: false,
      error: 'RETRIEVAL_FAILED',
      message: `Failed to retrieve from all gateways. Last error: ${lastError?.message}`,
      duration: Date.now() - startTime
    }
  }

  /**
   * Pin content on IPFS
   */
  async pin(hash: string): Promise<IPFSOperationResult<IPFSPinResult>> {
    const startTime = Date.now()
    
    for (const provider of this.providers) {
      try {
        const result = await provider.pin(hash)
        return {
          success: result.success,
          data: result,
          duration: Date.now() - startTime
        }
      } catch (error) {
        console.warn('Pin attempt failed:', error)
      }
    }

    return {
      success: false,
      error: 'PIN_FAILED',
      message: 'All pin attempts failed',
      duration: Date.now() - startTime
    }
  }

  /**
   * Store content with automatic IPFS decision based on size
   */
  async storeContent(
    content: string, 
    type: IPFSContentMetadata['type'],
    options?: IPFSUploadOptions & { forceIpfs?: boolean }
  ): Promise<ContentStorageResult> {
    const contentSize = new TextEncoder().encode(content).length
    const sizeThreshold = this.config.sizeThreshold ?? 800 // Default 800 bytes to stay under transaction limits
    
    const shouldUseIpfs = options?.forceIpfs ?? contentSize > sizeThreshold

    if (!shouldUseIpfs) {
      // Store inline as data URI
      const dataUri = `data:application/json;base64,${btoa(content)}`
      return {
        uri: dataUri,
        useIpfs: false,
        size: contentSize
      }
    }

    // Store on IPFS
    const uploadResult = await this.upload(content, options)
    
    if (!uploadResult.success || !uploadResult.data) {
      throw new Error(`IPFS upload failed: ${uploadResult.message}`)
    }

    const ipfsMetadata: IPFSContentMetadata = {
      type,
      originalSize: contentSize,
      ipfsHash: uploadResult.data.hash,
      encoding: 'utf8',
      compression: 'none',
      mimeType: 'application/json',
      uploadedAt: uploadResult.data.timestamp,
      pinned: uploadResult.data.pinned,
      checksum: await this.calculateChecksum(content)
    }

    return {
      uri: uploadResult.data.uri,
      useIpfs: true,
      ipfsMetadata,
      size: contentSize
    }
  }

  /**
   * Retrieve content that may be stored inline or on IPFS
   */
  async retrieveContent(uri: string): Promise<string> {
    if (uri.startsWith('data:')) {
      // Inline data URI
      const base64Data = uri.split(',')[1]
      if (!base64Data) {
        throw new Error('Invalid data URI format')
      }
      return atob(base64Data)
    }
    
    if (uri.startsWith('ipfs://')) {
      // IPFS URI
      const hash = uri.replace('ipfs://', '')
      const result = await this.retrieve(hash)
      
      if (!result.success || !result.data) {
        throw new Error(`Failed to retrieve IPFS content: ${result.message}`)
      }
      
      return typeof result.data.content === 'string' 
        ? result.data.content 
        : new TextDecoder().decode(result.data.content)
    }
    
    throw new Error(`Unsupported URI format: ${uri}`)
  }

  /**
   * Retry wrapper for operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }

  /**
   * Calculate checksum for content integrity
   */
  private async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}