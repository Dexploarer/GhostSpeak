/**
 * Fetch with x402 Payment
 *
 * Wraps the standard fetch API to automatically handle x402 payment flows.
 * When a 402 response is received, creates and submits payment, then retries.
 *
 * @module x402/fetchWithPayment
 */

import type { TransactionSigner, Address } from '@solana/kit'
import type { X402PaymentRequest, X402PaymentReceipt } from './X402Client.js'
import { parseX402Response, type EnhancedX402Response, type X402PaymentRequirement } from './schemas/enhanced-x402.js'
import type { Network } from './FacilitatorRegistry.js'
import { EventEmitter } from 'node:events'

// =====================================================
// TYPES
// =====================================================

/**
 * Options for fetchWithX402Payment
 */
export interface FetchWithPaymentOptions extends RequestInit {
  /** Maximum amount willing to pay (in smallest unit) */
  maxPayment?: bigint

  /** Preferred network for payment */
  preferredNetwork?: Network

  /** Preferred token address */
  preferredToken?: string

  /** Timeout for the request in ms */
  timeout?: number

  /** Number of retries for payment */
  retries?: number

  /** Callback when payment is made */
  onPayment?: (payment: PaymentInfo) => void

  /** Callback for 402 response before payment */
  onPaymentRequired?: (requirements: X402PaymentRequirement[]) => void

  /** Skip payment and return 402 response */
  dryRun?: boolean
}

/**
 * Payment information from a successful payment
 */
export interface PaymentInfo {
  signature: string
  amount: bigint
  recipient: string
  token: string
  network: Network
  timestamp: number
}

/**
 * Extended response with payment info
 */
export interface X402Response extends Response {
  paymentInfo?: PaymentInfo
  x402Requirements?: X402PaymentRequirement[]
}

/**
 * Payment header creator function type
 */
export type PaymentHeaderCreator = (
  requirement: X402PaymentRequirement,
  wallet: TransactionSigner
) => Promise<string>

/**
 * Fetch with payment client options
 */
export interface FetchWithPaymentClientOptions {
  wallet: TransactionSigner
  createPaymentHeader: PaymentHeaderCreator
  maxPayment?: bigint
  preferredNetwork?: Network
  preferredToken?: string
  timeout?: number
  retries?: number
  userAgent?: string
}

// =====================================================
// FETCH WITH PAYMENT CLASS
// =====================================================

/**
 * Client for making x402-enabled HTTP requests
 */
export class FetchWithPaymentClient extends EventEmitter {
  private readonly wallet: TransactionSigner
  private readonly createPaymentHeader: PaymentHeaderCreator
  private readonly maxPayment: bigint
  private readonly preferredNetwork?: Network
  private readonly preferredToken?: string
  private readonly timeout: number
  private readonly retries: number
  private readonly userAgent: string

  constructor(options: FetchWithPaymentClientOptions) {
    super()
    this.wallet = options.wallet
    this.createPaymentHeader = options.createPaymentHeader
    this.maxPayment = options.maxPayment ?? BigInt('1000000000') // 1000 USDC default
    this.preferredNetwork = options.preferredNetwork
    this.preferredToken = options.preferredToken
    this.timeout = options.timeout ?? 30000
    this.retries = options.retries ?? 1
    this.userAgent = options.userAgent ?? 'GhostSpeak-x402-Fetch/1.0'
  }

  /**
   * Make an x402-enabled fetch request
   */
  async fetch(url: string, options?: FetchWithPaymentOptions): Promise<X402Response> {
    const mergedOptions: FetchWithPaymentOptions = {
      ...options,
      maxPayment: options?.maxPayment ?? this.maxPayment,
      preferredNetwork: options?.preferredNetwork ?? this.preferredNetwork,
      preferredToken: options?.preferredToken ?? this.preferredToken,
      timeout: options?.timeout ?? this.timeout,
      retries: options?.retries ?? this.retries
    }

    return this.fetchWithPayment(url, mergedOptions)
  }

