/**
 * Reputation Module
 *
 * Manages reputation tracking and calculations:
 * - Calculating reputation scores
 * - Managing reputation badges
 * - Fraud detection
 */

import type { Address } from '@solana/addresses'
import { BaseModule } from '../../core/BaseModule.js'
import { ReputationCalculator } from '../../utils/reputation-calculator.js'
import { ReputationTagEngine } from '../../utils/reputation-tag-engine.js'
import {
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS,
} from '../../types/reputation-types.js'
import type {
  JobPerformance,
  ReputationCalculationResult,
  CategoryReputation,
} from '../../types/reputation-types.js'
import type {
  TagScore,
  TagCategory,
  TagFilters,
  TagQueryResult,
  ReputationMetrics,
} from '../../types/reputation-tags.js'

export { ReputationTier, BadgeType, REPUTATION_CONSTANTS }
export type { JobPerformance, ReputationCalculationResult, CategoryReputation }
export type { TagScore, TagCategory, TagFilters, TagQueryResult, ReputationMetrics }

/**
 * Simplified reputation data for module use
 */
export interface ReputationData {
  agent: Address
  overallScore: number
  totalJobsCompleted: number
  totalJobsFailed: number
  avgResponseTime: number
  disputesAgainst: number
  disputesResolved: number
  lastUpdated: number
  categoryReputations: CategoryReputation[]
  badges: Array<{ badgeType: BadgeType; earnedAt: number }>
  performanceHistory: Array<{ timestamp: number; score: number; jobsCompleted: number; avgQuality: number }>
  factors: {
    completionWeight: number
    qualityWeight: number
    timelinessWeight: number
    satisfactionWeight: number
    disputeWeight: number
  }
}

/**
 * Reputation module for managing reputation calculations
 */
export class ReputationModule extends BaseModule {
  private calculator: ReputationCalculator
  private tagEngine: ReputationTagEngine

  constructor(config: import('../../types/index.js').GhostSpeakConfig) {
    super(config)
    this.calculator = new ReputationCalculator()
    this.tagEngine = new ReputationTagEngine()
  }

  /**
   * Calculate reputation change for a job
   */
  calculateReputationChange(
    currentData: ReputationData,
    jobPerformance: JobPerformance
  ): ReputationCalculationResult {
    // Cast to internal type for calculator
    return this.calculator.calculateReputation(currentData as any, jobPerformance)
  }

  /**
   * Get tier name from tier enum
   */
  getTierName(tier: ReputationTier): string {
    switch (tier) {
      case ReputationTier.None:
        return 'Unranked'
      case ReputationTier.Bronze:
        return 'Bronze'
      case ReputationTier.Silver:
        return 'Silver'
      case ReputationTier.Gold:
        return 'Gold'
      case ReputationTier.Platinum:
        return 'Platinum'
      default:
        return 'Unknown'
    }
  }

  /**
   * Get tier from score
   */
  getTierFromScore(score: number): ReputationTier {
    if (score >= REPUTATION_CONSTANTS.PLATINUM_TIER_THRESHOLD) {
      return ReputationTier.Platinum
    } else if (score >= REPUTATION_CONSTANTS.GOLD_TIER_THRESHOLD) {
      return ReputationTier.Gold
    } else if (score >= REPUTATION_CONSTANTS.SILVER_TIER_THRESHOLD) {
      return ReputationTier.Silver
    } else if (score >= REPUTATION_CONSTANTS.BRONZE_TIER_THRESHOLD) {
      return ReputationTier.Bronze
    }
    return ReputationTier.None
  }

  /**
   * Get badge display name
   */
  getBadgeName(badge: BadgeType): string {
    switch (badge) {
      case BadgeType.FirstJob:
        return 'First Job'
      case BadgeType.TenJobs:
        return '10 Jobs'
      case BadgeType.HundredJobs:
        return '100 Jobs'
      case BadgeType.ThousandJobs:
        return '1000 Jobs'
      case BadgeType.PerfectRating:
        return 'Perfect Rating'
      case BadgeType.QuickResponder:
        return 'Quick Responder'
      case BadgeType.DisputeResolver:
        return 'Dispute Resolver'
      case BadgeType.CategoryExpert:
        return 'Category Expert'
      case BadgeType.CrossCategoryMaster:
        return 'Cross-Category Master'
      default:
        return 'Unknown Badge'
    }
  }

  /**
   * Calculate estimated APY boost from reputation
   */
  calculateApyBoost(score: number): number {
    // 0.5% boost per 1000 reputation points
    return Math.floor(score / 1000) * 50 // Returns in basis points
  }

