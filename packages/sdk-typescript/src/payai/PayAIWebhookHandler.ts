/**
 * PayAI Webhook Handler
 *
 * Handles incoming webhooks from PayAI facilitator for payment events.
 * Converts payment data to reputation records for GhostSpeak's
 * reputation system.
 *
 * @module payai/PayAIWebhookHandler
 * @see https://docs.payai.network/x402/introduction
 */

import { EventEmitter } from 'node:events'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Address } from '@solana/addresses'
import type {
  PayAIWebhookPayload,
  PayAIWebhookHandlerOptions,
  PayAIWebhookResult,
  PayAIWebhookVerification,
  PayAIReputationRecord,
  PayAIPaymentData
} from './PayAITypes.js'
import type { AuthorizationModule } from '../modules/authorization/AuthorizationModule.js'

// =====================================================
// CONSTANTS
// =====================================================

/** Default tolerance for webhook timestamp verification (5 minutes) */
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

/** PayAI webhook signature header name */
const SIGNATURE_HEADER = 'x-payai-signature'

/** PayAI webhook timestamp header name */
const TIMESTAMP_HEADER = 'x-payai-timestamp'

// =====================================================
// WEBHOOK HANDLER CLASS
// =====================================================

/**
 * Events emitted by the webhook handler
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _PayAIWebhookHandlerEvents {
  'payment:verified': (data: PayAIPaymentData) => void
  'payment:settled': (data: PayAIPaymentData) => void
  'payment:failed': (data: PayAIPaymentData) => void
  'reputation:recorded': (record: PayAIReputationRecord) => void
  'error': (error: Error) => void
}

/**
 * PayAI Webhook Handler
 *
 * Processes incoming PayAI webhooks and converts payment events
 * to reputation records for the GhostSpeak reputation system.
 *
 * @example
 * ```typescript
 * const handler = new PayAIWebhookHandler({
 *   webhookSecret: process.env.PAYAI_WEBHOOK_SECRET,
 *   onRecordReputation: async (record) => {
 *     await reputationModule.recordPayAIPayment(record);
 *   }
 * });
 *
 * // In your API route
 * const result = await handler.handleWebhook(request);
 * ```
 */
export class PayAIWebhookHandler extends EventEmitter {
  private readonly options: PayAIWebhookHandlerOptions
  private readonly verifySignatures: boolean
  private readonly authorizationModule?: AuthorizationModule
  private readonly payAIFacilitatorAddress?: Address

