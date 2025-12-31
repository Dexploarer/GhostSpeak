/**
 * Reputation Source Adapters
 *
 * Exports all reputation source adapters for multi-source aggregation
 */

export {
  ReputationSource,
  type ReputationSourceAdapter,
  type ReputationSourceConfig,
  type SourceReputationData,
  BaseReputationAdapter,
} from './ReputationSourceAdapter.js'

export { PayAIAdapter, type PayAIReputationRecord, type PayAIMetrics } from './PayAIAdapter.js'

export { GitHubAdapter, type GitHubStats } from './GitHubAdapter.js'

export {
  CustomWebhookAdapter,
  type WebhookReputationResponse,
  type WebhookConfig,
} from './CustomWebhookAdapter.js'
