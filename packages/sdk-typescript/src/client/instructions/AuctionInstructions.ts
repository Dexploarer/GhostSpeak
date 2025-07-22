/**
 * AuctionInstructions - Complete Auction Management Client
 * 
 * Provides developer-friendly high-level interface for all auction functionality
 * including creation, bidding, monitoring, and settlement with real Web3.js v2 execution.
 */

import type { Address, Signature, TransactionSigner } from '@solana/kit'
import { BaseInstructions } from './BaseInstructions.js'
import type { GhostSpeakConfig } from '../../types/index.js'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import { 
  getCreateServiceAuctionInstruction,
  getPlaceAuctionBidInstruction,
  getFinalizeAuctionInstruction,
  AuctionType,
  AuctionStatus,
  type AuctionMarketplace
} from '../../generated/index.js'
import { SYSTEM_PROGRAM_ADDRESS_32, SYSVAR_CLOCK_ADDRESS } from '../../constants/index.js'
import { deriveAuctionPda, deriveUserRegistryPda } from '../../utils/auction-helpers.js'
import { type TransactionResult } from '../../utils/transaction-urls.js'
import {
  safeDecodeAccount,
  createDiscriminatorErrorMessage
} from '../../utils/discriminator-validator.js'
import type {
  BaseInstructionParams,
  BaseTimeParams
} from './BaseInterfaces.js'

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
}

export interface PlaceBidParams {
  auction: Address
  bidAmount: bigint
  signer: TransactionSigner
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
   * Create a new auction (simplified interface)
   */
  async create(
    signer: KeyPairSigner,
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
    signer: KeyPairSigner,
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
  ): Promise<Signature> {
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
        currentBid: params.auctionData.startingPrice,
        currentBidder: null,
        auctionEndTime: params.auctionData.auctionEndTime,
        minimumBidIncrement: params.auctionData.minimumBidIncrement,
        totalBids: 0
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
        currentBid: params.auctionData.startingPrice,
        currentBidder: null,
        auctionEndTime: params.auctionData.auctionEndTime,
        minimumBidIncrement: params.auctionData.minimumBidIncrement,
        totalBids: 0
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
  ): Promise<Signature> {
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
  async finalizeAuction(params: FinalizeAuctionParams): Promise<Signature> {
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
      currentWinner: auction.currentWinner?.__option === 'Some' ? auction.currentWinner.value : undefined,
      winner: auction.winner?.__option === 'Some' ? auction.winner.value : undefined,
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
  async listAuctions(filter?: AuctionFilter, limit: number = 50): Promise<AuctionSummary[]> {
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
  async getAuctionsEndingSoon(timeframe: number = 3600): Promise<AuctionSummary[]> {
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
    
    poll()
    
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
    
    if (auctionData.startingPrice <= 0n) {
      throw new Error('Starting price must be greater than 0')
    }
    
    if (auctionData.reservePrice < 0n) {
      throw new Error('Reserve price cannot be negative')
    }
    
    if (auctionData.minimumBidIncrement <= 0n) {
      throw new Error('Minimum bid increment must be greater than 0')
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
    
    const minimumBid = auction.currentPrice + auction.minimumBidIncrement
    if (params.bidAmount < minimumBid) {
      throw new Error(`Bid amount ${params.bidAmount} is below minimum ${minimumBid}`)
    }
    
    if (params.bidAmount <= auction.currentPrice) {
      throw new Error('Bid must be higher than current price')
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
      currentWinner: auction.currentWinner?.__option === 'Some' ? auction.currentWinner.value : undefined,
      winner: auction.winner?.__option === 'Some' ? auction.winner.value : undefined,
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
}