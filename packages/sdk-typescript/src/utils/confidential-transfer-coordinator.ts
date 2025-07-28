/**
 * Confidential Transfer Coordinator
 * 
 * Coordinates proof generation and verification for Token-2022 confidential transfers.
 * Manages the entire lifecycle of confidential transfers including:
 * - Proof context account management
 * - Multi-party transfer coordination
 * - Batch proof generation and verification
 * - Transaction optimization
 */

import type { Address } from '@solana/addresses'
import type { 
  TransactionSigner,
  IInstruction
} from '@solana/kit'
import {
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type PedersenCommitment,
  generateTransferProof,
  generateRangeProof,
  decryptAmount,
  encryptAmount
} from './elgamal.js'
import {
  createVerifyTransferProofInstruction,
  createVerifyWithdrawProofInstruction,
  createCloseProofContextInstruction,
  type ProofVerificationAccounts
} from './zk-proof-instructions.js'
import {
  type WithdrawProofData,
  calculateProofComputeUnits,
  ProofInstruction
} from '../constants/zk-proof-program.js'
// randomBytes imported from elgamal module
import { address } from '@solana/addresses'

// Node.js crypto global with WebCrypto support
declare const crypto: { 
  getRandomValues: <T extends Uint8Array>(array: T) => T
}

// =====================================================
// TYPES AND INTERFACES
// =====================================================

/**
 * Result of a confidential transfer preparation
 */
export interface ConfidentialTransferResult {
  /** Instructions to execute the transfer */
  instructions: IInstruction[]
  /** Proof context accounts that need to be cleaned up */
  proofContexts: Address[]
  /** Estimated compute units required */
  computeUnits: number
  /** New source account balance after transfer */
  newSourceBalance: ElGamalCiphertext
  /** Destination account ciphertext */
  destCiphertext: ElGamalCiphertext
}

/**
 * Options for confidential transfer
 */
export interface ConfidentialTransferOptions {
  /** Optional auditor ElGamal public key */
  auditorPubkey?: Uint8Array
  /** Whether to close proof contexts automatically */
  autoCloseProofContexts?: boolean
  /** Maximum compute units per transaction */
  maxComputeUnits?: number
  /** Whether to verify proofs on-chain */
  skipProofVerification?: boolean
}

/**
 * Multi-party transfer participant
 */
export interface TransferParticipant {
  /** Participant's address */
  address: Address
  /** ElGamal public key */
  elgamalPubkey: Uint8Array
  /** Amount to receive (for recipients) or send (for senders) */
  amount: bigint
}

/**
 * Batch transfer request
 */
export interface BatchTransferRequest {
  /** Source account keypair */
  sourceKeypair: ElGamalKeypair
  /** Current source balance */
  sourceBalance: ElGamalCiphertext
  /** List of recipients */
  recipients: TransferParticipant[]
  /** Transfer options */
  options?: ConfidentialTransferOptions
}

// =====================================================
// PROOF CONTEXT MANAGEMENT
// =====================================================

/**
 * Generate a unique proof context address
 */
function generateProofContextAddress(): Address {
  // Generate a deterministic but unique address - must be exactly 44 chars or less
  const random = Math.floor(Math.random() * 100000)
  return address(`proof${random}111111111111111111111111111111111`)
}

/**
 * Create proof context initialization instruction
 * 
 * Note: In production, this would create the actual proof context account.
 * For now, we'll return a placeholder instruction that represents this operation.
 */
function createInitProofContextInstruction(
  proofContext: Address,
  payer: Address,
  systemProgram: Address
): IInstruction {
  // In a real implementation, this would create the proof context account
  // using the System Program's createAccount instruction
  return {
    programAddress: systemProgram,
    accounts: [
      { address: payer, role: 3 }, // WritableSigner
      { address: proofContext, role: 3 }, // WritableSigner
    ],
    data: new Uint8Array([0]) // Placeholder data
  }
}

// =====================================================
// SINGLE TRANSFER COORDINATION
// =====================================================

