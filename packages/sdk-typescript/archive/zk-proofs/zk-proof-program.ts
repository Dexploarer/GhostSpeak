/**
 * Solana ZK ElGamal Proof Program Constants
 * 
 * Constants and types for interacting with Solana's native ZK ElGamal Proof Program.
 * This program is used for verifying zero-knowledge proofs in confidential transfers.
 * 
 * Program ID: ZkE1Gama1Proof11111111111111111111111111111
 * 
 * Note: As of June 2025, the ZK ElGamal proof program has been temporarily
 * disabled on mainnet due to security vulnerabilities. This implementation
 * prepares for its re-enablement after audits are completed.
 */

import { address } from '@solana/addresses'

/**
 * ZK ElGamal Proof Program Address
 * This is Solana's native program for verifying ElGamal-based zero-knowledge proofs
 */
export const ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS = address('ZkE1Gama1Proof11111111111111111111111111111')

/**
 * Proof instruction discriminators for the ZK ElGamal Proof Program
 * These discriminators identify different proof verification instructions
 */
export enum ProofInstruction {
  /** Verify a transfer proof (range + validity proofs) */
  VerifyTransfer = 0,
  
  /** Verify a withdraw proof */
  VerifyWithdraw = 1,
  
  /** Verify a range proof only */
  VerifyRangeProof = 2,
  
  /** Verify a validity proof only */
  VerifyValidityProof = 3,
  
  /** Verify an equality proof */
  VerifyEqualityProof = 4,
  
  /** Verify a transfer with fee proof */
  VerifyTransferWithFee = 5,
  
  /** Verify a batch of range proofs */
  VerifyBatchedRangeProof = 6,
  
  /** Verify a batch of validity proofs */
  VerifyBatchedValidityProof = 7,
  
  /** Close proof context account */
  CloseContextState = 8,
}

/**
 * Proof data structure for transfer verification
 */
export interface TransferProofData {
  /** The encrypted transfer amount (ElGamal ciphertext) */
  encryptedTransferAmount: Uint8Array // 64 bytes
  
  /** Source account's new encrypted balance commitment */
  newSourceCommitment: Uint8Array // 32 bytes
  
  /** Equality proof for source balance */
  equalityProof: Uint8Array // 192 bytes
  
  /** Validity proof for the transfer */
  validityProof: Uint8Array // 96 bytes
  
  /** Range proof for the transfer amount and remaining balance */
  rangeProof: Uint8Array // Variable size (typically 674+ bytes for bulletproofs)
}

/**
 * Proof data structure for withdraw verification
 */
export interface WithdrawProofData {
  /** The encrypted withdraw amount */
  encryptedWithdrawAmount: Uint8Array // 64 bytes
  
  /** New source balance commitment after withdrawal */
  newSourceCommitment: Uint8Array // 32 bytes
  
  /** Equality proof for balance update */
  equalityProof: Uint8Array // 192 bytes
  
  /** Range proof for remaining balance */
  rangeProof: Uint8Array // Variable size
}

/**
 * Proof data structure for transfer with fee
 */
export interface TransferWithFeeProofData {
  /** Transfer proof data */
  transferProof: TransferProofData
  
  /** Fee amount encryption */
  encryptedFeeAmount: Uint8Array // 64 bytes
  
  /** Fee commitment */
  feeCommitment: Uint8Array // 32 bytes
  
  /** Fee validity proof */
  feeValidityProof: Uint8Array // 96 bytes
}

/**
 * Context for batched proof verification
 */
export interface BatchProofContext {
  /** Number of proofs in the batch */
  proofCount: number
  
  /** Maximum proofs per batch (system limit) */
  maxProofsPerBatch: number
  
  /** Current batch index */
  batchIndex: number
}

/**
 * Error codes returned by the ZK ElGamal Proof Program
 */
export enum ZkProofError {
  /** Invalid proof format or size */
  InvalidProofFormat = 0,
  
  /** Proof verification failed */
  ProofVerificationFailed = 1,
  
