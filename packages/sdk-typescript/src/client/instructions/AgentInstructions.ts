import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import type { 
  GhostSpeakConfig,
  AgentWithAddress
} from '../../types/index.js'
import { 
  getRegisterAgentInstructionAsync,
  getUpdateAgentInstruction,
  getVerifyAgentInstruction,
  getDeactivateAgentInstruction,
  getActivateAgentInstruction,
  type Agent
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'

// Parameters for agent registration
export interface AgentRegistrationParams {
  agentType: number
  metadataUri: string
  agentId: string
}

/**
 * Instructions for agent management operations
 */
export class AgentInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Register a new AI agent
   */
  async register(
    signer: KeyPairSigner,
    params: AgentRegistrationParams
  ): Promise<string> {
    // Validate and ensure agentType is a valid number
    const agentType = typeof params.agentType === 'number' && !isNaN(params.agentType) 
      ? params.agentType 
      : 1 // Default to 1 if invalid
      

    try {
      // Use the async version that automatically calculates PDAs
      const instruction = await getRegisterAgentInstructionAsync({
        signer: signer as unknown as TransactionSigner,
        agentType,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      }, { programAddress: this.programId })
      
      // Log instruction details before sending
      this.logInstructionDetails(instruction as unknown as IInstruction)
      
      const signature = await this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
      
      return signature
    } catch (error) {
      console.error('❌ Failed to register agent:', error)
      throw error
    }
  }

  /**
   * Update an existing agent
   */
  async update(
    signer: KeyPairSigner,
    agentAddress: Address,
    agentType: number,
    metadataUri: string,
    agentId: string
  ): Promise<string> {
    // Validate agentType
    const validAgentType = typeof agentType === 'number' && !isNaN(agentType) ? agentType : 1
    
    const instruction = getUpdateAgentInstruction({
      agentAccount: agentAddress,
      signer: signer as unknown as TransactionSigner,
      agentType: validAgentType,
      metadataUri,
      agentId
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Verify an agent (admin operation)
   */
  async verify(
    signer: KeyPairSigner,
    agentVerificationAddress: Address,
    agentAddress: Address,
    agentPubkey: Address,
    serviceEndpoint: string,
    supportedCapabilities: number[],
    verifiedAt: number
  ): Promise<string> {
    const instruction = getVerifyAgentInstruction({
      agentVerification: agentVerificationAddress,
      agent: agentAddress,
      verifier: signer as unknown as TransactionSigner,
      agentPubkey,
      serviceEndpoint,
      supportedCapabilities,
      verifiedAt
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Deactivate an agent
   */
  async deactivate(
    signer: KeyPairSigner,
    agentAddress: Address,
    agentId: string
  ): Promise<string> {
    return this.executeInstruction(
      () => getDeactivateAgentInstruction({
        agentAccount: agentAddress,
        signer: signer as unknown as TransactionSigner,
        agentId
      }),
      signer as unknown as TransactionSigner,
      'agent deactivation'
    )
  }
  
  /**
   * Activate an agent
   */
  async activate(
    signer: KeyPairSigner,
    agentAddress: Address,
    agentId: string
  ): Promise<string> {
    return this.executeInstruction(
      () => getActivateAgentInstruction({
        agentAccount: agentAddress,
        signer: signer as unknown as TransactionSigner,
        agentId
      }),
      signer as unknown as TransactionSigner,
      'agent activation'
    )
  }

  /**
   * Get agent account information using centralized pattern
   */
  async getAccount(agentAddress: Address): Promise<Agent | null> {
    return this.getDecodedAccount<Agent>(agentAddress, 'getAgentDecoder')
  }

  /**
   * Get all agents (with pagination) using centralized pattern
   */
  async getAllAgents(
    limit: number = 100,
    offset: number = 0
  ): Promise<Agent[]> {
    const accounts = await this.getDecodedProgramAccounts<Agent>('getAgentDecoder')
    
    // Apply pagination
    const paginatedAccounts = accounts.slice(offset, offset + limit)
    return paginatedAccounts.map(({ data }) => data)
  }

  /**
   * Search agents by capabilities using centralized pattern
   */
  async searchByCapabilities(capabilities: string[]): Promise<AgentWithAddress[]> {
    const accounts = await this.getDecodedProgramAccounts<Agent>('getAgentDecoder')
    
    // Filter agents that have any of the requested capabilities
    return accounts
      .filter(({ data }) => 
        capabilities.some(capability => 
          data.capabilities?.includes(capability)
        )
      )
      .map(({ address, data }) => ({ address, data }))
  }
  
  /**
   * List agents (alias for getAllAgents for CLI compatibility)
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<AgentWithAddress[]> {
    const agents = await this.getAllAgents(options.limit ?? 100, options.offset ?? 0)
    // Convert to AgentWithAddress format
    const accounts = await this.getDecodedProgramAccounts<Agent>('getAgentDecoder')
    return accounts
      .filter(({ data }) => agents.some(a => JSON.stringify(a) === JSON.stringify(data)))
      .map(({ address, data }) => ({ address, data }))
  }

  /**
   * Search agents (alias for searchByCapabilities for CLI compatibility)
   */
  async search(options: { capabilities: string[] }): Promise<AgentWithAddress[]> {
    return this.searchByCapabilities(options.capabilities)
  }

  /**
   * Find the PDA for an agent account
   */
  private async findAgentPDA(owner: Address, agentId: string): Promise<Address> {
    const { deriveAgentPda } = await import('../../utils/pda.js')
    return deriveAgentPda(this.programId, owner, agentId)
  }

  /**
   * Get an agent by address (alias for getAccount for CLI compatibility)
   */
  async get(options: { agentAddress: Address }): Promise<Agent | null> {
    return this.getAccount(options.agentAddress)
  }

  /**
   * List agents by owner
   */
  async listByOwner(options: { owner: Address }): Promise<AgentWithAddress[]> {
    const accounts = await this.getDecodedProgramAccounts<Agent>('getAgentDecoder')
    
    // Filter agents owned by the specified address
    return accounts
      .filter(({ data }) => data.owner?.toString() === options.owner.toString())
      .map(({ address, data }) => ({ address, data }))
  }

  /**
   * Get agent status details
   */
  async getStatus(options: { agentAddress: Address }): Promise<{
    jobsCompleted: number
    totalEarnings: bigint
    successRate: number
    lastActive: bigint | null
    currentJob: unknown | null
  }> {
    // This would typically fetch from a separate status account
    // For now, return mock data as the status tracking isn't implemented in the program
    const agent = await this.getAccount(options.agentAddress)
    
    if (!agent) {
      throw new Error('Agent not found')
    }
    
    return {
      jobsCompleted: agent.totalJobsCompleted ?? 0,
      totalEarnings: agent.totalEarnings ?? 0n,
      successRate: agent.reputationScore ?? 100, // Use reputation score as proxy for success rate
      lastActive: agent.isActive ? BigInt(Date.now()) : null,
      currentJob: null // Would need to fetch from work order accounts
    }
  }

}