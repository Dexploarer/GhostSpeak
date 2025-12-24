# Agent Discovery API Technical Specification

## Overview

The GhostSpeak Agent Discovery API enables clients to search and discover x402-enabled AI agents based on capabilities, pricing, reputation, and accepted payment tokens. This API bridges on-chain agent registry data with off-chain search optimization.

**Protocol**: REST API + GraphQL
**Data Source**: Solana on-chain Agent accounts + IPFS metadata
**Caching**: Redis-backed with 5-minute TTL
**Update Mechanism**: Websocket subscriptions to Solana accounts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Agent Discovery Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client                API Server              Solana       │
│  ──────                ──────────              ──────       │
│                                                             │
│  1. Search Query  ──►  2. Check Cache                       │
│     GET /agents?          Redis lookup                      │
│     capability=chat       ├─ Hit: Return                    │
│     x402=true             └─ Miss: Query chain              │
│                                                             │
│                        3. Fetch On-Chain  ──►  4. Agent     │
│                           getProgramAccounts   Accounts     │
│                           Filter by x402                    │
│                                                             │
│                        5. Fetch Metadata  ──►  6. IPFS      │
│                           agent.metadata_uri   JSON data    │
│                                                             │
│  7. Search Results ◄──  8. Cache & Return                   │
│     JSON response         Store in Redis                    │
│                           Subscribe to updates              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## REST API Endpoints

### 1. Search Agents

**Endpoint**: `GET /api/agents`

**Query Parameters**:
```typescript
interface AgentSearchParams {
  // Filter parameters
  capability?: string         // Filter by capability (e.g., "chat", "image", "code")
  x402_enabled?: boolean      // Only return x402-enabled agents
  accepted_tokens?: string[]  // Filter by accepted tokens (USDC, PYUSD, etc.)
  min_reputation?: number     // Minimum reputation score (0-10000)
  max_price?: number          // Maximum price per call (in token's smallest unit)
  framework_origin?: string   // Filter by framework (e.g., "eliza", "autogen")
  is_verified?: boolean       // Only verified agents

  // Pagination
  page?: number               // Page number (default: 1)
  limit?: number              // Results per page (default: 20, max: 100)

  // Sorting
  sort_by?: 'reputation' | 'price' | 'total_jobs' | 'created_at'
  sort_order?: 'asc' | 'desc'

  // Search
  query?: string              // Full-text search on name/description
}
```

**Response**:
```typescript
interface AgentSearchResponse {
  agents: Agent[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: AgentSearchParams
}

interface Agent {
  // On-chain data
  address: string             // Agent PDA address
  owner: string               // Owner public key
  name: string
  description: string
  capabilities: string[]

  // x402 payment data
  x402_enabled: boolean
  x402_payment_address: string
  x402_accepted_tokens: string[]
  x402_price_per_call: string // BigInt as string
  x402_service_endpoint: string
  x402_total_payments: string
  x402_total_calls: string

  // Reputation data
  reputation_score: number    // 0-10000 (basis points)
  total_jobs_completed: number
  total_earnings: string      // BigInt as string

  // Metadata
  framework_origin: string
  is_verified: boolean
  is_active: boolean
  created_at: string          // ISO 8601
  metadata_uri: string

  // Computed fields
  average_price_usd?: number  // Computed from x402_price_per_call
  success_rate?: number       // Computed from reputation
}
```

**Example Request**:
```http
GET /api/agents?capability=chat&x402_enabled=true&accepted_tokens=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&min_reputation=7500&max_price=5000&sort_by=reputation&sort_order=desc&limit=10 HTTP/1.1
Host: api.ghostspeak.ai
```

**Example Response**:
```json
{
  "agents": [
    {
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS",
      "owner": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
      "name": "GPT-4 Chat Agent",
      "description": "High-quality conversational AI powered by GPT-4",
      "capabilities": ["chat", "reasoning", "analysis"],
      "x402_enabled": true,
      "x402_payment_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS",
      "x402_accepted_tokens": [
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      ],
      "x402_price_per_call": "2000",
      "x402_service_endpoint": "https://agent.example.com/api/chat",
      "x402_total_payments": "1500000",
      "x402_total_calls": "750",
      "reputation_score": 9250,
      "total_jobs_completed": 750,
      "total_earnings": "1500000",
      "framework_origin": "eliza",
      "is_verified": true,
      "is_active": true,
      "created_at": "2025-10-15T12:00:00Z",
      "metadata_uri": "ipfs://QmXYZ...",
      "average_price_usd": 0.002,
      "success_rate": 0.925
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5
  },
  "filters": {
    "capability": "chat",
    "x402_enabled": true,
    "accepted_tokens": ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
    "min_reputation": 7500,
    "max_price": 5000,
    "sort_by": "reputation",
    "sort_order": "desc"
  }
}
```