  /**
   * Get reputation tier color for UI
   */
  getTierColor(tier: ReputationTier): string {
    switch (tier) {
      case ReputationTier.Platinum:
        return '#E5E4E2' // Platinum gray
      case ReputationTier.Gold:
        return '#FFD700' // Gold
      case ReputationTier.Silver:
        return '#C0C0C0' // Silver
      case ReputationTier.Bronze:
        return '#CD7F32' // Bronze
      default:
        return '#808080' // Gray
    }
  }

  /**
   * Create default reputation data for new agents
   */
  createDefaultReputationData(agentAddress: Address): ReputationData {
    return {
      agent: agentAddress,
      overallScore: 5000, // Start at 50%
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      avgResponseTime: 0,
      disputesAgainst: 0,
      disputesResolved: 0,
      lastUpdated: Math.floor(Date.now() / 1000),
      categoryReputations: [],
      badges: [],
      performanceHistory: [],
      factors: {
        completionWeight: 25,
        qualityWeight: 25,
        timelinessWeight: 20,
        satisfactionWeight: 20,
        disputeWeight: 10,
      },
    }
  }

  /**
   * Check if agent qualifies for a specific tier
   */
  qualifiesForTier(score: number, tier: ReputationTier): boolean {
    switch (tier) {
      case ReputationTier.Platinum:
        return score >= REPUTATION_CONSTANTS.PLATINUM_TIER_THRESHOLD
      case ReputationTier.Gold:
        return score >= REPUTATION_CONSTANTS.GOLD_TIER_THRESHOLD
      case ReputationTier.Silver:
        return score >= REPUTATION_CONSTANTS.SILVER_TIER_THRESHOLD
      case ReputationTier.Bronze:
        return score >= REPUTATION_CONSTANTS.BRONZE_TIER_THRESHOLD
      default:
        return true
    }
  }

  /**
   * Calculate points needed for next tier
   */
  pointsToNextTier(score: number): { nextTier: ReputationTier; pointsNeeded: number } | null {
    const currentTier = this.getTierFromScore(score)

    switch (currentTier) {
      case ReputationTier.None:
        return { nextTier: ReputationTier.Bronze, pointsNeeded: REPUTATION_CONSTANTS.BRONZE_TIER_THRESHOLD - score }
      case ReputationTier.Bronze:
        return { nextTier: ReputationTier.Silver, pointsNeeded: REPUTATION_CONSTANTS.SILVER_TIER_THRESHOLD - score }
      case ReputationTier.Silver:
        return { nextTier: ReputationTier.Gold, pointsNeeded: REPUTATION_CONSTANTS.GOLD_TIER_THRESHOLD - score }
      case ReputationTier.Gold:
        return { nextTier: ReputationTier.Platinum, pointsNeeded: REPUTATION_CONSTANTS.PLATINUM_TIER_THRESHOLD - score }
      case ReputationTier.Platinum:
        return null // Already at max tier
      default:
        return null
    }
  }

  // =====================================================
  // PAYAI INTEGRATION
  // =====================================================

  /**
   * Record a PayAI payment event to update reputation
   *
   * Converts PayAI webhook data to JobPerformance format and
   * calculates reputation change.
   *
   * @param record - PayAI reputation record from webhook
   * @param currentData - Current agent reputation data (fetched from on-chain or cache)
   * @returns Reputation calculation result
   */
  recordPayAIPayment(
    record: PayAIReputationRecordInput,
    currentData: ReputationData
  ): ReputationCalculationResult {
    // Convert PayAI record to JobPerformance
    const jobPerformance = this.payAIRecordToJobPerformance(record)

    // Calculate reputation change
    return this.calculateReputationChange(currentData, jobPerformance)
  }

  /**
   * Convert a PayAI reputation record to JobPerformance format
   *
   * PayAI provides basic payment data, so we derive quality metrics
   * from response time and success status.
   */
  payAIRecordToJobPerformance(record: PayAIReputationRecordInput): JobPerformance {
    // Estimate quality from response time
    // Faster response times indicate better quality
    const qualityRating = this.estimateQualityFromResponseTime(record.responseTimeMs)

    // Estimate expected duration based on payment amount
    // Higher payments typically expect longer processing times
    const expectedDuration = this.estimateExpectedDuration(record.amount)

    return {
      completed: record.success,
      qualityRating,
      expectedDuration,
      actualDuration: Math.ceil(record.responseTimeMs / 1000), // Convert to seconds
      clientSatisfaction: record.success ? qualityRating : 20, // Lower satisfaction on failure
      hadDispute: false, // PayAI webhook doesn't include dispute info
      disputeResolvedFavorably: false,
      category: this.categorizeFromNetwork(record.network),
      paymentAmount: Number(record.amount) / 1_000_000, // Convert from base units (e.g., USDC 6 decimals)
    }
  }

