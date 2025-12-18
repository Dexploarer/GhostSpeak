/**
 * x402 Facilitator Registry
 *
 * Manages x402 payment facilitators across multiple blockchain networks.
 * Facilitators are payment processors that handle x402 transaction verification
 * and settlement, enabling cross-chain interoperability.
 *
 * @module x402/FacilitatorRegistry
 */

import type { Address } from '@solana/addresses'

// =====================================================
// ENUMS
// =====================================================

/**
 * Supported blockchain networks for x402 payments
 */
export enum Network {
  SOLANA = 'solana',
  BASE = 'base',
  POLYGON = 'polygon',
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum'
}

/**
 * Facilitator health status
 */
export enum FacilitatorStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

// =====================================================
// INTERFACES
// =====================================================

/**
 * Token configuration for a facilitator
 */
export interface TokenConfig {
  address: string
  symbol: string
  decimals: number
  name?: string
}

/**
 * Facilitator address configuration per network
 */
export interface FacilitatorAddress {
  address: string
  tokens: TokenConfig[]
  syncStartDate?: Date
  enabled?: boolean
}

/**
 * Full facilitator configuration
 */
export interface FacilitatorConfig {
  id: string
  name: string
  description?: string
  logo?: string
  website?: string
  networks: Network[]
  addresses: Partial<Record<Network, FacilitatorAddress[]>>
  discoveryUrl?: string
  settleUrl: string
  verifyUrl: string
  enabled: boolean
  requiresApiKey?: boolean
  apiKeyHeader?: string
}

/**
 * Facilitator health check result
 */
export interface FacilitatorHealthCheck {
  facilitatorId: string
  status: FacilitatorStatus
  latencyMs: number
  lastChecked: Date
  errorMessage?: string
  networks: Array<{
    network: Network
    status: FacilitatorStatus
    latencyMs: number
  }>
}

/**
 * Facilitator selection criteria
 */
export interface FacilitatorSelectionCriteria {
  network?: Network
  token?: string
  preferredFacilitators?: string[]
  excludeFacilitators?: string[]
  maxLatencyMs?: number
  requireDiscovery?: boolean
}

// =====================================================
// KNOWN TOKEN CONFIGURATIONS
// =====================================================

/**
 * USDC token configurations per network
 */
