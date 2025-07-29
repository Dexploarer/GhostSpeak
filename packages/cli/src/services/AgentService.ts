/**
 * Agent service for managing AI agent operations
 */

import type { Address } from '@solana/addresses'
import type { 
  IAgentService, 
  Agent, 
  RegisterAgentParams, 
  ListAgentsParams, 
  UpdateAgentParams,
  AgentAnalytics,
  AgentServiceDependencies,
  IBlockchainService,
  IWalletService,
  IStorageService
} from '../types/services.js'
import { 
  ValidationError, 
  NotFoundError, 
  NetworkError, 
  UnauthorizedError 
} from '../types/services.js'
import { randomUUID } from 'crypto'

export class AgentService implements IAgentService {
  private agentCache = new Map<string, { data: Agent; timestamp: number }>()
  private listCache = new Map<string, { data: Agent[]; timestamp: number }>()
  private readonly CACHE_TTL = 30000 // 30 seconds
  
  constructor(private deps: AgentServiceDependencies) {}

  /**
   * Register a new AI agent
   */
  async register(params: RegisterAgentParams): Promise<Agent> {
    // Validate parameters
    await this.validateRegisterParams(params)

    // Get current wallet for owner
    const wallet = this.deps.walletService.getActiveWalletInterface()
    if (!wallet) {
      throw new ValidationError(
        'No active wallet found',
        'Create or select a wallet first using the wallet command'
      )
    }

    // Create agent data
    const agent: Agent = {
      id: randomUUID(),
      address: wallet.address,
      name: params.name,
      description: params.description,
      capabilities: params.capabilities,
      owner: wallet.address,
      isActive: true,
      reputationScore: 0,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
      metadata: {
        ...params.metadata,
        category: params.category,
        pricing: params.pricing
      }
    }

    // Register on blockchain
    try {
      const client = await this.deps.blockchainService.getClient(wallet.network)
      // In real implementation, this would call the Solana program
      // For now, we'll simulate the blockchain registration
      const signature = await this.simulateBlockchainRegistration(agent)
      
      // Store agent data
      await this.deps.storageService.save(`agent:${agent.id}`, agent)
      await this.deps.storageService.save(`agent:owner:${wallet.address}:${agent.id}`, agent.id)
      
      console.log(`Agent registered with signature: ${signature}`)
      return agent
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error // Re-throw service errors as-is
      }
      throw new NetworkError(
        `Failed to register agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check your network connection and try again'
      )
    }
  }

  /**
   * List agents by criteria
   */
  async list(params: ListAgentsParams = {}): Promise<Agent[]> {
    try {
      const agents: Agent[] = []
      
      // If owner specified, get their agents
      if (params.owner) {
        const ownerAgents = await this.getAgentsByOwner(params.owner)
        agents.push(...ownerAgents)
      } else {
        // Get all agents (in real implementation, this would query the blockchain)
        const allAgents = await this.getAllAgents()
        agents.push(...allAgents)
      }

      // Apply filters
      let filteredAgents = agents
      if (params.category) {
        filteredAgents = filteredAgents.filter(agent => 
          agent.metadata?.category === params.category
        )
      }
      if (params.isActive !== undefined) {
        filteredAgents = filteredAgents.filter(agent => agent.isActive === params.isActive)
      }

      // Apply pagination
      const offset = params.offset || 0
      const limit = params.limit || 50
      return filteredAgents.slice(offset, offset + limit)
    } catch (error) {
      throw new NetworkError(
        `Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check your network connection and try again'
      )
    }
  }

  /**
   * Get agent by ID with caching
   */
  async getById(agentId: string): Promise<Agent | null> {
    // Check cache first
    const cached = this.agentCache.get(agentId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    
    try {
      const agent = await this.deps.storageService.load<Agent>(`agent:${agentId}`)
      
      // Cache the result if found
      if (agent) {
        this.agentCache.set(agentId, {
          data: agent,
          timestamp: Date.now()
        })
      }
      
      return agent
    } catch (error) {
      console.error(`Error getting agent ${agentId}:`, error)
      return null
    }
  }

  /**
   * Update agent information
   */
  async update(agentId: string, updates: UpdateAgentParams): Promise<Agent> {
    const agent = await this.getById(agentId)
    if (!agent) {
      throw new NotFoundError('Agent', agentId)
    }

    // Verify ownership
    const wallet = this.deps.walletService.getActiveWalletInterface()
    if (!wallet || agent.owner !== wallet.address) {
      throw new UnauthorizedError('You can only update your own agents')
    }

    // Apply updates
    const updatedAgent: Agent = {
      ...agent,
      ...updates,
      updatedAt: BigInt(Date.now())
    }

    // Update on blockchain and storage
    try {
      await this.deps.storageService.save(`agent:${agentId}`, updatedAgent)
      
      // Update cache
      this.agentCache.set(agentId, {
        data: updatedAgent,
        timestamp: Date.now()
      })
      
      // Invalidate list cache as data has changed
      this.listCache.clear()
      
      return updatedAgent
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error // Re-throw service errors as-is
      }
      throw new NetworkError(
        `Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check your network connection and try again'
      )
    }
  }

  /**
   * Deactivate an agent
   */
  async deactivate(agentId: string): Promise<void> {
    await this.update(agentId, { isActive: false })
  }

  /**
   * Get agent analytics and performance metrics
   */
  async getAnalytics(agentId: string): Promise<AgentAnalytics> {
    const agent = await this.getById(agentId)
    if (!agent) {
      throw new NotFoundError('Agent', agentId)
    }

    // In real implementation, this would aggregate data from multiple sources
    return {
      totalJobs: 0,
      completedJobs: 0,
      averageRating: 0,
      totalEarnings: BigInt(0),
      responseTime: 0,
      successRate: 0,
      categories: agent.capabilities
    }
  }

  /**
   * Private helper methods
   */
  private async validateRegisterParams(params: RegisterAgentParams): Promise<void> {
    if (!params.name || params.name.length < 3) {
      throw new ValidationError(
        'Agent name must be at least 3 characters long',
        'Provide a descriptive name for your agent'
      )
    }
    if (!params.description || params.description.length < 10) {
      throw new ValidationError(
        'Agent description must be at least 10 characters long',
        'Add more details about what your agent can do'
      )
    }
    if (!params.capabilities || params.capabilities.length === 0) {
      throw new ValidationError(
        'Agent must have at least one capability',
        'Select at least one capability from the available options'
      )
    }
  }

  private async getAgentsByOwner(owner: Address): Promise<Agent[]> {
    // In real implementation, this would query blockchain or indexed data
    // For now, simulate with storage lookup
    const agents: Agent[] = []
    try {
      // This is a simplified approach - real implementation would use proper indexing
      const allAgents = await this.getAllAgents()
      return allAgents.filter(agent => agent.owner === owner)
    } catch (error) {
      console.error('Error getting agents by owner:', error)
      return agents
    }
  }

  private async getAllAgents(): Promise<Agent[]> {
    // In real implementation, this would query blockchain program accounts
    // For now, return empty array as we'd need proper indexing
    return []
  }

  private async simulateBlockchainRegistration(agent: Agent): Promise<string> {
    // Simulate blockchain registration delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return simulated transaction signature
    return `${agent.id.substring(0, 8)}...${Date.now().toString(36)}`
  }
}

// Factory function for dependency injection
export function createAgentService(deps: AgentServiceDependencies): AgentService {
  return new AgentService(deps)
}