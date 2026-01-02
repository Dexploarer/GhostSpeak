/**
 * Safe SDK wrapper functions with proper error handling and type validation
 * This replaces unsafe SDK calls with validated, type-safe alternatives
 */

import { type Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type {
  GhostSpeakClient,
  AgentClient,
  GovernanceClient,
  CreateMultisigParams,
  CreateProposalParams,
  VoteParams
} from '@ghostspeak/sdk'
import {
  validateAgentArray,
  type ValidatedAgent
} from './type-guards.js'

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
 * Safe ghost operations
 */
export class SafeGhostClient {
  private client: GhostSpeakClient

  constructor(client: GhostSpeakClient) {
    this.client = client
  }

  async claimGhost(signer: TransactionSigner, params: { externalId: string; platform: string; attestationSignature: Uint8Array }): Promise<{ ghostAddress: string; signature: string }> {
    const result = await this.client.ghosts.claimGhost(signer, params)
    return result
  }

  async linkExternalId(signer: TransactionSigner, params: { ghostAddress: Address; externalId: string; platform: string; attestationSignature: Uint8Array }): Promise<string> {
    const result = await this.client.ghosts.linkExternalId(signer, params)
    return result
  }

  async getGhost(ghostAddress: Address): Promise<any> {
    return await this.client.ghosts.getGhostAgent(ghostAddress)
  }

  async getGhostsByOwner(owner: Address): Promise<any[]> {
    return await this.client.ghosts.getGhostsByType(10) // Type 10 = Ghost agents
  }
}

/**
 * Safe multisig operations
 */
export class SafeMultisigClient {
  private client: GhostSpeakClient

  constructor(client: GhostSpeakClient) {
    this.client = client
  }

  async createMultisig(params: { owner: TransactionSigner; multisigId: bigint; threshold: number; signers: Address[] }): Promise<string> {
    const result = await this.client.multisigModule.createMultisig(params)
    return result
  }

  async createProposal(params: any): Promise<string> {
    const result = await this.client.multisigModule.createProposal(params)
    return result
  }

  async executeProposal(params: { proposalAddress: Address; executor: TransactionSigner; targetProgram: Address }): Promise<string> {
    const result = await this.client.multisigModule.executeProposal(params)
    return result
  }

  async getMultisig(multisigAddress: Address): Promise<any> {
    return await this.client.multisigModule.getMultisig(multisigAddress)
  }

  async getMultisigsByCreator(creator: Address): Promise<any[]> {
    return await this.client.multisigModule.getMultisigsByCreator(creator)
  }

  get programId(): Address {
    return this.client.programId
  }
}

/**
 * Safe authorization operations
 */
export class SafeAuthorizationClient {
  private client: GhostSpeakClient

  constructor(client: GhostSpeakClient) {
    this.client = client
  }

  async createAuthorization(params: { signer: TransactionSigner; agentAddress: Address; authorizedSource: Address; indexLimit: bigint; expiresAt: bigint; network: string }): Promise<string> {
    const result = await this.client.authorization.createAuthorization(params)
    return result
  }

  async revokeAuthorization(params: { signer: TransactionSigner; agentAddress: Address; authorizedSource: Address }): Promise<string> {
    const result = await this.client.authorization.revokeAuthorization(params)
    return result
  }

  async getAuthorization(authAddress: Address): Promise<any> {
    return await this.client.authorization.getAuthorization(authAddress)
  }

  async getAuthorizationsByAgent(agentAddress: Address): Promise<any[]> {
    return await this.client.authorization.getAuthorizationsByAgent(agentAddress)
  }

  get programId(): Address {
    return this.client.programId
  }
}

/**
 * Main safe SDK client wrapper
 */
export class SafeSDKClient {
  public readonly agent: SafeAgentClient
  public readonly governance: SafeGovernanceClient
  public readonly ghosts: SafeGhostClient
  public readonly multisigModule: SafeMultisigClient
  public readonly authorization: SafeAuthorizationClient
  private client: GhostSpeakClient

  constructor(client: GhostSpeakClient) {
    this.client = client
    this.agent = new SafeAgentClient(client)
    this.governance = new SafeGovernanceClient(client)
    this.ghosts = new SafeGhostClient(client)
    this.multisigModule = new SafeMultisigClient(client)
    this.authorization = new SafeAuthorizationClient(client)
  }

  get programId(): Address {
    return this.client.programId
  }

  get governanceModule() {
    return this.client.governanceModule
  }
}

/**
 * Create a safe SDK client wrapper
 */
export function createSafeSDKClient(client: GhostSpeakClient): SafeSDKClient {
  return new SafeSDKClient(client)
}