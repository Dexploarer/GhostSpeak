import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import { NATIVE_MINT_ADDRESS } from '../../constants/system-addresses.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../../constants/ghostspeak.js'
import {
  deriveJobPostingPda,
  deriveAuctionPda
} from '../../utils/pda.js'
import {
  getCreateServiceListingInstructionAsync,
  getPurchaseServiceInstruction,
  getCreateJobPostingInstructionAsync,
  getApplyToJobInstructionAsync,
  getAcceptJobApplicationInstructionAsync,
  getCreateServiceAuctionInstructionAsync,
  getPlaceAuctionBidInstruction,
  getFinalizeAuctionInstruction,
  getUpdateAgentServiceInstruction,
  type ServiceListing,
  type JobPosting,
  type JobApplication,
  type AuctionMarketplace,
  type ServicePurchase,
  AuctionType,
  type DutchAuctionConfig
} from '../../generated/index.js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================


/**
 * Marketplace management module
 * 
 * Provides high-level access to marketplace operations including:
 * - Service listings and purchases
 * - Job postings and applications  
 * - Service auctions and bidding
 * - Marketplace queries and filtering
 */
export class MarketplaceModule extends BaseModule {
  
  // =====================================================
  // DIRECT INSTRUCTION ACCESS
  // These methods provide direct access to generated instructions
  // with minimal wrapping for maximum flexibility
  // =====================================================

  /**
   * Get create service listing instruction
   */
  getCreateServiceListingInstruction(params: {
    agent: Address
    creator: TransactionSigner
    title: string
    description: string
    price: bigint
    tokenMint: Address
    serviceType: string
    paymentToken: Address
    estimatedDelivery: number
    tags: string[]
    listingId: string
  }) {
    return getCreateServiceListingInstructionAsync(params)
  }

  /**
   * Get purchase service instruction
   */
  getPurchaseServiceInstruction(params: {
    serviceListing: Address
    servicePurchase: Address
    buyer: TransactionSigner
    listingId: number
    quantity: number
    requirements: string[]
    customInstructions: string
    deadline: number
  }) {
    return getPurchaseServiceInstruction(params)
  }

  /**
   * Get create job posting instruction
   */
  getCreateJobPostingInstruction(params: {
    jobPosting?: Address
    employer: TransactionSigner
    title: string
    description: string
    requirements: string[]
    budget: number | bigint
    deadline: number | bigint
    skillsNeeded: string[]
    budgetMin: number | bigint
    budgetMax: number | bigint
    paymentToken: Address
    jobType: string
    experienceLevel: string
  }) {
    return getCreateJobPostingInstructionAsync(params)
  }

  /**
   * Get apply to job instruction
   */
  getApplyToJobInstruction(params: {
    jobApplication?: Address
    jobPosting: Address
    agent: Address
    agentOwner: TransactionSigner
    coverLetter: string
    proposedPrice: number | bigint
    estimatedDuration: number
    proposedRate: number | bigint
    estimatedDelivery: number | bigint
    portfolioItems: string[]
  }) {
    return getApplyToJobInstructionAsync(params)
  }

  /**
   * Get accept job application instruction
   */
  getAcceptJobApplicationInstruction(params: {
    jobContract?: Address
    jobPosting: Address
    jobApplication: Address
    employer: TransactionSigner
  }) {
    return getAcceptJobApplicationInstructionAsync(params)
  }

  /**
   * Get create service auction instruction
   */
  getCreateServiceAuctionInstruction(params: {
    auction?: Address
    agent: Address
    userRegistry: Address
    creator: TransactionSigner
    systemProgram?: Address
    clock?: Address
    auctionType: AuctionType
    startingPrice: bigint
    reservePrice: bigint
    isReserveHidden: boolean
    currentBid: bigint
    currentBidder: Address | null
    auctionEndTime: bigint
    minimumBidIncrement: bigint
    totalBids: number
    dutchConfig: DutchAuctionConfig | null
  }) {
    return getCreateServiceAuctionInstructionAsync(params)
  }

  /**
   * Get place auction bid instruction
   */
  getPlaceAuctionBidInstruction(params: {
    auction: Address
    userRegistry: Address
    bidder: TransactionSigner
    systemProgram?: Address
    clock?: Address
    bidAmount: bigint
  }) {
    return getPlaceAuctionBidInstruction(params)
  }

  /**
   * Get finalize auction instruction
   */
  getFinalizeAuctionInstruction(params: {
    auction: Address
    authority: TransactionSigner
    clock?: Address
  }) {
    return getFinalizeAuctionInstruction(params)
  }

  /**
   * Get update agent service instruction
   */
  getUpdateAgentServiceInstruction(params: {
    agent: Address
    owner: TransactionSigner
    systemProgram?: Address
    agentPubkey: Address
    serviceEndpoint: string
    isActive: boolean
    lastUpdated: bigint
    metadataUri: string
    capabilities: string[]
  }) {
    return getUpdateAgentServiceInstruction(params)
  }

  // =====================================================
  // CONVENIENCE METHODS
  // These methods provide simplified access to common operations
  // =====================================================

  /**
   * Execute create service listing with convenience wrapper
   */
  async createServiceListing(params: {
    signer: TransactionSigner
    agentAddress: Address
    title: string
    description: string
    pricePerHour: bigint
    category: string
    capabilities: string[]
  }): Promise<string> {
    const instruction = await this.getCreateServiceListingInstruction({
      agent: params.agentAddress,
      creator: params.signer,
      title: params.title,
      description: params.description,
      price: params.pricePerHour,
      tokenMint: this.nativeMint,
      serviceType: params.category,
      paymentToken: this.nativeMint,
      estimatedDelivery: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      tags: params.capabilities,
      listingId: `${params.agentAddress}_${params.title}`
    })

    return this.execute('createServiceListing', () => instruction, [params.signer])
  }

