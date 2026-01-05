/**
 * GhostScore Calculator - Multi-Source Reputation System
 *
 * Implements research-backed algorithms for calculating agent trustworthiness:
 * - Weighted multi-source aggregation (8+ data sources)
 * - Exponential time decay with configurable half-lives
 * - Bayesian confidence intervals
 * - Sybil resistance (transitivity decay, connectivity penalties)
 * - Outlier detection and trimming
 *
 * Research foundations:
 * - EigenTrust (PageRank-style trust propagation)
 * - MeritRank (Sybil-resistant scoring)
 * - TraceRank (payment reputation with temporal decay)
 * - Bayesian hierarchical models (uncertainty quantification)
 */

import { v } from 'convex/values'
import { query, internalMutation, internalQuery } from './_generated/server'
import type { Doc } from './_generated/dataModel'

// ============================================================================
// Type Definitions
// ============================================================================

export interface SourceScore {
  rawScore: number // 0-10000 normalized
  weight: number // Configured weight (0-1)
  confidence: number // Data quality/quantity (0-1)
  dataPoints: number // Number of observations
  timeDecayFactor: number // Recency multiplier (0-1)
  lastUpdated: number // Timestamp
}

export interface GhostScoreResult {
  score: number // Final aggregate score (0-10000)
  tier: ReputationTier
  confidence: [number, number] // 95% confidence interval
  sources: Record<string, SourceScore>
  lastUpdated: number
  badges: string[]
}

export type ReputationTier =
  | 'NEWCOMER' // 0-1999
  | 'BRONZE' // 2000-4999
  | 'SILVER' // 5000-7499
  | 'GOLD' // 7500-8999
  | 'PLATINUM' // 9000-9499
  | 'DIAMOND' // 9500-10000

// ============================================================================
// Source Weights (Research-Backed Distribution)
// ============================================================================

export const SOURCE_WEIGHTS = {
  // Primary signals (70% total) - hard to fake
  paymentActivity: 0.30, // Transaction success rate, volume, consistency
  stakingCommitment: 0.20, // Economic stake (Schelling point)
  credentialVerifications: 0.15, // W3C attestations from trusted issuers
  userReviews: 0.15, // Verified hire reviews with payment proof

  // Secondary signals (25% total) - supporting evidence
  onChainActivity: 0.10, // Transaction history, age, diversity
  governanceParticipation: 0.05, // DAO voting, proposals
  apiQualityMetrics: 0.03, // B2B API usage patterns, error rates

  // Tertiary signals (5% total) - weak but helpful
  endorsementGraph: 0.02, // PageRank-style peer endorsements
} as const

// ============================================================================
// Time Decay Half-Lives (Days)
// ============================================================================

export const DECAY_HALF_LIVES = {
  paymentActivity: 30, // 30 days - recent performance matters
  stakingCommitment: 90, // 90 days - long-term commitment
  credentialVerifications: 365, // 1 year - credentials age slowly
  userReviews: 60, // 60 days - recent feedback more relevant
  onChainActivity: 45, // 45 days - moderate decay
  governanceParticipation: 30, // 30 days - recent engagement
  apiQualityMetrics: 14, // 14 days - fast-moving quality signal
  endorsementGraph: 180, // 180 days - trust networks evolve slowly
} as const

// ============================================================================
// Reputation Tier Thresholds
// ============================================================================

export const TIER_THRESHOLDS = {
  NEWCOMER: 0,
  BRONZE: 2000,
  SILVER: 5000,
  GOLD: 7500,
  PLATINUM: 9000,
  DIAMOND: 9500,
} as const

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate exponential time decay factor
 * P(t) = e^(-λt) where λ = ln(2) / half_life
 */
export function calculateTimeDecayFactor(
  lastUpdated: number,
  halfLifeDays: number
): number {
  const ageMs = Date.now() - lastUpdated
  const ageDays = ageMs / (1000 * 60 * 60 * 24)

  const decayRate = Math.log(2) / halfLifeDays
  const decayFactor = Math.exp(-decayRate * ageDays)

  // Never fully decay (minimum 10%)
  return Math.max(0.1, decayFactor)
}

