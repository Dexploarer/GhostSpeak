/**
 * User Billing Module
 *
 * Real-time tracking and analytics for individual user prepaid USDC accounts.
 * Mirrors team billing functionality for solo developers using the B2B API.
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get user's billing info with real-time balance
 */
export const getUserBilling = query({
  args: { userId: v.id('users') },
  returns: v.union(
    v.object({
      user: v.object({
        id: v.id('users'),
        walletAddress: v.string(),
        name: v.optional(v.string()),
        usdcTokenAccount: v.optional(v.string()),
        currentBalance: v.number(),
        monthlyBudget: v.number(),
        lastBillingAt: v.optional(v.number()),
      }),
      usage: v.object({
        thisMonth: v.number(),
        totalCost: v.number(),
        startOfMonth: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      return null
    }

    // Get current month's usage
    const _now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Get user's API usage
    const usage = await ctx.db
      .query('apiUsage')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startOfMonth.getTime())
      )
      .collect()

    const totalRequests = usage.length
    const totalCost = usage.reduce((sum, r) => sum + (r.cost || 0), 0)

    return {
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        usdcTokenAccount: user.usdcTokenAccount,
        currentBalance: user.currentBalance || 0,
        monthlyBudget: user.monthlyBudget || 0,
        lastBillingAt: user.lastBillingAt,
      },
      usage: {
        thisMonth: totalRequests,
        totalCost,
        startOfMonth: startOfMonth.getTime(),
      },
    }
  },
})

/**
 * Get billing history for a user
 */
export const getBillingHistory = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('userBillingDeductions'),
      _creationTime: v.number(),
      userId: v.id('users'),
      amountMicroUsdc: v.number(),
      amountUsdc: v.number(),
      requestCount: v.number(),
      endpoint: v.string(),
      transactionSignature: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 30

    const deductions = await ctx.db
      .query('userBillingDeductions')
      .withIndex('by_user_timestamp', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)

    return deductions
  },
})

/**
 * Get monthly aggregated billing
 */
export const getMonthlyAggregate = query({
  args: {
    userId: v.id('users'),
    month: v.string(), // 'YYYY-MM'
  },
  returns: v.union(
    v.object({
      month: v.string(),
      totalDeducted: v.number(),
      totalRequests: v.number(),
      avgCostPerRequest: v.number(),
      deductionCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Parse month
    const [year, month] = args.month.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1).getTime()
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()

    const user = await ctx.db.get(args.userId)
    if (!user) {
      return null
    }

    // Get all deductions for the month
    const deductions = await ctx.db
      .query('userBillingDeductions')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startDate).lte('timestamp', endDate)
      )
      .collect()

    const totalDeducted = deductions.reduce((sum, d) => sum + d.amountUsdc, 0)
    const totalRequests = deductions.reduce((sum, d) => sum + d.requestCount, 0)

    return {
      month: args.month,
      totalDeducted,
      totalRequests,
      avgCostPerRequest: totalRequests > 0 ? totalDeducted / totalRequests : 0,
      deductionCount: deductions.length,
    }
  },
})

/**
 * Check if user needs refill notification
 */
