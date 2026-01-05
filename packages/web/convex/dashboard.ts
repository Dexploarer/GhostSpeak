/**
 * Dashboard Queries
 *
 * Real-time user dashboard data for GhostSpeak
 *
 * THREE-TIER REPUTATION SYSTEM:
 * 1. Ghost Score (0-10,000) - AI Agents only (tracked in agentReputationCache)
 * 2. Ecto Score (0-10,000) - Agent Developers (users who build/register agents)
 * 3. Ghosthunter Score (0-10,000) - Customers (users who verify/use agents)
 *
 * Users can have BOTH Ecto and Ghosthunter scores if they're both a developer AND customer.
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── TIER DEFINITIONS ─────────────────────────────────────────────────────────

// Ecto Score Tiers (for Agent Developers)
const ECTO_TIERS = {
  LEGEND: { min: 9000, name: 'LEGEND' },
  MASTER: { min: 7500, name: 'MASTER' },
  ARTISAN: { min: 5000, name: 'ARTISAN' },
  APPRENTICE: { min: 2500, name: 'APPRENTICE' },
  NOVICE: { min: 0, name: 'NOVICE' },
} as const

// Ghosthunter Score Tiers (for Customers who hunt for good agents)
const GHOSTHUNTER_TIERS = {
  LEGENDARY: { min: 9000, name: 'LEGENDARY' },
  ELITE: { min: 7500, name: 'ELITE' },
  VETERAN: { min: 5000, name: 'VETERAN' },
  TRACKER: { min: 2500, name: 'TRACKER' },
  ROOKIE: { min: 0, name: 'ROOKIE' },
} as const

// Ghost Score Tiers (for AI Agents - kept for reference)
const GHOST_TIERS = {
  DIAMOND: { min: 9500, name: 'DIAMOND' },
  PLATINUM: { min: 9000, name: 'PLATINUM' },
  GOLD: { min: 7500, name: 'GOLD' },
  SILVER: { min: 5000, name: 'SILVER' },
  BRONZE: { min: 2500, name: 'BRONZE' },
  NEWCOMER: { min: 0, name: 'NEWCOMER' },
} as const

/**
 * Get user dashboard data
 *
 * Returns all relevant metrics for the authenticated user,
 * with role-based scores (Ecto Score for developers, Shade Score for customers)
 */