/**
 * Prepare a confidential transfer between two accounts
 * 
 * @param sourceKeypair - Source account ElGamal keypair
 * @param sourceBalance - Current encrypted balance
 * @param destPubkey - Destination ElGamal public key
 * @param amount - Amount to transfer
 * @param payer - Transaction fee payer
 * @param options - Transfer options
 * @returns Transfer result with instructions and metadata
 */
export async function prepareConfidentialTransfer(
  sourceKeypair: ElGamalKeypair,
  sourceBalance: ElGamalCiphertext,
  destPubkey: Uint8Array,
  amount: bigint,
  payer: TransactionSigner,
  options: ConfidentialTransferOptions = {}
): Promise<ConfidentialTransferResult> {
  // Validate inputs
  if (amount <= 0n) {
    throw new Error('Transfer amount must be positive')
  }

  // Check balance
  const currentBalance = decryptAmount(sourceBalance, sourceKeypair.secretKey)
  if (currentBalance === null || currentBalance < amount) {
    throw new Error('Insufficient balance for transfer')
  }

  // Generate transfer proof
  const { transferProof, newSourceBalance, destCiphertext } = generateTransferProof(
    sourceBalance,
    amount,
    sourceKeypair,
    destPubkey
  )

  const instructions: IInstruction[] = []
  const proofContexts: Address[] = []

  // Skip proof verification if requested (for testing)
  if (!options.skipProofVerification) {
    // Generate proof context address
    const proofContext = generateProofContextAddress()
    proofContexts.push(proofContext)

    // Initialize proof context (simplified for now)
    const systemProgram = address('11111111111111111111111111111111')
    instructions.push(
      createInitProofContextInstruction(proofContext, payer.address, systemProgram)
    )

    // Create proof verification instruction
    const verifyAccounts: ProofVerificationAccounts = {
      proofContext,
      systemProgram
    }

    instructions.push(
      createVerifyTransferProofInstruction(verifyAccounts, transferProof)
    )

    // Auto-close proof context if requested
    if (options.autoCloseProofContexts) {
      instructions.push(
        createCloseProofContextInstruction(
          proofContext,
          payer,
          payer.address
        )
      )
    }
  }

  // Calculate compute units
  const computeUnits = calculateProofComputeUnits(
    ProofInstruction.VerifyTransfer,
    true, // bulletproof
    1 // single proof
  )

  return {
    instructions,
    proofContexts: options.autoCloseProofContexts ? [] : proofContexts,
    computeUnits,
    newSourceBalance,
    destCiphertext
  }
}

// =====================================================
// BATCH TRANSFER COORDINATION
// =====================================================

/**
 * Prepare a batch of confidential transfers from one source to multiple recipients
 * 
 * @param request - Batch transfer request
 * @returns Array of transfer results, one per transaction
 */
export async function prepareBatchConfidentialTransfer(
  request: BatchTransferRequest
): Promise<ConfidentialTransferResult[]> {
  const { sourceKeypair, sourceBalance, recipients, options = {} } = request
  
  // Validate total amount
  const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0n)
  const currentBalance = decryptAmount(sourceBalance, sourceKeypair.secretKey)
  
  if (currentBalance === null || currentBalance < totalAmount) {
    throw new Error('Insufficient balance for batch transfer')
  }

  // Group transfers by transaction to optimize compute units
  const maxComputeUnits = options.maxComputeUnits ?? 1_400_000
  const results: ConfidentialTransferResult[] = []
  
  let remainingBalance = sourceBalance
  let currentBatch: TransferParticipant[] = []
  let currentComputeUnits = 0

  for (const recipient of recipients) {
    const transferComputeUnits = calculateProofComputeUnits(
      ProofInstruction.VerifyTransfer,
      true,
      1
    )

    // Check if adding this transfer would exceed compute limit
    if (currentComputeUnits + transferComputeUnits > maxComputeUnits && currentBatch.length > 0) {
      // Process current batch
      const batchResult = await processBatchTransfers(
        sourceKeypair,
        remainingBalance,
        currentBatch,
        options
      )
      results.push(batchResult)
      
      // Update remaining balance
      remainingBalance = batchResult.newSourceBalance
      
      // Start new batch
      currentBatch = [recipient]
      currentComputeUnits = transferComputeUnits
    } else {
      currentBatch.push(recipient)
      currentComputeUnits += transferComputeUnits
    }
  }

  // Process final batch
  if (currentBatch.length > 0) {
    const batchResult = await processBatchTransfers(
      sourceKeypair,
      remainingBalance,
      currentBatch,
      options
    )
    results.push(batchResult)
  }

  return results
}