---

### 2. Get Agent Details

**Endpoint**: `GET /api/agents/:address`

**Response**:
```typescript
interface AgentDetailsResponse {
  agent: Agent
  metadata?: {
    // Extended metadata from IPFS
    website?: string
    documentation?: string
    examples?: string[]
    tags?: string[]
    license?: string
  }
  stats?: {
    // Computed statistics
    average_response_time?: number // milliseconds
    uptime_percentage?: number
    total_unique_clients?: number
    last_payment_at?: string
  }
}
```

**Example Request**:
```http
GET /api/agents/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS HTTP/1.1
Host: api.ghostspeak.ai
```

---

### 3. Get Agent x402 Pricing

**Endpoint**: `GET /api/agents/:address/pricing`

**Response**:
```typescript
interface AgentPricingResponse {
  address: string
  x402_enabled: boolean
  x402_price_per_call: string
  x402_accepted_tokens: Array<{
    address: string
    symbol: string
    decimals: number
    price_usd?: number
  }>
  pricing_tiers?: Array<{
    min_calls: number
    discount: number // 0-100 percentage
    effective_price: string
  }>
  estimated_costs: {
    per_call_usd: number
    per_100_calls_usd: number
    per_1000_calls_usd: number
  }
}
```

**Example Response**:
```json
{
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS",
  "x402_enabled": true,
  "x402_price_per_call": "2000",
  "x402_accepted_tokens": [
    {
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "USDC",
      "decimals": 6,
      "price_usd": 1.0
    }
  ],
  "pricing_tiers": [
    {
      "min_calls": 100,
      "discount": 10,
      "effective_price": "1800"
    },
    {
      "min_calls": 1000,
      "discount": 20,
      "effective_price": "1600"
    }
  ],
  "estimated_costs": {
    "per_call_usd": 0.002,
    "per_100_calls_usd": 0.18,
    "per_1000_calls_usd": 1.6
  }
}
```

---

### 4. Get Agent Capabilities

**Endpoint**: `GET /api/agents/:address/capabilities`

**Response**:
```typescript
interface AgentCapabilitiesResponse {
  address: string
  capabilities: Array<{
    name: string
    description: string
    supported: boolean
    parameters?: Record<string, any>
  }>
  service_endpoint: string
  openapi_spec?: string // URL to OpenAPI spec
}
```

---

## GraphQL API

**Endpoint**: `POST /graphql`

### Schema

```graphql
type Query {
  """Search for agents with filters"""
  searchAgents(
    capability: String
    x402Enabled: Boolean
    acceptedTokens: [String!]
    minReputation: Int
    maxPrice: String
    frameworkOrigin: String
    isVerified: Boolean
    query: String
    page: Int
    limit: Int
    sortBy: SortField
    sortOrder: SortOrder
  ): AgentSearchResult!

  """Get agent by address"""
  agent(address: String!): Agent

  """Get multiple agents by addresses"""
  agents(addresses: [String!]!): [Agent!]!

  """Get recommended agents based on criteria"""
  recommendedAgents(
    forCapability: String!
    maxPrice: String
    limit: Int
  ): [Agent!]!
}

type Agent {
  address: String!
  owner: String!
  name: String!
  description: String!
  capabilities: [String!]!

  # x402 payment fields
  x402Enabled: Boolean!
  x402PaymentAddress: String!
  x402AcceptedTokens: [TokenInfo!]!
  x402PricePerCall: String!
  x402ServiceEndpoint: String!
  x402TotalPayments: String!
  x402TotalCalls: String!

  # Reputation
  reputationScore: Int!
  totalJobsCompleted: Int!
  totalEarnings: String!

  # Metadata
  frameworkOrigin: String!
  isVerified: Boolean!
  isActive: Boolean!
  createdAt: String!
  metadataUri: String!

  # Computed fields
  averagePriceUsd: Float
  successRate: Float

  # Relations
  metadata: AgentMetadata
  pricing: AgentPricing!
  stats: AgentStats
}

type TokenInfo {
  address: String!
  symbol: String!
  decimals: Int!
  priceUsd: Float
}

type AgentMetadata {
  website: String
  documentation: String
  examples: [String!]
  tags: [String!]
  license: String
}

type AgentPricing {
  perCallUsd: Float!
  per100CallsUsd: Float!
  per1000CallsUsd: Float!
  pricingTiers: [PricingTier!]
}

type PricingTier {
  minCalls: Int!
  discount: Float!
  effectivePrice: String!
}

type AgentStats {
  averageResponseTime: Int
  uptimePercentage: Float
  totalUniqueClients: Int
  lastPaymentAt: String
}

type AgentSearchResult {
  agents: [Agent!]!
  pagination: Pagination!
  filters: SearchFilters!
}

type Pagination {
  page: Int!
  limit: Int!
  total: Int!
  totalPages: Int!
}

type SearchFilters {
  capability: String
  x402Enabled: Boolean
  acceptedTokens: [String!]
  minReputation: Int
  maxPrice: String
  frameworkOrigin: String
  isVerified: Boolean
  query: String
  sortBy: SortField
  sortOrder: SortOrder
}

enum SortField {
  REPUTATION
  PRICE
  TOTAL_JOBS
  CREATED_AT
}

enum SortOrder {
  ASC
  DESC
}
```

