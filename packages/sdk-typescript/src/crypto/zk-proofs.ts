/**
 * Zero-Knowledge Proof Module
 * 
 * Handles all ZK proof generation and verification for the GhostSpeak protocol,
 * including integration with Solana's ZK ElGamal Proof Program.
 */

import type { IInstruction, AccountRole } from '@solana/kit'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type { 
  RangeProof,
  ValidityProof,
  EqualityProof,
  WithdrawProof
} from './elgamal.js'

// =====================================================
// CONSTANTS
// =====================================================

// Solana's ZK ElGamal Proof Program ID
export const ZK_ELGAMAL_PROOF_PROGRAM_ID = address('ZkE1Gama1ProgramTBVWqQBMpkm38DM5J43XbJDhPVuPGF')

// Instruction discriminators for the proof program
export const ProofInstructions = {
  VERIFY_RANGE_PROOF: 0,
  VERIFY_VALIDITY_PROOF: 1,
  VERIFY_EQUALITY_PROOF: 2,
  VERIFY_WITHDRAW_PROOF: 3,
  VERIFY_ZERO_BALANCE_PROOF: 4,
  VERIFY_FEE_SIGMA_PROOF: 5,
  VERIFY_PUBKEY_VALIDITY_PROOF: 6,
  VERIFY_TRANSFER_PROOF: 7,
  VERIFY_TRANSFER_WITH_FEE_PROOF: 8
} as const

// =====================================================
// PROOF VERIFICATION INSTRUCTIONS
// =====================================================

/**
 * Create instruction to verify range proof
 */
export function createVerifyRangeProofInstruction(
  proofAccount: Address,
  rangeProof: RangeProof
): IInstruction {
  const data = new Uint8Array(1 + rangeProof.proof.length)
  data[0] = ProofInstructions.VERIFY_RANGE_PROOF
  data.set(rangeProof.proof, 1)
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    accounts: [
      { address: proofAccount, role: 'readonly' as unknown as AccountRole }
    ],
    data
  }
}

/**
 * Create instruction to verify validity proof
 */
export function createVerifyValidityProofInstruction(
  proofAccount: Address,
  validityProof: ValidityProof
): IInstruction {
  const data = new Uint8Array(1 + validityProof.proof.length)
  data[0] = ProofInstructions.VERIFY_VALIDITY_PROOF
  data.set(validityProof.proof, 1)
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    accounts: [
      { address: proofAccount, role: 'readonly' as unknown as AccountRole }
    ],
    data
  }
}

/**
 * Create instruction to verify equality proof
 */
export function createVerifyEqualityProofInstruction(
  proofAccount: Address,
  equalityProof: EqualityProof
): IInstruction {
  const data = new Uint8Array(1 + equalityProof.proof.length)
  data[0] = ProofInstructions.VERIFY_EQUALITY_PROOF
  data.set(equalityProof.proof, 1)
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    accounts: [
      { address: proofAccount, role: 'readonly' as unknown as AccountRole }
    ],
    data
  }
}

/**
 * Create instruction to verify withdraw proof
 */
export function createVerifyWithdrawProofInstruction(
  proofAccount: Address,
  withdrawProof: WithdrawProof
): IInstruction {
  const data = new Uint8Array(1 + withdrawProof.proof.length)
  data[0] = ProofInstructions.VERIFY_WITHDRAW_PROOF
  data.set(withdrawProof.proof, 1)
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    accounts: [
      { address: proofAccount, role: 'readonly' as unknown as AccountRole }
    ],
    data
  }
}

/**
 * Create instruction to verify complete transfer proof
 */
export function createVerifyTransferProofInstruction(
  proofAccount: Address,
  rangeProof: RangeProof,
  validityProof: ValidityProof,
  equalityProof: EqualityProof
): IInstruction {
  const totalLength = 1 + rangeProof.proof.length + validityProof.proof.length + equalityProof.proof.length
  const data = new Uint8Array(totalLength)
  
  let offset = 0
  data[offset++] = ProofInstructions.VERIFY_TRANSFER_PROOF
  
  data.set(rangeProof.proof, offset)
  offset += rangeProof.proof.length
  
  data.set(validityProof.proof, offset)
  offset += validityProof.proof.length
  
  data.set(equalityProof.proof, offset)
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    accounts: [
      { address: proofAccount, role: 'readonly' as unknown as AccountRole }
    ],
    data
  }
}

// =====================================================
// PROOF CONTEXT ACCOUNTS
// =====================================================

/**
 * Create proof context account for storing proof verification state
 */
export interface ProofContext {
  authority: Address
  proofType: keyof typeof ProofInstructions
  verified: boolean
  timestamp: bigint
}

/**
 * Derive proof context PDA
 */
export function deriveProofContextPda(
  authority: Address,
  nonce: number
): Address {
  // This would use findProgramAddressSync in real implementation
  // Placeholder for now
  return address(`proof_context_${authority}_${nonce}`)
}

// =====================================================
// BATCH PROOF VERIFICATION
// =====================================================

/**
 * Create instructions for batch proof verification
 */
export function createBatchVerifyProofInstructions(
  proofs: {
    type: 'range' | 'validity' | 'equality' | 'withdraw'
    proof: RangeProof | ValidityProof | EqualityProof | WithdrawProof
    account: Address
  }[]
): IInstruction[] {
  return proofs.map(({ type, proof, account }) => {
    switch (type) {
      case 'range':
        return createVerifyRangeProofInstruction(account, proof as RangeProof)
      case 'validity':
        return createVerifyValidityProofInstruction(account, proof as ValidityProof)
      case 'equality':
        return createVerifyEqualityProofInstruction(account, proof as EqualityProof)
      case 'withdraw':
        return createVerifyWithdrawProofInstruction(account, proof as WithdrawProof)
    }
  })
}

// =====================================================
// PROOF HELPERS
// =====================================================

/**
 * Calculate proof verification cost
 */
export function calculateProofVerificationCost(proofType: keyof typeof ProofInstructions): bigint {
  // Approximate compute units for each proof type
  const costs: Record<keyof typeof ProofInstructions, bigint> = {
    VERIFY_RANGE_PROOF: 100_000n,
    VERIFY_VALIDITY_PROOF: 50_000n,
    VERIFY_EQUALITY_PROOF: 75_000n,
    VERIFY_WITHDRAW_PROOF: 40_000n,
    VERIFY_ZERO_BALANCE_PROOF: 30_000n,
    VERIFY_FEE_SIGMA_PROOF: 80_000n,
    VERIFY_PUBKEY_VALIDITY_PROOF: 25_000n,
    VERIFY_TRANSFER_PROOF: 200_000n,
    VERIFY_TRANSFER_WITH_FEE_PROOF: 250_000n
  }
  
  return costs[proofType]
}

/**
 * Estimate total transaction cost including proof verification
 */
export function estimateProofTransactionCost(
  baseComputeUnits: bigint,
  proofTypes: (keyof typeof ProofInstructions)[]
): bigint {
  const proofCost = proofTypes.reduce(
    (total, type) => total + calculateProofVerificationCost(type),
    0n
  )
  
  return baseComputeUnits + proofCost
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  ZK_ELGAMAL_PROOF_PROGRAM_ID,
  ProofInstructions,
  createVerifyRangeProofInstruction,
  createVerifyValidityProofInstruction,
  createVerifyEqualityProofInstruction,
  createVerifyWithdrawProofInstruction,
  createVerifyTransferProofInstruction,
  createBatchVerifyProofInstructions,
  deriveProofContextPda,
  calculateProofVerificationCost,
  estimateProofTransactionCost
}