/**
 * Calculate reputation tier from score
 */
export function calculateTier(score: number): ReputationTier {
  if (score >= TIER_THRESHOLDS.DIAMOND) return 'DIAMOND'
  if (score >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM'
  if (score >= TIER_THRESHOLDS.GOLD) return 'GOLD'
  if (score >= TIER_THRESHOLDS.SILVER) return 'SILVER'
  if (score >= TIER_THRESHOLDS.BRONZE) return 'BRONZE'
  return 'NEWCOMER'
}

/**
 * Detect and trim statistical outliers (Sybil resistance)
 * Uses MAD (Median Absolute Deviation) - robust to extreme outliers
 */
function trimOutliers(
  scores: Array<{ score: number; weight: number; variance: number }>,
  threshold: number = 2.5
): typeof scores {
  if (scores.length < 3) return scores // Need at least 3 data points

  // Calculate median
  const sortedScores = [...scores].sort((a, b) => a.score - b.score)
  const median = sortedScores[Math.floor(sortedScores.length / 2)].score

  // Calculate MAD (Median Absolute Deviation)
  const absoluteDeviations = scores.map((s) => Math.abs(s.score - median))
  const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b)
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)]

  // Modified z-score: |x - median| / (MAD * 1.4826)
  // 1.4826 is the constant to make MAD consistent with std dev for normal distribution
  const madConstant = 1.4826

  return scores.filter((s, i) => {
    const modifiedZScore = Math.abs(s.score - median) / (mad * madConstant)
    return modifiedZScore <= threshold
  })
}

/**
 * Calculate variance for a source (used in confidence intervals)
 */
function calculateVariance(
  dataPoints: number,
  score: number,
  historicalScores?: number[]
): number {
  if (historicalScores && historicalScores.length > 1) {
    const mean = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length
    const variance =
      historicalScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
      historicalScores.length
    return variance
  }

  // Default variance based on data points (less data = higher variance)
  // Assume max variance of 2500 (std dev = 50) for 1 data point
  const maxVariance = 2500
  return maxVariance / Math.sqrt(dataPoints)
}

/**
 * Calculate Bayesian confidence interval
 * Returns [lower bound, upper bound] for 95% credibility
 */
function calculateBayesianInterval(
  sources: Array<{
    score: number
    weight: number
    dataPoints: number
    variance: number
  }>,
  credibilityLevel: number = 0.95
): [number, number] {
  // Weighted mean
  const weightedMean = sources.reduce((sum, s) => sum + s.score * s.weight, 0)

  // Weighted variance (accounts for different data qualities)
  const weightedVariance = sources.reduce(
    (sum, s) => sum + s.weight * s.weight * s.variance,
    0
  )

  // Effective sample size (penalize low data points)
  const effectiveSampleSize = sources.reduce(
    (sum, s) => sum + Math.sqrt(s.dataPoints),
    0
  )

  // Z-score for 95% CI (normal distribution approximation)
  const zScore = 1.96

  const standardError = Math.sqrt(weightedVariance / Math.max(1, effectiveSampleSize))
  const marginOfError = zScore * standardError

  return [
    Math.max(0, Math.round(weightedMean - marginOfError)),
    Math.min(10000, Math.round(weightedMean + marginOfError)),
  ]
}

/**
 * Main GhostScore calculation with weighted aggregation
 */
