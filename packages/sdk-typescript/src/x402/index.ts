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

// =====================================================
// CORE X402 CLIENT
// =====================================================

export { X402Client, createX402Client } from './X402Client.js'
export type {
  X402PaymentRequest,
  X402PaymentReceipt,
  X402PaymentHeaders,
  X402VerificationResult,
  X402PaymentEvent
} from './X402Client.js'

// =====================================================
// MIDDLEWARE
// =====================================================

export {
  createX402Middleware,
  x402FastifyPlugin,
  withX402RateLimit
} from './middleware.js'
export type {
  X402MiddlewareOptions,
  X402RequestWithPayment
} from './middleware.js'

// =====================================================
// AGENT DISCOVERY
// =====================================================

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

// =====================================================
// ANALYTICS
// =====================================================

export {
  X402AnalyticsTracker,
  createX402AnalyticsTracker
} from './analytics.js'
export type {
  X402TransactionMetrics,
  X402AnalyticsOptions,
  X402AnalyticsEventHandlers
} from './analytics.js'

// =====================================================
// PAYMENT STREAMING
// =====================================================

export { PaymentStreamingManager } from './PaymentStreaming.js'
export type {
  PaymentStreamConfig,
  PaymentStream,
  PaymentMilestone,
  StreamPayment
} from './PaymentStreaming.js'

// =====================================================
// FACILITATOR INTEGRATION (NEW)
// =====================================================

export {
  FacilitatorRegistry,
  createFacilitatorRegistry,
  Network,
  FacilitatorStatus,
  KNOWN_FACILITATORS,
  USDC_TOKENS,
  PYUSD_TOKENS,
  getUsdcToken,
  getPyusdToken,
  isNetworkSupported,
  parseNetwork
} from './FacilitatorRegistry.js'
export type {
  FacilitatorConfig,
  FacilitatorAddress,
  TokenConfig,
  FacilitatorHealthCheck,
  FacilitatorSelectionCriteria
} from './FacilitatorRegistry.js'

export {
  FacilitatorClient,
  createFacilitatorClient
} from './FacilitatorClient.js'
export type {
  PaymentRequirement,
  PaymentHeader,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  SettlePaymentRequest,
  SettlePaymentResponse,
  DiscoveredResource,
  DiscoveryResponse,
  DiscoveryOptions,
  FacilitatorClientOptions
} from './FacilitatorClient.js'

// =====================================================
// RESOURCE REGISTRY (NEW)
// =====================================================

export {
  ResourceRegistry,
  createResourceRegistry
} from './ResourceRegistry.js'
export type {
  RegisterResourceRequest,
  RegisterResourceResult,
  RegisteredResource,
  PingResult,
  OriginMetadata,
  ResourceSearchOptions,
  ResourceSearchResult,
  AILabelingResult,
  ResourceRegistryOptions
} from './ResourceRegistry.js'

// =====================================================
// AI TOOL GENERATION (NEW)
// =====================================================

export {
  AIToolGenerator,
  createAIToolGenerator,
  resourcesToOpenAITools,
  resourcesToAnthropicTools,
  resourcesToLangChainTools
} from './AIToolGenerator.js'
export type {
  OpenAITool,
  AnthropicTool,
  LangChainTool,
  ExecutableTool,
  ExecuteToolResult,
  ExecuteToolOptions
} from './AIToolGenerator.js'

// =====================================================
// FETCH WITH PAYMENT (NEW)
// =====================================================

export {
  FetchWithPaymentClient,
  fetchWithX402Payment,
  wrapFetchWithPayment,
  isPaymentRequired,
  extractPaymentRequirements,
  calculateTotalCost,
  X402PaymentError
} from './fetchWithPayment.js'
export type {
  FetchWithPaymentOptions,
  PaymentInfo,
  X402Response,
  PaymentHeaderCreator,
  FetchWithPaymentClientOptions
} from './fetchWithPayment.js'

// =====================================================
// WALLET MANAGER (NEW)
// =====================================================

export {
  WalletManager,
  createWalletManager,
  InMemoryWalletStorage,
  WalletType,
  DEFAULT_FREE_TIER_CONFIG
} from './WalletManager.js'
export type {
  WalletInfo,
  FreeTierConfig,
  UserUsage,
  WalletManagerOptions,
  WalletStorage,
  CreateWalletOptions
} from './WalletManager.js'

// =====================================================
// TIME-WINDOWED METRICS (NEW)
// =====================================================

export {
  TimeWindowedMetricsAggregator,
  createTimeWindowedMetricsAggregator,
  TIME_WINDOW_DURATIONS
} from './TimeWindowedMetrics.js'
export type {
  ResourceRequestEvent,
  TimeWindowConfig,
  WindowMetrics,
  LatencyPercentiles,
  TimeWindowedMetricsOptions
} from './TimeWindowedMetrics.js'

// =====================================================
// ENHANCED X402 SCHEMAS (NEW)
// =====================================================

export {
  validatePaymentRequirement,
  validateX402Response,
  parseX402Response,
  createInputSchema,
  createOutputSchema
} from './schemas/enhanced-x402.js'
export type {
  JSONSchema7,
  JSONSchema7Type,
  X402PaymentRequirement,
  X402ResponseV1,
  EnhancedX402Response,
  PaymentScheme,
  TieredPricing
} from './schemas/enhanced-x402.js'

// =====================================================
// GHOSTSPEAK NATIVE FACILITATOR (CORE VALUE)
// =====================================================

export {
  GhostSpeakFacilitator,
  createGhostSpeakFacilitator
} from './GhostSpeakFacilitator.js'
export type {
  GhostSpeakX402Features,
  GhostSpeakAgent,
  EscrowBackedPayment,
  X402ReputationUpdate,
  GhostSpeakFacilitatorOptions
} from './GhostSpeakFacilitator.js'

// =====================================================
// DEFAULT EXPORT
// =====================================================

// Re-export for convenience
export { default } from './X402Client.js'
