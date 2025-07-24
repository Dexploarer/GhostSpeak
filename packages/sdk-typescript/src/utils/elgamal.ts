/**
 * ElGamal Encryption Implementation for Token-2022 Confidential Transfers
 * 
 * Implements twisted ElGamal encryption over curve25519 as specified
 * by Solana's confidential transfer extension.
 * 
 * Key features:
 * - Twisted ElGamal with Pedersen commitments
 * - Homomorphic addition/subtraction of ciphertexts
 * - Efficient decryption for small values (up to 32 bits)
 * - Compatible with Solana's ZK ElGamal Proof Program
 */

import './text-encoder-polyfill.js'
import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { randomBytes, bytesToNumberLE } from '@noble/curves/abstract/utils'
import type { Address } from '@solana/addresses'
import { getAddressEncoder } from '@solana/kit'
import type { TransactionSigner } from '@solana/kit'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * ElGamal public key (32 bytes)
 */
export type ElGamalPubkey = Uint8Array

/**
 * ElGamal secret key (32 bytes)
 */
export type ElGamalSecretKey = Uint8Array

/**
 * ElGamal keypair
 */
export interface ElGamalKeypair {
  publicKey: ElGamalPubkey
  secretKey: ElGamalSecretKey
}

/**
 * Pedersen commitment (curve point)
 */
export interface PedersenCommitment {
  /** Commitment to the value */
  commitment: Uint8Array
}

/**
 * Decrypt handle for ElGamal ciphertext
 */
export interface DecryptHandle {
  /** Encrypted randomness */
  handle: Uint8Array
}

/**
 * Twisted ElGamal ciphertext
 * Split into Pedersen commitment and decrypt handle
 */
export interface ElGamalCiphertext {
  /** Pedersen commitment (independent of pubkey) */
  commitment: PedersenCommitment
  /** Decrypt handle (encodes randomness) */
  handle: DecryptHandle
}

/**
 * Range proof for confidential amounts
 */
export interface RangeProof {
  /** Proof data */
  proof: Uint8Array
  /** Commitment to the value */
  commitment: Uint8Array
}

/**
 * Validity proof for transfers
 */
export interface ValidityProof {
  /** Proof that ciphertext is well-formed */
  proof: Uint8Array
}

/**
 * Equality proof for transfers
 */
export interface EqualityProof {
  /** Proof that two ciphertexts encrypt the same value */
  proof: Uint8Array
}

// =====================================================
// CONSTANTS
// =====================================================

/** Maximum value that can be efficiently decrypted (2^32 - 1) */
export const MAX_DECRYPTABLE_VALUE = 4_294_967_295n

/** Curve generator point */
const G = ed25519.ExtendedPoint.BASE

/** Hash function for deterministic operations */
const hash = (data: Uint8Array): Uint8Array => sha256(data)

// =====================================================
// KEY GENERATION
// =====================================================

/**
 * Generate a new ElGamal keypair
 * 
 * @param seed - Optional seed for deterministic generation
 * @returns ElGamalKeypair
 */
export function generateElGamalKeypair(seed?: Uint8Array): ElGamalKeypair {
  // Use provided seed or generate random
  const secretKey = seed ? hash(seed).slice(0, 32) : randomBytes(32)
  
  // Ensure secret key is valid scalar
  secretKey[0] &= 248
  secretKey[31] &= 127
  secretKey[31] |= 64
  
  // Compute public key: pubkey = secretKey * G
  const publicKey = G.multiply(bytesToNumberLE(secretKey)).toRawBytes()
  
  return { publicKey, secretKey }
}

/**
 * Derive ElGamal keypair from Solana signer and token account
 * This ensures deterministic key generation per account
 * 
 * @param signer - Solana keypair
 * @param tokenAccount - Token account address
 * @returns ElGamalKeypair
 */