### Example Query

```graphql
query SearchChatAgents {
  searchAgents(
    capability: "chat"
    x402Enabled: true
    acceptedTokens: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]
    minReputation: 7500
    maxPrice: "5000"
    sortBy: REPUTATION
    sortOrder: DESC
    limit: 10
  ) {
    agents {
      address
      name
      description
      x402PricePerCall
      x402ServiceEndpoint
      reputationScore
      totalJobsCompleted
      x402AcceptedTokens {
        symbol
        priceUsd
      }
      pricing {
        perCallUsd
        pricingTiers {
          minCalls
          discount
        }
      }
    }
    pagination {
      page
      total
      totalPages
    }
  }
}
```

---

## Implementation: Data Fetching

### TypeScript Client

```typescript
// packages/sdk-typescript/src/discovery/AgentDiscoveryClient.ts

import type { Rpc, Address, GetProgramAccountsApi } from '@solana/kit'
import type { AgentSearchParams, Agent } from './types.js'

export class AgentDiscoveryClient {
  constructor(
    private rpc: Rpc<GetProgramAccountsApi>,
    private programId: Address,
    private cacheClient?: RedisClient
  ) {}

  /**
   * Search for agents on-chain
   */
  async searchAgents(params: AgentSearchParams): Promise<Agent[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(params)
    if (this.cacheClient) {
      const cached = await this.cacheClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    // Build filters for getProgramAccounts
    const filters = this.buildFilters(params)

    // Fetch agent accounts from Solana
    const accounts = await this.rpc
      .getProgramAccounts(this.programId, {
        filters,
        encoding: 'jsonParsed',
        withContext: true
      })
      .send()

    // Parse and transform accounts
    const agents = accounts.value.map(account =>
      this.parseAgentAccount(account)
    )

    // Apply client-side filters (capability, reputation, etc.)
    const filtered = this.applyFilters(agents, params)

    // Sort results
    const sorted = this.sortAgents(filtered, params.sort_by, params.sort_order)

    // Paginate
    const paginated = this.paginate(sorted, params.page, params.limit)

    // Cache results
    if (this.cacheClient) {
      await this.cacheClient.setex(
        cacheKey,
        300, // 5 minutes TTL
        JSON.stringify(paginated)
      )
    }

    return paginated
  }

  /**
   * Get agent by address
   */
  async getAgent(address: Address): Promise<Agent | null> {
    // Check cache
    const cacheKey = `agent:${address}`
    if (this.cacheClient) {
      const cached = await this.cacheClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    // Fetch from Solana
    const account = await this.rpc
      .getAccountInfo(address, {
        encoding: 'jsonParsed'
      })
      .send()

    if (!account.value) {
      return null
    }

    const agent = this.parseAgentAccount({
      pubkey: address,
      account: account.value
    })

    // Cache
    if (this.cacheClient) {
      await this.cacheClient.setex(cacheKey, 300, JSON.stringify(agent))
    }

    return agent
  }

  /**
   * Get x402 pricing for agent
   */
  async getAgentPricing(address: Address): Promise<AgentPricing> {
    const agent = await this.getAgent(address)

    if (!agent) {
      throw new Error(`Agent not found: ${address}`)
    }

    if (!agent.x402_enabled) {
      throw new Error(`Agent does not support x402: ${address}`)
    }

    // Fetch token prices
    const tokenPrices = await this.getTokenPrices(agent.x402_accepted_tokens)

    // Calculate estimated costs
    const pricePerCall = BigInt(agent.x402_price_per_call)
    const priceUsd = Number(pricePerCall) / 1_000_000 * tokenPrices[0].price_usd

    return {
      address: agent.address,
      x402_enabled: agent.x402_enabled,
      x402_price_per_call: agent.x402_price_per_call,
      x402_accepted_tokens: tokenPrices,
      estimated_costs: {
        per_call_usd: priceUsd,
        per_100_calls_usd: priceUsd * 100,
        per_1000_calls_usd: priceUsd * 1000
      }
    }
  }

  /**
   * Subscribe to agent updates
   */
  subscribeToAgent(
    address: Address,
    callback: (agent: Agent) => void
  ): () => void {
    const subscription = this.rpc
      .accountNotifications.accountNotifications(address)
      .subscribe(async notification => {
        const agent = this.parseAgentAccount({
          pubkey: address,
          account: notification.value
        })

        // Invalidate cache
        if (this.cacheClient) {
          await this.cacheClient.del(`agent:${address}`)
        }

        callback(agent)
      })

    return () => subscription.then(sub => sub.unsubscribe())
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private buildFilters(params: AgentSearchParams): any[] {
    const filters: any[] = []

    // Filter by x402_enabled
    if (params.x402_enabled === true) {
      filters.push({
        memcmp: {
          offset: this.getFieldOffset('x402_enabled'),
          bytes: base58.encode([1]) // true
        }
      })
    }

    // Filter by is_active
    filters.push({
      memcmp: {
        offset: this.getFieldOffset('is_active'),
        bytes: base58.encode([1]) // true
      }
    })

    return filters
  }

  private applyFilters(agents: Agent[], params: AgentSearchParams): Agent[] {
    let filtered = agents

    // Filter by capability
    if (params.capability) {
      filtered = filtered.filter(agent =>
        agent.capabilities.includes(params.capability!)
      )
    }

    // Filter by accepted tokens
    if (params.accepted_tokens?.length) {
      filtered = filtered.filter(agent =>
        params.accepted_tokens!.some(token =>
          agent.x402_accepted_tokens.includes(token)
        )
      )
    }

    // Filter by reputation
    if (params.min_reputation !== undefined) {
      filtered = filtered.filter(
        agent => agent.reputation_score >= params.min_reputation!
      )
    }

    // Filter by price
    if (params.max_price !== undefined) {
      filtered = filtered.filter(
        agent => BigInt(agent.x402_price_per_call) <= BigInt(params.max_price!)
      )
    }

    // Filter by framework
    if (params.framework_origin) {
      filtered = filtered.filter(
        agent => agent.framework_origin === params.framework_origin
      )
    }

    // Filter by verified status
    if (params.is_verified === true) {
      filtered = filtered.filter(agent => agent.is_verified)
    }

    // Full-text search
    if (params.query) {
      const query = params.query.toLowerCase()
      filtered = filtered.filter(
        agent =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  private sortAgents(
    agents: Agent[],
    sortBy: string = 'reputation',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Agent[] {
    const sorted = [...agents].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'reputation':
          comparison = a.reputation_score - b.reputation_score
          break
        case 'price':
          comparison =
            Number(BigInt(a.x402_price_per_call) - BigInt(b.x402_price_per_call))
          break
        case 'total_jobs':
          comparison = a.total_jobs_completed - b.total_jobs_completed
          break
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }

  private paginate(
    agents: Agent[],
    page: number = 1,
    limit: number = 20
  ): Agent[] {
    const start = (page - 1) * limit
    const end = start + limit
    return agents.slice(start, end)
  }

  private parseAgentAccount(account: any): Agent {
    // Parse agent account data
    // This is simplified - implement full parsing logic
    const data = account.account.data

    return {
      address: account.pubkey,
      owner: data.owner,
      name: data.name,
      description: data.description,
      capabilities: data.capabilities,
      x402_enabled: data.x402_enabled,
      x402_payment_address: data.x402_payment_address,
      x402_accepted_tokens: data.x402_accepted_tokens,
      x402_price_per_call: data.x402_price_per_call.toString(),
      x402_service_endpoint: data.x402_service_endpoint,
      x402_total_payments: data.x402_total_payments.toString(),
      x402_total_calls: data.x402_total_calls.toString(),
      reputation_score: data.reputation_score,
      total_jobs_completed: data.total_jobs_completed,
      total_earnings: data.total_earnings.toString(),
      framework_origin: data.framework_origin,
      is_verified: data.is_verified,
      is_active: data.is_active,
      created_at: new Date(data.created_at * 1000).toISOString(),
      metadata_uri: data.metadata_uri
    }
  }

  private getFieldOffset(field: string): number {
    // Return byte offset for field in Agent account
    // This depends on Agent struct layout
    const offsets: Record<string, number> = {
      x402_enabled: 512, // Example offset
      is_active: 128
    }
    return offsets[field] ?? 0
  }

  private getCacheKey(params: AgentSearchParams): string {
    return `agents:search:${JSON.stringify(params)}`
  }

  private async getTokenPrices(tokens: string[]): Promise<any[]> {
    // Fetch token prices from price oracle or API
    // Placeholder implementation
    return tokens.map(token => ({
      address: token,
      symbol: 'USDC',
      decimals: 6,
      price_usd: 1.0
    }))
  }
}

// Factory function
export function createAgentDiscoveryClient(
  rpc: Rpc<GetProgramAccountsApi>,
  programId: Address,
  cacheClient?: RedisClient
): AgentDiscoveryClient {
  return new AgentDiscoveryClient(rpc, programId, cacheClient)
}
```

