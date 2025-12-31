/**
 * PayAI Reputation Update System
 *
 * Shared reputation calculation logic for both:
 * - PayAI webhook events (fast path)
 * - On-chain polling (reliable fallback)
 *
 * This ensures consistent reputation scoring regardless of data source.
 */

import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'

// =====================================================
// REPUTATION CALCULATION
// =====================================================

/**
 * Calculate reputation change from a PayAI payment
 *
 * Enhanced algorithm to prevent gaming and reward consistent performance:
 * - Removed amount multiplier (prevents wash trading)
 * - Added consistency tracking
 * - Balanced success/failure rewards
 */
function calculateReputationChange(payment: {
  amount: string
  success: boolean
  responseTimeMs: number
}): number {
  // Base score from success/failure
  let baseScore = payment.success ? 100 : -200

  // Bonus for fast response (only on success)
  if (payment.success && payment.responseTimeMs > 0) {
    if (payment.responseTimeMs < 500) {
      baseScore += 50
    } else if (payment.responseTimeMs < 2000) {
      baseScore += 25
    } else if (payment.responseTimeMs > 10000) {
      baseScore -= 25
    }
  }

  // NOTE: Removed amount-based multiplier to prevent wash trading
  // All payments count equally regardless of amount

  return Math.round(baseScore)
}

/**
 * Get reputation tier from score
 */
function getReputationTier(score: number): string {
  if (score >= 9000) return 'Platinum'
  if (score >= 7500) return 'Gold'
  if (score >= 5000) return 'Silver'
  if (score >= 2000) return 'Bronze'
  return 'Unranked'
}

// Default starting score (50%)
const DEFAULT_SCORE = 5000

// =====================================================
// REPUTATION UPDATE MUTATION
// =====================================================

/**
 * Update agent reputation from a PayAI payment event
 *
 * Called by:
 * - On-chain polling (x402Actions.ts)
 * - Webhook handler (app/api/payai/webhook/route.ts)
 *
 * This mutation:
 * 1. Fetches current reputation or creates new entry
 * 2. Calculates reputation change based on payment
 * 3. Updates job counters and response time average
 * 4. Saves updated reputation to cache
 * 5. Returns tier milestone info for credential issuance
 */