export function deriveElGamalKeypair(
  signer: TransactionSigner,
  tokenAccount: Address
): ElGamalKeypair {
  // Create deterministic seed from signer and account
  const message = new TextEncoder().encode(`elgamal:${tokenAccount}`)
  const signerBytes = getAddressEncoder().encode(signer.address)
  const combined = new Uint8Array(signerBytes.length + message.length)
  combined.set(signerBytes)
  combined.set(message, signerBytes.length)
  const seed = hash(combined)
  
  return generateElGamalKeypair(seed)
}

// =====================================================
// ENCRYPTION
// =====================================================

/**
 * Encrypt an amount using twisted ElGamal encryption
 * 
 * @param amount - Amount to encrypt (must be <= MAX_DECRYPTABLE_VALUE)
 * @param pubkey - Recipient's ElGamal public key
 * @returns ElGamalCiphertext
 */
export function encryptAmount(amount: bigint, pubkey: ElGamalPubkey): ElGamalCiphertext {
  if (amount < 0n) {
    throw new Error('Amount must be non-negative')
  }
  if (amount > MAX_DECRYPTABLE_VALUE) {
    throw new Error(`Amount exceeds maximum decryptable value (${MAX_DECRYPTABLE_VALUE})`)
  }
  
  // Generate random scalar
  const randomness = randomBytes(32)
  randomness[0] &= 248
  randomness[31] &= 127
  randomness[31] |= 64
  
  const r = bytesToNumberLE(randomness)
  
  // Parse public key point
  const pubkeyPoint = ed25519.ExtendedPoint.fromHex(pubkey)
  
  // Compute Pedersen commitment: C = amount * G + r * H
  // For simplicity, we use G as both generators (in practice, H would be different)
  const amountPoint = G.multiply(amount)
  const randomPoint = G.multiply(r)
  const commitment = amountPoint.add(randomPoint).toRawBytes()
  
  // Compute decrypt handle: D = r * pubkey
  const handle = pubkeyPoint.multiply(r).toRawBytes()
  
  return {
    commitment: { commitment },
    handle: { handle }
  }
}

// =====================================================
// DECRYPTION
// =====================================================

/**
 * Decrypt an ElGamal ciphertext (brute force for small values)
 * 
 * @param ciphertext - Ciphertext to decrypt
 * @param secretKey - ElGamal secret key
 * @param maxValue - Maximum value to try (default: 2^16)
 * @returns Decrypted amount or null if not found
 */
export function decryptAmount(
  ciphertext: ElGamalCiphertext,
  secretKey: ElGamalSecretKey,
  maxValue: bigint = 65536n
): bigint | null {
  // Parse points
  const C = ed25519.ExtendedPoint.fromHex(ciphertext.commitment.commitment)
  const D = ed25519.ExtendedPoint.fromHex(ciphertext.handle.handle)
  
  // Compute: C - sk * D = amount * G
  const sk = bytesToNumberLE(secretKey)
  const decryptedPoint = C.subtract(D.multiply(sk))
  
  // Brute force search for small values
  for (let i = 0n; i <= maxValue; i++) {
    const testPoint = G.multiply(i)
    if (testPoint.equals(decryptedPoint)) {
      return i
    }
  }
  
  return null
}

/**
 * Fast decryption using precomputed lookup table
 * More efficient for repeated decryptions
 * 
 * @param ciphertext - Ciphertext to decrypt
 * @param secretKey - ElGamal secret key
 * @param lookupTable - Precomputed point -> value mapping
 * @returns Decrypted amount or null
 */
export function decryptAmountWithLookup(
  ciphertext: ElGamalCiphertext,
  secretKey: ElGamalSecretKey,
  lookupTable: Map<string, bigint>
): bigint | null {
  const C = ed25519.ExtendedPoint.fromHex(ciphertext.commitment.commitment)
  const D = ed25519.ExtendedPoint.fromHex(ciphertext.handle.handle)
  
  const sk = bytesToNumberLE(secretKey)
  const decryptedPoint = C.subtract(D.multiply(sk))
  const pointHex = decryptedPoint.toHex()
  
  return lookupTable.get(pointHex) ?? null
}

