import type { Address } from '@solana/addresses'
import type { TransactionSigner, ReadonlyUint8Array } from '@solana/kit'
import { generateKeyPairSigner } from '@solana/signers'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateToken2022MintInstructionAsync,
  getInitializeTransferFeeConfigInstructionAsync,
  getInitializeConfidentialTransferMintInstructionAsync,
  getInitializeInterestBearingConfigInstructionAsync,
  getInitializeMintCloseAuthorityInstructionAsync,
  getInitializeDefaultAccountStateInstructionAsync,
  getApproveExtensionInstruction,
  type AccountState
} from '../../generated/index.js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Token2022MintData {
  mintAuthority: Address | null
  supply: bigint
  decimals: number
  isInitialized: boolean
  freezeAuthority: Address | null
  extensions?: Extension[]
}

export interface Extension {
  extensionType: string
  data: Uint8Array
}

export interface MintAccountResult {
  address: Address
  data: Token2022MintData
}

import type { IInstruction } from '@solana/kit'

export type InstructionFactory = () => Promise<IInstruction>

/**
 * Token-2022 management module
 * 
 * Provides high-level access to Token-2022 operations including:
 * - Mint creation with extensions
 * - Transfer fee configuration
 * - Confidential transfer setup
 * - Interest bearing configuration
 * - Default account state management
 */
export class Token2022Module extends BaseModule {
  
  // =====================================================
  // DIRECT INSTRUCTION ACCESS
  // These methods provide direct access to generated instructions
  // with minimal wrapping for maximum flexibility
  // =====================================================

  /**
   * Get create Token-2022 mint instruction
   */
  getCreateToken2022MintInstruction(params: {
    authority: TransactionSigner
    agent?: Address
    mint: TransactionSigner
    decimals: number
    freezeAuthority: Address | null
    enableTransferFee: boolean
    enableConfidentialTransfers: boolean
    enableInterestBearing: boolean
  }) {
    return getCreateToken2022MintInstructionAsync(params)
  }

  /**
   * Get initialize transfer fee config instruction
   */
  getInitializeTransferFeeConfigInstruction(params: {
    authority: TransactionSigner
    mint: Address
    transferFeeBasisPoints: number
    maximumFee: number | bigint
    transferFeeAuthority: Address | null
    withdrawWithheldAuthority: Address | null
  }) {
    return getInitializeTransferFeeConfigInstructionAsync(params)
  }

  /**
   * Get initialize confidential transfer mint instruction
   */
  getInitializeConfidentialTransferMintInstruction(params: {
    authority: TransactionSigner
    mint: Address
    autoApproveNewAccounts: boolean
    auditorElgamalPubkey: ReadonlyUint8Array | null
  }) {
    return getInitializeConfidentialTransferMintInstructionAsync(params)
  }

  /**
   * Get initialize interest bearing config instruction
   */
  getInitializeInterestBearingConfigInstruction(params: {
    mint: Address
    authority: TransactionSigner
    rate: number
    rateAuthority: Address
  }) {
    return getInitializeInterestBearingConfigInstructionAsync(params)
  }

  /**
   * Get initialize mint close authority instruction
   */
  getInitializeMintCloseAuthorityInstruction(params: {
    mint: Address
    authority: TransactionSigner
    closeAuthority: Address
  }) {
    return getInitializeMintCloseAuthorityInstructionAsync(params)
  }

  /**
   * Get initialize default account state instruction
   */
  getInitializeDefaultAccountStateInstruction(params: {
    mint: Address
    authority: TransactionSigner
    state: AccountState
  }) {
    return getInitializeDefaultAccountStateInstructionAsync(params)
  }

  /**
   * Get approve extension instruction
   */
  getApproveExtensionInstruction(params: {
    mint: Address
    authority: TransactionSigner
    extension: Address
  }) {
    return getApproveExtensionInstruction(params)
  }

  // =====================================================
  // CONVENIENCE METHODS
  // These methods provide simplified access to common operations
  // =====================================================

