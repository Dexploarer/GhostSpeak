import type { Address } from '@solana/addresses'

/**
 * Privacy mode for reputation display
 *
 * Determines how much reputation information is publicly visible.
 */
export enum PrivacyMode {
  /** Full disclosure - all reputation data is public */
  Public = 'Public',
  /** Show only reputation tier (Bronze/Silver/Gold/Platinum) */
  TierOnly = 'TierOnly',
  /** Show score range bucket (e.g., 750-850) */
  RangeOnly = 'RangeOnly',
  /** Custom selective disclosure */
  Custom = 'Custom',
  /** Fully confidential - ZK proofs required */
  Confidential = 'Confidential',
}

/**
 * Visibility level for individual metrics
 */
export enum VisibilityLevel {
  /** Visible to everyone */
  Public = 'Public',
  /** Visible only to authorized viewers */
  Private = 'Private',
  /** Visible only with ZK proof */
  ZKProof = 'ZKProof',
}

/**
 * Reputation tier levels (for tier-only privacy mode)
 */
export enum ReputationTier {
  None = 'None',
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum',
}

/**
 * Score range buckets (for range-only privacy mode)
 */
export enum ScoreRange {
  VeryLow = 'VeryLow',      // 0-2000
  Low = 'Low',              // 2000-5000
  Medium = 'Medium',        // 5000-7500
  High = 'High',            // 7500-9000
  VeryHigh = 'VeryHigh',    // 9000-10000
}

/**
 * Selective disclosure settings for individual metrics
 */
export interface MetricVisibility {
  /** Show exact Ghost Score */
  showScore: VisibilityLevel
  /** Show total jobs completed */
  showJobsCompleted: VisibilityLevel
  /** Show success rate percentage */
  showSuccessRate: VisibilityLevel
  /** Show average response time */
  showResponseTime: VisibilityLevel
  /** Show dispute statistics */
  showDisputes: VisibilityLevel
  /** Show earnings/payment data */
  showEarnings: VisibilityLevel
  /** Show client ratings */
  showRatings: VisibilityLevel
  /** Show badges earned */
  showBadges: VisibilityLevel
}

/**
 * Privacy settings for an agent's reputation
 */
export interface PrivacySettings {
  /** Agent public key */
  agent: Address
  /** Current privacy mode */
  mode: PrivacyMode
  /** Metric-specific visibility settings */
  metricVisibility: MetricVisibility
  /** List of addresses with viewing permission */
  authorizedViewers: Address[]
  /** Auto-grant access to clients who pay */
  autoGrantClients: boolean
  /** Last updated timestamp */
  updatedAt: number
}

/**
 * Privacy preset configurations
 */
export interface PrivacyPreset {
  /** Preset name */
  name: string
  /** Privacy mode */
  mode: PrivacyMode
  /** Metric visibility settings */
  metricVisibility: MetricVisibility
  /** Auto-grant to clients */
  autoGrantClients: boolean
}

/**
 * Built-in privacy presets
 */
export const PrivacyPresets: Record<string, PrivacyPreset> = {
  CONSERVATIVE: {
    name: 'Conservative',
    mode: PrivacyMode.TierOnly,
    metricVisibility: {
      showScore: VisibilityLevel.Private,
      showJobsCompleted: VisibilityLevel.Private,
      showSuccessRate: VisibilityLevel.Private,
      showResponseTime: VisibilityLevel.Private,
      showDisputes: VisibilityLevel.Private,
      showEarnings: VisibilityLevel.Private,
      showRatings: VisibilityLevel.Private,
      showBadges: VisibilityLevel.Public,
    },
    autoGrantClients: false,
  },
  BALANCED: {
    name: 'Balanced',
    mode: PrivacyMode.Custom,
    metricVisibility: {
      showScore: VisibilityLevel.Private,
      showJobsCompleted: VisibilityLevel.Public,
      showSuccessRate: VisibilityLevel.Public,
      showResponseTime: VisibilityLevel.Public,
      showDisputes: VisibilityLevel.Private,
      showEarnings: VisibilityLevel.Private,
      showRatings: VisibilityLevel.Public,
      showBadges: VisibilityLevel.Public,
    },
    autoGrantClients: true,
  },
  OPEN: {
    name: 'Open',
    mode: PrivacyMode.Public,
    metricVisibility: {
      showScore: VisibilityLevel.Public,
      showJobsCompleted: VisibilityLevel.Public,
      showSuccessRate: VisibilityLevel.Public,
      showResponseTime: VisibilityLevel.Public,
      showDisputes: VisibilityLevel.Public,
      showEarnings: VisibilityLevel.Public,
      showRatings: VisibilityLevel.Public,
      showBadges: VisibilityLevel.Public,
    },
    autoGrantClients: true,
  },
}

