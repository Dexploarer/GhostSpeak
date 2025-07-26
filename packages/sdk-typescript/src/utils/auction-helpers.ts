/**
 * Auction Helper Utilities
 * 
 * Provides utility functions for auction operations including PDA derivation,
 * validation, calculation helpers, and auction analytics.
 */

import './text-encoder-polyfill.js'
import type { Address } from '@solana/kit'
import { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder } from '@solana/kit'
import { AuctionType, AuctionStatus } from '../generated/index.js'

/**
 * Derive auction PDA address
 * 
 * @param programId - The program ID
 * @param agent - Agent public key
 * @param creator - Creator public key
 * @returns The auction PDA address
 */
export async function deriveAuctionPda(
  programId: Address,
  agent: Address,
  creator: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode('auction')),
      getAddressEncoder().encode(agent),
      getAddressEncoder().encode(creator)
    ]
  })
  return address
}

/**
 * Derive user registry PDA address
 * 
 * @param programId - The program ID
 * @param user - User public key
 * @returns The user registry PDA address
 */
export async function deriveUserRegistryPda(
  programId: Address,
  user: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode('user_registry')),
      getAddressEncoder().encode(user)
    ]
  })
  return address
}

/**
 * Auction time utilities
 */
export class AuctionTimeUtils {
  /**
   * Get current timestamp in seconds
   */
  static now(): bigint {
    return BigInt(Math.floor(Date.now() / 1000))
  }

  /**
   * Convert hours to seconds
   */
  static hoursToSeconds(hours: number): bigint {
    return BigInt(hours * 3600)
  }

  /**
   * Convert days to seconds
   */
  static daysToSeconds(days: number): bigint {
    return BigInt(days * 24 * 3600)
  }

  /**
   * Get auction end time from duration
   */
  static getEndTime(durationHours: number): bigint {
    return this.now() + this.hoursToSeconds(durationHours)
  }

  /**
   * Check if auction has ended
   */
  static hasEnded(endTime: bigint): boolean {
    return this.now() >= endTime
  }

  /**
   * Get time remaining in seconds
   */
  static getTimeRemaining(endTime: bigint): bigint {
    const remaining = endTime - this.now()
    return remaining > 0n ? remaining : 0n
  }

  /**
   * Format time remaining as human-readable string
   */
  static formatTimeRemaining(seconds: bigint): string {
    const totalSeconds = Number(seconds)
    
    if (totalSeconds <= 0) return 'Ended'
    
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
}

/**
 * Auction pricing utilities
 */
export class AuctionPricingUtils {
  /**
   * Convert SOL to lamports
   */
  static solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * 1_000_000_000))
  }

  /**
   * Convert lamports to SOL
   */
  static lamportsToSol(lamports: bigint): number {
    return Number(lamports) / 1_000_000_000
  }

  /**
   * Calculate minimum bid for auction
   */
  static calculateMinimumBid(currentPrice: bigint, increment: bigint): bigint {
    return currentPrice + increment
  }

  /**
   * Calculate bid increment percentage
   */
  static calculateIncrementPercentage(currentPrice: bigint, increment: bigint): number {
    if (currentPrice === 0n) return 0
    return Number((increment * 100n) / currentPrice)
  }

  /**
   * Suggest optimal bid increment based on auction value
   */
  static suggestBidIncrement(startingPrice: bigint): bigint {
    const priceInSol = this.lamportsToSol(startingPrice)
    
    if (priceInSol < 1) {
      return this.solToLamports(0.01) // 0.01 SOL for small auctions
    } else if (priceInSol < 10) {
      return this.solToLamports(0.05) // 0.05 SOL for medium auctions
    } else {
      return this.solToLamports(0.1) // 0.1 SOL for large auctions
    }
  }

  /**
   * Calculate auction value score (for ranking/filtering)
   */
  static calculateValueScore(
    currentPrice: bigint,
    startingPrice: bigint,
    totalBids: number,
    timeRemaining: bigint
  ): number {
    const priceRatio = Number(currentPrice) / Number(startingPrice)
    const bidActivity = Math.min(totalBids / 10, 1) // Normalize to 0-1
    const urgency = Math.max(0, 1 - Number(timeRemaining) / 86400) // More valuable if ending soon
    
    return (priceRatio * 0.4) + (bidActivity * 0.3) + (urgency * 0.3)
  }
}

/**
 * Auction validation utilities
 */