export const getUserDashboard = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user record
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      return null
    }

    const now = Date.now()

    // ─── DETERMINE USER ROLES ─────────────────────────────────────────────────
    // Check if user is an Agent Developer (has registered/claimed agents)
    const claimedAgents = await ctx.db
      .query('discoveredAgents')
      .filter((q: any) => q.eq(q.field('claimedBy'), args.walletAddress))
      .collect()
    const isAgentDeveloper = claimedAgents.length > 0

    // Check if user is a Customer (has verified agents or made payments)
    const totalVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    const totalPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    const completedPayments = totalPayments.filter((p) => p.status === 'completed')
    const isCustomer = totalVerifications.length > 0 || completedPayments.length > 0

    // Get verification count for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthStart = startOfMonth.getTime()

    const verificationsThisMonth = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q: any) =>
        q.eq('userId', user._id).gte('timestamp', monthStart)
      )
      .collect()

    // Get API usage count for this month (if user has API keys)
    const apiKeys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    let apiCallsThisMonth = 0
    for (const apiKey of apiKeys) {
      const usage = await ctx.db
        .query('apiUsage')
        .withIndex('by_api_key_timestamp', (q: any) =>
          q.eq('apiKeyId', apiKey._id).gte('timestamp', monthStart)
        )
        .collect()
      apiCallsThisMonth += usage.length
    }

    // ─── CALCULATE ECTO SCORE (Agent Developers) ───────────────────────────────
    let ectoScore = 0
    let ectoTier = 'NOVICE'
    if (isAgentDeveloper) {
      // Get performance data for developer's agents
      let totalAgentGhostScore = 0
      let totalAgentJobs = 0

      for (const agent of claimedAgents) {
        const reputationData = await ctx.db
          .query('agentReputationCache')
          .withIndex('by_address', (q: any) => q.eq('agentAddress', agent.ghostAddress))
          .first()

        if (reputationData) {
          totalAgentGhostScore += reputationData.ghostScore
          totalAgentJobs += reputationData.totalJobs
        }
      }

      ectoScore = calculateEctoScore({
        agentsRegistered: claimedAgents.length,
        totalAgentGhostScore,
        totalAgentJobs,
        accountAge: now - user.createdAt,
      })
      ectoTier = getEctoScoreTier(ectoScore)
    }

    // ─── CALCULATE GHOSTHUNTER SCORE (Customers) ─────────────────────────────────
    let ghosthunterScore = 0
    let ghosthunterTier = 'ROOKIE'
    if (isCustomer) {
      // Get reviews written by user
      const userReviews = await ctx.db
        .query('reviews')
        .withIndex('by_user', (q: any) => q.eq('userId', user._id))
        .collect()

      ghosthunterScore = calculateGhosthunterScore({
        totalVerifications: totalVerifications.length,
        totalPayments: completedPayments.length,
        reviewsWritten: userReviews.length,
        accountAge: now - user.createdAt,
      })
      ghosthunterTier = getGhosthunterScoreTier(ghosthunterScore)
    }

    // Get staking data
    const stakingAccount = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_agent', (q: any) => q.eq('agentAddress', args.walletAddress))
      .filter((q: any) => q.eq(q.field('isActive'), true))
      .first()

    // Get recent activity (last 10 events)
    const recentActivity = await getRecentActivity(ctx, user._id)

    // Calculate free verifications remaining
    const freeVerificationsUsed = verificationsThisMonth.filter(
      (v) => v.paymentMethod === 'free'
    ).length
    const freeVerificationsRemaining = Math.max(0, 3 - freeVerificationsUsed)

    // Get activity streak
    const streak = calculateStreak(user.lastActivityDate, user.currentStreak)

    // Get achievements (updated for three-tier system)
    const achievements = calculateAchievements({
      createdAt: user.createdAt,
      totalVerifications: totalVerifications.length,
      agentsRegistered: claimedAgents.length,
      isAgentDeveloper,
      isCustomer,
    })

    return {
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      // User roles
      roles: {
        isAgentDeveloper,
        isCustomer,
      },
      // Role-based scores (replaces old generic ghostScore)
      reputation: {
        // Ecto Score - for Agent Developers
        ecto: isAgentDeveloper
          ? {
              score: ectoScore,
              tier: ectoTier,
              agentsRegistered: claimedAgents.length,
            }
          : null,
        // Ghosthunter Score - for Customers
        ghosthunter: isCustomer
          ? {
              score: ghosthunterScore,
              tier: ghosthunterTier,
            }
          : null,
      },
      stats: {
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
      gamification: {
        streak,
        achievements,
      },
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
    transactionSignature?: string
  }> = []

  // Get recent verifications
  const recentVerifications = await ctx.db
    .query('verifications')
    .withIndex('by_user_timestamp', (q: any) => q.eq('userId', userId))
    .order('desc')
    .take(5)

  for (const verification of recentVerifications) {
    activity.push({
      type: 'VERIFICATION',
      description: `Verified agent ${verification.agentAddress.slice(0, 8)}...`,
      timestamp: verification.timestamp,
      status: verification.tier,
      transactionSignature: verification.transactionSignature,
    })
  }

  // Get recent payments
  const recentPayments = await ctx.db
    .query('payments')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .order('desc')
    .take(5)

  for (const payment of recentPayments) {
    activity.push({
      type: 'PAYMENT',
      description: `${payment.status === 'completed' ? 'Paid' : 'Pending'} $${payment.amount} to ${payment.resourceName}`,
      timestamp: payment.createdAt,
      status: payment.status,
      transactionSignature: payment.transactionSignature,
    })
  }

  // Sort by timestamp and return top 10
  return activity.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
}

