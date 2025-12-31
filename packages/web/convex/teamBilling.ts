/**
 * Team Billing Module
 *
 * Real-time tracking and analytics for B2B prepaid token accounts.
 * Monitors balances, tracks deductions, aggregates usage, and triggers notifications.
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get team's billing info with real-time balance
 */
export const getTeamBilling = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)

    if (!team) {
      return null
    }

    // Get current month's usage
    const _now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Get all team members
    const teamMembers = await ctx.db
      .query('teamMembers')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .collect()

    const userIds = teamMembers.map((m) => m.userId)

    // Aggregate usage across all team members
    let totalRequests = 0
    let totalCost = 0

    for (const userId of userIds) {
      const usage = await ctx.db
        .query('apiUsage')
        .withIndex('by_user_timestamp', (q) =>
          q.eq('userId', userId).gte('timestamp', startOfMonth.getTime())
        )
        .collect()

      totalRequests += usage.length
      totalCost += usage.reduce((sum, r) => sum + (r.cost || 0), 0)
    }

    return {
      team: {
        id: team._id,
        name: team.name,
        plan: team.plan,
        usdcTokenAccount: team.usdcTokenAccount,
        currentBalance: team.currentBalance || 0,
        monthlyBudget: team.monthlyBudget || 0,
        lastBillingAt: team.lastBillingAt,
      },
      usage: {
        thisMonth: totalRequests,
        totalCost,
        startOfMonth: startOfMonth.getTime(),
      },
      members: teamMembers.length,
    }
  },
})

/**
 * Get billing history for a team
 */
export const getBillingHistory = query({
  args: {
    teamId: v.id('teams'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 30

    const deductions = await ctx.db
      .query('billingDeductions')
      .withIndex('by_team_timestamp', (q) => q.eq('teamId', args.teamId))
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
    teamId: v.id('teams'),
    month: v.string(), // 'YYYY-MM'
  },
  handler: async (ctx, args) => {
    // Parse month
    const [year, month] = args.month.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1).getTime()
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      return null
    }

    // Get all deductions for the month
    const deductions = await ctx.db
      .query('billingDeductions')
      .withIndex('by_team_timestamp', (q) =>
        q.eq('teamId', args.teamId).gte('timestamp', startDate).lte('timestamp', endDate)
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
 * Check if team needs refill notification
 */
export const checkRefillStatus = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)

    if (!team || !team.currentBalance) {
      return { needsRefill: false }
    }

    const LOW_BALANCE_THRESHOLD = 10 // $10 USDC
    const CRITICAL_THRESHOLD = 5 // $5 USDC

    const balanceUsdc = team.currentBalance / 1_000_000

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
 */
export const recordDeduction = mutation({
  args: {
    teamId: v.id('teams'),
    amountMicroUsdc: v.number(),
    requestCount: v.number(),
    endpoint: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)

    if (!team) {
      throw new Error('Team not found')
    }

    // Record deduction
    const deductionId = await ctx.db.insert('billingDeductions', {
      teamId: args.teamId,
      amountMicroUsdc: args.amountMicroUsdc,
      amountUsdc: args.amountMicroUsdc / 1_000_000,
      requestCount: args.requestCount,
      endpoint: args.endpoint,
      transactionSignature: args.transactionSignature,
      timestamp: Date.now(),
    })

    // Update team balance
    const newBalance = (team.currentBalance || 0) - args.amountMicroUsdc
    await ctx.db.patch(args.teamId, {
      currentBalance: newBalance,
    })

    // Check if refill notification needed
    const balanceUsdc = newBalance / 1_000_000
    if (balanceUsdc < 10) {
      // Schedule notification (would be done via action/cron)
      console.log(`[Billing] Low balance alert for team ${team.name}: ${balanceUsdc} USDC`)
    }

    return deductionId
  },
})

/**
 * Update team balance after deposit
 */
export const updateBalance = mutation({
  args: {
    teamId: v.id('teams'),
    newBalanceMicroUsdc: v.number(),
    depositAmount: v.optional(v.number()),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)

    if (!team) {
      throw new Error('Team not found')
    }

    await ctx.db.patch(args.teamId, {
      currentBalance: args.newBalanceMicroUsdc,
    })

    // Record deposit event if specified
    if (args.depositAmount) {
      await ctx.db.insert('billingDeposits', {
        teamId: args.teamId,
        amountMicroUsdc: args.depositAmount,
        amountUsdc: args.depositAmount / 1_000_000,
        transactionSignature: args.transactionSignature,
        timestamp: Date.now(),
      })
    }

    return {
      previousBalance: team.currentBalance || 0,
      newBalance: args.newBalanceMicroUsdc,
      balanceUsdc: args.newBalanceMicroUsdc / 1_000_000,
    }
  },
})

/**
 * Internal mutation to trigger refill notifications (called by cron)
 */
export const triggerRefillNotifications = internalMutation({
  handler: async (ctx) => {
    const LOW_BALANCE_THRESHOLD = 10_000_000 // 10 USDC in micro units

    // Get all active teams
    const teams = await ctx.db
      .query('teams')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const alerts = []

    for (const team of teams) {
      const balance = team.currentBalance || 0

      if (balance < LOW_BALANCE_THRESHOLD && team.usdcTokenAccount) {
        alerts.push({
          teamId: team._id,
          teamName: team.name,
          balance: balance / 1_000_000,
          ownerUserId: team.ownerUserId,
        })

        // Could trigger webhook, email, or dashboard notification here
        console.log(`[Billing] Refill alert: ${team.name} has ${balance / 1_000_000} USDC`)
      }
    }

    return {
      teamsChecked: teams.length,
      alertsTriggered: alerts.length,
      alerts,
    }
  },
})
