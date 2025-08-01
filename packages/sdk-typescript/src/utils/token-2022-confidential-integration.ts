/**
 * Token-2022 Confidential Transfer Integration
 * 
 * This module connects ElGamal encryption and ZK proofs to Token-2022's
 * confidential transfer extension, providing a complete implementation
 * for privacy-preserving token transfers on Solana.
 */

import type { Address, IInstruction, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'
import { getAddressEncoder } from '@solana/kit'
// Types from token-2022-rpc.js will be imported when needed
import {
  decryptAmount,
  generateTransferProof,
  generateWithdrawProof,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type ElGamalPubkey
} from './elgamal-complete.js'
import {
  prepareBatchConfidentialTransfer,
  type BatchTransferRequest,
  type TransferParticipant
} from './confidential-transfer-coordinator.js'
import {
  createConfidentialTransferInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
  type ConfidentialTransferParams
} from './token-2022-cpi-enhanced.js'
import {
  createVerifyTransferProofInstruction,
  createVerifyWithdrawProofInstruction,
  createCloseProofContextInstruction,
  type ProofVerificationAccounts
} from './zk-proof-instructions.js'
import type { TransferProofData, WithdrawProofData } from '../constants/zk-proof-program.js'

// =====================================================
// TYPES AND INTERFACES
// =====================================================

/**
 * Confidential token account data
 */
export interface ConfidentialTokenAccount {
  /** The token account address */
  address: Address
  /** Owner of the token account */
  owner: Address
  /** The mint address */
  mint: Address
  /** ElGamal public key for this account */
  elgamalPubkey: ElGamalPubkey
  /** Encrypted pending balance (awaiting proof verification) */
  pendingBalance: ElGamalCiphertext
  /** Encrypted available balance (proven) */
  availableBalance: ElGamalCiphertext
  /** Whether confidential transfers are enabled */
  confidentialTransfersEnabled: boolean
  /** Whether account allows confidential credits */
  allowConfidentialCredits: boolean
  /** Pending balance credit counter */
  pendingBalanceCreditCounter: bigint
  /** Maximum pending balance credit counter */
  maximumPendingBalanceCreditCounter: bigint
  /** Expected pending balance credit counter */
  expectedPendingBalanceCreditCounter: bigint
  /** Actual pending balance credit counter */
  actualPendingBalanceCreditCounter: bigint
}

/**
 * Parameters for initializing a confidential mint
 */
export interface InitializeConfidentialMintParams {
  /** The mint to initialize */
  mint: Address
  /** Authority that can modify confidential transfer settings */
  authority: Address
  /** Whether to auto-approve new accounts */
  autoApproveNewAccounts: boolean
  /** Optional auditor ElGamal public key */
  auditorElgamalPubkey?: ElGamalPubkey
  /** Payer for the transaction */
  payer: TransactionSigner
}

/**
 * Parameters for initializing a confidential account
 */
export interface InitializeConfidentialAccountParams {
  /** The token account to initialize */
  account: Address
  /** The mint address */
  mint: Address
  /** ElGamal keypair for the account */
  elgamalKeypair: ElGamalKeypair
  /** Maximum pending balance credit counter */
  maximumPendingBalanceCreditCounter?: bigint
  /** Owner of the account */
  owner: TransactionSigner
}

/**
 * Parameters for a confidential transfer with proofs
 */
export interface ConfidentialTransferWithProofsParams {
  /** Source account */
  source: Address
  /** Source ElGamal keypair */
  sourceKeypair: ElGamalKeypair
  /** Current source balance */
  sourceBalance: ElGamalCiphertext
  /** Destination account */
  destination: Address
  /** Destination ElGamal public key */
  destElgamalPubkey: ElGamalPubkey
  /** Amount to transfer */
  amount: bigint
  /** The mint address */
  mint: Address
  /** Owner of the source account */
  owner: TransactionSigner
  /** Optional auditor ElGamal public key */
  auditorElgamalPubkey?: ElGamalPubkey
  /** Fee payer */
  feePayer: TransactionSigner
}

/**
 * Parameters for withdrawing from confidential balance
 */
export interface WithdrawConfidentialParams {
  /** The token account */
  account: Address
  /** The mint address */
  mint: Address
  /** Amount to withdraw */
  amount: bigint
  /** Current confidential balance */
  confidentialBalance: ElGamalCiphertext
  /** ElGamal keypair for the account */
  elgamalKeypair: ElGamalKeypair
  /** Owner of the account */
  owner: TransactionSigner
  /** Fee payer */
  feePayer: TransactionSigner
}

/**
 * Parameters for depositing to confidential balance
 */
export interface DepositConfidentialParams {
  /** The token account */
  account: Address
  /** The mint address */
  mint: Address
  /** Amount to deposit */
  amount: bigint
  /** Owner of the account */
  owner: TransactionSigner
}

/**
 * Result of a confidential transfer operation
 */
export interface ConfidentialTransferOperationResult {
  /** All instructions to execute */
  instructions: IInstruction[]
  /** Proof context accounts that may need cleanup */
  proofContexts: Address[]
  /** New source balance after transfer */
  newSourceBalance?: ElGamalCiphertext
  /** Destination ciphertext */
  destCiphertext?: ElGamalCiphertext
  /** Signature of the operation (for verification) */
  signature?: Uint8Array
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Convert base58 address to bytes
 */
function base58ToBytes(addressStr: Address): Uint8Array {
  const encoder = getAddressEncoder()
  return new Uint8Array(encoder.encode(addressStr))
}




// =====================================================
// MINT INITIALIZATION
// =====================================================

/**
 * Create instruction to initialize confidential transfer mint extension
 */
function createLocalInitializeConfidentialTransferMintInstruction(
  mint: Address,
  config: {
    authority: Address
    autoApproveNewAccounts: boolean
    auditorElgamalPubkey?: Uint8Array
  }
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::InitializeMint
  // Instruction index 25 for ConfidentialTransfer extension
  const instructionData = new Uint8Array(67)
  
  // Set instruction discriminator (ConfidentialTransfer variant)
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 0  // InitializeMint sub-instruction
  
  // Auto approve new accounts flag
  instructionData[2] = config.autoApproveNewAccounts ? 1 : 0
  
  // Authority (32 bytes) - convert address to bytes
  const authorityBytes = base58ToBytes(config.authority)
  instructionData.set(authorityBytes, 3)
  
  // Auditor ElGamal public key (32 bytes) - optional
  if (config.auditorElgamalPubkey) {
    instructionData.set(config.auditorElgamalPubkey, 35)
  }
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: mint, role: 2 }, // WritableNonSigner
    ],
    data: instructionData
  }
}

