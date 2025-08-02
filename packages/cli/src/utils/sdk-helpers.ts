/**
 * Safe SDK wrapper functions with proper error handling and type validation
 * This replaces unsafe SDK calls with validated, type-safe alternatives
 */

import { type Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { 
  GhostSpeakClient,
  AuctionClient,
  AgentClient,
  ChannelClient,
  DisputeClient,
  EscrowClient,
  MarketplaceClient,
  GovernanceClient,
  Evidence,
  ListJobsParams,
  CreateChannelParams,
  SendMessageParams,
  FileDisputeParams,
  SubmitEvidenceParams,
  ResolveDisputeParams,
  CreateMultisigParams,
  CreateProposalParams,
  VoteParams,
  CreateJobParams,
  ApplyToJobParams,
  CreateAuctionParams
} from '@ghostspeak/sdk'
import { 
  validateAuctionArray, 
  validateAgentArray, 
  validateChannelArray, 
  validateDisputeArray,
  validateWorkOrderArray,
  validateJobPostingArray,
  validateMarketplaceItemArray,
  validateAndConvertAuction,
  type ValidatedAuctionData,
  type ValidatedAgent,
  type ValidatedChannel,
  type ValidatedDisputeSummary,
  type ValidatedWorkOrder,
  type ValidatedJobPosting,
  type ValidatedMarketplaceItem
} from './type-guards.js'

// Re-export ValidatedAuctionData for external use
export type { ValidatedAuctionData } from './type-guards.js'

// Governance types
export interface ValidatedMultisig {
  address: Address
  name: string
  members: Address[]
  threshold: number
  creator: Address
  pendingProposals?: number
}

export interface ValidatedProposal {
  address: Address
  title: string
  description: string
  type: string
  status: string
  creator: Address
  votesFor?: number
  votesAgainst?: number
  threshold: number
  deadline?: bigint
}

/**
 * Safe auction operations
 */
export class SafeAuctionClient {
  private auctionClient: AuctionClient | undefined

  constructor(client: GhostSpeakClient) {
    this.auctionClient = client.auction
  }

  async listAuctions(_params?: Record<string, unknown>): Promise<ValidatedAuctionData[]> {
    try {
      if (!this.auctionClient) return []
      // AuctionClient.listActive() returns Promise<Auction[]>
      const result = await this.auctionClient.listActive()
      const validated = validateAuctionArray(result)
      // Explicit type assertion to ensure TypeScript recognizes the correct type
      return validated as ValidatedAuctionData[]
    } catch (_error) {
      console.warn('Failed to list auctions:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async getAuctionsEndingSoon(timeWindow: number): Promise<ValidatedAuctionData[]> {
    try {
      if (!this.auctionClient) return []
      // This method doesn't exist in SDK, use listActive and filter
      const auctions = await this.auctionClient.listActive()
      const validatedAuctions = validateAuctionArray(auctions)
      const now = Date.now()
      
      // Filter validated auctions by time window
      const filtered = validatedAuctions.filter(auction => {
        const timeRemaining = Number(auction.auctionEndTime) - now
        return timeRemaining > 0 && timeRemaining <= timeWindow
      })
      
      // Explicit type assertion to ensure TypeScript recognizes the correct type
      return filtered as ValidatedAuctionData[]
    } catch (_error) {
      console.warn('Failed to get ending auctions:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async getAuctionSummary(auctionAddress: Address): Promise<ValidatedAuctionData | null> {
    try {
      if (!this.auctionClient) return null
      // Use getById instead
      const result = await this.auctionClient.getById(auctionAddress)
      const validated = validateAndConvertAuction(result)
      // Explicit type assertion to ensure TypeScript recognizes the correct type
      return validated as ValidatedAuctionData | null
    } catch (_error) {
      console.warn('Failed to get auction summary:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async placeAuctionBid(signer: TransactionSigner, params: { auctionId: string; amount: bigint }): Promise<string | null> {
    try {
      if (!this.auctionClient) return null
      const result = await this.auctionClient.bid(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to place bid:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async finalizeAuction(signer: TransactionSigner, auctionId: string): Promise<string | null> {
    try {
      if (!this.auctionClient) return null
      const result = await this.auctionClient.finalize(signer, auctionId)
      return result.signature
    } catch (_error) {
      console.warn('Failed to finalize auction:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async create(signer: TransactionSigner, params: CreateAuctionParams): Promise<string | null> {
    try {
      if (!this.auctionClient) return null
      const result = await this.auctionClient.create(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to create auction:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async getAuctionAnalytics(): Promise<Record<string, unknown> | null> {
    // This method doesn't exist in SDK, return null
    return null
  }

  async monitorAuction(
    _auctionAddress: Address, 
    _callback: (auction: ValidatedAuctionData) => void
  ): Promise<() => void> {
    // This method doesn't exist in SDK, return no-op
    return () => {}
  }
}

/**
 * Safe agent operations  
 */
export class SafeAgentClient {
  private agentClient: AgentClient | undefined

  constructor(client: GhostSpeakClient) {
    this.agentClient = client.agent
  }

  async listByOwner(params: { owner: Address }): Promise<ValidatedAgent[]> {
    try {
      if (!this.agentClient) return []
      const result = await this.agentClient.listByOwner(params)
      return validateAgentArray(result)
    } catch (_error) {
      console.warn('Failed to list agents:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }
}

/**
 * Safe channel operations
 */
export class SafeChannelClient {
  private channelClient: ChannelClient | undefined

  constructor(client: GhostSpeakClient) {
    this.channelClient = client.channel
  }

  async create(signer: TransactionSigner, params: CreateChannelParams): Promise<string | null> {
    try {
      if (!this.channelClient) return null
      const result = await this.channelClient.create(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to create channel:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async listByParticipant(params: { participant: Address }): Promise<ValidatedChannel[]> {
    try {
      if (!this.channelClient) return []
      const result = await this.channelClient.listByParticipant(params)
      return validateChannelArray(result)
    } catch (_error) {
      console.warn('Failed to list channels:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async sendMessage(signer: TransactionSigner, channelId: Address, params: SendMessageParams): Promise<string | null> {
    try {
      if (!this.channelClient) return null
      const result = await this.channelClient.sendMessage(signer, channelId, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to send message:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }
}

/**
 * Safe dispute operations
 */
export class SafeDisputeClient {
  private disputeClient: DisputeClient | undefined

  constructor(client: GhostSpeakClient) {
    this.disputeClient = client.dispute
  }

  async listDisputes(params?: { status?: string; escrowAddress?: Address }): Promise<ValidatedDisputeSummary[]> {
    try {
      if (!this.disputeClient) return []
      const result = await this.disputeClient.listDisputes(params)
      return validateDisputeArray(result)
    } catch (_error) {
      console.warn('Failed to list disputes:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async getActiveDisputes(userAddress: Address): Promise<ValidatedDisputeSummary[]> {
    try {
      if (!this.disputeClient) return []
      const result = await this.disputeClient.getActiveDisputes(userAddress)
      return validateDisputeArray(result)
    } catch (_error) {
      console.warn('Failed to get active disputes:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async fileDispute(signer: TransactionSigner, params: FileDisputeParams): Promise<string | null> {
    try {
      if (!this.disputeClient) return null
      const result = await this.disputeClient.file(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to file dispute:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async submitEvidence(signer: TransactionSigner, params: SubmitEvidenceParams): Promise<string | null> {
    try {
      if (!this.disputeClient) return null
      const result = await this.disputeClient.submitEvidence(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to submit evidence:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async resolveDispute(signer: TransactionSigner, params: ResolveDisputeParams): Promise<string | null> {
    try {
      if (!this.disputeClient) return null
      const result = await this.disputeClient.resolveDispute(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to resolve dispute:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async escalateDispute(_signer: TransactionSigner, _disputeAddress: Address, _reason: string): Promise<string | null> {
    // This method doesn't exist in SDK, return null
    return null
  }

  async getEvidenceHistory(disputeAddress: Address): Promise<Evidence[]> {
    try {
      if (!this.disputeClient) return []
      const result = await this.disputeClient.getEvidenceHistory(disputeAddress)
      return Array.isArray(result) ? result : []
    } catch (_error) {
      console.warn('Failed to get evidence history:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }
}

/**
 * Safe escrow operations
 */
export class SafeEscrowClient {
  private escrowClient: EscrowClient | undefined

  constructor(client: GhostSpeakClient) {
    this.escrowClient = client.escrow
  }

  async getEscrowsForUser(userAddress: Address): Promise<ValidatedWorkOrder[]> {
    try {
      if (!this.escrowClient) return []
      const result = await this.escrowClient.listByUser(userAddress)
      return validateWorkOrderArray(result)
    } catch (_error) {
      console.warn('Failed to get escrows:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async create(signer: TransactionSigner, params: { provider: Address; amount: bigint; description?: string; paymentToken?: Address }): Promise<string | null> {
    try {
      if (!this.escrowClient) return null
      const result = await this.escrowClient.create(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to create escrow:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async releaseFunds(signer: TransactionSigner, escrowId: string): Promise<string | null> {
    try {
      if (!this.escrowClient) return null
      const result = await this.escrowClient.release(signer, escrowId)
      return result.signature
    } catch (_error) {
      console.warn('Failed to release funds:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async fileDispute(_params: Record<string, unknown>): Promise<string | null> {
    // This method doesn't exist on EscrowClient, use DisputeClient instead
    return null
  }
}

/**
 * Safe marketplace operations
 */
export class SafeMarketplaceClient {
  private marketplaceClient: MarketplaceClient | undefined

  constructor(client: GhostSpeakClient) {
    this.marketplaceClient = client.marketplace
  }

  async listJobs(params?: ListJobsParams): Promise<ValidatedJobPosting[]> {
    try {
      if (!this.marketplaceClient) return []
      const result = await this.marketplaceClient.listJobs(params)
      return validateJobPostingArray(result)
    } catch (_error) {
      console.warn('Failed to list jobs:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async applyToJob(signer: TransactionSigner, params: ApplyToJobParams): Promise<string | null> {
    try {
      if (!this.marketplaceClient) return null
      const result = await this.marketplaceClient.applyToJob(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to apply to job:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async createJob(signer: TransactionSigner, params: CreateJobParams): Promise<string | null> {
    try {
      if (!this.marketplaceClient) return null
      const result = await this.marketplaceClient.createJob(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to create job:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async getJobApplications(_jobId: string): Promise<unknown[]> {
    // This method doesn't exist in SDK
    return []
  }

  async listItems(_params?: Record<string, unknown>): Promise<ValidatedMarketplaceItem[]> {
    try {
      if (!this.marketplaceClient) return []
      // Use getServiceListings instead
      const result = await this.marketplaceClient.getServiceListings()
      // Convert ServiceListingWithAddress[] to our validated format
      const items = result.map(listing => ({
        id: listing.data.id,
        title: listing.data.title,
        description: listing.data.description,
        category: listing.data.serviceType ?? 'general',
        price: Number(listing.data.price) / 1e9, // Convert lamports to SOL
        seller: listing.data.agent,
        available: listing.data.isActive ?? true,
        tags: []
      }))
      return validateMarketplaceItemArray(items)
    } catch (_error) {
      console.warn('Failed to list marketplace items:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async purchaseItem(signer: TransactionSigner, params: { listingId: string; amount?: bigint }): Promise<string | null> {
    try {
      if (!this.marketplaceClient) return null
      const result = await this.marketplaceClient.purchase(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to purchase item:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async searchJobs(params: ListJobsParams): Promise<ValidatedJobPosting[]> {
    try {
      // Use listJobs with params for searching
      return await this.listJobs(params)
    } catch (_error) {
      console.warn('Failed to search jobs:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }
}

/**
 * Safe governance operations
 */
export class SafeGovernanceClient {
  private governanceClient: GovernanceClient | undefined

  constructor(client: GhostSpeakClient) {
    this.governanceClient = client.governance
  }

  async createMultisig(signer: TransactionSigner, params: CreateMultisigParams): Promise<string | null> {
    try {
      if (!this.governanceClient) return null
      const result = await this.governanceClient.createMultisig(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to create multisig:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async listMultisigs(params?: { creator?: Address }): Promise<ValidatedMultisig[]> {
    try {
      if (!this.governanceClient) return []
      const result = await this.governanceClient.listMultisigs()
      if (!Array.isArray(result)) return []
      
      // Filter by creator if provided
      const filtered = params?.creator 
        ? result.filter(m => m.signers.includes(params.creator!))
        : result
      
      return filtered.map(item => ({
        address: item.address,
        name: item.name,
        members: item.signers,
        threshold: item.threshold,
        creator: item.signers[0] // Use first signer as creator
      }))
    } catch (_error) {
      console.warn('Failed to list multisigs:', error instanceof Error ? _error.message : String(error))
      return []
    }
  }

  async createProposal(signer: TransactionSigner, params: CreateProposalParams): Promise<string | null> {
    try {
      if (!this.governanceClient) return null
      const result = await this.governanceClient.createProposal(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to create proposal:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async listProposals(params?: { multisigAddress?: Address }): Promise<ValidatedProposal[]> {
    try {
      if (!this.governanceClient) return []
      const result = await this.governanceClient.listProposals(params?.multisigAddress)
      if (!Array.isArray(result)) return []
      
      return result.map(item => ({
        address: item.address,
        title: item.title,
        description: item.description,
        type: item.proposalType,
        status: item.status,
        creator: item.address, // Use proposal address as creator placeholder
        votesFor: item.yesVotes,
        votesAgainst: item.noVotes,
        threshold: Math.ceil((item.eligibleVoters ?? 1) / 2), // Simple majority
        deadline: BigInt(item.votingEndsAt)
      }))
    } catch (_error) {
      console.warn('Failed to list proposals:', error instanceof Error ? _error.message : String(error))
      return [] 
    }
  }

  async vote(signer: TransactionSigner, params: VoteParams): Promise<string | null> {
    try {
      if (!this.governanceClient) return null
      const result = await this.governanceClient.vote(signer, params)
      return result.signature
    } catch (_error) {
      console.warn('Failed to vote:', error instanceof Error ? _error.message : String(error))
      return null
    }
  }

  async grantRole(_params: Record<string, unknown>): Promise<string | null> {
    // This method doesn't exist in SDK
    return null
  }

  async revokeRole(_params: Record<string, unknown>): Promise<string | null> {
    // This method doesn't exist in SDK
    return null
  }
}

/**
 * Main safe SDK client wrapper
 */
export class SafeSDKClient {
  public readonly auction: SafeAuctionClient
  public readonly agent: SafeAgentClient
  public readonly channel: SafeChannelClient
  public readonly dispute: SafeDisputeClient
  public readonly escrow: SafeEscrowClient
  public readonly marketplace: SafeMarketplaceClient
  public readonly governance: SafeGovernanceClient

  constructor(client: GhostSpeakClient) {
    this.auction = new SafeAuctionClient(client)
    this.agent = new SafeAgentClient(client)
    this.channel = new SafeChannelClient(client)
    this.dispute = new SafeDisputeClient(client)
    this.escrow = new SafeEscrowClient(client)
    this.marketplace = new SafeMarketplaceClient(client)
    this.governance = new SafeGovernanceClient(client)
  }
}

/**
 * Create a safe SDK client wrapper
 */
export function createSafeSDKClient(client: GhostSpeakClient): SafeSDKClient {
  return new SafeSDKClient(client)
}