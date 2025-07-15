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
    // Note: UpdateServiceListing instruction not implemented in the Rust program yet
    // For now, we'd need to close the old listing and create a new one
    // This is a placeholder for when the instruction is added
    throw new Error('Service listing updates are not yet supported by the on-chain program. Please create a new listing instead.')
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

  /**
   * List services (alias for getServiceListings for CLI compatibility)
   */
  async listServices(options: { category?: string } = {}): Promise<any[]> {
    const listings = await this.getServiceListings()
    
    // Filter by category if provided
    if (options.category) {
      return listings.filter(listing => 
        listing.serviceType?.toLowerCase().includes(options.category.toLowerCase())
      )
    }
    
    // Transform to CLI expected format
    return listings.map(listing => ({
      id: listing.address,
      title: listing.title || 'Untitled Service',
      description: listing.description || '',
      category: listing.serviceType || 'general',
      price: listing.price || 0n,
      isAvailable: listing.isActive || false,
      agentName: 'Agent', // Would need to fetch from agent account
      agentAddress: listing.agent
    }))
  }

  /**
   * Create a service listing (CLI-compatible interface)
   */
  async createListing(params: {
    agentAddress: Address
    title: string
    description: string
    category: string
    price: bigint
    tags?: string[]
  }): Promise<{
    signature: string
    listingAddress: Address
  }> {
    const signer = this.signer
    if (!signer) {
      throw new Error('Signer required for creating listing')
    }

    // Generate listing ID from title
    const listingId = params.title.toLowerCase().replace(/\s+/g, '-')
    
    // Find PDA for service listing
    const { deriveServiceListingPda } = await import('../../utils/pda.js')
    const listingAddress = await deriveServiceListingPda(this.programId, params.agentAddress, listingId)
    
    // Find user registry PDA
    const { deriveUserRegistryPda } = await import('../../utils/pda.js')
    const userRegistryAddress = await deriveUserRegistryPda(this.programId, signer.address)
    
    // Create listing params
    const listingParams: CreateServiceListingParams = {
      title: params.title,
      description: params.description,
      price: params.price,
      tokenMint: params.agentAddress, // Use a default mint for now
      serviceType: params.category,
      paymentToken: params.agentAddress, // Use a default token
      estimatedDelivery: BigInt(7 * 24 * 60 * 60), // 7 days default
      tags: params.tags || [params.category],
      listingId
    }
    
    const signature = await this.createServiceListing(
      signer,
      listingAddress,
      params.agentAddress,
      userRegistryAddress,
      listingParams
    )
    
    return {
      signature,
      listingAddress
    }
  }

  /**
   * Get service details (CLI-compatible interface)
   */
  async getService(options: { serviceId: Address }): Promise<any> {
    const listing = await this.getServiceListing(options.serviceId)
    
    if (!listing) {
      throw new Error('Service not found')
    }
    
    return {
      id: listing.address,
      title: listing.title || 'Untitled Service',
      description: listing.description || '',
      category: listing.serviceType || 'general',
      price: listing.price || 0n,
      isAvailable: listing.isActive || false,
      requirements: listing.requirements || [],
      deliveryTime: listing.estimatedDelivery || 0n,
      agentAddress: listing.agent
    }
  }

  /**
   * Purchase a service (CLI-compatible interface)
   */
  async purchaseService(params: {
    serviceId: Address
    requirements?: string[]
  }): Promise<{
    signature: string
    purchaseId: Address
  }> {
    const signer = this.signer
    if (!signer) {
      throw new Error('Signer required for purchasing service')
    }

    // Find PDA for service purchase
    const { deriveServicePurchasePda } = await import('../../utils/pda.js')
    const purchaseAddress = await deriveServicePurchasePda(
      this.programId,
      params.serviceId,
      signer.address
    )
    
    // Fetch listing details
    const listing = await this.getServiceListing(params.serviceId)
    if (!listing) {
      throw new Error('Service not found')
    }
    
    const signature = await super.purchaseService(
      signer,
      purchaseAddress,
      params.serviceId,
      listing.listingId || 0n,
      1, // quantity
      params.requirements || [],
      '', // custom instructions
      BigInt(Date.now() / 1000 + 7 * 24 * 60 * 60) // 7 days deadline
    )
    
    return {
      signature,
      purchaseId: purchaseAddress
    }
  }

  /**
   * Search services (CLI-compatible interface)
   */
  async searchServices(options: { query: string }): Promise<any[]> {
    const allServices = await this.listServices()
    
    // Simple text search across title, description, and category
    const query = options.query.toLowerCase()
    return allServices.filter(service => 
      service.title.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query)
    )
  }

  /**
   * Create job posting (CLI-compatible interface)
   */
  async createJobPosting(params: {
    title: string
    description: string
    category: string
    requirements: string[]
    budget: bigint
    deadline?: bigint
  }): Promise<{
    signature: string
    jobId: Address
  }> {
    const signer = this.signer
    if (!signer) {
      throw new Error('Signer required for creating job posting')
    }

    // Find PDA for job posting
    const { deriveJobPostingPda } = await import('../../utils/pda.js')
    const jobId = params.title.toLowerCase().replace(/\s+/g, '-')
    const jobAddress = await deriveJobPostingPda(this.programId, signer.address, jobId)
    
    const jobParams: CreateJobPostingParams = {
      title: params.title,
      description: params.description,
      budget: params.budget,
      deadline: params.deadline || BigInt(Date.now() / 1000 + 30 * 24 * 60 * 60), // 30 days default
      requirements: params.requirements,
      skillsNeeded: [params.category],
      budgetMin: params.budget,
      budgetMax: params.budget,
      paymentToken: signer.address, // Use default token
      jobType: params.category,
      experienceLevel: 'any'
    }
    
    const signature = await super.createJobPosting(
      signer,
      jobAddress,
      jobParams
    )
    
    return {
      signature,
      jobId: jobAddress
    }
  }

  /**
   * List jobs (CLI-compatible interface)
   */
  async listJobs(options: { 
    myJobsOnly?: Address
    category?: string 
  } = {}): Promise<any[]> {
    const postings = await this.getJobPostings()
    
    let filtered = postings
    
    // Filter by owner if requested
    if (options.myJobsOnly) {
      filtered = filtered.filter(posting => 
        posting.employer?.toString() === options.myJobsOnly?.toString()
      )
    }
    
    // Filter by category if provided
    if (options.category) {
      filtered = filtered.filter(posting => 
        posting.jobType?.toLowerCase().includes(options.category.toLowerCase())
      )
    }
    
    // Transform to CLI expected format
    return filtered.map(posting => ({
      id: posting.address,
      title: posting.title || 'Untitled Job',
      description: posting.description || '',
      category: posting.jobType || 'general',
      budget: posting.budget || 0n,
      deadline: posting.deadline || 0n,
      requirements: posting.requirements || [],
      employer: posting.employer,
      applicants: posting.applicantCount || 0,
      status: posting.isActive ? 'open' : 'closed'
    }))
  }

  /**
   * Apply to job (CLI-compatible interface)
   */
  async applyToJob(params: {
    jobId: Address
    agentAddress: Address
    proposal: string
  }): Promise<{
    signature: string
    applicationId: Address
  }> {
    const signer = this.signer
    if (!signer) {
      throw new Error('Signer required for job application')
    }

    // Find PDA for job application
    const { deriveJobApplicationPda } = await import('../../utils/pda.js')
    const applicationAddress = await deriveJobApplicationPda(
      this.programId,
      params.jobId,
      params.agentAddress
    )
    
    // Fetch job details
    const job = await this.getJobPostings()
      .then(jobs => jobs.find(j => j.address.toString() === params.jobId.toString()))
    
    if (!job) {
      throw new Error('Job not found')
    }
    
    const signature = await super.applyToJob(
      signer,
      applicationAddress,
      params.jobId,
      params.agentAddress,
      params.proposal, // cover letter
      job.budget || 0n, // proposed price
      30, // estimated duration in days
      job.budget || 0n, // proposed rate
      BigInt(Date.now() / 1000 + 30 * 24 * 60 * 60), // estimated delivery
      [] // portfolio items
    )
    
    return {
      signature,
      applicationId: applicationAddress
    }
  }
}