  /**
   * Execute create job posting with convenience wrapper
   */
  async createJobPosting(params: {
    signer: TransactionSigner
    title: string
    description: string
    budget: bigint
    duration: number
    requiredSkills: string[]
    category: string
  }): Promise<string> {
    const jobPostingAddress = await this.deriveJobPostingPda(params.signer.address, params.title)
    
    const instruction = await this.getCreateJobPostingInstruction({
      jobPosting: jobPostingAddress,
      employer: params.signer,
      title: params.title,
      description: params.description,
      requirements: [`Skills: ${params.requiredSkills.join(', ')}`],
      budget: params.budget,
      deadline: Date.now() + (params.duration * 60 * 60 * 1000),
      skillsNeeded: params.requiredSkills,
      budgetMin: params.budget,
      budgetMax: params.budget,
      paymentToken: this.nativeMint,
      jobType: params.category,
      experienceLevel: 'intermediate'
    })

    return this.execute('createJobPosting', () => instruction, [params.signer])
  }

  /**
   * Execute create service auction with convenience wrapper
   */
  async createServiceAuction(params: {
    signer: TransactionSigner
    serviceListingAddress: Address
    startingPrice: bigint
    reservePrice: bigint
    duration: number
    auctionType: 'english' | 'dutch'
  }): Promise<string> {
    const auctionAddress = await this.deriveAuctionPda(params.serviceListingAddress)
    
    const instruction = await this.getCreateServiceAuctionInstruction({
      auction: auctionAddress,
      agent: params.serviceListingAddress, // Placeholder mapping
      userRegistry: auctionAddress, // Placeholder mapping  
      creator: params.signer,
      auctionType: params.auctionType === 'english' ? AuctionType.English : AuctionType.Dutch,
      startingPrice: params.startingPrice,
      reservePrice: params.reservePrice,
      isReserveHidden: false,
      currentBid: BigInt(0),
      currentBidder: null,
      auctionEndTime: BigInt(Date.now() + params.duration * 60 * 60 * 1000),
      minimumBidIncrement: BigInt(1000),
      totalBids: 0,
      dutchConfig: null
    })

    return this.execute('createServiceAuction', () => instruction, [params.signer])
  }

  // =====================================================
  // QUERY OPERATIONS
  // =====================================================

  /**
   * Get service listing account
   */
  async getServiceListing(address: Address): Promise<ServiceListing | null> {
    return super.getAccount<ServiceListing>(address, 'getServiceListingDecoder')
  }

  /**
   * Get job posting account
   */
  async getJobPosting(address: Address): Promise<JobPosting | null> {
    return super.getAccount<JobPosting>(address, 'getJobPostingDecoder')
  }

  /**
   * Get job application account
   */
  async getJobApplication(address: Address): Promise<JobApplication | null> {
    return super.getAccount<JobApplication>(address, 'getJobApplicationDecoder')
  }

  /**
   * Get auction account
   */
  async getAuction(address: Address): Promise<AuctionMarketplace | null> {
    return super.getAccount<AuctionMarketplace>(address, 'getAuctionMarketplaceDecoder')
  }

  /**
   * Get service purchase account
   */
  async getServicePurchase(address: Address): Promise<ServicePurchase | null> {
    return super.getAccount<ServicePurchase>(address, 'getServicePurchaseDecoder')
  }

  /**
   * Get all service listings
   */
  async getAllServiceListings(): Promise<{ address: Address; data: ServiceListing }[]> {
    return this.getProgramAccounts<ServiceListing>('getServiceListingDecoder')
  }

  /**
   * Get service listings by provider
   */
  async getServiceListingsByProvider(provider: Address): Promise<{ address: Address; data: ServiceListing }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: provider as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<ServiceListing>('getServiceListingDecoder', filters)
  }

  /**
   * Get all job postings
   */
  async getAllJobPostings(): Promise<{ address: Address; data: JobPosting }[]> {
    return this.getProgramAccounts<JobPosting>('getJobPostingDecoder')
  }

  /**
   * Get job postings by client
   */
  async getJobPostingsByClient(client: Address): Promise<{ address: Address; data: JobPosting }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: client as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<JobPosting>('getJobPostingDecoder', filters)
  }

  /**
   * Get applications for a job posting
   */
  async getJobApplications(jobPostingAddress: Address): Promise<{ address: Address; data: JobApplication }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: jobPostingAddress as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<JobApplication>('getJobApplicationDecoder', filters)
  }

  /**
   * Get all auctions
   */
  async getAllAuctions(): Promise<{ address: Address; data: AuctionMarketplace }[]> {
    return this.getProgramAccounts<AuctionMarketplace>('getAuctionMarketplaceDecoder')
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async deriveJobPostingPda(client: Address, title: string): Promise<Address> {
    return await deriveJobPostingPda(GHOSTSPEAK_PROGRAM_ID, client, title)
  }

  private async deriveAuctionPda(serviceListing: Address): Promise<Address> {
    return await deriveAuctionPda(GHOSTSPEAK_PROGRAM_ID, serviceListing)
  }

  private get nativeMint(): Address {
    return NATIVE_MINT_ADDRESS
  }
}