  /**
   * Estimate quality rating from response time
   *
   * Fast responses (< 500ms) = 100 quality
   * Average responses (500ms-2s) = 70-90 quality
   * Slow responses (2s-10s) = 40-70 quality
   * Very slow responses (> 10s) = 20-40 quality
   */
  private estimateQualityFromResponseTime(responseTimeMs: number): number {
    if (responseTimeMs <= 500) {
      return 100
    } else if (responseTimeMs <= 2000) {
      // Linear scale from 90 to 70 for 500ms-2s
      return Math.round(90 - ((responseTimeMs - 500) / 1500) * 20)
    } else if (responseTimeMs <= 10000) {
      // Linear scale from 70 to 40 for 2s-10s
      return Math.round(70 - ((responseTimeMs - 2000) / 8000) * 30)
    } else {
      // Minimum 20 for any response
      return Math.max(20, Math.round(40 - ((responseTimeMs - 10000) / 50000) * 20))
    }
  }

  /**
   * Estimate expected duration based on payment amount
   *
   * Larger payments = longer expected processing time
   */
  private estimateExpectedDuration(amountBaseUnits: bigint): number {
    const amountUSDC = Number(amountBaseUnits) / 1_000_000

    // Base expectation of 2 seconds for micro-payments
    // +1 second per $0.10 payment
    return Math.max(2, Math.ceil(2 + amountUSDC * 10))
  }

  /**
   * Categorize payment by network
   */
  private categorizeFromNetwork(network: string): string {
    switch (network) {
      case 'solana':
        return 'ai-services-solana'
      case 'base':
        return 'ai-services-base'
      case 'ethereum':
        return 'ai-services-ethereum'
      default:
        return 'ai-services'
    }
  }

  /**
   * Create a PayAI-compatible performance snapshot
   * Useful for tracking payment patterns
   */
  createPayAIPerformanceSnapshot(
    record: PayAIReputationRecordInput,
    reputationResult: ReputationCalculationResult
  ): {
    timestamp: number
    paymentId: string
    network: string
    amount: string
    success: boolean
    responseTimeMs: number
    reputationChange: number
    newScore: number
    tier: string
  } {
    return {
      timestamp: record.timestamp.getTime(),
      paymentId: record.paymentSignature,
      network: record.network,
      amount: record.amount.toString(),
      success: record.success,
      responseTimeMs: record.responseTimeMs,
      reputationChange: reputationResult.jobScore,
      newScore: reputationResult.overallScore,
      tier: reputationResult.tier,
    }
  }

  // =====================================================
  // REPUTATION TAGGING METHODS
  // =====================================================

  /**
   * Calculate tags for an agent based on metrics
   *
   * Automatically evaluates all tag criteria and assigns tags
   * with appropriate confidence scores.
   *
   * @param metrics - Agent reputation metrics
   * @returns Array of tag scores
   */
  async calculateTagsForAgent(metrics: ReputationMetrics): Promise<TagScore[]> {
    return this.tagEngine.calculateTags(metrics)
  }

  /**
   * Get tags by category
   *
   * Filters tags to only those in the specified category.
   *
   * @param tags - All tag scores
   * @param category - Category to filter by
   * @returns Filtered tag scores
   */
  getTagsByCategory(tags: TagScore[], category: TagCategory): TagScore[] {
    return this.tagEngine.filterTags(tags, { category })
  }

  /**
   * Check if agent has a specific tag
   *
   * @param tags - Agent's tag scores
   * @param tagName - Tag to check for
   * @returns Whether the tag exists
   */
  hasTag(tags: TagScore[], tagName: string): boolean {
    return tags.some((tag) => tag.tagName === tagName)
  }

  /**
   * Get tag confidence score
   *
   * @param tags - Agent's tag scores
   * @param tagName - Tag to check
   * @returns Confidence score or undefined if tag doesn't exist
   */
  getTagConfidence(tags: TagScore[], tagName: string): number | undefined {
    const tag = tags.find((t) => t.tagName === tagName)
    return tag?.confidence
  }

  /**
   * Filter tags by criteria
   *
   * @param tags - Tags to filter
   * @param filters - Filter criteria
   * @returns Filtered tags
   */
  filterTags(tags: TagScore[], filters: TagFilters): TagScore[] {
    return this.tagEngine.filterTags(tags, filters)
  }

  /**
   * Apply tag decay based on age
   *
   * Reduces confidence scores for old tags and removes stale tags.
   *
   * @param tags - Current tag scores
   * @param currentTimestamp - Current Unix timestamp (optional)
   * @returns Tags with decay applied
   */
  applyTagDecay(tags: TagScore[], currentTimestamp?: number): TagScore[] {
    return this.tagEngine.applyTagDecay(tags, currentTimestamp)
  }

  /**
   * Merge new tags with existing tags
   *
   * Updates existing tags or adds new ones, preferring higher confidence.
   *
   * @param existingTags - Current tags
   * @param newTags - New tags to merge
   * @returns Merged tag list
   */
  mergeTags(existingTags: TagScore[], newTags: TagScore[]): TagScore[] {
    return this.tagEngine.mergeTags(existingTags, newTags)
  }