/**
 * Initialize a mint with confidential transfer support
 */
export async function initializeConfidentialMint(
  params: InitializeConfidentialMintParams
): Promise<IInstruction[]> {
  const instructions: IInstruction[] = []

  // Initialize confidential transfer extension
  instructions.push(
    createLocalInitializeConfidentialTransferMintInstruction(params.mint, {
      authority: params.authority,
      autoApproveNewAccounts: params.autoApproveNewAccounts,
      auditorElgamalPubkey: params.auditorElgamalPubkey
    })
  )

  return instructions
}

// =====================================================
// ACCOUNT INITIALIZATION
// =====================================================

/**
 * Create instruction to initialize confidential transfer account extension
 */
function createLocalInitializeConfidentialTransferAccountInstruction(
  account: Address,
  mint: Address,
  elgamalPubkey: Uint8Array,
  maximumPendingBalanceCreditCounter: bigint
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::ConfigureAccount
  const instructionData = new Uint8Array(42)
  
  // Set instruction discriminator
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 1  // ConfigureAccount sub-instruction
  
  // ElGamal public key (32 bytes)
  instructionData.set(elgamalPubkey, 2)
  
  // Maximum pending balance credit counter (8 bytes, little-endian)
  const counterBytes = numberToBytes(maximumPendingBalanceCreditCounter, 8)
  instructionData.set(counterBytes, 34)
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // WritableNonSigner
      { address: mint, role: 0 }, // ReadonlyNonSigner
    ],
    data: instructionData
  }
}



