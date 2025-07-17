import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import type { 
  GhostSpeakConfig
} from '../../types/index.js'
import { 
  getRegisterAgentInstruction,
  getUpdateAgentInstruction,
  getVerifyAgentInstruction,
  getDeactivateAgentInstruction,
  getActivateAgentInstruction,
  fetchAgent,
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
    agentAddress: Address,
    userRegistryAddress: Address,
    params: AgentRegistrationParams
  ): Promise<string> {
    // Validate and ensure agentType is a valid number
    const agentType = typeof params.agentType === 'number' && !isNaN(params.agentType) 
      ? params.agentType 
      : 1 // Default to 1 if invalid
      
    console.log('🔍 Registering agent with params:', {
      agentType,
      metadataUri: params.metadataUri,
      agentId: params.agentId,
      agentAddress: agentAddress.toString(),
      userRegistry: userRegistryAddress.toString(),
      signer: signer.address ? signer.address.toString() : 'NO_ADDRESS'
    })

    try {
      const instruction = getRegisterAgentInstruction({
        agentAccount: agentAddress,
        userRegistry: userRegistryAddress,
        signer: signer as unknown as TransactionSigner,
        agentType,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      })
      
      console.log('📦 Instruction created:', {
        programAddress: instruction.programAddress,
        accountsLength: instruction.accounts?.length,
        dataLength: instruction.data?.length,
        accounts: instruction.accounts
      })
      
      // Log instruction details before sending
      this.logInstructionDetails(instruction as unknown as IInstruction)
      
      return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
    } catch (error) {
      console.error('❌ Failed to create register instruction:', error)
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
    const instruction = getDeactivateAgentInstruction({
      agentAccount: agentAddress,
      signer: signer as unknown as TransactionSigner,
      agentId
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }
  
  /**
   * Activate an agent
   */
  async activate(
    signer: KeyPairSigner,
    agentAddress: Address,
    agentId: string
  ): Promise<string> {
    const instruction = getActivateAgentInstruction({
      agentAccount: agentAddress,
      signer: signer as unknown as TransactionSigner,
      agentId
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Get agent account information using 2025 patterns
   */
  async getAccount(agentAddress: Address): Promise<Agent | null> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getAgentDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      const agent = await rpcClient.getAndDecodeAccount(
        agentAddress,
        getAgentDecoder(),
        this.commitment
      )
      
      return agent
    } catch (error) {
      console.warn('Failed to fetch agent account:', error)
      return null
    }
  }

  /**
   * Get all agents (with pagination) using 2025 patterns
   */
  async getAllAgents(
    limit: number = 100,
    offset: number = 0
  ): Promise<Agent[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getAgentDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all agent accounts using program account fetching
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getAgentDecoder(),
        [], // No filters - get all agents
        this.commitment
      )
      
      // Apply pagination
      const paginatedAccounts = accounts.slice(offset, offset + limit)
      return paginatedAccounts.map(({ data }) => data)
    } catch (error) {
      console.warn('Failed to fetch all agents:', error)
      return []
    }
  }

  /**
   * Search agents by capabilities using 2025 patterns
   */
  async searchByCapabilities(capabilities: string[]): Promise<Agent[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getAgentDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all agents and filter client-side
      // In production, you'd want to use RPC filters for efficiency
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getAgentDecoder(),
        [], // No RPC filters - filtering client-side for now
        this.commitment
      )
      
      // Filter agents that have any of the requested capabilities
      const filteredAgents = accounts
        .map(({ data }) => data)
        .filter(agent => 
          capabilities.some(capability => 
            agent.capabilities?.includes(capability)
          )
        )
      
      return filteredAgents
    } catch (error) {
      console.warn('Failed to search agents by capabilities:', error)
      return []
    }
  }
  
  /**
   * List agents (alias for getAllAgents for CLI compatibility)
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
    return this.getAllAgents(options.limit || 100, options.offset || 0)
  }

  /**
   * Search agents (alias for searchByCapabilities for CLI compatibility)
   */
  async search(options: { capabilities: string[] }): Promise<Agent[]> {
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
  async listByOwner(options: { owner: Address }): Promise<Agent[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getAgentDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all agent accounts and filter by owner
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getAgentDecoder(),
        [], // Could use memcmp filter here for efficiency
        this.commitment
      )
      
      // Filter agents owned by the specified address
      const ownerAgents = accounts
        .map(({ data }) => data)
        .filter(agent => agent.owner?.toString() === options.owner.toString())
      
      return ownerAgents
    } catch (error) {
      console.warn('Failed to fetch agents by owner:', error)
      return []
    }
  }

  /**
   * Get agent status details
   */
  async getStatus(options: { agentAddress: Address }): Promise<{
    jobsCompleted: number
    totalEarnings: bigint
    successRate: number
    lastActive: bigint | null
    currentJob: any | null
  }> {
    // This would typically fetch from a separate status account
    // For now, return mock data as the status tracking isn't implemented in the program
    const agent = await this.getAccount(options.agentAddress)
    
    if (!agent) {
      throw new Error('Agent not found')
    }
    
    return {
      jobsCompleted: (agent as any).totalJobs || 0,
      totalEarnings: (agent as any).totalEarnings || 0n,
      successRate: (agent as any).successRate || 100,
      lastActive: agent.isActive ? BigInt(Date.now()) : null,
      currentJob: null // Would need to fetch from work order accounts
    }
  }

}