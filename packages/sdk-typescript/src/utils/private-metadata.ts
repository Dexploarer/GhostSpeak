/**
 * Private Metadata Storage
 * 
 * Handles off-chain storage of encrypted data with on-chain references.
 * Supports IPFS and other storage backends for private data while
 * maintaining on-chain integrity verification.
 */

import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils'
import type { Address } from '@solana/kit'

import {
  ClientEncryptionService,
  type EncryptedData,
  type PrivateMetadata
} from './client-encryption.js'

import { getFeatureFlags } from './feature-flags.js'

// =====================================================
// TYPES
// =====================================================

export interface StorageProvider {
  store(data: Uint8Array): Promise<string>
  retrieve(hash: string): Promise<Uint8Array>
  delete(hash: string): Promise<boolean>
}

export interface StoredPrivateData {
  /** On-chain reference hash */
  onChainHash: Uint8Array
  
  /** Storage provider identifier */
  storageProvider: 'ipfs' | 'arweave' | 'custom'
  
  /** Storage location (IPFS hash, Arweave ID, etc) */
  storageLocation: string
  
  /** Encryption metadata */
  encryptionMetadata: {
    version: number
    publicKey: Uint8Array
    timestamp: number
  }
  
  /** Size of stored data */
  size: number
  
  /** Content type hint */
  contentType?: string
}

export interface PrivateDataReference {
  /** Account storing the reference */
  account: Address
  
  /** Storage details */
  storage: StoredPrivateData
  
  /** Access control */
  accessControl: {
    owner: Address
    allowedReaders: Address[]
    expiresAt?: number
  }
}

// =====================================================
// STORAGE PROVIDERS
// =====================================================

/**
 * Real IPFS storage provider using kubo-rpc-client (2025)
 * Connects to actual IPFS nodes for production use
 * 
 * SECURITY NOTICE (Kluster MCP): 
 * - All data stored is encrypted client-side before IPFS upload
 * - Use private IPFS networks for sensitive production data
 * - Implement proper key management and rotation policies
 * - Monitor for unauthorized access patterns
 */
export class IPFSProvider implements StorageProvider {
  private client: any
  private readonly isPrivateNetwork: boolean
  
  constructor(options?: { 
    ipfsNodeUrl?: string; 
    headers?: Record<string, string>;
    usePrivateNetwork?: boolean;
  }) {
    // Dynamic import to avoid bundling issues
    const createClient = require('kubo-rpc-client').create
    
    // Add null checks and validation for IPFS client options
    const ipfsNodeUrl = options?.ipfsNodeUrl || 'http://localhost:5001'
    const headers = options?.headers || {}
    this.isPrivateNetwork = options?.usePrivateNetwork || false
    
    // Validate IPFS node URL format
    try {
      new URL(ipfsNodeUrl)
    } catch (error) {
      throw new Error(`Invalid IPFS node URL provided: ${ipfsNodeUrl}`)
    }
    
    // Security validation for production use
    if (!this.isPrivateNetwork && ipfsNodeUrl.includes('localhost')) {
      console.warn('SECURITY WARNING: Using localhost IPFS node in production. Consider using a private IPFS network.')
    }
    
    // Validate headers object
    if (typeof headers !== 'object' || headers === null) {
      throw new Error('Headers must be a valid object')
    }
    
    this.client = createClient({
      url: ipfsNodeUrl,
      headers
    })
    
    if (!this.client) {
      throw new Error('Failed to create IPFS client - kubo-rpc-client returned null')
    }
  }
  
  async store(data: Uint8Array): Promise<string> {
    try {
      // Security check: Validate data size to prevent abuse
      if (data.length > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Data size exceeds maximum allowed limit (10MB)')
      }
      
      // Security check: Ensure data appears encrypted (basic validation)
      if (!this.isPrivateNetwork && this.isDataUnencrypted(data)) {
        console.warn('SECURITY WARNING: Data appears to be unencrypted. Ensure client-side encryption is applied.')
      }
      
      const result = await this.client.add(data, {
        pin: true, // Pin to ensure persistence
        cidVersion: 1 // Use CIDv1 for better compatibility
      })
      return result.cid.toString()
    } catch (error) {
      throw new Error(`Failed to store data to IPFS: ${error.message}`)
    }
  }
  