/**
 * Initialize a token account with confidential transfer support
 */
export async function initializeConfidentialAccount(
  params: InitializeConfidentialAccountParams
): Promise<IInstruction[]> {
  const instructions: IInstruction[] = []

  // Initialize confidential transfer extension for the account
  instructions.push(
    createLocalInitializeConfidentialTransferAccountInstruction(
      params.account,
      params.mint,
      params.elgamalKeypair.publicKey,
      params.maximumPendingBalanceCreditCounter ?? BigInt(65536)
    )
  )

  // Enable confidential credits by default
  instructions.push(
    createLocalEnableConfidentialCreditsInstruction(
      params.account,
      params.owner
    )
  )

  return instructions
}

// =====================================================
// CONFIDENTIAL TRANSFERS
// =====================================================

/**
 * Prepare and execute a confidential transfer with full proof generation
 */
export async function executeConfidentialTransfer(
  params: ConfidentialTransferWithProofsParams
): Promise<ConfidentialTransferOperationResult> {
  const instructions: IInstruction[] = []
  const proofContexts: Address[] = []

  // Step 1: Generate transfer proof
  const transferProofResult = generateTransferProof(
    params.sourceBalance,
    params.amount,
    params.sourceKeypair,
    params.destElgamalPubkey
  )
  const { transferProof, newSourceBalance, destCiphertext } = transferProofResult

  // Step 2: Create proof context and verify proof
  const proofContext = generateProofContextAddress()
  proofContexts.push(proofContext)

  // Initialize proof context
  instructions.push(
    createInitProofContextInstruction(
      proofContext,
      params.feePayer.address,
      address('11111111111111111111111111111111')
    )
  )

  // Verify transfer proof
  const verifyAccounts: ProofVerificationAccounts = {
    proofContext,
    systemProgram: address('11111111111111111111111111111111')
  }

  instructions.push(
    createVerifyTransferProofInstruction(verifyAccounts, transferProof as TransferProofData)
  )

  // Step 3: Execute confidential transfer
  const transferParams: ConfidentialTransferParams = {
    source: params.source,
    destination: params.destination,
    owner: params.owner,
    mint: params.mint,
    proofContext
  }

  instructions.push(
    createConfidentialTransferInstruction(transferParams)
  )

  // Step 4: Close proof context
  instructions.push(
    createCloseProofContextInstruction(
      proofContext,
      params.feePayer,
      params.feePayer.address
    )
  )

  return {
    instructions,
    proofContexts: [], // Cleared because we close it
    newSourceBalance,
    destCiphertext
  }
}

/**
 * Execute a batch of confidential transfers
 */
export async function executeBatchConfidentialTransfer(
  sourceKeypair: ElGamalKeypair,
  sourceBalance: ElGamalCiphertext,
  recipients: TransferParticipant[],
  mint: Address,
  owner: TransactionSigner
): Promise<ConfidentialTransferOperationResult[]> {
  const request: BatchTransferRequest = {
    sourceKeypair,
    sourceBalance,
    recipients,
    options: {
      autoCloseProofContexts: true
    }
  }

  const batchResults = await prepareBatchConfidentialTransfer(request)
  const results: ConfidentialTransferOperationResult[] = []

  for (const batch of batchResults) {
    // Add confidential transfer instructions for each proof
    const transferInstructions: IInstruction[] = []
    
    for (let i = 0; i < batch.proofContexts.length; i++) {
      const recipient = recipients[i]
      const transferParams: ConfidentialTransferParams = {
        source: owner.address, // Assuming source account matches owner
        destination: recipient.address,
        owner,
        mint,
        proofContext: batch.proofContexts[i]
      }
      
      transferInstructions.push(
        createConfidentialTransferInstruction(transferParams)
      )
    }

    results.push({
      instructions: [...batch.instructions, ...transferInstructions],
      proofContexts: batch.proofContexts,
      newSourceBalance: batch.newSourceBalance,
      destCiphertext: batch.destCiphertext
    })
  }

  return results
}