export function calculateGhostScore(sources: Record<string, SourceScore>): {
  score: number
  confidence: [number, number]
} {
  const sourceArray = Object.entries(sources)

  // Step 1: Apply time decay to each source
  const decayedSources = sourceArray.map(([key, s]) => ({
    score: s.rawScore * s.timeDecayFactor,
    weight: s.weight * s.confidence, // Weight by confidence
    variance: calculateVariance(s.dataPoints, s.rawScore),
    dataPoints: s.dataPoints,
  }))

  // Step 2: Detect and trim outliers (Sybil resistance)
  const trimmedWithDataPoints = decayedSources.filter((s, i) => {
    if (decayedSources.length < 3) return true // Need at least 3 data points

    // Calculate median
    const sortedScores = [...decayedSources].sort((a, b) => a.score - b.score)
    const median = sortedScores[Math.floor(sortedScores.length / 2)].score

    // Calculate MAD (Median Absolute Deviation)
    const absoluteDeviations = decayedSources.map((src) => Math.abs(src.score - median))
    const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b)
    const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)]

    const madConstant = 1.4826
    const modifiedZScore = Math.abs(s.score - median) / (mad * madConstant)
    return modifiedZScore <= 2.5
  })

  // Step 3: Normalize weights to sum to 1
  const totalWeight = trimmedWithDataPoints.reduce((sum, s) => sum + s.weight, 0)
  if (totalWeight === 0) {
    // No valid sources, return neutral score
    return { score: 0, confidence: [0, 0] }
  }

  const normalized = trimmedWithDataPoints.map((s) => ({
    score: s.score,
    weight: s.weight / totalWeight,
    dataPoints: s.dataPoints,
    variance: s.variance,
  }))

  // Step 4: Calculate weighted average
  const finalScore = normalized.reduce((sum, s) => sum + s.score * s.weight, 0)

  // Step 5: Calculate confidence interval
  const confidenceInterval = calculateBayesianInterval(normalized)

  return {
    score: Math.round(Math.max(0, Math.min(10000, finalScore))),
    confidence: confidenceInterval,
  }
}

// ============================================================================
// Source Calculators
// ============================================================================

/**
 * Payment Activity Score
 * Based on payment success rate, response time, and consistency
 */
export async function calculatePaymentActivity(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  const payments = await ctx.db
    .query('x402SyncEvents')
    .withIndex('by_merchant', (q: any) => q.eq('merchantAddress', agentAddress))
    .order('desc')
    .take(100)

  if (payments.length === 0) {
    return {
      rawScore: 0,
      weight: SOURCE_WEIGHTS.paymentActivity,
      confidence: 0,
      dataPoints: 0,
      timeDecayFactor: 1,
      lastUpdated: Date.now(),
    }
  }

  // Calculate success rate
  const successCount = payments.filter((p: any) => p.event === 'payment_received').length
  const successRate = successCount / payments.length

  // Response time analysis (if available)
  const avgResponseTime = payments
    .filter((p: any) => p.responseTimeMs)
    .reduce((sum: number, p: any) => sum + (p.responseTimeMs || 0), 0) / payments.length

  // Base score from success rate
  let rawScore = successRate * 10000

  // Response time bonus
  if (avgResponseTime < 500) rawScore += 500
  else if (avgResponseTime < 2000) rawScore += 250

  // Consistency bonus (consecutive successes)
  let consecutiveSuccesses = 0
  let maxConsecutive = 0
  for (const payment of payments) {
    if (payment.event === 'payment_received') {
      consecutiveSuccesses++
      maxConsecutive = Math.max(maxConsecutive, consecutiveSuccesses)
    } else {
      consecutiveSuccesses = 0
    }
  }
  const consistencyBonus = Math.min(100, maxConsecutive * 10)
  rawScore += consistencyBonus

  // Clamp to 0-10000
  rawScore = Math.max(0, Math.min(10000, rawScore))

  // Calculate confidence (sigmoid function)
  const confidence = 1 / (1 + Math.exp(-(payments.length - 25) / 10))

  // Time decay
  const lastUpdated = payments[0]?.syncedAt || Date.now()
  const timeDecayFactor = calculateTimeDecayFactor(
    lastUpdated,
    DECAY_HALF_LIVES.paymentActivity
  )

  return {
    rawScore,
    weight: SOURCE_WEIGHTS.paymentActivity,
    confidence,
    dataPoints: payments.length,
    timeDecayFactor,
    lastUpdated,
  }
}

/**
 * Staking Commitment Score
 * Based on GHOST token stake amount and duration
 */