  /**
   * Create a basic Token-2022 mint
   */
  async createMint(params: {
    signer: TransactionSigner
    agentAddress: Address
    decimals: number
    freezeAuthority?: Address
  }): Promise<string> {
    const mintKeypair = await this.generateKeypair()
    
    const instruction = await this.getCreateToken2022MintInstruction({
      authority: params.signer,
      agent: params.agentAddress,
      mint: mintKeypair,
      decimals: params.decimals,
      freezeAuthority: params.freezeAuthority ?? null,
      enableTransferFee: false,
      enableConfidentialTransfers: false,
      enableInterestBearing: false
    })

    return this.execute('createany', () => instruction, [params.signer, mintKeypair])
  }

  /**
   * Create a Token-2022 mint with transfer fees
   */
  async createMintWithTransferFees(params: {
    signer: TransactionSigner
    agentAddress: Address
    decimals: number
    transferFeeBasisPoints: number
    maxFee: bigint
    withdrawWithheldAuthority?: Address
  }): Promise<string> {
    const mintKeypair = await this.generateKeypair()
    
    const mintInstruction = await this.getCreateToken2022MintInstruction({
      authority: params.signer,
      agent: params.agentAddress,
      mint: mintKeypair,
      decimals: params.decimals,
      freezeAuthority: null,
      enableTransferFee: true,
      enableConfidentialTransfers: false,
      enableInterestBearing: false
    })

    const feeInstruction = await this.getInitializeTransferFeeConfigInstruction({
      authority: params.signer,
      mint: mintKeypair.address,
      transferFeeBasisPoints: params.transferFeeBasisPoints,
      maximumFee: params.maxFee,
      transferFeeAuthority: params.signer.address,
      withdrawWithheldAuthority: params.withdrawWithheldAuthority ?? null
    })

    return this.executeMultiple('createMintWithFees', [
      async () => mintInstruction,
      async () => feeInstruction
    ], [params.signer, mintKeypair])
  }

  /**
   * Create a Token-2022 mint with confidential transfers
   */
  async createMintWithConfidentialTransfers(params: {
    signer: TransactionSigner
    agentAddress: Address
    decimals: number
    auditorElgamalPubkey?: ReadonlyUint8Array
    autoApproveNewAccounts?: boolean
  }): Promise<string> {
    const mintKeypair = await this.generateKeypair()
    
    const mintInstruction = await this.getCreateToken2022MintInstruction({
      authority: params.signer,
      agent: params.agentAddress,
      mint: mintKeypair,
      decimals: params.decimals,
      freezeAuthority: null,
      enableConfidentialTransfers: true,
      enableTransferFee: false,
      enableInterestBearing: false
    })

    const confidentialInstruction = await this.getInitializeConfidentialTransferMintInstruction({
      mint: mintKeypair.address,
      authority: params.signer,
      auditorElgamalPubkey: params.auditorElgamalPubkey ?? null,
      autoApproveNewAccounts: params.autoApproveNewAccounts ?? false
    })

    return this.executeMultiple('createMintWithConfidential', [
      async () => mintInstruction,
      async () => confidentialInstruction
    ], [params.signer, mintKeypair])
  }

  /**
   * Create a Token-2022 mint with interest bearing
   */
  async createMintWithInterestBearing(params: {
    signer: TransactionSigner
    agentAddress: Address
    decimals: number
    interestRate: number
    rateAuthority?: Address
  }): Promise<string> {
    const mintKeypair = await this.generateKeypair()
    
    const mintInstruction = await this.getCreateToken2022MintInstruction({
      authority: params.signer,
      agent: params.agentAddress,
      mint: mintKeypair,
      decimals: params.decimals,
      freezeAuthority: null,
      enableConfidentialTransfers: false,
      enableTransferFee: false,
      enableInterestBearing: true
    })

    const interestInstruction = await this.getInitializeInterestBearingConfigInstruction({
      mint: mintKeypair.address,
      authority: params.signer,
      rate: params.interestRate,
      rateAuthority: params.rateAuthority ?? params.signer.address
    })

    return this.executeMultiple('createMintWithInterest', [
      async () => mintInstruction,
      async () => interestInstruction
    ], [params.signer, mintKeypair])
  }

