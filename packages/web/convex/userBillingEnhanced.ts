/**
 * Enhanced User Billing Module
 *
 * Extended functionality for individual user prepaid billing with on-chain balance checks.
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// ─── ENHANCED QUERIES ────────────────────────────────────────────────────────

/**
 * Get user by API key (for middleware lookup)
 * NOTE: API key should be hashed client-side before calling this query
 */
export const getUserByApiKey = query({
  args: { hashedApiKey: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      walletAddress: v.string(),
      name: v.optional(v.string()),
      usdcTokenAccount: v.optional(v.string()),
      currentBalance: v.optional(v.number()),
      currentUsage: v.number(),
    }),
    v.null()
  ),
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

    // Get user
    const user = await ctx.db.get(apiKey.userId)

    if (!user) {
      return null
    }

    // Get current month usage
    const _now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const deductions = await ctx.db
      .query('userBillingDeductions')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', user._id).gte('timestamp', startOfMonth.getTime())
      )
      .collect()

    const currentUsage = deductions.reduce((sum, d) => sum + d.requestCount, 0)

    return {
      _id: user._id,
      walletAddress: user.walletAddress,
      name: user.name,
      usdcTokenAccount: user.usdcTokenAccount,
      currentBalance: user.currentBalance,
      currentUsage,
    }
  },
})

/**
 * Get user billing analytics
 */
export const getUserAnalytics = query({
  args: {
    userId: v.id('users'),
    days: v.optional(v.number()), // Default 30 days
  },
  returns: v.union(
    v.object({
      user: v.object({
        id: v.id('users'),
        walletAddress: v.string(),
        name: v.optional(v.string()),
        currentBalance: v.number(),
      }),
      period: v.object({
        days: v.number(),
        startDate: v.number(),
        endDate: v.number(),
      }),
      totals: v.object({
        requests: v.number(),
        cost: v.number(),
        deposits: v.number(),
        avgDailyRequests: v.number(),
      }),
      dailyData: v.array(
        v.object({
          date: v.string(),
          requests: v.number(),
          cost: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const days = args.days || 30
    const user = await ctx.db.get(args.userId)

    if (!user) {
      return null
    }

    const now = Date.now()
    const startDate = now - days * 24 * 60 * 60 * 1000

    // Get deductions
    const deductions = await ctx.db
      .query('userBillingDeductions')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startDate)
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
      .query('userBillingDeposits')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startDate)
      )
      .collect()

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amountUsdc, 0)

    return {
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        currentBalance: (user.currentBalance || 0) / 1_000_000,
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
    userId: v.id('users'),
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      endpoint: v.string(),
      requests: v.number(),
      cost: v.number(),
      avgCostPerRequest: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const days = args.days || 30
    const now = Date.now()
    const startDate = now - days * 24 * 60 * 60 * 1000

    const deductions = await ctx.db
      .query('userBillingDeductions')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startDate)
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
    userId: v.id('users'),
    requestCount: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      throw new Error('User not found')
    }

    // Check if month has reset
    const now = Date.now()
    const lastReset = user.lastBillingAt || user.createdAt
    const daysSinceReset = (now - lastReset) / (24 * 60 * 60 * 1000)

    if (daysSinceReset >= 30) {
      // Reset monthly counter
      await ctx.db.patch(args.userId, {
        lastBillingAt: now,
      })
    }

    return { success: true }
  },
})

/**
 * Set user's USDC token account (called after on-chain account creation)
 */
export const setUsdcTokenAccount = mutation({
  args: {
    userId: v.id('users'),
    usdcTokenAccount: v.string(),
    initialBalance: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      usdcTokenAccount: args.usdcTokenAccount,
      currentBalance: args.initialBalance || 0,
      lastBillingAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Set user's GHOST token account (called after on-chain account creation)
 */
export const setGhostTokenAccount = mutation({
  args: {
    userId: v.id('users'),
    ghostTokenAccount: v.string(),
    initialBalance: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      ghostTokenAccount: args.ghostTokenAccount,
      currentGhostBalance: args.initialBalance || 0,
      lastBillingAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Set user's preferred payment token
 */
export const setPreferredPaymentToken = mutation({
  args: {
    userId: v.id('users'),
    preferredPaymentToken: v.string(), // 'usdc' | 'ghost'
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Validate token choice
    if (args.preferredPaymentToken !== 'usdc' && args.preferredPaymentToken !== 'ghost') {
      throw new Error('Invalid payment token. Must be "usdc" or "ghost"')
    }

    await ctx.db.patch(args.userId, {
      preferredPaymentToken: args.preferredPaymentToken,
    })

    return { success: true }
  },
})

/**
 * Internal: Sync balance from on-chain (called by cron)
 * Supports both USDC and GHOST token balances
 */
export const syncBalanceFromChain = internalMutation({
  args: {
    userId: v.id('users'),
    paymentToken: v.string(), // 'usdc' | 'ghost'
    balanceMicroUsdc: v.optional(v.number()),
    balanceMicroGhost: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      oldBalance: v.number(),
      newBalance: v.number(),
      difference: v.number(),
      token: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      return null
    }

    if (args.paymentToken === 'usdc' && args.balanceMicroUsdc !== undefined) {
      const oldBalance = user.currentBalance || 0
      const difference = args.balanceMicroUsdc - oldBalance

      await ctx.db.patch(args.userId, {
        currentBalance: args.balanceMicroUsdc,
      })

      // If balance increased, record as deposit (external)
      if (difference > 0) {
        await ctx.db.insert('userBillingDeposits', {
          userId: args.userId,
          paymentToken: 'usdc',
          amountMicroUsdc: difference,
          amountUsdc: difference / 1_000_000,
          amountMicroGhost: 0,
          amountGhost: 0,
          timestamp: Date.now(),
        })
      }

      return {
        oldBalance: oldBalance / 1_000_000,
        newBalance: args.balanceMicroUsdc / 1_000_000,
        difference: difference / 1_000_000,
        token: 'usdc',
      }
    } else if (args.paymentToken === 'ghost' && args.balanceMicroGhost !== undefined) {
      const oldBalance = user.currentGhostBalance || 0
      const difference = args.balanceMicroGhost - oldBalance

      await ctx.db.patch(args.userId, {
        currentGhostBalance: args.balanceMicroGhost,
      })

      // If balance increased, record as deposit (external)
      if (difference > 0) {
        await ctx.db.insert('userBillingDeposits', {
          userId: args.userId,
          paymentToken: 'ghost',
          amountMicroUsdc: 0,
          amountUsdc: 0,
          amountMicroGhost: difference,
          amountGhost: difference / 1_000_000, // GHOST has 6 decimals
          timestamp: Date.now(),
        })
      }

      return {
        oldBalance: oldBalance / 1_000_000, // GHOST has 6 decimals
        newBalance: args.balanceMicroGhost / 1_000_000,
        difference: difference / 1_000_000,
        token: 'ghost',
      }
    }

    return null
  },
})
