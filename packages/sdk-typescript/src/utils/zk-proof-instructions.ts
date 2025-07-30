/**
 * ZK ElGamal Proof Program Instructions
 * 
 * Instruction builders for interacting with Solana's native ZK ElGamal Proof Program.
 * These instructions enable on-chain verification of zero-knowledge proofs for
 * confidential transfers and other privacy-preserving operations.
 * 
 * Account Role Mapping (from @solana/kit):
 * - 0: ReadonlyNonSigner
 * - 1: ReadonlySigner  
 * - 2: WritableNonSigner
 * - 3: WritableSigner
 */

import { type Address, address } from '@solana/addresses'
import type { 
  IInstruction, 
  IAccountMeta, 
  TransactionSigner
} from '@solana/kit'
import {
  getStructEncoder,
  getU8Encoder,
  getBytesEncoder,
  fixEncoderSize,
  getAddressEncoder,
  getU32Encoder,
  getU64Encoder
} from '@solana/kit'
import { sha256 } from '@noble/hashes/sha256'
import bs58 from 'bs58'

import {
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  ProofInstruction,
  type TransferProofData,
  type WithdrawProofData,
  type TransferWithFeeProofData,
  PROOF_SIZES
} from '../constants/zk-proof-program.js'

// Re-export for convenience
export { ProofInstruction, PROOF_SIZES }

/**
 * Account structure for proof verification instructions
 */
export interface ProofVerificationAccounts {
  /** The proof context account (must be writable) */
  proofContext: Address
  
  /** System program (for context account creation if needed) */
  systemProgram?: Address
  
  /** Authority that owns the proof context (optional) */
  authority?: TransactionSigner
  
  /** Rent sysvar (for legacy compatibility) */
  rentSysvar?: Address
}

/**
 * Create instruction to verify a transfer proof
 * 
 * This instruction verifies range, validity, and equality proofs for a
 * confidential transfer operation.
 * 
 * @param accounts - Required accounts for verification
 * @param proofData - The transfer proof data to verify
 * @returns Instruction for proof verification
 */
export function createVerifyTransferProofInstruction(
  accounts: ProofVerificationAccounts,
  proofData: TransferProofData
): IInstruction {
  // Serialize proof data
  const data = serializeTransferProofData(proofData)
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: accounts.proofContext, role: 2 },
  ]
  
  if (accounts.systemProgram) {
    accountMetas.push({ address: accounts.systemProgram, role: 0 })
  }
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

/**
 * Create instruction to verify a withdraw proof
 * 
 * This instruction verifies the proof that a withdrawal maintains
 * a valid (non-negative) remaining balance.
 * 
 * @param accounts - Required accounts for verification
 * @param proofData - The withdraw proof data to verify
 * @returns Instruction for proof verification
 */
export function createVerifyWithdrawProofInstruction(
  accounts: ProofVerificationAccounts,
  proofData: WithdrawProofData
): IInstruction {
  // Serialize proof data
  const data = serializeWithdrawProofData(proofData)
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: accounts.proofContext, role: 2 },
  ]
  
  if (accounts.systemProgram) {
    accountMetas.push({ address: accounts.systemProgram, role: 0 })
  }
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

/**
 * Create instruction to verify a range proof
 * 
 * This instruction verifies that an encrypted value is within a valid range
 * (typically 0 to 2^64 - 1 for token amounts).
 * 
 * @param accounts - Required accounts for verification
 * @param commitment - The Pedersen commitment to verify
 * @param rangeProof - The range proof data
 * @returns Instruction for proof verification
 */
export function createVerifyRangeProofInstruction(
  accounts: ProofVerificationAccounts,
  commitment: Uint8Array,
  rangeProof: Uint8Array
): IInstruction {
  // Create encoder for the instruction data
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['commitment', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.COMMITMENT)],
    ['proof', getBytesEncoder()]
  ])
  
  const data = encoder.encode({
    instruction: ProofInstruction.VerifyRangeProof,
    commitment,
    proof: rangeProof
  })
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: accounts.proofContext, role: 2 },
  ]
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

