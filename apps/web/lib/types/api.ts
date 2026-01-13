/**
 * API Response Type Definitions
 *
 * Centralized type definitions for all API endpoints to ensure type safety
 * and consistency across the application.
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  timestamp: number
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number
  total?: number
  page?: number
  limit?: number
  hasMore?: boolean
}

/**
 * Discovery API Types
 */
export interface DiscoveredAgent {
  ghostAddress: string
  status: 'discovered' | 'claimed' | 'verified'
  discoverySource: string
  firstSeenTimestamp: number
  slot?: number
  blockTime?: number
  facilitatorAddress?: string
  claimedBy?: string
  claimedAt?: number
  metadataFileId?: string
  ipfsCid?: string
  ipfsUri?: string
}

export interface DiscoveryStats {
  totalDiscovered: number
  totalClaimed: number
  totalVerified: number
  recentDiscoveries: number
  lastUpdated: number
}

export interface DiscoveryListResponse extends ApiResponse {
  agents: DiscoveredAgent[]
  stats: DiscoveryStats
  count: number
}

export interface DiscoveryAgentResponse extends ApiResponse {
  agent: DiscoveredAgent
}

/**
 * Agent API Types
 */
export interface Agent {
  address: string
  owner?: string
  name?: string
  metadata?: AgentMetadata
  ghostScore?: number
  reputation?: ReputationData
  createdAt: number
  updatedAt: number
}

export interface AgentMetadata {
  name?: string
  description?: string
  avatar?: string
  website?: string
  twitter?: string
  github?: string
  tags?: string[]
}

export interface ReputationData {
  score: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  transactionCount: number
  totalVolume: number
  successRate: number
  averageResponseTime?: number
  disputeCount: number
  lastUpdated: number
}

export interface AgentResponse extends ApiResponse {
  agent: Agent
}

export interface AgentListResponse extends PaginatedResponse<Agent> {
  agents: Agent[]
}

export interface AgentRegisterRequest {
  agentAddress: string
  ownerAddress: string
  signature: string
  metadata?: AgentMetadata
}

export interface AgentRegisterResponse extends ApiResponse {
  agent: Agent
  transactionSignature?: string
}

/**
 * Analytics API Types
 */
export interface AnalyticsData {
  totalAgents: number
  totalTransactions: number
  totalVolume: number
  averageGhostScore: number
  topAgents: Array<{
    address: string
    name?: string
    score: number
  }>
  recentActivity: Array<{
    timestamp: number
    type: string
    address: string
    details?: Record<string, any>
  }>
}

export interface AnalyticsResponse extends ApiResponse {
  analytics: AnalyticsData
  period: {
    start: number
    end: number
  }
}

/**
 * Credentials API Types
 */
export interface VerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  expirationDate?: string
  credentialSubject: Record<string, any>
  proof: {
    type: string
    created: string
    proofPurpose: string
    verificationMethod: string
    proofValue: string
  }
}

export interface CredentialResponse extends ApiResponse {
  credential: VerifiableCredential
}

export interface CredentialListResponse extends PaginatedResponse<VerifiableCredential> {
  credentials: VerifiableCredential[]
}

/**
 * x402 Payment API Types
 */
export interface X402Transaction {
  signature: string
  amount: number
  currency: string
  from: string
  to: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  blockTime?: number
  slot?: number
}

export interface X402TransactionResponse extends ApiResponse {
  transaction: X402Transaction
}

/**
 * Error Response Types
 */
export interface ApiError {
  error: string
  code?: string
  details?: Record<string, any>
  timestamp: number
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down'
  timestamp: number
  version?: string
  uptime?: number
  services?: Record<string, 'up' | 'down'>
}

/**
 * Platform Stats Response
 */
export interface PlatformStatsResponse {
  platform: {
    name: string
    version: string
    network: string
    programId: string
  }
  discovery: {
    totalAgents: number
    discovered: number
    claimed: number
    verified: number
  }
  network: {
    rpcEndpoint: string
    websocketEndpoint: string
  }
  features: {
    agentDiscovery: boolean
    ghostScore: boolean
    x402Payments: boolean
    staking: boolean
    reputation: boolean
    escrow: boolean
    verifiableCredentials: boolean
  }
  timestamp: number
}
