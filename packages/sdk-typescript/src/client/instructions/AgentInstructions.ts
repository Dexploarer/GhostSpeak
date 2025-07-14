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
   * Find the PDA for an agent account
   */
  private async findAgentPDA(owner: Address, agentId: string): Promise<Address> {
    const { deriveAgentPda } = await import('../../utils/pda.js')
    return deriveAgentPda(this.programId, owner, agentId)
  }
}