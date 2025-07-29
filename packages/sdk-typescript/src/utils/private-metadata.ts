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
 * Mock IPFS storage provider (for testing)
 * In production, this would use actual IPFS
 */
export class MockIPFSProvider implements StorageProvider {
  private storage = new Map<string, Uint8Array>()
  
  async store(data: Uint8Array): Promise<string> {
    const hash = 'Qm' + bytesToHex(sha256(data)).substring(0, 44)
    this.storage.set(hash, data)
    return hash
  }
  
  async retrieve(hash: string): Promise<Uint8Array> {
    const data = this.storage.get(hash)
    if (!data) {
      throw new Error(`Data not found: ${hash}`)
    }
    return data
  }
  
  async delete(hash: string): Promise<boolean> {
    return this.storage.delete(hash)
  }
}

/**
 * Local storage provider (for development)
 */
export class LocalStorageProvider implements StorageProvider {
  private prefix = 'ghostspeak_private_'
  
  async store(data: Uint8Array): Promise<string> {
    const hash = bytesToHex(sha256(data))
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.setItem(this.prefix + hash, bytesToHex(data))
    }
    return hash
  }
  
  async retrieve(hash: string): Promise<Uint8Array> {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      const hex = globalThis.localStorage.getItem(this.prefix + hash)
      if (hex) {
        return hexToBytes(hex)
      }
    }
    throw new Error(`Data not found: ${hash}`)
  }
  
  async delete(hash: string): Promise<boolean> {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.removeItem(this.prefix + hash)
      return true
    }
    return false
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
    this.storageProvider = storageProvider ?? new MockIPFSProvider()
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
      cost: BigInt(dataSize * 1), // 1 lamport per byte
      currency: 'lamports'
    }
  } else {
    return {
      cost: BigInt(dataSize * 10), // 10 lamports per byte
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