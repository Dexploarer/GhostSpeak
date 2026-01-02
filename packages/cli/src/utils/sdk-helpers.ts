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
  DisputeClient,
  GovernanceClient,
  Evidence,
  FileDisputeParams,
  SubmitEvidenceParams,
  ResolveDisputeParams,
  CreateMultisigParams,
  CreateProposalParams,
  VoteParams,
  CreateAuctionParams
} from '@ghostspeak/sdk'
import {
  validateAuctionArray,
  validateAgentArray,
  validateDisputeArray,
  validateAndConvertAuction,
  type ValidatedAuctionData,
  type ValidatedAgent,
  type ValidatedDisputeSummary
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
    } catch (error) {
      console.warn('Failed to list auctions:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to get ending auctions:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to get auction summary:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  async placeAuctionBid(signer: TransactionSigner, params: { auctionId: string; amount: bigint }): Promise<string | null> {
    try {
      if (!this.auctionClient) return null
      const result = await this.auctionClient.bid(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to place bid:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  async finalizeAuction(signer: TransactionSigner, auctionId: string): Promise<string | null> {
    try {
      if (!this.auctionClient) return null
      const result = await this.auctionClient.finalize(signer, auctionId)
      return result.signature
    } catch (error) {
      console.warn('Failed to finalize auction:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  async create(signer: TransactionSigner, params: CreateAuctionParams): Promise<string | null> {
    try {
      if (!this.auctionClient) return null
      const result = await this.auctionClient.create(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to create auction:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to list agents:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  async getAgentAccount(agentAddress: Address): Promise<any> {
    try {
      if (!this.agentClient) return null
      // Try to get agent using SDK's get method
      const result = await (this.agentClient as any).get?.(agentAddress)
      return result || null
    } catch (error) {
      console.warn('Failed to get agent account:', error instanceof Error ? error.message : String(error))
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

  async listDisputes(params?: { status?: string }): Promise<ValidatedDisputeSummary[]> {
    try {
      if (!this.disputeClient) return []
      const result = await this.disputeClient.listDisputes(params)
      return validateDisputeArray(result)
    } catch (error) {
      console.warn('Failed to list disputes:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  async getActiveDisputes(userAddress: Address): Promise<ValidatedDisputeSummary[]> {
    try {
      if (!this.disputeClient) return []
      const result = await this.disputeClient.getActiveDisputes(userAddress)
      return validateDisputeArray(result)
    } catch (error) {
      console.warn('Failed to get active disputes:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  async fileDispute(signer: TransactionSigner, params: FileDisputeParams): Promise<string | null> {
    try {
      if (!this.disputeClient) return null
      const result = await this.disputeClient.file(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to file dispute:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  async submitEvidence(signer: TransactionSigner, params: SubmitEvidenceParams): Promise<string | null> {
    try {
      if (!this.disputeClient) return null
      const result = await this.disputeClient.submitEvidence(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to submit evidence:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  async resolveDispute(signer: TransactionSigner, params: ResolveDisputeParams): Promise<string | null> {
    try {
      if (!this.disputeClient) return null
      const result = await this.disputeClient.resolveDispute(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to resolve dispute:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to get evidence history:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to create multisig:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to list multisigs:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  async createProposal(signer: TransactionSigner, params: CreateProposalParams): Promise<string | null> {
    try {
      if (!this.governanceClient) return null
      const result = await this.governanceClient.createProposal(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to create proposal:', error instanceof Error ? error.message : String(error))
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
    } catch (error) {
      console.warn('Failed to list proposals:', error instanceof Error ? error.message : String(error))
      return [] 
    }
  }

  async vote(signer: TransactionSigner, params: VoteParams): Promise<string | null> {
    try {
      if (!this.governanceClient) return null
      const result = await this.governanceClient.vote(signer, params)
      return result.signature
    } catch (error) {
      console.warn('Failed to vote:', error instanceof Error ? error.message : String(error))
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
  public readonly dispute: SafeDisputeClient
  public readonly governance: SafeGovernanceClient

  constructor(client: GhostSpeakClient) {
    this.auction = new SafeAuctionClient(client)
    this.agent = new SafeAgentClient(client)
    this.dispute = new SafeDisputeClient(client)
    this.governance = new SafeGovernanceClient(client)
  }
}

/**
 * Create a safe SDK client wrapper
 */
export function createSafeSDKClient(client: GhostSpeakClient): SafeSDKClient {
  return new SafeSDKClient(client)
}