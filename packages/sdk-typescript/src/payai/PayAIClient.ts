/**
 * PayAI x402 Client
 *
 * Client for making x402 payments through the PayAI facilitator.
 * Wraps the standard fetch API with automatic payment handling.
 *
 * @module payai/PayAIClient
 * @see https://docs.payai.network/x402/introduction
 */

import { EventEmitter } from 'node:events'
import type {
  PayAIClientConfig,
  PayAIPaymentRequirement,
  PayAIPaymentResponse,
  PayAIReputationRecord,
  PayAINetwork
} from './PayAITypes.js'
import type { Address } from '@solana/addresses'

// =====================================================
// CONSTANTS
// =====================================================

/** Default PayAI facilitator URL */
const DEFAULT_FACILITATOR_URL = 'https://facilitator.payai.network'

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000

/** Default retry configuration */
const DEFAULT_RETRY = { attempts: 3, delayMs: 1000 }

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if a response requires payment
 */
export function isPaymentRequired(response: Response): boolean {
  return response.status === 402
}

/**
 * Extract payment requirements from a 402 response
 */
export async function extractPaymentRequirements(
  response: Response
): Promise<PayAIPaymentRequirement[]> {
  // Try to parse from response body
  const body = await response.text()

  try {
    const parsed = JSON.parse(body)

    // Handle x402 v1 format
    if (parsed.accepts && Array.isArray(parsed.accepts)) {
      return parsed.accepts as PayAIPaymentRequirement[]
    }

    // Handle legacy format
    if (parsed.paymentRequirements && Array.isArray(parsed.paymentRequirements)) {
      return parsed.paymentRequirements as PayAIPaymentRequirement[]
    }

    // Handle single requirement
    if (parsed.scheme && parsed.payTo) {
      return [parsed as PayAIPaymentRequirement]
    }
  } catch {
    // Not JSON, try to parse from headers
  }

  // Try to extract from headers
  const paymentHeader = response.headers.get('x-payment-required')
  if (paymentHeader) {
    try {
      return JSON.parse(paymentHeader) as PayAIPaymentRequirement[]
    } catch {
      // Invalid header format
    }
  }

  return []
}

// =====================================================
// CLIENT EVENTS
// =====================================================

// Client events interface (used for type documentation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _PayAIClientEvents {
  'payment:required': (requirements: PayAIPaymentRequirement[]) => void
  'payment:started': (requirement: PayAIPaymentRequirement) => void
  'payment:completed': (response: PayAIPaymentResponse) => void
  'payment:failed': (error: Error) => void
  'request:started': (url: string) => void
  'request:completed': (url: string, success: boolean, durationMs: number) => void
}

// =====================================================
// PAYAI CLIENT CLASS
// =====================================================

/**
 * PayAI x402 Client
 *
 * Makes HTTP requests with automatic x402 payment handling
 * using PayAI as the facilitator.
 *
 * @example
 * ```typescript
 * const client = new PayAIClient({
 *   rpcUrl: 'https://api.mainnet-beta.solana.com',
 *   wallet: {
 *     publicKey: wallet.publicKey.toString(),
 *     signTransaction: (tx) => wallet.signTransaction(tx)
 *   }
 * });
 *
 * // Make a paid request
 * const response = await client.fetch('https://api.example.com/ai/generate', {
 *   method: 'POST',
 *   body: JSON.stringify({ prompt: 'Hello' })
 * });
 * ```
 */
// Internal config type that makes some fields optional
interface PayAIClientInternalConfig {
  facilitatorUrl: string
  rpcUrl: string
  wallet?: {
    publicKey: string
    signTransaction: (tx: unknown) => Promise<unknown>
  }
  timeout: number
  retry: { attempts: number; delayMs: number }
}

export class PayAIClient extends EventEmitter {
  private readonly config: PayAIClientInternalConfig
  private readonly localRecords: PayAIReputationRecord[] = []

  constructor(config: PayAIClientConfig) {
    super()
    this.config = {
      facilitatorUrl: config.facilitatorUrl ?? DEFAULT_FACILITATOR_URL,
      rpcUrl: config.rpcUrl,
      wallet: config.wallet,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      retry: config.retry ?? DEFAULT_RETRY
    }
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Make a fetch request with automatic x402 payment handling
   *
   * @param url - The resource URL
   * @param init - Fetch options
   * @returns Response from the resource
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    this.emit('request:started', url)
    const startTime = Date.now()

    try {
      // Make initial request
      let response = await this.fetchWithTimeout(url, init)

      // If payment required, handle it
      if (isPaymentRequired(response)) {
        const requirements = await extractPaymentRequirements(response)
        this.emit('payment:required', requirements)

        if (requirements.length === 0) {
          throw new Error('Payment required but no payment options provided')
        }

        // Select best payment option (prefer Solana)
        const requirement = this.selectPaymentOption(requirements)
        if (!requirement) {
          throw new Error('No compatible payment option found')
        }

        // Make payment and retry request
        response = await this.makePaymentAndRetry(url, init ?? {}, requirement)
      }

      const durationMs = Date.now() - startTime
      this.emit('request:completed', url, response.ok, durationMs)

      return response

    } catch (error) {
      const durationMs = Date.now() - startTime
      this.emit('request:completed', url, false, durationMs)

      if (error instanceof Error) {
        this.emit('payment:failed', error)
      }
      throw error
    }
  }