  /**
   * Basic heuristic to detect potentially unencrypted data
   * This is not foolproof but can catch obvious cases
   */
  private isDataUnencrypted(data: Uint8Array): boolean {
    // Check for common unencrypted patterns
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 100))
    const commonPatterns = ['{', '<', 'BEGIN', 'name', 'address', 'email', 'password']
    return commonPatterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()))
  }
  
  async retrieve(hash: string): Promise<Uint8Array> {
    try {
      const chunks: Uint8Array[] = []
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk)
      }
      
      // Concatenate all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      
      return result
    } catch (error) {
      throw new Error(`Failed to retrieve data from IPFS: ${error.message}`)
    }
  }
  
  async delete(hash: string): Promise<boolean> {
    try {
      await this.client.pin.rm(hash)
      return true
    } catch (error) {
      // Pin removal might fail if not pinned - this is a non-critical error
      // Log as warning but don't throw since the data might not have been pinned
      console.warn(`IPFS unpin warning for ${hash}: ${error.message}`)
      return false // Return false to indicate pin removal didn't happen, but don't fail
    }
  }
}

/**
 * Local storage provider (for development)
 */
export class LocalStorageProvider implements StorageProvider {
  private prefix = 'ghostspeak_private_'
  
  async store(data: Uint8Array): Promise<string> {
    const hash = bytesToHex(sha256(data))
    globalThis.localStorage.setItem(this.prefix + hash, bytesToHex(data))
    return hash
  }
  
  async retrieve(hash: string): Promise<Uint8Array> {
    const hex = globalThis.localStorage.getItem(this.prefix + hash)
    if (hex) {
      return hexToBytes(hex)
    }
    throw new Error(`Data not found: ${hash}`)
  }
  
  async delete(hash: string): Promise<boolean> {
    globalThis.localStorage.removeItem(this.prefix + hash)
    return true
  }
}

// =====================================================
// PRIVATE METADATA STORAGE SERVICE
// =====================================================

export class PrivateMetadataStorage {
  private encryptionService: ClientEncryptionService
  private storageProvider: StorageProvider
  private featureFlags = getFeatureFlags()
  
  constructor(
    storageProvider?: StorageProvider,
    encryptionService?: ClientEncryptionService
  ) {
    this.storageProvider = storageProvider ?? new IPFSProvider()
    this.encryptionService = encryptionService ?? new ClientEncryptionService()
  }
  
  /**
   * Store private data off-chain with on-chain reference
   */
  async storePrivateData(
    data: Record<string, unknown>,
    publicMetadata: Record<string, unknown>,
    recipientPubkey: Uint8Array
  ): Promise<StoredPrivateData> {
    // Check if IPFS storage is enabled
    if (!this.featureFlags.isEnabled('ENABLE_IPFS_STORAGE')) {
      throw new Error('IPFS storage is not enabled')
    }
    
    // Create private metadata
    const privateMetadata = await this.encryptionService.createPrivateMetadata(
      data,
      publicMetadata,
      recipientPubkey
    )
    
    // Serialize for storage
    const serialized = this.serializePrivateMetadata(privateMetadata)
    
    // Store in IPFS (or other provider)
    const storageLocation = await this.storageProvider.store(serialized)
    
    // Create on-chain reference
    const onChainHash = this.createOnChainHash(privateMetadata, storageLocation)
    
    return {
      onChainHash,
      storageProvider: 'ipfs',
      storageLocation,
      encryptionMetadata: {
        version: privateMetadata.encrypted.version,
        publicKey: privateMetadata.encrypted.publicKey,
        timestamp: privateMetadata.encrypted.timestamp
      },
      size: serialized.length,
      contentType: 'application/json'
    }
  }
  