  constructor(
    options: PayAIWebhookHandlerOptions = {},
    authorizationModule?: AuthorizationModule,
    payAIFacilitatorAddress?: Address
  ) {
    super()
    this.options = options
    this.verifySignatures = options.verifySignatures ?? process.env.NODE_ENV === 'production'
    this.authorizationModule = authorizationModule
    this.payAIFacilitatorAddress = payAIFacilitatorAddress
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Handle an incoming webhook request
   *
   * @param request - The incoming HTTP request (must have headers and body)
   * @returns Processing result
   */
  async handleWebhook(request: {
    headers: Headers | Record<string, string | undefined>
    body: string | PayAIWebhookPayload
  }): Promise<PayAIWebhookResult> {
    try {
      // Parse body if string
      const payload = typeof request.body === 'string'
        ? JSON.parse(request.body) as PayAIWebhookPayload
        : request.body

      // Verify signature if enabled
      if (this.verifySignatures && this.options.webhookSecret) {
        const bodyStr = typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body)

        const verification = await this.verifySignature(
          request.headers,
          bodyStr
        )

        if (!verification.valid) {
          return {
            success: false,
            error: verification.error ?? 'Invalid signature'
          }
        }
      }

      // Process the webhook based on event type
      return await this.processPayload(payload)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emit('error', new Error(`Webhook processing failed: ${errorMessage}`))

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Verify webhook signature
   */
  async verifySignature(
    headers: Headers | Record<string, string | undefined>,
    body: string
  ): Promise<PayAIWebhookVerification> {
    const getHeader = (name: string): string | undefined => {
      if (headers instanceof Headers) {
        return headers.get(name) ?? undefined
      }
      return headers[name]
    }

    const signature = getHeader(SIGNATURE_HEADER)
    const timestamp = getHeader(TIMESTAMP_HEADER)

    if (!signature) {
      return { valid: false, error: 'Missing signature header' }
    }

    if (!timestamp) {
      return { valid: false, error: 'Missing timestamp header' }
    }

    // Verify timestamp is recent
    const timestampMs = parseInt(timestamp, 10)
    if (isNaN(timestampMs)) {
      return { valid: false, error: 'Invalid timestamp format' }
    }

    const now = Date.now()
    if (Math.abs(now - timestampMs) > TIMESTAMP_TOLERANCE_MS) {
      return { valid: false, error: 'Timestamp too old or too far in future' }
    }

    // Verify HMAC signature
    if (!this.options.webhookSecret) {
      return { valid: false, error: 'Webhook secret not configured' }
    }

    const expectedSignature = this.computeSignature(
      timestamp,
      body,
      this.options.webhookSecret
    )

    const signatureBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true }
  }

  /**
   * Convert a PayAI payment to a reputation record
   */
  paymentToReputationRecord(data: PayAIPaymentData): PayAIReputationRecord {
    return {
      agentAddress: data.merchant as Address,
      paymentSignature: data.transactionSignature,
      amount: BigInt(data.amount),
      success: data.success ?? data.status === 'settled',
      responseTimeMs: data.responseTimeMs ?? 0,
      payerAddress: data.payer,
      timestamp: new Date(data.settledAt ?? data.verifiedAt ?? Date.now()),
      network: data.network
    }
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Process a verified webhook payload
   */
  private async processPayload(payload: PayAIWebhookPayload): Promise<PayAIWebhookResult> {
    const { type, data } = payload

    // Emit event based on type
    switch (type) {
      case 'payment.verified':
        this.emit('payment:verified', data)
        await this.options.onPaymentVerified?.(data)
        break

      case 'payment.settled':
        this.emit('payment:settled', data)
        await this.options.onPaymentSettled?.(data)

        // Record to reputation on settlement
        if (this.options.onRecordReputation) {
          // Verify on-chain authorization if module is configured
          if (this.authorizationModule && this.payAIFacilitatorAddress) {
            const isAuthorized = await this.verifyOnChainAuthorization(data.merchant as Address)
            if (!isAuthorized) {
              return {
                success: false,
                eventType: type,
                paymentId: data.paymentId,
                error: 'Agent has not authorized PayAI facilitator to update reputation',
                reputationRecorded: false
              }
            }
          }

          const record = this.paymentToReputationRecord(data)
          await this.options.onRecordReputation(record)
          this.emit('reputation:recorded', record)

          return {
            success: true,
            eventType: type,
            paymentId: data.paymentId,
            reputationRecorded: true
          }
        }
        break

      case 'payment.failed':
        this.emit('payment:failed', data)
        await this.options.onPaymentFailed?.(data)

        // Record failed payment to reputation (negative signal)
        if (this.options.onRecordReputation) {
          const record = this.paymentToReputationRecord(data)
          record.success = false
          await this.options.onRecordReputation(record)
          this.emit('reputation:recorded', record)

          return {
            success: true,
            eventType: type,
            paymentId: data.paymentId,
            reputationRecorded: true
          }
        }
        break

      case 'payment.refunded':
        // Just emit, don't record to reputation
        break

      default:
        return {
          success: false,
          error: `Unknown event type: ${type}`
        }
    }

    return {
      success: true,
      eventType: type,
      paymentId: data.paymentId,
      reputationRecorded: false
    }
  }

  /**
   * Verify on-chain authorization for an agent
   *
   * Checks if the agent has pre-authorized the PayAI facilitator
   * to update their reputation on-chain.
   */
  private async verifyOnChainAuthorization(agentAddress: Address): Promise<boolean> {
    if (!this.authorizationModule || !this.payAIFacilitatorAddress) {
      // If authorization module is not configured, skip verification
      // (This maintains backwards compatibility)
      return true
    }

    try {
      // Fetch authorization from on-chain
      const authorization = await this.authorizationModule.fetchAuthorization(
        agentAddress,
        this.payAIFacilitatorAddress
      )

      if (!authorization) {
        return false
      }

      // Check if authorization is still valid
      const status = this.authorizationModule.getAuthorizationStatus(
        authorization,
        authorization.currentIndex
      )

      return status.isValid
    } catch (error) {
      // Log error but don't throw - authorization verification is optional
      console.error('Failed to verify on-chain authorization:', error)
      return false
    }
  }

  /**
   * Compute HMAC-SHA256 signature for a webhook payload
   */
  private computeSignature(timestamp: string, body: string, secret: string): string {
    const signedPayload = `${timestamp}.${body}`
    const hmac = createHmac('sha256', secret)
    hmac.update(signedPayload)
    return hmac.digest('hex')
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new PayAI webhook handler
 *
 * @param options - Handler configuration
 * @returns Configured webhook handler
 */
export function createPayAIWebhookHandler(
  options: PayAIWebhookHandlerOptions = {}
): PayAIWebhookHandler {
  return new PayAIWebhookHandler(options)
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate a webhook signature for testing
 * (Useful for local development and testing)
 */
export function generateTestWebhookSignature(
  body: string,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: string } {
  const ts = (timestamp ?? Date.now()).toString()
  const signedPayload = `${ts}.${body}`
  const hmac = createHmac('sha256', secret)
  hmac.update(signedPayload)

  return {
    signature: hmac.digest('hex'),
    timestamp: ts
  }
}

/**
 * Create a mock PayAI webhook payload for testing
 */
export function createMockPayAIWebhook(
  overrides: Partial<PayAIPaymentData> = {}
): PayAIWebhookPayload {
  return {
    id: `evt_${Date.now()}`,
    type: 'payment.settled',
    timestamp: new Date().toISOString(),
    data: {
      paymentId: `pay_${Date.now()}`,
      transactionSignature: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      network: 'solana',
      payer: 'PayerWalletAddress111111111111111111111111',
      merchant: 'MerchantAgentAddress11111111111111111111',
      amount: '1000000', // 1 USDC
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      assetSymbol: 'USDC',
      status: 'settled',
      resource: 'https://api.example.com/ai/generate',
      responseTimeMs: 250,
      httpStatusCode: 200,
      success: true,
      settledAt: new Date().toISOString(),
      ...overrides
    }
  }
}