/**
 * Create instruction to verify a validity proof
 * 
 * This instruction verifies that an ElGamal ciphertext is well-formed
 * and encrypts a valid value.
 * 
 * @param accounts - Required accounts for verification
 * @param ciphertext - The ElGamal ciphertext to verify
 * @param validityProof - The validity proof data
 * @returns Instruction for proof verification
 */
export function createVerifyValidityProofInstruction(
  accounts: ProofVerificationAccounts,
  ciphertext: Uint8Array,
  validityProof: Uint8Array
): IInstruction {
  // Create encoder for the instruction data
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['ciphertext', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.CIPHERTEXT)],
    ['proof', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.VALIDITY_PROOF)]
  ])
  
  const data = encoder.encode({
    instruction: ProofInstruction.VerifyValidityProof,
    ciphertext,
    proof: validityProof
  })
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: accounts.proofContext, role: 2 },
  ]
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

/**
 * Create instruction to verify an equality proof
 * 
 * This instruction verifies that two ElGamal ciphertexts encrypt the same value
 * under potentially different public keys.
 * 
 * @param accounts - Required accounts for verification
 * @param ciphertext1 - The first ElGamal ciphertext
 * @param ciphertext2 - The second ElGamal ciphertext
 * @param equalityProof - The equality proof data
 * @returns Instruction for proof verification
 */
export function createVerifyEqualityProofInstruction(
  accounts: ProofVerificationAccounts,
  ciphertext1: Uint8Array,
  ciphertext2: Uint8Array,
  equalityProof: Uint8Array
): IInstruction {
  // Create encoder for the instruction data
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['ciphertext1', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.CIPHERTEXT)],
    ['ciphertext2', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.CIPHERTEXT)],
    ['proof', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.EQUALITY_PROOF)]
  ])
  
  const data = encoder.encode({
    instruction: ProofInstruction.VerifyEqualityProof,
    ciphertext1,
    ciphertext2,
    proof: equalityProof
  })
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: accounts.proofContext, role: 2 },
  ]
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

/**
 * Create instruction to verify a transfer with fee proof
 * 
 * This instruction verifies all proofs required for a confidential transfer
 * that includes a transfer fee.
 * 
 * @param accounts - Required accounts for verification
 * @param proofData - The transfer with fee proof data
 * @returns Instruction for proof verification
 */
export function createVerifyTransferWithFeeProofInstruction(
  accounts: ProofVerificationAccounts,
  proofData: TransferWithFeeProofData
): IInstruction {
  // Serialize proof data
  const data = serializeTransferWithFeeProofData(proofData)
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: accounts.proofContext, role: 2 },
  ]
  
  if (accounts.systemProgram) {
    accountMetas.push({ address: accounts.systemProgram, role: 0 })
  }
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

/**
 * Create instruction to close a proof context account
 * 
 * This instruction closes a proof context account and returns the rent
 * to the specified recipient.
 * 
 * @param proofContext - The proof context account to close
 * @param authority - The authority that owns the context
 * @param rentRecipient - Account to receive the rent
 * @returns Instruction to close the context
 */
export function createCloseProofContextInstruction(
  proofContext: Address,
  authority: TransactionSigner,
  rentRecipient: Address
): IInstruction {
  // Create encoder for the instruction data
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()]
  ])
  
  const data = encoder.encode({
    instruction: ProofInstruction.CloseContextState
  })
  
  // Account metas
  const accountMetas: IAccountMeta[] = [
    { address: proofContext, role: 2 }, // WritableNonSigner
    { address: authority.address, role: 3 }, // WritableSigner
    { address: rentRecipient, role: 2 }, // WritableNonSigner
  ]
  
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: accountMetas,
    data
  }
}

// =====================================================
// SERIALIZATION HELPERS
// =====================================================

/**
 * Serialize transfer proof data for instruction
 */
