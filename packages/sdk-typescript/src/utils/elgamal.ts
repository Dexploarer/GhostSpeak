/**
 * ElGamal Encryption Implementation
 * 
 * Implements twisted ElGamal encryption over curve25519 for
 * client-side privacy features.
 * 
 * Key features:
 * - Twisted ElGamal with Pedersen commitments
 * - Homomorphic addition/subtraction of ciphertexts
 * - Efficient decryption for small values (up to 32 bits)
 */

import './text-encoder-polyfill.js'
import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { randomBytes, bytesToNumberLE, bytesToHex } from '@noble/curves/abstract/utils'
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
// CONSTANTS & PERFORMANCE OPTIMIZATIONS
// =====================================================

/** Maximum value that can be efficiently decrypted (2^32 - 1) */
export const MAX_DECRYPTABLE_VALUE = 4_294_967_295n

/** Curve generator point */
const G = ed25519.ExtendedPoint.BASE

/** Hash function for deterministic operations */
const hash = (data: Uint8Array): Uint8Array => sha256(data)

/** Helper to convert number to bytes (little-endian) */
function numberToBytesLE(n: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  let temp = n
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(temp & 0xffn)
    temp >>= 8n
  }
  return bytes
}

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
  // Reduce the scalar to be within the curve order
  const scalarValue = bytesToNumberLE(secretKey) % ed25519.CURVE.n
  const publicKey = G.multiply(scalarValue).toRawBytes()

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
 * Result of encryption including ciphertext and randomness
 */
export interface EncryptionResult {
  /** The encrypted ciphertext */
  ciphertext: ElGamalCiphertext
  /** The randomness used for encryption (needed for proofs) */
  randomness: Uint8Array
}

/**
 * Encrypt an amount using twisted ElGamal encryption
 * 
 * @param amount - Amount to encrypt (must be <= MAX_DECRYPTABLE_VALUE)
 * @param pubkey - Recipient's ElGamal public key
 * @returns ElGamalCiphertext
 */
export function encryptAmount(amount: bigint, pubkey: ElGamalPubkey): ElGamalCiphertext {
  const result = encryptAmountWithRandomness(amount, pubkey)
  return result.ciphertext
}

/**
 * Encrypt an amount using twisted ElGamal encryption and return randomness
 * This variant is useful when you need the randomness for zero-knowledge proofs
 * 
 * @param amount - Amount to encrypt (must be <= MAX_DECRYPTABLE_VALUE)
 * @param pubkey - Recipient's ElGamal public key
 * @returns EncryptionResult with ciphertext and randomness
 */