  /**
   * Retrieve private data from off-chain storage
   */
  async retrievePrivateData(
    reference: StoredPrivateData,
    secretKey: Uint8Array
  ): Promise<{
    privateData: Record<string, unknown>
    publicData: Record<string, unknown>
  }> {
    // Retrieve from storage
    const serialized = await this.storageProvider.retrieve(reference.storageLocation)
    
    // Verify integrity
    const expectedHash = this.createOnChainHash(
      this.deserializePrivateMetadata(serialized),
      reference.storageLocation
    )
    
    if (bytesToHex(expectedHash) !== bytesToHex(reference.onChainHash)) {
      throw new Error('Data integrity check failed')
    }
    
    // Deserialize
    const metadata = this.deserializePrivateMetadata(serialized)
    
    // Decrypt private data
    const decryptedBytes = await this.decryptPrivateData(
      metadata.encrypted,
      secretKey
    )
    
    const privateData = JSON.parse(new TextDecoder().decode(decryptedBytes)) as Record<string, unknown>
    
    return {
      privateData,
      publicData: metadata.public
    }
  }
  
  /**
   * Create a verifiable link between on-chain and off-chain data
   */
  createVerifiableLink(
    onChainData: Record<string, unknown>,
    offChainReference: StoredPrivateData
  ): Uint8Array {
    const combined = {
      onChain: onChainData,
      offChain: {
        hash: bytesToHex(offChainReference.onChainHash),
        location: offChainReference.storageLocation,
        provider: offChainReference.storageProvider
      },
      timestamp: Date.now()
    }
    
    return sha256(new TextEncoder().encode(JSON.stringify(combined)))
  }
  
  /**
   * Batch store multiple private data items
   */
  async batchStore(
    items: {
      data: Record<string, unknown>
      publicMetadata: Record<string, unknown>
      recipientPubkey: Uint8Array
    }[]
  ): Promise<StoredPrivateData[]> {
    const results: StoredPrivateData[] = []
    
    for (const item of items) {
      const stored = await this.storePrivateData(
        item.data,
        item.publicMetadata,
        item.recipientPubkey
      )
      results.push(stored)
    }
    
    return results
  }
  
  // =====================================================
  // PRIVATE METHODS
  // =====================================================
  
  private serializePrivateMetadata(metadata: PrivateMetadata): Uint8Array {
    const json = JSON.stringify({
      encrypted: {
        ciphertext: {
          commitment: bytesToHex(metadata.encrypted.ciphertext.commitment.commitment),
          handle: bytesToHex(metadata.encrypted.ciphertext.handle.handle)
        },
        publicKey: bytesToHex(metadata.encrypted.publicKey),
        commitment: bytesToHex(metadata.encrypted.commitment),
        timestamp: metadata.encrypted.timestamp,
        version: metadata.encrypted.version
      },
      public: metadata.public,
      storageHash: bytesToHex(metadata.storageHash),
      ipfsHash: metadata.ipfsHash
    })
    
    return new TextEncoder().encode(json)
  }
  
  private deserializePrivateMetadata(data: Uint8Array): PrivateMetadata {
    const json = JSON.parse(new TextDecoder().decode(data)) as {
      encrypted: {
        ciphertext: {
          commitment: string
          handle: string
        }
        publicKey: string
        commitment: string
        timestamp: number
        version: number
      }
      public: Record<string, unknown>
      storageHash: string
      ipfsHash?: string
    }
    
    return {
      encrypted: {
        ciphertext: {
          commitment: {
            commitment: hexToBytes(json.encrypted.ciphertext.commitment)
          },
          handle: {
            handle: hexToBytes(json.encrypted.ciphertext.handle)
          }
        },
        publicKey: hexToBytes(json.encrypted.publicKey),
        commitment: hexToBytes(json.encrypted.commitment),
        timestamp: json.encrypted.timestamp,
        version: json.encrypted.version
      },
      public: json.public,
      storageHash: hexToBytes(json.storageHash),
      ipfsHash: json.ipfsHash
    }
  }
  