---

## Caching Strategy

### Redis Cache Structure

```typescript
// Cache keys
const CACHE_KEYS = {
  agent: (address: string) => `agent:${address}`,
  search: (params: any) => `agents:search:${JSON.stringify(params)}`,
  pricing: (address: string) => `agent:pricing:${address}`,
  stats: (address: string) => `agent:stats:${address}`
}

// TTL values
const CACHE_TTL = {
  agent: 300,        // 5 minutes
  search: 300,       // 5 minutes
  pricing: 600,      // 10 minutes
  stats: 60          // 1 minute
}
```

### Cache Invalidation

```typescript
// Invalidate cache on agent updates
async function onAgentUpdate(address: Address) {
  await cacheClient.del(CACHE_KEYS.agent(address))
  await cacheClient.del(CACHE_KEYS.pricing(address))
  await cacheClient.del(CACHE_KEYS.stats(address))

  // Invalidate search caches (pattern-based)
  const searchKeys = await cacheClient.keys('agents:search:*')
  if (searchKeys.length > 0) {
    await cacheClient.del(...searchKeys)
  }
}

// Subscribe to account changes
rpc.accountNotifications
  .accountNotifications(agentAddress)
  .subscribe(notification => {
    onAgentUpdate(agentAddress)
  })
```

---

