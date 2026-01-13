/**
 * Users Module
 *
 * Granular queries for user data, designed to replace the monolithic getUserDashboard.
 * Allows for progressive loading of UI components.
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import {
  calculateEctoScore,
  calculateGhosthunterScore,
  getEctoScoreTier,
  getGhosthunterScoreTier,
} from './lib/scoring'

/**
 * Ensure user exists - create if not found, update lastActive if exists
 * Call this from the frontend when a wallet connects
 */
export const ensureUser = mutation({
  args: {
    walletAddress: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    const now = Date.now()

    if (existing) {
      // Update last active time and optional metadata
      await ctx.db.patch(existing._id, {
        lastActiveAt: now,
        ...(args.email && { email: args.email }),
        ...(args.name && { name: args.name }),
      })
      return { userId: existing._id, isNew: false }
    }

    // Create new user
    const userId = await ctx.db.insert('users', {
      walletAddress: args.walletAddress,
      email: args.email,
      name: args.name,
      createdAt: now,
      lastActiveAt: now,
    })

    return { userId, isNew: true }
  },
})

/**
 * Get basic user profile
 */
export const getProfile = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) return null

    return {
      _id: user._id,
      walletAddress: user.walletAddress,
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      onboardingCompleted: user.onboardingCompleted,
    }
  },
})

/**
 * Get user stats (counts, spend, streak)
 */
export const getStats = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) return null

    // Get counts
    const totalVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const totalPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .collect()

    // Monthly stats
    // Monthly stats (UTC-based for consistency with DB)
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const monthStart = startOfMonth.getTime()

    const verificationsThisMonth = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q) => q.eq('userId', user._id).gte('timestamp', monthStart))
      .collect()

    // API calls this month
    const apiKeys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const usagePromises = apiKeys.map((apiKey: any) =>
      ctx.db
        .query('apiUsage')
        .withIndex('by_api_key_timestamp', (q) =>
          q.eq('apiKeyId', apiKey._id).gte('timestamp', monthStart)
        )
        .collect()
    )

    const usageResults = await Promise.all(usagePromises)
    const apiCallsThisMonth = usageResults.reduce((acc, usage) => acc + usage.length, 0)

    // Free verifications calculation
    const freeVerificationsUsed = verificationsThisMonth.filter(
      (v) => v.paymentMethod === 'free'
    ).length
    const freeVerificationsRemaining = Math.max(0, 3 - freeVerificationsUsed)

    return {
      totalVerifications: totalVerifications.length,
      totalTransactions: totalPayments.length,
      verificationsThisMonth: verificationsThisMonth.length,
      freeVerificationsRemaining,
      apiCallsThisMonth,
      totalSpent: user.totalSpent || 0,
      streak: {
        current: user.currentStreak || 0,
        longest: user.longestStreak || 0,
        lastActiveDate: user.lastActivityDate,
      },
    }
  },
})

/**
 * Get refined reputation scores (Ecto & Ghosthunter)
 */
export const getReputation = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) return null

    const now = Date.now()

    // 1. Determine Roles
    const claimedAgents = await ctx.db
      .query('discoveredAgents')
      .filter((q) => q.eq(q.field('claimedBy'), args.walletAddress))
      .collect()
    const isAgentDeveloper = claimedAgents.length > 0

    const totalVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const completedPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .collect()

    const isCustomer = totalVerifications.length > 0 || completedPayments.length > 0

    // 2. Calculate Ecto Score (Developer)
    let ecto = null
    if (isAgentDeveloper) {
      // Use persisted score if available (and recently updated? - for now just use it)
      if (user.ectoScore !== undefined && user.ectoTier) {
        ecto = {
          score: user.ectoScore,
          tier: user.ectoTier,
          agentsRegistered: claimedAgents.length,
        }
      } else {
        // Fallback: On-the-fly calculation
        let totalAgentGhostScore = 0
        let totalAgentJobs = 0

        for (const agent of claimedAgents) {
          const reputationData = await ctx.db
            .query('agentReputationCache')
            .withIndex('by_address', (q) => q.eq('agentAddress', agent.ghostAddress))
            .first()

          if (reputationData) {
            totalAgentGhostScore += reputationData.ghostScore
            totalAgentJobs += reputationData.totalJobs
          }
        }

        const observationVotes = await ctx.db
          .query('observationVotes')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect()

        const score = calculateEctoScore({
          agentsRegistered: claimedAgents.length,
          totalAgentGhostScore,
          totalAgentJobs,
          accountAge: now - user.createdAt,
          votesCast: observationVotes.length,
        })

        ecto = {
          score,
          tier: getEctoScoreTier(score),
          agentsRegistered: claimedAgents.length,
        }
      }
    }

    // 3. Calculate Ghosthunter Score (Customer)
    let ghosthunter = null
    if (isCustomer) {
      if (user.ghosthunterScore !== undefined && user.ghosthunterTier) {
        ghosthunter = {
          score: user.ghosthunterScore,
          tier: user.ghosthunterTier,
          verifiedCount: totalVerifications.length,
        }
      } else {
        const userReviews = await ctx.db
          .query('reviews')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect()

        const score = calculateGhosthunterScore({
          totalVerifications: totalVerifications.length,
          totalPayments: completedPayments.length,
          reviewsWritten: userReviews.length,
          accountAge: now - user.createdAt,
          boost: user.ghosthunterScore || 0,
        })

        ghosthunter = {
          score,
          tier: getGhosthunterScoreTier(score),
          verifiedCount: totalVerifications.length,
        }
      }
    }

    return {
      roles: { isAgentDeveloper, isCustomer },
      ecto,
      ghosthunter,
    }
  },
})