function serializeTransferProofData(proofData: TransferProofData): Uint8Array {
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['encryptedTransferAmount', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.CIPHERTEXT)],
    ['newSourceCommitment', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.COMMITMENT)],
    ['equalityProof', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.EQUALITY_PROOF)],
    ['validityProof', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.VALIDITY_PROOF)],
    ['rangeProof', getBytesEncoder()]
  ])
  
  return new Uint8Array(encoder.encode({
    instruction: ProofInstruction.VerifyTransfer,
    ...proofData
  }))
}

/**
 * Serialize withdraw proof data for instruction
 */
function serializeWithdrawProofData(proofData: WithdrawProofData): Uint8Array {
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['encryptedWithdrawAmount', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.CIPHERTEXT)],
    ['newSourceCommitment', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.COMMITMENT)],
    ['equalityProof', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.EQUALITY_PROOF)],
    ['rangeProof', getBytesEncoder()]
  ])
  
  return new Uint8Array(encoder.encode({
    instruction: ProofInstruction.VerifyWithdraw,
    ...proofData
  }))
}

/**
 * Serialize transfer with fee proof data for instruction
 */
function serializeTransferWithFeeProofData(proofData: TransferWithFeeProofData): Uint8Array {
  // First serialize the base transfer proof
  const transferProofBytes = serializeTransferProofData(proofData.transferProof)
  
  // Then add the fee-specific data
  const feeEncoder = getStructEncoder([
    ['encryptedFeeAmount', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.CIPHERTEXT)],
    ['feeCommitment', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.COMMITMENT)],
    ['feeValidityProof', fixEncoderSize(getBytesEncoder(), PROOF_SIZES.VALIDITY_PROOF)]
  ])
  
  const feeBytes = feeEncoder.encode({
    encryptedFeeAmount: proofData.encryptedFeeAmount,
    feeCommitment: proofData.feeCommitment,
    feeValidityProof: proofData.feeValidityProof
  })
  
  // Combine all data with the correct instruction discriminator
  const instruction = new Uint8Array([ProofInstruction.VerifyTransferWithFee])
  const result = new Uint8Array(1 + transferProofBytes.length - 1 + feeBytes.length)
  
  result.set(instruction, 0)
  result.set(transferProofBytes.slice(1), 1) // Skip the instruction byte from transfer proof
  result.set(feeBytes, 1 + transferProofBytes.length - 1)
  
  return result
}

/**
 * Helper to create a batch of range proof verifications
 * 
 * @param accounts - Required accounts for verification
 * @param proofs - Array of commitments and their range proofs
 * @returns Array of instructions for batch verification
 */
export function createBatchVerifyRangeProofInstructions(
  accounts: ProofVerificationAccounts,
  proofs: { commitment: Uint8Array; rangeProof: Uint8Array }[]
): IInstruction[] {
  // Due to transaction size limits, we may need to split into multiple instructions
  const MAX_PROOFS_PER_INSTRUCTION = 4 // Conservative limit
  
  const instructions: IInstruction[] = []
  
  for (let i = 0; i < proofs.length; i += MAX_PROOFS_PER_INSTRUCTION) {
    const batch = proofs.slice(i, i + MAX_PROOFS_PER_INSTRUCTION)
    
    // Create encoder for batched data
    const encoder = getStructEncoder([
      ['instruction', getU8Encoder()],
      ['proofCount', getU8Encoder()],
      ['proofs', getBytesEncoder()]
    ])
    
    // Serialize all proofs in the batch
    const batchData: number[] = []
    for (const { commitment, rangeProof } of batch) {
      batchData.push(...Array.from(commitment))
      batchData.push(...Array.from(new Uint8Array([rangeProof.length & 0xff, (rangeProof.length >> 8) & 0xff])))
      batchData.push(...Array.from(rangeProof))
    }
    
    const data = encoder.encode({
      instruction: ProofInstruction.VerifyBatchedRangeProof,
      proofCount: batch.length,
      proofs: new Uint8Array(batchData)
    })
    
    instructions.push({
      programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
      accounts: [
        { address: accounts.proofContext, role: 2 },
      ],
      data
    })
  }
  
  return instructions
}

/**
 * Helper to create a batch of validity proof verifications
 * 
 * @param accounts - Required accounts for verification
 * @param proofs - Array of ciphertexts and their validity proofs
 * @returns Array of instructions for batch verification
 */
