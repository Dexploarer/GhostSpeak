/**
 * Fraud Detection & Anomaly Scoring
 *
 * Detects suspicious patterns in agent behavior:
 * - Wash trading (self-payments)
 * - Rapid payment bursts
 * - Suspicious payment patterns
 * - Fake reviews
 */

import { query, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

/**
 * Calculate fraud risk score for an agent
 */
export const calculateFraudScore = internalQuery({
  args: { agentAddress: v.string() },
  returns: v.object({
    fraudScore: v.number(), // 0-100 (0 = clean, 100 = highly suspicious)
    riskLevel: v.string(), // 'low', 'medium', 'high', 'critical'
    flags: v.array(
      v.object({
        type: v.string(),
        severity: v.string(),
        description: v.string(),
        score: v.number(),
      })
    ),
    recommendation: v.string(),
  }),
  handler: async (ctx, args) => {
    const flags: Array<{ type: string; severity: string; description: string; score: number }> = []
    let fraudScore = 0

    // Get agent payment history
    const payments = await ctx.db
      .query('x402SyncEvents')
      .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.agentAddress))
      .collect()

    if (payments.length === 0) {
      return {
        fraudScore: 0,
        riskLevel: 'low',
        flags: [],
        recommendation: 'No payment history available',
      }
    }

    // 1. Check for wash trading (same payer making many payments)
    const payerCounts = new Map<string, number>()
    payments.forEach((p) => {
      payerCounts.set(p.payerAddress, (payerCounts.get(p.payerAddress) || 0) + 1)
    })

    const maxPayerCount = Math.max(...payerCounts.values())
    const maxPayerPercentage = (maxPayerCount / payments.length) * 100

    if (maxPayerPercentage > 80) {
      const flagScore = 40
      fraudScore += flagScore
      flags.push({
        type: 'wash_trading',
        severity: 'critical',
        description: `${maxPayerPercentage.toFixed(1)}% of payments from single payer (potential wash trading)`,
        score: flagScore,
      })
    } else if (maxPayerPercentage > 60) {
      const flagScore = 25
      fraudScore += flagScore
      flags.push({
        type: 'concentrated_payer',
        severity: 'high',
        description: `${maxPayerPercentage.toFixed(1)}% of payments from single payer (concentrated activity)`,
        score: flagScore,
      })
    }

    // 2. Check for rapid payment bursts (more than 10 payments in 1 hour)
    const sortedPayments = [...payments].sort((a, b) => a.syncedAt - b.syncedAt)
    const oneHour = 60 * 60 * 1000

    let maxBurstSize = 0
    let currentBurstStart = 0
    let currentBurstSize = 0

    for (let i = 0; i < sortedPayments.length; i++) {
      if (i === 0) {
        currentBurstStart = sortedPayments[i].syncedAt
        currentBurstSize = 1
      } else {
        const timeDiff = sortedPayments[i].syncedAt - currentBurstStart
        if (timeDiff <= oneHour) {
          currentBurstSize++
        } else {
          maxBurstSize = Math.max(maxBurstSize, currentBurstSize)
          currentBurstStart = sortedPayments[i].syncedAt
          currentBurstSize = 1
        }
      }
    }
    maxBurstSize = Math.max(maxBurstSize, currentBurstSize)

    if (maxBurstSize > 50) {
      const flagScore = 30
      fraudScore += flagScore
      flags.push({
        type: 'rapid_burst',
        severity: 'critical',
        description: `${maxBurstSize} payments in 1 hour (abnormal burst activity)`,
        score: flagScore,
      })
    } else if (maxBurstSize > 20) {
      const flagScore = 15
      fraudScore += flagScore
      flags.push({
        type: 'high_burst',
        severity: 'medium',
        description: `${maxBurstSize} payments in 1 hour (high burst activity)`,
        score: flagScore,
      })
    }

    // 3. Check for suspicious payment amounts (all same amount)
    const amountCounts = new Map<string, number>()
    payments.forEach((p) => {
      amountCounts.set(p.amount, (amountCounts.get(p.amount) || 0) + 1)
    })

    const maxAmountCount = Math.max(...amountCounts.values())
    const maxAmountPercentage = (maxAmountCount / payments.length) * 100

    if (maxAmountPercentage > 90 && payments.length > 20) {
      const flagScore = 20
      fraudScore += flagScore
      flags.push({
        type: 'uniform_amounts',
        severity: 'high',
        description: `${maxAmountPercentage.toFixed(1)}% of payments are identical amounts (potential bot activity)`,
        score: flagScore,
      })
    }

    // 4. Check failure rate anomaly (too perfect or too bad)
    const successCount = payments.filter((p) => p.success).length
    const successRate = (successCount / payments.length) * 100

    if (payments.length > 50) {
      if (successRate === 100) {
        const flagScore = 15
        fraudScore += flagScore
        flags.push({
          type: 'perfect_success',
          severity: 'medium',
          description: '100% success rate over 50+ payments (unnaturally perfect)',
          score: flagScore,
        })
      } else if (successRate < 20) {
        const flagScore = 10
        fraudScore += flagScore
        flags.push({
          type: 'low_success',
          severity: 'medium',
          description: `${successRate.toFixed(1)}% success rate (poor service quality)`,
          score: flagScore,
        })
      }
    }

    // 5. Check for reputation gaming (rapid score increase with few unique payers)
    const uniquePayers = payerCounts.size
    const paymentToPayerRatio = payments.length / uniquePayers

    if (paymentToPayerRatio > 100 && payments.length > 200) {
      const flagScore = 25
      fraudScore += flagScore
      flags.push({
        type: 'reputation_gaming',
        severity: 'critical',
        description: `${paymentToPayerRatio.toFixed(1)} payments per unique payer (likely reputation farming)`,
        score: flagScore,
      })
    }

    // Calculate risk level
    let riskLevel: string
    let recommendation: string

    if (fraudScore >= 75) {
      riskLevel = 'critical'
      recommendation =
        'SUSPEND ACCOUNT - Multiple critical fraud indicators detected. Manual review required.'
    } else if (fraudScore >= 50) {
      riskLevel = 'high'
      recommendation =
        'FLAG FOR REVIEW - Significant suspicious activity detected. Monitor closely and investigate.'
    } else if (fraudScore >= 25) {
      riskLevel = 'medium'
      recommendation =
        'MONITOR - Some anomalous patterns detected. Continue monitoring for escalation.'
    } else {
      riskLevel = 'low'
      recommendation = 'NORMAL - No significant fraud indicators detected.'
    }

    return {
      fraudScore: Math.min(100, fraudScore),
      riskLevel,
      flags,
      recommendation,
    }
  },
})

