/**
 * X402 Ecosystem Integration
 *
 * This module provides a unified interface for all x402 ecosystem features,
 * integrating GhostSpeak's native facilitator with external facilitators,
 * resource discovery, AI tool generation, and analytics.
 *
 * @module x402/X402Ecosystem
 */

import type { Rpc, SolanaRpcApi, TransactionSigner, Address } from '@solana/kit'
import { EventEmitter } from 'node:events'

// Core x402
import { X402Client, createX402Client } from './X402Client.js'

// Facilitators
import { FacilitatorRegistry, createFacilitatorRegistry, Network } from './FacilitatorRegistry.js'
import { FacilitatorClient, createFacilitatorClient } from './FacilitatorClient.js'
import { GhostSpeakFacilitator, createGhostSpeakFacilitator } from './GhostSpeakFacilitator.js'

// Resource Management
import { ResourceRegistry, createResourceRegistry, type RegisteredResource } from './ResourceRegistry.js'
import { AIToolGenerator, createAIToolGenerator } from './AIToolGenerator.js'

// Payments
import { FetchWithPaymentClient } from './fetchWithPayment.js'
import { WalletManager, createWalletManager, type FreeTierConfig } from './WalletManager.js'
import { GaslessPaymentManager, createGaslessPaymentManager } from './GaslessPayments.js'

// Compliance & Analytics
import { ComplianceScreeningService, createComplianceScreening } from './ComplianceScreening.js'
import { TimeWindowedMetricsAggregator, createTimeWindowedMetricsAggregator } from './TimeWindowedMetrics.js'
import { X402AnalyticsTracker, createX402AnalyticsTracker } from './analytics.js'

// Types
import type { OpenAITool, AnthropicTool, LangChainTool } from './AIToolGenerator.js'
import type { DiscoveredResource, PaymentRequirement } from './FacilitatorClient.js'
import type { GaslessConfig } from './GaslessPayments.js'
import type { ComplianceConfig } from './ComplianceScreening.js'

// =====================================================
// ECOSYSTEM OPTIONS
// =====================================================

/**
 * Configuration for the x402 ecosystem
 */
export interface X402EcosystemOptions {
  /** Solana RPC connection */
  rpc: Rpc<SolanaRpcApi>

  /** User wallet for signing transactions */
  wallet?: TransactionSigner

  /** GhostSpeak program ID */
  programId: Address

  /** RPC endpoint URL */
  rpcEndpoint: string

  /** Enable gasless payments */
  enableGasless?: boolean

  /** Gasless configuration */
  gaslessConfig?: Partial<GaslessConfig>

  /** Relayer signer for gasless payments */
  relayerSigner?: TransactionSigner

  /** Enable compliance screening */
  enableCompliance?: boolean

  /** Compliance configuration */
  complianceConfig?: Partial<ComplianceConfig>

  /** Free tier configuration for wallet manager */
  freeTierConfig?: FreeTierConfig

  /** API keys for external facilitators */
  facilitatorApiKeys?: Record<string, string>

  /** Enable AI labeling for resources */
  enableAILabeling?: boolean

  /** OpenAI API key for AI labeling */
  openAIApiKey?: string
}

/**
 * Ecosystem statistics
 */
export interface EcosystemStats {
  facilitators: {
    total: number
    healthy: number
    networks: Network[]
  }
  resources: {
    total: number
    active: number
    verified: number
    byCategory: Record<string, number>
    byNetwork: Record<string, number>
  }
  payments: {
    total: number
    volume24h: bigint
    avgLatency: number
  }
}

// =====================================================
// X402 ECOSYSTEM CLASS
// =====================================================

/**
 * Unified x402 Ecosystem Manager
 *
 * Provides a single entry point for all x402 ecosystem functionality:
 * - GhostSpeak native facilitator (escrow, reputation, disputes)
 * - External facilitator integration (Coinbase, ThirdWeb, PayAI)
 * - Resource discovery and registration
 * - AI tool generation (OpenAI, Anthropic, LangChain)
 * - Gasless payments and compliance screening
 * - Time-windowed analytics
 */
export class X402Ecosystem extends EventEmitter {
  // Core components
  readonly x402Client: X402Client
  readonly ghostspeak: GhostSpeakFacilitator

  // Facilitator management
  readonly facilitatorRegistry: FacilitatorRegistry
  readonly facilitatorClient: FacilitatorClient