/**
 * Visible reputation data (filtered by privacy settings)
 *
 * This is the client-side type returned when fetching reputation
 * with privacy filters applied.
 */
export interface VisibleReputation {
  /** Agent public key */
  agent: Address
  /** Privacy mode applied */
  privacyMode: PrivacyMode
  /** Exact score (only if visible) */
  exactScore?: number
  /** Reputation tier (always visible in TierOnly mode) */
  tier?: ReputationTier
  /** Score range (visible in RangeOnly mode) */
  scoreRange?: ScoreRange
  /** Total jobs completed (if visible) */
  totalJobsCompleted?: number
  /** Success rate percentage (if visible) */
  successRate?: number
  /** Average response time in ms (if visible) */
  avgResponseTime?: number
  /** Dispute statistics (if visible) */
  disputes?: {
    total: number
    resolved: number
  }
  /** Total earnings (if visible) */
  totalEarnings?: number
  /** Average rating (if visible) */
  avgRating?: number
  /** Badges earned (if visible) */
  badges?: string[]
  /** Whether viewer has full access */
  hasFullAccess: boolean
}

/**
 * Parameters for initializing privacy settings
 */
export interface InitializePrivacyParams {
  /** Agent address to enable privacy for */
  agentAddress: Address
  /** Initial privacy mode */
  mode?: PrivacyMode
  /** Metric visibility settings */
  metricVisibility?: MetricVisibility
}

/**
 * Parameters for updating privacy mode
 */
export interface UpdatePrivacyModeParams {
  /** Agent address */
  agentAddress: Address
  /** New privacy mode */
  mode: PrivacyMode
}

/**
 * Parameters for setting metric visibility
 */
export interface SetMetricVisibilityParams {
  /** Agent address */
  agentAddress: Address
  /** Metric visibility settings */
  metricVisibility: MetricVisibility
}

/**
 * Parameters for granting viewer access
 */
export interface GrantAccessParams {
  /** Agent address */
  agentAddress: Address
  /** Viewer address to grant access */
  viewer: Address
}

/**
 * Parameters for revoking viewer access
 */
export interface RevokeAccessParams {
  /** Agent address */
  agentAddress: Address
  /** Viewer address to revoke access */
  viewer: Address
}

/**
 * Parameters for applying a privacy preset
 */
export interface ApplyPresetParams {
  /** Agent address */
  agentAddress: Address
  /** Preset to apply */
  preset: PrivacyPreset
}

/**
 * Privacy constants
 */
export const PRIVACY_CONSTANTS = {
  /** Score range thresholds */
  SCORE_RANGES: {
    VERY_LOW: { min: 0, max: 2000 },
    LOW: { min: 2000, max: 5000 },
    MEDIUM: { min: 5000, max: 7500 },
    HIGH: { min: 7500, max: 9000 },
    VERY_HIGH: { min: 9000, max: 10000 },
  },
  /** Tier thresholds */
  TIER_THRESHOLDS: {
    BRONZE: 2000,
    SILVER: 5000,
    GOLD: 7500,
    PLATINUM: 9000,
  },
  /** Maximum authorized viewers */
  MAX_AUTHORIZED_VIEWERS: 100,
}
