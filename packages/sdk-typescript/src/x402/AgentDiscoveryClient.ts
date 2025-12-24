/**
 * x402 Agent Discovery Client
 *
 * Enables search and discovery of x402-enabled AI agents based on
 * capabilities, pricing, reputation, and accepted payment tokens.
 *
 * @module x402/AgentDiscoveryClient
 */

import type { Address, Commitment, SolanaRpcApi } from '@solana/kit'
import { createSolanaRpc, type Rpc } from '@solana/kit'
import { getAgentDecoder } from '../generated/accounts/agent.js'
import { AgentCacheService } from '../database/services/AgentCacheService.js'

// Create compatibility types for connection
type Connection = Rpc<SolanaRpcApi>

// Constants
const SOLANA_SYSTEM_PROGRAM_ID = '11111111111111111111111111111111' as Address
const REPUTATION_BASIS_POINTS_PER_STAR = 2000 // 1 star = 2000 basis points (20%)

/**
 * Agent search parameters
 */
export interface AgentSearchParams {
  // Filter parameters
  capability?: string
  x402_enabled?: boolean
  accepted_tokens?: string[]
  min_reputation?: number
  max_price?: bigint
  framework_origin?: string
  is_verified?: boolean

  // Pagination
  page?: number
  limit?: number

  // Sorting
  sort_by?: 'reputation' | 'price' | 'total_jobs' | 'created_at'
  sort_order?: 'asc' | 'desc'

  // Search
  query?: string

  // Cache control
  force_refresh?: boolean
}

/**
 * Agent data structure
 */
export interface Agent {
  // On-chain data
  address: Address
  owner: Address
  name: string
  description: string
  capabilities: string[]

  // x402 payment data
  x402_enabled: boolean
  x402_payment_address: Address
  x402_accepted_tokens: Address[]
  x402_price_per_call: bigint
  x402_service_endpoint: string
  x402_total_payments: bigint
  x402_total_calls: bigint
  last_payment_timestamp: bigint

  // Reputation & stats
  reputation_score: number
  total_jobs: bigint
  successful_jobs: bigint
  total_earnings: bigint
  average_rating: number
  created_at: bigint

  // Metadata
  metadata_uri: string
  framework_origin: string
  is_verified: boolean
}

/**
 * Agent pricing information
 */
export interface AgentPricing {
  price_per_call: bigint
  accepted_tokens: Array<{
    token: Address
    decimals: number
    symbol: string
  }>
  payment_address: Address
  service_endpoint: string
}

/**
 * Agent search response
 */
export interface AgentSearchResponse {
  agents: Agent[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: AgentSearchParams
  fromCache?: boolean // Indicates if results came from cache
}

/**
 * Discovery client options
 */
export interface AgentDiscoveryOptions {
  rpcEndpoint: string
  programId: Address
  commitment?: Commitment
  cacheEnabled?: boolean
  cacheTTL?: number // seconds
  useDatabaseCache?: boolean // Use Turso database cache
}

/**
 * Agent Discovery Client
 *
 * Provides methods to search, filter, and discover x402-enabled agents
 * on the GhostSpeak marketplace.
 */
export class AgentDiscoveryClient {
  private rpc: Connection
  private programId: Address
  private commitment: Commitment
  private cache: Map<string, { data: unknown; expiry: number }> = new Map()
  private cacheEnabled: boolean
  private cacheTTL: number
  private useDatabaseCache: boolean
  private dbCache: AgentCacheService

  constructor(options: AgentDiscoveryOptions) {
    this.rpc = createSolanaRpc(options.rpcEndpoint) as Connection
    this.programId = options.programId
    this.commitment = options.commitment ?? 'confirmed'
    this.cacheEnabled = options.cacheEnabled ?? true
    this.cacheTTL = options.cacheTTL ?? 300 // 5 minutes default
    this.useDatabaseCache = options.useDatabaseCache ?? true
    this.dbCache = AgentCacheService.getInstance()
  }

