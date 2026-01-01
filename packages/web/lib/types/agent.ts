/**
 * Canonical Agent Type Definitions
 *
 * Single source of truth for Agent-related types used throughout the application.
 * Prevents duplicate type definitions and ensures consistency.
 */

/**
 * UI representation of a GhostSpeak Agent.
 * Normalized from SDK data for consistent rendering across the app.
 */
export interface Agent {
  /** Solana address of the agent account */
  address: string

  /** Human-readable name of the agent */
  name: string

  /** Agent metadata */
  metadata: {
    description?: string
    avatar?: string
    category?: string
  }

  /** Owner's wallet address */
  owner: string

  /** Reputation metrics */
  reputation: {
    score: number
    totalJobs: number
    successRate: number
  }

  /** Pricing in lamports */
  pricing: bigint

  /** List of agent capabilities */
  capabilities: string[]

  /** Whether agent is currently active */
  isActive: boolean

  /** Account creation timestamp */
  createdAt: Date

  /** x402 Payment Protocol integration (optional) */
  x402?: {
    enabled: boolean
    paymentAddress: string
    acceptedTokens: string[]
    pricePerCall: bigint
    serviceEndpoint: string
    totalPayments: bigint
    totalCalls: bigint
    apiSpecUri?: string
  }
}

/**
 * Filter criteria for the agent directory.
 * Used for searching and filtering agents in the UI.
 */
export interface AgentFilters {
  category?: string
  minReputation?: number
  maxPricing?: bigint
  isActive?: boolean
  capabilities?: string[]
  search?: string
}

/**
 * Agent registration parameters.
 * Used when creating a new agent on-chain.
 */
export interface AgentRegistrationParams {
  name: string
  metadataUri: string
  capabilities: string[]
  agentType?: number
  agentId: string
  compressed?: boolean
}

/**
 * Agent update parameters.
 * Used when modifying an existing agent's configuration.
 */
export interface AgentUpdateParams {
  agentAddress: string
  metadataUri?: string
  agentType?: number
  agentId: string
}

/**
 * Agent account data from SDK (raw format).
 * This matches the structure returned by the blockchain.
 */
export interface AgentAccountData {
  totalJobsCompleted?: number
  reputationScore?: number
  owner?: string
  createdAt?: bigint
  totalEarnings?: bigint
  totalStaked?: bigint
  disputeCount?: number
  lastActivity?: bigint
  capabilities?: string[]
  name?: string
  description?: string
  metadataUri?: string
  isActive?: boolean
  originalPrice?: bigint
  frameworkOrigin?: string

  // x402 fields
  x402Enabled?: boolean
  x402PaymentAddress?: string
  x402AcceptedTokens?: string[]
  x402PricePerCall?: bigint
  x402ServiceEndpoint?: string
  x402TotalPayments?: bigint
  x402TotalCalls?: bigint
  apiSpecUri?: string
}