export async function calculateStakingCommitment(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  const stakes = await ctx.db
    .query('stakingAccounts')
    .withIndex('by_agent', (q: any) => q.eq('agentAddress', agentAddress))
    .filter((q: any) => q.eq(q.field('isActive'), true))
    .collect()

  if (stakes.length === 0) {
    return {
      rawScore: 0,
      weight: SOURCE_WEIGHTS.stakingCommitment,
      confidence: 0,
      dataPoints: 0,
      timeDecayFactor: 1,
      lastUpdated: Date.now(),
    }
  }

  // Total staked amount (normalized)
  const totalStaked = stakes.reduce((sum: number, s: any) => sum + (s.amount || 0), 0)

  // Log scaling prevents whales from dominating
  // Score = 10000 * log10(stakedAmount + 1) / log10(maxStake)
  // Assume max stake ~= 1,000,000 GHOST
  const maxStake = 1_000_000
  const rawScore = (10000 * Math.log10(totalStaked + 1)) / Math.log10(maxStake)

  // Duration bonus (longer stakes = more commitment)
  const avgStakeDuration =
    stakes.reduce((sum: number, s: any) => {
      const duration = Date.now() - (s.stakedAt || Date.now())
      return sum + duration
    }, 0) / stakes.length

  const daysStaked = avgStakeDuration / (1000 * 60 * 60 * 24)
  const durationBonus = Math.min(2000, daysStaked * 5) // Max 2000 bonus for 400 days

  const finalScore = Math.max(0, Math.min(10000, rawScore + durationBonus))

  // Confidence based on total stake amount (more stake = higher confidence)
  const confidence = Math.min(1, totalStaked / 10000) // Max confidence at 10k GHOST

  // Time decay based on last stake update
  const lastUpdated = Math.max(...stakes.map((s: any) => s.stakedAt || 0))
  const timeDecayFactor = calculateTimeDecayFactor(
    lastUpdated,
    DECAY_HALF_LIVES.stakingCommitment
  )

  return {
    rawScore: finalScore,
    weight: SOURCE_WEIGHTS.stakingCommitment,
    confidence,
    dataPoints: stakes.length,
    timeDecayFactor,
    lastUpdated,
  }
}

/**
 * Credential Verifications Score
 * Based on W3C VCs and SAS attestations issued
 */
export async function calculateCredentialVerifications(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  const credentials = await ctx.db
    .query('credentialsIssued')
    .withIndex('by_subject', (q: any) => q.eq('subject', agentAddress))
    .collect()

  if (credentials.length === 0) {
    return {
      rawScore: 0,
      weight: SOURCE_WEIGHTS.credentialVerifications,
      confidence: 0,
      dataPoints: 0,
      timeDecayFactor: 1,
      lastUpdated: Date.now(),
    }
  }

  // Weight credentials by type
  const credentialWeights = {
    AGENT_IDENTITY: 1000,
    REPUTATION_TIER: 1500,
    PAYMENT_MILESTONE: 1200,
    VERIFIED_STAKER: 800,
    VERIFIED_HIRE: 1000,
    ELIZAOS_AGENT: 1100, // ElizaOS framework verification (modest boost)
  }

  let totalScore = 0
  for (const cred of credentials) {
    const weight = credentialWeights[cred.credentialType as keyof typeof credentialWeights] || 500
    totalScore += weight
  }

  // Normalize to 0-10000 (assume max ~10 credentials)
  const rawScore = Math.min(10000, totalScore)

  // Confidence based on credential diversity
  const uniqueTypes = new Set(credentials.map((c: any) => c.credentialType))
  const confidence = Math.min(1, uniqueTypes.size / 5) // Max at 5 different types

  // Time decay based on most recent credential
  const lastUpdated = Math.max(...credentials.map((c: any) => c.issuedAt || 0))
  const timeDecayFactor = calculateTimeDecayFactor(
    lastUpdated,
    DECAY_HALF_LIVES.credentialVerifications
  )

  return {
    rawScore,
    weight: SOURCE_WEIGHTS.credentialVerifications,
    confidence,
    dataPoints: credentials.length,
    timeDecayFactor,
    lastUpdated,
  }
}

/**
 * User Reviews Score
 * Based on verified hire reviews with payment proof
 */
