/**
 * Marketplace service for managing service listings and purchases
 */

import type {
  IMarketplaceService,
  ServiceListing,
  Purchase,
  CreateListingParams,
  GetListingsParams,
  SearchCriteria,
  PurchaseParams,
  UpdateListingParams,
  MarketplaceServiceDependencies
} from '../types/services.js'
import { randomUUID } from 'crypto'
import { getWallet } from '../utils/client.js'
import type { Address } from '@solana/addresses'
import { MarketplaceModule, type GhostSpeakClient } from '@ghostspeak/sdk'

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
      // Get wallet signer
      const walletSigner = await getWallet()
      console.log('🔍 Using wallet signer:', walletSigner.address.toString())
      
      // Get blockchain client
      const client = await this.deps.blockchainService.getClient('devnet')
      
      // Create MarketplaceModule instance
      console.log('🔍 Creating MarketplaceModule from SDK...')
      
      const typedClient = client as GhostSpeakClient
      const marketplaceModule = new MarketplaceModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      console.log('🔍 Calling MarketplaceModule.createServiceListing...')
      
      // Convert SOL to lamports
      const priceLamports = BigInt(Math.floor(listing.priceInSol * 1_000_000_000))
      
      // Create metadata JSON
      const metadataJson = JSON.stringify({
        title: listing.title,
        description: listing.description,
        category: listing.category,
        ...listing.metadata
      })
      const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
      
      // Call SDK to create listing on blockchain
      const signature = await marketplaceModule.createServiceListing({
        signer: walletSigner,
        agentAddress: agent.address,
        title: listing.title,
        description: listing.description,
        pricePerHour: priceLamports,
        category: listing.category,
        capabilities: agent.capabilities
      })
      
      console.log('🔍 Transaction signature:', signature)
      
      if (!signature || typeof signature !== 'string') {
        throw new Error('No transaction signature returned from marketplace listing creation')
      }
      
      // Store listing data locally for caching
      // Store listing data locally for caching
      // Note: In a real implementation, we would use a proper storage service
      console.log(`Listing created with ID: ${listing.id}`)
      
      console.log(`✅ Service listing created successfully!`)
      console.log(`Transaction signature: ${signature}`)
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
      
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
      const offset = params.offset ?? 0
      const limit = params.limit ?? 20
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
      // Get wallet signer
      const walletSigner = await getWallet()
      
      // Get blockchain client
      const client = await this.deps.blockchainService.getClient('devnet')
      
      // Create MarketplaceModule instance
      const typedClient = client as GhostSpeakClient
      const marketplaceModule = new MarketplaceModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      console.log('🔍 Calling MarketplaceModule.updateServiceListing...')
      
      // Prepare update parameters
      const updateParams: any = {
        listingId,
        title: updates.title,
        description: updates.description,
        price: updates.priceInSol ? BigInt(Math.floor(updates.priceInSol * 1_000_000_000)) : undefined,
        isActive: updates.isActive
      }
      
      // Remove undefined values
      Object.keys(updateParams).forEach(key => 
        updateParams[key] === undefined && delete updateParams[key]
      )
      
      // Execute update on blockchain
      const signature = await marketplaceModule.updateServiceListing(walletSigner, updateParams)
      
      console.log('🔍 Transaction signature:', signature)
      
      if (!signature || typeof signature !== 'string') {
        throw new Error('No transaction signature returned from marketplace update')
      }
      
      // Update local cache
      await this.storeListing(updatedListing)
      
      console.log(`✅ Service listing updated successfully!`)
      console.log(`Transaction signature: ${signature}`)
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
      
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
    // Store listing data locally for caching
    // Note: In a real implementation, we would use a proper storage service
    console.log(`Storing listing: ${listing.id}`)
  }

  private async getAllListings(): Promise<ServiceListing[]> {
    try {
      // Get blockchain client
      const client = await this.deps.blockchainService.getClient('devnet')
      
      // Create MarketplaceModule instance
      const typedClient = client as GhostSpeakClient
      const marketplaceModule = new MarketplaceModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      // Get all service listings from blockchain
      const listings = await marketplaceModule.getAllServiceListings()
      
      // Convert to our ServiceListing format
      return listings.map((listing: any) => ({
        id: listing.data.id || listing.address,
        agentId: listing.data.agent,
        title: listing.data.title,
        description: listing.data.description,
        category: listing.data.serviceType || 'general',
        priceInSol: Number(listing.data.price) / 1_000_000_000,
        isActive: listing.data.isActive ?? true,
        createdAt: BigInt(listing.data.createdAt || Date.now()),
        metadata: {}
      }))
    } catch (error) {
      console.error('Failed to get listings from blockchain:', error)
      return []
    }
  }

  private async getListingById(listingId: string): Promise<ServiceListing | null> {
    try {
      // Note: In a real implementation, we would check local cache first
      
      // If not in cache, query blockchain
      const client = await this.deps.blockchainService.getClient('devnet')
      
      const typedClient = client as GhostSpeakClient
      const marketplaceModule = new MarketplaceModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      // Get listing by ID from blockchain
      const listing = await marketplaceModule.getServiceById(listingId)
      if (!listing) {
        return null
      }
      
      // Convert to our format
      const serviceListing: ServiceListing = {
        id: listing.id || listingId,
        agentId: listing.agent,
        title: listing.title,
        description: listing.description,
        category: listing.serviceType || 'general',
        priceInSol: Number(listing.price) / 1_000_000_000,
        isActive: listing.isActive ?? true,
        createdAt: BigInt(listing.createdAt || Date.now()),
        metadata: {}
      }
      
      // Note: In a real implementation, we would cache for future use
      
      return serviceListing
    } catch (error) {
      console.error('Failed to get listing by ID:', error)
      return null
    }
  }

  private async createPurchaseTransaction(purchase: Purchase): Promise<void> {
    try {
      // Get wallet signer
      const walletSigner = await getWallet()
      console.log('🔍 Creating purchase transaction for:', purchase.id)
      
      // Get blockchain client
      const client = await this.deps.blockchainService.getClient('devnet')
      
      // Create MarketplaceModule instance
      const typedClient = client as GhostSpeakClient
      const marketplaceModule = new MarketplaceModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      console.log('🔍 Calling MarketplaceModule.purchase...')
      
      // Execute purchase on blockchain
      const signature = await marketplaceModule.purchase(walletSigner, {
        listingId: purchase.listingId,
        amount: purchase.amount
      })
      
      console.log('🔍 Transaction signature:', signature)
      
      if (!signature || typeof signature !== 'string') {
        throw new Error('No transaction signature returned from marketplace purchase')
      }
      
      // Note: In a real implementation, we would store purchase record locally
      
      console.log(`✅ Purchase transaction created successfully!`)
      console.log(`Transaction signature: ${signature}`)
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    } catch (error) {
      throw new Error(`Failed to create purchase transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Factory function for dependency injection
export function createMarketplaceService(deps: MarketplaceServiceDependencies): MarketplaceService {
  return new MarketplaceService(deps)
}