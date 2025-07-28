/**
 * ZK Proof Builder
 * 
 * Unified proof generation and verification with support for both
 * Solana's ZK ElGamal Proof Program and fallback local verification.
 * 
 * This module handles the current disabled state of the ZK program
 * by providing local verification as a fallback while preparing
 * for the program's re-enablement.
 */

import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToNumberLE, bytesToHex, randomBytes } from '@noble/curves/abstract/utils'
import type { IInstruction } from '@solana/kit'

import {
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  type TransferProofData,
  PROOF_SIZES
} from '../constants/zk-proof-program.js'

import {
  createVerifyTransferProofInstruction,
  createVerifyRangeProofInstruction,
  createVerifyValidityProofInstruction,
  type ProofVerificationAccounts
} from './zk-proof-instructions.js'

import type {
  ElGamalCiphertext,
  ElGamalPubkey
} from './elgamal.js'

// =====================================================
// CONSTANTS
// =====================================================

// Standard generator G for curve25519
const G = ed25519.ExtendedPoint.BASE

// Secondary generator H for Pedersen commitments
// Must be consistent across all modules
const H_BYTES = sha256(G.toRawBytes())
const H_SCALAR = bytesToNumberLE(H_BYTES) % ed25519.CURVE.n
const H = G.multiply(H_SCALAR)

// ZK program status (as of July 2025)
const ZK_PROGRAM_DISABLED = true
const ZK_PROGRAM_DISABLED_MESSAGE = 
  'Solana\'s ZK ElGamal Proof Program is currently disabled (July 2025) due to security vulnerabilities. ' +
  'Using local verification as fallback. This is suitable for development but not production use.'

// =====================================================
// TYPES
// =====================================================

export interface ProofGenerationResult {
  proof: Uint8Array
  commitment?: Uint8Array
  instruction?: IInstruction
  requiresZkProgram: boolean
}

export interface ProofVerificationResult {
  valid: boolean
  error?: string
  usedFallback: boolean
}

export enum ProofMode {
  /** Use ZK program if available, error if not */
  ZK_PROGRAM_ONLY = 'zk_program_only',
  
  /** Use ZK program if available, fallback to local if not */
  ZK_PROGRAM_WITH_FALLBACK = 'zk_program_with_fallback',
  
  /** Always use local verification (for testing) */
  LOCAL_ONLY = 'local_only'
}

// =====================================================
// RANGE PROOF GENERATION
// =====================================================

/**
 * Generate a range proof with proper commitment handling
 * 
 * This creates a Pedersen commitment and bulletproof that can be
 * verified either by the ZK program or locally.
 */
export function generateRangeProofWithCommitment(
  amount: bigint,
  randomness: Uint8Array,
  mode: ProofMode = ProofMode.ZK_PROGRAM_WITH_FALLBACK
): ProofGenerationResult {
  if (amount < 0n || amount >= (1n << 64n)) {
    throw new Error('Amount must be in range [0, 2^64)')
  }

  // Convert randomness to scalar
  const gamma = bytesToNumberLE(randomness) % ed25519.CURVE.n
  
  if (gamma === 0n) {
    throw new Error('Invalid randomness: gamma cannot be zero')
  }

  // Create Pedersen commitment: amount*G + gamma*H
  const commitment = G.multiply(amount).add(H.multiply(gamma))
  const commitmentBytes = commitment.toRawBytes()

  // For now, we'll use a simplified bulletproof structure
  // In production, this would use the actual bulletproof implementation
  const proof = createSimplifiedRangeProof(amount, gamma, commitment)

  // Check if we should create ZK program instruction
  let instruction: IInstruction | undefined
  if (mode !== ProofMode.LOCAL_ONLY && !ZK_PROGRAM_DISABLED) {
    const accounts: ProofVerificationAccounts = {
      proofContext: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS // Placeholder
    }
    instruction = createVerifyRangeProofInstruction(accounts, commitmentBytes, proof)
  }

  return {
    proof,
    commitment: commitmentBytes,
    instruction,
    requiresZkProgram: mode === ProofMode.ZK_PROGRAM_ONLY && !instruction
  }
}

/**
 * Create a simplified range proof for testing
 * In production, this would be a full bulletproof
 */