// ─── SCORE CALCULATION FUNCTIONS ───────────────────────────────────────────────

/**
 * Calculate Ecto Score for Agent Developers (0-10,000 scale)
 * Measures: agents registered, agent performance, developer tenure
 */
function calculateEctoScore({
  agentsRegistered,
  totalAgentGhostScore,
  totalAgentJobs,
  accountAge,
}: {
  agentsRegistered: number
  totalAgentGhostScore: number // Sum of Ghost Scores across all their agents
  totalAgentJobs: number // Total jobs completed by all their agents
  accountAge: number
}): number {
  const ageInDays = accountAge / (1000 * 60 * 60 * 24)
  let score = 0

  // Agent creation points (up to 2000 points)
  // More agents = more experienced developer
  score += Math.min(agentsRegistered * 500, 2000)

  // Agent quality points (up to 4000 points)
  // Average Ghost Score of their agents (normalized)
  if (agentsRegistered > 0) {
    const avgAgentScore = totalAgentGhostScore / agentsRegistered
    score += Math.min((avgAgentScore / 10000) * 4000, 4000)
  }

  // Agent productivity points (up to 2500 points)
  // Total jobs completed by their agents
  score += Math.min(totalAgentJobs * 25, 2500)

  // Developer tenure points (up to 1500 points)
  score += Math.min(ageInDays * 10, 1500)

  return Math.min(Math.round(score), 10000)
}

/**
 * Get Ecto Score tier for Agent Developers
 */
function getEctoScoreTier(score: number): string {
  if (score >= ECTO_TIERS.LEGEND.min) return ECTO_TIERS.LEGEND.name
  if (score >= ECTO_TIERS.MASTER.min) return ECTO_TIERS.MASTER.name
  if (score >= ECTO_TIERS.ARTISAN.min) return ECTO_TIERS.ARTISAN.name
  if (score >= ECTO_TIERS.APPRENTICE.min) return ECTO_TIERS.APPRENTICE.name
  return ECTO_TIERS.NOVICE.name
}

/**
 * Calculate Ghosthunter Score for Customers AND Agents (0-10,000 scale)
 * Measures: verifications performed, reviews written, accuracy of evaluations
 * Both humans and AI agents can earn Ghosthunter scores by evaluating other agents
 */
function calculateGhosthunterScore({
  totalVerifications,
  totalPayments,
  reviewsWritten,
  accountAge,
}: {
  totalVerifications: number
  totalPayments: number
  reviewsWritten: number
  accountAge: number
}): number {
  const ageInDays = accountAge / (1000 * 60 * 60 * 24)
  let score = 0

  // Verification points (up to 3500 points)
  // Each verification shows you're actively hunting/evaluating agents
  score += Math.min(totalVerifications * 150, 3500)

  // Transaction points (up to 2500 points)
  // Completed payments show you've actually used agents
  score += Math.min(totalPayments * 100, 2500)

  // Review contribution points (up to 2500 points)
  // Writing reviews helps the community
  score += Math.min(reviewsWritten * 200, 2500)

  // Tenure bonus (up to 1500 points)
  score += Math.min(ageInDays * 10, 1500)

  return Math.min(Math.round(score), 10000)
}

/**
 * Get Ghosthunter Score tier for Customers/Agents
 */
function getGhosthunterScoreTier(score: number): string {
  if (score >= GHOSTHUNTER_TIERS.LEGENDARY.min) return GHOSTHUNTER_TIERS.LEGENDARY.name
  if (score >= GHOSTHUNTER_TIERS.ELITE.min) return GHOSTHUNTER_TIERS.ELITE.name
  if (score >= GHOSTHUNTER_TIERS.VETERAN.min) return GHOSTHUNTER_TIERS.VETERAN.name
  if (score >= GHOSTHUNTER_TIERS.TRACKER.min) return GHOSTHUNTER_TIERS.TRACKER.name
  return GHOSTHUNTER_TIERS.ROOKIE.name
}