  /**
   * Internal fetch with payment logic
   */
  private async fetchWithPayment(
    url: string,
    options: FetchWithPaymentOptions
  ): Promise<X402Response> {
    const headers = new Headers(options.headers)
    headers.set('User-Agent', this.userAgent)

    // Make initial request
    const initialResponse = await fetch(url, {
      ...options,
      headers,
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined
    })

    // If not 402, return as-is
    if (initialResponse.status !== 402) {
      return initialResponse as X402Response
    }

    // Parse 402 response
    const body = await initialResponse.text()
    const parseResult = parseX402Response(body)

    if (!parseResult.valid) {
      const errorResponse = new Response(body, {
        status: 402,
        statusText: 'Payment Required - Invalid x402 Response',
        headers: initialResponse.headers
      }) as X402Response
      errorResponse.x402Requirements = []
      return errorResponse
    }

    const x402Response = parseResult.response

    // Emit payment required event
    this.emit('paymentRequired', x402Response.accepts)
    options.onPaymentRequired?.(x402Response.accepts)

    // If dry run, return without paying
    if (options.dryRun) {
      const dryRunResponse = new Response(body, {
        status: 402,
        statusText: 'Payment Required',
        headers: initialResponse.headers
      }) as X402Response
      dryRunResponse.x402Requirements = x402Response.accepts
      return dryRunResponse
    }

    // Select payment requirement
    const selectedRequirement = this.selectPaymentRequirement(
      x402Response.accepts,
      options
    )

    if (!selectedRequirement) {
      throw new X402PaymentError(
        'No suitable payment option found within max payment limit',
        x402Response.accepts
      )
    }

    // Check against max payment
    const amount = BigInt(selectedRequirement.maxAmountRequired)
    if (amount > (options.maxPayment ?? this.maxPayment)) {
      throw new X402PaymentError(
        `Payment amount ${amount} exceeds max payment ${options.maxPayment ?? this.maxPayment}`,
        x402Response.accepts
      )
    }

    // Create payment header
    let paymentHeader: string
    try {
      paymentHeader = await this.createPaymentHeader(selectedRequirement, this.wallet)
    } catch (error) {
      throw new X402PaymentError(
        `Failed to create payment header: ${error instanceof Error ? error.message : 'Unknown error'}`,
        x402Response.accepts
      )
    }

    // Retry with payment header
    const retryHeaders = new Headers(headers)
    retryHeaders.set('X-Payment', paymentHeader)

    for (let attempt = 0; attempt <= (options.retries ?? this.retries); attempt++) {
      try {
        const paidResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
          signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined
        })

        // Success! Add payment info
        const paymentInfo: PaymentInfo = {
          signature: paymentHeader.split(':')[0] ?? '',
          amount,
          recipient: selectedRequirement.payTo,
          token: selectedRequirement.asset,
          network: selectedRequirement.network,
          timestamp: Date.now()
        }

        const response = paidResponse as X402Response
        response.paymentInfo = paymentInfo
        response.x402Requirements = x402Response.accepts

        // Emit payment event
        this.emit('payment', paymentInfo)
        options.onPayment?.(paymentInfo)

        return response
      } catch (error) {
        if (attempt === (options.retries ?? this.retries)) {
          throw error
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }

    throw new Error('Failed to complete payment request after retries')
  }

  /**
   * Select the best payment requirement based on options
   */
  private selectPaymentRequirement(
    accepts: X402PaymentRequirement[],
    options: FetchWithPaymentOptions
  ): X402PaymentRequirement | null {
    let candidates = [...accepts]

    // Filter by preferred network
    if (options.preferredNetwork) {
      const networkMatches = candidates.filter(
        a => a.network === options.preferredNetwork
      )
      if (networkMatches.length > 0) {
        candidates = networkMatches
      }
    }

    // Filter by preferred token
    if (options.preferredToken) {
      const tokenMatches = candidates.filter(
        a => a.asset.toLowerCase() === options.preferredToken!.toLowerCase()
      )
      if (tokenMatches.length > 0) {
        candidates = tokenMatches
      }
    }

    // Filter by max payment
    const maxPayment = options.maxPayment ?? this.maxPayment
    candidates = candidates.filter(a => BigInt(a.maxAmountRequired) <= maxPayment)

    if (candidates.length === 0) {
      return null
    }

    // Return the cheapest option
    return candidates.sort(
      (a, b) => Number(BigInt(a.maxAmountRequired) - BigInt(b.maxAmountRequired))
    )[0]
  }
}

