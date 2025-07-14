import type { Address } from '@solana/addresses'
import type { RpcApi } from '../types/index.js'

// Placeholder for KeyPairSigner - will be replaced with proper import
export interface KeyPairSigner {
  publicKey: Address
  sign: (message: Uint8Array) => Promise<Uint8Array>
}
import type { 
  GhostSpeakConfig,
  RegisterAgentParams,
  CreateServiceListingParams,
  CreateJobPostingParams,
  CreateEscrowParams,
  CreateA2ASessionParams,
  SendA2AMessageParams,
  AgentAccount,
  ServiceListing,
  JobPosting,
  EscrowAccount,
  A2ASession,
  A2AMessage
} from '../types/index.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'
import { AgentInstructions } from './instructions/AgentInstructions.js'
import { MarketplaceInstructions } from './instructions/MarketplaceInstructions.js'
import { EscrowInstructions } from './instructions/EscrowInstructions.js'
import { A2AInstructions } from './instructions/A2AInstructions.js'

/**
 * Main client for interacting with the GhostSpeak Protocol
 */
export class GhostSpeakClient {
  public readonly config: GhostSpeakConfig
  public readonly agent: AgentInstructions
  public readonly marketplace: MarketplaceInstructions
  public readonly escrow: EscrowInstructions
  public readonly a2a: A2AInstructions

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
  }

  /**
   * Create a new GhostSpeak client instance
   */
  static create(rpc: RpcApi, programId?: Address): GhostSpeakClient {
    return new GhostSpeakClient({
      rpc,
      programId: programId || GHOSTSPEAK_PROGRAM_ID
    })
  }

  // Convenience methods for common operations

  /**
   * Register a new AI agent
   */
  async registerAgent(
    signer: KeyPairSigner,
    params: RegisterAgentParams
  ): Promise<string> {
    return this.agent.register(signer, params)
  }

  /**
   * Get agent account information
   */
  async getAgent(agentAddress: Address): Promise<AgentAccount | null> {
    return this.agent.getAccount(agentAddress)
  }

  /**
   * Create a new service listing
   */
  async createServiceListing(
    signer: KeyPairSigner,
    params: CreateServiceListingParams
  ): Promise<string> {
    return this.marketplace.createServiceListing(signer, params)
  }

  /**
   * Create a new job posting
   */
  async createJobPosting(
    signer: KeyPairSigner,
    params: CreateJobPostingParams
  ): Promise<string> {
    return this.marketplace.createJobPosting(signer, params)
  }

  /**
   * Get all active service listings
   */
  async getServiceListings(): Promise<ServiceListing[]> {
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
    params: CreateEscrowParams
  ): Promise<string> {
    return this.escrow.create(signer, params)
  }

  /**
   * Get escrow account information
   */
  async getEscrow(escrowAddress: Address): Promise<EscrowAccount | null> {
    return this.escrow.getAccount(escrowAddress)
  }

  /**
   * Create an A2A communication session
   */
  async createA2ASession(
    signer: KeyPairSigner,
    params: CreateA2ASessionParams
  ): Promise<string> {
    return this.a2a.createSession(signer, params)
  }

  /**
   * Send a message in an A2A session
   */
  async sendA2AMessage(
    signer: KeyPairSigner,
    params: SendA2AMessageParams
  ): Promise<string> {
    return this.a2a.sendMessage(signer, params)
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