  // Resource management
  readonly resourceRegistry: ResourceRegistry
  readonly toolGenerator: AIToolGenerator

  // Payments
  readonly walletManager: WalletManager
  readonly gaslessManager?: GaslessPaymentManager
  private fetchClient?: FetchWithPaymentClient

  // Compliance & Analytics
  readonly compliance?: ComplianceScreeningService
  readonly metrics: TimeWindowedMetricsAggregator
  readonly analytics: X402AnalyticsTracker

  // Configuration
  private readonly options: X402EcosystemOptions

  constructor(options: X402EcosystemOptions) {
    super()
    this.options = options

    // Initialize core x402 client
    this.x402Client = createX402Client(options.rpc, options.wallet)

    // Initialize GhostSpeak native facilitator
    this.ghostspeak = createGhostSpeakFacilitator({
      rpc: options.rpc,
      x402Client: this.x402Client,
      programId: options.programId,
      wallet: options.wallet
    })

    // Initialize facilitator registry and client
    this.facilitatorRegistry = createFacilitatorRegistry()
    this.facilitatorClient = createFacilitatorClient({
      registry: this.facilitatorRegistry,
      apiKeys: options.facilitatorApiKeys
    })

    // Initialize resource registry
    this.resourceRegistry = createResourceRegistry({
      enableAILabeling: options.enableAILabeling,
      aiLabelingApiKey: options.openAIApiKey
    })

    // Initialize AI tool generator
    this.toolGenerator = createAIToolGenerator()

    // Initialize wallet manager
    this.walletManager = createWalletManager({
      freeTierConfig: options.freeTierConfig
    })

    // Initialize gasless payments (optional)
    if (options.enableGasless && options.relayerSigner) {
      this.gaslessManager = createGaslessPaymentManager(
        options.rpc,
        options.gaslessConfig,
        options.relayerSigner
      )
    }

    // Initialize compliance screening (optional)
    if (options.enableCompliance) {
      this.compliance = createComplianceScreening(options.complianceConfig)
    }

    // Initialize analytics
    this.metrics = createTimeWindowedMetricsAggregator()
    this.analytics = createX402AnalyticsTracker({ rpcEndpoint: options.rpcEndpoint })

    // Wire up event handlers
    this.setupEventHandlers()
  }

  // =====================================================
  // RESOURCE DISCOVERY
  // =====================================================

  /**
   * Discover resources from all facilitators
   */
  async discoverResources(options?: {
    network?: Network
    capability?: string
    maxPrice?: bigint
  }): Promise<DiscoveredResource[]> {
    return this.facilitatorClient.discoverResourcesMerged(options)
  }

  /**
   * Register discovered resources
   */
  async registerDiscoveredResources(
    resources: DiscoveredResource[]
  ): Promise<Map<string, RegisteredResource | undefined>> {
    const results = await this.resourceRegistry.registerFromDiscovery(resources)
    const registered = new Map<string, RegisteredResource | undefined>()

    for (const [url, result] of results) {
      registered.set(url, result.success ? result.resource : undefined)
    }

    return registered
  }

  /**
   * Search registered resources
   */
  searchResources(query: string, options?: {
    network?: Network
    category?: string
    maxPrice?: bigint
  }) {
    return this.resourceRegistry.search({
      query,
      network: options?.network,
      category: options?.category,
      maxPrice: options?.maxPrice
    })
  }

  // =====================================================
  // AI TOOL GENERATION
  // =====================================================

  /**
   * Generate OpenAI tools from resources
   */
  generateOpenAITools(resources?: RegisteredResource[]): OpenAITool[] {
    const targetResources = resources ?? this.resourceRegistry.getAll()
    return this.toolGenerator.generateOpenAITools(targetResources)
  }

  /**
   * Generate Anthropic tools from resources
   */
  generateAnthropicTools(resources?: RegisteredResource[]): AnthropicTool[] {
    const targetResources = resources ?? this.resourceRegistry.getAll()
    return this.toolGenerator.generateAnthropicTools(targetResources)
  }

  /**
   * Generate LangChain tools from resources
   */
  generateLangChainTools(resources?: RegisteredResource[]): LangChainTool[] {
    const targetResources = resources ?? this.resourceRegistry.getAll()
    return this.toolGenerator.generateLangChainTools(targetResources)
  }

  /**
   * Generate integration code snippet
   */
  generateIntegrationCode(
    resource: RegisteredResource,
    platform: 'openai' | 'anthropic' | 'langchain'
  ): string {
    return this.toolGenerator.generateIntegrationSnippet(resource, platform)
  }

