/**
 * Enhanced Team Billing Module
 *
 * Extended functionality for B2B prepaid billing with on-chain balance checks.
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// ─── ENHANCED QUERIES ────────────────────────────────────────────────────────

/**
 * Get team by API key (for middleware lookup)
 * NOTE: API key should be hashed client-side before calling this query
 */
export const getTeamByApiKey = query({
  args: { hashedApiKey: v.string() },
  handler: async (ctx, args) => {
    // Use pre-hashed key from client
    const hashedKey = args.hashedApiKey

    // Find API key
    const apiKey = await ctx.db
      .query('apiKeys')
      .withIndex('by_hashed_key', (q) => q.eq('hashedKey', hashedKey))
      .first()

    if (!apiKey || !apiKey.isActive) {
      return null
    }

    // Get user's teams
    const teamMemberships = await ctx.db
      .query('teamMembers')
      .withIndex('by_user', (q) => q.eq('userId', apiKey.userId))
      .collect()

    if (teamMemberships.length === 0) {
      return null
    }

    // Return first active team (could be enhanced to handle multiple teams)
    const team = await ctx.db.get(teamMemberships[0].teamId)

    if (!team || !team.isActive) {
      return null
    }

    // Get current month usage
    const _now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const deductions = await ctx.db
      .query('billingDeductions')
      .withIndex('by_team_timestamp', (q) =>
        q.eq('teamId', team._id).gte('timestamp', startOfMonth.getTime())
      )
      .collect()

    const currentUsage = deductions.reduce((sum, d) => sum + d.requestCount, 0)

    return {
      _id: team._id,
      name: team.name,
      plan: team.plan,
      usdcTokenAccount: team.usdcTokenAccount,
      currentBalance: team.currentBalance,
      currentUsage,
    }
  },
})

/**
 * Get team billing analytics
 */
export const getTeamAnalytics = query({
  args: {
    teamId: v.id('teams'),
    days: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30
    const team = await ctx.db.get(args.teamId)

    if (!team) {
      return null
    }

    const now = Date.now()
    const startDate = now - days * 24 * 60 * 60 * 1000

    // Get deductions
    const deductions = await ctx.db
      .query('billingDeductions')
      .withIndex('by_team_timestamp', (q) =>
        q.eq('teamId', args.teamId).gte('timestamp', startDate)
      )
      .collect()

    // Aggregate by day
    const dailyStats: Record<string, { requests: number; cost: number }> = {}

    for (const deduction of deductions) {
      const date = new Date(deduction.timestamp).toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { requests: 0, cost: 0 }
      }
      dailyStats[date].requests += deduction.requestCount
      dailyStats[date].cost += deduction.amountUsdc
    }

    // Convert to array sorted by date
    const dailyData = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate totals
    const totalRequests = deductions.reduce((sum, d) => sum + d.requestCount, 0)
    const totalCost = deductions.reduce((sum, d) => sum + d.amountUsdc, 0)
    const avgDailyRequests = totalRequests / days

    // Get deposits
    const deposits = await ctx.db
      .query('billingDeposits')
      .withIndex('by_team_timestamp', (q) =>
        q.eq('teamId', args.teamId).gte('timestamp', startDate)
      )
      .collect()

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amountUsdc, 0)

    return {
      team: {
        id: team._id,
        name: team.name,
        plan: team.plan,
        currentBalance: (team.currentBalance || 0) / 1_000_000,
      },
      period: {
        days,
        startDate,
        endDate: now,
      },
      totals: {
        requests: totalRequests,
        cost: totalCost,
        deposits: totalDeposits,
        avgDailyRequests: Math.round(avgDailyRequests),
      },
      dailyData,
    }
  },
})

/**
 * Get endpoint breakdown (which endpoints cost the most)
 */
export const getEndpointBreakdown = query({
  args: {
    teamId: v.id('teams'),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30
    const now = Date.now()
    const startDate = now - days * 24 * 60 * 60 * 1000

    const deductions = await ctx.db
      .query('billingDeductions')
      .withIndex('by_team_timestamp', (q) =>
        q.eq('teamId', args.teamId).gte('timestamp', startDate)
      )
      .collect()

    // Group by endpoint
    const endpointStats: Record<
      string,
      { requests: number; cost: number; avgCostPerRequest: number }
    > = {}

    for (const deduction of deductions) {
      const endpoint = deduction.endpoint
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = { requests: 0, cost: 0, avgCostPerRequest: 0 }
      }
      endpointStats[endpoint].requests += deduction.requestCount
      endpointStats[endpoint].cost += deduction.amountUsdc
    }

    // Calculate averages and convert to array
    const breakdown = Object.entries(endpointStats).map(([endpoint, stats]) => ({
      endpoint,
      requests: stats.requests,
      cost: stats.cost,
      avgCostPerRequest: stats.requests > 0 ? stats.cost / stats.requests : 0,
    }))

    // Sort by cost descending
    breakdown.sort((a, b) => b.cost - a.cost)

    return breakdown
  },
})

// ─── ENHANCED MUTATIONS ──────────────────────────────────────────────────────

/**
 * Increment usage counter (even if no cost)
 */
export const incrementUsage = mutation({
  args: {
    teamId: v.id('teams'),
    requestCount: v.number(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if month has reset
    const now = Date.now()
    const lastReset = team.lastBillingAt || team.createdAt
    const daysSinceReset = (now - lastReset) / (24 * 60 * 60 * 1000)

    if (daysSinceReset >= 30) {
      // Reset monthly counter
      await ctx.db.patch(args.teamId, {
        lastBillingAt: now,
      })
    }

    return { success: true }
  },
})

/**
 * Set team's USDC token account (called after on-chain account creation)
 */
export const setUsdcTokenAccount = mutation({
  args: {
    teamId: v.id('teams'),
    usdcTokenAccount: v.string(),
    initialBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, {
      usdcTokenAccount: args.usdcTokenAccount,
      currentBalance: args.initialBalance || 0,
      lastBillingAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Internal: Sync balance from on-chain (called by cron)
 */
export const syncBalanceFromChain = internalMutation({
  args: {
    teamId: v.id('teams'),
    balanceMicroUsdc: v.number(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)

    if (!team) {
      return
    }

    const oldBalance = team.currentBalance || 0
    const difference = args.balanceMicroUsdc - oldBalance

    await ctx.db.patch(args.teamId, {
      currentBalance: args.balanceMicroUsdc,
    })

    // If balance increased, record as deposit (external)
    if (difference > 0) {
      await ctx.db.insert('billingDeposits', {
        teamId: args.teamId,
        amountMicroUsdc: difference,
        amountUsdc: difference / 1_000_000,
        timestamp: Date.now(),
      })
    }

    return {
      oldBalance: oldBalance / 1_000_000,
      newBalance: args.balanceMicroUsdc / 1_000_000,
      difference: difference / 1_000_000,
    }
  },
})