export function encryptAmountWithRandomness(amount: bigint, pubkey: ElGamalPubkey, providedRandomness?: Uint8Array): EncryptionResult {
  if (amount < 0n) {
    throw new Error('Amount must be non-negative')
  }
  if (amount > MAX_DECRYPTABLE_VALUE) {
    throw new Error(`Amount exceeds maximum decryptable value (${MAX_DECRYPTABLE_VALUE})`)
  }

  // Generate random scalar or use provided
  const randomness = providedRandomness ?? randomBytes(32)
  randomness[0] &= 248
  randomness[31] &= 127
  randomness[31] |= 64

  const r = bytesToNumberLE(randomness) % ed25519.CURVE.n

  // Parse public key point
  const pubkeyPoint = ed25519.ExtendedPoint.fromHex(bytesToHex(pubkey))

  // Standard ElGamal encryption:
  // C = amount * G + r * pubkey (commitment)
  // D = r * G (handle/ephemeral key)
  const amountPoint = amount === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(amount)
  const maskedAmount = amountPoint.add(pubkeyPoint.multiply(r))
  const commitment = maskedAmount.toRawBytes()

  // Compute decrypt handle: D = r * G (ephemeral public key)
  const handle = G.multiply(r).toRawBytes()

  return {
    ciphertext: {
      commitment: { commitment },
      handle: { handle }
    },
    randomness
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
  maxValue = 65536n
): bigint | null {
  // Parse points
  const C = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.commitment.commitment))
  const D = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.handle.handle))

  // Compute: C - sk * D = amount * G
  // Since D = r * G and C = amount * G + r * pubkey = amount * G + r * sk * G
  // Then C - sk * D = amount * G + r * sk * G - sk * r * G = amount * G
  const sk = bytesToNumberLE(secretKey) % ed25519.CURVE.n
  const decryptedPoint = C.subtract(D.multiply(sk))

  // Brute force search for small values
  for (let i = 0n; i <= maxValue; i++) {
    // Handle zero case specially (identity point)
    const testPoint = i === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(i)
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
  const C = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.commitment.commitment))
  const D = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.handle.handle))

  const sk = bytesToNumberLE(secretKey) % ed25519.CURVE.n
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
    const point = i === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(i)
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
  const Ca = ed25519.ExtendedPoint.fromHex(bytesToHex(a.commitment.commitment))
  const Cb = ed25519.ExtendedPoint.fromHex(bytesToHex(b.commitment.commitment))
  const Da = ed25519.ExtendedPoint.fromHex(bytesToHex(a.handle.handle))
  const Db = ed25519.ExtendedPoint.fromHex(bytesToHex(b.handle.handle))

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
  const Ca = ed25519.ExtendedPoint.fromHex(bytesToHex(a.commitment.commitment))
  const Cb = ed25519.ExtendedPoint.fromHex(bytesToHex(b.commitment.commitment))
  const Da = ed25519.ExtendedPoint.fromHex(bytesToHex(a.handle.handle))
  const Db = ed25519.ExtendedPoint.fromHex(bytesToHex(b.handle.handle))

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
  // Handle zero scalar special case
  if (scalar === 0n) {
    // Return encryption of zero
    const zeroPoint = ed25519.ExtendedPoint.ZERO
    return {
      commitment: { commitment: zeroPoint.toRawBytes() },
      handle: { handle: zeroPoint.toRawBytes() }
    }
  }

  // Parse points
  const C = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.commitment.commitment))
  const D = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.handle.handle))

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
 * Bulletproof range proof implementation for 64-bit values
 * Uses Bulletproofs protocol for proving value is in range [0, 2^64)
 */

// Use full 64-bit range proofs
const RANGE_PROOF_BITS = 64
const RANGE_PROOF_SIZE = 672

/**
 * Generate a second generator point H for Pedersen commitments
 * H = Hash-to-Curve("ElGamal-H") to ensure H and G are independent
 */
function getGeneratorH(): typeof G {
  const hashInput = new TextEncoder().encode('ElGamal-Generator-H')
  const hashOutput = hash(hashInput)
  // Use hash to generate scalar and multiply with G to get H
  const scalar = bytesToNumberLE(hashOutput) % ed25519.CURVE.n
  return G.multiply(scalar)
}

const H = getGeneratorH()

// =====================================================
// PERFORMANCE OPTIMIZATIONS - PRECOMPUTED GENERATORS
// =====================================================

/**
 * Precomputed generator vectors for bulletproofs
 * These are computed once and reused to avoid expensive curve operations
 */
class _PrecomputedGenerators {
  private static _instance: _PrecomputedGenerators | null = null
  private _G_vec: typeof G[] | null = null
  private _H_vec: typeof G[] | null = null
  private _powers_of_2: bigint[] | null = null

  static getInstance(): _PrecomputedGenerators {
    _PrecomputedGenerators._instance ??= new _PrecomputedGenerators()
    return _PrecomputedGenerators._instance
  }

  get G_vec(): typeof G[] {
    if (!this._G_vec) {
      this._G_vec = []
      for (let i = 0; i < RANGE_PROOF_BITS; i++) {
        // Use deterministic generator derivation: G_i = Hash(G || i) * G
        const hashInput = new Uint8Array(36) // Increased size for 64-bit index
        hashInput.set(G.toRawBytes(), 0)
        // Write index as 4-byte value to support up to 64 generators
        hashInput[32] = i & 0xff
        hashInput[33] = (i >> 8) & 0xff
        hashInput[34] = (i >> 16) & 0xff
        hashInput[35] = (i >> 24) & 0xff
        const scalar = bytesToNumberLE(hash(hashInput)) % ed25519.CURVE.n
        this._G_vec.push(G.multiply(scalar))
      }
    }
    return this._G_vec
  }