export function createBatchVerifyValidityProofInstructions(
  accounts: ProofVerificationAccounts,
  proofs: { ciphertext: Uint8Array; validityProof: Uint8Array }[]
): IInstruction[] {
  // Due to transaction size limits, we may need to split into multiple instructions
  const MAX_PROOFS_PER_INSTRUCTION = 6 // Conservative limit for validity proofs
  
  const instructions: IInstruction[] = []
  
  for (let i = 0; i < proofs.length; i += MAX_PROOFS_PER_INSTRUCTION) {
    const batch = proofs.slice(i, i + MAX_PROOFS_PER_INSTRUCTION)
    
    // Create encoder for batched data
    const encoder = getStructEncoder([
      ['instruction', getU8Encoder()],
      ['proofCount', getU8Encoder()],
      ['proofs', getBytesEncoder()]
    ])
    
    // Serialize all proofs in the batch
    const batchData: number[] = []
    for (const { ciphertext, validityProof } of batch) {
      batchData.push(...Array.from(ciphertext))
      batchData.push(...Array.from(validityProof))
    }
    
    const data = encoder.encode({
      instruction: ProofInstruction.VerifyBatchedValidityProof,
      proofCount: batch.length,
      proofs: new Uint8Array(batchData)
    })
    
    instructions.push({
      programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
      accounts: [
        { address: accounts.proofContext, role: 2 }, // WritableNonSigner
      ],
      data
    })
  }
  
  return instructions
}

/**
 * Helper to create a batch of equality proof verifications
 * 
 * Note: Equality proofs are typically not batched due to their complexity,
 * but this function provides the capability for future optimization.
 * 
 * @param accounts - Required accounts for verification
 * @param proofs - Array of ciphertext pairs and their equality proofs
 * @returns Array of instructions for verification
 */
export function createBatchVerifyEqualityProofInstructions(
  accounts: ProofVerificationAccounts,
  proofs: {
    ciphertext1: Uint8Array
    ciphertext2: Uint8Array
    equalityProof: Uint8Array
  }[]
): IInstruction[] {
  // Equality proofs are complex, so we process them individually
  // but return as an array for consistency with other batch functions
  const instructions: IInstruction[] = []
  
  for (const { ciphertext1, ciphertext2, equalityProof } of proofs) {
    instructions.push(
      createVerifyEqualityProofInstruction(
        accounts,
        ciphertext1,
        ciphertext2,
        equalityProof
      )
    )
  }
  
  return instructions
}

// =====================================================
// CONTEXT MANAGEMENT HELPERS
// =====================================================

/**
 * Options for creating a proof context account
 */
export interface ProofContextOptions {
  /** Authority that will own the context */
  authority: TransactionSigner
  
  /** Space required for the context (depends on proof type) */
  space: number
  
  /** Optional seed for deterministic address */
  seed?: string
  
  /** Optional payer (defaults to authority) */
  payer?: TransactionSigner
}

/**
 * Calculate the minimum space required for a proof context
 * 
 * @param proofType - Type of proof being verified
 * @param batchSize - Number of proofs if batched
 * @returns Required space in bytes
 */
export function calculateProofContextSpace(
  proofType: ProofInstruction,
  batchSize = 1
): number {
  const BASE_CONTEXT_SIZE = 32 + 8 + 1 // Authority + discriminator + state
  
  switch (proofType) {
    case ProofInstruction.VerifyTransfer:
      return BASE_CONTEXT_SIZE + PROOF_SIZES.CIPHERTEXT + PROOF_SIZES.COMMITMENT
      
    case ProofInstruction.VerifyWithdraw:
      return BASE_CONTEXT_SIZE + PROOF_SIZES.CIPHERTEXT + PROOF_SIZES.COMMITMENT
      
    case ProofInstruction.VerifyRangeProof:
      return BASE_CONTEXT_SIZE + PROOF_SIZES.COMMITMENT
      
    case ProofInstruction.VerifyValidityProof:
      return BASE_CONTEXT_SIZE + PROOF_SIZES.CIPHERTEXT
      
    case ProofInstruction.VerifyEqualityProof:
      return BASE_CONTEXT_SIZE + (PROOF_SIZES.CIPHERTEXT * 2)
      
    case ProofInstruction.VerifyBatchedRangeProof:
      return BASE_CONTEXT_SIZE + (PROOF_SIZES.COMMITMENT * batchSize) + 4
      
    case ProofInstruction.VerifyBatchedValidityProof:
      return BASE_CONTEXT_SIZE + (PROOF_SIZES.CIPHERTEXT * batchSize) + 4
      
    default:
      return BASE_CONTEXT_SIZE + 256 // Conservative default
  }
}