  /**
   * Search for agents with filters
   */
  async searchAgents(params: AgentSearchParams = {}): Promise<AgentSearchResponse> {
    const cacheKey = this.getCacheKey('search', params)

    // Check cache
    if (this.cacheEnabled) {
      const cached = this.getFromCache<AgentSearchResponse>(cacheKey)
      if (cached) return cached
    }

    // Set defaults
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const sortBy = params.sort_by ?? 'reputation'
    const sortOrder = params.sort_order ?? 'desc'

    // Fetch agents from on-chain
    const allAgents = await this.fetchAgentsFromChain(params)

    // Apply filters
    let filteredAgents = this.applyFilters(allAgents, params)

    // Sort results
    filteredAgents = this.sortAgents(filteredAgents, sortBy, sortOrder)

    // Paginate
    const total = filteredAgents.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex)

    const response: AgentSearchResponse = {
      agents: paginatedAgents,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      filters: params
    }

    // Cache results
    if (this.cacheEnabled) {
      this.setCache(cacheKey, response)
    }

    return response
  }

  /**
   * Get agent by address with database cache support
   * 
   * Cache hierarchy:
   * 1. Check Turso database cache (if enabled)
   * 2. Fallback to RPC fetch
   * 3. Cache result in database for future requests
   */
  async getAgent(address: Address, forceRefresh = false): Promise<Agent | null> {
    const cacheKey = this.getCacheKey('agent', { address })

    // Try database cache first (if enabled and not forcing refresh)
    if (this.useDatabaseCache && !forceRefresh) {
      const cachedAgent = await this.dbCache.getAgent(address, {
        maxAge: this.cacheTTL * 1000,
        forceRefresh
      })

      if (cachedAgent) {
        console.log(`[AgentDiscovery] Cache HIT for agent ${address}`)
        return this.transformCachedAgent(cachedAgent)
      }
    }

    // Check memory cache
    if (this.cacheEnabled && !forceRefresh) {
      const cached = this.getFromCache<Agent>(cacheKey)
      if (cached) {
        console.log(`[AgentDiscovery] Memory cache HIT for agent ${address}`)
        return cached
      }
    }

    // Cache MISS - fetch from RPC
    console.log(`[AgentDiscovery] Cache MISS for agent ${address}, fetching from RPC`)

    try {
      const result = await this.rpc.getAccountInfo(address, {
        commitment: this.commitment,
        encoding: 'base64'
      }).send()

      const accountInfo = result as { value: { data: [string, string] } | null }
      if (!accountInfo.value) return null

      const agent = this.parseAgentAccount(address, accountInfo.value.data)

      if (agent) {
        // Cache in database asynchronously (fire and forget)
        if (this.useDatabaseCache) {
          this.cacheAgentInDatabase(agent).catch(err =>
            console.warn('[AgentDiscovery] Failed to cache agent in database:', err)
          )
        }

        // Cache in memory
        if (this.cacheEnabled) {
          this.setCache(cacheKey, agent)
        }
      }

      return agent
    } catch (error) {
      console.error(`Failed to fetch agent ${address}:`, error)
      return null
    }
  }

  /**
   * Helper to cache agent in database
   */
  private async cacheAgentInDatabase(agent: Agent): Promise<void> {
    await this.dbCache.cacheAgent(
      {
        agentAddress: agent.address,
        owner: agent.owner,
        name: agent.name,
        description: agent.description,
        reputationScore: agent.reputation_score,
        totalJobsCompleted: Number(agent.total_jobs),
        totalEarnings: agent.total_earnings.toString(),
        x402Enabled: agent.x402_enabled,
        x402PaymentAddress: agent.x402_payment_address,
        x402PricePerCall: agent.x402_price_per_call.toString(),
        x402ServiceEndpoint: agent.x402_service_endpoint,
        x402TotalPayments: agent.x402_total_payments.toString(),
        x402TotalCalls: agent.x402_total_calls.toString(),
        lastPaymentTimestamp: Number(agent.last_payment_timestamp),
        metadataUri: agent.metadata_uri,
        frameworkOrigin: agent.framework_origin,
        isVerified: agent.is_verified,
        createdAt: Number(agent.created_at),
        updatedAt: Date.now(),
        cachedAt: Date.now(),
        bump: 0 // Placeholder
      },
      agent.capabilities,
      [] // Pricing info would be added here
    )
  }