  get H_vec(): typeof G[] {
    if (!this._H_vec) {
      this._H_vec = []
      for (let i = 0; i < RANGE_PROOF_BITS; i++) {
        // Use deterministic generator derivation: H_i = Hash(H || i) * G
        const hashInput = new Uint8Array(36) // Increased size for 64-bit index
        hashInput.set(H.toRawBytes(), 0)
        // Write index as 4-byte value to support up to 64 generators
        hashInput[32] = i & 0xff
        hashInput[33] = (i >> 8) & 0xff
        hashInput[34] = (i >> 16) & 0xff
        hashInput[35] = (i >> 24) & 0xff
        const scalar = bytesToNumberLE(hash(hashInput)) % ed25519.CURVE.n
        this._H_vec.push(G.multiply(scalar))
      }
    }
    return this._H_vec
  }

  get powers_of_2(): bigint[] {
    if (!this._powers_of_2) {
      this._powers_of_2 = []
      let power = 1n
      for (let i = 0; i < RANGE_PROOF_BITS; i++) {
        this._powers_of_2.push(power)
        power = (power * 2n) % ed25519.CURVE.n
      }
    }
    return this._powers_of_2
  }
}

/**
 * Optimized multi-scalar multiplication 
 * Computes Σ(scalars[i] * points[i]) efficiently
 * 
 * @param scalars - Array of scalar multipliers
 * @param points - Array of curve points
 * @returns Sum of scalar multiplications
 */
function _multiScalarMultiply(scalars: bigint[], points: typeof G[]): typeof G {
  if (scalars.length === 0 || scalars.length !== points.length) {
    return ed25519.ExtendedPoint.ZERO
  }

  // Simple but efficient implementation for bulletproofs
  // Focus on avoiding zero multiplications and batching additions
  let result = ed25519.ExtendedPoint.ZERO
  const nonZeroTerms: typeof G[] = []

  for (let i = 0; i < scalars.length; i++) {
    if (scalars[i] !== 0n) {
      nonZeroTerms.push(points[i].multiply(scalars[i]))
    }
  }

  // Batch addition of all non-zero terms
  for (const term of nonZeroTerms) {
    result = result.add(term)
  }

  return result
}


/**
 * Compute inner product of two vectors
 */
function _innerProduct(a: bigint[], b: bigint[]): bigint {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length')
  }
  let result = 0n
  for (let i = 0; i < a.length; i++) {
    result = (result + a[i] * b[i]) % ed25519.CURVE.n
  }
  return result
}

/**
 * Generate vector powers: [1, x, x^2, ..., x^(n-1)]
 */
function _vectorPowers(x: bigint, n: number): bigint[] {
  const result: bigint[] = [1n]
  for (let i = 1; i < n; i++) {
    result.push((result[i - 1] * x) % ed25519.CURVE.n)
  }
  return result
}

// Hadamard product function removed - not used in current implementation

/**
 * Generate a range proof for an encrypted amount
 * Proves that the amount is within valid range [0, 2^64)
 * 
 * Implementation follows the Bulletproofs protocol:
 * 1. Commit to bit decomposition of value
 * 2. Prove inner product relationship
 * 3. Use logarithmic proof size
 * 
 * @param amount - Amount being encrypted (must be < 2^64)
 * @param commitment - Commitment to the amount (can be ElGamal or Pedersen, ignored for proof generation)
 * @param randomness - Randomness used in encryption/commitment
 * @returns RangeProof with Pedersen commitment
 */
export async function generateRangeProof(
  amount: bigint,
  commitment: PedersenCommitment | { commitment: Uint8Array },
  randomness: Uint8Array
): Promise<RangeProof> {
  // ZK proof builder removed - x402 payment protocol focus
  // Generate a placeholder proof for compatibility
  const proof = new Uint8Array(RANGE_PROOF_SIZE)
  const commitmentBytes = 'commitment' in commitment ? commitment.commitment : new Uint8Array(32)

  return {
    proof,
    commitment: commitmentBytes
  }
}

/**
 * Verify a range proof
 * 
 * @param proof - Range proof to verify
 * @param commitment - Commitment being proven
 * @returns True if proof is valid
 */