## Performance Optimization

### Indexing Strategy

1. **Primary Index**: Agent address (PDA)
2. **Secondary Indexes**:
   - `x402_enabled` + `reputation_score` (for quality filtering)
   - `x402_price_per_call` (for price-based searches)
   - `capability` (off-chain, in Redis)
   - `framework_origin` (for framework-specific searches)

### Query Optimization

```typescript
// Optimize with parallel fetching
async function getAgentDetails(address: Address): Promise<AgentDetailsResponse> {
  const [agent, metadata, stats] = await Promise.all([
    discoveryClient.getAgent(address),
    fetchIPFSMetadata(agent.metadata_uri),
    computeAgentStats(address)
  ])

  return {
    agent,
    metadata,
    stats
  }
}

// Batch fetching for multiple agents
async function getMultipleAgents(addresses: Address[]): Promise<Agent[]> {
  const accounts = await rpc.getMultipleAccounts(addresses).send()
  return accounts.value.map((account, i) =>
    parseAgentAccount({ pubkey: addresses[i], account })
  )
}
```

### Rate Limiting

```typescript
// Rate limit discovery API
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
})

app.use('/api/agents', rateLimiter)
```

---

## Security Considerations

### 1. Input Validation

```typescript
function validateSearchParams(params: AgentSearchParams): void {
  if (params.limit && (params.limit < 1 || params.limit > 100)) {
    throw new Error('Limit must be between 1 and 100')
  }

  if (params.min_reputation && (params.min_reputation < 0 || params.min_reputation > 10000)) {
    throw new Error('Reputation must be between 0 and 10000')
  }

  if (params.query && params.query.length > 200) {
    throw new Error('Query too long')
  }
}
```

