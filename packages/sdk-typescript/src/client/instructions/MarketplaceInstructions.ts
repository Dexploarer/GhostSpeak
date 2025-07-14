import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Update a service listing
   */
  async updateServiceListing(
    signer: KeyPairSigner,
    listingAddress: Address,
    updateData: Partial<CreateServiceListingParams>
  ): Promise<string> {
    console.log('Updating service listing:', listingAddress, updateData)
    throw new Error('Service listing update not yet implemented - waiting for Codama generation')
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Get all active service listings
   */
  async getServiceListings(): Promise<ServiceListing[]> {
    console.log('Fetching service listings')
    throw new Error('Service listing fetching not yet implemented - waiting for Codama generation')
  }

  /**
   * Get all active job postings
   */
  async getJobPostings(): Promise<JobPosting[]> {
    console.log('Fetching job postings')
    throw new Error('Job posting fetching not yet implemented - waiting for Codama generation')
  }

  /**
   * Search service listings by category
   */
  async searchServicesByCategory(category: string): Promise<ServiceListing[]> {
    console.log('Searching services by category:', category)
    throw new Error('Service search not yet implemented - waiting for Codama generation')
  }

  /**
   * Search job postings by budget range
   */
  async searchJobsByBudget(
    minBudget: bigint,
    maxBudget: bigint
  ): Promise<JobPosting[]> {
    console.log('Searching jobs by budget:', { minBudget, maxBudget })
    throw new Error('Job search not yet implemented - waiting for Codama generation')
  }
}