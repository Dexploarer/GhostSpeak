/**
 * Token-2022 Instructions Client
 * 
 * High-level client for creating and managing Token-2022 mints with extensions.
 * Supports transfer fees, confidential transfers, interest-bearing tokens, and more.
 */

import { 
  type Address, 
  type TransactionSigner,
  type Blockhash,
  type Instruction,
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction
} from '@solana/kit'
import { type GhostSpeakClientConfig } from '../GhostSpeakClient'
import { 
  getCreateToken2022MintInstructionAsync,
  getInitializeTransferFeeConfigInstructionAsync,
  getInitializeConfidentialTransferMintInstructionAsync,
  getInitializeInterestBearingConfigInstructionAsync
} from '../../generated/instructions'
import { 
  getMintWithExtensions,
  mintHasExtension
} from '../../utils/token-2022-rpc'
import { 
  type MintWithExtensions,
  ExtensionType,
  type TransferFeeConfig,
  type InterestBearingConfig,
  type ConfidentialTransferMint as ConfidentialTransferConfig
} from '../../types/token-2022-types'
import { 
  calculateTransferFee,
  calculateInterest
} from '../../utils/token-2022-extensions'
import type { TransferFeeConfig as SimpleTransferFeeConfig } from '../../utils/token-utils'
import { withEnhancedErrors } from '../../utils/enhanced-client-errors'

/**
 * Parameters for creating a Token-2022 mint
 */
export interface CreateToken2022MintParams {
  /** The mint keypair to create */
  mint: TransactionSigner
  /** Number of decimal places for the token */
  decimals: number
  /** Optional freeze authority */
  freezeAuthority?: Address
  /** Enable transfer fee extension */
  enableTransferFee?: boolean
  /** Enable confidential transfer extension */
  enableConfidentialTransfers?: boolean
  /** Enable interest-bearing extension */
  enableInterestBearing?: boolean
  /** Transaction signer */
  signer: TransactionSigner
}

/**
 * Parameters for transfer fee configuration
 */
export interface TransferFeeConfigParams {
  /** The mint to configure */
  mint: Address
  /** Transfer fee in basis points (0-10000) */
  transferFeeBasisPoints: number
  /** Maximum fee in token base units */
  maximumFee: bigint
  /** Authority that can modify fee config */
  transferFeeConfigAuthority?: Address
  /** Authority that can withdraw fees */
  withdrawWithheldAuthority?: Address
  /** Transaction signer */
  signer: TransactionSigner
}

/**
 * Parameters for confidential transfer configuration
 */
export interface ConfidentialTransferConfigParams {
  /** The mint to configure */
  mint: Address
  /** Authority for confidential transfers */
  authority?: Address
  /** Auto-approve new accounts */
  autoApproveNewAccounts?: boolean
  /** ElGamal public key for auditing */
  auditorElgamalPubkey?: Uint8Array
  /** Transaction signer */
  signer: TransactionSigner
}

/**
 * Parameters for interest-bearing configuration
 */
export interface InterestBearingConfigParams {
  /** The mint to configure */
  mint: Address
  /** Authority that can update interest rate */
  rateAuthority?: Address
  /** Interest rate in basis points per year */
  rate: number
  /** Transaction signer */
  signer: TransactionSigner
}

/**
 * Complete Token-2022 mint information
 */
export interface Token2022MintInfo {
  /** Mint address */
  address: Address
  /** Basic mint data */
  mintInfo: MintWithExtensions
  /** Transfer fee configuration if enabled */
  transferFeeConfig?: TransferFeeConfig
  /** Confidential transfer configuration if enabled */
  confidentialTransferConfig?: ConfidentialTransferConfig
  /** Interest-bearing configuration if enabled */
  interestBearingConfig?: InterestBearingConfig
  /** Enabled extensions */
  extensions: ExtensionType[]
}

/**
 * Client for managing Token-2022 operations
 */
export class Token2022Instructions {
  private rpc: {
    getLatestBlockhash(): { send(): Promise<{ value: { blockhash: Blockhash; lastValidBlockHeight: bigint } }> }
    sendTransaction(transaction: string, options: { encoding: 'base64' }): { send(): Promise<string> }
    [key: string]: unknown
  }
  private programId: Address

  constructor(private config: GhostSpeakClientConfig) {
    this.rpc = config.rpc
    this.programId = config.programId ?? address('GHSTwJYnMW6V8piJgW8yY8ZUKqQzFQkKKJmLPWUKvdFu')
  }