/**
 * Get agents with high fraud scores
 */
export const getHighRiskAgents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      agentAddress: v.string(),
      fraudScore: v.number(),
      riskLevel: v.string(),
      totalPayments: v.number(),
      flagCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 50

    // Get all agents with reputation
    const agents = await ctx.db.query('agentReputationCache').collect()

    const riskAssessments: Array<{
      agentAddress: string
      fraudScore: number
      riskLevel: string
      totalPayments: number
      flagCount: number
    }> = []

    // Calculate fraud score for each agent
    for (const agent of agents) {
      const fraudAnalysis = await ctx.runQuery(internal.fraudDetection.calculateFraudScore, {
        agentAddress: agent.agentAddress,
      })

      if (fraudAnalysis.fraudScore >= 25) {
        // Only include medium+ risk
        riskAssessments.push({
          agentAddress: agent.agentAddress,
          fraudScore: fraudAnalysis.fraudScore,
          riskLevel: fraudAnalysis.riskLevel,
          totalPayments: agent.totalJobs,
          flagCount: fraudAnalysis.flags.length,
        })
      }
    }

    // Sort by fraud score descending
    return riskAssessments.sort((a, b) => b.fraudScore - a.fraudScore).slice(0, limit)
  },
})

/**
 * Check for review fraud
 */
export const checkReviewFraud = query({
  args: { agentAddress: v.string() },
  returns: v.object({
    suspiciousReviews: v.number(),
    flags: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    let suspiciousReviews = 0
    const flags: string[] = []

    if (reviews.length === 0) {
      return { suspiciousReviews: 0, flags: [] }
    }

    // Check for fake verified hires (claimed verified but no transaction)
    const fakeVerified = reviews.filter((r) => r.verifiedHire && !r.transactionSignature).length
    if (fakeVerified > 0) {
      suspiciousReviews += fakeVerified
      flags.push(`${fakeVerified} reviews claim verified hire without transaction proof`)
    }

    // Check for all 5-star reviews
    const fiveStarReviews = reviews.filter((r) => r.rating === 5).length
    const fiveStarPercentage = (fiveStarReviews / reviews.length) * 100
    if (fiveStarPercentage === 100 && reviews.length > 10) {
      suspiciousReviews += reviews.length
      flags.push(`100% of reviews are 5-star (${reviews.length} reviews) - unnaturally perfect`)
    }

    // Check for duplicate review text
    const reviewTexts = new Map<string, number>()
    reviews.forEach((r) => {
      const normalized = r.review.toLowerCase().trim()
      reviewTexts.set(normalized, (reviewTexts.get(normalized) || 0) + 1)
    })

    const maxDuplicates = Math.max(...reviewTexts.values())
    if (maxDuplicates > 5) {
      suspiciousReviews += maxDuplicates
      flags.push(`${maxDuplicates} reviews have identical text - likely copy-paste`)
    }

    return {
      suspiciousReviews,
      flags,
    }
  },
})