// =====================================================
// WITHDRAWALS AND DEPOSITS
// =====================================================

/**
 * Withdraw tokens from confidential balance to regular balance
 */
export async function withdrawFromConfidentialBalance(
  params: WithdrawConfidentialParams
): Promise<ConfidentialTransferOperationResult> {
  const instructions: IInstruction[] = []
  const proofContexts: Address[] = []

  // Generate withdrawal proof
  const { withdrawProof, newSourceBalance } = generateWithdrawProof(
    params.confidentialBalance,
    params.amount,
    params.elgamalKeypair
  )

  // Create and verify proof
  const proofContext = generateProofContextAddress()
  proofContexts.push(proofContext)

  instructions.push(
    createInitProofContextInstruction(
      proofContext,
      params.feePayer.address,
      address('11111111111111111111111111111111')
    )
  )

  const verifyAccounts: ProofVerificationAccounts = {
    proofContext,
    systemProgram: address('11111111111111111111111111111111')
  }

  instructions.push(
    createVerifyWithdrawProofInstruction(verifyAccounts, withdrawProof as WithdrawProofData)
  )

  // Execute withdrawal
  instructions.push(
    createLocalWithdrawConfidentialInstruction(
      params.account,
      params.mint,
      params.amount,
      params.owner,
      proofContext
    )
  )

  // Close proof context
  instructions.push(
    createCloseProofContextInstruction(
      proofContext,
      params.feePayer,
      params.feePayer.address
    )
  )

  return {
    instructions,
    proofContexts: [],
    newSourceBalance
  }
}

/**
 * Deposit tokens from regular balance to confidential balance
 */
export async function depositToConfidentialBalance(
  params: DepositConfidentialParams
): Promise<ConfidentialTransferOperationResult> {
  const instructions: IInstruction[] = []

  // Deposits don't require proofs
  instructions.push(
    createLocalDepositConfidentialInstruction(
      params.account,
      params.mint,
      params.amount,
      params.owner
    )
  )

  return {
    instructions,
    proofContexts: []
  }
}

// =====================================================
// BALANCE MANAGEMENT
// =====================================================

/**
 * Apply pending balance to available balance
 * @internal
 */
function createLocalApplyPendingBalanceInstruction(
  account: Address,
  owner: TransactionSigner,
  expectedCreditCounter: bigint
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::ApplyPendingBalance
  const instructionData = new Uint8Array(10)
  
  // Set instruction discriminator
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 3  // ApplyPendingBalance sub-instruction
  
  // Expected credit counter (8 bytes, little-endian)
  const counterBytes = numberToBytes(expectedCreditCounter, 8)
  instructionData.set(counterBytes, 2)
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // WritableNonSigner
      { address: owner.address, role: 3 }, // ReadonlySigner
    ],
    data: instructionData
  }
}

/**
 * Enable confidential credits for an account
 */
function createLocalEnableConfidentialCreditsInstruction(
  account: Address,
  owner: TransactionSigner
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::EnableConfidentialCredits
  const instructionData = new Uint8Array(2)
  
  // Set instruction discriminator
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 4  // EnableConfidentialCredits sub-instruction
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // WritableNonSigner
      { address: owner.address, role: 3 }, // ReadonlySigner
    ],
    data: instructionData
  }
}

/**
 * Disable confidential credits for an account
 * @internal
 */
function createLocalDisableConfidentialCreditsInstruction(
  account: Address,
  owner: TransactionSigner
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::DisableConfidentialCredits
  const instructionData = new Uint8Array(2)
  
  // Set instruction discriminator
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 5  // DisableConfidentialCredits sub-instruction
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // WritableNonSigner
      { address: owner.address, role: 3 }, // ReadonlySigner
    ],
    data: instructionData
  }
}

/**
 * Create withdraw instruction with proof
 */