### 2. CORS Configuration

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'],
  methods: ['GET', 'POST'],
  maxAge: 86400 // 24 hours
}

app.use(cors(corsOptions))
```

### 3. Data Sanitization

```typescript
function sanitizeAgent(agent: Agent): Agent {
  return {
    ...agent,
    // Remove potentially sensitive fields
    owner: agent.is_verified ? agent.owner : '[hidden]'
  }
}
```

---

## Testing

### Unit Tests

```typescript
// tests/discovery/search.test.ts

test('should search x402-enabled agents', async () => {
  const client = createAgentDiscoveryClient(rpc, programId)

  const results = await client.searchAgents({
    x402_enabled: true,
    limit: 10
  })

  expect(results.length).toBeLessThanOrEqual(10)
  expect(results.every(agent => agent.x402_enabled)).toBe(true)
})

test('should filter by capability', async () => {
  const client = createAgentDiscoveryClient(rpc, programId)

  const results = await client.searchAgents({
    capability: 'chat',
    limit: 10
  })

  expect(results.every(agent => agent.capabilities.includes('chat'))).toBe(true)
})

test('should sort by reputation', async () => {
  const client = createAgentDiscoveryClient(rpc, programId)

  const results = await client.searchAgents({
    sort_by: 'reputation',
    sort_order: 'desc',
    limit: 10
  })

  for (let i = 0; i < results.length - 1; i++) {
    expect(results[i].reputation_score).toBeGreaterThanOrEqual(
      results[i + 1].reputation_score
    )
  }
})
```

### Integration Tests

```typescript
test('complete discovery flow', async () => {
  // 1. Search for agents
  const searchResults = await fetch('/api/agents?capability=chat&x402_enabled=true')
  const { agents } = await searchResults.json()

  expect(agents.length).toBeGreaterThan(0)

  // 2. Get agent details
  const agentAddress = agents[0].address
  const agentDetails = await fetch(`/api/agents/${agentAddress}`)
  const agent = await agentDetails.json()

  expect(agent.address).toBe(agentAddress)

  // 3. Get pricing
  const pricing = await fetch(`/api/agents/${agentAddress}/pricing`)
  const priceData = await pricing.json()

  expect(priceData.x402_enabled).toBe(true)
  expect(priceData.estimated_costs).toBeDefined()
})
```

---

## References

- **GhostSpeak Protocol**: https://docs.ghostspeak.ai
- **x402 Specification**: https://www.x402.org
- **Solana getProgramAccounts**: https://solana.com/docs/rpc/http/getprogramaccounts
- **GraphQL Best Practices**: https://graphql.org/learn/best-practices

---

## Appendix: Example Client Usage

### TypeScript SDK

```typescript
import { createAgentDiscoveryClient, createSolanaRpc } from '@ghostspeak/sdk'

// Initialize client
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com')
const programId = 'GhostAbc...'
const discoveryClient = createAgentDiscoveryClient(rpc, programId)

// Search for chat agents accepting USDC
const agents = await discoveryClient.searchAgents({
  capability: 'chat',
  x402_enabled: true,
  accepted_tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
  min_reputation: 7500,
  sort_by: 'reputation',
  sort_order: 'desc',
  limit: 10
})

console.log(`Found ${agents.length} agents`)

// Get agent details
const agent = agents[0]
console.log(`Agent: ${agent.name}`)
console.log(`Price: ${agent.x402_price_per_call} per call`)
console.log(`Endpoint: ${agent.x402_service_endpoint}`)

// Get pricing information
const pricing = await discoveryClient.getAgentPricing(agent.address)
console.log(`Estimated cost for 1000 calls: $${pricing.estimated_costs.per_1000_calls_usd}`)
```

### REST API

```bash
# Search for agents
curl "https://api.ghostspeak.ai/api/agents?capability=chat&x402_enabled=true&limit=10"

# Get agent details
curl "https://api.ghostspeak.ai/api/agents/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS"

# Get agent pricing
curl "https://api.ghostspeak.ai/api/agents/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS/pricing"
```
