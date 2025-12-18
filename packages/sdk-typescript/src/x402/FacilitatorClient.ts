/**
 * x402 Facilitator Client
 *
 * Client for interacting with x402 payment facilitators.
 * Handles payment verification, settlement, and resource discovery.
 *
 * @module x402/FacilitatorClient
 */

import { EventEmitter } from 'node:events'
import type {
  FacilitatorConfig,
  FacilitatorHealthCheck,
  FacilitatorRegistry,
  FacilitatorStatus,
  Network,
  TokenConfig
} from './FacilitatorRegistry.js'
import { FacilitatorStatus as Status } from './FacilitatorRegistry.js'

// =====================================================
// TYPES
// =====================================================

/**
 * x402 payment requirement from a resource
 */
export interface PaymentRequirement {
  scheme: string
  network: Network
  maxAmountRequired: string
  resource: string
  description?: string
  mimeType?: string
  payTo: string
  maxTimeoutSeconds?: number
  asset: string
  extra?: Record<string, unknown>
}

/**
 * Payment header structure for x402
 */
export interface PaymentHeader {
  version: string
  scheme: string
  network: string
  payload: string
  signature?: string
}

/**
 * Payment verification request
 */
export interface VerifyPaymentRequest {
  paymentHeader: string
  paymentRequirements: PaymentRequirement
}

/**
 * Payment verification response
 */
export interface VerifyPaymentResponse {
  valid: boolean
  invalidReason?: string
  payer?: string
  amount?: string
  transaction?: string
}

/**
 * Payment settlement request
 */
export interface SettlePaymentRequest {
  paymentHeader: string
  paymentRequirements: PaymentRequirement
}

/**
 * Payment settlement response
 */
export interface SettlePaymentResponse {
  success: boolean
  transaction?: string
  errorMessage?: string
  settledAt?: string
}

/**
 * Discovered resource from facilitator
 */
export interface DiscoveredResource {
  url: string
  description?: string
  accepts: PaymentRequirement[]
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  tags?: string[]
  facilitatorId: string
  discoveredAt: Date
}

/**
 * Resource discovery response
 */
