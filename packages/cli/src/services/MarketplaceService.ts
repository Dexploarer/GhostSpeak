/**
 * Marketplace service for managing service listings and purchases
 */

import type { Address } from '@solana/addresses'
import type {
  IMarketplaceService,
  ServiceListing,
  Purchase,
  CreateListingParams,
  GetListingsParams,
  SearchCriteria,
  PurchaseParams,
  UpdateListingParams,
  MarketplaceServiceDependencies,
  IBlockchainService,
  IWalletService,
  IAgentService
} from '../types/services.js'
import { randomUUID } from 'crypto'

export class MarketplaceService implements IMarketplaceService {
  constructor(private deps: MarketplaceServiceDependencies) {}

  /**
   * Create a new service listing
   */
  async createListing(params: CreateListingParams): Promise<ServiceListing> {
    // Validate parameters
    await this.validateCreateListingParams(params)

    // Verify agent ownership
    const agent = await this.deps.agentService.getById(params.agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${params.agentId}`)
    }

    const wallet = this.deps.walletService.getActiveWalletInterface()
    if (!wallet || agent.owner !== wallet.address) {
      throw new Error('Unauthorized: You can only create listings for your own agents')
    }

    // Create listing data
    const listing: ServiceListing = {
      id: randomUUID(),
      agentId: params.agentId,
      title: params.title,
      description: params.description,
      category: params.category,
      priceInSol: params.priceInSol,
      isActive: true,
      createdAt: BigInt(Date.now()),
      metadata: params.metadata
    }

    try {
      // Store listing (in real implementation, this would also update blockchain)
      await this.storeListing(listing)
      return listing
    } catch (error) {
      throw new Error(`Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get service listings by criteria
   */
  async getListings(params: GetListingsParams = {}): Promise<ServiceListing[]> {
    try {
      let listings = await this.getAllListings()

      // Apply filters
      if (params.category) {
        listings = listings.filter(listing => listing.category === params.category)
      }
      if (params.agentId) {
        listings = listings.filter(listing => listing.agentId === params.agentId)
      }
      if (params.isActive !== undefined) {
        listings = listings.filter(listing => listing.isActive === params.isActive)
      }
      if (params.minPrice !== undefined) {
        listings = listings.filter(listing => listing.priceInSol >= params.minPrice!)
      }
      if (params.maxPrice !== undefined) {
        listings = listings.filter(listing => listing.priceInSol <= params.maxPrice!)
      }

      // Apply pagination
      const offset = params.offset || 0
      const limit = params.limit || 20
      return listings.slice(offset, offset + limit)
    } catch (error) {
      throw new Error(`Failed to get listings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search service listings
   */
  async searchListings(criteria: SearchCriteria): Promise<ServiceListing[]> {
    try {
      let listings = await this.getAllListings()
      
      // Text search
      if (criteria.query) {
        const query = criteria.query.toLowerCase()
        listings = listings.filter(listing => 
          listing.title.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query)
        )
      }

      // Apply filters
      if (criteria.category) {
        listings = listings.filter(listing => listing.category === criteria.category)
      }
      if (criteria.minPrice !== undefined) {
        listings = listings.filter(listing => listing.priceInSol >= criteria.minPrice!)
      }
      if (criteria.maxPrice !== undefined) {
        listings = listings.filter(listing => listing.priceInSol <= criteria.maxPrice!)
      }

      // Apply sorting
      if (criteria.sortBy) {
        listings.sort((a, b) => {
          let comparison = 0
          switch (criteria.sortBy) {
            case 'price':
              comparison = a.priceInSol - b.priceInSol
              break
            case 'created':
              comparison = Number(a.createdAt - b.createdAt)
              break
            case 'rating':
              // Would need rating data from metadata
              comparison = 0
              break
          }
          return criteria.sortOrder === 'desc' ? -comparison : comparison
        })
      }

      return listings
    } catch (error) {
      throw new Error(`Failed to search listings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Purchase a service
   */
  async purchaseService(params: PurchaseParams): Promise<Purchase> {
    // Get listing details
    const listing = await this.getListingById(params.listingId)
    if (!listing) {
      throw new Error(`Listing not found: ${params.listingId}`)
    }

    if (!listing.isActive) {
      throw new Error('Listing is not active')
    }

    // Get agent details for seller address
    const agent = await this.deps.agentService.getById(listing.agentId)
    if (!agent) {
      throw new Error(`Agent not found for listing: ${listing.agentId}`)
    }

    // Verify wallet balance
    const wallet = this.deps.walletService.getActiveWalletInterface()
    if (!wallet) {
      throw new Error('No active wallet found')
    }

    const balance = await this.deps.walletService.getBalanceInterface(wallet.address)
    if (balance < params.amount) {
      throw new Error('Insufficient balance for purchase')
    }

    // Create purchase record
    const purchase: Purchase = {
      id: randomUUID(),
      listingId: params.listingId,
      buyerAddress: params.buyerAddress,
      sellerAddress: agent.owner,
      amount: params.amount,
      status: 'pending',
      createdAt: BigInt(Date.now())
    }

    try {
      // In real implementation, this would create escrow transaction
      await this.createPurchaseTransaction(purchase)
      return purchase
    } catch (error) {
      throw new Error(`Failed to purchase service: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update a service listing
   */
  async updateListing(listingId: string, updates: UpdateListingParams): Promise<ServiceListing> {
    const listing = await this.getListingById(listingId)
    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`)
    }

    // Verify ownership through agent
    const agent = await this.deps.agentService.getById(listing.agentId)
    if (!agent) {
      throw new Error(`Agent not found for listing: ${listing.agentId}`)
    }

    const wallet = this.deps.walletService.getActiveWalletInterface()
    if (!wallet || agent.owner !== wallet.address) {
      throw new Error('Unauthorized: You can only update your own listings')
    }

    // Apply updates
    const updatedListing: ServiceListing = {
      ...listing,
      ...updates
    }

    try {
      await this.storeListing(updatedListing)
      return updatedListing
    } catch (error) {
      throw new Error(`Failed to update listing: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a service listing
   */
  async deleteListing(listingId: string): Promise<void> {
    await this.updateListing(listingId, { isActive: false })
  }

  /**
   * Private helper methods
   */
  private async validateCreateListingParams(params: CreateListingParams): Promise<void> {
    if (!params.title || params.title.length < 5) {
      throw new Error('Listing title must be at least 5 characters long')
    }
    if (!params.description || params.description.length < 20) {
      throw new Error('Listing description must be at least 20 characters long')
    }
    if (!params.category) {
      throw new Error('Listing category is required')
    }
    if (params.priceInSol <= 0) {
      throw new Error('Listing price must be greater than 0')
    }
  }

  private async storeListing(listing: ServiceListing): Promise<void> {
    // In real implementation, this would use proper storage service
    // For now, we'll simulate storage
    console.log(`Storing listing: ${listing.id}`)
  }

  private async getAllListings(): Promise<ServiceListing[]> {
    // In real implementation, this would query blockchain or database
    // For now, return empty array
    return []
  }

  private async getListingById(listingId: string): Promise<ServiceListing | null> {
    // In real implementation, this would query storage
    // For now, return null
    return null
  }

  private async createPurchaseTransaction(purchase: Purchase): Promise<void> {
    // In real implementation, this would create blockchain transaction
    console.log(`Creating purchase transaction: ${purchase.id}`)
  }
}

// Factory function for dependency injection
export function createMarketplaceService(deps: MarketplaceServiceDependencies): MarketplaceService {
  return new MarketplaceService(deps)
}