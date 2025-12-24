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

export { ReputationTier, BadgeType, REPUTATION_CONSTANTS }
export type { JobPerformance, ReputationCalculationResult, CategoryReputation }

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

  constructor(config: import('../../types/index.js').GhostSpeakConfig) {
    super(config)
    this.calculator = new ReputationCalculator()
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
}