// =====================================================
// ERROR CLASS
// =====================================================

/**
 * Error thrown when x402 payment fails
 */
export class X402PaymentError extends Error {
  constructor(
    message: string,
    public readonly requirements: X402PaymentRequirement[]
  ) {
    super(message)
    this.name = 'X402PaymentError'
  }
}

// =====================================================
// STANDALONE FUNCTION
// =====================================================

/**
 * Make an x402-enabled fetch request
 *
 * This function automatically handles 402 Payment Required responses
 * by creating a payment and retrying the request.
 *
 * @example
 * ```typescript
 * const response = await fetchWithX402Payment(
 *   'https://api.example.com/generate',
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ prompt: 'Hello' })
 *   },
 *   wallet,
 *   createPaymentHeader,
 *   { maxPayment: 1000000n } // 1 USDC
 * );
 *
 * const data = await response.json();
 * console.log('Payment:', response.paymentInfo);
 * ```
 */
export async function fetchWithX402Payment(
  url: string,
  options: RequestInit,
  wallet: TransactionSigner,
  createPaymentHeader: PaymentHeaderCreator,
  paymentOptions?: Omit<FetchWithPaymentOptions, keyof RequestInit>
): Promise<X402Response> {
  const client = new FetchWithPaymentClient({
    wallet,
    createPaymentHeader,
    maxPayment: paymentOptions?.maxPayment,
    preferredNetwork: paymentOptions?.preferredNetwork,
    preferredToken: paymentOptions?.preferredToken,
    timeout: paymentOptions?.timeout,
    retries: paymentOptions?.retries
  })

  return client.fetch(url, {
    ...options,
    ...paymentOptions
  })
}

// =====================================================
// WRAPPER FUNCTION
// =====================================================

/**
 * Create a wrapped fetch function with x402 payment support
 *
 * @example
 * ```typescript
 * const x402Fetch = wrapFetchWithPayment(wallet, createPaymentHeader, {
 *   maxPayment: 1000000n
 * });
 *
 * const response = await x402Fetch('https://api.example.com/generate', {
 *   method: 'POST',
 *   body: JSON.stringify({ prompt: 'Hello' })
 * });
 * ```
 */
export function wrapFetchWithPayment(
  wallet: TransactionSigner,
  createPaymentHeader: PaymentHeaderCreator,
  defaultOptions?: Partial<FetchWithPaymentClientOptions>
): (url: string, options?: FetchWithPaymentOptions) => Promise<X402Response> {
  const client = new FetchWithPaymentClient({
    wallet,
    createPaymentHeader,
    ...defaultOptions
  })

  return (url: string, options?: FetchWithPaymentOptions) => client.fetch(url, options)
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a response is a 402 Payment Required
 */
export function isPaymentRequired(response: Response): boolean {
  return response.status === 402
}

/**
 * Extract x402 requirements from a 402 response
 */
export async function extractPaymentRequirements(
  response: Response
): Promise<X402PaymentRequirement[] | null> {
  if (response.status !== 402) {
    return null
  }

  try {
    const body = await response.text()
    const parseResult = parseX402Response(body)

    if (!parseResult.valid) {
      return null
    }

    return parseResult.response.accepts
  } catch {
    return null
  }
}

/**
 * Calculate total cost for a set of requirements
 */
export function calculateTotalCost(requirements: X402PaymentRequirement[]): bigint {
  if (requirements.length === 0) return 0n

  // Return the minimum required payment
  return requirements.reduce(
    (min, req) => {
      const amount = BigInt(req.maxAmountRequired)
      return amount < min ? amount : min
    },
    BigInt(requirements[0].maxAmountRequired)
  )
}