  /**
   * Transform cached database agent to Agent interface
   */
  private transformCachedAgent(cachedAgent: any): Agent {
    return {
      address: cachedAgent.agentAddress as Address,
      owner: cachedAgent.owner as Address,
      name: cachedAgent.name,
      description: cachedAgent.description,
      capabilities: [], // Would need to join from agentCapabilities table
      x402_enabled: Boolean(cachedAgent.x402Enabled),
      x402_payment_address: cachedAgent.x402PaymentAddress as Address,
      x402_accepted_tokens: [], // Would join from agentPricing table
      x402_price_per_call: BigInt(cachedAgent.x402PricePerCall),
      x402_service_endpoint: cachedAgent.x402ServiceEndpoint,
      x402_total_payments: BigInt(cachedAgent.x402TotalPayments),
      x402_total_calls: BigInt(cachedAgent.x402TotalCalls),
      last_payment_timestamp: BigInt(cachedAgent.lastPaymentTimestamp),
      reputation_score: cachedAgent.reputationScore,
      total_jobs: BigInt(cachedAgent.totalJobsCompleted),
      successful_jobs: BigInt(cachedAgent.totalJobsCompleted),
      total_earnings: BigInt(cachedAgent.totalEarnings),
      average_rating: cachedAgent.reputationScore / REPUTATION_BASIS_POINTS_PER_STAR,
      created_at: BigInt(cachedAgent.createdAt),
      metadata_uri: cachedAgent.metadataUri,
      framework_origin: cachedAgent.frameworkOrigin,
      is_verified: Boolean(cachedAgent.isVerified)
    }
  }

  /**
   * Get agent pricing information
   */
  async getAgentPricing(address: Address): Promise<AgentPricing | null> {
    const agent = await this.getAgent(address)
    if (!agent?.x402_enabled) return null

    return {
      price_per_call: agent.x402_price_per_call,
      accepted_tokens: await this.getTokenInfo(agent.x402_accepted_tokens),
      payment_address: agent.x402_payment_address,
      service_endpoint: agent.x402_service_endpoint
    }
  }

  /**
   * Get recommended agents based on criteria
   */
  async getRecommendedAgents(
    capability?: string,
    limit = 10
  ): Promise<Agent[]> {
    const params: AgentSearchParams = {
      capability,
      x402_enabled: true,
      sort_by: 'reputation',
      sort_order: 'desc',
      limit,
      min_reputation: 7000 // Only recommend highly rated agents (7.0+)
    }

    const response = await this.searchAgents(params)
    return response.agents
  }

  /**
   * Get agents by capability
   */
  async getAgentsByCapability(capability: string): Promise<Agent[]> {
    const response = await this.searchAgents({
      capability,
      x402_enabled: true
    })
    return response.agents
  }

  /**
   * Get agents accepting specific token
   */
  async getAgentsByToken(tokenAddress: Address): Promise<Agent[]> {
    const response = await this.searchAgents({
      accepted_tokens: [tokenAddress],
      x402_enabled: true
    })
    return response.agents
  }

  /**
   * Get agents within price range
   */
  async getAgentsByPriceRange(
    maxPrice: bigint,
    capability?: string
  ): Promise<Agent[]> {
    const response = await this.searchAgents({
      max_price: maxPrice,
      capability,
      x402_enabled: true,
      sort_by: 'price',
      sort_order: 'asc'
    })
    return response.agents
  }