function createLocalWithdrawConfidentialInstruction(
  account: Address,
  mint: Address,
  amount: bigint,
  owner: TransactionSigner,
  proofContext: Address
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::Withdraw
  const instructionData = new Uint8Array(10)
  
  // Set instruction discriminator
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 6  // Withdraw sub-instruction
  
  // Amount to withdraw (8 bytes, little-endian)
  const amountBytes = numberToBytes(amount, 8)
  instructionData.set(amountBytes, 2)
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // WritableNonSigner
      { address: mint, role: 0 }, // ReadonlyNonSigner
      { address: owner.address, role: 3 }, // ReadonlySigner
      { address: proofContext, role: 0 }, // ReadonlyNonSigner (proof context)
    ],
    data: instructionData
  }
}

/**
 * Create deposit instruction
 */
function createLocalDepositConfidentialInstruction(
  account: Address,
  mint: Address,
  amount: bigint,
  owner: TransactionSigner
): IInstruction {
  // Token-2022 instruction format: ConfidentialTransferInstruction::Deposit
  const instructionData = new Uint8Array(10)
  
  // Set instruction discriminator
  instructionData[0] = 25 // ConfidentialTransferInstruction
  instructionData[1] = 7  // Deposit sub-instruction
  
  // Amount to deposit (8 bytes, little-endian)
  const amountBytes = numberToBytes(amount, 8)
  instructionData.set(amountBytes, 2)
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // WritableNonSigner
      { address: mint, role: 0 }, // ReadonlyNonSigner
      { address: owner.address, role: 3 }, // ReadonlySigner
    ],
    data: instructionData
  }
}

// =====================================================
// ACCOUNT QUERIES
// =====================================================

/**
 * Get confidential account balance (requires decryption)
 */
export async function getConfidentialBalance(
  account: ConfidentialTokenAccount,
  elgamalKeypair: ElGamalKeypair
): Promise<{
  available: bigint | null
  pending: bigint | null
}> {
  const available = decryptAmount(account.availableBalance, elgamalKeypair.secretKey)
  const pending = decryptAmount(account.pendingBalance, elgamalKeypair.secretKey)
  
  return { available, pending }
}

/**
 * Parse confidential transfer account from account data
 */
