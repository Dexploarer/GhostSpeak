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
  type ServiceListing,
  type JobPosting
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'

import type {
  BaseCreationParams,
  BaseTokenParams,
  BaseTimeParams,
  BaseInstructionParams
} from './BaseInterfaces.js'

// Service listing creation parameters
export interface CreateServiceListingParams extends BaseCreationParams, BaseTokenParams {
  tokenMint: Address
  serviceType: string
  paymentToken: Address
  estimatedDelivery: bigint
  tags: string[]
  listingId: string
}

// Job posting creation parameters
export interface CreateJobPostingParams extends BaseCreationParams, BaseTokenParams, BaseTimeParams {
  requirements: string[]
  skillsNeeded: string[]
  budgetMin: bigint
  budgetMax: bigint
  paymentToken: Address
  jobType: string
  experienceLevel: string
}

// Service purchase parameters
export interface PurchaseServiceParams extends BaseInstructionParams {
  serviceListingAddress: Address
  listingId: bigint
  quantity: number
  requirements: string[]
  customInstructions: string
  deadline: bigint
}

// Job application parameters
export interface JobApplicationParams extends BaseInstructionParams {
  jobPostingAddress: Address
  agentAddress: Address
  coverLetter: string
  proposedPrice: bigint
  estimatedDuration: number
  proposedRate: bigint
  estimatedDelivery: bigint
  portfolioItems: string[]
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
    return this.executeInstruction(
      () => getCreateServiceListingInstruction({
        serviceListing: serviceListingAddress,
        agent: agentAddress,
        userRegistry: userRegistryAddress,
        creator: signer as unknown as TransactionSigner,
        title: params.title,
        description: params.description,
        price: params.amount,
        tokenMint: params.tokenMint,
        serviceType: params.serviceType,
        paymentToken: params.paymentToken,
        estimatedDelivery: params.estimatedDelivery,
        tags: params.tags,
        listingId: params.listingId
      }),
      signer as unknown as TransactionSigner,
      'service listing creation'
    )
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
    
    try {
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
        serviceEndpoint: updateData.title ?? `${listing.title} - ${listing.description}`,
        isActive: listing.isActive,
        lastUpdated: BigInt(Math.floor(Date.now() / 1000)),
        metadataUri: updateData.description ?? listing.description,
        capabilities: updateData.tags ?? []
      })
      
      return await this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
    } catch (error) {
      console.warn('Failed to update service listing via agent service:', error)
      throw new Error('Service listing updates require implementing updateServiceListing instruction in the smart contract, or create a new listing')
    }
  }

  /**
   * Purchase a service
   */
  async purchaseService(
    servicePurchaseAddress: Address,
    params: PurchaseServiceParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getPurchaseServiceInstruction({
        servicePurchase: servicePurchaseAddress,
        serviceListing: params.serviceListingAddress,
        buyer: params.signer as unknown as TransactionSigner,
        listingId: params.listingId,
        quantity: params.quantity,
        requirements: params.requirements,
        customInstructions: params.customInstructions,
        deadline: params.deadline
      }),
      params.signer as unknown as TransactionSigner,
      'service purchase'
    )
  }

  /**
   * Create a new job posting
   */
  async createJobPosting(
    jobPostingAddress: Address,
    params: CreateJobPostingParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getCreateJobPostingInstruction({
        jobPosting: jobPostingAddress,
        employer: params.signer as unknown as TransactionSigner,
        title: params.title,
        description: params.description,
        requirements: params.requirements,
        budget: params.amount,
        deadline: params.deadline,
        skillsNeeded: params.skillsNeeded,
        budgetMin: params.budgetMin,
        budgetMax: params.budgetMax,
        paymentToken: params.paymentToken,
        jobType: params.jobType,
        experienceLevel: params.experienceLevel
      }),
      params.signer as unknown as TransactionSigner,
      'job posting creation'
    )
  }

  /**
   * Apply to a job
   */
  async applyToJob(
    jobApplicationAddress: Address,
    params: JobApplicationParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getApplyToJobInstruction({
        jobApplication: jobApplicationAddress,
        jobPosting: params.jobPostingAddress,
        agent: params.agentAddress,
        agentOwner: params.signer as unknown as TransactionSigner,
        coverLetter: params.coverLetter,
        proposedPrice: params.proposedPrice,
        estimatedDuration: params.estimatedDuration,
        proposedRate: params.proposedRate,
        estimatedDelivery: params.estimatedDelivery,
        portfolioItems: params.portfolioItems
      }),
      params.signer as unknown as TransactionSigner,
      'job application'
    )
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
    return this.executeInstruction(
      () => getAcceptJobApplicationInstruction({
        jobContract: jobContractAddress,
        jobPosting: jobPostingAddress,
        jobApplication: jobApplicationAddress,
        employer: signer as unknown as TransactionSigner
      }),
      signer as unknown as TransactionSigner,
      'job application acceptance'
    )
  }

  /**
   * Get a single service listing
   */
  async getServiceListing(listingAddress: Address): Promise<ServiceListing | null> {
    return this.getDecodedAccount<ServiceListing>(listingAddress, 'getServiceListingDecoder')
  }

  /**
   * Get all active service listings
   */
  async getServiceListings(): Promise<ServiceListing[]> {
    const accounts = await this.getDecodedProgramAccounts<ServiceListing>('getServiceListingDecoder')
    
    // Filter only active listings
    return accounts
      .map(({ data }) => data)
      .filter(listing => listing.isActive)
  }

  /**
   * Get all active job postings
   */
  async getJobPostings(): Promise<JobPosting[]> {
    const accounts = await this.getDecodedProgramAccounts<JobPosting>('getJobPostingDecoder')
    
    // Filter only active postings
    return accounts
      .map(({ data }) => data)
      .filter(posting => posting.isActive)
  }

  /**
   * Search service listings by category
   */
  async searchServicesByCategory(category: string): Promise<ServiceListing[]> {
    const allListings = await this.getServiceListings()
    
    // Filter by category/service type
    return allListings.filter(listing => 
      listing.serviceType?.toLowerCase().includes(category.toLowerCase()) ||
      listing.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
    )
  }

  /**
   * Search job postings by budget range
   */
  async searchJobsByBudget(
    minBudget: bigint,
    maxBudget: bigint
  ): Promise<JobPosting[]> {
    const allPostings = await this.getJobPostings()
    
    // Filter by budget range
    return allPostings.filter(posting => {
      const budget = posting.budget ?? 0n
      return budget >= minBudget && budget <= maxBudget
    })
  }

}