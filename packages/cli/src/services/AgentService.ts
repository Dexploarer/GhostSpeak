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
import { toSDKSigner } from '../utils/client.js'
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

    // Get current wallet using injected wallet service
    console.log('🔍 Getting wallet using injected service...')
    const walletSigner = await this.deps.walletService.getActiveSigner()
    if (!walletSigner) {
      throw new UnauthorizedError('No active wallet found. Please set up a wallet first.')
    }
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

    // Query blockchain for real analytics data
    try {
      const programId = getCurrentProgramId()
      
      // Query work orders for this agent
      const workOrderFilters = [
        {
          memcmp: {
            offset: 8 + 32, // After discriminator and client, provider is at offset 40
            bytes: agent.address.toString()
          }
        }
      ]
      
      // Use blockchain service to get client and fetch work orders
      const client = await this.deps.blockchainService.getClient('devnet') as any
      const workOrders = await client.rpc.getProgramAccounts(
        programId,
        {
          filters: workOrderFilters,
          commitment: 'confirmed'
        }
      )
      
      console.log(`📊 Found ${workOrders.length} work orders for agent`)
      
      // Parse work order data to calculate analytics
      let totalJobs = 0
      let completedJobs = 0
      let totalEarnings = BigInt(0)
      let totalRating = 0
      let ratedJobs = 0
      let totalResponseTime = 0
      
      for (const workOrder of workOrders) {
        totalJobs++
        
        // Parse work order account data (simplified - in production use proper Borsh deserialization)
        const data = workOrder.account.data
        if (data.length > 100) {
          // Check status byte at expected offset (this is simplified)
          const statusOffset = 8 + 32 + 32 + 32 // discriminator + client + provider + orderId
          const status = data[statusOffset]
          
          if (status === 3 || status === 4) { // Completed or Delivered
            completedJobs++
            
            // Extract amount (8 bytes at offset after status)
            const amountOffset = statusOffset + 1
            const amountBytes = data.slice(amountOffset, amountOffset + 8)
            const amount = Buffer.from(amountBytes).readBigUInt64LE()
            totalEarnings += amount
            
            // Extract rating if available (simplified)
            const ratingOffset = amountOffset + 8 + 8 // amount + timestamp
            if (data.length > ratingOffset) {
              const rating = data[ratingOffset]
              if (rating > 0 && rating <= 5) {
                totalRating += rating
                ratedJobs++
              }
            }
          }
        }
      }
      
      // Calculate derived metrics
      const averageRating = ratedJobs > 0 ? totalRating / ratedJobs : 0
      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
      
      // For response time, we would need to query additional event data
      // For now, return a placeholder that's more realistic
      const responseTime = completedJobs > 0 ? 3600 : 0 // 1 hour average
      
      return {
        totalJobs,
        completedJobs,
        averageRating,
        totalEarnings,
        responseTime,
        successRate,
        categories: agent.capabilities
      }
      
    } catch (error) {
      console.error('Error fetching agent analytics:', error)
      // Return default values on error but log the issue
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
      
      // Parse real agent data from blockchain accounts
      const agents: Agent[] = []
      
      for (const account of programAccounts) {
        try {
          const data = account.account.data
          
          // Skip if data is too small to be an agent account
          if (data.length < 200) {
            console.log('Skipping account - data too small:', account.pubkey.toString())
            continue
          }
          
          // Check discriminator (first 8 bytes) to identify agent accounts
          // Agent account discriminator would be specific pattern
          const discriminator = data.slice(0, 8)
          
          // Parse agent account data
          // In production, use proper Borsh deserialization
          let offset = 8 // Skip discriminator
          
          // Parse agent ID (32 bytes)
          const idBytes = data.slice(offset, offset + 32)
          const agentId = Buffer.from(idBytes).toString('utf8').replace(/\0/g, '').trim()
          offset += 32
          
          // Parse owner (32 bytes pubkey)
          const ownerBytes = data.slice(offset, offset + 32)
          const owner = ownerBytes.toString('hex')
          offset += 32
          
          // Parse name (64 bytes)
          const nameBytes = data.slice(offset, offset + 64)
          const name = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim()
          offset += 64
          
          // Parse description (256 bytes)
          const descBytes = data.slice(offset, offset + 256)
          const description = Buffer.from(descBytes).toString('utf8').replace(/\0/g, '').trim()
          offset += 256
          
          // Parse capabilities count (4 bytes)
          const capCountBytes = data.slice(offset, offset + 4)
          const capCount = capCountBytes.readUInt32LE(0)
          offset += 4
          
          // Parse capabilities
          const capabilities: string[] = []
          for (let i = 0; i < Math.min(capCount, 10); i++) {
            const capBytes = data.slice(offset, offset + 32)
            const capability = Buffer.from(capBytes).toString('utf8').replace(/\0/g, '').trim()
            if (capability) {
              capabilities.push(capability)
            }
            offset += 32
          }
          
          // Parse isActive (1 byte)
          const isActive = data[offset] === 1
          offset += 1
          
          // Parse reputation score (8 bytes)
          const repBytes = data.slice(offset, offset + 8)
          const reputationScore = repBytes.readBigUInt64LE(0)
          offset += 8
          
          // Parse timestamps (8 bytes each)
          const createdBytes = data.slice(offset, offset + 8)
          const createdAt = createdBytes.readBigUInt64LE(0)
          offset += 8
          
          const updatedBytes = data.slice(offset, offset + 8)
          const updatedAt = updatedBytes.readBigUInt64LE(0)
          
          // Skip invalid or empty agents
          if (!agentId || !name || name === '') {
            console.log('Skipping invalid agent data')
            continue
          }
          
          // Apply filters if specified
          if (params?.category) {
            if (!capabilities.includes(params.category)) {
              continue
            }
          }
          
          if (params?.search) {
            const searchLower = params.search.toLowerCase()
            if (!name.toLowerCase().includes(searchLower) && 
                !description.toLowerCase().includes(searchLower) &&
                !capabilities.some(cap => cap.toLowerCase().includes(searchLower))) {
              continue
            }
          }
          
          // Only return active agents unless specifically requested
          if (!params?.includeInactive && !isActive) {
            continue
          }
          
          agents.push({
            id: agentId,
            address: account.pubkey.toString() as Address,
            name,
            description: description || 'No description provided',
            capabilities: capabilities.length > 0 ? capabilities : ['general'],
            owner: owner as Address,
            isActive,
            reputationScore: Number(reputationScore),
            createdAt,
            updatedAt,
            metadata: {
              source: 'blockchain',
              accountSize: data.length
            }
          })
          
        } catch (parseError) {
          console.error('Error parsing agent account:', account.pubkey.toString(), parseError)
          // Continue with next account
        }
      }
      
      console.log(`✅ Successfully parsed ${agents.length} agents from ${programAccounts.length} accounts`)
      
      // Apply sorting
      if (params?.sortBy) {
        agents.sort((a, b) => {
          switch (params.sortBy) {
            case 'reputation':
              return b.reputationScore - a.reputationScore
            case 'created':
              return Number(b.createdAt - a.createdAt)
            case 'name':
              return a.name.localeCompare(b.name)
            default:
              return 0
          }
        })
      }
      
      // Apply pagination
      const page = params?.page || 0
      const limit = params?.limit || 10
      const start = page * limit
      const end = start + limit
      
      return agents.slice(start, end)
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