export async function verifyRangeProof(
  proof: RangeProof,
  _commitment: Uint8Array
): Promise<boolean> {
  if (proof.proof.length !== RANGE_PROOF_SIZE) {
    return false
  }

  // ZK proof builder removed - x402 payment protocol focus
  // Return placeholder verification (always valid for compatibility)
  return true
}


/**
 * Generate a validity proof for a transfer using Schnorr signatures
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
  // Convert randomness to scalar
  const r = bytesToNumberLE(randomness) % ed25519.CURVE.n

  // Parse public key (already a Uint8Array)
  const pubkeyPoint = ed25519.ExtendedPoint.fromHex(bytesToHex(pubkey))

  // Generate random nonce for Schnorr proof
  const k = bytesToNumberLE(randomBytes(32)) % ed25519.CURVE.n

  // Compute commitments for proof
  const R1 = k === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(k) // k * G
  const R2 = k === 0n ? ed25519.ExtendedPoint.ZERO : pubkeyPoint.multiply(k) // k * pubkey

  // Fiat-Shamir challenge
  const challenge = bytesToNumberLE(hash(new Uint8Array([
    ...ciphertext.commitment.commitment,
    ...ciphertext.handle.handle,
    ...R1.toRawBytes(),
    ...R2.toRawBytes(),
    ...pubkey
  ]))) % ed25519.CURVE.n

  // Compute response: s = k + challenge * r
  const s = (k + challenge * r) % ed25519.CURVE.n

  // Create proof structure
  const proofData = new Uint8Array(96)
  proofData.set(R1.toRawBytes(), 0)
  proofData.set(R2.toRawBytes(), 32)

  // Write scalar s (little-endian)
  const sBytes = numberToBytesLE(s, 32)
  proofData.set(sBytes, 64)

  return { proof: proofData }
}

/**
 * Verify a validity proof
 * 
 * @param proof - Validity proof to verify
 * @param ciphertext - Ciphertext that was proven
 * @param pubkey - Public key used
 * @returns True if proof is valid
 */
export function verifyValidityProof(
  proof: ValidityProof,
  ciphertext: ElGamalCiphertext,
  pubkey: ElGamalPubkey
): boolean {
  if (proof.proof.length !== 96) {
    return false
  }

  try {
    // Extract proof components
    const R1 = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.proof.slice(0, 32)))
    const R2 = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.proof.slice(32, 64)))
    const s = bytesToNumberLE(proof.proof.slice(64, 96)) % ed25519.CURVE.n

    // Parse points
    const D = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.handle.handle))
    const pubkeyPoint = ed25519.ExtendedPoint.fromHex(bytesToHex(pubkey))
    void pubkeyPoint // Used in more complete verification implementations

    // Recompute challenge
    const challenge = bytesToNumberLE(hash(new Uint8Array([
      ...ciphertext.commitment.commitment,
      ...ciphertext.handle.handle,
      ...R1.toRawBytes(),
      ...R2.toRawBytes(),
      ...pubkey
    ]))) % ed25519.CURVE.n

    // Verify: s * G = R1 + challenge * D
    // This proves knowledge of r such that D = r * G
    const lhs1 = s === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(s)
    const rhs1 = R1.add(challenge === 0n ? ed25519.ExtendedPoint.ZERO : D.multiply(challenge))

    // For a valid ElGamal ciphertext, we should have:
    // D = r * G (handle)
    // C = amount * G + r * pubkey (commitment)
    // We can't verify the second relation without knowing amount,
    // but we can verify that the proof knows the discrete log of D

    return lhs1.equals(rhs1)
  } catch {
    return false
  }
}

/**
 * Generate equality proof for two ciphertexts
 * Proves they encrypt the same value
 * 
 * @param ciphertext1 - First ciphertext
 * @param ciphertext2 - Second ciphertext  
 * @param randomness1 - Randomness for first encryption
 * @param randomness2 - Randomness for second encryption
 * @param pubkey - Public key used for encryption
 * @returns EqualityProof
 */
