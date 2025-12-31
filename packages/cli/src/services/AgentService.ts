/**
 * Agent service for managing AI agent operations
 */

import type { Address } from '@solana/addresses'
import type { Signature } from '@solana/keys'
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
import { createSolanaRpc } from '@solana/kit'
import { AgentModule, type GhostSpeakClient, type RpcClient } from '@ghostspeak/sdk'
import { getErrorMessage } from '../utils/type-guards.js'
import { uploadMetadataToIPFS } from '../utils/ipfs.js'

/**
 * Wrap Solana RPC with additional methods required by RpcClient interface
 */
function wrapRpcClient(rpc: ReturnType<typeof createSolanaRpc>): RpcClient {
  return {
    getBalance: async (address: Address) => rpc.getBalance(address).send(),
    getAccountInfo: async (address: Address) => {
      const info = await rpc.getAccountInfo(address).send();
      return info.value as RpcClient['getAccountInfo'] extends (...args: unknown[]) => Promise<infer R> ? R : never;
    },
    sendTransaction: async (transaction: unknown) => {
      // This is a simplified implementation - actual implementation may vary
      return String(transaction);
    },
    confirmTransaction: async (signature: string, _commitment?: string) => {
      // Simple confirmation using getSignatureStatuses
      await rpc.getSignatureStatuses([signature as Signature]).send();
    },
    getProgramAccounts: async (programId: Address, options?: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await rpc.getProgramAccounts(programId, options as any).send();
      return accounts as RpcClient['getProgramAccounts'] extends (...args: unknown[]) => Promise<infer R> ? R : never;
    },
    requestAirdrop: (address: Address, lamports: bigint) => ({
      send: async () => {
        // Type assertion: requestAirdrop exists on devnet/testnet RPC
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const airdropMethod = (rpc as any).requestAirdrop as ((address: Address, lamports: bigint) => { send: () => Promise<Signature> }) | undefined
        if (!airdropMethod) {
          throw new Error('requestAirdrop is not available on this network (mainnet only supports devnet/testnet)')
        }
        const sig = await airdropMethod(address, lamports).send();
        return String(sig);
      }
    })
  };
}

export class AgentService implements IAgentService {
  private agentCache = new Map<string, { data: Agent; timestamp: number }>()
  private listCache = new Map<string, { data: Agent[]; timestamp: number }>()
  private readonly CACHE_TTL = 30000 // 30 seconds
  
  constructor(private deps: AgentServiceDependencies) {}