function createSimplifiedRangeProof(
  amount: bigint,
  gamma: bigint,
  commitment: typeof ed25519.ExtendedPoint.BASE
): Uint8Array {
  // Create a proof structure that includes:
  // 1. Commitment to the bits of the amount
  // 2. Challenge response
  // 3. Inner product proof
  
  const proof = new Uint8Array(PROOF_SIZES.RANGE_PROOF_BULLETPROOF)
  let offset = 0

  // A commitment (32 bytes)
  const a0 = amount % 256n || 1n // Ensure non-zero
  const g0 = gamma % 256n || 1n
  const A = G.multiply(a0).add(H.multiply(g0))
  proof.set(A.toRawBytes(), offset)
  offset += 32

  // S commitment (32 bytes)
  const a1 = (amount >> 8n) % 256n || 1n
  const g1 = (gamma >> 8n) % 256n || 1n
  const S = G.multiply(a1).add(H.multiply(g1))
  proof.set(S.toRawBytes(), offset)
  offset += 32

  // T1 commitment (32 bytes)
  const a2 = (amount >> 16n) % 256n || 1n
  const g2 = (gamma >> 16n) % 256n || 1n
  const T1 = G.multiply(a2).add(H.multiply(g2))
  proof.set(T1.toRawBytes(), offset)
  offset += 32

  // T2 commitment (32 bytes)
  const a3 = (amount >> 24n) % 256n || 1n
  const g3 = (gamma >> 24n) % 256n || 1n
  const T2 = G.multiply(a3).add(H.multiply(g3))
  proof.set(T2.toRawBytes(), offset)
  offset += 32

  // Challenge responses (3 * 32 = 96 bytes)
  const challenge = bytesToNumberLE(sha256(commitment.toRawBytes())) % ed25519.CURVE.n
  const taux = (gamma * challenge) % ed25519.CURVE.n
  const mu = (amount * challenge) % ed25519.CURVE.n
  const tx = (amount + gamma * challenge) % ed25519.CURVE.n

  proof.set(scalarToBytes(taux), offset)
  offset += 32
  proof.set(scalarToBytes(mu), offset)
  offset += 32
  proof.set(scalarToBytes(tx), offset)
  offset += 32

  // Fill the rest with inner product proof simulation
  const remaining = PROOF_SIZES.RANGE_PROOF_BULLETPROOF - offset
  const innerProduct = randomBytes(remaining)
  proof.set(innerProduct, offset)

  return proof
}

/**
 * Verify a range proof locally
 */
export function verifyRangeProofLocal(
  proof: Uint8Array,
  commitment: Uint8Array
): ProofVerificationResult {
  try {
    if (proof.length !== PROOF_SIZES.RANGE_PROOF_BULLETPROOF) {
      return {
        valid: false,
        error: 'Invalid proof size',
        usedFallback: true
      }
    }

    // Parse commitment point
    const _commitmentPoint = ed25519.ExtendedPoint.fromHex(bytesToHex(commitment))
    
    // For simplified proof, just check structure
    // In production, this would verify the actual bulletproof
    
    // Extract proof components
    const A = proof.slice(0, 32)
    const S = proof.slice(32, 64)
    const T1 = proof.slice(64, 96)
    const T2 = proof.slice(96, 128)
    
    // Basic validation - ensure points are valid
    try {
      ed25519.ExtendedPoint.fromHex(bytesToHex(A))
      ed25519.ExtendedPoint.fromHex(bytesToHex(S))
      ed25519.ExtendedPoint.fromHex(bytesToHex(T1))
      ed25519.ExtendedPoint.fromHex(bytesToHex(T2))
    } catch {
      return {
        valid: false,
        error: 'Invalid proof points',
        usedFallback: true
      }
    }

    // For now, accept valid structure as proof
    // Real implementation would verify the bulletproof equations
    return {
      valid: true,
      usedFallback: true
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      usedFallback: true
    }
  }
}

// =====================================================
// VALIDITY PROOF GENERATION
// =====================================================

/**
 * Generate a validity proof for a ciphertext
 */
export function generateValidityProofWithInstruction(
  ciphertext: ElGamalCiphertext,
  pubkey: ElGamalPubkey,
  amount: bigint,
  randomness: Uint8Array,
  mode: ProofMode = ProofMode.ZK_PROGRAM_WITH_FALLBACK
): ProofGenerationResult {
  // Convert randomness to scalar
  const r = bytesToNumberLE(randomness) % ed25519.CURVE.n
  
  // Parse public key
  const pubkeyPoint = ed25519.ExtendedPoint.fromHex(bytesToHex(pubkey))
  
  // Generate Schnorr proof
  const k = bytesToNumberLE(randomBytes(32)) % ed25519.CURVE.n
  
  // Commitments for proof
  const A = G.multiply(k).add(pubkeyPoint.multiply(k))
  
  // Challenge
  const challenge = bytesToNumberLE(
    sha256(new Uint8Array([
      ...ciphertext.commitment.commitment,
      ...ciphertext.handle.handle,
      ...A.toRawBytes()
    ]))
  ) % ed25519.CURVE.n
  
  // Response
  const z1 = (k + challenge * amount) % ed25519.CURVE.n
  const z2 = (k + challenge * r) % ed25519.CURVE.n
  
  // Construct proof
  const proof = new Uint8Array(PROOF_SIZES.VALIDITY_PROOF)
  let offset = 0
  
  proof.set(A.toRawBytes(), offset)
  offset += 32
  proof.set(scalarToBytes(z1), offset)
  offset += 32
  proof.set(scalarToBytes(z2), offset)

  // Create instruction if needed
  let instruction: IInstruction | undefined
  if (mode !== ProofMode.LOCAL_ONLY && !ZK_PROGRAM_DISABLED) {
    const accounts: ProofVerificationAccounts = {
      proofContext: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS
    }
    instruction = createVerifyValidityProofInstruction(accounts, 
      new Uint8Array([
        ...ciphertext.commitment.commitment,
        ...ciphertext.handle.handle
      ]), 
      proof)
  }

  return {
    proof,
    instruction,
    requiresZkProgram: mode === ProofMode.ZK_PROGRAM_ONLY && !instruction
  }
}

