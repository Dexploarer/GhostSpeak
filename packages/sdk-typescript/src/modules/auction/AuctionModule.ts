/**
 * Auction Module
 *
 * Manages service auctions for AI agent capabilities.
 * Provides read access to auction data.
 */

import type { Address } from '@solana/addresses'
import { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import type { AuctionMarketplace } from '../../generated/index.js'

/**
 * Auction type enum
 */
export enum AuctionType {
  English = 0, // Standard ascending auction
  Dutch = 1, // Descending price auction
  SealedBid = 2, // Hidden bids
}

/**
 * Auction module for service auctions
 */
export class AuctionModule extends BaseModule {
  /**
   * Derive auction PDA
   * Seeds: ["auction", creator, auction_id]
   */
  async deriveAuctionPda(creator: Address, auctionId: string): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('auction')),
        getAddressEncoder().encode(creator),
        getBytesEncoder().encode(new TextEncoder().encode(auctionId)),
      ],
    })
    return pda
  }

  /**
   * Get auction marketplace account
   */
  async getAuctionMarketplace(address: Address): Promise<AuctionMarketplace | null> {
    return this.getAccount<AuctionMarketplace>(address, 'AuctionMarketplace')
  }

  /**
   * Get all auction marketplaces
   */
  async getAllAuctions(): Promise<{ address: Address; data: AuctionMarketplace }[]> {
    return this.getProgramAccounts<AuctionMarketplace>('AuctionMarketplace')
  }

  /**
   * Get auction by creator and ID
   */
  async getAuctionByCreatorAndId(
    creator: Address,
    auctionId: string
  ): Promise<AuctionMarketplace | null> {
    const auctionAddress = await this.deriveAuctionPda(creator, auctionId)
    return this.getAuctionMarketplace(auctionAddress)
  }

  /**
   * Calculate time remaining in auction
   */
  getTimeRemaining(auction: AuctionMarketplace): number {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (auction.auctionEndTime <= now) {
      return 0
    }
    return Number(auction.auctionEndTime - now)
  }

  /**
   * Check if auction has ended
   */
  hasEnded(auction: AuctionMarketplace): boolean {
    return this.getTimeRemaining(auction) === 0
  }

  /**
   * Get total bid count for an auction
   */
  getTotalBids(auction: AuctionMarketplace): number {
    return auction.totalBids
  }

  /**
   * Get auction metadata URI
   */
  getMetadataUri(auction: AuctionMarketplace): string {
    return auction.metadataUri
  }

  /**
   * Check if reserve price was met
   */
  isReserveMet(auction: AuctionMarketplace): boolean {
    return auction.reserveMet
  }

  /**
   * Get current winning price
   */
  getCurrentPrice(auction: AuctionMarketplace): bigint {
    return auction.currentPrice
  }

  /**
   * Get auctions by creator
   */
  async getAuctionsByCreator(
    creator: Address
  ): Promise<{ address: Address; data: AuctionMarketplace }[]> {
    const allAuctions = await this.getAllAuctions()
    return allAuctions.filter((a) => a.data.creator === creator)
  }
}
