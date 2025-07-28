/**
 * Confidential Transfer Manager
 * 
 * High-level interface for managing confidential transfers with Token-2022.
 * Handles proof generation, account configuration, and transfer operations
 * with proper fallback behavior while the ZK program is disabled.
 */

import type { Address, IInstruction, TransactionSigner } from '@solana/kit'
import { getStructEncoder, getU8Encoder, getU64Encoder, getBytesEncoder, fixEncoderSize } from '@solana/kit'
import type { Connection } from '@solana/web3.js'

import {
  generateElGamalKeypair,
  encryptAmount,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type ElGamalPubkey
} from './elgamal.js'

import {
  generateRangeProofWithCommitment,
  generateTransferProofWithInstruction,
  isZkProgramAvailable,
  getZkProgramStatus,
  ProofMode,
  type ProofGenerationResult
} from './zk-proof-builder.js'

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  EXTENSION_INSTRUCTIONS
} from './token-2022-spl-integration.js'

import { randomBytes } from '@noble/curves/abstract/utils'

// =====================================================
// TYPES
// =====================================================

export interface ConfidentialAccount {
  /** The account address */
  address: Address
  /** The mint address */
  mint: Address
  /** ElGamal public key for this account */
  elgamalPubkey: ElGamalPubkey
  /** Current encrypted balance */
  encryptedBalance: ElGamalCiphertext
  /** Decryptable available balance */
  decryptableAvailableBalance: bigint
  /** Maximum pending balance credit counter */
  maxPendingBalanceCredits: bigint
  /** Whether the account is configured for confidential transfers */
  configured: boolean
}

export interface ConfidentialTransferConfig {
  /** The mint to configure */
  mint: Address
  /** Authority for confidential transfers */
  authority: TransactionSigner
  /** Whether to auto-approve new accounts */
  autoApproveNewAccounts: boolean
  /** Optional auditor ElGamal public key */
  auditorElgamalPubkey?: ElGamalPubkey
}

export interface ConfigureAccountParams {
  /** The token account to configure */
  account: Address
  /** The mint address */
  mint: Address
  /** The account's ElGamal keypair */
  elgamalKeypair: ElGamalKeypair
  /** Initial decryptable balance (usually 0) */
  decryptableZeroBalance: bigint
  /** Maximum pending balance credit counter */
  maxPendingBalanceCredits: bigint
  /** Account owner/authority */
  authority: TransactionSigner
  /** Proof mode */
  proofMode?: ProofMode
}

export interface DepositParams {
  /** The account to deposit to */
  account: Address
  /** The mint address */
  mint: Address
  /** Amount to deposit (in token units) */
  amount: bigint
  /** Token decimals */
  decimals: number
  /** Account authority */
  authority: TransactionSigner
  /** Proof mode */
  proofMode?: ProofMode
}

export interface WithdrawParams {
  /** The account to withdraw from */
  account: Address
  /** The mint address */
  mint: Address
  /** Amount to withdraw (in token units) */
  amount: bigint
  /** Token decimals */
  decimals: number
  /** ElGamal secret key for decryption */
  elgamalSecretKey: Uint8Array
  /** New decryptable available balance after withdrawal */
  newDecryptableBalance: bigint
  /** Account authority */
  authority: TransactionSigner
  /** Proof mode */
  proofMode?: ProofMode
}

export interface TransferParams {
  /** Source account */
  source: Address
  /** Destination account */
  destination: Address
  /** The mint address */
  mint: Address
  /** Transfer amount */
  amount: bigint
  /** Source ElGamal keypair */
  sourceKeypair: ElGamalKeypair
  /** Destination ElGamal public key */
  destElgamalPubkey: ElGamalPubkey
  /** New source decryptable balance */
  newSourceDecryptableBalance: bigint
  /** Transfer authority */
  authority: TransactionSigner
  /** Proof mode */
  proofMode?: ProofMode
}

// =====================================================
// MAIN CLASS
// =====================================================

export class ConfidentialTransferManager {
  constructor(
    private connection: Connection,
    private defaultProofMode: ProofMode = ProofMode.ZK_PROGRAM_WITH_FALLBACK
  ) {}

  /**
   * Get the current status of the ZK program
   */
  getZkProgramStatus(): string {
    return getZkProgramStatus()
  }

  /**
   * Check if ZK program is available
   */
  isZkProgramAvailable(): boolean {
    return isZkProgramAvailable()
  }

  /**
   * Generate a new ElGamal keypair for an account
   */
  generateKeypair(): ElGamalKeypair {
    return generateElGamalKeypair()
  }