export interface DiscoveryResponse {
  resources: DiscoveredResource[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Resource discovery options
 */
export interface DiscoveryOptions {
  network?: Network
  token?: string
  capability?: string
  minPrice?: bigint
  maxPrice?: bigint
  page?: number
  pageSize?: number
  query?: string
}

/**
 * Facilitator client options
 */
export interface FacilitatorClientOptions {
  registry: FacilitatorRegistry
  apiKeys?: Record<string, string>
  timeout?: number
  retryAttempts?: number
  retryDelayMs?: number
  userAgent?: string
}

/**
 * Facilitator client events
 */
export interface FacilitatorClientEvents {
  'health:checked': (health: FacilitatorHealthCheck) => void
  'payment:verified': (facilitatorId: string, result: VerifyPaymentResponse) => void
  'payment:settled': (facilitatorId: string, result: SettlePaymentResponse) => void
  'discovery:complete': (facilitatorId: string, count: number) => void
  'error': (error: Error, facilitatorId?: string) => void
}

// =====================================================
// FACILITATOR CLIENT CLASS
// =====================================================

/**
 * Client for interacting with x402 payment facilitators
 */
export class FacilitatorClient extends EventEmitter {
  private readonly registry: FacilitatorRegistry
  private readonly apiKeys: Record<string, string>
  private readonly timeout: number
  private readonly retryAttempts: number
  private readonly retryDelayMs: number
  private readonly userAgent: string

  constructor(options: FacilitatorClientOptions) {
    super()
    this.registry = options.registry
    this.apiKeys = options.apiKeys ?? {}
    this.timeout = options.timeout ?? 30_000
    this.retryAttempts = options.retryAttempts ?? 3
    this.retryDelayMs = options.retryDelayMs ?? 1000
    this.userAgent = options.userAgent ?? 'GhostSpeak-x402-Client/1.0'
  }

  // =====================================================
  // PAYMENT VERIFICATION
  // =====================================================

  /**
   * Verify a payment through a facilitator
   */
  async verifyPayment(
    facilitatorId: string,
    request: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> {
    const facilitator = this.getFacilitatorOrThrow(facilitatorId)

    const response = await this.fetchWithRetry(facilitator.verifyUrl, {
      method: 'POST',
      headers: this.buildHeaders(facilitator),
      body: JSON.stringify({
        paymentHeader: request.paymentHeader,
        paymentRequirements: request.paymentRequirements
      })
    })

    const result = (await response.json()) as VerifyPaymentResponse

    this.emit('payment:verified', facilitatorId, result)
    return result
  }

  /**
   * Verify payment through the best available facilitator
   */
  async verifyPaymentAuto(
    request: VerifyPaymentRequest,
    network?: Network
  ): Promise<{ facilitatorId: string; result: VerifyPaymentResponse }> {
    const facilitator = await this.registry.selectBest({
      network,
      maxLatencyMs: 5000
    })

    if (!facilitator) {
      throw new Error('No healthy facilitator available for payment verification')
    }

    const result = await this.verifyPayment(facilitator.id, request)
    return { facilitatorId: facilitator.id, result }
  }

  // =====================================================
  // PAYMENT SETTLEMENT
  // =====================================================

  /**
   * Settle a payment through a facilitator
   */
  async settlePayment(
    facilitatorId: string,
    request: SettlePaymentRequest
  ): Promise<SettlePaymentResponse> {
    const facilitator = this.getFacilitatorOrThrow(facilitatorId)

    const response = await this.fetchWithRetry(facilitator.settleUrl, {
      method: 'POST',
      headers: this.buildHeaders(facilitator),
      body: JSON.stringify({
        paymentHeader: request.paymentHeader,
        paymentRequirements: request.paymentRequirements
      })
    })

    const result = (await response.json()) as SettlePaymentResponse

    this.emit('payment:settled', facilitatorId, result)
    return result
  }

  /**
   * Settle payment through the best available facilitator
   */
  async settlePaymentAuto(
    request: SettlePaymentRequest,
    network?: Network
  ): Promise<{ facilitatorId: string; result: SettlePaymentResponse }> {
    const facilitator = await this.registry.selectBest({
      network,
      maxLatencyMs: 5000
    })

    if (!facilitator) {
      throw new Error('No healthy facilitator available for payment settlement')
    }

    const result = await this.settlePayment(facilitator.id, request)
    return { facilitatorId: facilitator.id, result }
  }

  // =====================================================
  // RESOURCE DISCOVERY
  // =====================================================

  /**
   * Discover resources from a specific facilitator
   */
  async discoverResources(
    facilitatorId: string,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResponse> {
    const facilitator = this.getFacilitatorOrThrow(facilitatorId)

    if (!facilitator.discoveryUrl) {
      throw new Error(`Facilitator ${facilitatorId} does not support resource discovery`)
    }

    const url = new URL(facilitator.discoveryUrl)

    // Add query parameters
    if (options?.network) url.searchParams.set('network', options.network)
    if (options?.token) url.searchParams.set('token', options.token)
    if (options?.capability) url.searchParams.set('capability', options.capability)
    if (options?.minPrice != null) url.searchParams.set('minPrice', options.minPrice.toString())
    if (options?.maxPrice != null) url.searchParams.set('maxPrice', options.maxPrice.toString())
    if (options?.page != null) url.searchParams.set('page', options.page.toString())
    if (options?.pageSize != null) url.searchParams.set('pageSize', options.pageSize.toString())
    if (options?.query) url.searchParams.set('q', options.query)

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(facilitator)
    })

    const data = (await response.json()) as {
      resources?: Array<{
        url: string
        description?: string
        accepts?: PaymentRequirement[]
        inputSchema?: Record<string, unknown>
        outputSchema?: Record<string, unknown>
        tags?: string[]
      }>
      total?: number
      page?: number
      pageSize?: number
      hasMore?: boolean
    }

    const resources: DiscoveredResource[] = (data.resources ?? []).map(r => ({
      url: r.url,
      description: r.description,
      accepts: r.accepts ?? [],
      inputSchema: r.inputSchema,
      outputSchema: r.outputSchema,
      tags: r.tags,
      facilitatorId,
      discoveredAt: new Date()
    }))

    this.emit('discovery:complete', facilitatorId, resources.length)

    return {
      resources,
      total: data.total ?? resources.length,
      page: data.page ?? options?.page ?? 1,
      pageSize: data.pageSize ?? options?.pageSize ?? 20,
      hasMore: data.hasMore ?? false
    }
  }

  /**
   * Discover resources from all facilitators that support discovery
   */
  async discoverResourcesAll(
    options?: DiscoveryOptions
  ): Promise<Map<string, DiscoveredResource[]>> {
    const facilitators = this.registry.getWithDiscovery()
    const results = new Map<string, DiscoveredResource[]>()

    const promises = facilitators.map(async f => {
      try {
        const response = await this.discoverResources(f.id, options)
        results.set(f.id, response.resources)
      } catch (error) {
        this.emit('error', error as Error, f.id)
        results.set(f.id, [])
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  /**
   * Discover and merge resources from all facilitators
   */
  async discoverResourcesMerged(options?: DiscoveryOptions): Promise<DiscoveredResource[]> {
    const byFacilitator = await this.discoverResourcesAll(options)
    const merged: DiscoveredResource[] = []
    const seen = new Set<string>()

    for (const resources of byFacilitator.values()) {
      for (const resource of resources) {
        if (!seen.has(resource.url)) {
          seen.add(resource.url)
          merged.push(resource)
        }
      }
    }

    return merged
  }

  // =====================================================
  // HEALTH CHECKS
  // =====================================================

  /**
   * Check health of a specific facilitator
   */
  async checkHealth(facilitatorId: string): Promise<FacilitatorHealthCheck> {
    const facilitator = this.getFacilitatorOrThrow(facilitatorId)

    const startTime = Date.now()
    let status: FacilitatorStatus = Status.UNKNOWN
    let errorMessage: string | undefined

    try {
      // Try to reach the verify endpoint with a minimal request
      const response = await fetch(facilitator.verifyUrl, {
        method: 'OPTIONS',
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok || response.status === 405) {
        status = Status.HEALTHY
      } else if (response.status >= 500) {
        status = Status.UNHEALTHY
        errorMessage = `Server error: ${response.status}`
      } else {
        status = Status.DEGRADED
        errorMessage = `Unexpected status: ${response.status}`
      }
    } catch (error) {
      status = Status.UNHEALTHY
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }

    const latencyMs = Date.now() - startTime

    const health: FacilitatorHealthCheck = {
      facilitatorId,
      status,
      latencyMs,
      lastChecked: new Date(),
      errorMessage,
      networks: facilitator.networks.map(network => ({
        network,
        status,
        latencyMs
      }))
    }

    this.registry.updateHealthCache(health)
    this.emit('health:checked', health)

    return health
  }

  /**
   * Check health of all enabled facilitators
   */
  async checkHealthAll(): Promise<Map<string, FacilitatorHealthCheck>> {
    const facilitators = this.registry.getEnabled()
    const results = new Map<string, FacilitatorHealthCheck>()

    const promises = facilitators.map(async f => {
      try {
        const health = await this.checkHealth(f.id)
        results.set(f.id, health)
      } catch (error) {
        results.set(f.id, {
          facilitatorId: f.id,
          status: Status.UNHEALTHY,
          latencyMs: -1,
          lastChecked: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          networks: []
        })
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  // =====================================================
  // LOAD BALANCING
  // =====================================================

  /**
   * Select the healthiest facilitator for a given network
   */
  async loadBalance(
    facilitatorIds: string[],
    network?: Network
  ): Promise<FacilitatorConfig | null> {
    // Check health of specified facilitators
    const healthChecks = await Promise.all(
      facilitatorIds.map(async id => {
        try {
          return await this.checkHealth(id)
        } catch {
          return null
        }
      })
    )

    // Filter healthy facilitators
    const healthy = healthChecks
      .filter((h): h is FacilitatorHealthCheck => h !== null && h.status === Status.HEALTHY)
      .sort((a, b) => a.latencyMs - b.latencyMs)

    if (healthy.length === 0) {
      // Fall back to any available facilitator
      for (const id of facilitatorIds) {
        const facilitator = this.registry.get(id)
        if (facilitator?.enabled) {
          if (!network || facilitator.networks.includes(network)) {
            return facilitator
          }
        }
      }
      return null
    }

    // Return the fastest healthy facilitator
    const fastestId = healthy[0].facilitatorId
    return this.registry.get(fastestId) ?? null
  }

  /**
   * Execute a request with automatic failover
   */
  async executeWithFailover<T>(
    facilitatorIds: string[],
    operation: (facilitatorId: string) => Promise<T>
  ): Promise<{ facilitatorId: string; result: T }> {
    const errors: Array<{ facilitatorId: string; error: Error }> = []

    for (const facilitatorId of facilitatorIds) {
      try {
        const result = await operation(facilitatorId)
        return { facilitatorId, result }
      } catch (error) {
        errors.push({ facilitatorId, error: error as Error })
        this.emit('error', error as Error, facilitatorId)
      }
    }

    throw new AggregateError(
      errors.map(e => e.error),
      `All facilitators failed: ${errors.map(e => `${e.facilitatorId}: ${e.error.message}`).join(', ')}`
    )
  }

  // =====================================================
  // API KEY MANAGEMENT
  // =====================================================

  /**
   * Set API key for a facilitator
   */
  setApiKey(facilitatorId: string, apiKey: string): void {
    this.apiKeys[facilitatorId] = apiKey
  }

  /**
   * Remove API key for a facilitator
   */
  removeApiKey(facilitatorId: string): void {
    delete this.apiKeys[facilitatorId]
  }

  /**
   * Check if API key is configured for a facilitator
   */
  hasApiKey(facilitatorId: string): boolean {
    return facilitatorId in this.apiKeys
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  /**
   * Get facilitator or throw error
   */
  private getFacilitatorOrThrow(id: string): FacilitatorConfig {
    const facilitator = this.registry.get(id)
    if (!facilitator) {
      throw new Error(`Facilitator not found: ${id}`)
    }
    if (!facilitator.enabled) {
      throw new Error(`Facilitator is disabled: ${id}`)
    }
    return facilitator
  }

  /**
   * Build headers for a facilitator request
   */
  private buildHeaders(facilitator: FacilitatorConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent
    }

    if (facilitator.requiresApiKey && facilitator.apiKeyHeader) {
      const apiKey = this.apiKeys[facilitator.id]
      if (apiKey) {
        headers[facilitator.apiKeyHeader] = apiKey
      }
    }

    return headers
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(this.timeout)
        })

        if (response.ok) {
          return response
        }

        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          const errorBody = await response.text().catch(() => 'Unknown error')
          throw new Error(`HTTP ${response.status}: ${errorBody}`)
        }

        // Retry server errors (5xx)
        lastError = new Error(`HTTP ${response.status}`)
      } catch (error) {
        lastError = error as Error
      }

      // Wait before retry (with exponential backoff)
      if (attempt < this.retryAttempts - 1) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt))
      }
    }

    throw lastError ?? new Error('Request failed after retries')
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new facilitator client
 */
export function createFacilitatorClient(
  options: FacilitatorClientOptions
): FacilitatorClient {
  return new FacilitatorClient(options)
}
