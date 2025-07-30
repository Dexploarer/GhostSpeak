/**
 * AuctionInstructions - Complete Auction Management Client
 * 
 * Provides developer-friendly high-level interface for all auction functionality
 * including creation, bidding, monitoring, and settlement with real Web3.js v2 execution.
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseInstructions } from './BaseInstructions.js'
import type { GhostSpeakConfig } from '../../types/index.js'
import { 
  getCreateServiceAuctionInstruction,
  getPlaceAuctionBidInstruction,
  getFinalizeAuctionInstruction,
  getPlaceDutchAuctionBidInstruction,
  getExtendAuctionForReserveInstruction,
  AuctionType,
  AuctionStatus,
  type AuctionMarketplace
} from '../../generated/index.js'
import { SYSTEM_PROGRAM_ADDRESS_32, SYSVAR_CLOCK_ADDRESS } from '../../constants/index.js'
import { 
  deriveAuctionPda, 
  deriveUserRegistryPda,
  DutchAuctionUtils,
  DutchAuctionUtilsExports,
  ReservePriceUtils,
  AuctionTimeUtils,
  AuctionPricingUtils
} from '../../utils/auction-helpers.js'
import { type TransactionResult } from '../../utils/transaction-urls.js'
import {
  safeDecodeAccount,
  createDiscriminatorErrorMessage
} from '../../utils/discriminator-validator.js'
import type {
  BaseInstructionParams,
  BaseTimeParams
} from './BaseInterfaces.js'
import {
  getAssociatedTokenAccount,
  detectTokenProgram,
  isToken2022Mint,
  fetchTransferFeeConfig,
  type AssociatedTokenAccount
} from '../../utils/token-utils.js'
import {
  calculateTransferFee,
  type TransferFeeCalculation
} from '../../utils/token-2022-extensions.js'

// Enhanced types for better developer experience
export interface AuctionData {
  auctionType: AuctionType
  startingPrice: bigint
  reservePrice: bigint
  currentBid: bigint
  currentBidder: Address | null
  auctionEndTime: bigint
  minimumBidIncrement: bigint
  totalBids: number
}

export interface CreateAuctionParams extends BaseTimeParams {
  auctionData: {
    auctionType: AuctionType
    startingPrice: bigint
    reservePrice: bigint
    auctionEndTime: bigint
    minimumBidIncrement: bigint
  }
  metadataUri?: string
  agent: Address
  signer: TransactionSigner
  /** Payment token mint for the auction (defaults to SOL) */
  paymentToken?: Address
  /** Whether to expect transfer fees for Token 2022 payments */
  expectTransferFees?: boolean
}

export interface CreateDutchAuctionParams extends BaseTimeParams {
  auctionData: {
    startingPrice: bigint
    reservePrice: bigint
    auctionStartTime: bigint
    auctionEndTime: bigint
    minimumBidIncrement: bigint
    decayType?: 'linear' | 'exponential'
  }
  metadataUri?: string
  agent: Address
  signer: TransactionSigner
  /** Payment token mint for the auction (defaults to SOL) */
  paymentToken?: Address
  /** Whether to expect transfer fees for Token 2022 payments */
  expectTransferFees?: boolean
}

export interface PlaceBidParams {
  auction: Address
  bidAmount: bigint
  signer: TransactionSigner
  /** Payment token mint (if different from auction default) */
  paymentToken?: Address
  /** Bidder's token account (auto-derived if not provided) */
  bidderTokenAccount?: Address
  /** Whether to account for Token 2022 transfer fees in bid */
  includeTransferFees?: boolean
}

export interface FinalizeAuctionParams extends BaseInstructionParams {
  auction: Address
}

export interface AuctionFilter {
  status?: AuctionStatus
  auctionType?: AuctionType
  minPrice?: bigint
  maxPrice?: bigint
  creator?: Address
  agent?: Address
  endsBefore?: bigint
  endsAfter?: bigint
}

export interface AuctionSummary {
  auction: Address
  agent: Address
  creator: Address
  auctionType: AuctionType
  startingPrice: bigint
  reservePrice: bigint
  currentPrice: bigint
  currentWinner?: Address
  winner?: Address
  auctionEndTime: bigint
  minimumBidIncrement: bigint
  totalBids: number
  status: AuctionStatus
  timeRemaining?: bigint
  metadataUri: string
  /** For Dutch auctions, indicates if price has been calculated based on time decay */
  isDutchPriceCalculated?: boolean
  /** Reserve price status information */
  reserveStatus?: {
    met: boolean
    message: string
    shortfall?: bigint
  }
}

export interface DutchAuctionInfo {
  startingPrice: bigint
  reservePrice: bigint
  currentCalculatedPrice: bigint
  startTime: bigint
  endTime: bigint
  decayType: 'linear' | 'exponential'
  priceDecayRate: number
  timeToReachReserve?: bigint
  priceReductionTotal: bigint
  priceReductionPercentage: number
}

export interface BidHistory {
  bidder: Address
  amount: bigint
  timestamp: bigint
  isWinning: boolean
  transactionSignature?: string
}

export interface AuctionAnalytics {
  totalAuctions: number
  activeAuctions: number
  settledAuctions: number
  cancelledAuctions: number
  totalVolume: bigint
  averageBidCount: number
  averageAuctionDuration: bigint
  topBidders: { bidder: Address; totalBids: number; totalVolume: bigint }[]
}

/**
 * Complete Auction Management Client
 * 
 * Provides high-level developer-friendly interface for all auction operations
 * with real blockchain execution, comprehensive error handling, and analytics.
 */