/**
 * Create instruction to initialize a proof context account
 * 
 * This creates the account and prepares it for proof verification.
 * The account must be closed after verification to recover rent.
 * 
 * @param context - The proof context account to create
 * @param options - Context creation options
 * @returns Instruction to create the context
 */
export function createInitializeProofContextInstruction(
  context: TransactionSigner,
  options: ProofContextOptions
): IInstruction {
  const payer = options.payer ?? options.authority
  
  // Calculate rent exemption
  const lamports = 1_000_000 // Placeholder - should calculate actual rent
  
  // Create account instruction data
  const encoder = getStructEncoder([
    ['instruction', getU32Encoder()], // System program CreateAccount
    ['lamports', getU64Encoder()],
    ['space', getU64Encoder()],
    ['owner', fixEncoderSize(getAddressEncoder(), 32)]
  ])
  
  const data = encoder.encode({
    instruction: 0, // CreateAccount
    lamports: BigInt(lamports),
    space: BigInt(options.space),
    owner: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS
  })
  
  return {
    programAddress: address('11111111111111111111111111111111'), // System program
    accounts: [
      { address: payer.address, role: 3 }, // WritableSigner
      { address: context.address, role: 3 }, // WritableSigner
    ],
    data
  }
}

/**
 * Helper to create a complete proof verification transaction
 * 
 * This combines context creation, proof verification, and context closure
 * into a single transaction for efficiency.
 * 
 * @param proofInstruction - The proof verification instruction
 * @param context - Proof context account
 * @param authority - Authority that owns the context
 * @param payer - Transaction fee payer
 * @returns Array of instructions for the complete flow
 */
export function createCompleteProofVerificationFlow(
  proofInstruction: IInstruction,
  context: TransactionSigner,
  authority: TransactionSigner,
  payer: TransactionSigner
): IInstruction[] {
  const instructions: IInstruction[] = []
  
  // 1. Create context account
  const proofType = proofInstruction.data?.[0] as ProofInstruction
  const space = calculateProofContextSpace(proofType)
  
  instructions.push(
    createInitializeProofContextInstruction(context, {
      authority,
      space,
      payer
    })
  )
  
  // 2. Verify proof
  instructions.push(proofInstruction)
  
  // 3. Close context account
  instructions.push(
    createCloseProofContextInstruction(
      context.address,
      authority,
      payer.address
    )
  )
  
  return instructions
}

/**
 * Create a deterministic proof context address
 * 
 * This allows reusing the same context address across multiple transactions
 * for the same authority and proof type.
 * 
 * @param authority - Authority that owns the context
 * @param proofType - Type of proof being verified
 * @param nonce - Optional nonce for uniqueness
 * @returns Deterministic context address
 */
export function deriveProofContextAddress(
  authority: Address,
  proofType: ProofInstruction,
  nonce = 0
): Address {
  const seeds = [
    Buffer.from('proof-context'),
    Buffer.from([proofType]),
    Buffer.from(new Uint8Array(4).fill(0).map((_, i) => (nonce >> (i * 8)) & 0xff))
  ]
  
  // This is a placeholder - actual PDA derivation would use findProgramAddress
  const hashInput = Buffer.concat([
    ...seeds,
    Buffer.from(authority),
    Buffer.from(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
  ])
  const hash = sha256(hashInput)
  const encoded = bs58.encode(hash)
  
  return address(encoded.slice(0, 44))
}