export const checkRefillStatus = query({
  args: { userId: v.id('users') },
  returns: v.object({
    needsRefill: v.boolean(),
    critical: v.optional(v.boolean()),
    currentBalance: v.optional(v.number()),
    threshold: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user || !user.currentBalance) {
      return { needsRefill: false }
    }

    const LOW_BALANCE_THRESHOLD = 10 // $10 USDC
    const CRITICAL_THRESHOLD = 5 // $5 USDC

    const balanceUsdc = user.currentBalance / 1_000_000

    return {
      needsRefill: balanceUsdc < LOW_BALANCE_THRESHOLD,
      critical: balanceUsdc < CRITICAL_THRESHOLD,
      currentBalance: balanceUsdc,
      threshold: LOW_BALANCE_THRESHOLD,
    }
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Record a billing deduction (called after API usage)
 * Supports both USDC and GHOST token payments
 */
export const recordDeduction = mutation({
  args: {
    userId: v.id('users'),
    paymentToken: v.string(), // 'usdc' | 'ghost'
    amountMicroUsdc: v.number(),
    amountMicroGhost: v.optional(v.number()),
    requestCount: v.number(),
    endpoint: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  returns: v.id('userBillingDeductions'),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      throw new Error('User not found')
    }

    // Record deduction
    const deductionId = await ctx.db.insert('userBillingDeductions', {
      userId: args.userId,
      paymentToken: args.paymentToken,
      amountMicroUsdc: args.amountMicroUsdc,
      amountUsdc: args.amountMicroUsdc / 1_000_000,
      amountMicroGhost: args.amountMicroGhost,
      amountGhost: args.amountMicroGhost ? args.amountMicroGhost / 1_000_000 : undefined, // GHOST has 6 decimals
      requestCount: args.requestCount,
      endpoint: args.endpoint,
      transactionSignature: args.transactionSignature,
      timestamp: Date.now(),
    })

    // Update user balance based on payment token
    if (args.paymentToken === 'usdc') {
      const newBalance = (user.currentBalance || 0) - args.amountMicroUsdc
      await ctx.db.patch(args.userId, {
        currentBalance: newBalance,
      })

      // Check if refill notification needed
      const balanceUsdc = newBalance / 1_000_000
      if (balanceUsdc < 10) {
        console.log(
          `[User Billing] Low USDC balance alert for user ${user.walletAddress}: ${balanceUsdc} USDC`
        )
      }
    } else if (args.paymentToken === 'ghost' && args.amountMicroGhost) {
      const newGhostBalance = (user.currentGhostBalance || 0) - args.amountMicroGhost
      await ctx.db.patch(args.userId, {
        currentGhostBalance: newGhostBalance,
      })

      // Check if refill notification needed
      const balanceGhost = newGhostBalance / 1_000_000 // GHOST has 6 decimals
      if (balanceGhost < 200000) {
        // Less than 200,000 GHOST (~$10 equivalent at $0.00005 per GHOST)
        console.log(
          `[User Billing] Low GHOST balance alert for user ${user.walletAddress}: ${balanceGhost} GHOST`
        )
      }
    }

    return deductionId
  },
})

/**
 * Update user balance after deposit
 * Supports both USDC and GHOST token deposits
 */
export const updateBalance = mutation({
  args: {
    userId: v.id('users'),
    paymentToken: v.string(), // 'usdc' | 'ghost'
    newBalanceMicroUsdc: v.optional(v.number()),
    newBalanceMicroGhost: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    transactionSignature: v.optional(v.string()),
  },
  returns: v.object({
    previousBalance: v.number(),
    newBalance: v.number(),
    balanceUi: v.number(),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      throw new Error('User not found')
    }

    let previousBalance = 0
    let newBalance = 0
    let balanceUi = 0

    if (args.paymentToken === 'usdc' && args.newBalanceMicroUsdc !== undefined) {
      previousBalance = user.currentBalance || 0
      newBalance = args.newBalanceMicroUsdc
      balanceUi = args.newBalanceMicroUsdc / 1_000_000

      await ctx.db.patch(args.userId, {
        currentBalance: args.newBalanceMicroUsdc,
      })

      // Record deposit event if specified
      if (args.depositAmount) {
        await ctx.db.insert('userBillingDeposits', {
          userId: args.userId,
          paymentToken: 'usdc',
          amountMicroUsdc: args.depositAmount,
          amountUsdc: args.depositAmount / 1_000_000,
          amountMicroGhost: 0,
          amountGhost: 0,
          transactionSignature: args.transactionSignature,
          timestamp: Date.now(),
        })
      }
    } else if (args.paymentToken === 'ghost' && args.newBalanceMicroGhost !== undefined) {
      previousBalance = user.currentGhostBalance || 0
      newBalance = args.newBalanceMicroGhost
      balanceUi = args.newBalanceMicroGhost / 1_000_000 // GHOST has 6 decimals

      await ctx.db.patch(args.userId, {
        currentGhostBalance: args.newBalanceMicroGhost,
      })

      // Record deposit event if specified
      if (args.depositAmount) {
        await ctx.db.insert('userBillingDeposits', {
          userId: args.userId,
          paymentToken: 'ghost',
          amountMicroUsdc: 0,
          amountUsdc: 0,
          amountMicroGhost: args.depositAmount,
          amountGhost: args.depositAmount / 1_000_000, // GHOST has 6 decimals
          transactionSignature: args.transactionSignature,
          timestamp: Date.now(),
        })
      }
    }

    return {
      previousBalance,
      newBalance,
      balanceUi,
      token: args.paymentToken,
    }
  },
})

/**
 * Internal mutation to trigger refill notifications (called by cron)
 */
export const triggerRefillNotifications = internalMutation({
  returns: v.object({
    usersChecked: v.number(),
    alertsTriggered: v.number(),
    alerts: v.array(
      v.object({
        userId: v.id('users'),
        walletAddress: v.string(),
        balance: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const LOW_BALANCE_THRESHOLD = 10_000_000 // 10 USDC in micro units

    // Get all users with USDC token accounts
    const users = await ctx.db
      .query('users')
      .filter((q) => q.neq(q.field('usdcTokenAccount'), undefined))
      .collect()

    const alerts = []

    for (const user of users) {
      const balance = user.currentBalance || 0

      if (balance < LOW_BALANCE_THRESHOLD && user.usdcTokenAccount) {
        alerts.push({
          userId: user._id,
          walletAddress: user.walletAddress,
          balance: balance / 1_000_000,
        })

        // Could trigger webhook, email, or dashboard notification here
        console.log(
          `[User Billing] Refill alert: ${user.walletAddress} has ${balance / 1_000_000} USDC`
        )
      }
    }

    return {
      usersChecked: users.length,
      alertsTriggered: alerts.length,
      alerts,
    }
  },
})
