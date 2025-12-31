/**
 * PayAI Agent Sync
 *
 * Utility for syncing GhostSpeak agents with PayAI marketplace.
 * Allows agents registered in GhostSpeak to be discovered via
 * PayAI's facilitator network.
 *
 * @module payai/PayAIAgentSync
 */

import { EventEmitter } from 'node:events'
import type { Address } from '@solana/addresses'
import type { PayAIAgentRegistration, PayAINetwork } from './PayAITypes.js'

// =====================================================
// CONSTANTS
// =====================================================

/** Default PayAI marketplace API URL */
const DEFAULT_MARKETPLACE_URL = 'https://marketplace.payai.network/api'

// =====================================================
// TYPES
// =====================================================

/**
 * Agent sync configuration
 */
export interface PayAIAgentSyncConfig {
  /** PayAI marketplace API URL */
  marketplaceUrl?: string

  /** API key for PayAI marketplace (if required) */
  apiKey?: string

  /** Network to register agents on */
  network?: PayAINetwork

  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Agent sync result
 */
export interface AgentSyncResult {
  success: boolean
  agentId?: string
  marketplaceUrl?: string
  error?: string
}

/**
 * Agent data from GhostSpeak
 */
export interface GhostSpeakAgentData {
  /** Agent's Solana address */
  address: Address

  /** Agent name */
  name: string

  /** Agent description */
  description?: string

  /** Service capabilities/tags */
  capabilities: string[]

  /** x402-enabled service endpoint */
  serviceEndpoint: string

  /** Accepted payment tokens (e.g., USDC, SOL) */
  acceptedTokens: string[]

  /** Pricing in USDC (min, max) */
  pricing?: {
    minPrice: string
    maxPrice: string
    currency: string
  }

  /** Agent logo URL */
  logo?: string

  /** Agent website */
  website?: string

  /** Reputation score (0-10000) */
  reputationScore?: number
}

// =====================================================
// AGENT SYNC CLASS
// =====================================================

/**
 * PayAI Agent Sync Manager
 *
 * Synchronizes GhostSpeak agents with PayAI marketplace for discovery.
 */
export class PayAIAgentSync extends EventEmitter {
  private readonly config: Required<Omit<PayAIAgentSyncConfig, 'apiKey'>> & { apiKey?: string }

  constructor(config: PayAIAgentSyncConfig = {}) {
    super()
    this.config = {
      marketplaceUrl: config.marketplaceUrl ?? DEFAULT_MARKETPLACE_URL,
      apiKey: config.apiKey,
      network: config.network ?? 'solana',
      timeout: config.timeout ?? 30000,
    }
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Register a GhostSpeak agent with PayAI marketplace
   *
   * @param agent - Agent data from GhostSpeak
   * @returns Registration result
   */
  async registerAgent(agent: GhostSpeakAgentData): Promise<AgentSyncResult> {
    try {
      const registration = this.toPayAIRegistration(agent)

      const response = await this.makeRequest('/merchants/register', {
        method: 'POST',
        body: JSON.stringify(registration),
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `Registration failed: ${error}`,
        }
      }

      const data = await response.json() as { agentId: string; url: string }

      this.emit('agent:registered', {
        agentAddress: agent.address,
        agentId: data.agentId,
      })

      return {
        success: true,
        agentId: data.agentId,
        marketplaceUrl: data.url,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Update an agent's registration on PayAI marketplace
   *
   * @param agentId - PayAI agent ID
   * @param agent - Updated agent data
   * @returns Update result
   */
  async updateAgent(agentId: string, agent: Partial<GhostSpeakAgentData>): Promise<AgentSyncResult> {
    try {
      const response = await this.makeRequest(`/merchants/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify(agent),
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `Update failed: ${error}`,
        }
      }

      this.emit('agent:updated', { agentId })

      return {
        success: true,
        agentId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Remove an agent from PayAI marketplace
   *
   * @param agentId - PayAI agent ID
   * @returns Removal result
   */
  async removeAgent(agentId: string): Promise<AgentSyncResult> {
    try {
      const response = await this.makeRequest(`/merchants/${agentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `Removal failed: ${error}`,
        }
      }

      this.emit('agent:removed', { agentId })

      return {
        success: true,
        agentId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Check if an agent is registered on PayAI marketplace
   *
   * @param agentAddress - Agent's Solana address
   * @returns Whether agent is registered
   */
  async isAgentRegistered(agentAddress: Address): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `/merchants/check?address=${agentAddress}&network=${this.config.network}`
      )

      if (!response.ok) {
        return false
      }

      const data = await response.json() as { registered: boolean }
      return data.registered
    } catch {
      return false
    }
  }

  /**
   * Get agent's PayAI marketplace listing
   *
   * @param agentAddress - Agent's Solana address
   * @returns Agent listing or null
   */
  async getAgentListing(agentAddress: Address): Promise<PayAIAgentRegistration | null> {
    try {
      const response = await this.makeRequest(
        `/merchants/by-address?address=${agentAddress}&network=${this.config.network}`
      )

      if (!response.ok) {
        return null
      }

      return response.json() as Promise<PayAIAgentRegistration>
    } catch {
      return null
    }
  }

  /**
   * Sync reputation score to PayAI marketplace
   *
   * Updates the agent's reputation score on PayAI based on
   * GhostSpeak reputation calculations.
   *
   * @param agentId - PayAI agent ID
   * @param reputationScore - New reputation score (0-10000)
   * @returns Update result
   */
  async syncReputationScore(agentId: string, reputationScore: number): Promise<AgentSyncResult> {
    try {
      const response = await this.makeRequest(`/merchants/${agentId}/reputation`, {
        method: 'POST',
        body: JSON.stringify({
          score: reputationScore,
          source: 'ghostspeak',
          timestamp: Date.now(),
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `Reputation sync failed: ${error}`,
        }
      }

      this.emit('reputation:synced', { agentId, reputationScore })

      return {
        success: true,
        agentId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Convert GhostSpeak agent data to PayAI registration format
   */
  private toPayAIRegistration(agent: GhostSpeakAgentData): PayAIAgentRegistration {
    return {
      agentAddress: agent.address,
      serviceEndpoint: agent.serviceEndpoint,
      capabilities: agent.capabilities,
      acceptedTokens: agent.acceptedTokens,
      pricing: agent.pricing,
      metadata: {
        name: agent.name,
        description: agent.description,
        logo: agent.logo,
        website: agent.website,
      },
    }
  }

  /**
   * Make an authenticated request to PayAI marketplace
   */
  private async makeRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Ghostspeak-Integration': '1.0',
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    try {
      const response = await fetch(`${this.config.marketplaceUrl}${path}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers as Record<string, string>,
        },
        signal: controller.signal,
      })

      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a PayAI agent sync manager
 *
 * @param config - Sync configuration
 * @returns Configured sync manager
 */
export function createPayAIAgentSync(config: PayAIAgentSyncConfig = {}): PayAIAgentSync {
  return new PayAIAgentSync(config)
}