  /** Invalid public inputs */
  InvalidPublicInputs = 2,
  
  /** Proof context mismatch */
  ProofContextMismatch = 3,
  
  /** Batch size exceeded */
  BatchSizeExceeded = 4,
  
  /** Invalid instruction data */
  InvalidInstructionData = 5,
  
  /** Account not initialized */
  AccountNotInitialized = 6,
  
  /** Unauthorized signer */
  UnauthorizedSigner = 7,
}

/**
 * Maximum sizes for different proof types
 */
export const PROOF_SIZES = {
  /** ElGamal ciphertext size */
  CIPHERTEXT: 64,
  
  /** Pedersen commitment size */
  COMMITMENT: 32,
  
  /** Validity proof size */
  VALIDITY_PROOF: 96,
  
  /** Equality proof size */
  EQUALITY_PROOF: 192,
  
  /** Minimum range proof size (simplified) */
  RANGE_PROOF_MIN: 128,
  
  /** Typical bulletproof size for 64-bit range */
  RANGE_PROOF_BULLETPROOF: 674,
  
  /** Maximum proof data size for a single instruction */
  MAX_PROOF_DATA: 1232, // Solana transaction size limit consideration
} as const

/**
 * Proof verification compute unit costs (approximate)
 */
export const PROOF_COMPUTE_UNITS = {
  /** Base cost for proof instruction */
  BASE: 5000,
  
  /** Validity proof verification */
  VALIDITY: 10000,
  
  /** Equality proof verification */
  EQUALITY: 15000,
  
  /** Range proof verification (bulletproof) */
  RANGE_BULLETPROOF: 100000,
  
  /** Simplified range proof verification */
  RANGE_SIMPLIFIED: 20000,
  
  /** Batch overhead per proof */
  BATCH_OVERHEAD: 2000,
} as const

/**
 * Helper to calculate total compute units for a proof verification
 */
export function calculateProofComputeUnits(
  proofType: ProofInstruction,
  isBulletproof = true,
  batchSize = 1
): number {
  let units = PROOF_COMPUTE_UNITS.BASE
  
  switch (proofType) {
    case ProofInstruction.VerifyTransfer:
      units += PROOF_COMPUTE_UNITS.VALIDITY
      units += PROOF_COMPUTE_UNITS.EQUALITY
      units += isBulletproof ? PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF : PROOF_COMPUTE_UNITS.RANGE_SIMPLIFIED
      break
      
    case ProofInstruction.VerifyWithdraw:
      units += PROOF_COMPUTE_UNITS.EQUALITY
      units += isBulletproof ? PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF : PROOF_COMPUTE_UNITS.RANGE_SIMPLIFIED
      break
      
    case ProofInstruction.VerifyRangeProof:
      units += isBulletproof ? PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF : PROOF_COMPUTE_UNITS.RANGE_SIMPLIFIED
      break
      
    case ProofInstruction.VerifyValidityProof:
      units += PROOF_COMPUTE_UNITS.VALIDITY
      break
      
    case ProofInstruction.VerifyEqualityProof:
      units += PROOF_COMPUTE_UNITS.EQUALITY
      break
      
    case ProofInstruction.VerifyBatchedRangeProof:
    case ProofInstruction.VerifyBatchedValidityProof:
      units += PROOF_COMPUTE_UNITS.BATCH_OVERHEAD * batchSize
      if (proofType === ProofInstruction.VerifyBatchedRangeProof) {
        units += (isBulletproof ? PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF : PROOF_COMPUTE_UNITS.RANGE_SIMPLIFIED) * batchSize
      } else {
        units += PROOF_COMPUTE_UNITS.VALIDITY * batchSize
      }
      break
  }
  
  return units
}

/**
 * Export all constants as a single object for convenience
 */
export const ZK_PROOF_CONSTANTS = {
  programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  instructions: ProofInstruction,
  errors: ZkProofError,
  sizes: PROOF_SIZES,
  computeUnits: PROOF_COMPUTE_UNITS,
} as const