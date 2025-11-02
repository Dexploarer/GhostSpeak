/**
 * x402 Payment Protocol Integration
 *
 * This module provides x402 payment capabilities for AI agent commerce.
 * x402 is an open payment standard that activates HTTP 402 "Payment Required"
 * for instant micropayments using stablecoins.
 *
 * @see https://www.x402.org
 * @see https://docs.ghostspeak.ai/x402
 *
 * @module x402
 */

export { X402Client, createX402Client } from './X402Client.js'
export type {
  X402PaymentRequest,
  X402PaymentReceipt,
  X402PaymentHeaders,
  X402VerificationResult,
  X402PaymentEvent
} from './X402Client.js'

export {
  createX402Middleware,
  x402FastifyPlugin,
  withX402RateLimit
} from './middleware.js'
export type {
  X402MiddlewareOptions,
  X402RequestWithPayment
} from './middleware.js'

export {
  AgentDiscoveryClient,
  createAgentDiscoveryClient
} from './AgentDiscoveryClient.js'
export type {
  Agent,
  AgentSearchParams,
  AgentSearchResponse,
  AgentPricing,
  AgentDiscoveryOptions
} from './AgentDiscoveryClient.js'

export {
  X402AnalyticsTracker,
  createX402AnalyticsTracker
} from './analytics.js'
export type {
  X402TransactionMetrics,
  X402AnalyticsOptions,
  X402AnalyticsEventHandlers
} from './analytics.js'

// Re-export for convenience
export { default } from './X402Client.js'