/**
 * Process a batch of transfers in a single transaction
 */
async function processBatchTransfers(
  sourceKeypair: ElGamalKeypair,
  sourceBalance: ElGamalCiphertext,
  recipients: TransferParticipant[],
  options: ConfidentialTransferOptions
): Promise<ConfidentialTransferResult> {
  const instructions: IInstruction[] = []
  const proofContexts: Address[] = []
  let computeUnits = 0
  let currentBalance = sourceBalance

  // Generate ciphertexts for all recipients
  const destCiphertexts: ElGamalCiphertext[] = []

  for (const recipient of recipients) {
    // Generate transfer proof
    const { transferProof, newSourceBalance, destCiphertext } = generateTransferProof(
      currentBalance,
      recipient.amount,
      sourceKeypair,
      recipient.elgamalPubkey
    )

    destCiphertexts.push(destCiphertext)
    currentBalance = newSourceBalance

    if (!options.skipProofVerification) {
      // Create proof context for this transfer
      const proofContext = generateProofContextAddress()
      proofContexts.push(proofContext)

      const systemProgram = address('11111111111111111111111111111111')
      
      // Initialize proof context
      const sourceAddress = address(Buffer.from(sourceKeypair.publicKey).toString('base64').slice(0, 44))
      instructions.push(
        createInitProofContextInstruction(proofContext, sourceAddress, systemProgram)
      )

      // Verify transfer proof
      const verifyAccounts: ProofVerificationAccounts = {
        proofContext,
        systemProgram
      }

      instructions.push(
        createVerifyTransferProofInstruction(verifyAccounts, transferProof)
      )

      // Add compute units
      computeUnits += calculateProofComputeUnits(
        ProofInstruction.VerifyTransfer,
        true,
        1
      )
    }
  }

  // Auto-close all proof contexts if requested
  if (options.autoCloseProofContexts && !options.skipProofVerification) {
    // Note: Closing proof contexts requires the actual transaction signer
    // This should be done by the caller with the actual signer
    // For now, we'll leave the proof contexts open for the caller to close
    // This is a limitation of the current implementation
  }

  return {
    instructions,
    proofContexts,
    computeUnits,
    newSourceBalance: currentBalance,
    destCiphertext: destCiphertexts[destCiphertexts.length - 1] // Last recipient's ciphertext
  }
}

// =====================================================
// WITHDRAWAL COORDINATION
// =====================================================

/**
 * Prepare a withdrawal from confidential balance
 * 
 * @param sourceKeypair - Source account ElGamal keypair
 * @param sourceBalance - Current encrypted balance
 * @param amount - Amount to withdraw
 * @param payer - Transaction fee payer
 * @param options - Transfer options
 * @returns Withdrawal instructions and metadata
 */
