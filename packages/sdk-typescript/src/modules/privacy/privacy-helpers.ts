import type { Address } from '@solana/addresses'
import {
  PrivacyMode,
  VisibilityLevel,
  ReputationTier,
  ScoreRange,
  PRIVACY_CONSTANTS,
  type VisibleReputation,
  type MetricVisibility,
  type PrivacySettings,
} from '../../types/privacy-types.js'

/**
 * Calculate visible score based on privacy settings
 *
 * @param score - Actual reputation score
 * @param privacyMode - Privacy mode setting
 * @param hasAccess - Whether viewer has full access
 * @returns Visible score data
 */
export function calculateVisibleScore(
  score: number,
  privacyMode: PrivacyMode,
  hasAccess: boolean
): { exactScore?: number; tier?: ReputationTier; scoreRange?: ScoreRange } {
  // Full access always shows exact score
  if (hasAccess || privacyMode === PrivacyMode.Public) {
    return {
      exactScore: score,
      tier: getReputationTier(score),
      scoreRange: getScoreRange(score),
    }
  }

  // Privacy mode determines what's visible
  switch (privacyMode) {
    case PrivacyMode.TierOnly:
      return {
        tier: getReputationTier(score),
      }

    case PrivacyMode.RangeOnly:
      return {
        scoreRange: getScoreRange(score),
      }

    case PrivacyMode.Confidential:
      // No information visible without ZK proof
      return {}

    case PrivacyMode.Custom:
      // Custom mode handled by metric visibility
      return {
        tier: getReputationTier(score),
        scoreRange: getScoreRange(score),
      }

    default:
      return {}
  }
}

/**
 * Get reputation tier from score
 *
 * @param score - Reputation score (0-10000)
 * @returns Reputation tier
 */
export function getReputationTier(score: number): ReputationTier {
  if (score >= PRIVACY_CONSTANTS.TIER_THRESHOLDS.PLATINUM) {
    return ReputationTier.Platinum
  } else if (score >= PRIVACY_CONSTANTS.TIER_THRESHOLDS.GOLD) {
    return ReputationTier.Gold
  } else if (score >= PRIVACY_CONSTANTS.TIER_THRESHOLDS.SILVER) {
    return ReputationTier.Silver
  } else if (score >= PRIVACY_CONSTANTS.TIER_THRESHOLDS.BRONZE) {
    return ReputationTier.Bronze
  }
  return ReputationTier.None
}

/**
 * Get score range bucket from score
 *
 * @param score - Reputation score (0-10000)
 * @returns Score range bucket
 */
export function getScoreRange(score: number): ScoreRange {
  const ranges = PRIVACY_CONSTANTS.SCORE_RANGES

  if (score >= ranges.VERY_HIGH.min) {
    return ScoreRange.VeryHigh
  } else if (score >= ranges.HIGH.min) {
    return ScoreRange.High
  } else if (score >= ranges.MEDIUM.min) {
    return ScoreRange.Medium
  } else if (score >= ranges.LOW.min) {
    return ScoreRange.Low
  }
  return ScoreRange.VeryLow
}

/**
 * Check if viewer has access to private data
 *
 * @param viewerAddress - Address of the viewer
 * @param settings - Privacy settings
 * @param agentAddress - Agent address (viewer is agent)
 * @returns Whether viewer has access
 */
export function canViewerAccess(
  viewerAddress: Address,
  settings: PrivacySettings,
  agentAddress: Address
): boolean {
  // Agent always has full access to their own data
  if (viewerAddress === agentAddress) {
    return true
  }

  // Check if viewer is in authorized list
  return settings.authorizedViewers.includes(viewerAddress)
}

/**
 * Filter reputation metrics by visibility settings
 *
 * @param reputationData - Full reputation data
 * @param metricVisibility - Metric visibility settings
 * @param hasAccess - Whether viewer has full access
 * @returns Filtered visible reputation
 */
export function filterMetricsByVisibility(
  reputationData: {
    agent: Address
    overallScore: number
    totalJobsCompleted: number
    totalJobsFailed: number
    avgResponseTime: number
    disputesAgainst: number
    disputesResolved: number
    totalEarnings?: number
    avgRating?: number
    badges?: string[]
  },
  metricVisibility: MetricVisibility,
  hasAccess: boolean
): Partial<VisibleReputation> {
  const result: Partial<VisibleReputation> = {
    agent: reputationData.agent,
  }

  // Helper to check if metric is visible
  const isVisible = (level: VisibilityLevel): boolean => {
    return hasAccess || level === VisibilityLevel.Public
  }

  // Apply visibility filters
  if (isVisible(metricVisibility.showScore)) {
    result.exactScore = reputationData.overallScore
  }

  if (isVisible(metricVisibility.showJobsCompleted)) {
    result.totalJobsCompleted = reputationData.totalJobsCompleted
  }

  if (isVisible(metricVisibility.showSuccessRate)) {
    const total = reputationData.totalJobsCompleted + reputationData.totalJobsFailed
    result.successRate = total > 0
      ? (reputationData.totalJobsCompleted / total) * 100
      : 0
  }

  if (isVisible(metricVisibility.showResponseTime)) {
    result.avgResponseTime = reputationData.avgResponseTime
  }

  if (isVisible(metricVisibility.showDisputes)) {
    result.disputes = {
      total: reputationData.disputesAgainst,
      resolved: reputationData.disputesResolved,
    }
  }

  if (isVisible(metricVisibility.showEarnings) && reputationData.totalEarnings !== undefined) {
    result.totalEarnings = reputationData.totalEarnings
  }

  if (isVisible(metricVisibility.showRatings) && reputationData.avgRating !== undefined) {
    result.avgRating = reputationData.avgRating
  }

  if (isVisible(metricVisibility.showBadges) && reputationData.badges !== undefined) {
    result.badges = reputationData.badges
  }

  result.hasFullAccess = hasAccess

  return result
}