/**
 * Get recent activity feed
 */
export const getActivity = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) return []

    const activity: Array<{
      type: string
      description: string
      timestamp: number
      status?: string
      transactionSignature?: string
    }> = []

    // Recent Verifications
    const recentVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(5)

    for (const v of recentVerifications) {
      activity.push({
        type: 'VERIFICATION',
        description: `Verified agent ${v.agentAddress.slice(0, 8)}...`,
        timestamp: v.timestamp,
        status: v.tier,
        transactionSignature: v.paymentSignature,
      })
    }

    // Recent Payments
    const recentPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(5)

    for (const p of recentPayments) {
      activity.push({
        type: 'PAYMENT',
        description: `${p.status === 'completed' ? 'Paid' : 'Pending'} $${p.amount} to ${p.resourceName}`,
        timestamp: p.createdAt,
        status: p.status,
        transactionSignature: p.transactionSignature,
      })
    }

    return activity.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
  },
})

/**
 * Internal mutation to calculate and persist user reputation scores
 * Used by cron jobs and event triggers
 */
export const updateUserReputation = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return

    const now = Date.now()

    // 1. Determine Roles
    const claimedAgents = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_claimed_by', (q) => q.eq('claimedBy', user.walletAddress))
      .collect()

    const isAgentDeveloper = claimedAgents.length > 0

    const totalVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const completedPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .collect()

    const isCustomer = totalVerifications.length > 0 || completedPayments.length > 0

    // 2. Calculate Ecto Score (Developer)
    let ectoScore: number | undefined
    let ectoTier: string | undefined

    if (isAgentDeveloper) {
      let totalAgentGhostScore = 0
      let totalAgentJobs = 0

      for (const agent of claimedAgents) {
        const reputationData = await ctx.db
          .query('agentReputationCache')
          .withIndex('by_address', (q) => q.eq('agentAddress', agent.ghostAddress))
          .first()

        if (reputationData) {
          totalAgentGhostScore += reputationData.ghostScore
          totalAgentJobs += reputationData.totalJobs
        }
      }

      const observationVotes = await ctx.db
        .query('observationVotes')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()

      ectoScore = calculateEctoScore({
        agentsRegistered: claimedAgents.length,
        totalAgentGhostScore,
        totalAgentJobs,
        accountAge: now - user.createdAt,
        votesCast: observationVotes.length,
      })
      ectoTier = getEctoScoreTier(ectoScore)
    }

    // 3. Calculate Ghosthunter Score (Customer)
    let ghosthunterScore: number | undefined
    let ghosthunterTier: string | undefined

    if (isCustomer) {
      const userReviews = await ctx.db
        .query('reviews')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()

      ghosthunterScore = calculateGhosthunterScore({
        totalVerifications: totalVerifications.length,
        totalPayments: completedPayments.length,
        reviewsWritten: userReviews.length,
        accountAge: now - user.createdAt,
        boost: user.ghosthunterScore || 0, // Keep existing boost if any
      })
      ghosthunterTier = getGhosthunterScoreTier(ghosthunterScore)
    }

    // 4. Persist to Database
    await ctx.db.patch(user._id, {
      isAgentDeveloper,
      isCustomer,
      ectoScore,
      ectoTier,
      ectoScoreLastUpdated: isAgentDeveloper ? now : undefined,
      ghosthunterScore,
      ghosthunterTier,
      ghosthunterScoreLastUpdated: isCustomer ? now : undefined,
    })
  },
})

/**
 * Internal mutation to update ALL user scores (Scheduled Cron)
 * processing batch of users (MVP: limit 100 for now to prevent timeout)
 * TODO: Implement proper paginationcursor for full scan
 */
export const updateAllUserScores = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    // Pagination loop
    const users = await ctx.db
      .query('users')
      .paginate({ cursor: args.cursor || null, numItems: limit })

    for (const user of users.page) {
      await ctx.scheduler.runAfter(0, internal.users.updateUserReputation, { userId: user._id })
    }

    // Recursively schedule next batch if there are more
    if (!users.isDone) {
      await ctx.scheduler.runAfter(0, internal.users.updateAllUserScores, {
        cursor: users.continueCursor,
        limit,
      })
    }
  },
})