export const USDC_TOKENS: Record<Network, TokenConfig> = {
  [Network.SOLANA]: {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  [Network.BASE]: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  [Network.POLYGON]: {
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  [Network.ETHEREUM]: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  [Network.ARBITRUM]: {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  }
}

/**
 * PYUSD token configurations per network
 */
export const PYUSD_TOKENS: Partial<Record<Network, TokenConfig>> = {
  [Network.SOLANA]: {
    address: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    symbol: 'PYUSD',
    decimals: 6,
    name: 'PayPal USD'
  },
  [Network.ETHEREUM]: {
    address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
    symbol: 'PYUSD',
    decimals: 6,
    name: 'PayPal USD'
  }
}

// =====================================================
// KNOWN FACILITATORS
// =====================================================

/**
 * Known x402 facilitators in the ecosystem
 */
export const KNOWN_FACILITATORS: FacilitatorConfig[] = [
  {
    id: 'coinbase',
    name: 'Coinbase',
    description: 'Coinbase Developer Platform x402 facilitator',
    logo: 'https://www.coinbase.com/favicon.ico',
    website: 'https://www.coinbase.com/developer-platform',
    networks: [Network.BASE, Network.SOLANA, Network.POLYGON],
    addresses: {
      [Network.BASE]: [
        {
          address: '0x2371c28c0C731Da2D0c90c7CB296d6b0d4C56649',
          tokens: [USDC_TOKENS[Network.BASE]],
          syncStartDate: new Date('2024-01-01'),
          enabled: true
        }
      ],
      [Network.SOLANA]: [
        {
          address: '5ZQVthWZfTKn8beFcXjKv3FD3kqc1Ae2q5HGKGZmMFLQ',
          tokens: [USDC_TOKENS[Network.SOLANA]],
          syncStartDate: new Date('2024-06-01'),
          enabled: true
        }
      ]
    },
    discoveryUrl: 'https://api.x402.org/discover',
    settleUrl: 'https://api.x402.org/settle',
    verifyUrl: 'https://api.x402.org/verify',
    enabled: true,
    requiresApiKey: true,
    apiKeyHeader: 'X-API-Key'
  },
  {
    id: 'thirdweb',
    name: 'ThirdWeb',
    description: 'ThirdWeb x402 payment facilitator',
    logo: 'https://thirdweb.com/favicon.ico',
    website: 'https://thirdweb.com',
    networks: [Network.BASE, Network.POLYGON, Network.ARBITRUM],
    addresses: {
      [Network.BASE]: [
        {
          address: '0x8943545177806ED17B9F23F0a21ee5948eCaa776',
          tokens: [USDC_TOKENS[Network.BASE]],
          syncStartDate: new Date('2024-03-01'),
          enabled: true
        }
      ]
    },
    settleUrl: 'https://pay.thirdweb.com/x402/settle',
    verifyUrl: 'https://pay.thirdweb.com/x402/verify',
    enabled: true,
    requiresApiKey: true,
    apiKeyHeader: 'X-ThirdWeb-Secret-Key'
  },
  {
    id: 'aurracloud',
    name: 'AurraCloud',
    description: 'AurraCloud AI agent payment facilitator',
    logo: 'https://aurra.cloud/favicon.ico',
    website: 'https://aurra.cloud',
    networks: [Network.BASE, Network.SOLANA],
    addresses: {
      [Network.SOLANA]: [
        {
          address: 'AURRAcLKjXZKL36dDqcPnfNsQGxYCvqQjJx6ZPrRNXMx',
          tokens: [USDC_TOKENS[Network.SOLANA]],
          syncStartDate: new Date('2024-06-01'),
          enabled: true
        }
      ]
    },
    discoveryUrl: 'https://api.aurra.cloud/v1/x402/discover',
    settleUrl: 'https://api.aurra.cloud/v1/x402/settle',
    verifyUrl: 'https://api.aurra.cloud/v1/x402/verify',
    enabled: true,
    requiresApiKey: true,
    apiKeyHeader: 'Authorization'
  },
  {
    id: 'payai',
    name: 'PayAI',
    description: 'PayAI micropayment facilitator for AI services',
    logo: 'https://payai.network/favicon.ico',
    website: 'https://payai.network',
    networks: [Network.SOLANA, Network.BASE],
    addresses: {
      [Network.SOLANA]: [
        {
          address: 'PAYAiNETWORKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          tokens: [USDC_TOKENS[Network.SOLANA]],
          syncStartDate: new Date('2024-07-01'),
          enabled: true
        }
      ],
      [Network.BASE]: [
        {
          address: '0xPayAiNetworkBaseAddress',
          tokens: [USDC_TOKENS[Network.BASE]],
          syncStartDate: new Date('2024-07-01'),
          enabled: true
        }
      ]
    },
    discoveryUrl: 'https://api.payai.network/x402/resources',
    settleUrl: 'https://api.payai.network/x402/settle',
    verifyUrl: 'https://api.payai.network/x402/verify',
    enabled: true
  },
  {
    id: 'questflow',
    name: 'Questflow',
    description: 'Questflow AI workflow payment facilitator',
    logo: 'https://questflow.ai/favicon.ico',
    website: 'https://questflow.ai',
    networks: [Network.BASE, Network.POLYGON],
    addresses: {
      [Network.BASE]: [
        {
          address: '0xQuestflowBaseAddress',
          tokens: [USDC_TOKENS[Network.BASE]],
          syncStartDate: new Date('2024-08-01'),
          enabled: true
        }
      ]
    },
    settleUrl: 'https://api.questflow.ai/x402/settle',
    verifyUrl: 'https://api.questflow.ai/x402/verify',
    enabled: true,
    requiresApiKey: true,
    apiKeyHeader: 'X-Questflow-API-Key'
  },
  {
    id: 'x402scan-auto',
    name: 'x402scan Auto',
    description: 'x402scan load-balancing proxy facilitator',
    logo: 'https://x402scan.com/favicon.ico',
    website: 'https://x402scan.com',
    networks: [Network.BASE, Network.SOLANA, Network.POLYGON],
    addresses: {},
    discoveryUrl: 'https://facilitators.x402scan.com/discover',
    settleUrl: 'https://facilitators.x402scan.com/settle',
    verifyUrl: 'https://facilitators.x402scan.com/verify',
    enabled: true
  },
  {
    id: 'ghostspeak',
    name: 'GhostSpeak',
    description: 'GhostSpeak native Solana x402 facilitator with escrow support',
    logo: 'https://ghostspeak.ai/favicon.ico',
    website: 'https://ghostspeak.ai',
    networks: [Network.SOLANA],
    addresses: {
      [Network.SOLANA]: [
        {
          address: 'GHOSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          tokens: [USDC_TOKENS[Network.SOLANA], PYUSD_TOKENS[Network.SOLANA]!],
          syncStartDate: new Date('2024-01-01'),
          enabled: true
        }
      ]
    },
    discoveryUrl: 'https://api.ghostspeak.ai/x402/discover',
    settleUrl: 'https://api.ghostspeak.ai/x402/settle',
    verifyUrl: 'https://api.ghostspeak.ai/x402/verify',
    enabled: true
  }
]

// =====================================================
// FACILITATOR REGISTRY CLASS
// =====================================================

/**
 * Registry for managing x402 payment facilitators
 */
export class FacilitatorRegistry {
  private facilitators: Map<string, FacilitatorConfig> = new Map()
  private healthCache: Map<string, FacilitatorHealthCheck> = new Map()
  private readonly healthCacheTTL: number

  constructor(options?: { healthCacheTTLMs?: number }) {
    this.healthCacheTTL = options?.healthCacheTTLMs ?? 60_000 // 1 minute default

    // Initialize with known facilitators
    for (const facilitator of KNOWN_FACILITATORS) {
      this.facilitators.set(facilitator.id, facilitator)
    }
  }

  /**
   * Get all registered facilitators
   */
  getAll(): FacilitatorConfig[] {
    return Array.from(this.facilitators.values())
  }

  /**
   * Get enabled facilitators only
   */
  getEnabled(): FacilitatorConfig[] {
    return this.getAll().filter(f => f.enabled)
  }

  /**
   * Get a facilitator by ID
   */
  get(id: string): FacilitatorConfig | undefined {
    return this.facilitators.get(id)
  }

  /**
   * Register a new facilitator
   */
  register(config: FacilitatorConfig): void {
    this.facilitators.set(config.id, config)
  }

  /**
   * Update an existing facilitator
   */
  update(id: string, updates: Partial<FacilitatorConfig>): boolean {
    const existing = this.facilitators.get(id)
    if (!existing) return false

    this.facilitators.set(id, { ...existing, ...updates })
    return true
  }

  /**
   * Remove a facilitator
   */
  remove(id: string): boolean {
    return this.facilitators.delete(id)
  }

  /**
   * Enable or disable a facilitator
   */
  setEnabled(id: string, enabled: boolean): boolean {
    return this.update(id, { enabled })
  }

  /**
   * Get facilitators by network
   */
  getByNetwork(network: Network): FacilitatorConfig[] {
    return this.getEnabled().filter(f => f.networks.includes(network))
  }

  /**
   * Get facilitators that support a specific token on a network
   */
  getByToken(network: Network, tokenAddress: string): FacilitatorConfig[] {
    return this.getByNetwork(network).filter(f => {
      const addresses = f.addresses[network]
      if (!addresses) return false

      return addresses.some(
        addr =>
          addr.enabled !== false &&
          addr.tokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase())
      )
    })
  }

  /**
   * Get facilitators that support discovery
   */
  getWithDiscovery(): FacilitatorConfig[] {
    return this.getEnabled().filter(f => f.discoveryUrl != null)
  }

  /**
   * Select the best facilitator based on criteria
   */
  async selectBest(criteria: FacilitatorSelectionCriteria): Promise<FacilitatorConfig | null> {
    let candidates = this.getEnabled()

    // Filter by network
    if (criteria.network) {
      candidates = candidates.filter(f => f.networks.includes(criteria.network!))
    }

    // Filter by token
    if (criteria.network && criteria.token) {
      candidates = candidates.filter(f => {
        const addresses = f.addresses[criteria.network!]
        if (!addresses) return false
        return addresses.some(addr =>
          addr.tokens.some(t => t.address.toLowerCase() === criteria.token!.toLowerCase())
        )
      })
    }

    // Filter by discovery requirement
    if (criteria.requireDiscovery) {
      candidates = candidates.filter(f => f.discoveryUrl != null)
    }

    // Apply preferred/excluded filters
    if (criteria.preferredFacilitators?.length) {
      const preferred = candidates.filter(f => criteria.preferredFacilitators!.includes(f.id))
      if (preferred.length > 0) {
        candidates = preferred
      }
    }

    if (criteria.excludeFacilitators?.length) {
      candidates = candidates.filter(f => !criteria.excludeFacilitators!.includes(f.id))
    }

    if (candidates.length === 0) return null

    // Sort by health/latency if available
    const withHealth = await Promise.all(
      candidates.map(async f => ({
        facilitator: f,
        health: await this.getCachedHealth(f.id)
      }))
    )

    // Filter by max latency if specified
    let sorted = withHealth
    if (criteria.maxLatencyMs != null) {
      sorted = sorted.filter(
        ({ health }) => health == null || health.latencyMs <= criteria.maxLatencyMs!
      )
    }

    // Sort by status (healthy first) then latency
    sorted.sort((a, b) => {
      if (a.health && b.health) {
        // Healthy facilitators first
        if (a.health.status === FacilitatorStatus.HEALTHY && b.health.status !== FacilitatorStatus.HEALTHY) return -1
        if (b.health.status === FacilitatorStatus.HEALTHY && a.health.status !== FacilitatorStatus.HEALTHY) return 1
        // Then by latency
        return a.health.latencyMs - b.health.latencyMs
      }
      // Prefer facilitators with health info
      if (a.health && !b.health) return -1
      if (!a.health && b.health) return 1
      return 0
    })

    return sorted[0]?.facilitator ?? null
  }

  /**
   * Get cached health check for a facilitator
   */
  private async getCachedHealth(id: string): Promise<FacilitatorHealthCheck | null> {
    const cached = this.healthCache.get(id)
    if (cached && Date.now() - cached.lastChecked.getTime() < this.healthCacheTTL) {
      return cached
    }
    return null
  }

  /**
   * Update health cache for a facilitator
   */
  updateHealthCache(health: FacilitatorHealthCheck): void {
    this.healthCache.set(health.facilitatorId, health)
  }

  /**
   * Get facilitator addresses for a network
   */
  getAddresses(facilitatorId: string, network: Network): FacilitatorAddress[] {
    const facilitator = this.get(facilitatorId)
    if (!facilitator) return []
    return facilitator.addresses[network] ?? []
  }

  /**
   * Check if a facilitator supports a network
   */
  supportsNetwork(facilitatorId: string, network: Network): boolean {
    const facilitator = this.get(facilitatorId)
    return facilitator?.networks.includes(network) ?? false
  }

  /**
   * Get token config for a facilitator on a network
   */
  getTokenConfig(
    facilitatorId: string,
    network: Network,
    tokenSymbol: string
  ): TokenConfig | null {
    const addresses = this.getAddresses(facilitatorId, network)
    for (const addr of addresses) {
      const token = addr.tokens.find(
        t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
      )
      if (token) return token
    }
    return null
  }

  /**
   * Export registry configuration for persistence
   */
  export(): FacilitatorConfig[] {
    return this.getAll()
  }

  /**
   * Import facilitator configurations
   */
  import(configs: FacilitatorConfig[]): void {
    for (const config of configs) {
      this.register(config)
    }
  }

  /**
   * Clear all facilitators and reload defaults
   */
  reset(): void {
    this.facilitators.clear()
    this.healthCache.clear()
    for (const facilitator of KNOWN_FACILITATORS) {
      this.facilitators.set(facilitator.id, facilitator)
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new facilitator registry instance
 */
export function createFacilitatorRegistry(options?: {
  healthCacheTTLMs?: number
}): FacilitatorRegistry {
  return new FacilitatorRegistry(options)
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get USDC token config for a network
 */
export function getUsdcToken(network: Network): TokenConfig {
  return USDC_TOKENS[network]
}

/**
 * Get PYUSD token config for a network (if available)
 */
export function getPyusdToken(network: Network): TokenConfig | null {
  return PYUSD_TOKENS[network] ?? null
}

/**
 * Check if a network is supported
 */
export function isNetworkSupported(network: string): network is Network {
  return Object.values(Network).includes(network as Network)
}

/**
 * Parse network from string
 */
export function parseNetwork(value: string): Network | null {
  const normalized = value.toLowerCase()
  if (isNetworkSupported(normalized)) {
    return normalized as Network
  }
  return null
}
