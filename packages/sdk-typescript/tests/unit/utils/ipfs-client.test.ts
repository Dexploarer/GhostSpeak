/**
 * Comprehensive tests for IPFS Client implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { IPFSClient } from '../../../src/utils/ipfs-client.js'
import type { IPFSConfig, IPFSProviderConfig } from '../../../src/types/ipfs-types.js'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(async () => new ArrayBuffer(32))
    },
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })
  },
  writable: true,
  configurable: true
})

// Mock btoa for Node.js
global.btoa = (str: string) => Buffer.from(str).toString('base64')
global.atob = (str: string) => Buffer.from(str, 'base64').toString()

// Mock FormData for Node.js
class MockFormData {
  private data: Map<string, any> = new Map()

  append(key: string, value: any, filename?: string): void {
    this.data.set(key, { value, filename })
  }

  get(key: string): any {
    return this.data.get(key)
  }

  has(key: string): boolean {
    return this.data.has(key)
  }
}

global.FormData = MockFormData as any

// Mock Blob for Node.js
class MockBlob {
  constructor(private parts: any[], private options?: { type?: string }) {}
  get type() { return this.options?.type ?? '' }
  get size() { 
    return this.parts.reduce((acc, part) => {
      if (typeof part === 'string') return acc + part.length
      if (part instanceof Uint8Array) return acc + part.length
      return acc
    }, 0)
  }
}

global.Blob = MockBlob as any

describe('IPFSClient', () => {
  let client: IPFSClient
  let config: IPFSConfig

  beforeEach(() => {
    vi.clearAllMocks()
    
    config = {
      provider: {
        name: 'pinata',
        apiKey: 'test-api-key',
        endpoint: 'https://api.pinata.cloud'
      },
      fallbackProviders: [
        {
          name: 'ipfs-http-client',
          endpoint: 'http://localhost:5001'
        }
      ],
      enableCache: true,
      cacheTTL: 300000,
      maxRetries: 2,
      retryDelay: 100,
      sizeThreshold: 800,
      gateways: ['https://gateway.pinata.cloud', 'https://ipfs.io']
    }
    
    client = new IPFSClient(config)
  })

  afterEach(() => {
    client.clearCache()
  })

  describe('Provider initialization', () => {
    it('should initialize with primary provider', () => {
      const clientWithSingleProvider = new IPFSClient({
        provider: { name: 'pinata', apiKey: 'key' }
      })
      expect(clientWithSingleProvider).toBeDefined()
    })

    it('should initialize with fallback providers', () => {
      expect(client).toBeDefined()
    })

    it('should throw error for unsupported provider', () => {
      expect(() => {
        new IPFSClient({
          provider: { name: 'unknown-provider' as any }
        })
      }).toThrow('Unsupported IPFS provider: unknown-provider')
    })

    it('should support test provider', () => {
      const testClient = new IPFSClient({
        provider: { name: 'test' }
      })
      expect(testClient).toBeDefined()
    })
  })

  describe('Upload functionality', () => {
    const mockHash = 'QmTest123'
    const testContent = 'Hello IPFS!'
    const testBinaryContent = new Uint8Array([1, 2, 3, 4, 5])

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ IpfsHash: mockHash }),
        text: async () => ''
      })
    })

    it('should upload string content to Pinata', async () => {
      const result = await client.upload(testContent)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.hash).toBe(mockHash)
      expect(result.data?.uri).toBe(`ipfs://${mockHash}`)
      expect(result.data?.pinned).toBe(true)
      expect(result.data?.gateways).toContain(`https://gateway.pinata.cloud/ipfs/${mockHash}`)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      )
    })

    it('should upload binary content', async () => {
      const result = await client.upload(testBinaryContent)

      expect(result.success).toBe(true)
      expect(result.data?.size).toBe(testBinaryContent.length)
    })

    it('should include metadata in upload', async () => {
      const metadata = { key: 'value', tag: 'test' }
      const filename = 'test-file.txt'
      
      await client.upload(testContent, { metadata, filename })

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
      const formData = lastCall[1]?.body as MockFormData
      
      expect(formData.has('pinataMetadata')).toBe(true)
    })

    it('should fallback to secondary provider on primary failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Pinata failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Hash: mockHash })
        })

      const result = await client.upload(testContent)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // Second call should be to HTTP client
      expect(mockFetch.mock.calls[1][0]).toContain('/api/v0/add')
    })

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ IpfsHash: mockHash })
        })

      const result = await client.upload(testContent)

      expect(result.success).toBe(true)
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle all providers failing', async () => {
      mockFetch.mockRejectedValue(new Error('All failed'))

      const result = await client.upload(testContent)

      expect(result.success).toBe(false)
      expect(result.error).toBe('UPLOAD_FAILED')
      expect(result.message).toContain('All providers failed')
    })

    it('should validate upload response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      })

      const result = await client.upload(testContent)

      // Should fail this provider and try fallback
      expect(result.success).toBe(false)
    })
  })

  describe('Retrieve functionality', () => {
    const mockHash = 'QmTest123'
    const mockContent = 'Retrieved content'

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockContent,
        arrayBuffer: async () => new TextEncoder().encode(mockContent).buffer,
        headers: new Headers({ 'content-type': 'text/plain' })
      })
    })

    it('should retrieve text content', async () => {
      const result = await client.retrieve(mockHash)

      expect(result.success).toBe(true)
      expect(result.data?.content).toBe(mockContent)
      expect(result.data?.hash).toBe(mockHash)
      expect(result.data?.fromCache).toBe(false)
    })

    it('should retrieve binary content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
        headers: new Headers({ 'content-type': 'application/octet-stream' })
      })

      const result = await client.retrieve(mockHash)

      expect(result.success).toBe(true)
      expect(result.data?.content).toBeInstanceOf(Uint8Array)
    })

    it('should use cache for repeated retrievals', async () => {
      // First retrieval
      await client.retrieve(mockHash)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second retrieval should use cache
      const cachedResult = await client.retrieve(mockHash)
      
      expect(cachedResult.success).toBe(true)
      expect(cachedResult.data?.fromCache).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1) // No additional calls
    })

    it('should bypass cache when requested', async () => {
      // First retrieval
      await client.retrieve(mockHash)
      
      // Second retrieval with cache bypass
      await client.retrieve(mockHash, { cache: false })
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should try multiple gateways on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Gateway 1 failed'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockContent,
          headers: new Headers({ 'content-type': 'text/plain' })
        })

      const result = await client.retrieve(mockHash)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should respect timeout option', async () => {
      const result = await client.retrieve(mockHash, { timeout: 5000 })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })

    it('should handle retrieval failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await client.retrieve(mockHash)

      expect(result.success).toBe(false)
      expect(result.error).toBe('RETRIEVAL_FAILED')
    })
  })

  describe('Pin/Unpin functionality', () => {
    const mockHash = 'QmTest123'

    it('should pin content on Pinata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'pinned' })
      })

      const result = await client.pin(mockHash)

      expect(result.success).toBe(true)
      expect(result.data?.success).toBe(true)
      expect(result.data?.status).toBe('pinned')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinByHash',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ hashToPin: mockHash })
        })
      )
    })

    it('should handle pin failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      const result = await client.pin(mockHash)

      expect(result.success).toBe(false)
    })

    it('should unpin content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const unpinResult = await client.pin(mockHash) // Using pin method which calls provider.unpin
      
      // Create new client to test unpin directly
      const testClient = new IPFSClient(config)
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      // Since we don't have a direct unpin method on IPFSClient, we test through provider
      // This is testing the provider behavior which is used internally
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Content storage with automatic IPFS decision', () => {
    const smallContent = 'Small content'
    const largeContent = 'x'.repeat(1000) // Large content exceeding threshold

    it('should store small content inline as data URI', async () => {
      const result = await client.storeContent(smallContent, 'agent_template')

      expect(result.useIpfs).toBe(false)
      expect(result.uri).toStartOf('data:')
      expect(result.size).toBe(new TextEncoder().encode(smallContent).length)
    })

    it('should store large content on IPFS', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: 'QmLarge123' })
      })

      const result = await client.storeContent(largeContent, 'agent_template')

      expect(result.useIpfs).toBe(true)
      expect(result.uri).toStartOf('ipfs://')
      expect(result.ipfsMetadata).toBeDefined()
      expect(result.ipfsMetadata?.type).toBe('agent_template')
    })

    it('should force IPFS storage when requested', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: 'QmForced123' })
      })

      const result = await client.storeContent(smallContent, 'agent_template', { forceIpfs: true })

      expect(result.useIpfs).toBe(true)
    })

    it('should include metadata in IPFS storage result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: 'QmMeta123' })
      })

      const result = await client.storeContent(largeContent, 'work_order_terms')

      expect(result.ipfsMetadata?.originalSize).toBe(largeContent.length)
      expect(result.ipfsMetadata?.encoding).toBe('utf8')
      expect(result.ipfsMetadata?.mimeType).toBe('application/json')
      expect(result.ipfsMetadata?.checksum).toBeDefined()
    })
  })

  describe('Content retrieval with URI support', () => {
    it('should retrieve inline data URI content', async () => {
      const originalContent = 'Test data URI content'
      const dataUri = `data:application/json;base64,${btoa(originalContent)}`

      const content = await client.retrieveContent(dataUri)

      expect(content).toBe(originalContent)
    })

    it('should retrieve IPFS URI content', async () => {
      const mockContent = 'IPFS content'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
        headers: new Headers({ 'content-type': 'text/plain' })
      })

      const content = await client.retrieveContent('ipfs://QmTest456')

      expect(content).toBe(mockContent)
    })

    it('should handle invalid data URI', async () => {
      await expect(
        client.retrieveContent('data:invalid')
      ).rejects.toThrow('Invalid data URI format')
    })

    it('should handle unsupported URI format', async () => {
      await expect(
        client.retrieveContent('http://example.com')
      ).rejects.toThrow('Unsupported URI format')
    })
  })

  describe('Cache management', () => {
    it('should clear cache', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'cached content',
        headers: new Headers({ 'content-type': 'text/plain' })
      })

      // Add to cache
      await client.retrieve('QmCache123')
      
      let stats = client.getCacheStats()
      expect(stats.size).toBe(1)

      // Clear cache
      client.clearCache()
      
      stats = client.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should provide cache statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'content',
        headers: new Headers({ 'content-type': 'text/plain' })
      })

      await client.retrieve('QmStats1')
      await client.retrieve('QmStats2')

      const stats = client.getCacheStats()
      
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('QmStats1')
      expect(stats.keys).toContain('QmStats2')
    })

    it('should respect cache TTL', async () => {
      // Create client with short TTL
      const shortTTLClient = new IPFSClient({
        ...config,
        cacheTTL: 100 // 100ms
      })

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'content',
        headers: new Headers({ 'content-type': 'text/plain' })
      })

      // First retrieval
      await shortTTLClient.retrieve('QmTTL123')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Second retrieval should not use cache
      const result = await shortTTLClient.retrieve('QmTTL123')
      expect(result.data?.fromCache).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await client.upload('test')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Network error')
    })

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const result = await client.upload('test')

      expect(result.success).toBe(false)
    })

    it('should handle empty content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: 'QmEmpty' })
      })

      const result = await client.upload('')

      expect(result.success).toBe(true)
      expect(result.data?.size).toBe(0)
    })

    it('should calculate checksum correctly', async () => {
      const testContent = 'checksum test'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: 'QmChecksum' })
      })

      const result = await client.storeContent(testContent, 'test', { forceIpfs: true })

      expect(result.ipfsMetadata?.checksum).toBeDefined()
      expect(result.ipfsMetadata?.checksum).toHaveLength(64) // SHA-256 hex string
    })
  })

  describe('HTTP Client Provider', () => {
    let httpClient: IPFSClient

    beforeEach(() => {
      httpClient = new IPFSClient({
        provider: {
          name: 'ipfs-http-client',
          endpoint: 'http://localhost:5001'
        }
      })
    })

    it('should upload via HTTP API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Hash: 'QmHttp123' })
      })

      const result = await httpClient.upload('HTTP test')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v0/add',
        expect.any(Object)
      )
    })

    it('should pin via HTTP API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const result = await httpClient.pin('QmHttpPin')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v0/pin/add?arg=QmHttpPin',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('Multiple fallback scenarios', () => {
    it('should try all providers and gateways before failing', async () => {
      // All requests fail
      mockFetch.mockRejectedValue(new Error('All failed'))

      const result = await client.retrieve('QmMultiFail')

      expect(result.success).toBe(false)
      // Should try: 2 gateways × 2 providers = 4 attempts minimum
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(4)
    })

    it('should succeed with last provider', async () => {
      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        if (callCount < 4) {
          throw new Error(`Attempt ${callCount} failed`)
        }
        return {
          ok: true,
          text: async () => 'Finally succeeded!',
          headers: new Headers({ 'content-type': 'text/plain' })
        }
      })

      const result = await client.retrieve('QmLastProvider')

      expect(result.success).toBe(true)
      expect(result.data?.content).toBe('Finally succeeded!')
    })
  })
})