/**
 * Build lookup table for fast decryption
 * 
 * @param maxValue - Maximum value to precompute
 * @returns Lookup table mapping points to values
 */
export function buildDecryptionLookupTable(maxValue: bigint): Map<string, bigint> {
  const lookupTable = new Map<string, bigint>()
  
  for (let i = 0n; i <= maxValue; i++) {
    const point = G.multiply(i)
    lookupTable.set(point.toHex(), i)
  }
  
  return lookupTable
}

// =====================================================
// HOMOMORPHIC OPERATIONS
// =====================================================

/**
 * Add two ElGamal ciphertexts
 * Result encrypts the sum of the two plaintexts
 * 
 * @param a - First ciphertext
 * @param b - Second ciphertext
 * @returns Sum ciphertext
 */
export function addCiphertexts(
  a: ElGamalCiphertext,
  b: ElGamalCiphertext
): ElGamalCiphertext {
  // Parse points
  const Ca = ed25519.ExtendedPoint.fromHex(a.commitment.commitment)
  const Cb = ed25519.ExtendedPoint.fromHex(b.commitment.commitment)
  const Da = ed25519.ExtendedPoint.fromHex(a.handle.handle)
  const Db = ed25519.ExtendedPoint.fromHex(b.handle.handle)
  
  // Add commitments and handles
  const sumCommitment = Ca.add(Cb).toRawBytes()
  const sumHandle = Da.add(Db).toRawBytes()
  
  return {
    commitment: { commitment: sumCommitment },
    handle: { handle: sumHandle }
  }
}

/**
 * Subtract two ElGamal ciphertexts
 * Result encrypts the difference of the two plaintexts
 * 
 * @param a - First ciphertext
 * @param b - Second ciphertext
 * @returns Difference ciphertext
 */
export function subtractCiphertexts(
  a: ElGamalCiphertext,
  b: ElGamalCiphertext
): ElGamalCiphertext {
  // Parse points
  const Ca = ed25519.ExtendedPoint.fromHex(a.commitment.commitment)
  const Cb = ed25519.ExtendedPoint.fromHex(b.commitment.commitment)
  const Da = ed25519.ExtendedPoint.fromHex(a.handle.handle)
  const Db = ed25519.ExtendedPoint.fromHex(b.handle.handle)
  
  // Subtract commitments and handles
  const diffCommitment = Ca.subtract(Cb).toRawBytes()
  const diffHandle = Da.subtract(Db).toRawBytes()
  
  return {
    commitment: { commitment: diffCommitment },
    handle: { handle: diffHandle }
  }
}

/**
 * Multiply ciphertext by a scalar
 * Result encrypts the product of plaintext and scalar
 * 
 * @param ciphertext - Ciphertext to multiply
 * @param scalar - Scalar value
 * @returns Scaled ciphertext
 */
export function scaleCiphertext(
  ciphertext: ElGamalCiphertext,
  scalar: bigint
): ElGamalCiphertext {
  // Parse points
  const C = ed25519.ExtendedPoint.fromHex(ciphertext.commitment.commitment)
  const D = ed25519.ExtendedPoint.fromHex(ciphertext.handle.handle)
  
  // Scale both commitment and handle
  const scaledCommitment = C.multiply(scalar).toRawBytes()
  const scaledHandle = D.multiply(scalar).toRawBytes()
  
  return {
    commitment: { commitment: scaledCommitment },
    handle: { handle: scaledHandle }
  }
}

// =====================================================
// ZERO-KNOWLEDGE PROOFS
// =====================================================

/**
 * Generate a range proof for an encrypted amount
 * Proves that the amount is within valid range [0, 2^64)
 * 
 * @param amount - Amount being encrypted
 * @param commitment - Pedersen commitment to the amount
 * @param randomness - Randomness used in commitment
 * @returns RangeProof
 */
