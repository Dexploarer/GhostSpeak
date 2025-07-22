/**
 * Auction Helper Utilities
 * 
 * Provides utility functions for auction operations including PDA derivation,
 * validation, calculation helpers, and auction analytics.
 */

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
}