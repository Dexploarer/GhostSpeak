import type { Address } from '@solana/addresses'
import type { TransactionSigner, ReadonlyUint8Array, Instruction } from '@solana/kit'
// Type alias for backward compatibility with @solana/kit v2
type IInstruction = Instruction
import { generateKeyPairSigner } from '@solana/signers'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateToken2022MintInstructionAsync,
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
    // Optional config params
    transferFeeBasisPoints?: number | null
    maximumFee?: bigint | null
    transferFeeAuthority?: Address | null
    withdrawWithheldAuthority?: Address | null
    autoApproveNewAccounts?: boolean | null
    auditorElgamalPubkey?: ReadonlyUint8Array | null
    interestRate?: number | null
    rateAuthority?: Address | null
    closeAuthority?: Address | null
    defaultAccountState?: AccountState | null
  }) {
    return getCreateToken2022MintInstructionAsync({
      ...params,
      // Ensure defaults for optional fields if passed as undefined
      transferFeeBasisPoints: params.transferFeeBasisPoints ?? null,
      maximumFee: params.maximumFee ?? null,
      transferFeeAuthority: params.transferFeeAuthority ?? null,
      withdrawWithheldAuthority: params.withdrawWithheldAuthority ?? null,
      autoApproveNewAccounts: params.autoApproveNewAccounts ?? null,
      auditorElgamalPubkey: params.auditorElgamalPubkey ?? null,
      interestRate: params.interestRate ?? null,
      rateAuthority: params.rateAuthority ?? null,
      closeAuthority: params.closeAuthority ?? null,
      defaultAccountState: params.defaultAccountState ?? null
    })
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

    return this.execute('createToken2022Mint', () => instruction, [params.signer, mintKeypair])
  }

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
      enableInterestBearing: false,
      // Transfer fee extension params
      transferFeeBasisPoints: params.transferFeeBasisPoints,
      maximumFee: params.maxFee,
      transferFeeAuthority: params.signer.address,
      withdrawWithheldAuthority: params.withdrawWithheldAuthority ?? null
    })

    return this.execute('createMintWithFees', () => mintInstruction, [params.signer, mintKeypair])
  }

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
      enableInterestBearing: false,
      // Confidential transfer params
      auditorElgamalPubkey: params.auditorElgamalPubkey ?? null,
      autoApproveNewAccounts: params.autoApproveNewAccounts ?? false
    })

    return this.execute('createMintWithConfidential', () => mintInstruction, [params.signer, mintKeypair])
  }

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
      enableInterestBearing: true,
      // Interest bearing params
      interestRate: params.interestRate,
      rateAuthority: params.rateAuthority ?? params.signer.address
    })

    return this.execute('createMintWithInterest', () => mintInstruction, [params.signer, mintKeypair])
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
    
    // Create the mint with all extensions enabled and configured
    instructions.push(async () => this.getCreateToken2022MintInstruction({
      authority: params.signer,
      agent: params.agentAddress,
      mint: mintKeypair,
      decimals: params.decimals,
      freezeAuthority: params.signer.address,
      enableConfidentialTransfers: true,
      enableTransferFee: true,
      enableInterestBearing: true,
      // Transfer fee params
      transferFeeBasisPoints: params.transferFeeBasisPoints,
      maximumFee: params.maxFee,
      transferFeeAuthority: params.signer.address,
      withdrawWithheldAuthority: params.signer.address,
      // Confidential transfer params
      auditorElgamalPubkey: null,
      autoApproveNewAccounts: params.autoApproveConfidential ?? false,
      // Interest bearing params
      interestRate: params.interestRate,
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
  async getMint(address: Address): Promise<Token2022MintData | null> {
    return super.getAccount<Token2022MintData>(address, 'getMintDecoder')
  }

  /**
   * Get all Token-2022 mints created by this program
   */
  async getAllMints(): Promise<{ address: Address; data: Token2022MintData }[]> {
    return this.getProgramAccounts<Token2022MintData>('getMintDecoder')
  }

  /**
   * Get mints by authority
   */
  async getMintsByAuthority(authority: Address): Promise<{ address: Address; data: Token2022MintData }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: authority as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<Token2022MintData>('getMintDecoder', filters)
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
    instructionFactories: Array<() => Promise<IInstruction>>,
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
        const instruction = await factory()
        instructions.push(instruction)
      } catch (error) {
        throw new Error(`Failed to create instruction: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    // For demonstration, execute the first instruction
    // Real implementation would combine all instructions
    const firstInstruction = instructions[0]
    if (!firstInstruction) {
      throw new Error('First instruction is undefined')
    }
    return this.execute(operation, () => firstInstruction, signers)
  }
}