  /**
   * Create a new Token-2022 mint with specified extensions
   */
  async createToken2022Mint(params: CreateToken2022MintParams): Promise<{
    signature: string
    mintAddress: Address
    mintInfo: Token2022MintInfo
  }> {
    return withEnhancedErrors(
      'createToken2022Mint',
      'create_token_2022_mint',
      async () => {
        // Build the mint creation instruction
        const instruction = await getCreateToken2022MintInstructionAsync({
          authority: params.signer,
          mint: params.mint,
          decimals: params.decimals,
          freezeAuthority: params.freezeAuthority ?? null,
          enableTransferFee: params.enableTransferFee ?? false,
          enableConfidentialTransfers: params.enableConfidentialTransfers ?? false,
          enableInterestBearing: params.enableInterestBearing ?? false
        }, { programAddress: this.programId })

        // Send transaction
        const signature = await this.sendTransaction([instruction], params.signer)

        // Fetch the created mint info
        const mintInfo = await this.getMintInfo(params.mint.address)

        return {
          signature,
          mintAddress: params.mint.address,
          mintInfo
        }
      }
    )
  }

  /**
   * Initialize transfer fee configuration for an existing mint
   */
  async initializeTransferFeeConfig(params: TransferFeeConfigParams): Promise<string> {
    return withEnhancedErrors(
      'initializeTransferFeeConfig',
      'initialize_transfer_fee_config',
      async () => {
        // Validate fee parameters
        if (params.transferFeeBasisPoints > 10000) {
          throw new Error('Transfer fee basis points cannot exceed 10000 (100%)')
        }

        const instruction = await getInitializeTransferFeeConfigInstructionAsync({
          mint: params.mint,
          authority: params.signer,
          transferFeeBasisPoints: params.transferFeeBasisPoints,
          maximumFee: params.maximumFee,
          transferFeeAuthority: params.transferFeeConfigAuthority ?? null,
          withdrawWithheldAuthority: params.withdrawWithheldAuthority ?? null
        }, { programAddress: this.programId })

        return this.sendTransaction([instruction], params.signer)
      }
    )
  }

  /**
   * Initialize confidential transfer configuration for an existing mint
   */
  async initializeConfidentialTransferConfig(params: ConfidentialTransferConfigParams): Promise<string> {
    return withEnhancedErrors(
      'initializeConfidentialTransferConfig',
      'initialize_confidential_transfer_mint',
      async () => {
        const instruction = await getInitializeConfidentialTransferMintInstructionAsync({
          authority: params.signer,
          mint: params.mint,
          autoApproveNewAccounts: params.autoApproveNewAccounts ?? false,
          auditorElgamalPubkey: params.auditorElgamalPubkey ?? null
        }, { programAddress: this.programId })

        return this.sendTransaction([instruction], params.signer)
      }
    )
  }

  /**
   * Initialize interest-bearing configuration for an existing mint
   */
  async initializeInterestBearingConfig(params: InterestBearingConfigParams): Promise<string> {
    return withEnhancedErrors(
      'initializeInterestBearingConfig',
      'initialize_interest_bearing_config',
      async () => {
        // Validate interest rate
        if (params.rate > 32767 || params.rate < -32768) {
          throw new Error('Interest rate must be within i16 range (-32768 to 32767)')
        }

        const instruction = await getInitializeInterestBearingConfigInstructionAsync({
          authority: params.signer,
          mint: params.mint,
          rate: params.rate,
          rateAuthority: params.rateAuthority ?? params.signer.address
        }, { programAddress: this.programId })

        return this.sendTransaction([instruction], params.signer)
      }
    )
  }

