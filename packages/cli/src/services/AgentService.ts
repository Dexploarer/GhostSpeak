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
  AgentServiceDependencies
} from '../types/services.js'
import { 
  ValidationError, 
  NotFoundError, 
  NetworkError, 
  UnauthorizedError 
} from '../types/services.js'
import { randomUUID } from 'crypto'
import { getWallet, toSDKSigner } from '../utils/client.js'
import { getCurrentProgramId } from '../../../../config/program-ids.js'

export class AgentService implements IAgentService {
  private agentCache = new Map<string, { data: Agent; timestamp: number }>()
  private listCache = new Map<string, { data: Agent[]; timestamp: number }>()
  private readonly CACHE_TTL = 30000 // 30 seconds
  
  constructor(private deps: AgentServiceDependencies) {}

  /**
   * Register a new AI agent
   */
  async register(params: RegisterAgentParams): Promise<Agent> {
    console.log('🚀 AgentService.register called with params:', params)
    
    // Validate parameters
    await this.validateRegisterParams(params)

    // Get current wallet using robust resolution (same as SDK client)
    console.log('🔍 Getting wallet using robust resolution...')
    const walletSigner = await getWallet()
    console.log('🔍 Wallet signer obtained:', walletSigner.address.toString())

    // Create agent data
    // Remove dashes from UUID to fit within 32 byte limit for PDA seeds
    const agentId = randomUUID().replace(/-/g, '')
    const agent: Agent = {
      id: agentId,
      address: walletSigner.address,
      name: params.name,
      description: params.description,
      capabilities: params.capabilities,
      owner: walletSigner.address,
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

    // Register on blockchain using AgentModule directly
    try {
      // Use the wallet signer we already obtained  
      const signer = walletSigner
      console.log('🔍 Using signer:', signer.address.toString())
      
      // Create metadata URI for the agent (in real implementation this would go to IPFS)
      const metadataJson = JSON.stringify({
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        category: params.category,
        image: "",
        external_url: "",
        attributes: [
          { trait_type: "Agent Type", value: "AI Agent" },
          { trait_type: "Category", value: params.category || agent.capabilities[0] },
          { trait_type: "Capabilities", value: agent.capabilities.join(", ") }
        ]
      })
      
      // TEMPORARY: Use empty metadata URI to test memory allocation issue
      const metadataUri = ""
      
      // Import AgentModule and create instance
      console.log('🔍 Importing AgentModule from SDK...')
      const { AgentModule, createSolanaRpc } = await import('@ghostspeak/sdk')
      console.log('🔍 AgentModule imported successfully')
      
      // Create RPC client
      const rpc = createSolanaRpc('https://api.devnet.solana.com')
      
      // Create AgentModule instance with proper config
      console.log('🔍 Creating AgentModule instance...')
      const agentModule = new AgentModule({
        programId: getCurrentProgramId(),
        rpc: rpc,
        commitment: 'confirmed',
        cluster: 'devnet',
        rpcEndpoint: 'https://api.devnet.solana.com'
      })
      
      console.log('🔍 Calling AgentModule.register...')
      console.log('🔍 Registration params:', {
        agentType: 0,
        metadataUri,
        agentId: agent.id,
        skipSimulation: true
      })
      
      const signature = await agentModule.register(signer, {
        agentType: 0,
        metadataUri,
        agentId: agent.id,
        skipSimulation: true // Skip simulation to avoid simulation-only failures
      })
      
      console.log('🔍 Raw signature result:', signature)
      console.log('🔍 Signature type:', typeof signature)
      
      console.log('🔍 Transaction signature:', signature)
      
      if (!signature || typeof signature !== 'string') {
        throw new Error(`No transaction signature returned from agent registration`)
      }
      
      // Store agent data locally for caching
      await this.deps.storageService.save(`agent:${agent.id}`, agent)
      await this.deps.storageService.save(`agent:owner:${walletSigner.address}:${agent.id}`, agent.id)
      
      console.log(`✅ Agent registered successfully!`)
      console.log(`Transaction signature: ${signature}`)
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
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
      const offset = params.offset ?? 0
      const limit = params.limit ?? 50
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

    // Update on blockchain
    try {
      console.log('🔍 Updating agent on blockchain...')
      const client = await this.deps.blockchainService.getClient('devnet')
      const walletSigner = await this.deps.walletService.getActiveSigner()
      
      if (!walletSigner) {
        throw new UnauthorizedError('No active wallet signer available')
      }

      // Import AgentModule dynamically to avoid build issues
      const sdk = await import('@ghostspeak/sdk')
      console.log('🔍 SDK imported, checking for AgentModule...')
      
      const AgentModuleClass = (sdk as any).AgentModule
      if (!AgentModuleClass) {
        throw new Error('AgentModule not found in SDK exports')
      }
      
      const typedClient = client as any
      const agentModule = new AgentModuleClass({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      console.log('🔍 Calling AgentModule.update...')
      
      // Prepare update metadata
      const metadataJson = JSON.stringify({
        ...agent.metadata,
        ...updates.metadata,
        name: updates.name || agent.name,
        description: updates.description || agent.description,
        capabilities: updates.capabilities || agent.capabilities
      })
      const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
      
      // Call SDK to update agent on blockchain
      const signature = await agentModule.update(toSDKSigner(walletSigner), {
        agentId: agent.id,
        name: updates.name,
        description: updates.description,
        capabilities: updates.capabilities,
        isActive: updates.isActive,
        metadataUri
      })
      
      console.log('🔍 Transaction signature:', signature)
      
      if (!signature || typeof signature !== 'string') {
        throw new Error('No transaction signature returned from agent update')
      }
      
      console.log(`✅ Agent updated on blockchain!`)
      console.log(`Transaction signature: ${signature}`)
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

      // Apply updates to local object
      const updatedAgent: Agent = {
        ...agent,
        ...updates,
        updatedAt: BigInt(Date.now())
      }

      // Update storage
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
    if (params.capabilities.length === 0) {
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
    try {
      // Import AgentModule and create instance for querying
      console.log('🔍 Querying all agents from blockchain...')
      const { AgentModule, createSolanaRpc } = await import('@ghostspeak/sdk')
      
      // Create RPC client
      const rpc = createSolanaRpc('https://api.devnet.solana.com')
      
      // Create AgentModule instance
      const agentModule = new AgentModule({
        programId: getCurrentProgramId(),
        rpc: rpc,
        commitment: 'confirmed',
        cluster: 'devnet',
        rpcEndpoint: 'https://api.devnet.solana.com'
      })
      
      // Query program accounts for agents using RPC
      const programAccounts = await rpc.getProgramAccounts(getCurrentProgramId(), { commitment: 'confirmed', encoding: 'base64' }).send()
      console.log('🔍 Found', programAccounts.length, 'program accounts on blockchain')
      
      // For now, return simple placeholder agents based on found accounts
      // This confirms we can see program accounts exist on-chain
      return Array.from({ length: Math.min(programAccounts.length, 10) }, (_, i) => ({
        id: `account-${i}`,
        address: getCurrentProgramId(),
        name: `Agent from Account ${i}`,
        description: 'Agent found on blockchain (account parsing not yet implemented)',
        capabilities: ['blockchain', 'discovery'],
        owner: getCurrentProgramId(),
        isActive: true,
        reputationScore: 0,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
        metadata: { source: 'blockchain-discovery' }
      }))
    } catch (error) {
      console.error('Error getting all agents from blockchain:', error)
      // Fallback to empty array if blockchain query fails
      return []
    }
  }

}

// Factory function for dependency injection
export function createAgentService(deps: AgentServiceDependencies): AgentService {
  return new AgentService(deps)
}