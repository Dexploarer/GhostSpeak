/**
 * Dashboard Queries
 *
 * Real-time user dashboard data for GhostSpeak
 */

import { v } from 'convex/values'
import { query } from './_generated/server'

/**
 * Get user dashboard data
 *
 * Returns all relevant metrics for the authenticated user
 */
export const getUserDashboard = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user record
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      return null
    }

    // Get verification count for this month
    const now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthStart = startOfMonth.getTime()

    const verificationsThisMonth = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', user._id).gte('timestamp', monthStart)
      )
      .collect()

    // Get total verifications
    const totalVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    // Get API usage count for this month (if user has API keys)
    const apiKeys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    let apiCallsThisMonth = 0
    for (const apiKey of apiKeys) {
      const usage = await ctx.db
        .query('apiUsage')
        .withIndex('by_api_key_timestamp', (q) =>
          q.eq('apiKeyId', apiKey._id).gte('timestamp', monthStart)
        )
        .collect()
      apiCallsThisMonth += usage.length
    }

    // Get total payments (x402 payments)
    const totalPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const completedPayments = totalPayments.filter((p) => p.status === 'completed')

    // Calculate Ghost Score (simplified - in production, use ghostScoreCalculator)
    // For now, we'll use a basic calculation
    const ghostScore = calculateGhostScore({
      totalVerifications: totalVerifications.length,
      totalPayments: completedPayments.length,
      accountAge: now - user.createdAt,
    })

    // Get staking data
    const stakingAccount = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.walletAddress))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    // Get recent activity (last 10 events)
    const recentActivity = await getRecentActivity(ctx, user._id)

    // Calculate free verifications remaining
    const freeVerificationsUsed = verificationsThisMonth.filter(
      (v) => v.paymentMethod === 'free'
    ).length
    const freeVerificationsRemaining = Math.max(0, 3 - freeVerificationsUsed)

    return {
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      stats: {
        ghostScore,
        tier: getGhostScoreTier(ghostScore),
        verificationsThisMonth: verificationsThisMonth.length,
        freeVerificationsRemaining,
        totalVerifications: totalVerifications.length,
        totalTransactions: completedPayments.length,
        totalSpent: user.totalSpent || 0,
        apiCallsThisMonth,
      },
      staking: stakingAccount
        ? {
            amountStaked: stakingAccount.amountStaked,
            tier: stakingAccount.tier,
            reputationBoostBps: stakingAccount.reputationBoostBps,
            unlockAt: stakingAccount.unlockAt,
            hasVerifiedBadge: stakingAccount.hasVerifiedBadge,
            hasPremiumBenefits: stakingAccount.hasPremiumBenefits,
          }
        : null,
      recentActivity,
    }
  },
})

/**
 * Get recent activity for a user
 */
async function getRecentActivity(ctx: any, userId: string) {
  const activity: Array<{
    type: string
    description: string
    timestamp: number
    status?: string
  }> = []

  // Get recent verifications
  const recentVerifications = await ctx.db
    .query('verifications')
    .withIndex('by_user_timestamp', (q) => q.eq('userId', userId))
    .order('desc')
    .take(5)

  for (const verification of recentVerifications) {
    activity.push({
      type: 'VERIFICATION',
      description: `Verified agent ${verification.agentAddress.slice(0, 8)}...`,
      timestamp: verification.timestamp,
      status: verification.tier,
    })
  }

  // Get recent payments
  const recentPayments = await ctx.db
    .query('payments')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .take(5)

  for (const payment of recentPayments) {
    activity.push({
      type: 'PAYMENT',
      description: `${payment.status === 'completed' ? 'Paid' : 'Pending'} $${payment.amount} to ${payment.resourceName}`,
      timestamp: payment.createdAt,
      status: payment.status,
    })
  }

  // Sort by timestamp and return top 10
  return activity.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
}

/**
 * Simple Ghost Score calculation
 * In production, use the full ghostScoreCalculator
 */
function calculateGhostScore({
  totalVerifications,
  totalPayments,
  accountAge,
}: {
  totalVerifications: number
  totalPayments: number
  accountAge: number
}): number {
  const ageInDays = accountAge / (1000 * 60 * 60 * 24)

  // Base score
  let score = 0

  // Verification points (up to 300 points)
  score += Math.min(totalVerifications * 10, 300)

  // Payment points (up to 400 points)
  score += Math.min(totalPayments * 20, 400)

  // Account age points (up to 200 points)
  score += Math.min(ageInDays * 2, 200)

  // Newcomer floor
  if (score === 0) score = 0

  // Cap at 1000
  return Math.min(Math.round(score), 1000)
}

/**
 * Get Ghost Score tier based on score
 */
function getGhostScoreTier(score: number): string {
  if (score >= 900) return 'PLATINUM'
  if (score >= 750) return 'GOLD'
  if (score >= 500) return 'SILVER'
  if (score >= 250) return 'BRONZE'
  return 'NEWCOMER'
}
