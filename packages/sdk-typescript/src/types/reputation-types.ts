import type { Address } from '@solana/kit'

/**
 * Reputation tier levels
 */
export enum ReputationTier {
  None = 'None',
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum'
}

/**
 * Badge types for reputation achievements
 */
export enum BadgeType {
  FirstJob = 'FirstJob',
  TenJobs = 'TenJobs',
  HundredJobs = 'HundredJobs',
  ThousandJobs = 'ThousandJobs',
  PerfectRating = 'PerfectRating',
  QuickResponder = 'QuickResponder',
  HighEarner = 'HighEarner',
  DisputeResolver = 'DisputeResolver',
  CategoryExpert = 'CategoryExpert',
  CrossCategoryMaster = 'CrossCategoryMaster'
}

/**
 * Reputation calculation factors with weights
 */
export interface ReputationFactors {
  /** Completion rate weight (0-100) */
  completionWeight: number
  /** Quality score weight (0-100) */
  qualityWeight: number
  /** Timeliness weight (0-100) */
  timelinessWeight: number
  /** Client satisfaction weight (0-100) */
  satisfactionWeight: number
  /** Dispute resolution weight (0-100) */
  disputeWeight: number
}

/**
 * Category-specific reputation data
 */
export interface CategoryReputation {
  /** Category identifier (e.g., "defi", "nft", "gaming") */
  category: string
  /** Current reputation score in this category (basis points) */
  score: number
  /** Total completed jobs in this category */
  completedJobs: number
  /** Average completion time in seconds */
  avgCompletionTime: number
  /** Quality ratings sum */
  qualitySum: number
  /** Number of quality ratings */
  qualityCount: number
  /** Last activity timestamp */
  lastActivity: number
  /** Total earnings in this category */
  totalEarnings: number
}

/**
 * Performance snapshot for historical tracking
 */
export interface PerformanceSnapshot {
  /** Timestamp of snapshot */
  timestamp: number
  /** Reputation score at this time */
  score: number
  /** Jobs completed in this period */
  jobsCompleted: number
  /** Average quality rating */
  avgQuality: number
}

/**
 * Reputation badge structure
 */
export interface ReputationBadge {
  /** Badge identifier */
  badgeType: BadgeType
  /** Timestamp when earned */
  earnedAt: number
  /** Associated achievement value */
  achievementValue: number
}

/**
 * Main reputation data structure
 */
export interface ReputationData {
  /** Agent public key */
  agent: Address
  /** Overall reputation score (basis points) */
  overallScore: number
  /** Current reputation tier */
  tier: ReputationTier
  /** Category-specific reputations */
  categoryReputations: CategoryReputation[]
  /** Total staked reputation tokens */
  stakedAmount: number
  /** Reputation calculation factors */
  factors: ReputationFactors
  /** Total completed jobs across all categories */
  totalJobsCompleted: number
  /** Total failed/cancelled jobs */
  totalJobsFailed: number
  /** Average response time in seconds */
  avgResponseTime: number
  /** Number of disputes filed against agent */
  disputesAgainst: number
  /** Number of disputes resolved favorably */
  disputesResolved: number
  /** Last reputation update timestamp */
  lastUpdated: number
  /** Creation timestamp */
  createdAt: number
  /** Historical performance data */
  performanceHistory: PerformanceSnapshot[]
  /** Reputation badges earned */
  badges: ReputationBadge[]
  /** Cross-category reputation transfer enabled */
  crossCategoryEnabled: boolean
}

/**
 * Job performance data for reputation calculation
 */
export interface JobPerformance {
  /** Whether job was completed successfully */
  completed: boolean
  /** Quality rating (0-100) */
  qualityRating: number
  /** Expected duration in seconds */
  expectedDuration: number
  /** Actual duration in seconds */
  actualDuration: number
  /** Client satisfaction (0-100) */
  clientSatisfaction: number
  /** Whether there was a dispute */
  hadDispute: boolean
  /** Whether dispute was resolved favorably for agent */
  disputeResolvedFavorably: boolean
  /** Job category */
  category: string
  /** Payment amount */
  paymentAmount: number
}

/**
 * Reputation calculation result
 */
export interface ReputationCalculationResult {
  /** New overall score */
  overallScore: number
  /** Score for this specific job */
  jobScore: number
  /** Category-specific score */
  categoryScore: number
  /** New reputation tier */
  tier: ReputationTier
  /** Badges earned from this update */
  newBadges: BadgeType[]
  /** Whether fraud was detected */
  fraudDetected: boolean
  /** Fraud risk score (0-100) */
  fraudRiskScore: number
}

/**
 * Reputation query filters
 */
export interface ReputationQueryFilters {
  /** Filter by minimum score */
  minScore?: number
  /** Filter by maximum score */
  maxScore?: number
  /** Filter by tier */
  tier?: ReputationTier
  /** Filter by category */
  category?: string
  /** Filter by minimum jobs completed */
  minJobsCompleted?: number
  /** Filter by badges */
  requiredBadges?: BadgeType[]
  /** Include historical data */
  includeHistory?: boolean
  /** Maximum number of results to return */
  limit?: number
}

/**
 * Reputation update event
 */
export interface ReputationUpdateEvent {
  agent: Address
  previousScore: number
  newScore: number
  category: string
  timestamp: number
}

/**
 * Constants for reputation calculations
 */
export const REPUTATION_CONSTANTS = {
  /** Maximum reputation score (basis points) */
  MAX_REPUTATION_SCORE: 10000,
  /** Minimum reputation score for slashing */
  MIN_REPUTATION_FOR_SLASH: 1000,
  /** Reputation decay rate per day (basis points) */
  REPUTATION_DECAY_RATE_BPS: 10,
  /** Tier thresholds (basis points) */
  BRONZE_TIER_THRESHOLD: 2000,
  SILVER_TIER_THRESHOLD: 5000,
  GOLD_TIER_THRESHOLD: 7500,
  PLATINUM_TIER_THRESHOLD: 9000,
  /** Maximum categories per agent */
  MAX_REPUTATION_CATEGORIES: 10,
  /** Maximum performance history entries */
  MAX_PERFORMANCE_HISTORY: 365,
  /** Maximum badges per agent */
  MAX_BADGES: 20
}

/**
 * Fraud detection patterns
 */
export interface FraudPattern {
  /** Pattern identifier */
  patternId: string
  /** Pattern description */
  description: string
  /** Risk score contribution (0-100) */
  riskScore: number
  /** Detection function */
  detect: (data: ReputationData, job: JobPerformance) => boolean
}

/**
 * Reputation analytics data
 */
export interface ReputationAnalytics {
  /** Average score across all agents */
  averageScore: number
  /** Distribution of tiers */
  tierDistribution: Record<ReputationTier, number>
  /** Top categories by activity */
  topCategories: { category: string; jobCount: number }[]
  /** Fraud detection statistics */
  fraudStats: {
    totalDetected: number
    falsePositiveRate: number
    patterns: Record<string, number>
  }
}