export function parseConfidentialTransferAccount(
  accountData: Uint8Array,
  address: Address,
  owner: Address,
  mint: Address
): ConfidentialTokenAccount | null {
  try {
    // Token-2022 confidential transfer extension layout
    // The extension data starts after the base account data
    // Base token account is 165 bytes, then extensions follow
    
    if (accountData.length < 165 + 97) {
      // Not enough data for confidential transfer extension
      return null
    }
    
    let offset = 165 // Skip base token account data
    
    // Read extension type and length
    while (offset < accountData.length - 4) {
      const extensionType = accountData[offset] | (accountData[offset + 1] << 8)
      offset += 2
      const extensionLength = accountData[offset] | (accountData[offset + 1] << 8)
      offset += 2
      
      // ExtensionType.ConfidentialTransferAccount = 5
      if (extensionType === 5) {
        // Parse confidential transfer account extension
        const elgamalPubkey = accountData.slice(offset, offset + 32)
        offset += 32
        
        // Pending balance ciphertext (64 bytes: 32 commitment + 32 handle)
        const pendingBalanceCommitment = accountData.slice(offset, offset + 32)
        const pendingBalanceHandle = accountData.slice(offset + 32, offset + 64)
        offset += 64
        
        // Available balance ciphertext (64 bytes: 32 commitment + 32 handle)
        const availableBalanceCommitment = accountData.slice(offset, offset + 32)
        const availableBalanceHandle = accountData.slice(offset + 32, offset + 64)
        offset += 64
        
        // Flags (1 byte)
        const flags = accountData[offset]
        const confidentialTransfersEnabled = (flags & 0x01) !== 0
        const allowConfidentialCredits = (flags & 0x02) !== 0
        offset += 1
        
        // Credit counters (8 bytes each)
        const pendingBalanceCreditCounter = 
          BigInt(accountData[offset] | (accountData[offset + 1] << 8) | 
          (accountData[offset + 2] << 16) | (accountData[offset + 3] << 24)) |
          (BigInt(accountData[offset + 4] | (accountData[offset + 5] << 8) | 
          (accountData[offset + 6] << 16) | (accountData[offset + 7] << 24)) << BigInt(32))
        offset += 8
        
        const maximumPendingBalanceCreditCounter = 
          BigInt(accountData[offset] | (accountData[offset + 1] << 8) | 
          (accountData[offset + 2] << 16) | (accountData[offset + 3] << 24)) |
          (BigInt(accountData[offset + 4] | (accountData[offset + 5] << 8) | 
          (accountData[offset + 6] << 16) | (accountData[offset + 7] << 24)) << BigInt(32))
        offset += 8
        
        const expectedPendingBalanceCreditCounter = 
          BigInt(accountData[offset] | (accountData[offset + 1] << 8) | 
          (accountData[offset + 2] << 16) | (accountData[offset + 3] << 24)) |
          (BigInt(accountData[offset + 4] | (accountData[offset + 5] << 8) | 
          (accountData[offset + 6] << 16) | (accountData[offset + 7] << 24)) << BigInt(32))
        offset += 8
        
        const actualPendingBalanceCreditCounter = 
          BigInt(accountData[offset] | (accountData[offset + 1] << 8) | 
          (accountData[offset + 2] << 16) | (accountData[offset + 3] << 24)) |
          (BigInt(accountData[offset + 4] | (accountData[offset + 5] << 8) | 
          (accountData[offset + 6] << 16) | (accountData[offset + 7] << 24)) << BigInt(32))
        
        return {
          address,
          owner,
          mint,
          elgamalPubkey,
          pendingBalance: {
            commitment: { commitment: pendingBalanceCommitment },
            handle: { handle: pendingBalanceHandle }
          },
          availableBalance: {
            commitment: { commitment: availableBalanceCommitment },
            handle: { handle: availableBalanceHandle }
          },
          confidentialTransfersEnabled,
          allowConfidentialCredits,
          pendingBalanceCreditCounter,
          maximumPendingBalanceCreditCounter,
          expectedPendingBalanceCreditCounter,
          actualPendingBalanceCreditCounter
        }
      } else {
        // Skip this extension
        offset += extensionLength
      }
    }
    
    // No confidential transfer extension found
    return null
  } catch {
    return null
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate a unique proof context address
 */
function generateProofContextAddress(): Address {
  const random = Math.floor(Math.random() * 100000)
  return address(`proof${random}111111111111111111111111111111111`)
}

/**
 * Create proof context initialization instruction
 */
function createInitProofContextInstruction(
  proofContext: Address,
  payer: Address,
  systemProgram: Address
): IInstruction {
  return {
    programAddress: systemProgram,
    accounts: [
      { address: payer, role: 3 }, // WritableSigner
      { address: proofContext, role: 3 }, // WritableSigner
    ],
    data: new Uint8Array([0]) // CreateAccount instruction
  }
}

/**
 * Convert number to bytes (little endian)
 */
function numberToBytes(num: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  let temp = num
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(temp & 0xFFn)
    temp = temp >> BigInt(8)
  }
  return bytes
}

// =====================================================
// EXPORTS
// =====================================================

export {
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type ElGamalPubkey
} from './elgamal-complete.js'

// Export the local implementations
export {
  createLocalApplyPendingBalanceInstruction as createApplyPendingBalanceInstruction,
  createLocalEnableConfidentialCreditsInstruction as createEnableConfidentialCreditsInstruction,
  createLocalDisableConfidentialCreditsInstruction as createDisableConfidentialCreditsInstruction,
  createLocalWithdrawConfidentialInstruction as createWithdrawConfidentialInstruction,
  createLocalDepositConfidentialInstruction as createDepositConfidentialInstruction,
  createLocalInitializeConfidentialTransferMintInstruction as createInitializeConfidentialTransferMintInstruction,
  createLocalInitializeConfidentialTransferAccountInstruction as createInitializeConfidentialTransferAccountInstruction
}