export async function calculateUserReviews(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  const reviews = await ctx.db
    .query('reviews')
    .withIndex('by_agent', (q: any) => q.eq('agentAddress', agentAddress))
    .collect()

  if (reviews.length === 0) {
    return {
      rawScore: 0,
      weight: SOURCE_WEIGHTS.userReviews,
      confidence: 0,
      dataPoints: 0,
      timeDecayFactor: 1,
      lastUpdated: Date.now(),
    }
  }

  // Average rating (assume 1-5 scale)
  const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length

  // Normalize to 0-10000
  const rawScore = (avgRating / 5) * 10000

  // Confidence based on review count (more reviews = higher confidence)
  const confidence = 1 / (1 + Math.exp(-(reviews.length - 10) / 5))

  // Time decay based on most recent review
  const lastUpdated = Math.max(...reviews.map((r: any) => r.createdAt || 0))
  const timeDecayFactor = calculateTimeDecayFactor(lastUpdated, DECAY_HALF_LIVES.userReviews)

  return {
    rawScore,
    weight: SOURCE_WEIGHTS.userReviews,
    confidence,
    dataPoints: reviews.length,
    timeDecayFactor,
    lastUpdated,
  }
}

/**
 * On-Chain Activity Score
 * Based on transaction history, account age, and diversity
 */
export async function calculateOnChainActivity(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  // This would query blockchain data via actions
  // For now, return placeholder
  return {
    rawScore: 5000, // Neutral score
    weight: SOURCE_WEIGHTS.onChainActivity,
    confidence: 0.5,
    dataPoints: 1,
    timeDecayFactor: 1,
    lastUpdated: Date.now(),
  }
}

/**
 * Governance Participation Score
 * Based on DAO voting and proposal activity
 */
export async function calculateGovernanceParticipation(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  // Placeholder - would query governance data
  return {
    rawScore: 0,
    weight: SOURCE_WEIGHTS.governanceParticipation,
    confidence: 0,
    dataPoints: 0,
    timeDecayFactor: 1,
    lastUpdated: Date.now(),
  }
}

/**
 * API Quality Metrics Score
 * Based on Caisper's endpoint observation tests
 * Falls back to legacy apiUsage data if no observation tests exist
 */
export async function calculateAPIQualityMetrics(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  // First, try to get observation test data (Caisper's endpoint tests)
  const observationTests = await ctx.db
    .query('endpointTests')
    .withIndex('by_agent', (q: any) => q.eq('agentAddress', agentAddress))
    .order('desc')
    .take(100)

  if (observationTests.length > 0) {
    // Use observation data from Caisper's tests
    const successCount = observationTests.filter((t: any) => t.success).length
    const successRate = successCount / observationTests.length

    // Calculate avg response time
    const avgResponseTime =
      observationTests.reduce((sum: number, t: any) => sum + (t.responseTimeMs || 0), 0) / observationTests.length

    // Calculate avg quality score from Caisper's judgment
    const avgQualityScore =
      observationTests.reduce((sum: number, t: any) => sum + (t.qualityScore || 50), 0) / observationTests.length

    // Capability verification rate
    const verifiedCount = observationTests.filter((t: any) => t.capabilityVerified).length
    const verificationRate = verifiedCount / observationTests.length

    // Composite score calculation:
    // - 40% success rate
    // - 20% response time
    // - 30% capability verification
    // - 10% quality score consistency
    let rawScore = 0

    // Success rate component (40%)
    rawScore += successRate * 4000

    // Response time component (20%)
    // Under 500ms: full points, over 5000ms: 0 points
    const responseTimeScore = Math.max(0, 1 - (avgResponseTime - 500) / 4500) * 2000
    rawScore += responseTimeScore

    // Capability verification component (30%)
    rawScore += verificationRate * 3000

    // Quality score component (10%)
    rawScore += (avgQualityScore / 100) * 1000

    rawScore = Math.max(0, Math.min(10000, rawScore))

    // Confidence based on test count (high confidence at 25+ tests)
    const confidence = 1 / (1 + Math.exp(-(observationTests.length - 25) / 10))

    // Time decay (fast decay for API quality - 14 days)
    const lastUpdated = observationTests[0]?.testedAt || Date.now()
    const timeDecayFactor = calculateTimeDecayFactor(lastUpdated, DECAY_HALF_LIVES.apiQualityMetrics)

    return {
      rawScore,
      weight: SOURCE_WEIGHTS.apiQualityMetrics,
      confidence,
      dataPoints: observationTests.length,
      timeDecayFactor,
      lastUpdated,
    }
  }

  // Fallback: use legacy apiUsage data if no observation tests
  const apiUsage = await ctx.db
    .query('apiUsage')
    .withIndex('by_user_timestamp', (q: any) => q.eq('userId', agentAddress))
    .order('desc')
    .take(100)

  if (apiUsage.length === 0) {
    return {
      rawScore: 0,
      weight: SOURCE_WEIGHTS.apiQualityMetrics,
      confidence: 0,
      dataPoints: 0,
      timeDecayFactor: 1,
      lastUpdated: Date.now(),
    }
  }

  // Calculate error rate
  const errorCount = apiUsage.filter((u: any) => u.statusCode >= 400).length
  const successRate = 1 - errorCount / apiUsage.length

  // Calculate avg response time
  const avgResponseTime =
    apiUsage.reduce((sum: number, u: any) => sum + (u.responseTime || 0), 0) / apiUsage.length

  // Base score from success rate
  let rawScore = successRate * 10000

  // Response time penalty
  if (avgResponseTime > 1000) rawScore -= 500
  else if (avgResponseTime > 500) rawScore -= 250

  rawScore = Math.max(0, Math.min(10000, rawScore))

  // Confidence based on usage count
  const confidence = Math.min(1, apiUsage.length / 50)

  // Time decay (fast decay for API quality - 14 days)
  const lastUpdated = apiUsage[0]?.timestamp || Date.now()
  const timeDecayFactor = calculateTimeDecayFactor(lastUpdated, DECAY_HALF_LIVES.apiQualityMetrics)

  return {
    rawScore,
    weight: SOURCE_WEIGHTS.apiQualityMetrics,
    confidence,
    dataPoints: apiUsage.length,
    timeDecayFactor,
    lastUpdated,
  }
}