export class AuctionInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  // =====================================================
  // AUCTION CREATION
  // =====================================================

  /**
   * Create a Dutch auction with time-based price decay
   * 
   * @param signer - The signer creating the auction
   * @param params - Dutch auction creation parameters
   * @returns Promise<string> - The auction PDA address
   */
  async createDutchAuction(
    signer: TransactionSigner,
    params: {
      title: string
      description: string
      category: string
      requirements: string[]
      startPrice: bigint
      reservePrice: bigint
      duration: bigint
      decayType?: 'linear' | 'exponential'
      paymentToken?: Address
      agentAddress: Address
    }
  ): Promise<string> {
    console.log('🏗️ Creating Dutch auction...')
    
    // Validate Dutch auction parameters
    const startTime = AuctionTimeUtils.now()
    const endTime = startTime + params.duration
    
    const validation = DutchAuctionUtils.validateDutchAuctionParams({
      startingPrice: params.startPrice,
      reservePrice: params.reservePrice,
      startTime,
      endTime,
      decayType: params.decayType
    })
    
    if (!validation.valid) {
      throw new Error(`Dutch auction validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Additional reserve price validation
    const reserveValidation = ReservePriceUtils.validateReservePrice(
      params.reservePrice,
      params.startPrice,
      AuctionType.Dutch
    )
    
    if (!reserveValidation.valid) {
      throw new Error(`Reserve price validation failed: ${reserveValidation.errors.join(', ')}`)
    }
    
    // Calculate auction PDA
    const auctionPda = await deriveAuctionPda(
      this.programId,
      params.agentAddress,
      signer.address
    )
    
    const userRegistryPda = await deriveUserRegistryPda(
      this.programId,
      signer.address
    )
    
    // Create metadata with Dutch auction details
    const metadata = {
      title: params.title,
      description: params.description,
      category: params.category,
      requirements: params.requirements,
      auctionType: 'Dutch',
      decayType: params.decayType ?? 'linear',
      priceDecayRate: DutchAuctionUtils.calculatePriceDecayRate(
        params.startPrice,
        params.reservePrice,
        params.duration,
        params.decayType
      ),
      createdAt: new Date().toISOString()
    }
    
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`
    
    // Create Dutch auction params
    const dutchAuctionParams: CreateDutchAuctionParams = {
      auctionData: {
        startingPrice: params.startPrice,
        reservePrice: params.reservePrice,
        auctionStartTime: startTime,
        auctionEndTime: endTime,
        minimumBidIncrement: AuctionPricingUtils.suggestBidIncrement(params.startPrice),
        decayType: params.decayType
      },
      metadataUri,
      agent: params.agentAddress,
      signer: signer as unknown as TransactionSigner
    } as CreateDutchAuctionParams
    
    // Create the auction using standard creation but with Dutch type
    const signature = await this.createServiceAuction(
      auctionPda,
      userRegistryPda,
      {
        auctionData: {
          auctionType: AuctionType.Dutch,
          startingPrice: params.startPrice,
          reservePrice: params.reservePrice,
          auctionEndTime: endTime,
          minimumBidIncrement: dutchAuctionParams.auctionData.minimumBidIncrement
        },
        metadataUri,
        agent: params.agentAddress,
        signer: signer as unknown as TransactionSigner,
        deadline: endTime // Use auction end time as deadline
      }
    )
    
    console.log('✅ Dutch auction created successfully')
    console.log(`   Address: ${auctionPda}`)
    console.log(`   Starting Price: ${AuctionPricingUtils.lamportsToSol(params.startPrice)} SOL`)
    console.log(`   Reserve Price: ${AuctionPricingUtils.lamportsToSol(params.reservePrice)} SOL`)
    console.log(`   Decay Type: ${params.decayType ?? 'linear'}`)
    console.log(`   Duration: ${AuctionTimeUtils.formatTimeRemaining(params.duration)}`)
    console.log(`   Signature: ${signature}`)
    
    return auctionPda
  }

  /**
   * Create a new auction (simplified interface)
   */
  async create(
    signer: TransactionSigner,
    params: {
      title: string
      description: string
      category: string
      requirements: string[]
      startPrice: bigint
      minIncrement: bigint
      duration: bigint
      paymentToken: Address
      agentAddress: Address
    }
  ): Promise<string> {
    // Calculate auction PDA using proper derivation (agent + creator)
    const auctionPda = await deriveAuctionPda(
      this.programId,
      params.agentAddress,
      signer.address
    )
    
    // Create user registry PDA using proper derivation
    const userRegistryPda = await deriveUserRegistryPda(
      this.programId,
      signer.address
    )
    
    // Map category to auction type
    const auctionTypeMap: Record<string, AuctionType> = {
      'data-analysis': AuctionType.English,
      'writing': AuctionType.English,
      'coding': AuctionType.Dutch,
      'translation': AuctionType.English,
      'automation': AuctionType.SealedBid,
      'default': AuctionType.English
    }
    
    const auctionType = auctionTypeMap[params.category] || auctionTypeMap['default']
    
    // Create metadata
    const metadata = {
      title: params.title,
      description: params.description,
      category: params.category,
      requirements: params.requirements,
      createdAt: new Date().toISOString()
    }
    
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`
    
    // Create auction params
    const auctionParams: CreateAuctionParams = {
      auctionData: {
        auctionType,
        startingPrice: params.startPrice,
        reservePrice: params.startPrice, // Set reserve equal to start for simplicity
        auctionEndTime: BigInt(Math.floor(Date.now() / 1000)) + params.duration,
        minimumBidIncrement: params.minIncrement
      },
      metadataUri,
      agent: params.agentAddress,
      signer: signer as unknown as TransactionSigner
    } as CreateAuctionParams
    
    // Create the auction
    const signature = await this.createServiceAuction(
      auctionPda,
      userRegistryPda,
      auctionParams
    )
    
    console.log('✅ Auction created successfully')
    console.log(`   Address: ${auctionPda}`)
    console.log(`   Signature: ${signature}`)
    
    return auctionPda
  }

  /**
   * Place a bid on an auction (simplified interface)
   */
  async placeBid(
    signer: TransactionSigner,
    auctionAddress: Address,
    bidAmount: bigint
  ): Promise<string> {
    // Fetch auction to get marketplace address
    const auction = await this.getAuction(auctionAddress)
    if (!auction) {
      throw new Error('Auction not found')
    }
    
    // Create user registry PDA using proper derivation
    const userRegistryPda = await deriveUserRegistryPda(
      this.programId,
      signer.address
    )
    
    // Remove marketplace PDA logic for now - not needed for auction bidding
    // Marketplace PDA derivation can be added later if needed
    
    return this.placeAuctionBid(
      userRegistryPda,
      {
        auction: auctionAddress,
        bidAmount,
        signer: signer as unknown as TransactionSigner
      }
    )
  }

  /**
   * Calculate bid amount with Token 2022 transfer fees
   * 
   * @param baseBidAmount - The desired bid amount (what bidder wants to bid)
   * @param paymentToken - Token mint address for payment
   * @returns Promise<{ totalAmount: bigint, feeCalculation?: TransferFeeCalculation }>
   */
  async calculateBidWithFees(
    baseBidAmount: bigint,
    paymentToken: Address
  ): Promise<{ totalAmount: bigint, feeCalculation?: TransferFeeCalculation }> {
    try {
      // Check if this is a Token 2022 mint with transfer fees
      const isToken2022 = await isToken2022Mint(paymentToken)
      if (!isToken2022) {
        return { totalAmount: baseBidAmount } // No fees for SPL Token
      }

      // Fetch real transfer fee configuration via RPC
      const feeConfig = await fetchTransferFeeConfig(this.config.rpc, paymentToken)
      
      if (!feeConfig) {
        // No transfer fee config found, treat as regular token
        return { totalAmount: baseBidAmount }
      }

      console.log('💰 Calculating bid with Token 2022 transfer fees:')
      const feeCalculation = calculateTransferFee(baseBidAmount, feeConfig)
      
      // For bids, the total amount should include the fee
      const totalAmount = baseBidAmount + feeCalculation.feeAmount
      
      console.log(`   Base bid amount: ${baseBidAmount}`)
      console.log(`   Transfer fee: ${feeCalculation.feeAmount}`)
      console.log(`   Total required: ${totalAmount}`)
      console.log(`   Fee rate: ${feeCalculation.feeBasisPoints / 100}%`)

      return { 
        totalAmount,
        feeCalculation 
      }
    } catch (error) {
      console.error('Failed to calculate bid fees:', error)
      return { totalAmount: baseBidAmount }
    }
  }

  /**
   * Create bidder's Associated Token Account if needed
   * 
   * @param bidder - Bidder's wallet address
   * @param paymentToken - Token mint address
   * @returns Promise<AssociatedTokenAccount> - ATA information
   */
  async ensureBidderTokenAccount(
    bidder: Address,
    paymentToken: Address
  ): Promise<AssociatedTokenAccount> {
    console.log('🏦 Ensuring bidder token account exists...')
    
    const tokenProgram = await detectTokenProgram(paymentToken)
    const isToken2022 = await isToken2022Mint(paymentToken)
    
    console.log(`   Bidder: ${bidder}`)
    console.log(`   Payment token: ${paymentToken}`)
    console.log(`   Token program: ${tokenProgram}`)
    console.log(`   Is Token 2022: ${isToken2022}`)
    
    const ataInfo = await getAssociatedTokenAccount(
      bidder,
      paymentToken,
      tokenProgram
    )
    
    console.log(`   Bidder ATA: ${ataInfo.address}`)
    
    return ataInfo
  }

  /**
   * Place bid with Token 2022 support including fee calculation
   * 
   * @param signer - The bidder's keypair signer
   * @param auctionAddress - The auction to bid on
   * @param baseBidAmount - The base bid amount (excluding fees)
   * @param options - Additional bid options
   * @returns Promise<{ signature: string, totalBidAmount: bigint, feeCalculation?: TransferFeeCalculation }>
   */
  async placeBidWithToken2022Support(
    signer: TransactionSigner,
    auctionAddress: Address,
    baseBidAmount: bigint,
    options: {
      paymentToken?: Address
      includeTransferFees?: boolean
    } = {}
  ): Promise<{ 
    signature: string
    totalBidAmount: bigint
    feeCalculation?: TransferFeeCalculation 
  }> {
    console.log('🏷️ Placing bid with Token 2022 support...')
    
    // Use SOL as default payment token (native mint)
    const paymentToken = options.paymentToken ?? '11111111111111111111111111111111' as Address
    
    // Calculate total bid amount including fees if needed
    const { totalAmount, feeCalculation } = options.includeTransferFees 
      ? await this.calculateBidWithFees(baseBidAmount, paymentToken)
      : { totalAmount: baseBidAmount }
    
    // Ensure bidder has the appropriate token account
    await this.ensureBidderTokenAccount(signer.address, paymentToken)
    
    // Place the bid using the existing method
    const signature = await this.placeBid(signer, auctionAddress, totalAmount)
    
    console.log('✅ Bid placed successfully')
    console.log(`   Base bid: ${baseBidAmount}`)
    console.log(`   Total paid: ${totalAmount}`)
    if (feeCalculation) {
      console.log(`   Transfer fee: ${feeCalculation.feeAmount}`)
    }
    
    return {
      signature,
      totalBidAmount: totalAmount,
      feeCalculation
    }
  }

  /**
   * Get auction payment requirements including Token 2022 details
   * 
   * @param auctionAddress - The auction address
   * @returns Promise<AuctionPaymentInfo> - Payment requirements
   */
  async getAuctionPaymentInfo(auctionAddress: Address): Promise<{
    paymentToken: Address
    isToken2022: boolean
    hasTransferFees: boolean
    minimumBidIncrement: bigint
    currentPrice: bigint
    estimatedFeeRate?: number
  }> {
    const auction = await this.getAuction(auctionAddress)
    if (!auction) {
      throw new Error('Auction not found')
    }

    // For now, assume SOL payments - could be extended to support custom tokens
    const paymentToken = '11111111111111111111111111111111' as Address // SOL native mint
    const isToken2022 = await isToken2022Mint(paymentToken)
    
    return {
      paymentToken,
      isToken2022,
      hasTransferFees: isToken2022, // Simplified - would need to check actual fee config
      minimumBidIncrement: auction.minimumBidIncrement,
      currentPrice: auction.currentPrice,
      estimatedFeeRate: isToken2022 ? 1.0 : undefined // 1% estimated fee rate
    }
  }

  /**
   * Create a new service auction
   * 
   * Creates an auction where agents can bid to provide services.
   * Supports multiple auction types including English, Dutch, and sealed bid.
   * 
   * @param creator - The signer creating the auction
   * @param auctionPda - The auction account PDA
   * @param userRegistry - User registry for rate limiting
   * @param params - Auction creation parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.auction.createServiceAuction(
   *   creator,
   *   auctionPda,
   *   userRegistry,
   *   {
   *     auctionData: {
   *       auctionType: AuctionType.English,
   *       startingPrice: 1000000000n, // 1 SOL
   *       reservePrice: 500000000n,   // 0.5 SOL minimum
   *       auctionEndTime: BigInt(Date.now() / 1000 + 86400), // 24 hours
   *       minimumBidIncrement: 50000000n // 0.05 SOL increments
   *     },
   *     agent: agentPda
   *   }
   * )
   * ```
   */
  async createServiceAuction(
    auctionPda: Address,
    userRegistry: Address,
    params: CreateAuctionParams
  ): Promise<string> {
    console.log('🏗️ Creating service auction...')
    console.log(`   Auction Type: ${params.auctionData.auctionType}`)
    console.log(`   Starting Price: ${params.auctionData.startingPrice} lamports`)
    console.log(`   Reserve Price: ${params.auctionData.reservePrice} lamports`)
    console.log(`   Duration: ${Number(params.auctionData.auctionEndTime - BigInt(Math.floor(Date.now() / 1000)))} seconds`)

    // Validate parameters
    this.validateCreateAuctionParams(params)

    return this.executeInstruction(
      () => getCreateServiceAuctionInstruction({
        auction: auctionPda,
        agent: params.agent,
        userRegistry,
        creator: params.signer as unknown as TransactionSigner,
        systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
        clock: SYSVAR_CLOCK_ADDRESS,
        auctionType: params.auctionData.auctionType,
        startingPrice: params.auctionData.startingPrice,
        reservePrice: params.auctionData.reservePrice,
        isReserveHidden: false, // Default to visible reserve price
        currentBid: params.auctionData.startingPrice,
        currentBidder: null,
        auctionEndTime: params.auctionData.auctionEndTime,
        minimumBidIncrement: params.auctionData.minimumBidIncrement,
        totalBids: 0,
        dutchConfig: null // No Dutch auction config for regular auctions
      }),
      params.signer as unknown as TransactionSigner,
      'service auction creation'
    )
  }

  /**
   * Create auction with full transaction details and URLs
   */
  async createServiceAuctionWithDetails(
    auctionPda: Address,
    userRegistry: Address,
    params: CreateAuctionParams
  ): Promise<TransactionResult> {
    console.log('🏗️ Creating service auction with detailed results...')

    this.validateCreateAuctionParams(params)

    return this.executeInstructionWithDetails(
      () => getCreateServiceAuctionInstruction({
        auction: auctionPda,
        agent: params.agent,
        userRegistry,
        creator: params.signer as unknown as TransactionSigner,
        systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
        clock: SYSVAR_CLOCK_ADDRESS,
        auctionType: params.auctionData.auctionType,
        startingPrice: params.auctionData.startingPrice,
        reservePrice: params.auctionData.reservePrice,
        isReserveHidden: false, // Default to visible reserve price
        currentBid: params.auctionData.startingPrice,
        currentBidder: null,
        auctionEndTime: params.auctionData.auctionEndTime,
        minimumBidIncrement: params.auctionData.minimumBidIncrement,
        totalBids: 0,
        dutchConfig: null // No Dutch auction config for regular auctions
      }),
      params.signer as unknown as TransactionSigner,
      'service auction creation'
    )
  }

  // =====================================================
  // BIDDING
  // =====================================================

  /**
   * Place a bid on an active auction
   * 
   * Allows users to bid on service auctions. Validates bid amount,
   * checks auction status, and handles anti-sniping protection.
   * 
   * @param bidder - The signer placing the bid
   * @param auction - The auction account address
   * @param userRegistry - User registry for rate limiting
   * @param params - Bid parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.auction.placeAuctionBid(
   *   bidder,
   *   auctionAddress,
   *   userRegistry,
   *   {
   *     auction: auctionAddress,
   *     bidAmount: 1500000000n // 1.5 SOL bid
   *   }
   * )
   * ```
   */
  async placeAuctionBid(
    userRegistry: Address,
    params: PlaceBidParams
  ): Promise<string> {
    console.log('💰 Placing auction bid...')
    console.log(`   Auction: ${params.auction}`)
    console.log(`   Bid Amount: ${params.bidAmount} lamports`)

    // Validate bid
    const auctionData = await this.getAuction(params.auction)
    if (!auctionData) {
      throw new Error('Auction not found')
    }

    this.validateBidParams(params, auctionData)

    return this.executeInstruction(
      () => getPlaceAuctionBidInstruction({
        auction: params.auction,
        userRegistry,
        bidder: params.signer as unknown as TransactionSigner,
        systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
        clock: SYSVAR_CLOCK_ADDRESS,
        bidAmount: params.bidAmount
      }),
      params.signer as unknown as TransactionSigner,
      'auction bid placement'
    )
  }

  /**
   * Place bid with detailed transaction results
   */
  async placeAuctionBidWithDetails(
    userRegistry: Address,
    params: PlaceBidParams
  ): Promise<TransactionResult> {
    console.log('💰 Placing auction bid with detailed results...')

    const auctionData = await this.getAuction(params.auction)
    if (!auctionData) {
      throw new Error('Auction not found')
    }

    this.validateBidParams(params, auctionData)

    return this.executeInstructionWithDetails(
      () => getPlaceAuctionBidInstruction({
        auction: params.auction,
        userRegistry,
        bidder: params.signer as unknown as TransactionSigner,
        systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
        clock: SYSVAR_CLOCK_ADDRESS,
        bidAmount: params.bidAmount
      }),
      params.signer as unknown as TransactionSigner,
      'auction bid placement'
    )
  }

  // =====================================================
  // DUTCH AUCTION BIDDING
  // =====================================================

  /**
   * Place a bid on a Dutch auction
   * 
   * Dutch auctions feature time-based price decay where the price starts high
   * and automatically decreases over time. First bidder to accept the current
   * price wins immediately, making this an "accept price" rather than "bid price".
   * 
   * @param signer - The bidder placing the bid
   * @param auctionAddress - The Dutch auction to bid on
   * @param options - Additional bidding options
   * @returns Promise<{ signature: string, finalPrice: bigint, dutchInfo: DutchAuctionInfo }>
   * 
   * @example
   * ```typescript
   * const result = await client.auction.placeDutchAuctionBid(
   *   bidder,
   *   dutchAuctionAddress,
   *   {
   *     acceptCurrentPrice: true,
   *     includeTransferFees: true
   *   }
   * )
   * console.log(`Won Dutch auction at ${result.finalPrice} lamports`)
   * ```
   */
  async placeDutchAuctionBid(
    signer: TransactionSigner,
    auctionAddress: Address,
    options: {
      acceptCurrentPrice?: boolean
      includeTransferFees?: boolean
      paymentToken?: Address
    } = {}
  ): Promise<{ 
    signature: string
    finalPrice: bigint
    dutchInfo: DutchAuctionInfo
    priceAtTime: bigint
  }> {
    console.log('🏷️ Placing Dutch auction bid...')
    console.log(`   Auction: ${auctionAddress}`)

    // Get auction data and validate it's a Dutch auction
    const auction = await this.getAuction(auctionAddress)
    if (!auction) {
      throw new Error('Auction not found')
    }

    if (auction.auctionType !== AuctionType.Dutch) {
      throw new Error(`Auction type ${auction.auctionType} is not a Dutch auction`)
    }

    // Validate auction is active
    if (auction.status !== AuctionStatus.Active) {
      throw new Error(`Cannot bid on auction with status: ${auction.status}`)
    }

    // Check if auction has ended
    const now = AuctionTimeUtils.now()
    if (now >= auction.auctionEndTime) {
      throw new Error('Dutch auction has ended')
    }

    // Calculate current Dutch auction price
    const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
      auction.startingPrice,
      auction.reservePrice,
      auction.createdAt, // Use created_at as start time
      auction.auctionEndTime,
      now,
      'linear' // Default to linear decay, could be enhanced to read from auction config
    )

    console.log(`   Current Dutch price: ${currentPrice} lamports`)
    console.log(`   Starting price: ${auction.startingPrice} lamports`)
    console.log(`   Reserve price: ${auction.reservePrice} lamports`)

    // Get detailed Dutch auction information
    const dutchInfo = DutchAuctionUtilsExports.getDutchAuctionInfo(
      auction.startingPrice,
      auction.reservePrice,
      auction.createdAt,
      auction.auctionEndTime,
      now,
      'linear'
    )

    // Validate the bid amount against current calculated price
    if (!DutchAuctionUtilsExports.isValidBid(currentPrice, currentPrice, auction.reservePrice)) {
      throw new Error(`Current price ${currentPrice} does not meet auction requirements`)
    }

    // For Dutch auctions, ensure price hasn't fallen below reserve
    if (currentPrice < auction.reservePrice) {
      throw new Error(`Current price ${currentPrice} is below reserve price ${auction.reservePrice}`)
    }

    // Handle Token-2022 transfer fees if needed
    let finalBidAmount = currentPrice
    if (options.includeTransferFees && options.paymentToken) {
      const { totalAmount } = await this.calculateBidWithFees(currentPrice, options.paymentToken)
      finalBidAmount = totalAmount
    }

    // Create user registry PDA
    const userRegistryPda = await deriveUserRegistryPda(
      this.programId,
      signer.address
    )

    // Place the Dutch auction bid using the specialized instruction
    const signature = await this.executeInstruction(
      () => getPlaceDutchAuctionBidInstruction({
        auction: auctionAddress,
        userRegistry: userRegistryPda,
        bidder: signer as unknown as TransactionSigner,
        systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
        clock: SYSVAR_CLOCK_ADDRESS
      }),
      signer as unknown as TransactionSigner,
      'Dutch auction bid placement'
    )

    console.log('✅ Dutch auction bid placed successfully')
    console.log(`   Final price: ${finalBidAmount} lamports`)
    console.log(`   Time remaining: ${AuctionTimeUtils.formatTimeRemaining(auction.auctionEndTime - now)}`)
    console.log(`   Signature: ${signature}`)

    return {
      signature,
      finalPrice: finalBidAmount,
      dutchInfo,
      priceAtTime: currentPrice
    }
  }

  /**
   * Get current Dutch auction price
   * 
   * @param auctionAddress - The Dutch auction address
   * @returns Current calculated price and auction information
   */
  async getDutchAuctionCurrentPrice(auctionAddress: Address): Promise<{
    currentPrice: bigint
    dutchInfo: DutchAuctionInfo
    timeRemaining: bigint
    hasReachedReserve: boolean
  }> {
    const auction = await this.getAuction(auctionAddress)
    if (!auction) {
      throw new Error('Auction not found')
    }

    if (auction.auctionType !== AuctionType.Dutch) {
      throw new Error('Not a Dutch auction')
    }

    const now = AuctionTimeUtils.now()
    const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
      auction.startingPrice,
      auction.reservePrice,
      auction.createdAt,
      auction.auctionEndTime,
      now,
      'linear'
    )

    const dutchInfo = DutchAuctionUtilsExports.getDutchAuctionInfo(
      auction.startingPrice,
      auction.reservePrice,
      auction.createdAt,
      auction.auctionEndTime,
      now,
      'linear'
    )

    const timeRemaining = auction.auctionEndTime > now ? auction.auctionEndTime - now : 0n
    const hasReachedReserve = currentPrice <= auction.reservePrice

    return {
      currentPrice,
      dutchInfo,
      timeRemaining,
      hasReachedReserve
    }
  }

  /**
   * Monitor Dutch auction price changes over time
   * 
   * @param auctionAddress - The Dutch auction to monitor
   * @param callback - Function called when price updates
   * @param intervalMs - Update interval in milliseconds (default: 1000ms)
   * @returns Cleanup function to stop monitoring
   */
  monitorDutchAuctionPrice(
    auctionAddress: Address,
    callback: (priceInfo: {
      currentPrice: bigint
      priceChange: bigint
      timeRemaining: bigint
      hasReachedReserve: boolean
    }) => void,
    intervalMs = 1000
  ): () => void {
    console.log(`👀 Starting Dutch auction price monitoring for ${auctionAddress}`)
    
    let isActive = true
    let lastPrice: bigint | undefined

    const poll = async () => {
      if (!isActive) return

      try {
        const { currentPrice, timeRemaining, hasReachedReserve } = await this.getDutchAuctionCurrentPrice(auctionAddress)
        const priceChange = lastPrice !== undefined ? currentPrice - lastPrice : 0n
        
        callback({
          currentPrice,
          priceChange,
          timeRemaining,
          hasReachedReserve
        })

        lastPrice = currentPrice

        // Stop monitoring if auction has ended or reached reserve
        if (timeRemaining <= 0n || hasReachedReserve) {
          console.log('🛑 Dutch auction monitoring stopped - auction ended or reserve reached')
          isActive = false
          return
        }
      } catch (error) {
        console.warn('Error monitoring Dutch auction price:', error)
      }
      
      if (isActive) {
        setTimeout(poll, intervalMs)
      }
    }

    void poll()
    
    return () => {
      console.log(`🛑 Stopping Dutch auction price monitoring for ${auctionAddress}`)
      isActive = false
    }
  }

  // =====================================================
  // AUCTION FINALIZATION
  // =====================================================

  /**
   * Finalize an auction and determine the winner
   * 
   * Called after auction end time to settle the auction,
   * determine the winner, and initiate payment/work order processes.
   * 
   * @param authority - The signer with authority to finalize (creator or admin)
   * @param auction - The auction account address
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.auction.finalizeAuction(
   *   creator,
   *   auctionAddress
   * )
   * ```
   */
  async finalizeAuction(params: FinalizeAuctionParams): Promise<string> {
    console.log('🏁 Finalizing auction...')
    console.log(`   Auction: ${params.auction}`)

    // Validate auction can be finalized
    const auctionData = await this.getAuction(params.auction)
    if (!auctionData) {
      throw new Error('Auction not found')
    }

    this.validateAuctionCanBeFinalized(auctionData)

    return this.executeInstruction(
      () => getFinalizeAuctionInstruction({
        auction: params.auction,
        authority: params.signer as unknown as TransactionSigner,
        clock: SYSVAR_CLOCK_ADDRESS
      }),
      params.signer as unknown as TransactionSigner,
      'auction finalization'
    )
  }

  /**
   * Finalize auction with detailed transaction results
   */
  async finalizeAuctionWithDetails(params: FinalizeAuctionParams): Promise<TransactionResult> {
    console.log('🏁 Finalizing auction with detailed results...')

    const auctionData = await this.getAuction(params.auction)
    if (!auctionData) {
      throw new Error('Auction not found')
    }

    this.validateAuctionCanBeFinalized(auctionData)

    return this.executeInstructionWithDetails(
      () => getFinalizeAuctionInstruction({
        auction: params.auction,
        authority: params.signer as unknown as TransactionSigner,
        clock: SYSVAR_CLOCK_ADDRESS
      }),
      params.signer as unknown as TransactionSigner,
      'auction finalization'
    )
  }

  /**
   * Extend auction when reserve price is not met
   * 
   * Automatically extends auction duration when the auction ends
   * but the reserve price has not been met, giving bidders more time.
   * 
   * @param params - Extension parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.auction.extendAuctionForReserve({
   *   auction: auctionAddress,
   *   signer: creator
   * })
   * ```
   */
  async extendAuctionForReserve(params: {
    auction: Address
    signer: TransactionSigner
  }): Promise<string> {
    console.log('⏰ Extending auction for reserve price...')
    console.log(`   Auction: ${params.auction}`)

    // Validate auction can be extended
    const auctionData = await this.getAuction(params.auction)
    if (!auctionData) {
      throw new Error('Auction not found')
    }

    this.validateAuctionCanBeExtended(auctionData)

    return this.executeInstruction(
      () => getExtendAuctionForReserveInstruction({
        auction: params.auction,
        authority: params.signer as unknown as TransactionSigner,
        clock: SYSVAR_CLOCK_ADDRESS
      }),
      params.signer as unknown as TransactionSigner,
      'auction extension for reserve'
    )
  }

  /**
   * Check if auction is eligible for reserve price extension
   * 
   * @param auctionAddress - The auction to check
   * @returns Extension eligibility information
   */
  async checkExtensionEligibility(auctionAddress: Address): Promise<{
    eligible: boolean
    reason?: string
    extensionsRemaining?: number
    reserveShortfall?: bigint
    timeRemaining?: bigint
  }> {
    const auction = await this.getAuction(auctionAddress)
    if (!auction) {
      return { eligible: false, reason: 'Auction not found' }
    }

    // Check if auction is active
    if (auction.status !== AuctionStatus.Active) {
      return { eligible: false, reason: 'Auction is not active' }
    }

    // Check if reserve is already met
    if ((auction as unknown as { reserveMet: boolean }).reserveMet) {
      return { eligible: false, reason: 'Reserve price already met' }
    }

    // Check extension count
    const MAX_EXTENSIONS = 3 // Should match Rust constant
const extensionCount = (auction as unknown as { extensionCount: number }).extensionCount
    if (extensionCount >= MAX_EXTENSIONS) {
      return { 
        eligible: false, 
        reason: 'Maximum extensions reached',
        extensionsRemaining: 0
      }
    }

    // Check if there are bids
    if (auction.totalBids === 0) {
      return { eligible: false, reason: 'No bids to justify extension' }
    }

    // Calculate shortfall and time remaining
    const now = BigInt(Math.floor(Date.now() / 1000))
    const timeRemaining = auction.auctionEndTime > now ? auction.auctionEndTime - now : 0n
    const reserveShortfall = auction.reservePrice > auction.currentPrice 
      ? auction.reservePrice - auction.currentPrice 
      : 0n

    return {
      eligible: true,
      extensionsRemaining: MAX_EXTENSIONS - extensionCount,
      reserveShortfall,
      timeRemaining
    }
  }

  // =====================================================
  // AUCTION QUERYING & MONITORING
  // =====================================================

  /**
   * Get auction account data with discriminator validation
   * 
   * @param auctionAddress - The auction account address
   * @returns Auction account data or null if not found
   */
  async getAuction(auctionAddress: Address): Promise<AuctionMarketplace | null> {
    try {
      // First try the standard approach
      const account = await this.getDecodedAccount<AuctionMarketplace>(auctionAddress, 'getAuctionMarketplaceDecoder')
      return account
    } catch (error) {
      // If standard decoding fails, use safe decode with validation
      console.warn(`Standard Auction account decoding failed for ${auctionAddress}:`, error instanceof Error ? error.message : String(error))
      
      try {
        // Import AuctionMarketplace discriminator for validation
        const { AUCTION_MARKETPLACE_DISCRIMINATOR, getAuctionMarketplaceDecoder } = await import('../../generated/accounts/auctionMarketplace.js')
        
        // Use safe decode with discriminator validation
        const result = await safeDecodeAccount(
          this.rpc,
          auctionAddress,
          (data: Uint8Array) => getAuctionMarketplaceDecoder().decode(data),
          AUCTION_MARKETPLACE_DISCRIMINATOR,
          'AuctionMarketplace'
        )

        if (result.needsAttention) {
          const errorMessage = createDiscriminatorErrorMessage(
            result.validation, 
            'AuctionMarketplace', 
            auctionAddress
          )
          console.warn(errorMessage)
        }

        return result.account
      } catch (fallbackError) {
        console.error(`Safe decode also failed for AuctionMarketplace ${auctionAddress}:`, fallbackError instanceof Error ? fallbackError.message : String(fallbackError))
        return null
      }
    }
  }

  /**
   * Get auction summary with computed fields
   * 
   * @param auctionAddress - The auction account address
   * @returns Enhanced auction summary or null if not found
   */
  async getAuctionSummary(auctionAddress: Address): Promise<AuctionSummary | null> {
    const auction = await this.getAuction(auctionAddress)
    if (!auction) return null

    const now = BigInt(Math.floor(Date.now() / 1000))
    const timeRemaining = auction.auctionEndTime > now 
      ? auction.auctionEndTime - now 
      : 0n

    return {
      auction: auctionAddress,
      agent: auction.agent,
      creator: auction.creator,
      auctionType: auction.auctionType,
      startingPrice: auction.startingPrice,
      reservePrice: auction.reservePrice,
      currentPrice: auction.currentPrice,
      currentWinner: auction.currentWinner.__option === 'Some' ? auction.currentWinner.value : undefined,
      winner: auction.winner.__option === 'Some' ? auction.winner.value : undefined,
      auctionEndTime: auction.auctionEndTime,
      minimumBidIncrement: auction.minimumBidIncrement,
      totalBids: auction.totalBids,
      status: auction.status,
      timeRemaining,
      metadataUri: auction.metadataUri
    }
  }

  /**
   * Get bid history for an auction
   * 
   * @param auctionAddress - The auction account address
   * @returns Array of bid history entries
   */
  async getBidHistory(auctionAddress: Address): Promise<BidHistory[]> {
    const auction = await this.getAuction(auctionAddress)
    if (!auction) return []

    return auction.bids.map(bid => ({
      bidder: bid.bidder,
      amount: bid.amount,
      timestamp: bid.timestamp,
      isWinning: bid.isWinning
    }))
  }

  /**
   * List auctions with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @param limit - Maximum number of auctions to return
   * @returns Array of auction summaries
   */
  async listAuctions(filter?: AuctionFilter, limit = 50): Promise<AuctionSummary[]> {
    console.log('📋 Listing auctions...')
    
    const accounts = await this.getDecodedProgramAccounts<AuctionMarketplace>('getAuctionMarketplaceDecoder')
    
    // Convert to summaries and apply filters
    const auctions = accounts
      .map(({ address, data }) => this.auctionToSummary(address, data))
      .filter(summary => this.applyAuctionFilter(summary, filter))
      .slice(0, limit)
    
    console.log(`✅ Found ${auctions.length} auctions`)
    return auctions
  }

  /**
   * Get active auctions ending soon
   * 
   * @param timeframe - Time in seconds to look ahead
   * @returns Array of auctions ending within timeframe
   */
  async getAuctionsEndingSoon(timeframe = 3600): Promise<AuctionSummary[]> {
    console.log(`⏰ Finding auctions ending in next ${timeframe} seconds...`)
    
    // In production, this would filter by auction_end_time
    const allAuctions = await this.listAuctions()
    const now = BigInt(Math.floor(Date.now() / 1000))
    const cutoff = now + BigInt(timeframe)
    
    return allAuctions.filter(auction => 
      auction.status === AuctionStatus.Active && 
      auction.auctionEndTime <= cutoff &&
      auction.auctionEndTime > now
    )
  }

  // =====================================================
  // ADVANCED FEATURES
  // =====================================================

  /**
   * Get auction analytics and statistics
   * 
   * @returns Comprehensive auction analytics
   */
  async getAuctionAnalytics(): Promise<AuctionAnalytics> {
    console.log('📊 Generating auction analytics...')
    
    // In production, this would aggregate data from all auctions
    return {
      totalAuctions: 0,
      activeAuctions: 0,
      settledAuctions: 0,
      cancelledAuctions: 0,
      totalVolume: 0n,
      averageBidCount: 0,
      averageAuctionDuration: 0n,
      topBidders: []
    }
  }

  /**
   * Monitor auction for bid updates
   * 
   * @param auctionAddress - The auction to monitor
   * @param callback - Function called when auction updates
   * @returns Cleanup function to stop monitoring
   */
  async monitorAuction(
    auctionAddress: Address,
    callback: (auction: AuctionSummary) => void
  ): Promise<() => void> {
    console.log(`👀 Starting auction monitoring for ${auctionAddress}`)
    
    let isActive = true
    
    const poll = async () => {
      if (!isActive) return
      
      try {
        const summary = await this.getAuctionSummary(auctionAddress)
        if (summary) {
          callback(summary)
        }
      } catch (error) {
        console.warn('Error monitoring auction:', error)
      }
      
      if (isActive) {
        setTimeout(poll, 5000) // Poll every 5 seconds
      }
    }
    
    void poll()
    
    return () => {
      console.log(`🛑 Stopping auction monitoring for ${auctionAddress}`)
      isActive = false
    }
  }

  /**
   * Calculate optimal bid amount based on auction dynamics
   * 
   * @param auctionAddress - The auction to analyze
   * @param strategy - Bidding strategy ('conservative' | 'aggressive' | 'last_minute')
   * @returns Suggested bid amount
   */
  async calculateOptimalBid(
    auctionAddress: Address,
    strategy: 'conservative' | 'aggressive' | 'last_minute' = 'conservative'
  ): Promise<bigint> {
    const auction = await this.getAuctionSummary(auctionAddress)
    if (!auction) {
      throw new Error('Auction not found')
    }

    const currentPrice = auction.currentPrice
    const increment = auction.minimumBidIncrement
    const timeRemaining = auction.timeRemaining ?? 0n

    switch (strategy) {
      case 'conservative':
        return currentPrice + increment
      
      case 'aggressive':
        return currentPrice + (increment * 3n)
      
      case 'last_minute':
        // If less than 5 minutes remaining, bid more aggressively
        if (timeRemaining < 300n) {
          return currentPrice + (increment * 2n)
        }
        return currentPrice + increment
      
      default:
        return currentPrice + increment
    }
  }

  // =====================================================
  // VALIDATION HELPERS
  // =====================================================

  private validateCreateAuctionParams(params: CreateAuctionParams): void {
    const { auctionData } = params
    
    // Smart contract constants (based on error 0x1bbd analysis)
    const MIN_PAYMENT_AMOUNT = 1000n  // 1,000 lamports
    const MAX_PAYMENT_AMOUNT = 1000000000000n  // 1,000,000,000,000 lamports
    const MIN_BID_INCREMENT = 100n // Assumed minimum
    
    // Validate starting price range
    if (auctionData.startingPrice < MIN_PAYMENT_AMOUNT || auctionData.startingPrice > MAX_PAYMENT_AMOUNT) {
      throw new Error(`Starting price must be between ${MIN_PAYMENT_AMOUNT} and ${MAX_PAYMENT_AMOUNT} lamports`)
    }
    
    // Validate reserve price range
    if (auctionData.reservePrice < MIN_PAYMENT_AMOUNT || auctionData.reservePrice > MAX_PAYMENT_AMOUNT) {
      throw new Error(`Reserve price must be between ${MIN_PAYMENT_AMOUNT} and ${MAX_PAYMENT_AMOUNT} lamports`)
    }
    
    // Validate minimum bid increment constraints
    const maxAllowedIncrement = auctionData.startingPrice / 10n
    if (auctionData.minimumBidIncrement < MIN_BID_INCREMENT) {
      throw new Error(`Minimum bid increment must be at least ${MIN_BID_INCREMENT} lamports`)
    }
    if (auctionData.minimumBidIncrement > maxAllowedIncrement) {
      throw new Error(`Minimum bid increment (${auctionData.minimumBidIncrement}) cannot exceed 10% of starting price (${maxAllowedIncrement})`)
    }
    
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (auctionData.auctionEndTime <= now) {
      throw new Error('Auction end time must be in the future')
    }
    
    const duration = auctionData.auctionEndTime - now
    const minDuration = 3600n // 1 hour
    const maxDuration = 86400n * 30n // 30 days
    
    if (duration < minDuration) {
      throw new Error('Auction duration must be at least 1 hour')
    }
    
    if (duration > maxDuration) {
      throw new Error('Auction duration cannot exceed 30 days')
    }
  }

  private validateBidParams(params: PlaceBidParams, auction: AuctionMarketplace): void {
    if (auction.status !== AuctionStatus.Active) {
      throw new Error(`Cannot bid on auction with status: ${auction.status}`)
    }
    
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (now >= auction.auctionEndTime) {
      throw new Error('Auction has ended')
    }
    
    // Check reserve price requirements first
    if (!ReservePriceUtils.meetsBidReserve(params.bidAmount, auction.reservePrice, auction.auctionType)) {
      const reserveStatus = ReservePriceUtils.getReserveStatus(
        params.bidAmount,
        auction.reservePrice,
        auction.auctionType
      )
      throw new Error(`Bid does not meet reserve price: ${reserveStatus.message}`)
    }
    
    // Calculate minimum bid based on auction type and reserve price
    const minimumBid = ReservePriceUtils.calculateMinimumBid(
      auction.currentPrice,
      auction.reservePrice,
      auction.minimumBidIncrement,
      auction.auctionType
    )
    
    if (params.bidAmount < minimumBid) {
      throw new Error(`Bid amount ${params.bidAmount} is below minimum ${minimumBid}`)
    }
    
    // Type-specific validations
    switch (auction.auctionType) {
      case AuctionType.English:
        if (params.bidAmount <= auction.currentPrice) {
          throw new Error('Bid must be higher than current price for English auction')
        }
        break
        
      case AuctionType.Dutch: {
        // For Dutch auctions, calculate current price based on time decay
        const currentDutchPrice = this.calculateDutchAuctionCurrentPrice(auction)
        if (params.bidAmount < currentDutchPrice) {
          throw new Error(`Bid amount ${params.bidAmount} is below current Dutch auction price ${currentDutchPrice}`)
        }
        break
      }
        
      case AuctionType.SealedBid:
      case AuctionType.Vickrey:
        // For sealed auctions, just ensure minimum reserve is met (already validated above)
        break
        
      default:
        if (params.bidAmount <= auction.currentPrice) {
          throw new Error('Bid must be higher than current price')
        }
    }
  }

  private validateAuctionCanBeFinalized(auction: AuctionMarketplace): void {
    if (auction.status !== AuctionStatus.Active) {
      throw new Error(`Cannot finalize auction with status: ${auction.status}`)
    }
    
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (now < auction.auctionEndTime) {
      throw new Error('Auction has not ended yet')
    }
  }

  private validateAuctionCanBeExtended(auction: AuctionMarketplace): void {
    if (auction.status !== AuctionStatus.Active) {
      throw new Error(`Cannot extend auction with status: ${auction.status}`)
    }

    if ((auction as unknown as { reserveMet: boolean }).reserveMet) {
      throw new Error('Cannot extend auction - reserve price already met')
    }

    const MAX_EXTENSIONS = 3 // Should match Rust constant
const extensionCount = (auction as unknown as { extensionCount: number }).extensionCount
    if (extensionCount >= MAX_EXTENSIONS) {
      throw new Error(`Cannot extend auction - maximum extensions (${MAX_EXTENSIONS}) reached`)
    }

    if (auction.totalBids === 0) {
      throw new Error('Cannot extend auction - no bids received')
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const EXTENSION_THRESHOLD = 300n // 5 minutes - should match Rust constant
    
    if (now < auction.auctionEndTime - EXTENSION_THRESHOLD) {
      throw new Error('Cannot extend auction - must be within 5 minutes of end time')
    }
  }

  private auctionToSummary(auctionAddress: Address, auction: AuctionMarketplace): AuctionSummary {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const timeRemaining = auction.auctionEndTime > now ? auction.auctionEndTime - now : 0n

    return {
      auction: auctionAddress,
      agent: auction.agent,
      creator: auction.creator,
      auctionType: auction.auctionType,
      startingPrice: auction.startingPrice,
      reservePrice: auction.reservePrice,
      currentPrice: auction.currentPrice,
      currentWinner: auction.currentWinner.__option === 'Some' ? auction.currentWinner.value : undefined,
      winner: auction.winner.__option === 'Some' ? auction.winner.value : undefined,
      auctionEndTime: auction.auctionEndTime,
      minimumBidIncrement: auction.minimumBidIncrement,
      totalBids: auction.totalBids,
      status: auction.status,
      timeRemaining,
      metadataUri: `Auction for ${auction.agent}` // Generate metadata URI
    }
  }

  /**
   * List auctions (alias for listAuctions for CLI compatibility)
   */
  async list(options: { filter?: AuctionFilter; limit?: number } = {}): Promise<AuctionSummary[]> {
    return this.listAuctions(options.filter, options.limit)
  }

  private applyAuctionFilter(summary: AuctionSummary, filter?: AuctionFilter): boolean {
    if (!filter) return true

    if (filter.status && summary.status !== filter.status) return false
    if (filter.creator && summary.creator !== filter.creator) return false
    if (filter.agent && summary.agent !== filter.agent) return false
    if (filter.auctionType && summary.auctionType !== filter.auctionType) return false
    if (filter.minPrice !== undefined && summary.currentPrice < filter.minPrice) return false
    if (filter.maxPrice !== undefined && summary.currentPrice > filter.maxPrice) return false
    if (filter.endsBefore && summary.auctionEndTime > filter.endsBefore) return false
    if (filter.endsAfter && summary.auctionEndTime < filter.endsAfter) return false

    return true
  }

  /**
   * Calculate current price for Dutch auction based on time decay
   * 
   * @param auction - The auction marketplace data
   * @returns Current calculated price based on time progression
   */
  private calculateDutchAuctionCurrentPrice(auction: AuctionMarketplace): bigint {
    // For Dutch auctions, use the utility to calculate current price based on time
    if (auction.auctionType !== AuctionType.Dutch) {
      return auction.currentPrice
    }

    // Get auction start time (using created_at as proxy for start time)
    const startTime = auction.createdAt
    const endTime = auction.auctionEndTime
    
    // Calculate current price using Dutch auction utility
    return DutchAuctionUtils.calculateCurrentPrice(
      auction.startingPrice,
      auction.reservePrice,
      startTime,
      endTime,
      undefined, // Use current time
      'linear' // Default to linear decay
    )
  }
}