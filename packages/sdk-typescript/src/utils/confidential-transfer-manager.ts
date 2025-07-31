/**
 * Confidential Transfer Manager
 * 
 * High-level interface for managing confidential transfers with Token-2022.
 * Handles proof generation, account configuration, and transfer operations
 * with proper fallback behavior while the ZK program is disabled.
 */

import type { Address, IInstruction, TransactionSigner } from '@solana/kit'
import { getStructEncoder, getU8Encoder, getU64Encoder, getBytesEncoder, fixEncoderSize } from '@solana/kit'
import type { Rpc, GetAccountInfoApi } from '@solana/rpc'

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
  ProofMode
} from './zk-proof-builder.js'

import {
  ClientEncryptionService,
  type EncryptedData
} from './client-encryption.js'

import {
  PrivateMetadataStorage,
  type StoredPrivateData
} from './private-metadata.js'

import { getFeatureFlags } from './feature-flags.js'

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  EXTENSION_INSTRUCTIONS
} from './token-2022-spl-integration.js'

import { randomBytes, bytesToHex } from '@noble/curves/abstract/utils'
import { sha256 } from '@noble/hashes/sha256'

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
  private clientEncryption: ClientEncryptionService
  private metadataStorage: PrivateMetadataStorage
  private featureFlags = getFeatureFlags()
  
  constructor(
    private rpc: Rpc<GetAccountInfoApi>,
    private defaultProofMode: ProofMode = ProofMode.ZK_PROGRAM_WITH_FALLBACK
  ) {
    this.clientEncryption = new ClientEncryptionService()
    this.metadataStorage = new PrivateMetadataStorage()
  }

  /**
   * Get the current privacy mode status
   */
  async getPrivacyStatus(): Promise<{
    mode: 'zk-proofs' | 'client-encryption' | 'disabled'
    available: boolean
    message: string
  }> {
    const privacyStatus = this.featureFlags.getPrivacyStatus()
    const zkAvailable = await isZkProgramAvailable(this.rpc)
    
    return {
      mode: privacyStatus.mode,
      available: privacyStatus.mode !== 'disabled',
      message: zkAvailable 
        ? 'ZK proofs available for enhanced privacy'
        : privacyStatus.message
    }
  }

  /**
   * Get the current status of the ZK program
   */
  async getZkProgramStatus(): Promise<string> {
    return getZkProgramStatus(this.rpc)
  }

  /**
   * Check if ZK program is available
   */
  async isZkProgramAvailable(): Promise<boolean> {
    return isZkProgramAvailable(this.rpc)
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

    if (zeroProof.requiresZkProgram && !await isZkProgramAvailable(this.rpc)) {
      warnings.push(await getZkProgramStatus(this.rpc))
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
   * Create deposit instructions with dual-mode support
   */
  async createDepositInstructions(params: DepositParams): Promise<{
    instructions: IInstruction[]
    proofInstructions: IInstruction[]
    encryptedAmount: ElGamalCiphertext
    warnings: string[]
    metadata?: StoredPrivateData
  }> {
    const warnings: string[] = []
    const proofInstructions: IInstruction[] = []
    const instructions: IInstruction[] = []
    let metadata: StoredPrivateData | undefined

    // Check privacy mode
    const privacyStatus = await this.getPrivacyStatus()
    const zkAvailable = await isZkProgramAvailable(this.rpc)
    
    // Get account ElGamal pubkey (would be fetched from account in practice)
    const accountPubkey = await this.getAccountElGamalPubkey(params.account)
    
    // Encrypt the deposit amount
    const encryptedAmount = encryptAmount(params.amount, accountPubkey)
    
    // Dual-mode logic
    if (zkAvailable && privacyStatus.mode === 'zk-proofs') {
      // ZK proof mode
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const rangeProof = await generateRangeProofWithCommitment(
        params.amount,
        randomness,
        { 
          mode: params.proofMode ?? this.defaultProofMode,
          connection: this.rpc 
        }
      )

      if (rangeProof.requiresZkProgram && !await isZkProgramAvailable(this.rpc)) {
        warnings.push(await getZkProgramStatus(this.rpc))
      }

      if (rangeProof.instruction) {
        proofInstructions.push(rangeProof.instruction)
      }
    } else if (privacyStatus.mode === 'client-encryption') {
      // Client encryption mode
      warnings.push('Using client-side encryption (Beta). ZK proofs will be enabled when available.')
      
      // Store encrypted metadata off-chain
      if (this.featureFlags.isEnabled('ENABLE_IPFS_STORAGE')) {
        const privateData = {
          amount: params.amount.toString(),
          timestamp: Date.now(),
          type: 'deposit'
        }
        
        const publicData = {
          account: params.account,
          mint: params.mint,
          decimals: params.decimals
        }
        
        metadata = await this.metadataStorage.storePrivateData(
          privateData,
          publicData,
          accountPubkey
        )
      }
    } else {
      warnings.push('Privacy features are disabled. Enable in feature flags for enhanced privacy.')
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

    return { instructions, proofInstructions, encryptedAmount, warnings, metadata }
  }

  /**
   * Create transfer instructions with dual-mode support
   */
  async createTransferInstructions(params: TransferParams): Promise<{
    instructions: IInstruction[]
    proofInstructions: IInstruction[]
    newSourceBalance: ElGamalCiphertext
    destCiphertext: ElGamalCiphertext
    warnings: string[]
    metadata?: StoredPrivateData
  }> {
    const warnings: string[] = []
    const proofInstructions: IInstruction[] = []
    const instructions: IInstruction[] = []
    let metadata: StoredPrivateData | undefined

    // Check privacy mode
    const privacyStatus = await this.getPrivacyStatus()
    const zkAvailable = await isZkProgramAvailable(this.rpc)
    
    // Get current source balance (would be fetched in practice)
    const sourceBalance = await this.getEncryptedBalance(params.source)
    
    // Dual-mode logic
    let transferProof: {
      newSourceBalance: ElGamalCiphertext
      destCiphertext: ElGamalCiphertext
      requiresZkProgram: boolean
      instruction?: IInstruction
    }
    
    if (zkAvailable && privacyStatus.mode === 'zk-proofs') {
      // ZK proof mode
      transferProof = await generateTransferProofWithInstruction(
        sourceBalance,
        params.amount,
        params.sourceKeypair.publicKey,
        params.destElgamalPubkey,
        params.sourceKeypair.secretKey,
        { 
          mode: params.proofMode ?? this.defaultProofMode,
          connection: this.rpc 
        }
      )

      if (transferProof.requiresZkProgram && !await isZkProgramAvailable(this.rpc)) {
        warnings.push(await getZkProgramStatus(this.rpc))
      }

      if (transferProof.instruction) {
        proofInstructions.push(transferProof.instruction)
      }
    } else if (privacyStatus.mode === 'client-encryption') {
      // Client encryption mode
      warnings.push('Using client-side encryption for transfer (Beta). ZK proofs will be enabled when available.')
      
      // Decrypt current source balance to calculate new balance
      const { decryptAmount: elgamalDecrypt } = await import('./elgamal.js')
      const currentBalance = elgamalDecrypt(sourceBalance, params.sourceKeypair.secretKey)
      
      if (currentBalance === null) {
        throw new Error('Failed to decrypt source balance')
      }
      
      if (currentBalance < params.amount) {
        throw new Error('Insufficient balance for transfer')
      }
      
      // Calculate new balance and encrypt
      const newBalance = currentBalance - params.amount
      const newSourceCiphertext = encryptAmount(newBalance, params.sourceKeypair.publicKey)
      const destCiphertext = encryptAmount(params.amount, params.destElgamalPubkey)
      
      transferProof = {
        newSourceBalance: newSourceCiphertext,
        destCiphertext: destCiphertext,
        requiresZkProgram: false
      }
      
      // Store transfer metadata off-chain
      if (this.featureFlags.isEnabled('ENABLE_IPFS_STORAGE')) {
        const privateData = {
          amount: params.amount.toString(),
          source: params.source,
          destination: params.destination,
          timestamp: Date.now(),
          type: 'transfer'
        }
        
        const publicData = {
          mint: params.mint,
          transferHash: this.createTransferHash(params)
        }
        
        metadata = await this.metadataStorage.storePrivateData(
          privateData,
          publicData,
          params.destElgamalPubkey
        )
      }
    } else {
      warnings.push('Privacy features are disabled. Enable in feature flags for enhanced privacy.')
      // Non-private mode - still perform real encryption but without proofs
      const { subtractCiphertexts } = await import('./elgamal.js')
      
      // Encrypt transfer amount
      const transferCiphertext = encryptAmount(params.amount, params.sourceKeypair.publicKey)
      
      // Calculate new source balance using homomorphic subtraction
      const newSourceBalance = subtractCiphertexts(sourceBalance, transferCiphertext)
      const destCiphertext = encryptAmount(params.amount, params.destElgamalPubkey)
      
      transferProof = {
        newSourceBalance,
        destCiphertext,
        requiresZkProgram: false
      }
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
      newSourceBalance: transferProof.newSourceBalance as ElGamalCiphertext,
      destCiphertext: transferProof.destCiphertext as ElGamalCiphertext,
      warnings,
      metadata
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
  ): Promise<{
    proof: Uint8Array
    commitment?: Uint8Array
    instruction?: IInstruction
    requiresZkProgram: boolean
  }> {
    const zeroAmount = 0n
    const randomness = randomBytes(32)
    randomness[0] &= 248
    randomness[31] &= 127
    randomness[31] |= 64

    return generateRangeProofWithCommitment(zeroAmount, randomness, { 
      mode,
      connection: this.rpc 
    })
  }

  /**
   * Get account's ElGamal public key from account data
   */
  private async getAccountElGamalPubkey(account: Address): Promise<ElGamalPubkey> {
    // Fetch the token account data
    const accountInfo = await this.rpc.getAccountInfo(account, { encoding: 'base64' }).send()
    
    if (!accountInfo.value?.data) {
      throw new Error(`Account ${account} not found or has no data`)
    }
    
    // Decode account data
    const data = Buffer.from(accountInfo.value.data[0], 'base64')
    
    // Token-2022 account structure with confidential transfer extension
    // Skip to the extension data section
    const ACCOUNT_TYPE_SIZE = 165 // Base token account size
    const EXTENSION_TYPE_SIZE = 2
    
    // Check if account has extensions
    if (data.length <= ACCOUNT_TYPE_SIZE) {
      throw new Error('Account does not have confidential transfer extension')
    }
    
    // Find confidential transfer extension
    let offset = ACCOUNT_TYPE_SIZE
    while (offset < data.length) {
      const extensionType = data.readUInt16LE(offset)
      offset += EXTENSION_TYPE_SIZE
      
      const extensionLength = data.readUInt16LE(offset)
      offset += 2
      
      // Confidential transfer extension type = 4
      if (extensionType === 4) {
        // Extension structure:
        // - approved (bool): 1 byte
        // - elgamal_pubkey: 32 bytes
        // - pending_balance_lo: 64 bytes
        // - pending_balance_hi: 64 bytes
        // - available_balance: 64 bytes
        // - decryptable_available_balance: 64 bytes
        // - allow_confidential_credits: 1 byte
        // - allow_non_confidential_credits: 1 byte
        // - pending_balance_credit_counter: 8 bytes
        // - maximum_pending_balance_credit_counter: 8 bytes
        // - expected_pending_balance_credit_counter: 8 bytes
        // - actual_pending_balance_credit_counter: 8 bytes
        
        // Skip approved byte and read ElGamal pubkey
        const pubkeyOffset = offset + 1
        const pubkey = data.slice(pubkeyOffset, pubkeyOffset + 32)
        
        return new Uint8Array(pubkey)
      }
      
      offset += extensionLength
    }
    
    throw new Error('Account does not have confidential transfer extension')
  }

  /**
   * Get encrypted balance from account data
   */
  private async getEncryptedBalance(account: Address): Promise<ElGamalCiphertext> {
    // Fetch the token account data
    const accountInfo = await this.rpc.getAccountInfo(account, { encoding: 'base64' }).send()
    
    if (!accountInfo.value?.data) {
      throw new Error(`Account ${account} not found or has no data`)
    }
    
    // Decode account data
    const data = Buffer.from(accountInfo.value.data[0], 'base64')
    
    // Token-2022 account structure with confidential transfer extension
    const ACCOUNT_TYPE_SIZE = 165 // Base token account size
    const EXTENSION_TYPE_SIZE = 2
    
    // Check if account has extensions
    if (data.length <= ACCOUNT_TYPE_SIZE) {
      throw new Error('Account does not have confidential transfer extension')
    }
    
    // Find confidential transfer extension
    let offset = ACCOUNT_TYPE_SIZE
    while (offset < data.length) {
      const extensionType = data.readUInt16LE(offset)
      offset += EXTENSION_TYPE_SIZE
      
      const extensionLength = data.readUInt16LE(offset)
      offset += 2
      
      // Confidential transfer extension type = 4
      if (extensionType === 4) {
        // Extension structure offsets:
        // - approved: 0 (1 byte)
        // - elgamal_pubkey: 1 (32 bytes)
        // - pending_balance_lo: 33 (64 bytes)
        // - pending_balance_hi: 97 (64 bytes)
        // - available_balance: 161 (64 bytes) <-- This is what we need
        
        const availableBalanceOffset = offset + 161
        const ciphertextData = data.slice(availableBalanceOffset, availableBalanceOffset + 64)
        
        // ElGamal ciphertext is stored as commitment (32 bytes) + handle (32 bytes)
        const commitment = ciphertextData.slice(0, 32)
        const handle = ciphertextData.slice(32, 64)
        
        return {
          commitment: { commitment: new Uint8Array(commitment) },
          handle: { handle: new Uint8Array(handle) }
        }
      }
      
      offset += extensionLength
    }
    
    throw new Error('Account does not have confidential transfer extension')
  }

  /**
   * Create a transfer hash for metadata reference
   */
  private createTransferHash(params: TransferParams): Uint8Array {
    const data = {
      source: params.source,
      destination: params.destination,
      amount: params.amount.toString(),
      timestamp: Date.now()
    }
    return sha256(new TextEncoder().encode(JSON.stringify(data)))
  }
  
  /**
   * Monitor ZK program status and switch modes when available
   */
  async monitorZkProgramAvailability(
    callback: (status: { enabled: boolean; message: string }) => void
  ): Promise<() => void> {
    let monitoring = true
    
    const checkStatus = async () => {
      while (monitoring) {
        const zkAvailable = await isZkProgramAvailable(this.rpc)
        const status = await getZkProgramStatus(this.rpc)
        
        callback({
          enabled: zkAvailable,
          message: status
        })
        
        // Check every 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    }
    
    // Start monitoring in background
    checkStatus().catch(console.error)
    
    // Return stop function
    return () => {
      monitoring = false
    }
  }
  
  /**
   * Create a privacy-preserving work order
   */
  async createPrivateWorkOrder(params: {
    title: string
    encryptedDetails: EncryptedData
    publicMetadata: Record<string, unknown>
    recipientPubkey: ElGamalPubkey
  }): Promise<{
    workOrderHash: Uint8Array
    metadata: StoredPrivateData
    warnings: string[]
  }> {
    const warnings: string[] = []
    const privacyStatus = await this.getPrivacyStatus()
    
    if (!privacyStatus.available) {
      warnings.push('Privacy features are not available. Work order details will be public.')
    }
    
    // Store encrypted work order details
    const privateData = {
      title: params.title,
      encryptedDetails: {
        commitment: bytesToHex(params.encryptedDetails.commitment),
        timestamp: params.encryptedDetails.timestamp
      },
      createdAt: Date.now()
    }
    
    const metadata = await this.metadataStorage.storePrivateData(
      privateData,
      params.publicMetadata,
      params.recipientPubkey
    )
    
    // Create work order hash for on-chain reference
    const workOrderHash = sha256(
      new TextEncoder().encode(
        JSON.stringify({
          title: params.title,
          metadataHash: bytesToHex(metadata.onChainHash),
          recipient: bytesToHex(params.recipientPubkey)
        })
      )
    )
    
    return {
      workOrderHash,
      metadata,
      warnings
    }
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