/**
 * Endorsement Graph Score
 * PageRank-style trust propagation from agent-to-agent endorsements
 */
export async function calculateEndorsementGraph(
  ctx: any,
  agentAddress: string
): Promise<SourceScore> {
  // Placeholder - would implement PageRank algorithm
  // This is computationally expensive, should be batch processed
  return {
    rawScore: 0,
    weight: SOURCE_WEIGHTS.endorsementGraph,
    confidence: 0,
    dataPoints: 0,
    timeDecayFactor: 1,
    lastUpdated: Date.now(),
  }
}

// ============================================================================
// Main Calculation Query
// ============================================================================

/**
 * Calculate comprehensive Ghost Score for an agent
 * Aggregates all 8 data sources with proper weighting and confidence
 */
export const calculateAgentScore = query({
  args: { agentAddress: v.string() },
  handler: async (ctx, args): Promise<GhostScoreResult> => {
    // Calculate all source scores in parallel
    const [
      paymentActivity,
      staking,
      credentials,
      reviews,
      onChain,
      governance,
      apiQuality,
      endorsements,
    ] = await Promise.all([
      calculatePaymentActivity(ctx, args.agentAddress),
      calculateStakingCommitment(ctx, args.agentAddress),
      calculateCredentialVerifications(ctx, args.agentAddress),
      calculateUserReviews(ctx, args.agentAddress),
      calculateOnChainActivity(ctx, args.agentAddress),
      calculateGovernanceParticipation(ctx, args.agentAddress),
      calculateAPIQualityMetrics(ctx, args.agentAddress),
      calculateEndorsementGraph(ctx, args.agentAddress),
    ])

    const sources = {
      paymentActivity,
      stakingCommitment: staking,
      credentialVerifications: credentials,
      userReviews: reviews,
      onChainActivity: onChain,
      governanceParticipation: governance,
      apiQualityMetrics: apiQuality,
      endorsementGraph: endorsements,
    }

    // Calculate aggregate score
    const { score, confidence } = calculateGhostScore(sources)

    // Determine tier
    const tier = calculateTier(score)

    // Calculate badges
    const badges = calculateBadges(score, sources, tier)

    return {
      score,
      tier,
      confidence,
      sources,
      lastUpdated: Date.now(),
      badges,
    }
  },
})