  /**
   * Configure a mint for confidential transfers
   */
  createConfigureMintInstruction(config: ConfidentialTransferConfig): IInstruction {
    const instructionType = EXTENSION_INSTRUCTIONS.ConfidentialTransfer.InitializeConfidentialTransferMint
    
    // Encode instruction data
    const encoder = getStructEncoder([
      ['instruction', getU8Encoder()],
      ['autoApproveNewAccounts', getU8Encoder()],
      ['auditorElgamalPubkey', fixEncoderSize(getBytesEncoder(), 32)]
    ])

    const data = encoder.encode({
      instruction: instructionType,
      autoApproveNewAccounts: config.autoApproveNewAccounts ? 1 : 0,
      auditorElgamalPubkey: config.auditorElgamalPubkey ?? new Uint8Array(32)
    })

    return {
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      accounts: [
        { address: config.mint, role: 2 }, // Writable
        { address: config.authority.address, role: 3 } // Signer
      ],
      data
    }
  }

  /**
   * Configure an account for confidential transfers
   */
  async createConfigureAccountInstructions(params: ConfigureAccountParams): Promise<{
    instructions: IInstruction[]
    proofInstructions: IInstruction[]
    warnings: string[]
  }> {
    const warnings: string[] = []
    const proofInstructions: IInstruction[] = []
    const instructions: IInstruction[] = []

    // Generate zero-balance proof
    const zeroProof = await this.generateZeroBalanceProof(
      params.elgamalKeypair.publicKey,
      params.proofMode ?? this.defaultProofMode
    )

    if (zeroProof.requiresZkProgram && !isZkProgramAvailable()) {
      warnings.push(getZkProgramStatus())
    }

    if (zeroProof.instruction) {
      proofInstructions.push(zeroProof.instruction)
    }

    // Create configure account instruction
    const instructionType = EXTENSION_INSTRUCTIONS.ConfidentialTransfer.ConfigureAccount
    
    const encoder = getStructEncoder([
      ['instruction', getU8Encoder()],
      ['elgamalPubkey', fixEncoderSize(getBytesEncoder(), 32)],
      ['decryptableZeroBalance', fixEncoderSize(getBytesEncoder(), 64)],
      ['maxPendingBalanceCredits', getU64Encoder()],
      ['proofInstructionOffset', getU8Encoder()]
    ])

    const encryptedZero = encryptAmount(0n, params.elgamalKeypair.publicKey)
    const data = encoder.encode({
      instruction: instructionType,
      elgamalPubkey: params.elgamalKeypair.publicKey,
      decryptableZeroBalance: serializeCiphertext(encryptedZero),
      maxPendingBalanceCredits: params.maxPendingBalanceCredits,
      proofInstructionOffset: proofInstructions.length
    })

    instructions.push({
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      accounts: [
        { address: params.account, role: 2 }, // Writable
        { address: params.mint, role: 0 }, // Readonly
        { address: params.authority.address, role: 3 } // Signer
      ],
      data
    })

    return { instructions, proofInstructions, warnings }
  }

  /**
   * Create deposit instructions
   */
  async createDepositInstructions(params: DepositParams): Promise<{
    instructions: IInstruction[]
    proofInstructions: IInstruction[]
    encryptedAmount: ElGamalCiphertext
    warnings: string[]
  }> {
    const warnings: string[] = []
    const proofInstructions: IInstruction[] = []
    const instructions: IInstruction[] = []

    // Get account ElGamal pubkey (would be fetched from account in practice)
    const accountPubkey = await this.getAccountElGamalPubkey(params.account)
    
    // Encrypt the deposit amount
    const encryptedAmount = encryptAmount(params.amount, accountPubkey)
    
    // Generate range proof
    const randomness = randomBytes(32)
    randomness[0] &= 248
    randomness[31] &= 127
    randomness[31] |= 64
    
    const rangeProof = generateRangeProofWithCommitment(
      params.amount,
      randomness,
      params.proofMode ?? this.defaultProofMode
    )

    if (rangeProof.requiresZkProgram && !isZkProgramAvailable()) {
      warnings.push(getZkProgramStatus())
    }

    if (rangeProof.instruction) {
      proofInstructions.push(rangeProof.instruction)
    }

    // Create deposit instruction
    const instructionType = EXTENSION_INSTRUCTIONS.ConfidentialTransfer.Deposit
    
    const encoder = getStructEncoder([
      ['instruction', getU8Encoder()],
      ['amount', getU64Encoder()],
      ['decimals', getU8Encoder()],
      ['proofInstructionOffset', getU8Encoder()]
    ])

    const data = encoder.encode({
      instruction: instructionType,
      amount: params.amount,
      decimals: params.decimals,
      proofInstructionOffset: proofInstructions.length
    })

    instructions.push({
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      accounts: [
        { address: params.account, role: 2 }, // Writable source
        { address: params.mint, role: 0 }, // Readonly
        { address: params.authority.address, role: 3 } // Signer
      ],
      data
    })

    return { instructions, proofInstructions, encryptedAmount, warnings }
  }

