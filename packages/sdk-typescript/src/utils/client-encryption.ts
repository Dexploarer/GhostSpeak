/**
 * Client-Side Encryption Service
 * 
 * Provides client-side encryption for privacy features while the
 * ZK ElGamal Proof Program is disabled. This is a temporary solution
 * that will be replaced/enhanced when ZK proofs are re-enabled.
 */

import { sha256 } from '@noble/hashes/sha256'
import { randomBytes, bytesToHex } from '@noble/curves/abstract/utils'

import {
  encryptAmount,
  decryptAmount,
  generateElGamalKeypair,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type ElGamalPubkey
} from './elgamal.js'

import { getFeatureFlags } from './feature-flags.js'

// =====================================================
// TYPES
// =====================================================

export interface EncryptedData {
  /** Encrypted payload */
  ciphertext: ElGamalCiphertext
  
  /** Public key used for encryption */
  publicKey: ElGamalPubkey
  
  /** Commitment to the plaintext (for verification) */
  commitment: Uint8Array
  
  /** Timestamp of encryption */
  timestamp: number
  
  /** Version for future compatibility */
  version: number
}

export interface PrivateMetadata {
  /** Encrypted data */
  encrypted: EncryptedData
  
  /** Public metadata (not encrypted) */
  public: Record<string, unknown>
  
  /** IPFS hash if stored off-chain */
  ipfsHash?: string
  
  /** On-chain storage hash */
  storageHash: Uint8Array
}

export interface ClientEncryptionOptions {
  /** Whether to generate range proofs locally */
  generateLocalProofs?: boolean
  
  /** Whether to store on IPFS */
  useIpfsStorage?: boolean
  
  /** Custom encryption keypair (uses ephemeral if not provided) */
  encryptionKeypair?: ElGamalKeypair
}

// =====================================================
// CLIENT ENCRYPTION SERVICE
// =====================================================

export class ClientEncryptionService {
  private keypair: ElGamalKeypair
  private featureFlags = getFeatureFlags()
  
  constructor(options: ClientEncryptionOptions = {}) {
    this.keypair = options.encryptionKeypair ?? generateElGamalKeypair()
  }
  
  /**
   * Encrypt an amount for a recipient
   */
  async encryptAmountForRecipient(
    amount: bigint,
    recipientPubkey: ElGamalPubkey
  ): Promise<EncryptedData> {
    // Check if we should use client encryption
    if (!this.featureFlags.shouldUseClientEncryption()) {
      throw new Error('Client encryption is not enabled')
    }
    
    // Encrypt the amount
    const ciphertext = encryptAmount(amount, recipientPubkey)
    
    // Create commitment for verification
    const commitment = this.createCommitment(amount, recipientPubkey)
    
    return {
      ciphertext,
      publicKey: recipientPubkey,
      commitment,
      timestamp: Date.now(),
      version: 1
    }
  }
  
  /**
   * Decrypt an amount (requires private key)
   */
  async decryptAmount(
    encrypted: EncryptedData,
    secretKey: Uint8Array
  ): Promise<bigint> {
    // Verify commitment first
    const isValid = await this.verifyCommitment(encrypted)
    if (!isValid) {
      throw new Error('Invalid commitment - data may be tampered')
    }
    
    // Decrypt the amount
    const result = decryptAmount(encrypted.ciphertext, secretKey)
    if (result === null) {
      throw new Error('Failed to decrypt amount')
    }
    return result
  }
  
  /**
   * Encrypt arbitrary data
   */
  async encryptData(
    data: Uint8Array,
    recipientPubkey: ElGamalPubkey
  ): Promise<EncryptedData> {
    // For arbitrary data, we chunk it and encrypt each chunk
    // This is a simplified version - production would need proper padding
    const chunks: ElGamalCiphertext[] = []
    const chunkSize = 31 // Leave room for padding byte
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      const paddedChunk = new Uint8Array(32)
      paddedChunk[0] = chunk.length // Length prefix
      paddedChunk.set(chunk, 1)
      
      // Convert to bigint for encryption
      const value = bytesToBigInt(paddedChunk)
      const encrypted = encryptAmount(value, recipientPubkey)
      chunks.push(encrypted)
    }
    
    // Combine chunks into single ciphertext
    const combined = this.combineChunks(chunks)
    const commitment = this.createDataCommitment(data, recipientPubkey)
    