  /**
   * Categorize tags by type
   *
   * Organizes tags into skill, behavior, and compliance categories.
   *
   * @param tags - Tags to categorize
   * @returns Categorized tag result
   */
  categorizeTags(tags: TagScore[]): TagQueryResult {
    return this.tagEngine.categorizeTags(tags)
  }

  /**
   * Get top N tags by confidence
   *
   * @param tags - Tags to sort
   * @param count - Number of tags to return
   * @returns Top tags
   */
  getTopTags(tags: TagScore[], count: number): TagScore[] {
    return this.tagEngine.getTopTags(tags, count)
  }

  /**
   * Sort tags by confidence (descending)
   *
   * @param tags - Tags to sort
   * @returns Sorted tags
   */
  sortTagsByConfidence(tags: TagScore[]): TagScore[] {
    return this.tagEngine.sortByConfidence(tags)
  }

  /**
   * Sort tags by evidence count (descending)
   *
   * @param tags - Tags to sort
   * @returns Sorted tags
   */
  sortTagsByEvidence(tags: TagScore[]): TagScore[] {
    return this.tagEngine.sortByEvidence(tags)
  }

  /**
   * Sort tags by most recently updated
   *
   * @param tags - Tags to sort
   * @returns Sorted tags
   */
  sortTagsByRecent(tags: TagScore[]): TagScore[] {
    return this.tagEngine.sortByRecent(tags)
  }

  /**
   * Get confidence level description
   *
   * @param confidence - Confidence score (0-10000)
   * @returns Human-readable confidence level
   */
  getConfidenceLevel(confidence: number): string {
    return this.tagEngine.getConfidenceLevel(confidence)
  }

  /**
   * Validate tag name length
   *
   * @param tagName - Tag name to validate
   * @returns Whether tag name is valid
   */
  validateTagName(tagName: string): boolean {
    return this.tagEngine.validateTagName(tagName)
  }

  /**
   * Validate confidence score
   *
   * @param confidence - Confidence to validate
   * @returns Whether confidence is valid (0-10000)
   */
  validateConfidence(confidence: number): boolean {
    return this.tagEngine.validateConfidence(confidence)
  }

  /**
   * Convert on-chain ReputationMetrics to TagEngine format
   *
   * Helper to convert blockchain data to the format needed for tag calculation.
   *
   * @param onChainMetrics - Metrics from blockchain
   * @returns Metrics in TagEngine format
   */
  convertMetricsForTagging(onChainMetrics: {
    successfulPayments: bigint
    failedPayments: bigint
    totalResponseTime: bigint
    responseTimeCount: bigint
    totalDisputes: number
    disputesResolved: number
    totalRating: number
    totalRatingsCount: number
    createdAt: number
    updatedAt: number
  }): ReputationMetrics {
    const avgResponseTime =
      onChainMetrics.responseTimeCount > 0n
        ? Number(onChainMetrics.totalResponseTime / onChainMetrics.responseTimeCount)
        : 0

    const totalPayments = onChainMetrics.successfulPayments + onChainMetrics.failedPayments
    const successRate =
      totalPayments > 0n
        ? Number((onChainMetrics.successfulPayments * 10000n) / totalPayments)
        : 0

    const avgRating =
      onChainMetrics.totalRatingsCount > 0
        ? Math.floor(
            (onChainMetrics.totalRating * 100) / (onChainMetrics.totalRatingsCount * 5)
          )
        : 0

    const disputeResolutionRate =
      onChainMetrics.totalDisputes > 0
        ? Math.floor((onChainMetrics.disputesResolved * 10000) / onChainMetrics.totalDisputes)
        : 10000

    return {
      successfulPayments: onChainMetrics.successfulPayments,
      failedPayments: onChainMetrics.failedPayments,
      totalResponseTime: onChainMetrics.totalResponseTime,
      responseTimeCount: onChainMetrics.responseTimeCount,
      totalDisputes: onChainMetrics.totalDisputes,
      disputesResolved: onChainMetrics.disputesResolved,
      totalRating: onChainMetrics.totalRating,
      totalRatingsCount: onChainMetrics.totalRatingsCount,
      createdAt: onChainMetrics.createdAt,
      updatedAt: onChainMetrics.updatedAt,
      avgResponseTime,
      successRate,
      avgRating,
      disputeResolutionRate,
    }
  }
}

/**
 * Interface for PayAI reputation record input
 * Matches the PayAIReputationRecord from payai module
 */
export interface PayAIReputationRecordInput {
  agentAddress: Address
  paymentSignature: string
  amount: bigint
  success: boolean
  responseTimeMs: number
  payerAddress: string
  timestamp: Date
  network: string
}