/**
 * Get Ghost Score tier for AI Agents (kept for agent reputation lookups)
 */
function getGhostScoreTier(score: number): string {
  if (score >= GHOST_TIERS.DIAMOND.min) return GHOST_TIERS.DIAMOND.name
  if (score >= GHOST_TIERS.PLATINUM.min) return GHOST_TIERS.PLATINUM.name
  if (score >= GHOST_TIERS.GOLD.min) return GHOST_TIERS.GOLD.name
  if (score >= GHOST_TIERS.SILVER.min) return GHOST_TIERS.SILVER.name
  if (score >= GHOST_TIERS.BRONZE.min) return GHOST_TIERS.BRONZE.name
  return GHOST_TIERS.NEWCOMER.name
}

/**
 * Calculate activity streak from user data
 */
function calculateStreak(
  lastActivityDate: string | undefined,
  currentStreak: number | undefined
): { days: number; isActive: boolean } {
  if (!lastActivityDate || !currentStreak) {
    return { days: 0, isActive: false }
  }

  const today = new Date().toISOString().split('T')[0]
  const lastDate = new Date(lastActivityDate)
  const todayDate = new Date(today)
  const diffTime = todayDate.getTime() - lastDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Streak is active if last activity was today or yesterday
  const isActive = diffDays <= 1

  return {
    days: isActive ? currentStreak : 0,
    isActive,
  }
}

/**
 * Calculate user achievements for the three-tier reputation system
 */
function calculateAchievements(data: {
  createdAt: number
  totalVerifications: number
  agentsRegistered: number
  isAgentDeveloper: boolean
  isCustomer: boolean
}): Array<{
  id: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: number
  category: 'general' | 'developer' | 'customer'
}> {
  const achievements = [
    // ─── GENERAL ACHIEVEMENTS ─────────────────────────────────────────────────
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'Joined the GhostSpeak platform',
      unlocked: true,
      unlockedAt: data.createdAt,
      category: 'general' as const,
    },

    // ─── DEVELOPER (ECTO) ACHIEVEMENTS ────────────────────────────────────────
    {
      id: 'ecto_creator',
      name: 'Ecto Creator',
      description: 'Registered your first AI agent',
      unlocked: data.agentsRegistered >= 1,
      unlockedAt: data.agentsRegistered >= 1 ? data.createdAt : undefined,
      category: 'developer' as const,
    },
    {
      id: 'ecto_artisan',
      name: 'Ecto Artisan',
      description: 'Registered 5+ AI agents',
      unlocked: data.agentsRegistered >= 5,
      unlockedAt: data.agentsRegistered >= 5 ? data.createdAt : undefined,
      category: 'developer' as const,
    },
    {
      id: 'ecto_master',
      name: 'Ecto Master',
      description: 'Registered 10+ AI agents',
      unlocked: data.agentsRegistered >= 10,
      unlockedAt: data.agentsRegistered >= 10 ? data.createdAt : undefined,
      category: 'developer' as const,
    },

    // ─── CUSTOMER (GHOSTHUNTER) ACHIEVEMENTS ──────────────────────────────────
    {
      id: 'first_hunt',
      name: 'First Hunt',
      description: 'Completed your first agent verification',
      unlocked: data.totalVerifications >= 1,
      unlockedAt: data.totalVerifications >= 1 ? data.createdAt : undefined,
      category: 'customer' as const,
    },
    {
      id: 'tracker',
      name: 'Tracker',
      description: 'Verified 10+ agents',
      unlocked: data.totalVerifications >= 10,
      unlockedAt: data.totalVerifications >= 10 ? data.createdAt : undefined,
      category: 'customer' as const,
    },
    {
      id: 'veteran_hunter',
      name: 'Veteran Hunter',
      description: 'Verified 50+ agents',
      unlocked: data.totalVerifications >= 50,
      unlockedAt: data.totalVerifications >= 50 ? data.createdAt : undefined,
      category: 'customer' as const,
    },
    {
      id: 'legendary_hunter',
      name: 'Legendary Hunter',
      description: 'Verified 100+ agents',
      unlocked: data.totalVerifications >= 100,
      unlockedAt: data.totalVerifications >= 100 ? data.createdAt : undefined,
      category: 'customer' as const,
    },
  ]

  return achievements
}

