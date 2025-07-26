import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { 
  GhostSpeakConfig,
  ServiceListingWithAddress
} from '../../types/index.js'
import {
  getCreateServiceListingInstruction,
  getCreateJobPostingInstruction,
  getPurchaseServiceInstruction,
  getApplyToJobInstruction,
  getAcceptJobApplicationInstruction,
  getProcessEscrowPaymentInstructionAsync,
  getVerifyWorkDeliveryInstruction,
  type ServiceListing,
  type JobPosting,
  type WorkOrder
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'
import {
  calculateTransferFee,
  calculateRequiredAmountForNetTransfer,
  type TransferFeeCalculation
} from '../../utils/token-2022-extensions.js'
import {
  hasTransferFees,
  fetchTransferFeeConfig
} from '../../utils/token-utils.js'

import type {
  BaseCreationParams,
  BaseTokenParams,
  BaseTimeParams,
  BaseInstructionParams
} from './BaseInterfaces.js'

// Service listing creation parameters
export interface CreateServiceListingParams extends BaseCreationParams, BaseTokenParams {
  tokenMint?: Address
  serviceType?: string
  paymentToken?: Address
  estimatedDelivery?: bigint
  tags?: string[]
  listingId?: string
}

// Job posting creation parameters
export interface CreateJobPostingParams extends BaseCreationParams, BaseTokenParams, BaseTimeParams {
  requirements?: string[]
  skillsNeeded?: string[]
  budgetMin?: bigint
  budgetMax?: bigint
  paymentToken?: Address
  jobType?: string
  experienceLevel?: string
}

// Service purchase parameters
export interface PurchaseServiceParams extends BaseInstructionParams {
  serviceListingAddress: Address
  listingId?: bigint
  quantity?: number
  requirements?: string[]
  customInstructions?: string
  deadline?: bigint
  // Token-2022 specific parameters
  paymentTokenMint?: Address
  calculateTransferFees?: boolean
  expectedNetAmount?: bigint
}

// Job application parameters
export interface JobApplicationParams extends BaseInstructionParams {
  jobPostingAddress: Address
  agentAddress: Address
  coverLetter?: string
  proposedPrice?: bigint
  estimatedDuration?: number
  proposedRate?: bigint
  estimatedDelivery?: bigint
  portfolioItems?: string[]
}

// Work order verification parameters
export interface WorkOrderVerificationParams extends BaseInstructionParams {
  workOrderAddress: Address
  workDeliveryAddress: Address
  verificationNotes?: string
  approveDelivery: boolean
}

// Milestone-based payment parameters
export interface MilestonePaymentParams extends BaseInstructionParams {
  workOrderAddress: Address
  escrowAddress: Address
  milestoneIndex: number
  paymentAmount: bigint
  paymentToken: Address
}

// Token-2022 transfer fee result
export interface TokenTransferResult {
  originalAmount: bigint
  feeAmount: bigint
  netAmount: bigint
  totalRequired: bigint
  feeCalculation: TransferFeeCalculation
}

/**
 * Instructions for marketplace operations
 */
export class MarketplaceInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Resolve service listing parameters with smart defaults
   */
  private async _resolveServiceListingParams(
    params: CreateServiceListingParams & { signer: TransactionSigner }
  ): Promise<Required<CreateServiceListingParams> & { signer: TransactionSigner }> {
    // Auto-generate listing ID if not provided
    const listingId = params.listingId ?? `listing-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Get USDC token mint as default payment token
    const defaultPaymentToken = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address // USDC on mainnet
    
    return {
      title: params.title,
      description: params.description,
      amount: params.amount,
      tokenMint: params.tokenMint ?? params.paymentToken ?? defaultPaymentToken,
      serviceType: params.serviceType ?? 'general',
      paymentToken: params.paymentToken ?? defaultPaymentToken,
      estimatedDelivery: params.estimatedDelivery ?? BigInt(7 * 24 * 60 * 60), // 7 days default
      tags: params.tags ?? [],
      listingId,
      signer: params.signer
    }
  }

  /**
   * Resolve job posting parameters with smart defaults
   */
  private async _resolveJobPostingParams(
    params: CreateJobPostingParams
  ): Promise<Required<CreateJobPostingParams>> {
    // Auto-calculate budget if min/max not provided
    const budgetMin = params.budgetMin ?? params.amount ?? 0n
    const budgetMax = params.budgetMax ?? params.amount ?? budgetMin * 2n
    
    // Get USDC token mint as default payment token
    const defaultPaymentToken = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address // USDC on mainnet
    
    return {
      title: params.title,
      description: params.description,
      amount: params.amount ?? budgetMax,
      requirements: params.requirements ?? [],
      deadline: params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60), // 30 days default
      skillsNeeded: params.skillsNeeded ?? [],
      budgetMin,
      budgetMax,
      paymentToken: params.paymentToken ?? defaultPaymentToken,
      jobType: params.jobType ?? 'fixed',
      experienceLevel: params.experienceLevel ?? 'any',
      signer: params.signer, // Keep signer as-is
      tokenMint: params.tokenMint ?? defaultPaymentToken, // Add tokenMint
      createdAt: params.createdAt ?? BigInt(Math.floor(Date.now() / 1000)) // Add createdAt
    }
  }

  /**
   * Resolve purchase parameters with smart defaults
   */
  private async _resolvePurchaseParams(
    params: PurchaseServiceParams
  ): Promise<Required<PurchaseServiceParams>> {
    return {
      serviceListingAddress: params.serviceListingAddress,
      listingId: params.listingId ?? 0n,
      quantity: params.quantity ?? 1,
      requirements: params.requirements ?? [],
      customInstructions: params.customInstructions ?? '',
      deadline: params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60), // 14 days default
      signer: params.signer, // Keep signer as-is
      // Token-2022 specific defaults
      paymentTokenMint: params.paymentTokenMint ?? ('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address), // Default to USDC
      calculateTransferFees: params.calculateTransferFees ?? true, // Default to calculating fees
      expectedNetAmount: params.expectedNetAmount ?? BigInt(0)
    }
  }

  /**
   * Resolve job application parameters with smart defaults
   */
  private async _resolveApplicationParams(
    params: JobApplicationParams
  ): Promise<Required<JobApplicationParams>> {
    return {
      jobPostingAddress: params.jobPostingAddress,
      agentAddress: params.agentAddress,
      coverLetter: params.coverLetter ?? 'I am interested in this job opportunity.',
      proposedPrice: params.proposedPrice ?? 0n, // Will be set based on job budget
      estimatedDuration: params.estimatedDuration ?? 7, // 7 days default
      proposedRate: params.proposedRate ?? 0n,
      estimatedDelivery: params.estimatedDelivery ?? BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
      portfolioItems: params.portfolioItems ?? [],
      signer: params.signer // Keep signer as-is
    }
  }

  /**
   * Create a new service listing
   */
  async createServiceListing(
    signer: TransactionSigner,
    serviceListingAddress: Address,
    agentAddress: Address,
    userRegistryAddress: Address,
    params: CreateServiceListingParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveServiceListingParams({ ...params, signer })
    
    return this.executeInstruction(
      () => getCreateServiceListingInstruction({
        serviceListing: serviceListingAddress,
        agent: agentAddress,
        userRegistry: userRegistryAddress,
        creator: signer,
        title: resolvedParams.title,
        description: resolvedParams.description,
        price: resolvedParams.amount,
        tokenMint: resolvedParams.tokenMint,
        serviceType: resolvedParams.serviceType,
        paymentToken: resolvedParams.paymentToken,
        estimatedDelivery: resolvedParams.estimatedDelivery,
        tags: resolvedParams.tags,
        listingId: resolvedParams.listingId
      }),
      signer,
      'service listing creation'
    )
  }

  /**
   * Update a service listing
   */
  async updateServiceListing(
    signer: TransactionSigner,
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
        owner: signer,
        agentPubkey: listing.agent,
        serviceEndpoint: updateData.title ?? `${listing.title} - ${listing.description}`,
        isActive: listing.isActive,
        lastUpdated: BigInt(Math.floor(Date.now() / 1000)),
        metadataUri: updateData.description ?? listing.description,
        capabilities: updateData.tags ?? []
      })
      
      return await this.sendTransaction([instruction as unknown as IInstruction], [signer])
    } catch (error) {
      console.warn('Failed to update service listing via agent service:', error)
      throw new Error('Service listing updates require implementing updateServiceListing instruction in the smart contract, or create a new listing')
    }
  }

  /**
   * Purchase a service with Token-2022 transfer fee support
   */
  async purchaseService(
    servicePurchaseAddress: Address,
    params: PurchaseServiceParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolvePurchaseParams(params)
    
    // Get service listing to determine payment details
    const serviceListing = await this.getServiceListing(resolvedParams.serviceListingAddress)
    if (!serviceListing) {
      throw new Error('Service listing not found')
    }

    // Calculate transfer fees if requested
    let feeResult: TokenTransferResult | undefined
    if (params.calculateTransferFees && params.paymentTokenMint) {
      const paymentAmount = params.expectedNetAmount ?? serviceListing.price
      feeResult = await this.calculateTokenTransferFees(
        paymentAmount,
        params.paymentTokenMint,
        !!params.expectedNetAmount // Use net calculation if expectedNetAmount provided
      )
      
      console.log(`Service purchase with transfer fees:`, {
        originalAmount: feeResult.originalAmount,
        feeAmount: feeResult.feeAmount,
        netAmount: feeResult.netAmount,
        totalRequired: feeResult.totalRequired
      })
    }
    
    return this.executeInstruction(
      () => getPurchaseServiceInstruction({
        servicePurchase: servicePurchaseAddress,
        serviceListing: resolvedParams.serviceListingAddress,
        buyer: resolvedParams.signer,
        listingId: resolvedParams.listingId,
        quantity: resolvedParams.quantity,
        requirements: resolvedParams.requirements,
        customInstructions: resolvedParams.customInstructions,
        deadline: resolvedParams.deadline
      }),
      resolvedParams.signer as unknown as TransactionSigner,
      `service purchase${feeResult ? ` (with ${feeResult.feeAmount} transfer fee)` : ''}`
    )
  }

  /**
   * Create a new job posting
   */
  async createJobPosting(
    jobPostingAddress: Address,
    params: CreateJobPostingParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveJobPostingParams(params)
    
    return this.executeInstruction(
      () => getCreateJobPostingInstruction({
        jobPosting: jobPostingAddress,
        employer: resolvedParams.signer,
        title: resolvedParams.title,
        description: resolvedParams.description,
        requirements: resolvedParams.requirements,
        budget: resolvedParams.amount,
        deadline: resolvedParams.deadline,
        skillsNeeded: resolvedParams.skillsNeeded,
        budgetMin: resolvedParams.budgetMin,
        budgetMax: resolvedParams.budgetMax,
        paymentToken: resolvedParams.paymentToken,
        jobType: resolvedParams.jobType,
        experienceLevel: resolvedParams.experienceLevel
      }),
      resolvedParams.signer as unknown as TransactionSigner,
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
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveApplicationParams(params)
    
    return this.executeInstruction(
      () => getApplyToJobInstruction({
        jobApplication: jobApplicationAddress,
        jobPosting: resolvedParams.jobPostingAddress,
        agent: resolvedParams.agentAddress,
        agentOwner: resolvedParams.signer,
        coverLetter: resolvedParams.coverLetter,
        proposedPrice: resolvedParams.proposedPrice,
        estimatedDuration: resolvedParams.estimatedDuration,
        proposedRate: resolvedParams.proposedRate,
        estimatedDelivery: resolvedParams.estimatedDelivery,
        portfolioItems: resolvedParams.portfolioItems
      }),
      resolvedParams.signer as unknown as TransactionSigner,
      'job application'
    )
  }

  /**
   * Accept a job application
   */
  async acceptJobApplication(
    signer: TransactionSigner,
    jobContractAddress: Address,
    jobPostingAddress: Address,
    jobApplicationAddress: Address
  ): Promise<string> {
    return this.executeInstruction(
      () => getAcceptJobApplicationInstruction({
        jobContract: jobContractAddress,
        jobPosting: jobPostingAddress,
        jobApplication: jobApplicationAddress,
        employer: signer
      }),
      signer,
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
  async getServiceListings(): Promise<ServiceListingWithAddress[]> {
    const accounts = await this.getDecodedProgramAccounts<ServiceListing>('getServiceListingDecoder')
    
    // Filter only active listings
    return accounts
      .filter(({ data }) => data.isActive)
      .map(({ address, data }) => ({ address, data } as unknown as ServiceListingWithAddress))
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
   * Calculate Token-2022 transfer fees for a payment
   * 
   * @param paymentAmount - The base payment amount
   * @param tokenMint - The token mint address  
   * @param useNetAmount - If true, calculate required gross amount for desired net
   * @returns TokenTransferResult with fee calculations
   */
  async calculateTokenTransferFees(
    paymentAmount: bigint, 
    tokenMint: Address,
    useNetAmount: boolean = false
  ): Promise<TokenTransferResult> {
    try {
      // Check if token has transfer fees using the new RPC-based function
      const hasFeeExtension = await hasTransferFees(this.config.rpc, tokenMint)
      
      if (!hasFeeExtension) {
        // No transfer fees - return original amounts
        return {
          originalAmount: paymentAmount,
          feeAmount: 0n,
          netAmount: paymentAmount, 
          totalRequired: paymentAmount,
          feeCalculation: {
            transferAmount: paymentAmount,
            feeAmount: 0n,
            netAmount: paymentAmount,
            feeBasisPoints: 0,
            wasFeeCapped: false
          }
        }
      }

      // Fetch real transfer fee configuration via RPC
      const feeConfig = await fetchTransferFeeConfig(this.config.rpc, tokenMint)
      
      if (!feeConfig) {
        // If we can't fetch fee config, treat as no fees
        return {
          originalAmount: paymentAmount,
          feeAmount: 0n,
          netAmount: paymentAmount, 
          totalRequired: paymentAmount,
          feeCalculation: {
            transferAmount: paymentAmount,
            feeAmount: 0n,
            netAmount: paymentAmount,
            feeBasisPoints: 0,
            wasFeeCapped: false
          }
        }
      }
      
      let feeCalculation: TransferFeeCalculation
      
      if (useNetAmount) {
        // Calculate required gross amount for desired net payment
        feeCalculation = calculateRequiredAmountForNetTransfer(paymentAmount, feeConfig)
        
        return {
          originalAmount: paymentAmount, // This is the desired net amount
          feeAmount: feeCalculation.feeAmount,
          netAmount: feeCalculation.netAmount,
          totalRequired: feeCalculation.transferAmount, // Gross amount needed
          feeCalculation
        }
      } else {
        // Calculate fee for gross payment amount
        feeCalculation = calculateTransferFee(paymentAmount, feeConfig)
        
        return {
          originalAmount: paymentAmount,
          feeAmount: feeCalculation.feeAmount,
          netAmount: feeCalculation.netAmount,
          totalRequired: paymentAmount,
          feeCalculation
        }
      }
    } catch (error) {
      console.warn('Failed to calculate transfer fees, assuming no fees:', error)
      
      // Fallback to no fees if calculation fails
      return {
        originalAmount: paymentAmount,
        feeAmount: 0n,
        netAmount: paymentAmount,
        totalRequired: paymentAmount,
        feeCalculation: {
          transferAmount: paymentAmount,
          feeAmount: 0n,
          netAmount: paymentAmount,
          feeBasisPoints: 0,
          wasFeeCapped: false
        }
      }
    }
  }

  /**
   * Process milestone-based escrow payment with Token-2022 support
   * 
   * @param params - Milestone payment parameters
   * @returns Transaction signature
   */
  async processMilestonePayment(
    params: MilestonePaymentParams
  ): Promise<string> {
    // Calculate any transfer fees
    const feeResult = await this.calculateTokenTransferFees(
      params.paymentAmount,
      params.paymentToken,
      false // Use gross amount calculation
    )

    // Get work order to validate milestone
    const workOrder = await this.getDecodedAccount<WorkOrder>(
      params.workOrderAddress,
      'getWorkOrderDecoder'
    )
    
    if (!workOrder) {
      throw new Error('Work order not found')
    }

    // Validate milestone index (basic validation)
    if (params.milestoneIndex < 0) {
      throw new Error('Invalid milestone index')
    }

    // Create escrow payment instruction with fee handling
    const instruction = await getProcessEscrowPaymentInstructionAsync({
      escrow: params.escrowAddress,
      recipient: workOrder.provider,
      paymentToken: params.paymentToken,
      authority: params.signer,
      workOrder: params.workOrderAddress
    })

    // Include fee information in transaction memo if fees apply
    const instructions = [instruction]
    
    if (feeResult.feeAmount > 0n) {
      console.log(`Processing milestone payment with transfer fee: ${feeResult.feeAmount} (${feeResult.feeCalculation.feeBasisPoints} basis points)`)
    }

    return this.sendTransaction(instructions, [params.signer])
  }

  /**
   * Verify work delivery and optionally process milestone payment
   * 
   * @param params - Work order verification parameters
   * @returns Transaction signature
   */
  async verifyWorkDelivery(
    params: WorkOrderVerificationParams
  ): Promise<string> {
    const instruction = getVerifyWorkDeliveryInstruction({
      workOrder: params.workOrderAddress,
      workDelivery: params.workDeliveryAddress,
      client: params.signer,
      verificationNotes: params.verificationNotes ?? null
    })

    return this.executeInstruction(
      () => instruction,
      params.signer,
      'work delivery verification'
    )
  }

  /**
   * Get work order details
   * 
   * @param workOrderAddress - Work order account address
   * @returns Work order data or null if not found
   */
  async getWorkOrder(workOrderAddress: Address): Promise<WorkOrder | null> {
    return this.getDecodedAccount<WorkOrder>(workOrderAddress, 'getWorkOrderDecoder')
  }

  /**
   * Get all work orders for a client or provider
   * 
   * @param userAddress - Client or provider address to filter by
   * @param role - Filter by 'client' or 'provider' role
   * @returns Array of work orders
   */
  async getWorkOrdersByUser(
    userAddress: Address,
    role: 'client' | 'provider' = 'client'
  ): Promise<WorkOrder[]> {
    const accounts = await this.getDecodedProgramAccounts<WorkOrder>('getWorkOrderDecoder')
    
    return accounts
      .map(({ data }) => data)
      .filter(workOrder => {
        if (role === 'client') {
          return workOrder.client === userAddress
        } else {
          return workOrder.provider === userAddress
        }
      })
  }

  /**
   * Search service listings by category
   */
  async searchServicesByCategory(category: string): Promise<ServiceListingWithAddress[]> {
    const allListings = await this.getServiceListings()
    
    // Filter by category/service type
    return allListings.filter(({ data }) => {
      const service = data as ServiceListing
      return service.serviceType?.toLowerCase().includes(category.toLowerCase()) ||
             service.tags?.some((tag: string) => tag.toLowerCase().includes(category.toLowerCase()))
    })
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