/**
 * Create default metric visibility settings
 *
 * @param mode - Privacy mode
 * @returns Default metric visibility
 */
export function getDefaultMetricVisibility(mode: PrivacyMode): MetricVisibility {
  switch (mode) {
    case PrivacyMode.Public:
      return {
        showScore: VisibilityLevel.Public,
        showJobsCompleted: VisibilityLevel.Public,
        showSuccessRate: VisibilityLevel.Public,
        showResponseTime: VisibilityLevel.Public,
        showDisputes: VisibilityLevel.Public,
        showEarnings: VisibilityLevel.Public,
        showRatings: VisibilityLevel.Public,
        showBadges: VisibilityLevel.Public,
      }

    case PrivacyMode.TierOnly:
    case PrivacyMode.RangeOnly:
      return {
        showScore: VisibilityLevel.Private,
        showJobsCompleted: VisibilityLevel.Private,
        showSuccessRate: VisibilityLevel.Private,
        showResponseTime: VisibilityLevel.Private,
        showDisputes: VisibilityLevel.Private,
        showEarnings: VisibilityLevel.Private,
        showRatings: VisibilityLevel.Private,
        showBadges: VisibilityLevel.Public,
      }

    case PrivacyMode.Confidential:
      return {
        showScore: VisibilityLevel.ZKProof,
        showJobsCompleted: VisibilityLevel.ZKProof,
        showSuccessRate: VisibilityLevel.ZKProof,
        showResponseTime: VisibilityLevel.ZKProof,
        showDisputes: VisibilityLevel.ZKProof,
        showEarnings: VisibilityLevel.ZKProof,
        showRatings: VisibilityLevel.ZKProof,
        showBadges: VisibilityLevel.ZKProof,
      }

    case PrivacyMode.Custom:
    default:
      // Balanced defaults for custom mode
      return {
        showScore: VisibilityLevel.Private,
        showJobsCompleted: VisibilityLevel.Public,
        showSuccessRate: VisibilityLevel.Public,
        showResponseTime: VisibilityLevel.Public,
        showDisputes: VisibilityLevel.Private,
        showEarnings: VisibilityLevel.Private,
        showRatings: VisibilityLevel.Public,
        showBadges: VisibilityLevel.Public,
      }
  }
}

/**
 * Validate privacy settings
 *
 * @param settings - Privacy settings to validate
 * @returns Validation result with errors if any
 */
export function validatePrivacySettings(settings: PrivacySettings): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check authorized viewers limit
  if (settings.authorizedViewers.length > PRIVACY_CONSTANTS.MAX_AUTHORIZED_VIEWERS) {
    errors.push(
      `Too many authorized viewers (max: ${PRIVACY_CONSTANTS.MAX_AUTHORIZED_VIEWERS})`
    )
  }

  // Validate mode and metric visibility consistency
  if (settings.mode === PrivacyMode.Public) {
    const hasPrivateMetric = Object.values(settings.metricVisibility).some(
      (level) => level !== VisibilityLevel.Public
    )
    if (hasPrivateMetric) {
      errors.push('Public mode cannot have private metrics')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get tier display name
 *
 * @param tier - Reputation tier
 * @returns Display name
 */
export function getTierDisplayName(tier: ReputationTier): string {
  const names: Record<ReputationTier, string> = {
    [ReputationTier.None]: 'Unranked',
    [ReputationTier.Bronze]: 'Bronze',
    [ReputationTier.Silver]: 'Silver',
    [ReputationTier.Gold]: 'Gold',
    [ReputationTier.Platinum]: 'Platinum',
  }
  return names[tier]
}

/**
 * Get range display string
 *
 * @param range - Score range
 * @returns Display string
 */
export function getRangeDisplayString(range: ScoreRange): string {
  const ranges: Record<ScoreRange, string> = {
    [ScoreRange.VeryLow]: '0-2000',
    [ScoreRange.Low]: '2000-5000',
    [ScoreRange.Medium]: '5000-7500',
    [ScoreRange.High]: '7500-9000',
    [ScoreRange.VeryHigh]: '9000-10000',
  }
  return ranges[range]
}
