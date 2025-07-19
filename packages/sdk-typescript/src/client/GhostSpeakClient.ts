import type { Address } from '@solana/addresses'
import type { ExtendedRpcApi } from '../types/index.js'

// KeyPairSigner interface - compatible with TransactionSigner
export interface KeyPairSigner {
  address: Address
  publicKey: Address
  sign: (message: Uint8Array) => Promise<Uint8Array>
}
import type { 
  GhostSpeakConfig,
  ServiceListingWithAddress
} from '../types/index.js'
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Keep for type completeness
import type { Agent, ServiceListing, JobPosting, WorkOrder, A2ASession, A2AMessage } from '../generated/index.js'
import type { AgentRegistrationParams } from './instructions/AgentInstructions.js'
import type { CreateServiceListingParams, CreateJobPostingParams } from './instructions/MarketplaceInstructions.js' 
import type { CreateEscrowParams } from './instructions/EscrowInstructions.js'
import type { CreateA2ASessionParams, SendA2AMessageParams } from './instructions/A2AInstructions.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'
import { AgentInstructions } from './instructions/AgentInstructions.js'
import { MarketplaceInstructions } from './instructions/MarketplaceInstructions.js'
import { EscrowInstructions } from './instructions/EscrowInstructions.js'
import { A2AInstructions } from './instructions/A2AInstructions.js'
import { AuctionInstructions } from './instructions/AuctionInstructions.js'
import { DisputeInstructions } from './instructions/DisputeInstructions.js'
import { GovernanceInstructions } from './instructions/GovernanceInstructions.js'
import { BulkDealsInstructions } from './instructions/BulkDealsInstructions.js'
import { AnalyticsInstructions } from './instructions/AnalyticsInstructions.js'
import { ComplianceInstructions } from './instructions/ComplianceInstructions.js'

/**
 * Main client for interacting with the GhostSpeak Protocol
 */
export class GhostSpeakClient {
  public readonly config: GhostSpeakConfig
  public readonly agent: AgentInstructions
  public readonly marketplace: MarketplaceInstructions
  public readonly escrow: EscrowInstructions
  public readonly a2a: A2AInstructions
  public readonly auction: AuctionInstructions
  public readonly dispute: DisputeInstructions
  public readonly governance: GovernanceInstructions
  public readonly bulkDeals: BulkDealsInstructions
  public readonly analytics: AnalyticsInstructions
  public readonly compliance: ComplianceInstructions

  constructor(config: GhostSpeakConfig) {
    this.config = {
      programId: GHOSTSPEAK_PROGRAM_ID,
      commitment: 'confirmed',
      ...config
    }

    // Initialize instruction modules
    this.agent = new AgentInstructions(this.config)
    this.marketplace = new MarketplaceInstructions(this.config)
    this.escrow = new EscrowInstructions(this.config)
    this.a2a = new A2AInstructions(this.config)
    this.auction = new AuctionInstructions(this.config)
    this.dispute = new DisputeInstructions(this.config)
    this.governance = new GovernanceInstructions(this.config)
    this.bulkDeals = new BulkDealsInstructions(this.config)
    this.analytics = new AnalyticsInstructions(this.config)
    this.compliance = new ComplianceInstructions(this.config)
  }

  /**
   * Create a new GhostSpeak client instance
   */
  static create(rpc: ExtendedRpcApi, programId?: Address): GhostSpeakClient {
    return new GhostSpeakClient({
      rpc,
      programId: programId ?? GHOSTSPEAK_PROGRAM_ID
    })
  }

  // Convenience methods for common operations

  /**
   * Register a new AI agent
   */
  async registerAgent(
    signer: KeyPairSigner,
    params: AgentRegistrationParams
  ): Promise<string> {
    return this.agent.register(signer, params)
  }

  /**
   * Get agent account information
   */
  async getAgent(agentAddress: Address): Promise<Agent | null> {
    return this.agent.getAccount(agentAddress)
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
    return this.marketplace.createServiceListing(signer, serviceListingAddress, agentAddress, userRegistryAddress, params)
  }

  /**
   * Create a new job posting
   */
  async createJobPosting(
    signer: KeyPairSigner,
    jobPostingAddress: Address,
    params: CreateJobPostingParams
  ): Promise<string> {
    return this.marketplace.createJobPosting(jobPostingAddress, { ...params, signer })
  }

  /**
   * Get all active service listings
   */
  async getServiceListings(): Promise<ServiceListingWithAddress[]> {
    return this.marketplace.getServiceListings()
  }

  /**
   * Get all active job postings
   */
  async getJobPostings(): Promise<JobPosting[]> {
    return this.marketplace.getJobPostings()
  }

  /**
   * Create an escrow account
   */
  async createEscrow(
    signer: KeyPairSigner,
    workOrderAddress: Address,
    params: CreateEscrowParams
  ): Promise<string> {
    return this.escrow.create(workOrderAddress, { ...params, signer })
  }

  /**
   * Get escrow account information
   */
  async getEscrow(escrowAddress: Address): Promise<WorkOrder | null> {
    return this.escrow.getAccount(escrowAddress)
  }

  /**
   * Create an A2A communication session
   */
  async createA2ASession(
    signer: KeyPairSigner,
    sessionAddress: Address,
    params: CreateA2ASessionParams
  ): Promise<string> {
    return this.a2a.createSession(sessionAddress, { ...params, signer })
  }

  /**
   * Send a message in an A2A session
   */
  async sendA2AMessage(
    signer: KeyPairSigner,
    sessionAddress: Address,
    params: SendA2AMessageParams
  ): Promise<string> {
    return this.a2a.sendMessage(sessionAddress, { ...params, signer })
  }

  /**
   * Get A2A session information
   */
  async getA2ASession(sessionAddress: Address): Promise<A2ASession | null> {
    return this.a2a.getSession(sessionAddress)
  }

  /**
   * Get all messages in an A2A session
   */
  async getA2AMessages(sessionAddress: Address): Promise<A2AMessage[]> {
    return this.a2a.getMessages(sessionAddress)
  }
}