/**
 * Get user's percentile ranking based on Ghosthunter Score
 * (Customer/Hunter percentile ranking)
 */
export const getUserPercentile = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      return null
    }

    const now = Date.now()

    // Calculate user's Ghosthunter Score
    const totalVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    const totalPayments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    const userReviews = await ctx.db
      .query('reviews')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    const completedPayments = totalPayments.filter((p) => p.status === 'completed')

    const userScore = calculateGhosthunterScore({
      totalVerifications: totalVerifications.length,
      totalPayments: completedPayments.length,
      reviewsWritten: userReviews.length,
      accountAge: now - user.createdAt,
    })

    // Get all users and calculate their Ghosthunter scores
    const allUsers = await ctx.db.query('users').collect()

    // Calculate scores for all users
    const userScores: number[] = []

    for (const u of allUsers) {
      const uVerifications = await ctx.db
        .query('verifications')
        .withIndex('by_user', (q: any) => q.eq('userId', u._id))
        .collect()

      const uPayments = await ctx.db
        .query('payments')
        .withIndex('by_user', (q: any) => q.eq('userId', u._id))
        .collect()

      const uReviews = await ctx.db
        .query('reviews')
        .withIndex('by_user', (q: any) => q.eq('userId', u._id))
        .collect()

      const uCompletedPayments = uPayments.filter((p) => p.status === 'completed')

      const score = calculateGhosthunterScore({
        totalVerifications: uVerifications.length,
        totalPayments: uCompletedPayments.length,
        reviewsWritten: uReviews.length,
        accountAge: now - u.createdAt,
      })

      userScores.push(score)
    }

    // Calculate percentile
    const usersBelow = userScores.filter((score) => score < userScore).length
    const percentile = Math.round((usersBelow / allUsers.length) * 100)

    // Return top X% (inverted - if you're at 90th percentile, you're top 10%)
    const topPercentage = 100 - percentile

    return {
      percentile,
      topPercentage: Math.max(1, topPercentage), // At least top 100%
      totalUsers: allUsers.length,
      userScore,
    }
  },
})

/**
 * Update user's activity streak on login/activity
 */
export const updateActivityStreak = mutation({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      return null
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const lastActivityDate = user.lastActivityDate

    // If already active today, no update needed
    if (lastActivityDate === today) {
      return {
        currentStreak: user.currentStreak || 1,
        longestStreak: user.longestStreak || 1,
      }
    }

    let newStreak = 1
    let longestStreak = user.longestStreak || 0

    if (lastActivityDate) {
      const lastDate = new Date(lastActivityDate)
      const todayDate = new Date(today)
      const diffTime = todayDate.getTime() - lastDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        // Consecutive day - increment streak
        newStreak = (user.currentStreak || 0) + 1
      } else if (diffDays === 0) {
        // Same day - keep streak
        newStreak = user.currentStreak || 1
      }
      // else: streak broken, reset to 1
    }

    // Update longest streak if current is higher
    if (newStreak > longestStreak) {
      longestStreak = newStreak
    }

    await ctx.db.patch(user._id, {
      currentStreak: newStreak,
      longestStreak: longestStreak,
      lastActivityDate: today,
      lastActiveAt: Date.now(),
    })

    return {
      currentStreak: newStreak,
      longestStreak: longestStreak,
    }
  },
})

