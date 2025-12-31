/**
 * Reputation Module Index
 */

export {
  ReputationModule,
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS,
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type CategoryReputation,
} from './ReputationModule.js'

// Multi-source aggregation
export {
  MultiSourceAggregator,
  type AggregatedReputation,
  type SourceScoreBreakdown,
} from './MultiSourceAggregator.js'

// Adapters
export {
  ReputationSource,
  type ReputationSourceAdapter,
  type ReputationSourceConfig,
  type SourceReputationData,
  BaseReputationAdapter,
  PayAIAdapter,
  type PayAIReputationRecord,
  type PayAIMetrics,
  GitHubAdapter,
  type GitHubStats,
  CustomWebhookAdapter,
  type WebhookReputationResponse,
  type WebhookConfig,
} from './adapters/index.js'