  /**
   * Verify a payment through the PayAI facilitator
   *
   * @param paymentHeader - The payment header/payload
   * @param requirement - The payment requirement
   * @returns Verification result
   */
  async verifyPayment(
    paymentHeader: string,
    requirement: PayAIPaymentRequirement
  ): Promise<{ valid: boolean; payer?: string; error?: string }> {
    const response = await this.fetchWithTimeout(
      `${this.config.facilitatorUrl}/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentHeader,
          paymentRequirements: requirement
        })
      }
    )

    return response.json()
  }

  /**
   * Settle a payment through the PayAI facilitator
   *
   * @param paymentHeader - The payment header/payload
   * @param requirement - The payment requirement
   * @returns Settlement result
   */
  async settlePayment(
    paymentHeader: string,
    requirement: PayAIPaymentRequirement
  ): Promise<{ success: boolean; transaction?: string; error?: string }> {
    const response = await this.fetchWithTimeout(
      `${this.config.facilitatorUrl}/settle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentHeader,
          paymentRequirements: requirement
        })
      }
    )

    return response.json()
  }

  /**
   * List available resources from the PayAI facilitator
   *
   * @param options - Filter options
   * @returns List of available resources
   */
  async listResources(options?: {
    network?: PayAINetwork
    capability?: string
    maxPrice?: number
  }): Promise<{
    resources: Array<{
      url: string
      description?: string
      accepts: PayAIPaymentRequirement[]
      tags?: string[]
    }>
  }> {
    const params = new URLSearchParams()
    if (options?.network) params.set('network', options.network)
    if (options?.capability) params.set('capability', options.capability)
    if (options?.maxPrice) params.set('maxPrice', options.maxPrice.toString())

    const response = await this.fetchWithTimeout(
      `${this.config.facilitatorUrl}/list?${params.toString()}`
    )

    return response.json()
  }

  /**
   * Get locally tracked reputation records
   * (For payments made through this client instance)
   */
  getLocalReputationRecords(): PayAIReputationRecord[] {
    return [...this.localRecords]
  }

  /**
   * Clear local reputation records
   */
  clearLocalReputationRecords(): void {
    this.localRecords.length = 0
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Select the best payment option from requirements
   */
  private selectPaymentOption(
    requirements: PayAIPaymentRequirement[]
  ): PayAIPaymentRequirement | null {
    // Prefer Solana
    const solanaOption = requirements.find(r => r.network === 'solana')
    if (solanaOption) return solanaOption

    // Return first available
    return requirements[0] ?? null
  }

  /**
   * Make payment and retry the original request
   */
  private async makePaymentAndRetry(
    url: string,
    init: RequestInit,
    requirement: PayAIPaymentRequirement
  ): Promise<Response> {
    this.emit('payment:started', requirement)

    // Create payment header
    const paymentHeader = await this.createPaymentHeader(requirement)

    // Verify payment first
    const verification = await this.verifyPayment(paymentHeader, requirement)
    if (!verification.valid) {
      throw new Error(`Payment verification failed: ${verification.error ?? 'Unknown error'}`)
    }

    // Settle payment
    const settlement = await this.settlePayment(paymentHeader, requirement)
    if (!settlement.success) {
      throw new Error(`Payment settlement failed: ${settlement.error ?? 'Unknown error'}`)
    }

    this.emit('payment:completed', {
      success: true,
      transactionSignature: settlement.transaction,
      paymentId: `pay_${Date.now()}`
    })

    // Record to local reputation tracking
    const startTime = Date.now()

    // Retry request with payment header
    const response = await this.fetchWithTimeout(url, {
      ...init,
      headers: {
        ...init.headers as Record<string, string>,
        'X-Payment': paymentHeader,
        'X-Payment-Signature': settlement.transaction ?? ''
      }
    })

    const responseTime = Date.now() - startTime

    // Track for reputation
    if (settlement.transaction) {
      this.localRecords.push({
        agentAddress: requirement.payTo as Address,
        paymentSignature: settlement.transaction,
        amount: BigInt(requirement.maxAmountRequired),
        success: response.ok,
        responseTimeMs: responseTime,
        payerAddress: this.config.wallet?.publicKey ?? 'unknown',
        timestamp: new Date(),
        network: requirement.network
      })
    }

    return response
  }

  /**
   * Create a payment header for a requirement
   * (In production, this would sign a real Solana transaction)
   */
  private async createPaymentHeader(
    requirement: PayAIPaymentRequirement
  ): Promise<string> {
    if (!this.config.wallet) {
      throw new Error('Wallet not configured for payments')
    }

    // Production implementation pending
    // For now, create a mock payment header for development
    const paymentData = {
      version: '1.0',
      scheme: requirement.scheme,
      network: requirement.network,
      payer: this.config.wallet.publicKey,
      payTo: requirement.payTo,
      amount: requirement.maxAmountRequired,
      asset: requirement.asset,
      resource: requirement.resource,
      nonce: Date.now().toString(),
      signature: `mock_sig_${Date.now()}`
    }

    return Buffer.from(JSON.stringify(paymentData)).toString('base64')
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
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
 * Create a new PayAI client
 *
 * @param config - Client configuration
 * @returns Configured PayAI client
 */
export function createPayAIClient(config: PayAIClientConfig): PayAIClient {
  return new PayAIClient(config)
}

// =====================================================
// CONVENIENCE FUNCTION
// =====================================================

/**
 * Make a single x402 payment request through PayAI
 *
 * @param url - Resource URL
 * @param config - Client configuration
 * @param init - Fetch options
 * @returns Response from the resource
 */
export async function payAIFetch(
  url: string,
  config: PayAIClientConfig,
  init?: RequestInit
): Promise<Response> {
  const client = createPayAIClient(config)
  return client.fetch(url, init)
}