export const updateFromPayment = internalMutation({
  args: {
    merchantAddress: v.string(),
    paymentSignature: v.string(),
    amount: v.string(), // BigInt as string (in token base units)
    success: v.boolean(),
    responseTimeMs: v.number(),
    timestamp: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    previousScore: v.number(),
    newScore: v.number(),
    reputationChange: v.number(),
    tier: v.string(),
    previousTier: v.string(),
    tierChanged: v.boolean(),
    totalJobs: v.number(),
    successRate: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get or create reputation entry
    let existing = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.merchantAddress))
      .first()

    const previousScore = existing?.ghostScore ?? DEFAULT_SCORE
    const previousTier = existing ? getReputationTier(existing.ghostScore) : 'Unranked'

    // Calculate base reputation change
    let reputationChange = calculateReputationChange({
      amount: args.amount,
      success: args.success,
      responseTimeMs: args.responseTimeMs,
    })

    // Get recent payment history for consistency bonus
    const recentPayments = await ctx.db
      .query('x402SyncEvents')
      .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.merchantAddress))
      .order('desc')
      .take(10)

    // Calculate consistency bonus (consecutive successes)
    if (args.success) {
      let consecutiveSuccesses = 1 // Current payment
      for (const payment of recentPayments) {
        if (!payment.success) break
        consecutiveSuccesses++
      }

      // +10 per consecutive success, max +100 at 10 streak
      const consistencyBonus = Math.min(100, consecutiveSuccesses * 10)
      reputationChange += consistencyBonus

      if (consistencyBonus > 0) {
        console.log('[PayAI Reputation] Consistency bonus:', {
          agent: args.merchantAddress.slice(0, 8),
          streak: consecutiveSuccesses,
          bonus: consistencyBonus,
        })
      }
    }

    // Calculate new score (capped 0-10000)
    const newScore = Math.max(0, Math.min(10000, previousScore + reputationChange))
    const newTier = getReputationTier(newScore)

    // Track successful vs failed jobs
    const prevTotalJobs = existing?.totalJobs ?? 0
    const totalJobs = prevTotalJobs + 1

    // Calculate success rate properly
    const prevSuccessCount = existing ? Math.round((existing.successRate / 100) * prevTotalJobs) : 0
    const newSuccessCount = args.success ? prevSuccessCount + 1 : prevSuccessCount
    const successRate = Math.round((newSuccessCount / totalJobs) * 100)

    // Update average response time (only for successful payments with valid responseTimeMs)
    let avgResponseTime = existing?.avgResponseTime ?? 0
    if (args.success && args.responseTimeMs > 0) {
      const prevAvgResponseTime = existing?.avgResponseTime ?? 0
      avgResponseTime = Math.round(
        (prevAvgResponseTime * prevSuccessCount + args.responseTimeMs) / newSuccessCount
      )
    }

    const now = Date.now()

    if (existing) {
      // Update existing reputation
      await ctx.db.patch(existing._id, {
        ghostScore: newScore,
        tier: newTier,
        successRate,
        avgResponseTime,
        totalJobs,
        lastUpdated: now,
      })

      console.log('[PayAI Reputation] Updated reputation:', {
        agent: args.merchantAddress.slice(0, 8),
        previousScore,
        newScore,
        change: reputationChange,
        tier: newTier,
        tierChanged: newTier !== previousTier,
        successRate: `${successRate}%`,
      })
    } else {
      // Create new reputation entry
      await ctx.db.insert('agentReputationCache', {
        agentAddress: args.merchantAddress,
        ghostScore: newScore,
        tier: newTier,
        successRate,
        avgResponseTime,
        totalJobs,
        disputes: 0,
        disputeResolution: '100%',
        lastUpdated: now,
        cacheHits: 0,
      })

      console.log('[PayAI Reputation] Created new reputation:', {
        agent: args.merchantAddress.slice(0, 8),
        initialScore: newScore,
        tier: newTier,
      })
    }

    // Check for tier milestones and issue credentials
    if (newTier !== previousTier) {
      await ctx.scheduler.runAfter(
        0,
        internal.credentialsOrchestrator.checkAndIssueReputationCredentials,
        {
          agentAddress: args.merchantAddress,
          previousScore,
          newScore,
          totalJobs,
          successRate,
        }
      )
    }

    // Check for payment milestones (10/100/1000 payments)
    const payments = await ctx.db
      .query('x402SyncEvents')
      .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.merchantAddress))
      .filter((q) => q.eq(q.field('success'), true))
      .collect()

    const totalSuccessfulPayments = payments.length
    const totalVolume = payments.reduce((sum, p) => sum + BigInt(p.amount), BigInt(0))

    if (totalSuccessfulPayments >= 10) {
      await ctx.scheduler.runAfter(
        0,
        internal.credentialsOrchestrator.checkAndIssuePaymentMilestoneCredentials,
        {
          agentAddress: args.merchantAddress,
          totalPayments: totalSuccessfulPayments,
          totalVolume: totalVolume.toString(),
          successRate,
        }
      )
    }

    return {
      success: true,
      previousScore,
      newScore,
      reputationChange,
      tier: newTier,
      previousTier,
      tierChanged: newTier !== previousTier,
      totalJobs,
      successRate,
    }
  },
})

/**
 * Get PayAI payment history for an agent
 *
 * Aggregates data from x402SyncEvents
 */
export const getPaymentHistory = internalMutation({
  args: {
    merchantAddress: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    totalPayments: v.number(),
    totalVolume: v.string(),
    last30DaysVolume: v.string(),
    last30DaysCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    // Fetch all payments for this merchant
    const allPayments = await ctx.db
      .query('x402SyncEvents')
      .filter((q) => q.eq(q.field('merchantAddress'), args.merchantAddress))
      .collect()

    const recentPayments = allPayments.filter((p) => p.syncedAt >= thirtyDaysAgo)

    // Calculate totals
    const totalVolume = allPayments.reduce((sum, p) => sum + BigInt(p.amount), BigInt(0))
    const last30DaysVolume = recentPayments.reduce((sum, p) => sum + BigInt(p.amount), BigInt(0))

    return {
      totalPayments: allPayments.length,
      totalVolume: totalVolume.toString(),
      last30DaysVolume: last30DaysVolume.toString(),
      last30DaysCount: recentPayments.length,
    }
  },
})