  private createOnChainHash(
    metadata: PrivateMetadata,
    storageLocation: string
  ): Uint8Array {
    const data = {
      storageHash: bytesToHex(metadata.storageHash),
      storageLocation,
      commitment: bytesToHex(metadata.encrypted.commitment),
      timestamp: metadata.encrypted.timestamp
    }
    
    return sha256(new TextEncoder().encode(JSON.stringify(data)))
  }
  
  private async decryptPrivateData(
    _encrypted: EncryptedData,
    _secretKey: Uint8Array
  ): Promise<Uint8Array> {
    // For now, return mock decrypted data
    // In production, this would use proper decryption
    return new TextEncoder().encode('{"decrypted": "data"}')
  }
}

// =====================================================
// PRIVACY-PRESERVING QUERIES
// =====================================================

/**
 * Query builder for private data
 */
export class PrivateDataQuery {
  private conditions: {
    field: string
    operator: 'eq' | 'gt' | 'lt' | 'contains'
    value: unknown
    encrypted: boolean
  }[] = []
  
  where(field: string, operator: 'eq' | 'gt' | 'lt' | 'contains', value: unknown): this {
    this.conditions.push({ field, operator, value, encrypted: false })
    return this
  }
  
  whereEncrypted(field: string, commitment: Uint8Array): this {
    this.conditions.push({
      field,
      operator: 'eq',
      value: commitment,
      encrypted: true
    })
    return this
  }
  
  /**
   * Execute query against encrypted data
   * Note: This is limited compared to on-chain queries
   */
  async execute(
    storage: PrivateMetadataStorage,
    references: StoredPrivateData[]
  ): Promise<StoredPrivateData[]> {
    // For encrypted fields, we can only match by commitment
    // This is a privacy-preserving but limited query capability
    const results: StoredPrivateData[] = []
    
    for (const ref of references) {
      let matches = true
      
      for (const condition of this.conditions) {
        if (condition.encrypted) {
          // Can only check commitments for encrypted data
          // Real implementation would be more sophisticated
          if (condition.field === 'commitment') {
            const match = bytesToHex(ref.onChainHash) === bytesToHex(condition.value as Uint8Array)
            if (!match) {
              matches = false
              break
            }
          }
        }
      }
      
      if (matches) {
        results.push(ref)
      }
    }
    
    return results
  }
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Calculate storage cost estimate
 */
export function estimateStorageCost(
  dataSize: number,
  provider: 'ipfs' | 'arweave'
): {
  cost: bigint
  currency: string
} {
  // Mock cost calculation
  // In production, this would query actual storage costs
  if (provider === 'ipfs') {
    return {
      cost: BigInt(Number(dataSize) * 1), // 1 lamport per byte
      currency: 'lamports'
    }
  } else {
    return {
      cost: BigInt(Number(dataSize) * 10), // 10 lamports per byte
      currency: 'lamports'
    }
  }
}

/**
 * Create a privacy manifest for transparency
 */
export interface PrivacyManifest {
  dataTypes: string[]
  encryptionMethod: 'elgamal' | 'aes256'
  storageLocation: 'ipfs' | 'arweave' | 'on-chain'
  retentionPeriod?: number
  accessControl: 'owner-only' | 'public-read' | 'permissioned'
}

export function createPrivacyManifest(
  dataTypes: string[],
  options: Partial<PrivacyManifest> = {}
): PrivacyManifest {
  return {
    dataTypes,
    encryptionMethod: options.encryptionMethod ?? 'elgamal',
    storageLocation: options.storageLocation ?? 'ipfs',
    retentionPeriod: options.retentionPeriod,
    accessControl: options.accessControl ?? 'owner-only'
  }
}