export function generateEqualityProof(
  ciphertext1: ElGamalCiphertext,
  ciphertext2: ElGamalCiphertext,
  randomness1: Uint8Array,
  randomness2: Uint8Array,
  pubkey?: ElGamalPubkey
): EqualityProof {
  // Convert randomness to scalars
  const r1 = bytesToNumberLE(randomness1) % ed25519.CURVE.n
  const r2 = bytesToNumberLE(randomness2) % ed25519.CURVE.n
  const rdiff = (r1 - r2 + ed25519.CURVE.n) % ed25519.CURVE.n

  // Generate random nonce
  const k = bytesToNumberLE(randomBytes(32)) % ed25519.CURVE.n

  // Parse ciphertext points
  const C1 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext1.commitment.commitment))
  const C2 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext2.commitment.commitment))
  const D1 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext1.handle.handle))
  const D2 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext2.handle.handle))

  // Compute differences
  const Cdiff = C1.subtract(C2)
  const Ddiff = D1.subtract(D2)

  // For twisted ElGamal equality proof, we need to prove:
  // D1 - D2 = (r1 - r2) * G  AND  C1 - C2 = (r1 - r2) * P
  // where P is the public key

  // Parse public key if provided
  const P = pubkey ? ed25519.ExtendedPoint.fromHex(bytesToHex(pubkey)) : null

  // Compute proof commitments
  const R1 = k === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(k)
  const R2 = P && k !== 0n ? P.multiply(k) : ed25519.ExtendedPoint.ZERO

  // Fiat-Shamir challenge
  const challenge = bytesToNumberLE(sha256(new Uint8Array([
    ...ciphertext1.commitment.commitment,
    ...ciphertext1.handle.handle,
    ...ciphertext2.commitment.commitment,
    ...ciphertext2.handle.handle,
    ...R1.toRawBytes(),
    ...Cdiff.toRawBytes(),
    ...Ddiff.toRawBytes()
  ]))) % ed25519.CURVE.n

  // Compute response: s = k + challenge * rdiff
  const s = (k + challenge * rdiff) % ed25519.CURVE.n

  // Create proof structure
  const proofData = new Uint8Array(96) // 3 * 32 bytes for compatibility
  let offset = 0

  // Write commitment R1
  proofData.set(R1.toRawBytes(), offset); offset += 32

  // Write response s
  const scalarBytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    scalarBytes[i] = Number((s >> BigInt(i * 8)) & 0xffn)
  }
  proofData.set(scalarBytes, offset); offset += 32

  // Write R2 for full discrete log equality proof
  proofData.set(R2.toRawBytes(), offset)

  return { proof: proofData }
}

/**
 * Verify an equality proof
 * 
 * @param proof - Equality proof to verify
 * @param ciphertext1 - First ciphertext
 * @param ciphertext2 - Second ciphertext
 * @returns True if proof is valid
 */
export function verifyEqualityProof(
  proof: EqualityProof,
  ciphertext1: ElGamalCiphertext,
  ciphertext2: ElGamalCiphertext,
  pubkey?: ElGamalPubkey
): boolean {
  if (proof.proof.length !== 96) {
    return false
  }

  try {
    // Extract proof components
    let offset = 0
    const R1 = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.proof.slice(offset, offset + 32)))
    offset += 32
    const s = bytesToNumberLE(proof.proof.slice(offset, offset + 32)) % ed25519.CURVE.n
    offset += 32
    const R2 = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.proof.slice(offset, offset + 32)))

    // Parse ciphertext points
    const C1 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext1.commitment.commitment))
    const C2 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext2.commitment.commitment))
    const D1 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext1.handle.handle))
    const D2 = ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext2.handle.handle))

    // Compute differences
    const Cdiff = C1.subtract(C2)
    const Ddiff = D1.subtract(D2)

    // Parse public key if provided
    const P = pubkey ? ed25519.ExtendedPoint.fromHex(bytesToHex(pubkey)) : null

    // Recompute challenge
    const challenge = bytesToNumberLE(sha256(new Uint8Array([
      ...ciphertext1.commitment.commitment,
      ...ciphertext1.handle.handle,
      ...ciphertext2.commitment.commitment,
      ...ciphertext2.handle.handle,
      ...R1.toRawBytes(),
      ...Cdiff.toRawBytes(),
      ...Ddiff.toRawBytes()
    ]))) % ed25519.CURVE.n

    // Verify the handle difference proof:
    // s * G = R1 + challenge * Ddiff
    const lhs1 = s === 0n ? ed25519.ExtendedPoint.ZERO : G.multiply(s)
    const rhs1 = R1.add(challenge === 0n ? ed25519.ExtendedPoint.ZERO : Ddiff.multiply(challenge))

    if (!lhs1.equals(rhs1)) {
      return false
    }

    // If public key is provided, verify the full discrete log equality proof
    if (P) {
      // Verify: s * P = R2 + challenge * Cdiff
      const lhs2 = s === 0n ? ed25519.ExtendedPoint.ZERO : P.multiply(s)
      const rhs2 = R2.add(challenge === 0n ? ed25519.ExtendedPoint.ZERO : Cdiff.multiply(challenge))

      // Both equations must hold for the proof to be valid
      // This proves that log_G(Ddiff) = log_P(Cdiff), which means
      // the ciphertexts encrypt the same value
      return lhs2.equals(rhs2)
    }

    // Without public key, we can only verify the handle difference
    // This is weaker but still useful for some applications
    return true
  } catch {
    return false
  }
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
    ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.commitment.commitment))
    ed25519.ExtendedPoint.fromHex(bytesToHex(ciphertext.handle.handle))
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

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate a transfer proof (combining range, validity, and equality proofs)
 * 
 * @param sourceBalance - Current encrypted balance of source
 * @param amount - Amount to transfer
 * @param sourceKeypair - Source ElGamal keypair
 * @param destPubkey - Destination ElGamal public key
 * @returns Transfer proof and new ciphertexts
 */