  /**
   * Create transfer instructions
   */
  async createTransferInstructions(params: TransferParams): Promise<{
    instructions: IInstruction[]
    proofInstructions: IInstruction[]
    newSourceBalance: ElGamalCiphertext
    destCiphertext: ElGamalCiphertext
    warnings: string[]
  }> {
    const warnings: string[] = []
    const proofInstructions: IInstruction[] = []
    const instructions: IInstruction[] = []

    // Get current source balance (would be fetched in practice)
    const sourceBalance = await this.getEncryptedBalance(params.source)
    
    // Generate transfer proof
    const transferProof = generateTransferProofWithInstruction(
      sourceBalance,
      params.amount,
      params.sourceKeypair.publicKey,
      params.destElgamalPubkey,
      params.sourceKeypair.secretKey,
      params.proofMode ?? this.defaultProofMode
    )

    if (transferProof.requiresZkProgram && !isZkProgramAvailable()) {
      warnings.push(getZkProgramStatus())
    }

    if (transferProof.instruction) {
      proofInstructions.push(transferProof.instruction)
    }

    // Create transfer instruction
    const instructionType = EXTENSION_INSTRUCTIONS.ConfidentialTransfer.Transfer
    
    const encoder = getStructEncoder([
      ['instruction', getU8Encoder()],
      ['newSourceDecryptableBalance', fixEncoderSize(getBytesEncoder(), 64)],
      ['proofInstructionOffset', getU8Encoder()]
    ])

    const encryptedNewBalance = encryptAmount(
      params.newSourceDecryptableBalance,
      params.sourceKeypair.publicKey
    )

    const data = encoder.encode({
      instruction: instructionType,
      newSourceDecryptableBalance: serializeCiphertext(encryptedNewBalance),
      proofInstructionOffset: proofInstructions.length
    })

    instructions.push({
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      accounts: [
        { address: params.source, role: 2 }, // Writable source
        { address: params.destination, role: 2 }, // Writable destination
        { address: params.mint, role: 0 }, // Readonly
        { address: params.authority.address, role: 3 } // Signer
      ],
      data
    })

    return {
      instructions,
      proofInstructions,
      newSourceBalance: transferProof.newSourceBalance,
      destCiphertext: transferProof.destCiphertext,
      warnings
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Generate a zero-balance proof for account configuration
   */
  private async generateZeroBalanceProof(
    pubkey: ElGamalPubkey,
    mode: ProofMode
  ): Promise<ProofGenerationResult> {
    const zeroAmount = 0n
    const randomness = randomBytes(32)
    randomness[0] &= 248
    randomness[31] &= 127
    randomness[31] |= 64

    return generateRangeProofWithCommitment(zeroAmount, randomness, mode)
  }

  /**
   * Get account's ElGamal public key (placeholder)
   */
  private async getAccountElGamalPubkey(_account: Address): Promise<ElGamalPubkey> {
    // In practice, this would fetch from the account data
    // For now, return a dummy key
    return new Uint8Array(32)
  }

  /**
   * Get encrypted balance (placeholder)
   */
  private async getEncryptedBalance(_account: Address): Promise<ElGamalCiphertext> {
    // In practice, this would fetch from the account data
    // For now, return a dummy ciphertext
    const dummyBalance = encryptAmount(1000n, new Uint8Array(32))
    return dummyBalance
  }

  /**
   * Serialize ciphertext for instruction data
   */
  private serializeCiphertext(ciphertext: ElGamalCiphertext): Uint8Array {
    const serialized = new Uint8Array(64)
    serialized.set(ciphertext.commitment.commitment, 0)
    serialized.set(ciphertext.handle.handle, 32)
    return serialized
  }
}

/**
 * Convenience function to serialize ciphertext
 */
function serializeCiphertext(ciphertext: ElGamalCiphertext): Uint8Array {
  const serialized = new Uint8Array(64)
  serialized.set(ciphertext.commitment.commitment, 0)
  serialized.set(ciphertext.handle.handle, 32)
  return serialized
}