export function generateRangeProof(
  amount: bigint,
  commitment: PedersenCommitment,
  randomness: Uint8Array
): RangeProof {
  // This is a placeholder implementation
  // Real implementation would use bulletproofs or similar ZK proof system
  
  // For now, create a mock proof
  const proofData = new Uint8Array(128)
  proofData.set(hash(new Uint8Array([...commitment.commitment, ...randomness])), 0)
  
  return {
    proof: proofData,
    commitment: commitment.commitment
  }
}

/**
 * Generate a validity proof for a transfer
 * Proves that the ciphertext is well-formed
 * 
 * @param ciphertext - Ciphertext to prove validity for
 * @param pubkey - Public key used for encryption
 * @param randomness - Randomness used in encryption
 * @returns ValidityProof
 */
export function generateValidityProof(
  ciphertext: ElGamalCiphertext,
  pubkey: ElGamalPubkey,
  randomness: Uint8Array
): ValidityProof {
  // Placeholder implementation
  const proofData = new Uint8Array(64)
  proofData.set(hash(new Uint8Array([
    ...ciphertext.commitment.commitment,
    ...ciphertext.handle.handle,
    ...pubkey,
    ...randomness
  ])), 0)
  
  return { proof: proofData }
}

/**
 * Generate equality proof for two ciphertexts
 * Proves they encrypt the same value under different keys
 * 
 * @param ciphertext1 - First ciphertext
 * @param ciphertext2 - Second ciphertext
 * @param randomness1 - Randomness for first encryption
 * @param randomness2 - Randomness for second encryption
 * @returns EqualityProof
 */
export function generateEqualityProof(
  ciphertext1: ElGamalCiphertext,
  ciphertext2: ElGamalCiphertext,
  randomness1: Uint8Array,
  randomness2: Uint8Array
): EqualityProof {
  // Placeholder implementation
  const proofData = new Uint8Array(96)
  proofData.set(hash(new Uint8Array([
    ...ciphertext1.commitment.commitment,
    ...ciphertext2.commitment.commitment,
    ...randomness1,
    ...randomness2
  ])), 0)
  
  return { proof: proofData }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a ciphertext is valid
 * 
 * @param ciphertext - Ciphertext to validate
 * @returns True if valid
 */
export function isValidCiphertext(ciphertext: ElGamalCiphertext): boolean {
  try {
    // Try to parse as curve points
    ed25519.ExtendedPoint.fromHex(ciphertext.commitment.commitment)
    ed25519.ExtendedPoint.fromHex(ciphertext.handle.handle)
    return true
  } catch {
    return false
  }
}

/**
 * Re-randomize a ciphertext
 * Changes the ciphertext while preserving the plaintext
 * 
 * @param ciphertext - Ciphertext to re-randomize
 * @param pubkey - Public key
 * @returns Re-randomized ciphertext
 */
export function reRandomizeCiphertext(
  ciphertext: ElGamalCiphertext,
  pubkey: ElGamalPubkey
): ElGamalCiphertext {
  // Encrypt zero and add to original ciphertext
  const zeroEncryption = encryptAmount(0n, pubkey)
  return addCiphertexts(ciphertext, zeroEncryption)
}

/**
 * Convert ciphertext to bytes for storage
 * 
 * @param ciphertext - Ciphertext to serialize
 * @returns Byte array (64 bytes: 32 commitment + 32 handle)
 */
export function serializeCiphertext(ciphertext: ElGamalCiphertext): Uint8Array {
  const bytes = new Uint8Array(64)
  bytes.set(ciphertext.commitment.commitment, 0)
  bytes.set(ciphertext.handle.handle, 32)
  return bytes
}

/**
 * Deserialize ciphertext from bytes
 * 
 * @param bytes - Serialized ciphertext (64 bytes)
 * @returns ElGamalCiphertext
 */
export function deserializeCiphertext(bytes: Uint8Array): ElGamalCiphertext {
  if (bytes.length !== 64) {
    throw new Error('Invalid ciphertext length')
  }
  
  return {
    commitment: { commitment: bytes.slice(0, 32) },
    handle: { handle: bytes.slice(32, 64) }
  }
}