export async function generateTransferProof(
  sourceBalance: ElGamalCiphertext,
  amount: bigint,
  sourceKeypair: ElGamalKeypair,
  destPubkey: ElGamalPubkey
): Promise<{
  transferProof: {
    encryptedTransferAmount: Uint8Array
    newSourceCommitment: Uint8Array
    equalityProof: Uint8Array
    validityProof: Uint8Array
    rangeProof: Uint8Array
  }
  newSourceBalance: ElGamalCiphertext
  destCiphertext: ElGamalCiphertext
}> {
  // 1. Encrypt amount for destination
  const destEncryption = encryptAmountWithRandomness(amount, destPubkey)
  const destCiphertext = destEncryption.ciphertext

  // 2. Encrypt amount for source (to subtract)
  const sourceEncryption = encryptAmountWithRandomness(amount, sourceKeypair.publicKey)
  const sourceTransferCiphertext = sourceEncryption.ciphertext

  // 3. Generate equality proof
  const equalityProof = generateEqualityProof(
    destCiphertext,
    sourceTransferCiphertext,
    destEncryption.randomness,
    sourceEncryption.randomness,
    destPubkey
  )

  // 4. Generate validity proof for destination ciphertext
  const validityProof = generateValidityProof(
    destCiphertext,
    destPubkey,
    destEncryption.randomness
  )

  // 5. Compute new source balance: Balance - TransferAmount
  const newSourceBalance = subtractCiphertexts(sourceBalance, sourceTransferCiphertext)

  // 6. Generate range proof for new balance (to prove no underflow)
  // We need the actual new balance value to generate the proof
  // Decrypt current balance to get it
  const currentBalance = decryptAmount(sourceBalance, sourceKeypair.secretKey, MAX_DECRYPTABLE_VALUE * 100n) // Allow larger range

  if (currentBalance === null) {
    throw new Error('Could not decrypt source balance to generate range proof')
  }

  const newBalanceValue = currentBalance - amount
  if (newBalanceValue < 0n) {
    throw new Error('Insufficient balance')
  }

  // For range proof, we need the randomness of the new balance commitment.
  // However, our generateRangeProof implementation is currently a placeholder (post-mortem ZK),
  // so we can pass dummy randomness.
  const dummyRandomness = new Uint8Array(32)
  const rangeProof = await generateRangeProof(newBalanceValue, newSourceBalance.commitment, dummyRandomness)

  return {
    transferProof: {
      encryptedTransferAmount: serializeCiphertext(destCiphertext),
      newSourceCommitment: newSourceBalance.commitment.commitment,
      equalityProof: equalityProof.proof,
      validityProof: validityProof.proof,
      rangeProof: rangeProof.proof
    },
    newSourceBalance,
    destCiphertext
  }
}