/**
 * Get user's registered/verified agents
 *
 * Returns agents the user has:
 * 1. Claimed (from discoveredAgents where claimedBy = walletAddress)
 * 2. Verified (from verifications where userId matches)
 */
export const getUserAgents = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user record
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    // Map to store unique agents (keyed by address)
    const agentsMap = new Map<
      string,
      {
        address: string
        name: string | null
        verificationStatus: 'claimed' | 'verified' | 'discovered'
        // Ghost Score (agent's own reputation)
        ghostScore: number
        tier: string
        // Ghosthunter Score (if agent verifies other agents)
        ghosthunterScore: number | null
        ghosthunterTier: string | null
        verificationsPerformed: number
        lastActivity: number
      }
    >()

    // 1. Get agents claimed by this wallet (from discoveredAgents)
    const claimedAgents = await ctx.db
      .query('discoveredAgents')
      .filter((q: any) => q.eq(q.field('claimedBy'), args.walletAddress))
      .collect()

    for (const agent of claimedAgents) {
      // Try to get reputation data for this agent
      const reputationData = await ctx.db
        .query('agentReputationCache')
        .withIndex('by_address', (q: any) => q.eq('agentAddress', agent.ghostAddress))
        .first()

      agentsMap.set(agent.ghostAddress, {
        address: agent.ghostAddress,
        name: null, // Could be populated from metadata later
        verificationStatus: agent.status === 'verified' ? 'verified' : 'claimed',
        // Ghost Score (agent's own reputation)
        ghostScore: reputationData?.ghostScore ?? 0,
        tier: reputationData?.tier ?? 'NEWCOMER',
        // Ghosthunter Score (if agent verifies other agents)
        ghosthunterScore: reputationData?.ghosthunterScore ?? null,
        ghosthunterTier: reputationData?.ghosthunterTier ?? null,
        verificationsPerformed: reputationData?.verificationsPerformed ?? 0,
        lastActivity: agent.updatedAt,
      })
    }

    // 2. Get agents verified by this user (from verifications)
    if (user) {
      const verifications = await ctx.db
        .query('verifications')
        .withIndex('by_user', (q: any) => q.eq('userId', user._id))
        .order('desc')
        .collect()

      // Group by agent address to get unique agents
      const verifiedAgentAddresses = new Set<string>()
      for (const verification of verifications) {
        if (!verifiedAgentAddresses.has(verification.agentAddress)) {
          verifiedAgentAddresses.add(verification.agentAddress)

          // If agent is not already in map (from claimed), add it
          if (!agentsMap.has(verification.agentAddress)) {
            // Try to get reputation data for this agent
            const reputationData = await ctx.db
              .query('agentReputationCache')
              .withIndex('by_address', (q: any) => q.eq('agentAddress', verification.agentAddress))
              .first()

            agentsMap.set(verification.agentAddress, {
              address: verification.agentAddress,
              name: null,
              verificationStatus: 'verified',
              // Ghost Score (agent's own reputation)
              ghostScore: reputationData?.ghostScore ?? verification.ghostScore,
              tier: reputationData?.tier ?? verification.tier,
              // Ghosthunter Score (if agent verifies other agents)
              ghosthunterScore: reputationData?.ghosthunterScore ?? null,
              ghosthunterTier: reputationData?.ghosthunterTier ?? null,
              verificationsPerformed: reputationData?.verificationsPerformed ?? 0,
              lastActivity: verification.timestamp,
            })
          }
        }
      }
    }

    // Convert map to array and sort by lastActivity (newest first)
    const agents = Array.from(agentsMap.values()).sort(
      (a, b) => b.lastActivity - a.lastActivity
    )

    return {
      agents,
      totalCount: agents.length,
    }
  },
})