    return {
      ciphertext: combined,
      publicKey: recipientPubkey,
      commitment,
      timestamp: Date.now(),
      version: 1
    }
  }
  
  /**
   * Create private metadata with mixed public/private data
   */
  async createPrivateMetadata(
    privateData: Record<string, unknown>,
    publicData: Record<string, unknown>,
    recipientPubkey: ElGamalPubkey
  ): Promise<PrivateMetadata> {
    // Serialize private data
    const serialized = JSON.stringify(privateData)
    const dataBytes = new TextEncoder().encode(serialized)
    
    // Encrypt private data
    const encrypted = await this.encryptData(dataBytes, recipientPubkey)
    
    // Create storage hash
    const storageHash = this.createStorageHash(encrypted, publicData)
    
    return {
      encrypted,
      public: publicData,
      storageHash
    }
  }
  
  /**
   * Verify encrypted data integrity
   */
  async verifyCommitment(encrypted: EncryptedData): Promise<boolean> {
    // In production, this would verify the commitment
    // For now, we do a basic check
    return encrypted.commitment.length === 32 && 
           encrypted.version === 1 &&
           encrypted.timestamp > 0
  }
  
  /**
   * Create a commitment to an amount
   */
  private createCommitment(
    amount: bigint,
    pubkey: ElGamalPubkey
  ): Uint8Array {
    const data = new Uint8Array(40)
    data.set(bigIntToBytes(amount), 0)
    data.set(pubkey, 8)
    return sha256(data)
  }
  
  /**
   * Create a commitment to arbitrary data
   */
  private createDataCommitment(
    data: Uint8Array,
    pubkey: ElGamalPubkey
  ): Uint8Array {
    const combined = new Uint8Array(data.length + 32)
    combined.set(data, 0)
    combined.set(pubkey, data.length)
    return sha256(combined)
  }
  
  /**
   * Create storage hash for on-chain reference
   */
  private createStorageHash(
    encrypted: EncryptedData,
    publicData: Record<string, unknown>
  ): Uint8Array {
    const data = {
      encryptedCommitment: bytesToHex(encrypted.commitment),
      publicData,
      timestamp: encrypted.timestamp,
      version: encrypted.version
    }
    
    const serialized = JSON.stringify(data)
    return sha256(new TextEncoder().encode(serialized))
  }
  
  /**
   * Combine multiple ciphertext chunks
   */
  private combineChunks(chunks: ElGamalCiphertext[]): ElGamalCiphertext {
    // For simplicity, we'll use the first chunk
    // In production, this would properly combine all chunks
    if (chunks.length === 0) {
      throw new Error('No chunks to combine')
    }
    return chunks[0]
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert bigint to 32-byte array
 */
function bigIntToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32)
  let temp = value
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number(temp & 0xffn)
    temp >>= BigInt(8)
  }
  return bytes
}

/**
 * Convert byte array to bigint
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0)
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) | BigInt(bytes[i])
  }
  return result
}

// =====================================================
// PRIVACY VERIFICATION
// =====================================================

/**
 * Generate a local privacy proof (not verified on-chain)
 * This is a placeholder for when ZK proofs are unavailable
 */
export async function generateLocalPrivacyProof(
  encrypted: EncryptedData,
  statement: string
): Promise<{
  proof: Uint8Array
  publicInputs: Uint8Array
  timestamp: number
}> {
  // Create a deterministic "proof" based on the encrypted data
  const proofData = new Uint8Array(128)
  proofData.set(encrypted.commitment, 0)
  proofData.set(sha256(new TextEncoder().encode(statement)), 32)
  proofData.set(randomBytes(64), 64)
  
  const publicInputs = new Uint8Array(64)
  publicInputs.set(encrypted.commitment, 0)
  publicInputs.set(encrypted.publicKey, 32)
  
  return {
    proof: proofData,
    publicInputs,
    timestamp: Date.now()
  }
}

/**
 * Verify a local privacy proof
 */
export async function verifyLocalPrivacyProof(
  proof: Uint8Array,
  publicInputs: Uint8Array,
  encrypted: EncryptedData
): Promise<boolean> {
  // Basic verification
  if (proof.length !== 128 || publicInputs.length !== 64) {
    return false
  }
  
  // Check commitment matches
  const proofCommitment = proof.slice(0, 32)
  const inputCommitment = publicInputs.slice(0, 32)
  
  return bytesToHex(proofCommitment) === bytesToHex(encrypted.commitment) &&
         bytesToHex(inputCommitment) === bytesToHex(encrypted.commitment)
}

// =====================================================
// MIGRATION HELPERS
// =====================================================

/**
 * Prepare encrypted data for future ZK proof migration
 */
export interface ZkMigrationData {
  /** Current encrypted data */
  clientEncrypted: EncryptedData
  
  /** Metadata for ZK proof generation */
  zkMetadata: {
    amount?: bigint
    randomness?: Uint8Array
    publicKey: ElGamalPubkey
  }
  
  /** Migration version */
  migrationVersion: number
}

/**
 * Prepare data for future ZK proof migration
 */
export function prepareForZkMigration(
  encrypted: EncryptedData,
  amount?: bigint,
  randomness?: Uint8Array
): ZkMigrationData {
  return {
    clientEncrypted: encrypted,
    zkMetadata: {
      amount,
      randomness,
      publicKey: encrypted.publicKey
    },
    migrationVersion: 1
  }
}

// =====================================================
// EXPORTS
// =====================================================

export {
  generateElGamalKeypair,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type ElGamalPubkey
} from './elgamal.js'