  /**
   * Register a new AI agent
   */
  async register(params: RegisterAgentParams): Promise<Agent> {
    this.deps.logger.info('AgentService.register called', { name: params.name })

    // Validate parameters
    await this.validateRegisterParams(params)
    this.deps.logger.info('Parameters validated')

    // Get current wallet using injected wallet service
    this.deps.logger.info('Getting wallet using injected service...')
    const walletSigner = await this.deps.walletService.getActiveSigner()
    if (!walletSigner) {
      this.deps.logger.error('No active wallet found.')
      throw new UnauthorizedError('No active wallet found. Please set up a wallet first.')
    }
    this.deps.logger.info('Wallet signer obtained', { address: walletSigner.address.toString() })

    // Create agent data
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
        pricing: params.pricing,
      },
    }
    this.deps.logger.info('Agent data created', { agentId })

    // Register on blockchain using AgentModule directly
    try {
      const signer = walletSigner
      this.deps.logger.info('Using signer', { address: signer.address.toString() })

      // Upload metadata to IPFS via Pinata
      const metadataUri = await uploadMetadataToIPFS({
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        category: params.category,
        image: '',
        external_url: '',
        attributes: [
          { trait_type: 'Agent Type', value: 'AI Agent' },
          { trait_type: 'Category', value: params.category || agent.capabilities[0] },
          { trait_type: 'Capabilities', value: agent.capabilities.join(', ') },
        ],
      })

      const rpc = wrapRpcClient(createSolanaRpc('https://api.devnet.solana.com'))
      this.deps.logger.info('Creating AgentModule instance...')
      const agentModule = new AgentModule({
        programId: getCurrentProgramId(),
        rpc: rpc,
        commitment: 'confirmed',
        cluster: 'devnet',
        rpcEndpoint: 'https://api.devnet.solana.com',
      })

      let signature: string
      
      if (params.merkleTree) {
        this.deps.logger.info('Calling AgentModule.registerCompressed', { 
            merkleTree: params.merkleTree,
            agentId: agent.id 
        })
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signature = await (agentModule as any).registerCompressed(toSDKSigner(signer), {
            agentType: 0,
            metadataUri, 
            agentId: agent.id,
            merkleTree: params.merkleTree as Address
        })
      } else {
        const registrationParams = {
            agentType: 0,
            name: agent.name,
            description: agent.description,
            metadataUri,
            agentId: agent.id,
            skipSimulation: true,
        }
        this.deps.logger.info('Calling AgentModule.register', { registrationParams })
        signature = await agentModule.register(toSDKSigner(signer), registrationParams)
      }
      
      this.deps.logger.info('Agent registration transaction sent', { signature })

      if (!signature || typeof signature !== 'string') {
        throw new Error('No transaction signature returned from agent registration')
      }

      // Store agent data locally for caching
      await this.deps.storageService.save(`agent:${agent.id}`, agent)
      await this.deps.storageService.save(`agent:owner:${walletSigner.address}:${agent.id}`, agent.id)
      this.deps.logger.info('Agent data saved to local storage')

      this.deps.logger.info('Agent registered successfully!', {
        agentId: agent.id,
        signature,
      })
      return agent
    } catch (error) {
      this.deps.logger.error('Failed to register agent on-chain', error instanceof Error ? error : undefined)
      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error // Re-throw service errors as-is
      }
      throw new NetworkError(
        `Failed to register agent: ${getErrorMessage(error)}`,
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
        const allAgents = await this.getAllAgents({
          category: params.category,
          includeInactive: params.isActive === undefined ? true : params.isActive
        })
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
        `Failed to list agents: ${getErrorMessage(error)}`,
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
      console.error(`Error getting agent ${agentId}:`, getErrorMessage(error))
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

      const typedClient = client as GhostSpeakClient
      const agentModule = new AgentModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: 'confirmed'
      })
      
      console.log('🔍 Calling AgentModule.update...')
      
      // Upload updated metadata to IPFS
      const metadataUri = await uploadMetadataToIPFS({
        ...agent.metadata,
        ...updates.metadata,
        name: updates.name || agent.name,
        description: updates.description || agent.description,
        capabilities: updates.capabilities || agent.capabilities
      })
      
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
        `Failed to update agent: ${getErrorMessage(error)}`,
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

    // In the new architecture, analytics are derived from the Reputation Module
    // which aggregates PayAI webhook events.
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
   * Configure PayAI integration for agent payments
   */
  async configurePayAI(agentId: string, params: {
    enabled: boolean
    pricePerCall: number
    apiKey: string
    webhookUrl?: string
  }): Promise<Agent> {
    const agent = await this.getById(agentId)
    if (!agent) {
      throw new NotFoundError('Agent', agentId)
    }

    const wallet = this.deps.walletService.getActiveWalletInterface()
    if (!wallet || agent.owner !== wallet.address) {
      throw new UnauthorizedError('You can only configure your own agents')
    }

    try {
      this.deps.logger.info('Configuring PayAI integration...', { agentId, enabled: params.enabled })

      // Update local cache/storage with PayAI configuration
      // PayAI is managed externally via PayAI API, not on-chain
      const updatedAgent = {
        ...agent,
        updatedAt: BigInt(Date.now()),
        metadata: {
          ...agent.metadata,
          payai: {
            enabled: params.enabled,
            pricePerCall: params.pricePerCall,
            apiKey: params.apiKey, // Store encrypted in production!
            webhookUrl: params.webhookUrl,
            lastConfigured: Date.now()
          }
        }
      }

      await this.deps.storageService.save(`agent:${agentId}`, updatedAgent)
      this.agentCache.set(agentId, { data: updatedAgent, timestamp: Date.now() })

      this.deps.logger.info('PayAI configuration saved', { agentId })

      return updatedAgent
    } catch (error) {
      this.deps.logger.error('Failed to configure PayAI', error instanceof Error ? error : undefined)
      throw new NetworkError(
        `Failed to configure PayAI: ${getErrorMessage(error)}`,
        'Check your configuration and try again'
      )
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
      console.error('Error getting agents by owner:', getErrorMessage(error))
      return agents
    }
  }

  private async getAllAgents(params?: {
    category?: string
    search?: string
    includeInactive?: boolean
    sortBy?: 'reputation' | 'created' | 'name'
    page?: number
    limit?: number
  }): Promise<Agent[]> {
    try {
      // Create instance for querying
      console.log('🔍 Querying all agents from blockchain...')
      
      // Create RPC client  
      const baseRpc = createSolanaRpc('https://api.devnet.solana.com')
      const rpc = wrapRpcClient(baseRpc)


      
      // Query program accounts for agents using RPC
      const programAccounts = await rpc.getProgramAccounts(getCurrentProgramId(), { commitment: 'confirmed', encoding: 'base64' })
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
          // const discriminator = data.slice(0, 8)
          
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
          const capCount = Buffer.from(capCountBytes).readUInt32LE(0)
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
          const reputationScore = Buffer.from(repBytes).readBigUInt64LE(0)
          offset += 8
          
          // Parse timestamps (8 bytes each)
          const createdBytes = data.slice(offset, offset + 8)
          const createdAt = Buffer.from(createdBytes).readBigUInt64LE(0)
          offset += 8
          
          const updatedBytes = data.slice(offset, offset + 8)
          const updatedAt = Buffer.from(updatedBytes).readBigUInt64LE(0)
          
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
      console.error('Error getting all agents from blockchain:', getErrorMessage(error))
      // Fallback to empty array if blockchain query fails
      return []
    }
  }

}

// Factory function for dependency injection
export function createAgentService(deps: AgentServiceDependencies): AgentService {
  return new AgentService(deps)
}