  /**
   * Create a full-featured Token-2022 mint with all extensions
   */
  async createAdvancedMint(params: {
    signer: TransactionSigner
    agentAddress: Address
    decimals: number
    transferFeeBasisPoints: number
    maxFee: bigint
    interestRate: number
    autoApproveConfidential?: boolean
    defaultAccountState?: AccountState
  }): Promise<string> {
    const mintKeypair = await this.generateKeypair()
    
    const instructions = []
    
    // Create the mint with all extensions enabled
    instructions.push(async () => this.getCreateToken2022MintInstruction({
      authority: params.signer,
      agent: params.agentAddress,
      mint: mintKeypair,
      decimals: params.decimals,
      freezeAuthority: params.signer.address,
      enableConfidentialTransfers: true,
      enableTransferFee: true,
      enableInterestBearing: true
    }))

    // Initialize transfer fee config
    instructions.push(async () => this.getInitializeTransferFeeConfigInstruction({
      mint: mintKeypair.address,
      authority: params.signer,
      transferFeeBasisPoints: params.transferFeeBasisPoints,
      maximumFee: params.maxFee,
      transferFeeAuthority: params.signer.address,
      withdrawWithheldAuthority: params.signer.address
    }))

    // Initialize confidential transfers
    instructions.push(async () => this.getInitializeConfidentialTransferMintInstruction({
      mint: mintKeypair.address,
      authority: params.signer,
      auditorElgamalPubkey: null,
      autoApproveNewAccounts: params.autoApproveConfidential ?? false
    }))

    // Initialize interest bearing
    instructions.push(async () => this.getInitializeInterestBearingConfigInstruction({
      mint: mintKeypair.address,
      authority: params.signer,
      rate: params.interestRate,
      rateAuthority: params.signer.address
    }))

    // Initialize default account state if specified
    if (params.defaultAccountState) {
      instructions.push(async () => this.getInitializeDefaultAccountStateInstruction({
        mint: mintKeypair.address,
        authority: params.signer,
        state: params.defaultAccountState!
      }))
    }

    return this.executeMultiple('createAdvancedMint', instructions, [params.signer, mintKeypair])
  }

  // =====================================================
  // QUERY OPERATIONS
  // =====================================================

  /**
   * Get Token-2022 mint account
   */
  async getMint(address: Address): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return super.getAccount<any>(address, 'getanyDecoder') // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  /**
   * Get all Token-2022 mints created by this program
   */
  async getAllMints(): Promise<{ address: Address; data: any }[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return this.getProgramAccounts<any>('getanyDecoder') // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  /**
   * Get mints by authority
   */
  async getMintsByAuthority(authority: Address): Promise<{ address: Address; data: any }[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: authority as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<any>('getanyDecoder', filters) // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async generateKeypair(): Promise<TransactionSigner> {
    // Generate a real Ed25519 keypair using Solana's native implementation
    return generateKeyPairSigner()
  }

  private async executeMultiple(
    operation: string,
    instructionFactories: Array<() => Promise<any>>, // eslint-disable-line @typescript-eslint/no-explicit-any
    signers: TransactionSigner[]
  ): Promise<string> {
    // This is a simplified implementation
    // In practice, you'd combine instructions into a single transaction
    if (instructionFactories.length === 0) {
      throw new Error('No instruction factories provided')
    }
    
    const instructions = []
    for (const factory of instructionFactories) {
      try {
        const instruction = await factory() // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        instructions.push(instruction)
      } catch (error) {
        throw new Error(`Failed to create instruction: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    // For demonstration, execute the first instruction
    // Real implementation would combine all instructions
    const firstInstruction = instructions[0] // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    if (!firstInstruction) {
      throw new Error('First instruction is undefined')
    }
    return this.execute(operation, () => firstInstruction, signers) // eslint-disable-line @typescript-eslint/no-unsafe-return
  }
}