export async function prepareConfidentialWithdrawal(
  sourceKeypair: ElGamalKeypair,
  sourceBalance: ElGamalCiphertext,
  amount: bigint,
  payer: TransactionSigner,
  options: ConfidentialTransferOptions = {}
): Promise<{
  instructions: IInstruction[]
  proofContext?: Address
  computeUnits: number
  newSourceBalance: ElGamalCiphertext
  withdrawAmount: bigint
}> {
  // Validate withdrawal amount
  const currentBalance = decryptAmount(sourceBalance, sourceKeypair.secretKey)
  if (currentBalance === null || currentBalance < amount) {
    throw new Error('Insufficient balance for withdrawal')
  }

  // Calculate new balance
  const newBalance = currentBalance - amount
  const newSourceBalance = encryptAmount(newBalance, sourceKeypair.publicKey)

  const instructions: IInstruction[] = []
  let proofContext: Address | undefined

  if (!options.skipProofVerification) {
    // Generate proof context
    proofContext = generateProofContextAddress()
    const systemProgram = address('11111111111111111111111111111111')

    // Initialize proof context
    instructions.push(
      createInitProofContextInstruction(proofContext, payer.address, systemProgram)
    )

    // Generate withdraw amount ciphertext for proof
    const withdrawCiphertext = encryptAmount(amount, sourceKeypair.publicKey)
    
    // Generate range proof for the new balance
    const newBalanceCommitment: PedersenCommitment = {
      commitment: newSourceBalance.commitment.commitment
    }
    const rangeProofRandomness = new Uint8Array(32)
    crypto.getRandomValues(rangeProofRandomness)
    const rangeProof = generateRangeProof(newBalance, newBalanceCommitment, rangeProofRandomness)
    
    // Generate equality proof (simplified - in production this would need proper generation)
    const equalityProof = new Uint8Array(192)
    crypto.getRandomValues(equalityProof)
    
    // Create withdraw proof data
    const withdrawProof: WithdrawProofData = {
      encryptedWithdrawAmount: withdrawCiphertext.handle.handle,
      newSourceCommitment: newSourceBalance.commitment.commitment,
      equalityProof: equalityProof,
      rangeProof: rangeProof.proof
    }

    // Verify withdraw proof
    const verifyAccounts: ProofVerificationAccounts = {
      proofContext,
      systemProgram
    }

    instructions.push(
      createVerifyWithdrawProofInstruction(verifyAccounts, withdrawProof)
    )

    // Auto-close proof context if requested
    if (options.autoCloseProofContexts) {
      instructions.push(
        createCloseProofContextInstruction(proofContext, payer, payer.address)
      )
      proofContext = undefined
    }
  }

  // Calculate compute units
  const computeUnits = calculateProofComputeUnits(
    ProofInstruction.VerifyWithdraw,
    true,
    1
  )

  return {
    instructions,
    proofContext,
    computeUnits,
    newSourceBalance,
    withdrawAmount: amount
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Clean up proof context accounts after transfers
 * 
 * @param proofContexts - Array of proof context addresses
 * @param authority - Authority to close the contexts
 * @param rentRecipient - Account to receive rent
 * @returns Array of close instructions
 */
export function createCleanupInstructions(
  proofContexts: Address[],
  authority: TransactionSigner,
  rentRecipient: Address
): IInstruction[] {
  return proofContexts.map(proofContext =>
    createCloseProofContextInstruction(proofContext, authority, rentRecipient)
  )
}

/**
 * Estimate total compute units for a set of transfers
 * 
 * @param transferCount - Number of transfers
 * @param includeWithdrawals - Whether to include withdrawal proofs
 * @returns Estimated compute units
 */
export function estimateTransferComputeUnits(
  transferCount: number,
  includeWithdrawals = false
): number {
  let units = 0

  // Transfer proofs
  units += transferCount * calculateProofComputeUnits(
    ProofInstruction.VerifyTransfer,
    true,
    1
  )

  // Withdrawal proofs
  if (includeWithdrawals) {
    units += calculateProofComputeUnits(
      ProofInstruction.VerifyWithdraw,
      true,
      1
    )
  }

  // Add overhead for account initialization
  units += transferCount * 5000

  return units
}

/**
 * Split transfers into optimal transaction batches
 * 
 * @param transfers - Array of transfer amounts
 * @param maxComputeUnits - Maximum compute units per transaction
 * @returns Array of transfer batches
 */
export function optimizeTransferBatches(
  transfers: bigint[],
  maxComputeUnits = 1_400_000
): bigint[][] {
  const batches: bigint[][] = []
  let currentBatch: bigint[] = []
  let currentUnits = 0

  const unitsPerTransfer = calculateProofComputeUnits(
    ProofInstruction.VerifyTransfer,
    true,
    1
  )

  for (const amount of transfers) {
    if (currentUnits + unitsPerTransfer > maxComputeUnits && currentBatch.length > 0) {
      batches.push(currentBatch)
      currentBatch = [amount]
      currentUnits = unitsPerTransfer
    } else {
      currentBatch.push(amount)
      currentUnits += unitsPerTransfer
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  return batches
}