  /**
   * Search agents by text query
   */
  async searchByQuery(query: string): Promise<Agent[]> {
    const response = await this.searchAgents({
      query,
      x402_enabled: true
    })
    return response.agents
  }

  // Private helper methods

  private async fetchAgentsFromChain(params: AgentSearchParams): Promise<Agent[]> {
    try {
      // Build filters for getProgramAccounts
      // Note: Currently only using dataSize filter, memcmp filters would require Base58EncodedBytes type
      const filters: Array<{ dataSize: bigint }> = []

      // Add data size filter for Agent account
      filters.push({ dataSize: 359n }) // Agent account size from CLAUDE.md

      // If x402_enabled filter is true, we need to filter for accounts where x402_enabled = true
      // This would require knowing the exact offset of the x402_enabled field in the account
      // For now, we'll fetch all and filter in memory

      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        encoding: 'base64',
        filters
      }).send()

      // Extract accounts from RPC response
      const agents: Agent[] = []
      for (const { pubkey, account } of accounts) {
        const agent = this.parseAgentAccount(pubkey, account.data)
        if (agent) {
          agents.push(agent)
        }
      }

      return agents
    } catch (error) {
      console.error('Failed to fetch agents from chain:', error)
      return []
    }
  }

  private parseAgentAccount(address: Address, data: unknown): Agent | null {
    try {
      // Convert data to Uint8Array if it's a string (base64)
      let dataBytes: Uint8Array
      if (typeof data === 'string') {
        dataBytes = Uint8Array.from(Buffer.from(data, 'base64'))
      } else if (Array.isArray(data)) {
        // Check if it's an RPC tuple: [base64String, 'base64']
        if (
          data.length === 2 &&
          typeof data[0] === 'string' &&
          typeof data[1] === 'string' &&
          data[1] === 'base64'
        ) {
          dataBytes = Uint8Array.from(Buffer.from(data[0], 'base64'))
        } else {
          // Assume it's a number array
          dataBytes = Uint8Array.from(data as number[])
        }
      } else if (data instanceof Uint8Array) {
        dataBytes = data
      } else {
        throw new Error('Invalid data format')
      }

      // Decode using generated Codama decoder
      const decoder = getAgentDecoder()
      const decodedData = decoder.decode(dataBytes)
      const decodedAgent = Array.isArray(decodedData) ? decodedData[0] : decodedData

      // Access x402 fields directly from generated type
      // Transform to our Agent interface format
      return {
        address,
        owner: decodedAgent.owner,
        name: decodedAgent.name,
        description: decodedAgent.description,
        capabilities: decodedAgent.capabilities,
        // x402 fields
        x402_enabled: decodedAgent.x402Enabled,
        x402_payment_address: decodedAgent.x402PaymentAddress,
        x402_accepted_tokens: decodedAgent.x402AcceptedTokens,
        x402_price_per_call: decodedAgent.x402PricePerCall,
        x402_service_endpoint: decodedAgent.x402ServiceEndpoint,
        x402_total_payments: decodedAgent.x402TotalPayments,
        x402_total_calls: decodedAgent.x402TotalCalls,
        last_payment_timestamp: decodedAgent.lastPaymentTimestamp,
        // Standard fields
        reputation_score: decodedAgent.reputationScore,
        total_jobs: BigInt(decodedAgent.totalJobsCompleted),
        successful_jobs: BigInt(decodedAgent.totalJobsCompleted), // Assuming successful = completed
        total_earnings: decodedAgent.totalEarnings,
        average_rating: decodedAgent.reputationScore / REPUTATION_BASIS_POINTS_PER_STAR, // Convert from basis points to 1-5 scale
        created_at: decodedAgent.createdAt,
        metadata_uri: decodedAgent.metadataUri,
        framework_origin: decodedAgent.frameworkOrigin,
        is_verified: decodedAgent.isVerified
      }
    } catch (error) {
      console.error('Failed to parse agent account:', error)
      return null
    }
  }

  private applyFilters(agents: Agent[], params: AgentSearchParams): Agent[] {
    let filtered = agents

    // Filter by x402_enabled
    if (params.x402_enabled !== undefined) {
      filtered = filtered.filter(a => a.x402_enabled === params.x402_enabled)
    }

    // Filter by capability
    if (params.capability) {
      filtered = filtered.filter(a =>
        a.capabilities.some(c =>
          c.toLowerCase().includes(params.capability!.toLowerCase())
        )
      )
    }

    // Filter by accepted tokens
    if (params.accepted_tokens?.length) {
      filtered = filtered.filter(a =>
        params.accepted_tokens!.some(token =>
          a.x402_accepted_tokens.includes(token as Address)
        )
      )
    }

    // Filter by minimum reputation
    if (params.min_reputation !== undefined) {
      filtered = filtered.filter(a => a.reputation_score >= params.min_reputation!)
    }

    // Filter by maximum price
    if (params.max_price !== undefined) {
      filtered = filtered.filter(a => a.x402_price_per_call <= params.max_price!)
    }

    // Filter by framework origin
    if (params.framework_origin) {
      filtered = filtered.filter(a =>
        a.framework_origin.toLowerCase() === params.framework_origin!.toLowerCase()
      )
    }

    // Filter by verified status
    if (params.is_verified !== undefined) {
      filtered = filtered.filter(a => a.is_verified === params.is_verified)
    }

    // Filter by text query
    if (params.query) {
      const query = params.query.toLowerCase()
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  private sortAgents(
    agents: Agent[],
    sortBy: string,
    sortOrder: string
  ): Agent[] {
    const sorted = [...agents]
    const order = sortOrder === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'reputation':
          comparison = a.reputation_score - b.reputation_score
          break
        case 'price':
          comparison = Number(a.x402_price_per_call - b.x402_price_per_call)
          break
        case 'total_jobs':
          comparison = Number(a.total_jobs - b.total_jobs)
          break
        case 'created_at':
          comparison = Number(a.created_at - b.created_at)
          break
      }

      return comparison * order
    })

    return sorted
  }

  private async getTokenInfo(tokens: Address[]): Promise<Array<{
    token: Address
    decimals: number
    symbol: string
  }>> {
    const tokenInfo: Array<{ token: Address; decimals: number; symbol: string }> = []

    for (const token of tokens) {
      try {
        // Fetch token mint info
        const result = await this.rpc.getAccountInfo(token, {
          commitment: this.commitment,
          encoding: 'base64'
        }).send()

        const mintInfo = result as { value: { data: [string, string] } | null }
        if (mintInfo.value) {
          // Parse mint account to get decimals
          // Mint layout: MintAuthority(36) + Supply(8) + Decimals(1) + ...
          const data = Buffer.from(mintInfo.value.data[0], 'base64')
          const decimals = data[44]
          
          tokenInfo.push({
            token,
            decimals, 
            symbol: 'USDC' // Placeholder - would look up from token registry or metadata
          })
        }
      } catch (error) {
        console.error(`Failed to fetch token info for ${token}:`, error)
      }
    }

    return tokenInfo
  }

  private getCacheKey(prefix: string, params: unknown): string {
    return `${prefix}:${JSON.stringify(params)}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  private setCache(key: string, data: unknown): void {
    const expiry = Date.now() + (this.cacheTTL * 1000)
    this.cache.set(key, { data, expiry })

    // Limit cache size
    if (this.cache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].expiry - b[1].expiry)
      for (let i = 0; i < 100; i++) {
        this.cache.delete(entries[i][0])
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled,
      ttl: this.cacheTTL
    }
  }
}

/**
 * Create an Agent Discovery Client instance
 */
export function createAgentDiscoveryClient(
  options: AgentDiscoveryOptions
): AgentDiscoveryClient {
  return new AgentDiscoveryClient(options)
}