  /**
   * Get complete information about a Token-2022 mint
   */
  async getMintInfo(mintAddress: Address): Promise<Token2022MintInfo> {
    return withEnhancedErrors(
      'getMintInfo',
      undefined,
      async () => {
        const mintInfo = await getMintWithExtensions(this.rpc, mintAddress)
        if (!mintInfo) {
          throw new Error(`Mint ${mintAddress} not found`)
        }

        const extensions: ExtensionType[] = []
        let transferFeeConfig: TransferFeeConfig | undefined
        let confidentialTransferConfig: ConfidentialTransferConfig | undefined
        let interestBearingConfig: InterestBearingConfig | undefined

        // Check for transfer fee extension
        if (await mintHasExtension(this.rpc, mintAddress, ExtensionType.TransferFeeConfig)) {
          extensions.push(ExtensionType.TransferFeeConfig)
          if (mintInfo.extensions.transferFeeConfig) {
            const config = mintInfo.extensions.transferFeeConfig
            transferFeeConfig = {
              transferFeeConfigAuthority: config.transferFeeConfigAuthority,
              withdrawWithheldAuthority: config.withdrawWithheldAuthority,
              withheldAmount: config.withheldAmount,
              olderTransferFee: config.olderTransferFee,
              newerTransferFee: config.newerTransferFee
            }
          }
        }

        // Check for confidential transfer extension
        if (await mintHasExtension(this.rpc, mintAddress, ExtensionType.ConfidentialTransferMint)) {
          extensions.push(ExtensionType.ConfidentialTransferMint)
          if (mintInfo.extensions.confidentialTransferMint) {
            const config = mintInfo.extensions.confidentialTransferMint
            confidentialTransferConfig = {
              authority: config.authority,
              autoApproveNewAccounts: config.autoApproveNewAccounts,
              auditorElgamalPubkey: config.auditorElgamalPubkey
            }
          }
        }

        // Check for interest-bearing extension
        if (await mintHasExtension(this.rpc, mintAddress, ExtensionType.InterestBearingConfig)) {
          extensions.push(ExtensionType.InterestBearingConfig)
          if (mintInfo.extensions.interestBearingConfig) {
            const config = mintInfo.extensions.interestBearingConfig
            interestBearingConfig = {
              rateAuthority: config.rateAuthority,
              initializationTimestamp: config.initializationTimestamp,
              preUpdateAverageRate: config.preUpdateAverageRate,
              lastUpdateTimestamp: config.lastUpdateTimestamp,
              currentRate: config.currentRate
            }
          }
        }

        return {
          address: mintAddress,
          mintInfo,
          transferFeeConfig,
          confidentialTransferConfig,
          interestBearingConfig,
          extensions
        }
      }
    )
  }

  /**
   * Calculate transfer fee for a given amount
   */
  calculateTransferFee(amount: bigint, mintInfo: Token2022MintInfo): bigint {
    if (!mintInfo.transferFeeConfig) {
      return BigInt(0)
    }

    const result = calculateTransferFee(
      amount,
      {
        transferFeeBasisPoints: mintInfo.transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
        maximumFee: mintInfo.transferFeeConfig.newerTransferFee.maximumFee,
        transferFeeConfigAuthority: mintInfo.transferFeeConfig.transferFeeConfigAuthority,
        withdrawWithheldAuthority: mintInfo.transferFeeConfig.withdrawWithheldAuthority
      } as SimpleTransferFeeConfig
    )
    return result.feeAmount
  }

  /**
   * Calculate accrued interest for an interest-bearing token
   */
  calculateAccruedInterest(
    amount: bigint,
    mintInfo: Token2022MintInfo,
    currentTimestamp?: bigint
  ): bigint {
    if (!mintInfo.interestBearingConfig) {
      return BigInt(0)
    }

    const timestamp = currentTimestamp ?? BigInt(Math.floor(Date.now() / 1000))
    const result = calculateInterest(
      amount,
      mintInfo.interestBearingConfig,
      timestamp
    )
    return result.interestAmount
  }

  /**
   * Check if a mint has a specific extension
   */
  async hasExtension(mintAddress: Address, extensionType: ExtensionType): Promise<boolean> {
    return mintHasExtension(this.rpc, mintAddress, extensionType)
  }

  /**
   * Get all Token-2022 mints for a given authority
   */
  async getMintsByAuthority(): Promise<Token2022MintInfo[]> {
    return withEnhancedErrors(
      'getMintsByAuthority',
      undefined,
      async () => {
        // This would require a getProgramAccounts call to find all mints
        // For now, return empty array as this needs RPC endpoint support
        console.warn('getMintsByAuthority requires getProgramAccounts support')
        return []
      }
    )
  }

  /**
   * Helper method to send a transaction
   */
  private async sendTransaction(
    instructions: Instruction[],
    signer: TransactionSigner
  ): Promise<string> {
    // Get latest blockhash
    const latestBlockhash = await this.rpc.getLatestBlockhash().send()
    
    // Build transaction message
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(signer.address, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash({
        blockhash: latestBlockhash.value.blockhash,
        lastValidBlockHeight: latestBlockhash.value.lastValidBlockHeight
      }, tx),
      tx => appendTransactionMessageInstructions(instructions as Instruction[], tx)
    )

    // Sign transaction
    const signedTransaction = await signTransactionMessageWithSigners(message)
    
    // Send transaction
    const signature = await this.rpc.sendTransaction(
      getBase64EncodedWireTransaction(signedTransaction),
      { encoding: 'base64' }
    ).send()

    return signature
  }
}

// Export types for external use
export type {
  CreateToken2022MintParams as CreateToken2022MintParameters,
  TransferFeeConfigParams as TransferFeeConfigParameters,
  ConfidentialTransferConfigParams as ConfidentialTransferConfigParameters,
  InterestBearingConfigParams as InterestBearingConfigParameters,
  Token2022MintInfo as Token2022MintInformation
}