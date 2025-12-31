/**
 * PayAI Integration Types
 *
 * Type definitions for PayAI x402 facilitator integration,
 * including webhook payloads and client configuration.
 *
 * @module payai/types
 * @see https://docs.payai.network/x402/introduction
 */

import type { Address } from '@solana/addresses'

// =====================================================
// WEBHOOK TYPES
// =====================================================

/**
 * PayAI webhook event types
 */
export type PayAIWebhookEventType =
  | 'payment.verified'
  | 'payment.settled'
  | 'payment.failed'
  | 'payment.refunded'

/**
 * PayAI payment status
 */
export type PayAIPaymentStatus =
  | 'pending'
  | 'verified'
  | 'settled'
  | 'failed'
  | 'refunded'

/**
 * PayAI supported networks
 */
export type PayAINetwork = 'solana' | 'base' | 'ethereum' | 'polygon' | 'arbitrum'

/**
 * PayAI webhook payload for payment events
 * This is sent to your webhook endpoint after payment verification/settlement
 */
export interface PayAIWebhookPayload {
  /** Unique event ID */
  id: string

  /** Event type */
  type: PayAIWebhookEventType

  /** Timestamp of the event (ISO 8601) */
  timestamp: string

  /** Payment data */
  data: PayAIPaymentData
}

/**
 * Payment data included in webhook payload
 */
export interface PayAIPaymentData {
  /** Unique payment ID from PayAI */
  paymentId: string

  /** Transaction signature on-chain */
  transactionSignature: string

  /** Blockchain network */
  network: PayAINetwork

  /** Payer wallet address */
  payer: string

  /** Merchant/Agent wallet address (payTo) */
  merchant: string

  /** Payment amount in smallest unit (e.g., lamports for SOL, base units for USDC) */
  amount: string

  /** Token/asset address */
  asset: string

  /** Token symbol (e.g., 'USDC') */
  assetSymbol: string

  /** Payment status */
  status: PayAIPaymentStatus

  /** Resource URL that was paid for */
  resource: string

  /** Response time in milliseconds (from request to response) */
  responseTimeMs?: number

  /** HTTP status code of the resource response */
  httpStatusCode?: number

  /** Whether the resource request was successful */
  success?: boolean

  /** Timestamp when payment was verified */
  verifiedAt?: string

  /** Timestamp when payment was settled */
  settledAt?: string

  /** Additional metadata from the payment request */
  metadata?: Record<string, unknown>
}

/**
 * Webhook verification result
 */
export interface PayAIWebhookVerification {
  valid: boolean
  error?: string
  payload?: PayAIWebhookPayload
}

// =====================================================
// CLIENT TYPES
// =====================================================

/**
 * PayAI client configuration
 */
export interface PayAIClientConfig {
  /** PayAI facilitator URL (default: https://facilitator.payai.network) */
  facilitatorUrl?: string

  /** Solana RPC endpoint */
  rpcUrl: string

  /** User wallet for signing payments */
  wallet?: {
    publicKey: string
    signTransaction: (tx: unknown) => Promise<unknown>
  }

  /** Request timeout in milliseconds */
  timeout?: number

  /** Retry configuration */
  retry?: {
    attempts: number
    delayMs: number
  }
}

/**
 * x402 payment requirement from a resource
 */
export interface PayAIPaymentRequirement {
  /** Payment scheme (e.g., 'exact') */
  scheme: string

  /** Blockchain network */
  network: PayAINetwork

  /** Maximum amount required in smallest unit */
  maxAmountRequired: string

  /** Resource URL */
  resource: string

  /** Description of the resource */
  description?: string

  /** MIME type of the response */
  mimeType?: string

  /** Recipient address */
  payTo: string

  /** Token/asset address */
  asset: string

  /** Maximum timeout in seconds */
  maxTimeoutSeconds?: number

  /** Additional data */
  extra?: Record<string, unknown>
}

/**
 * Payment response from PayAI facilitator
 */
export interface PayAIPaymentResponse {
  /** Whether payment was successful */
  success: boolean

  /** Transaction signature */
  transactionSignature?: string

  /** Error message if failed */
  error?: string

  /** Payment ID for tracking */
  paymentId?: string
}

// =====================================================
// REPUTATION INTEGRATION TYPES
// =====================================================

/**
 * Data to record for reputation tracking
 * Extracted from PayAI webhook payloads
 */
export interface PayAIReputationRecord {
  /** Agent/Merchant address on Solana */
  agentAddress: Address

  /** Payment signature for verification */
  paymentSignature: string

  /** Payment amount */
  amount: bigint

  /** Whether the service was successful */
  success: boolean

  /** Response time in milliseconds */
  responseTimeMs: number

  /** Payer address */
  payerAddress: string

  /** Timestamp of payment */
  timestamp: Date

  /** Network the payment was on */
  network: PayAINetwork
}

/**
 * Agent registration data for PayAI marketplace sync
 */
export interface PayAIAgentRegistration {
  /** Agent's Solana address */
  agentAddress: Address

  /** Service endpoint URL (x402-enabled) */
  serviceEndpoint: string

  /** Agent capabilities/tags */
  capabilities: string[]

  /** Accepted payment tokens */
  acceptedTokens: string[]

  /** Pricing information */
  pricing?: {
    minPrice: string
    maxPrice: string
    currency: string
  }

  /** Agent metadata */
  metadata?: {
    name?: string
    description?: string
    logo?: string
    website?: string
  }
}

// =====================================================
// WEBHOOK HANDLER TYPES
// =====================================================

/**
 * Webhook handler options
 */
export interface PayAIWebhookHandlerOptions {
  /** Secret for verifying webhook signatures */
  webhookSecret?: string

  /** Whether to verify webhook signatures (default: true in production) */
  verifySignatures?: boolean

  /** Callback for handling verified payment events */
  onPaymentVerified?: (data: PayAIPaymentData) => Promise<void>

  /** Callback for handling settled payment events */
  onPaymentSettled?: (data: PayAIPaymentData) => Promise<void>

  /** Callback for handling failed payment events */
  onPaymentFailed?: (data: PayAIPaymentData) => Promise<void>

  /** Callback for recording to reputation */
  onRecordReputation?: (record: PayAIReputationRecord) => Promise<void>
}

/**
 * Webhook processing result
 */
export interface PayAIWebhookResult {
  /** Whether processing was successful */
  success: boolean

  /** Event type that was processed */
  eventType?: PayAIWebhookEventType

  /** Error message if failed */
  error?: string

  /** Whether reputation was recorded */
  reputationRecorded?: boolean

  /** Processed payment ID */
  paymentId?: string
}
