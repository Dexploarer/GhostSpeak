import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import type { 
  GhostSpeakConfig
} from '../../types/index.js'
import {
  getCreateServiceListingInstruction,
  getCreateJobPostingInstruction,
  getPurchaseServiceInstruction,
  getApplyToJobInstruction,
  getAcceptJobApplicationInstruction,
  fetchServiceListing,
  fetchJobPosting,
  type ServiceListing,
  type JobPosting
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'

// Parameters for service listing creation
export interface CreateServiceListingParams {
  title: string
  description: string
  price: bigint
  tokenMint: Address
  serviceType: string
  paymentToken: Address
  estimatedDelivery: bigint
  tags: string[]
  listingId: string
}

// Parameters for job posting creation
export interface CreateJobPostingParams {
  title: string
  description: string
  budget: bigint
  deadline: bigint
  requirements: string[]
  skillsNeeded: string[]
  budgetMin: bigint
  budgetMax: bigint
  paymentToken: Address
  jobType: string
  experienceLevel: string
}

/**
 * Instructions for marketplace operations
 */
export class MarketplaceInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Create a new service listing
   */
  async createServiceListing(
    signer: KeyPairSigner,
    serviceListingAddress: Address,
    agentAddress: Address,
    userRegistryAddress: Address,
    params: CreateServiceListingParams
  ): Promise<string> {
    const instruction = getCreateServiceListingInstruction({
      serviceListing: serviceListingAddress,
      agent: agentAddress,
      userRegistry: userRegistryAddress,
      creator: signer as unknown as TransactionSigner,
      title: params.title,
      description: params.description,
      price: params.price,
      tokenMint: params.tokenMint,
      serviceType: params.serviceType,
      paymentToken: params.paymentToken,
      estimatedDelivery: params.estimatedDelivery,
      tags: params.tags,
      listingId: params.listingId
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Update a service listing
   */
  async updateServiceListing(
    signer: KeyPairSigner,
    listingAddress: Address,
    updateData: Partial<CreateServiceListingParams>
  ): Promise<string> {
    // Since there's no direct update instruction, we need to work with the current listing
    // In practice, this would require either:
    // 1. A new updateServiceListing instruction in the smart contract
    // 2. Closing the old listing and creating a new one (not ideal due to address changes)
    // 3. Using the updateAgentService instruction if the update is related to agent services
    
    console.warn('Direct service listing updates not available. Consider creating a new listing or updating agent service capabilities.')
    
    // If updating agent-related data, we can use updateAgentService
    if (updateData.tags || updateData.serviceType) {
      const { getUpdateAgentServiceInstruction } = await import('../../generated/index.js')
      
      // Get the current listing to extract agent info
      const listing = await this.getServiceListing(listingAddress)
      if (!listing || !listing.agent) {
        throw new Error('Could not find listing or agent information')
      }
      
      // Update agent service with new capabilities/tags
      const instruction = getUpdateAgentServiceInstruction({
        agent: listing.agent,
        owner: signer as unknown as TransactionSigner,
        agentPubkey: listing.agent,
        serviceEndpoint: listing.metadataUri || '',
        isActive: listing.isActive,
        lastUpdated: BigInt(Math.floor(Date.now() / 1000)),
        metadataUri: updateData.description || listing.description,
        capabilities: updateData.tags || []
      })
      
      return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
    }
    
    throw new Error('Service listing updates require implementing updateServiceListing instruction in the smart contract, or create a new listing')
  }

  /**
   * Purchase a service
   */
  async purchaseService(
    signer: KeyPairSigner,
    servicePurchaseAddress: Address,
    serviceListingAddress: Address,
    listingId: bigint,
    quantity: number,
    requirements: string[],
    customInstructions: string,
    deadline: bigint
  ): Promise<string> {
    const instruction = getPurchaseServiceInstruction({
      servicePurchase: servicePurchaseAddress,
      serviceListing: serviceListingAddress,
      buyer: signer as unknown as TransactionSigner,
      listingId,
      quantity,
      requirements,
      customInstructions,
      deadline
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Create a new job posting
   */
  async createJobPosting(
    signer: KeyPairSigner,
    jobPostingAddress: Address,
    params: CreateJobPostingParams
  ): Promise<string> {
    const instruction = getCreateJobPostingInstruction({
      jobPosting: jobPostingAddress,
      employer: signer as unknown as TransactionSigner,
      title: params.title,
      description: params.description,
      requirements: params.requirements,
      budget: params.budget,
      deadline: params.deadline,
      skillsNeeded: params.skillsNeeded,
      budgetMin: params.budgetMin,
      budgetMax: params.budgetMax,
      paymentToken: params.paymentToken,
      jobType: params.jobType,
      experienceLevel: params.experienceLevel
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Apply to a job
   */
  async applyToJob(
    signer: KeyPairSigner,
    jobApplicationAddress: Address,
    jobPostingAddress: Address,
    agentAddress: Address,
    coverLetter: string,
    proposedPrice: bigint,
    estimatedDuration: number,
    proposedRate: bigint,
    estimatedDelivery: bigint,
    portfolioItems: string[]
  ): Promise<string> {
    const instruction = getApplyToJobInstruction({
      jobApplication: jobApplicationAddress,
      jobPosting: jobPostingAddress,
      agent: agentAddress,
      agentOwner: signer as unknown as TransactionSigner,
      coverLetter,
      proposedPrice,
      estimatedDuration,
      proposedRate,
      estimatedDelivery,
      portfolioItems
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Accept a job application
   */
  async acceptJobApplication(
    signer: KeyPairSigner,
    jobContractAddress: Address,
    jobPostingAddress: Address,
    jobApplicationAddress: Address
  ): Promise<string> {
    const instruction = getAcceptJobApplicationInstruction({
      jobContract: jobContractAddress,
      jobPosting: jobPostingAddress,
      jobApplication: jobApplicationAddress,
      employer: signer as unknown as TransactionSigner
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Get a single service listing
   */
  async getServiceListing(listingAddress: Address): Promise<ServiceListing | null> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getServiceListingDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      const listing = await rpcClient.getAndDecodeAccount(
        listingAddress,
        getServiceListingDecoder(),
        this.commitment
      )
      
      return listing
    } catch (error) {
      console.warn('Failed to fetch service listing:', error)
      return null
    }
  }

  /**
   * Get all active service listings
   */
  async getServiceListings(): Promise<ServiceListing[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getServiceListingDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all service listing accounts
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getServiceListingDecoder(),
        [], // No filters - get all listings
        this.commitment
      )
      
      // Filter only active listings
      const activeListings = accounts
        .map(({ data }) => data)
        .filter(listing => listing.isActive)
      
      return activeListings
    } catch (error) {
      console.warn('Failed to fetch service listings:', error)
      return []
    }
  }

  /**
   * Get all active job postings
   */
  async getJobPostings(): Promise<JobPosting[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getJobPostingDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all job posting accounts
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getJobPostingDecoder(),
        [], // No filters - get all postings
        this.commitment
      )
      
      // Filter only active postings
      const activePostings = accounts
        .map(({ data }) => data)
        .filter(posting => posting.isActive)
      
      return activePostings
    } catch (error) {
      console.warn('Failed to fetch job postings:', error)
      return []
    }
  }

  /**
   * Search service listings by category
   */
  async searchServicesByCategory(category: string): Promise<ServiceListing[]> {
    try {
      // Get all service listings first
      const allListings = await this.getServiceListings()
      
      // Filter by category/service type
      const filteredListings = allListings.filter(listing => 
        listing.serviceType?.toLowerCase().includes(category.toLowerCase()) ||
        listing.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      )
      
      return filteredListings
    } catch (error) {
      console.warn('Failed to search services by category:', error)
      return []
    }
  }

  /**
   * Search job postings by budget range
   */
  async searchJobsByBudget(
    minBudget: bigint,
    maxBudget: bigint
  ): Promise<JobPosting[]> {
    try {
      // Get all job postings first
      const allPostings = await this.getJobPostings()
      
      // Filter by budget range
      const filteredPostings = allPostings.filter(posting => {
        const budget = posting.budget || 0n
        return budget >= minBudget && budget <= maxBudget
      })
      
      return filteredPostings
    } catch (error) {
      console.warn('Failed to search jobs by budget:', error)
      return []
    }
  }

}