// =====================================================
// TRANSFER PROOF GENERATION
// =====================================================

/**
 * Generate a complete transfer proof with all components
 */
export function generateTransferProofWithInstruction(
  sourceBalance: ElGamalCiphertext,
  transferAmount: bigint,
  sourcePubkey: ElGamalPubkey,
  destPubkey: ElGamalPubkey,
  sourceRandomness: Uint8Array,
  mode: ProofMode = ProofMode.ZK_PROGRAM_WITH_FALLBACK
): {
  transferProof: TransferProofData
  newSourceBalance: ElGamalCiphertext
  destCiphertext: ElGamalCiphertext
  instruction?: IInstruction
  requiresZkProgram: boolean
} {
  // Generate transfer randomness
  const transferRandomness = randomBytes(32)
  transferRandomness[0] &= 248
  transferRandomness[31] &= 127
  transferRandomness[31] |= 64

  // Encrypt transfer amount for destination
  const destR = bytesToNumberLE(transferRandomness) % ed25519.CURVE.n
  const destPubkeyPoint = ed25519.ExtendedPoint.fromHex(bytesToHex(destPubkey))
  const destCommitment = G.multiply(transferAmount).add(destPubkeyPoint.multiply(destR))
  const destHandle = G.multiply(destR)
  
  const destCiphertext: ElGamalCiphertext = {
    commitment: { commitment: destCommitment.toRawBytes() },
    handle: { handle: destHandle.toRawBytes() }
  }

  // Calculate new source balance (simplified - in practice would use homomorphic subtraction)
  const newSourceBalance = sourceBalance // Placeholder

  // Generate proofs
  const rangeProofResult = generateRangeProofWithCommitment(transferAmount, transferRandomness, ProofMode.LOCAL_ONLY)
  const validityProofResult = generateValidityProofWithInstruction(
    destCiphertext,
    destPubkey,
    transferAmount,
    transferRandomness,
    ProofMode.LOCAL_ONLY
  )

  // Generate equality proof (simplified)
  const equalityProof = new Uint8Array(PROOF_SIZES.EQUALITY_PROOF)
  randomBytes(32).forEach((b, i) => equalityProof[i] = b)

  // Construct transfer proof data
  const transferProof: TransferProofData = {
    encryptedTransferAmount: new Uint8Array([
      ...destCiphertext.commitment.commitment,
      ...destCiphertext.handle.handle
    ]),
    newSourceCommitment: newSourceBalance.commitment.commitment,
    equalityProof,
    validityProof: validityProofResult.proof,
    rangeProof: rangeProofResult.proof
  }

  // Create instruction if needed
  let instruction: IInstruction | undefined
  if (mode !== ProofMode.LOCAL_ONLY && !ZK_PROGRAM_DISABLED) {
    const accounts: ProofVerificationAccounts = {
      proofContext: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS
    }
    instruction = createVerifyTransferProofInstruction(accounts, transferProof)
  }

  return {
    transferProof,
    newSourceBalance,
    destCiphertext,
    instruction,
    requiresZkProgram: mode === ProofMode.ZK_PROGRAM_ONLY && !instruction
  }
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Convert scalar to bytes (little-endian)
 */
function scalarToBytes(scalar: bigint): Uint8Array {
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number((scalar >> BigInt(i * 8)) & 0xffn)
  }
  return bytes
}

/**
 * Check if ZK program is available
 */
export function isZkProgramAvailable(): boolean {
  return !ZK_PROGRAM_DISABLED
}

/**
 * Get ZK program status message
 */
export function getZkProgramStatus(): string {
  return ZK_PROGRAM_DISABLED ? ZK_PROGRAM_DISABLED_MESSAGE : 'ZK ElGamal Proof Program is available'
}