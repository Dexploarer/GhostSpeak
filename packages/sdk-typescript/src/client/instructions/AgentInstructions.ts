import type { Address } from '@solana/addresses'
import type { IInstruction, TransactionSigner } from '@solana/kit'
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
    const instruction = getRegisterAgentInstruction({
      agentAccount: agentAddress,
      userRegistry: userRegistryAddress,
      signer: signer as unknown as TransactionSigner,
      agentType: params.agentType,
      metadataUri: params.metadataUri,
      agentId: params.agentId
    })
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    const instruction = getUpdateAgentInstruction({
      agentAccount: agentAddress,
      signer: signer as unknown as TransactionSigner,
      agentType,
      metadataUri,
      agentId
    })
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
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
      jobsCompleted: agent.totalJobs || 0,
      totalEarnings: agent.totalEarnings || 0n,
      successRate: agent.successRate || 100,
      lastActive: agent.lastActive || null,
      currentJob: null // Would need to fetch from work order accounts
    }
  }

  /**
   * Register agent with CLI-compatible interface
   */
  async register(params: {
    name: string
    description: string
    endpoint: string
    capabilities: string[]
    pricePerTask: bigint
  }): Promise<{
    signature: string
    agentAddress: Address
  }> {
    const signer = this.signer
    if (!signer) {
      throw new Error('Signer required for agent registration')
    }

    // Generate agent ID from name
    const agentId = params.name.toLowerCase().replace(/\s+/g, '-')
    
    // Find the PDA for the agent
    const agentAddress = await this.findAgentPDA(signer.address, agentId)
    
    // Find user registry PDA (if needed)
    const { deriveUserRegistryPda } = await import('../../utils/pda.js')
    const userRegistryAddress = await deriveUserRegistryPda(this.programId, signer.address)
    
    // Create registration params
    const registrationParams: AgentRegistrationParams = {
      agentType: 1, // Default agent type
      metadataUri: JSON.stringify({
        name: params.name,
        description: params.description,
        endpoint: params.endpoint,
        capabilities: params.capabilities,
        pricePerTask: params.pricePerTask.toString()
      }),
      agentId
    }
    
    // Register the agent
    const signature = await super.register(
      signer,
      agentAddress,
      userRegistryAddress,
      registrationParams
    )
    
    return {
      signature,
      agentAddress
    }
  }

  /**
   * Update agent with CLI-compatible interface
   */
  async update(params: {
    agentAddress: Address
    name?: string
    description?: string
    endpoint?: string
    capabilities?: string[]
    pricePerTask?: bigint
  }): Promise<{
    signature: string
  }> {
    const signer = this.signer
    if (!signer) {
      throw new Error('Signer required for agent update')
    }

    // Fetch current agent to merge updates
    const currentAgent = await this.getAccount(params.agentAddress)
    if (!currentAgent) {
      throw new Error('Agent not found')
    }
    
    // Parse current metadata
    let currentMetadata: any = {}
    try {
      currentMetadata = JSON.parse(currentAgent.metadataUri || '{}')
    } catch {}
    
    // Merge updates
    const updatedMetadata = {
      name: params.name || currentMetadata.name || currentAgent.name,
      description: params.description || currentMetadata.description || currentAgent.description,
      endpoint: params.endpoint || currentMetadata.endpoint || currentAgent.serviceEndpoint,
      capabilities: params.capabilities || currentMetadata.capabilities || currentAgent.capabilities,
      pricePerTask: (params.pricePerTask || currentAgent.pricePerTask || 0n).toString()
    }
    
    // Update the agent
    const signature = await super.update(
      signer,
      params.agentAddress,
      currentAgent.agentType || 1,
      JSON.stringify(updatedMetadata),
      currentAgent.agentId || ''
    )
    
    return { signature }
  }
}