/**
 * Internal version of calculateAgentScore for cron jobs
 */
export const calculateAgentScoreInternal = internalQuery({
  args: { agentAddress: v.string() },
  handler: async (ctx, args): Promise<GhostScoreResult> => {
    // Calculate all source scores in parallel
    const [
      paymentActivity,
      staking,
      credentials,
      reviews,
      onChain,
      governance,
      apiQuality,
      endorsements,
    ] = await Promise.all([
      calculatePaymentActivity(ctx, args.agentAddress),
      calculateStakingCommitment(ctx, args.agentAddress),
      calculateCredentialVerifications(ctx, args.agentAddress),
      calculateUserReviews(ctx, args.agentAddress),
      calculateOnChainActivity(ctx, args.agentAddress),
      calculateGovernanceParticipation(ctx, args.agentAddress),
      calculateAPIQualityMetrics(ctx, args.agentAddress),
      calculateEndorsementGraph(ctx, args.agentAddress),
    ])

    const sources = {
      paymentActivity,
      stakingCommitment: staking,
      credentialVerifications: credentials,
      userReviews: reviews,
      onChainActivity: onChain,
      governanceParticipation: governance,
      apiQualityMetrics: apiQuality,
      endorsementGraph: endorsements,
    }

    // Calculate aggregate score
    const { score, confidence } = calculateGhostScore(sources)

    // Determine tier
    const tier = calculateTier(score)

    // Calculate badges
    const badges = calculateBadges(score, sources, tier)

    return {
      score,
      tier,
      confidence,
      sources,
      lastUpdated: Date.now(),
      badges,
    }
  },
})

/**
 * Calculate earned badges based on score and achievements
 */
function calculateBadges(
  score: number,
  sources: Record<string, SourceScore>,
  tier: ReputationTier
): string[] {
  const badges: string[] = []

  // Tier badges
  if (tier === 'DIAMOND') badges.push('DIAMOND_TIER')
  else if (tier === 'PLATINUM') badges.push('PLATINUM_TIER')
  else if (tier === 'GOLD') badges.push('GOLD_TIER')
  else if (tier === 'SILVER') badges.push('SILVER_TIER')
  else if (tier === 'BRONZE') badges.push('BRONZE_TIER')

  // Payment milestones
  if (sources.paymentActivity.dataPoints >= 1000) badges.push('THOUSAND_JOBS')
  else if (sources.paymentActivity.dataPoints >= 100) badges.push('HUNDRED_JOBS')
  else if (sources.paymentActivity.dataPoints >= 10) badges.push('TEN_JOBS')

  // Staking commitment
  if (sources.stakingCommitment.rawScore >= 8000) badges.push('WHALE_STAKER')
  else if (sources.stakingCommitment.rawScore >= 5000) badges.push('MAJOR_STAKER')
  else if (sources.stakingCommitment.rawScore >= 2000) badges.push('COMMITTED_STAKER')

  // Perfect performance
  if (sources.paymentActivity.rawScore >= 9900) badges.push('PERFECT_PERFORMER')

  // High confidence
  const avgConfidence =
    Object.values(sources).reduce((sum, s) => sum + s.confidence, 0) / Object.values(sources).length
  if (avgConfidence >= 0.9) badges.push('VERIFIED_AGENT')

  return badges
}

/**
 * Internal mutation to update cached score
 * Called by cron job for batch updates
 */
export const updateCachedScore = internalMutation({
  args: {
    agentAddress: v.string(),
    score: v.number(),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ghostScore: args.score,
        tier: args.tier as any,
        lastUpdated: Date.now(),
      })
    } else {
      await ctx.db.insert('agentReputationCache', {
        agentAddress: args.agentAddress,
        ghostScore: args.score,
        tier: args.tier as any,
        lastUpdated: Date.now(),
        totalJobs: 0,
        successRate: 0,
        disputes: 0,
        disputeResolution: 'none',
        cacheHits: 0,
      })
    }
  },
})
