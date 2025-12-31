/**
 * PayAI Integration Module
 *
 * Provides integration with PayAI's x402 facilitator for payment processing.
 * GhostSpeak uses PayAI as the recommended payment facilitator while focusing
 * on Verifiable Credentials and Reputation.
 *
 * @module payai
 * @see https://docs.payai.network/x402/introduction
 */

// =====================================================
// CLIENT
// =====================================================

export {
  PayAIClient,
  createPayAIClient,
  payAIFetch,
  isPaymentRequired,
  extractPaymentRequirements
} from './PayAIClient.js'

// =====================================================
// WEBHOOK HANDLER
// =====================================================

export {
  PayAIWebhookHandler,
  createPayAIWebhookHandler,
  generateTestWebhookSignature,
  createMockPayAIWebhook
} from './PayAIWebhookHandler.js'

// =====================================================
// AGENT SYNC
// =====================================================

export {
  PayAIAgentSync,
  createPayAIAgentSync,
  type PayAIAgentSyncConfig,
  type AgentSyncResult,
  type GhostSpeakAgentData
} from './PayAIAgentSync.js'

// =====================================================
// TYPES
// =====================================================

export type {
  // Webhook types
  PayAIWebhookEventType,
  PayAIPaymentStatus,
  PayAINetwork,
  PayAIWebhookPayload,
  PayAIPaymentData,
  PayAIWebhookVerification,

  // Client types
  PayAIClientConfig,
  PayAIPaymentRequirement,
  PayAIPaymentResponse,

  // Reputation types
  PayAIReputationRecord,
  PayAIAgentRegistration,

  // Handler types
  PayAIWebhookHandlerOptions,
  PayAIWebhookResult
} from './PayAITypes.js'