export class AuctionValidationUtils {
  /**
   * Validate auction creation parameters
   */
  static validateAuctionParams(params: {
    startingPrice: bigint
    reservePrice: bigint
    endTime: bigint
    increment: bigint
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Price validations
    if (params.startingPrice <= 0n) {
      errors.push('Starting price must be greater than 0')
    }

    if (params.reservePrice < 0n) {
      errors.push('Reserve price cannot be negative')
    }

    if (params.increment <= 0n) {
      errors.push('Bid increment must be greater than 0')
    }

    // Time validations
    const now = AuctionTimeUtils.now()
    if (params.endTime <= now) {
      errors.push('End time must be in the future')
    }

    const duration = params.endTime - now
    if (duration < 3600n) {
      errors.push('Auction duration must be at least 1 hour')
    }

    if (duration > 86400n * 30n) {
      errors.push('Auction duration cannot exceed 30 days')
    }

    // Increment validation
    const maxIncrement = params.startingPrice / 10n
    if (params.increment > maxIncrement) {
      errors.push('Bid increment too large relative to starting price')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate bid parameters
   */
  static validateBid(params: {
    bidAmount: bigint
    currentPrice: bigint
    increment: bigint
    endTime: bigint
    status: AuctionStatus
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (params.status !== AuctionStatus.Active) {
      errors.push(`Cannot bid on auction with status: ${params.status}`)
    }

    if (AuctionTimeUtils.hasEnded(params.endTime)) {
      errors.push('Auction has ended')
    }

    const minimumBid = AuctionPricingUtils.calculateMinimumBid(
      params.currentPrice, 
      params.increment
    )

    if (params.bidAmount < minimumBid) {
      errors.push(`Bid amount ${params.bidAmount} is below minimum ${minimumBid}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Auction filtering and sorting utilities
 */
export class AuctionFilterUtils {
  /**
   * Filter auctions by status
   */
  static filterByStatus<T extends { status: AuctionStatus }>(
    auctions: T[],
    status: AuctionStatus
  ): T[] {
    return auctions.filter(auction => auction.status === status)
  }

  /**
   * Filter auctions by price range
   */
  static filterByPriceRange<T extends { currentPrice: bigint }>(
    auctions: T[],
    minPrice?: bigint,
    maxPrice?: bigint
  ): T[] {
    return auctions.filter(auction => {
      if (minPrice && auction.currentPrice < minPrice) return false
      if (maxPrice && auction.currentPrice > maxPrice) return false
      return true
    })
  }

  /**
   * Filter auctions ending within timeframe
   */
  static filterByTimeRemaining<T extends { auctionEndTime: bigint }>(
    auctions: T[],
    maxTimeRemaining: bigint
  ): T[] {
    return auctions.filter(auction => {
      const remaining = AuctionTimeUtils.getTimeRemaining(auction.auctionEndTime)
      return remaining <= maxTimeRemaining && remaining > 0n
    })
  }

  /**
   * Sort auctions by ending time (soonest first)
   */
  static sortByEndTime<T extends { auctionEndTime: bigint }>(auctions: T[]): T[] {
    return [...auctions].sort((a, b) => 
      Number(a.auctionEndTime - b.auctionEndTime)
    )
  }

  /**
   * Sort auctions by current price (highest first)
   */
  static sortByPrice<T extends { currentPrice: bigint }>(auctions: T[]): T[] {
    return [...auctions].sort((a, b) => 
      Number(b.currentPrice - a.currentPrice)
    )
  }

  /**
   * Sort auctions by bid activity (most active first)
   */
  static sortByActivity<T extends { totalBids: number }>(auctions: T[]): T[] {
    return [...auctions].sort((a, b) => b.totalBids - a.totalBids)
  }
}

/**
 * Auction analytics utilities
 */
export class AuctionAnalyticsUtils {
  /**
   * Calculate average auction duration
   */
  static calculateAverageDuration<T extends { 
    createdAt: bigint
    auctionEndTime: bigint 
  }>(auctions: T[]): bigint {
    if (auctions.length === 0) return 0n

    const totalDuration = auctions.reduce((sum, auction) => {
      return sum + (auction.auctionEndTime - auction.createdAt)
    }, 0n)

    return totalDuration / BigInt(auctions.length)
  }

  /**
   * Calculate average bid count per auction
   */
  static calculateAverageBidCount<T extends { totalBids: number }>(
    auctions: T[]
  ): number {
    if (auctions.length === 0) return 0

    const totalBids = auctions.reduce((sum, auction) => sum + auction.totalBids, 0)
    return totalBids / auctions.length
  }

  /**
   * Calculate total auction volume
   */
  static calculateTotalVolume<T extends { currentPrice: bigint }>(
    settledAuctions: T[]
  ): bigint {
    return settledAuctions.reduce((sum, auction) => sum + auction.currentPrice, 0n)
  }

  /**
   * Find auctions with highest price appreciation
   */
  static findTopAppreciationAuctions<T extends { 
    startingPrice: bigint
    currentPrice: bigint 
  }>(auctions: T[], limit: number = 10): (T & { appreciation: number })[] {
    return auctions
      .map(auction => ({
        ...auction,
        appreciation: Number(auction.currentPrice) / Number(auction.startingPrice)
      }))
      .sort((a, b) => b.appreciation - a.appreciation)
      .slice(0, limit)
  }

  /**
   * Get auction success rate by creator
   */
  static getCreatorSuccessRate<T extends { 
    creator: Address
    status: AuctionStatus 
  }>(auctions: T[]): Map<Address, { total: number; settled: number; rate: number }> {
    const stats = new Map<Address, { total: number; settled: number; rate: number }>()

    auctions.forEach(auction => {
      const current = stats.get(auction.creator) ?? { total: 0, settled: 0, rate: 0 }
      current.total++
      if (auction.status === AuctionStatus.Settled) {
        current.settled++
      }
      current.rate = current.total > 0 ? current.settled / current.total : 0
      stats.set(auction.creator, current)
    })

    return stats
  }
}

/**
 * Auction notification helpers
 */
export class AuctionNotificationUtils {
  /**
   * Check if auction needs attention (ending soon, outbid, etc.)
   */
  static checkAuctionAlerts<T extends {
    auctionEndTime: bigint
    currentWinner?: Address
    status: AuctionStatus
  }>(auction: T, userAddress?: Address): {
    type: 'ending_soon' | 'outbid' | 'won' | 'ended' | null
    message: string
    urgency: 'low' | 'medium' | 'high'
  } {
    const timeRemaining = AuctionTimeUtils.getTimeRemaining(auction.auctionEndTime)
    
    // Check if auction ended
    if (auction.status !== AuctionStatus.Active) {
      if (auction.currentWinner === userAddress) {
        return {
          type: 'won',
          message: 'You won this auction!',
          urgency: 'high'
        }
      }
      return {
        type: 'ended',
        message: 'Auction has ended',
        urgency: 'low'
      }
    }

    // Check if ending soon
    if (timeRemaining <= 300n) { // 5 minutes
      return {
        type: 'ending_soon',
        message: `Auction ending in ${AuctionTimeUtils.formatTimeRemaining(timeRemaining)}`,
        urgency: 'high'
      }
    } else if (timeRemaining <= 3600n) { // 1 hour
      return {
        type: 'ending_soon',
        message: `Auction ending in ${AuctionTimeUtils.formatTimeRemaining(timeRemaining)}`,
        urgency: 'medium'
      }
    }

    // Check if user was outbid
    if (userAddress && auction.currentWinner !== userAddress) {
      return {
        type: 'outbid',
        message: 'You have been outbid',
        urgency: 'medium'
      }
    }

    return {
      type: null,
      message: '',
      urgency: 'low'
    }
  }
}

/**
 * Dutch auction pricing utilities
 */
export class DutchAuctionUtils {
  /**
   * Calculate current price for Dutch auction based on time decay
   * 
   * @param startingPrice - Initial auction price
   * @param reservePrice - Minimum price (auction won't go below this)
   * @param startTime - Auction start timestamp
   * @param endTime - Auction end timestamp
   * @param currentTime - Current timestamp (defaults to now)
   * @param decayType - Type of price decay curve ('linear' | 'exponential')
   * @returns Current price based on time progression
   */
  static calculateCurrentPrice(
    startingPrice: bigint,
    reservePrice: bigint,
    startTime: bigint,
    endTime: bigint,
    currentTime?: bigint,
    decayType: 'linear' | 'exponential' = 'linear'
  ): bigint {
    const now = currentTime ?? AuctionTimeUtils.now()
    
    // If auction hasn't started, return starting price
    if (now <= startTime) {
      return startingPrice
    }
    
    // If auction has ended, return reserve price
    if (now >= endTime) {
      return reservePrice
    }
    
    // Calculate time progression (0 to 1)
    const totalDuration = endTime - startTime
    const timeElapsed = now - startTime
    const timeProgress = Number(timeElapsed) / Number(totalDuration)
    
    // Calculate price range
    const priceRange = startingPrice - reservePrice
    
    let priceDecrease: bigint
    
    switch (decayType) {
      case 'linear':
        // Linear price decay
        priceDecrease = BigInt(Math.floor(Number(priceRange) * timeProgress))
        break
        
      case 'exponential': {
        // Exponential decay (slower at start, faster toward end)
        // Use a curve that accelerates aggressively: y = x^3
        const exponentialProgress = Math.pow(timeProgress, 3)
        priceDecrease = BigInt(Math.floor(Number(priceRange) * exponentialProgress))
        break
      }
        
      default:
        priceDecrease = BigInt(Math.floor(Number(priceRange) * timeProgress))
    }
    
    const currentPrice = startingPrice - priceDecrease
    
    // Ensure price doesn't go below reserve
    return currentPrice > reservePrice ? currentPrice : reservePrice
  }
  
  /**
   * Calculate price at specific future time
   * 
   * @param startingPrice - Initial auction price
   * @param reservePrice - Minimum price
   * @param startTime - Auction start timestamp
   * @param endTime - Auction end timestamp
   * @param targetTime - Time to calculate price for
   * @param decayType - Type of price decay curve
   * @returns Price at the target time
   */
  static calculatePriceAtTime(
    startingPrice: bigint,
    reservePrice: bigint,
    startTime: bigint,
    endTime: bigint,
    targetTime: bigint,
    decayType: 'linear' | 'exponential' = 'linear'
  ): bigint {
    return this.calculateCurrentPrice(
      startingPrice,
      reservePrice,
      startTime,
      endTime,
      targetTime,
      decayType
    )
  }
  
  /**
   * Calculate how much price will decrease per second
   * 
   * @param startingPrice - Initial auction price
   * @param reservePrice - Minimum price
   * @param duration - Auction duration in seconds
   * @param decayType - Type of price decay curve
   * @returns Average price decrease per second
   */
  static calculatePriceDecayRate(
    startingPrice: bigint,
    reservePrice: bigint,
    duration: bigint,
    decayType: 'linear' | 'exponential' = 'linear'
  ): number {
    const priceRange = Number(startingPrice - reservePrice)
    const durationSeconds = Number(duration)
    
    switch (decayType) {
      case 'linear':
        return priceRange / durationSeconds
        
      case 'exponential':
        // For exponential, return average rate (actual rate varies)
        return priceRange / durationSeconds
        
      default:
        return priceRange / durationSeconds
    }
  }
  
  /**
   * Get time when auction will reach target price
   * 
   * @param startingPrice - Initial auction price
   * @param reservePrice - Minimum price
   * @param targetPrice - Desired price to reach
   * @param startTime - Auction start timestamp
   * @param endTime - Auction end timestamp
   * @param decayType - Type of price decay curve
   * @returns Timestamp when target price will be reached, or null if never reached
   */
  static getTimeForTargetPrice(
    startingPrice: bigint,
    reservePrice: bigint,
    targetPrice: bigint,
    startTime: bigint,
    endTime: bigint,
    decayType: 'linear' | 'exponential' = 'linear'
  ): bigint | null {
    // Validate target price is achievable
    if (targetPrice > startingPrice || targetPrice < reservePrice) {
      return null
    }
    
    const totalDuration = endTime - startTime
    const priceRange = startingPrice - reservePrice
    const targetDecrease = startingPrice - targetPrice
    
    let timeProgress: number
    
    switch (decayType) {
      case 'linear':
        timeProgress = Number(targetDecrease) / Number(priceRange)
        break
        
      case 'exponential':
        // Solve: targetDecrease = priceRange * progress^2
        timeProgress = Math.sqrt(Number(targetDecrease) / Number(priceRange))
        break
        
      default:
        timeProgress = Number(targetDecrease) / Number(priceRange)
    }
    
    const timeElapsed = BigInt(Math.floor(Number(totalDuration) * timeProgress))
    return startTime + timeElapsed
  }
  
  /**
   * Validate Dutch auction parameters
   * 
   * @param params - Dutch auction parameters
   * @returns Validation result with errors if any
   */
  static validateDutchAuctionParams(params: {
    startingPrice: bigint
    reservePrice: bigint
    startTime: bigint
    endTime: bigint
    decayType?: 'linear' | 'exponential'
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Price validations
    if (params.startingPrice <= params.reservePrice) {
      errors.push('Starting price must be greater than reserve price for Dutch auction')
    }
    
    if (params.reservePrice < 0n) {
      errors.push('Reserve price cannot be negative')
    }
    
    // Time validations
    if (params.endTime <= params.startTime) {
      errors.push('End time must be after start time')
    }
    
    const duration = params.endTime - params.startTime
    if (duration < 300n) { // 5 minutes minimum
      errors.push('Dutch auction duration must be at least 5 minutes')
    }
    
    if (duration > 86400n * 7n) { // 7 days maximum
      errors.push('Dutch auction duration cannot exceed 7 days')
    }
    
    // Price range validation
    const priceRange = params.startingPrice - params.reservePrice
    const minimumRange = params.startingPrice / 20n // At least 5% price range
    if (priceRange < minimumRange) {
      errors.push('Price range (starting - reserve) must be at least 5% of starting price')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get Dutch auction features and capabilities
   * 
   * @returns Feature set available for Dutch auctions
   */
  static getDutchAuctionFeatures(): {
    supportedDecayTypes: string[]
    maxDuration: number
    minDuration: number
    minPriceRangePercent: number
    supportsBuyNow: boolean
    supportsReservePrice: boolean
    supportsTimeExtension: boolean
  } {
    return {
      supportedDecayTypes: ['linear', 'exponential'],
      maxDuration: 86400 * 7, // 7 days in seconds
      minDuration: 300, // 5 minutes in seconds
      minPriceRangePercent: 5, // 5% minimum price range
      supportsBuyNow: true,
      supportsReservePrice: true,
      supportsTimeExtension: true
    }
  }

  /**
   * Validate if a bid is valid for Dutch auction
   * 
   * @param bidAmount - Amount of the bid
   * @param currentPrice - Current calculated price  
   * @param reservePrice - Minimum reserve price
   * @returns Whether the bid is valid
   */
  static isValidBid(
    bidAmount: bigint,
    currentPrice: bigint, 
    reservePrice: bigint
  ): boolean {
    return bidAmount >= currentPrice && bidAmount >= reservePrice
  }
}

/**
 * Reserve price utilities for all auction types
 */
export class ReservePriceUtils {
  /**
   * Check if current bid meets reserve price
   * 
   * @param bidAmount - The bid amount to check
   * @param reservePrice - The auction's reserve price
   * @param auctionType - Type of auction
   * @param isReserveHidden - Whether the reserve price is hidden
   * @returns True if bid meets reserve requirements
   */
  static meetsBidReserve(
    bidAmount: bigint,
    reservePrice: bigint,
    auctionType: AuctionType,
    isReserveHidden: boolean = false
  ): boolean {
    void auctionType // Mark as intentionally unused
    void isReserveHidden // Mark as intentionally unused
    // For all auction types, bid must meet or exceed reserve
    // Hidden reserve doesn't change the requirement, just visibility
    return bidAmount >= reservePrice
  }
  
  /**
   * Check if auction can be finalized based on reserve price
   * 
   * @param currentPrice - Current highest bid/price
   * @param reservePrice - The auction's reserve price
   * @param auctionType - Type of auction
   * @param hasBids - Whether auction has received any bids
   * @returns True if auction can be finalized with current price
   */
  static canFinalizeWithReserve(
    currentPrice: bigint,
    reservePrice: bigint,
    auctionType: AuctionType,
    hasBids: boolean
  ): boolean {
    // If no bids and reserve not met, cannot finalize successfully
    if (!hasBids && currentPrice < reservePrice) {
      return false
    }
    
    // For Dutch auctions, current price includes time decay
    // For others, current price is highest bid
    return currentPrice >= reservePrice
  }
  
  /**
   * Calculate minimum acceptable bid considering reserve price
   * 
   * @param currentPrice - Current auction price
   * @param reservePrice - The auction's reserve price
   * @param minimumIncrement - Minimum bid increment
   * @param auctionType - Type of auction
   * @returns Minimum acceptable bid amount
   */
  static calculateMinimumBid(
    currentPrice: bigint,
    reservePrice: bigint,
    minimumIncrement: bigint,
    auctionType: AuctionType
  ): bigint {
    switch (auctionType) {
      case AuctionType.English: {
        // For English auctions, next bid must exceed current + increment and meet reserve
        const nextBid = currentPrice + minimumIncrement
        return nextBid > reservePrice ? nextBid : reservePrice
      }
        
      case AuctionType.Dutch:
        // For Dutch auctions, any bid >= current price is acceptable if it meets reserve
        return currentPrice >= reservePrice ? currentPrice : reservePrice
        
      case AuctionType.SealedBid:
      case AuctionType.Vickrey:
        // For sealed auctions, bid must meet reserve (current price not relevant)
        return reservePrice
        
      default:
        return reservePrice
    }
  }
  
  /**
   * Get reserve price status message for auction
   * 
   * @param currentPrice - Current auction price
   * @param reservePrice - The auction's reserve price
   * @param auctionType - Type of auction
   * @param isReserveHidden - Whether reserve is hidden
   * @param reserveMet - Explicit reserve met status (for hidden reserves)
   * @param extensionCount - Number of extensions used
   * @param maxExtensions - Maximum extensions allowed
   * @returns Status message about reserve price
   */
  static getReserveStatus(
    currentPrice: bigint,
    reservePrice: bigint,
    _auctionType: AuctionType,
    isReserveHidden: boolean = false,
    reserveMet?: boolean,
    extensionCount?: number,
    maxExtensions: number = 3
  ): {
    met: boolean
    message: string
    shortfall?: bigint
    canExtend?: boolean
    extensionsRemaining?: number
  } {
    // If reserve is hidden and we have explicit reserveMet status, use it
    if (isReserveHidden && reserveMet !== undefined) {
      const canExtend = !reserveMet && (extensionCount ?? 0) < maxExtensions
      const extensionsRemaining = maxExtensions - (extensionCount ?? 0)
      
      return {
        met: reserveMet,
        message: reserveMet 
          ? 'Reserve price has been met'
          : canExtend 
            ? `Reserve price not yet met (${extensionsRemaining} extensions available)`
            : 'Reserve price not met (no extensions available)',
        canExtend,
        extensionsRemaining
      }
    }
    
    // Otherwise calculate based on actual prices
    const met = currentPrice >= reservePrice
    const canExtend = !met && (extensionCount ?? 0) < maxExtensions
    const extensionsRemaining = maxExtensions - (extensionCount ?? 0)
    
    if (met) {
      return {
        met: true,
        message: 'Reserve price has been met',
        canExtend: false,
        extensionsRemaining
      }
    }
    
    // For hidden reserves, don't reveal the actual amount
    if (isReserveHidden) {
      return {
        met: false,
        message: canExtend 
          ? `Reserve price not yet met (${extensionsRemaining} extensions available)`
          : 'Reserve price not met (no extensions available)',
        canExtend,
        extensionsRemaining
      }
    }
    
    // For public reserves, show the shortfall
    const shortfall = reservePrice - currentPrice
    return {
      met: false,
      message: canExtend
        ? `Reserve price not met (${AuctionPricingUtils.lamportsToSol(shortfall)} SOL below reserve, ${extensionsRemaining} extensions available)`
        : `Reserve price not met (${AuctionPricingUtils.lamportsToSol(shortfall)} SOL below reserve, no extensions available)`,
      shortfall,
      canExtend,
      extensionsRemaining
    }
  }
  
  /**
   * Validate reserve price for auction creation
   * 
   * @param reservePrice - Proposed reserve price
   * @param startingPrice - Starting/opening price
   * @param auctionType - Type of auction
   * @returns Validation result
   */
  static validateReservePrice(
    reservePrice: bigint,
    startingPrice: bigint,
    auctionType: AuctionType
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Basic validations
    if (reservePrice < 0n) {
      errors.push('Reserve price cannot be negative')
    }
    
    // Type-specific validations
    switch (auctionType) {
      case AuctionType.English:
        // For English auctions, reserve can be at or below starting price
        if (reservePrice > startingPrice) {
          errors.push('Reserve price cannot exceed starting price for English auction')
        }
        break
        
      case AuctionType.Dutch:
        // For Dutch auctions, reserve must be below starting price
        if (reservePrice >= startingPrice) {
          errors.push('Reserve price must be below starting price for Dutch auction')
        }
        break
        
      case AuctionType.SealedBid:
      case AuctionType.Vickrey:
        // For sealed auctions, reserve should typically be below starting price
        if (reservePrice > startingPrice) {
          errors.push('Reserve price should not exceed starting price for sealed bid auction')
        }
        break
    }
    
    // Practical limits
    const maxReasonableReserve = startingPrice * 95n / 100n // 95% of starting price
    if (reservePrice > maxReasonableReserve && auctionType !== AuctionType.English) {
      errors.push('Reserve price should not exceed 95% of starting price')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Reserve price extension utilities
 */
export class ReserveExtensionUtils {
  /**
   * Check if auction is eligible for extension
   */
  static checkExtensionEligibility(params: {
    status: AuctionStatus
    reserveMet: boolean
    extensionCount: number
    totalBids: number
    auctionEndTime: bigint
    currentTime?: bigint
    maxExtensions?: number
    thresholdSeconds?: bigint
  }): {
    eligible: boolean
    reason?: string
    extensionsRemaining: number
    timeToDeadline: bigint
  } {
    const {
      status,
      reserveMet,
      extensionCount,
      totalBids,
      auctionEndTime,
      currentTime = AuctionTimeUtils.now(),
      maxExtensions = 3,
      thresholdSeconds = 300n // 5 minutes
    } = params

    const extensionsRemaining = maxExtensions - extensionCount
    const timeToDeadline = auctionEndTime - currentTime

    // Check auction status
    if (status !== AuctionStatus.Active) {
      return {
        eligible: false,
        reason: 'Auction is not active',
        extensionsRemaining,
        timeToDeadline
      }
    }

    // Check if reserve already met
    if (reserveMet) {
      return {
        eligible: false,
        reason: 'Reserve price already met',
        extensionsRemaining,
        timeToDeadline
      }
    }

    // Check extension limit
    if (extensionCount >= maxExtensions) {
      return {
        eligible: false,
        reason: 'Maximum extensions reached',
        extensionsRemaining: 0,
        timeToDeadline
      }
    }

    // Check if there are bids to justify extension
    if (totalBids === 0) {
      return {
        eligible: false,
        reason: 'No bids to justify extension',
        extensionsRemaining,
        timeToDeadline
      }
    }

    // Check if we're within the extension threshold
    if (timeToDeadline > thresholdSeconds) {
      return {
        eligible: false,
        reason: `Too early to extend (must be within ${Number(thresholdSeconds)} seconds of end)`,
        extensionsRemaining,
        timeToDeadline
      }
    }

    return {
      eligible: true,
      extensionsRemaining,
      timeToDeadline
    }
  }

  /**
   * Calculate new end time after extension
   */
  static calculateExtendedEndTime(
    currentEndTime: bigint,
    extensionDuration: bigint = 3600n // 1 hour default
  ): bigint {
    return currentEndTime + extensionDuration
  }

  /**
   * Get extension recommendation based on auction state
   */
  static getExtensionRecommendation(params: {
    currentPrice: bigint
    reservePrice: bigint
    totalBids: number
    timeRemaining: bigint
    extensionCount: number
    maxExtensions?: number
  }): {
    recommend: boolean
    reason: string
    urgency: 'low' | 'medium' | 'high'
  } {
    const {
      currentPrice,
      reservePrice,
      totalBids,
      // timeRemaining value not used but part of API
      extensionCount,
      maxExtensions = 3
    } = params

    const shortfall = reservePrice - currentPrice
    const shortfallPercent = Number(shortfall * 100n / reservePrice)
    const extensionsRemaining = maxExtensions - extensionCount

    // No extensions left
    if (extensionsRemaining <= 0) {
      return {
        recommend: false,
        reason: 'No extensions remaining',
        urgency: 'low'
      }
    }

    // Very close to reserve (within 10%)
    if (shortfallPercent <= 10) {
      return {
        recommend: true,
        reason: `Very close to reserve (${shortfallPercent.toFixed(1)}% away)`,
        urgency: 'high'
      }
    }

    // Good bidding activity and reasonable shortfall
    if (totalBids >= 3 && shortfallPercent <= 25) {
      return {
        recommend: true,
        reason: `Active bidding with ${totalBids} bids, ${shortfallPercent.toFixed(1)}% below reserve`,
        urgency: 'medium'
      }
    }

    // Last extension opportunity
    if (extensionsRemaining === 1 && totalBids >= 2) {
      return {
        recommend: true,
        reason: 'Last extension opportunity with bidding activity',
        urgency: 'medium'
      }
    }

    // Not recommended
    return {
      recommend: false,
      reason: shortfallPercent > 50 
        ? 'Too far from reserve price'
        : 'Limited bidding activity',
      urgency: 'low'
    }
  }

  /**
   * Format extension status message
   */
  static formatExtensionStatus(
    extensionCount: number,
    maxExtensions: number = 3,
    lastExtensionTime?: bigint
  ): string {
    const remaining = maxExtensions - extensionCount
    
    if (extensionCount === 0) {
      return `No extensions used (${maxExtensions} available)`
    }

    if (remaining === 0) {
      return 'All extensions used'
    }

    let message = `${extensionCount} extension(s) used, ${remaining} remaining`
    
    if (lastExtensionTime) {
      const timeAgo = AuctionTimeUtils.now() - lastExtensionTime
      const timeAgoStr = AuctionTimeUtils.formatTimeRemaining(timeAgo)
      message += ` (last extension ${timeAgoStr} ago)`
    }

    return message
  }
}

/**
 * Auction type helpers
 */
export class AuctionTypeUtils {
  /**
   * Get auction type description
   */
  static getDescription(auctionType: AuctionType): string {
    switch (auctionType) {
      case AuctionType.English:
        return 'Ascending price auction - highest bid wins'
      case AuctionType.Dutch:
        return 'Descending price auction - price decreases over time'
      case AuctionType.SealedBid:
        return 'Blind bidding - bids are hidden until auction ends'
      case AuctionType.Vickrey:
        return 'Second-price sealed bid - winner pays second-highest bid'
      default:
        return 'Unknown auction type'
    }
  }

  /**
   * Check if auction type supports public bidding
   */
  static supportsPublicBidding(auctionType: AuctionType): boolean {
    return auctionType === AuctionType.English || auctionType === AuctionType.Dutch
  }

  /**
   * Check if auction type has hidden bids
   */
  static hasHiddenBids(auctionType: AuctionType): boolean {
    return auctionType === AuctionType.SealedBid || auctionType === AuctionType.Vickrey
  }
  
  /**
   * Check if auction type supports time-based pricing
   */
  static hasTimeDependentPricing(auctionType: AuctionType): boolean {
    return auctionType === AuctionType.Dutch
  }
  
  /**
   * Get optimal auction type for given parameters
   */
  static suggestAuctionType(params: {
    expectedBidders: number
    urgency: 'low' | 'medium' | 'high'
    priceDiscovery: 'important' | 'not_important'
    privacy: 'public' | 'private'
  }): AuctionType {
    // Private bidding required
    if (params.privacy === 'private') {
      return params.priceDiscovery === 'important' 
        ? AuctionType.Vickrey 
        : AuctionType.SealedBid
    }
    
    // High urgency with good price discovery
    if (params.urgency === 'high' && params.expectedBidders > 3) {
      return AuctionType.Dutch
    }
    
    // Default to English for most cases
    return AuctionType.English
  }
}

// Implementation of Dutch auction methods
function getDutchAuctionInfo(
  startingPrice: bigint,
  reservePrice: bigint,
  startTime: bigint,
  endTime: bigint,
  currentTime: bigint,
  decayType: 'linear' | 'exponential'
): {
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
} {
  const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
    startingPrice,
    reservePrice,
    startTime,
    endTime,
    currentTime,
    decayType
  )
  
  const priceReductionTotal = startingPrice - currentPrice
  const totalPriceRange = startingPrice - reservePrice
  const priceReductionPercentage = totalPriceRange === 0n ? 0 : 
    Number((priceReductionTotal * 100n) / totalPriceRange)
  
  const timeToReachReserve = currentPrice <= reservePrice ? 0n : endTime - currentTime
  
  const totalTime = endTime - startTime
  const priceDecayRate = totalTime === 0n ? 0 :
    Number((totalPriceRange * 10000n) / totalTime) / 10000
  
  return {
    startingPrice,
    reservePrice,
    currentCalculatedPrice: currentPrice,
    startTime,
    endTime,
    decayType,
    priceDecayRate,
    timeToReachReserve,
    priceReductionTotal,
    priceReductionPercentage
  }
}

function isDutchAuction(auctionType: AuctionType): boolean {
  return auctionType === AuctionType.Dutch
}

function isValidBid(
  bidAmount: bigint,
  currentPrice: bigint,
  reservePrice: bigint
): boolean {
  return bidAmount >= currentPrice && bidAmount >= reservePrice
}

// Create calculateDutchAuctionPrice alias
const calculateDutchAuctionPrice = DutchAuctionUtils.calculateCurrentPrice

// Export Dutch auction utilities
export const DutchAuctionUtilsExports = {
  getDutchAuctionInfo,
  isDutchAuction,
  isValidBid,
  calculateCurrentPrice: calculateDutchAuctionPrice
}