  // =====================================================
  // PAYMENTS
  // =====================================================

  /**
   * Make a payment for an x402 resource
   */
  async pay(
    resourceUrl: string,
    options?: { maxPayment?: bigint; body?: unknown }
  ): Promise<Response> {
    if (!this.options.wallet) {
      throw new Error('Wallet required for payments')
    }

    // Check compliance if enabled
    if (this.compliance) {
      const walletAddress = await this.getWalletAddress()
      const result = await this.compliance.screenAddress(walletAddress)
      if (!result.allowed) {
        throw new Error(`Payment blocked by compliance: ${result.flags.map(f => f.type).join(', ')}`)
      }
    }

    // Use gasless if available and eligible
    if (this.gaslessManager) {
      const userId = await this.getWalletAddress()
      if (await this.gaslessManager.isEligible(userId)) {
        // Use gasless payment flow
        this.emit('payment:gasless', { resourceUrl, userId })
      }
    }

    // Make the request
    const response = await fetch(resourceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: options?.body ? JSON.stringify(options.body) : undefined
    })

    // Handle 402 response
    if (response.status === 402) {
      const body = await response.text()
      const payment = await this.handlePaymentRequired(resourceUrl, body, options?.maxPayment)
      return payment
    }

    return response
  }

  /**
   * Handle 402 payment required response
   */
  private async handlePaymentRequired(
    resourceUrl: string,
    responseBody: string,
    maxPayment?: bigint
  ): Promise<Response> {
    // Parse x402 response
    const parsed = await import('./schemas/enhanced-x402.js').then(m =>
      m.parseX402Response(responseBody)
    )

    if (!parsed.valid) {
      throw new Error(`Invalid x402 response: ${parsed.errors.join(', ')}`)
    }

    // Select best payment option
    const requirement = this.selectPaymentOption(parsed.response.accepts, maxPayment)
    if (!requirement) {
      throw new Error('No suitable payment option found')
    }

    // Create and submit payment
    const paymentHeader = await this.createPaymentHeader(requirement)

    // Retry request with payment
    const retryResponse = await fetch(resourceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': paymentHeader
      }
    })

    // Record metrics
    this.metrics.recordEvent({
      resourceId: resourceUrl,
      timestamp: Date.now(),
      latencyMs: 0, // Would be calculated in real implementation
      statusCode: retryResponse.status,
      success: retryResponse.ok,
      paymentAmount: BigInt(requirement.maxAmountRequired)
    })

    return retryResponse
  }

  /**
   * Select best payment option from requirements
   */
  private selectPaymentOption(
    requirements: PaymentRequirement[],
    maxPayment?: bigint
  ): PaymentRequirement | null {
    // Filter by max payment
    const affordable = maxPayment
      ? requirements.filter(r => BigInt(r.maxAmountRequired) <= maxPayment)
      : requirements

    // Prefer Solana network
    const solana = affordable.find(r => r.network === Network.SOLANA)
    if (solana) return solana

    // Return first available
    return affordable[0] ?? null
  }

  /**
   * Create payment header for a requirement
   */
  private async createPaymentHeader(requirement: PaymentRequirement): Promise<string> {
    if (!this.options.wallet) {
      throw new Error('Wallet required')
    }

    // In production, this would create and sign a Solana transaction
    const mockSignature = `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`

    return JSON.stringify({
      version: '1.0',
      scheme: requirement.scheme,
      network: requirement.network,
      signature: mockSignature,
      amount: requirement.maxAmountRequired,
      payTo: requirement.payTo,
      asset: requirement.asset
    })
  }

  /**
   * Get wallet address
   */
  private async getWalletAddress(): Promise<Address> {
    if (!this.options.wallet) {
      throw new Error('Wallet not configured')
    }
    // In production, would get actual address from wallet
    return 'MockWalletAddress' as Address
  }

  // =====================================================
  // GHOSTSPEAK-SPECIFIC FEATURES
  // =====================================================

  /**
   * Create escrow-backed payment
   */
  async createEscrow(
    agentAddress: Address,
    amount: bigint,
    taskId: string
  ) {
    return this.ghostspeak.createEscrowPayment(agentAddress, amount, taskId)
  }

  /**
   * Release escrow after completion
   */
  async releaseEscrow(escrowId: string, proof?: string) {
    return this.ghostspeak.releaseEscrow(escrowId, proof)
  }

  /**
   * Dispute an escrow
   */
  async disputeEscrow(escrowId: string, reason: string) {
    return this.ghostspeak.disputeEscrow(escrowId, reason)
  }

  /**
   * Submit rating for x402 service
   */
  async submitRating(
    agentAddress: Address,
    signature: string,
    rating: number,
    feedback?: string
  ) {
    return this.ghostspeak.submitRating(agentAddress, signature, rating, feedback)
  }

  /**
   * Get agent reputation
   */
  async getReputation(agentAddress: Address) {
    return this.ghostspeak.getAgentReputation(agentAddress)
  }

  // =====================================================
  // ANALYTICS & STATS
  // =====================================================

  /**
   * Get ecosystem statistics
   */
  async getStats(): Promise<EcosystemStats> {
    const facilitators = this.facilitatorRegistry.getEnabled()
    const healthChecks = await this.facilitatorClient.checkHealthAll()

    const healthyCount = Array.from(healthChecks.values())
      .filter(h => h.status === 'healthy').length

    const networks = new Set<Network>()
    for (const f of facilitators) {
      for (const n of f.networks) {
        networks.add(n)
      }
    }

    const resourceStats = this.resourceRegistry.getStats()
    const globalMetrics = this.metrics.getGlobalMetrics('24h')

    return {
      facilitators: {
        total: facilitators.length,
        healthy: healthyCount,
        networks: Array.from(networks)
      },
      resources: {
        total: resourceStats.totalResources,
        active: resourceStats.activeResources,
        verified: resourceStats.verifiedResources,
        byCategory: resourceStats.byCategory,
        byNetwork: resourceStats.byNetwork
      },
      payments: {
        total: globalMetrics.totalRequests,
        volume24h: globalMetrics.totalVolume,
        avgLatency: globalMetrics.avgLatency
      }
    }
  }

  /**
   * Get metrics for a specific resource
   */
  getResourceMetrics(resourceId: string, window: '1h' | '24h' | '7d' = '24h') {
    return this.metrics.getWindowMetrics(resourceId, window)
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  private setupEventHandlers(): void {
    // Forward GhostSpeak events
    this.ghostspeak.on('escrow:created', data => this.emit('escrow:created', data))
    this.ghostspeak.on('escrow:released', data => this.emit('escrow:released', data))
    this.ghostspeak.on('escrow:disputed', data => this.emit('escrow:disputed', data))
    this.ghostspeak.on('rating:submitted', data => this.emit('rating:submitted', data))

    // Forward resource registry events
    this.resourceRegistry.on('resource:registered', data => this.emit('resource:registered', data))
    this.resourceRegistry.on('resource:pinged', data => this.emit('resource:pinged', data))

    // Forward facilitator events
    this.facilitatorClient.on('payment:verified', (fId, result) =>
      this.emit('payment:verified', { facilitatorId: fId, ...result })
    )
    this.facilitatorClient.on('payment:settled', (fId, result) =>
      this.emit('payment:settled', { facilitatorId: fId, ...result })
    )

    // Forward compliance events
    if (this.compliance) {
      this.compliance.on('payment:blocked', data => this.emit('compliance:blocked', data))
    }

    // Forward gasless events
    if (this.gaslessManager) {
      this.gaslessManager.on('transaction:sponsored', data =>
        this.emit('payment:sponsored', data)
      )
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new x402 ecosystem instance
 */
export function createX402Ecosystem(options: X402EcosystemOptions): X402Ecosystem {
  return new X402Ecosystem(options)
}

// =====================================================
// QUICK START HELPERS
// =====================================================

/**
 * Quick setup for basic x402 usage
 */
export async function setupX402(
  rpcEndpoint: string,
  wallet?: TransactionSigner
): Promise<{
  ecosystem: X402Ecosystem
  discover: () => Promise<DiscoveredResource[]>
  generateTools: () => OpenAITool[]
}> {
  const { createSolanaRpc } = await import('@solana/kit')
  const rpc = createSolanaRpc(rpcEndpoint)

  const ecosystem = createX402Ecosystem({
    rpc,
    wallet,
    programId: 'GHOST1111111111111111111111111111111111111' as Address,
    rpcEndpoint
  })

  return {
    ecosystem,
    discover: () => ecosystem.discoverResources(),
    generateTools: () => ecosystem.generateOpenAITools()
  }
}
