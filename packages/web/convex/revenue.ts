/**
 * Revenue Distribution Module
 *
 * Tracks and distributes protocol revenue:
 * - 10% → Staker rewards pool
 * - 90% → Protocol treasury
 *
 * Revenue is recorded from:
 * - B2B API usage (USDC or GHOST payments)
 * - B2C verification fees
 */

import { v } from 'convex/values'
import { mutation, query, internalQuery } from './_generated/server'
import { Id } from './_generated/dataModel'

// ─── REVENUE RECORDING ───────────────────────────────────────────────────────

/**
 * Record revenue from API usage and distribute to staker pool + protocol
 * Called automatically after each billable transaction
 */
export const recordRevenue = mutation({
  args: {
    paymentToken: v.string(), // 'usdc' | 'ghost'
    amountMicroUsdc: v.number(),
    amountMicroGhost: v.optional(v.number()),
    endpoint: v.string(),
    userId: v.optional(v.id('users')),
    agentAddress: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    distribution: v.object({
      stakerPool: v.number(), // UI amount
      protocol: v.number(), // UI amount
      token: v.string(),
    }),
  }),
  handler: async (ctx, args) => {
    const timestamp = Date.now()
    const dateString = new Date(timestamp).toISOString().split('T')[0] // YYYY-MM-DD

    // Calculate distribution: 10% staker pool, 90% protocol
    const STAKER_POOL_PERCENTAGE = 0.1
    const PROTOCOL_PERCENTAGE = 0.9

    let stakerPoolMicro = 0
    let protocolMicro = 0
    let stakerPoolUi = 0
    let protocolUi = 0
    let decimals = 6

    if (args.paymentToken === 'ghost' && args.amountMicroGhost) {
      // GHOST payment (6 decimals)
      stakerPoolMicro = Math.floor(args.amountMicroGhost * STAKER_POOL_PERCENTAGE)
      protocolMicro = args.amountMicroGhost - stakerPoolMicro
      stakerPoolUi = stakerPoolMicro / 1_000_000
      protocolUi = protocolMicro / 1_000_000
    } else {
      // USDC payment (6 decimals)
      stakerPoolMicro = Math.floor(args.amountMicroUsdc * STAKER_POOL_PERCENTAGE)
      protocolMicro = args.amountMicroUsdc - stakerPoolMicro
      stakerPoolUi = stakerPoolMicro / 1_000_000
      protocolUi = protocolMicro / 1_000_000
    }

    // Record in dailyRevenue table
    // Check if entry exists for today
    const existingRevenue = await ctx.db
      .query('dailyRevenue')
      .withIndex('by_date', (q) => q.eq('date', dateString))
      .first()

    if (existingRevenue) {
      // Update existing entry
      const updates: any = {}

      if (args.paymentToken === 'ghost') {
        updates.ghostRevenueMicro =
          (existingRevenue.ghostRevenueMicro || 0) + args.amountMicroGhost!
        updates.ghostStakerPoolMicro = (existingRevenue.ghostStakerPoolMicro || 0) + stakerPoolMicro
        updates.ghostProtocolMicro = (existingRevenue.ghostProtocolMicro || 0) + protocolMicro
      } else {
        updates.usdcRevenueMicro = (existingRevenue.usdcRevenueMicro || 0) + args.amountMicroUsdc
        updates.usdcStakerPoolMicro = (existingRevenue.usdcStakerPoolMicro || 0) + stakerPoolMicro
        updates.usdcProtocolMicro = (existingRevenue.usdcProtocolMicro || 0) + protocolMicro
      }

      updates.requestCount = (existingRevenue.requestCount ?? 0) + 1
      updates.lastUpdated = timestamp

      await ctx.db.patch(existingRevenue._id, updates)
    } else {
      // Create new entry for today
      const revenueData: any = {
        date: dateString,
        timestamp,
        lastUpdated: timestamp,
        requestCount: 1,
        usdcRevenueMicro: 0,
        usdcStakerPoolMicro: 0,
        usdcProtocolMicro: 0,
        ghostRevenueMicro: 0,
        ghostStakerPoolMicro: 0,
        ghostProtocolMicro: 0,
      }

      if (args.paymentToken === 'ghost') {
        revenueData.ghostRevenueMicro = args.amountMicroGhost!
        revenueData.ghostStakerPoolMicro = stakerPoolMicro
        revenueData.ghostProtocolMicro = protocolMicro
      } else {
        revenueData.usdcRevenueMicro = args.amountMicroUsdc
        revenueData.usdcStakerPoolMicro = stakerPoolMicro
        revenueData.usdcProtocolMicro = protocolMicro
      }

      await ctx.db.insert('dailyRevenue', revenueData)
    }

    // Also track by endpoint (for analytics)
    const endpointStats = await ctx.db
      .query('revenueByEndpoint')
      .withIndex('by_endpoint_date', (q) => q.eq('endpoint', args.endpoint).eq('date', dateString))
      .first()

    if (endpointStats) {
      const updates: any = {}

      if (args.paymentToken === 'ghost') {
        updates.ghostRevenueMicro =
          (endpointStats.ghostRevenueMicro || 0) + args.amountMicroGhost!
      } else {
        updates.usdcRevenueMicro = (endpointStats.usdcRevenueMicro || 0) + args.amountMicroUsdc
      }

      updates.requestCount = endpointStats.requestCount + 1
      updates.lastUpdated = timestamp

      await ctx.db.patch(endpointStats._id, updates)
    } else {
      const endpointData: any = {
        endpoint: args.endpoint,
        date: dateString,
        timestamp,
        lastUpdated: timestamp,
        requestCount: 1,
        usdcRevenueMicro: args.paymentToken === 'usdc' ? args.amountMicroUsdc : 0,
        ghostRevenueMicro: args.paymentToken === 'ghost' ? args.amountMicroGhost! : 0,
      }

      await ctx.db.insert('revenueByEndpoint', endpointData)
    }

    return {
      success: true,
      distribution: {
        stakerPool: stakerPoolUi,
        protocol: protocolUi,
        token: args.paymentToken,
      },
    }
  },
})

// ─── REVENUE QUERIES ─────────────────────────────────────────────────────────

/**
 * Get total revenue stats (all time, this month, today)
 */
export const getRevenueStats = query({
  args: {},
  returns: v.object({
    today: v.object({
      usdc: v.number(),
      ghost: v.number(),
      usdcStakerPool: v.number(),
      usdcProtocol: v.number(),
      ghostStakerPool: v.number(),
      ghostProtocol: v.number(),
      requests: v.number(),
    }),
    thisMonth: v.object({
      usdc: v.number(),
      ghost: v.number(),
      usdcStakerPool: v.number(),
      usdcProtocol: v.number(),
      ghostStakerPool: v.number(),
      ghostProtocol: v.number(),
      requests: v.number(),
    }),
    allTime: v.object({
      usdc: v.number(),
      ghost: v.number(),
      usdcStakerPool: v.number(),
      usdcProtocol: v.number(),
      ghostStakerPool: v.number(),
      ghostProtocol: v.number(),
      requests: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const now = new Date()
    const todayString = now.toISOString().split('T')[0]

    // This month's start date
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartString = monthStart.toISOString().split('T')[0]

    // Get all revenue records
    const allRevenue = await ctx.db.query('dailyRevenue').collect()

    // Today's revenue
    const todayRevenue = allRevenue.find((r) => r.date === todayString)

    // This month's revenue
    const thisMonthRevenue = allRevenue.filter((r) => r.date >= monthStartString)

    // Calculate totals
    const today = {
      usdc: (todayRevenue?.usdcRevenueMicro || 0) / 1_000_000,
      ghost: (todayRevenue?.ghostRevenueMicro || 0) / 1_000_000,
      usdcStakerPool: (todayRevenue?.usdcStakerPoolMicro || 0) / 1_000_000,
      usdcProtocol: (todayRevenue?.usdcProtocolMicro || 0) / 1_000_000,
      ghostStakerPool: (todayRevenue?.ghostStakerPoolMicro || 0) / 1_000_000,
      ghostProtocol: (todayRevenue?.ghostProtocolMicro || 0) / 1_000_000,
      requests: todayRevenue?.requestCount || 0,
    }

    const thisMonth = {
      usdc: thisMonthRevenue.reduce((sum, r) => sum + (r.usdcRevenueMicro || 0), 0) / 1_000_000,
      ghost: thisMonthRevenue.reduce((sum, r) => sum + (r.ghostRevenueMicro || 0), 0) / 1_000_000,
      usdcStakerPool:
        thisMonthRevenue.reduce((sum, r) => sum + (r.usdcStakerPoolMicro || 0), 0) / 1_000_000,
      usdcProtocol:
        thisMonthRevenue.reduce((sum, r) => sum + (r.usdcProtocolMicro || 0), 0) / 1_000_000,
      ghostStakerPool:
        thisMonthRevenue.reduce((sum, r) => sum + (r.ghostStakerPoolMicro || 0), 0) / 1_000_000,
      ghostProtocol:
        thisMonthRevenue.reduce((sum, r) => sum + (r.ghostProtocolMicro || 0), 0) / 1_000_000,
      requests: thisMonthRevenue.reduce((sum, r) => sum + (r.requestCount ?? 0), 0),
    }

    const allTime = {
      usdc: allRevenue.reduce((sum, r) => sum + (r.usdcRevenueMicro || 0), 0) / 1_000_000,
      ghost: allRevenue.reduce((sum, r) => sum + (r.ghostRevenueMicro || 0), 0) / 1_000_000,
      usdcStakerPool:
        allRevenue.reduce((sum, r) => sum + (r.usdcStakerPoolMicro || 0), 0) / 1_000_000,
      usdcProtocol:
        allRevenue.reduce((sum, r) => sum + (r.usdcProtocolMicro || 0), 0) / 1_000_000,
      ghostStakerPool:
        allRevenue.reduce((sum, r) => sum + (r.ghostStakerPoolMicro || 0), 0) / 1_000_000,
      ghostProtocol:
        allRevenue.reduce((sum, r) => sum + (r.ghostProtocolMicro || 0), 0) / 1_000_000,
      requests: allRevenue.reduce((sum, r) => sum + (r.requestCount ?? 0), 0),
    }

    return {
      today,
      thisMonth,
      allTime,
    }
  },
})

/**
 * Get revenue breakdown by endpoint
 */
export const getRevenueByEndpoint = query({
  args: {
    days: v.optional(v.number()), // Default 30 days
  },
  returns: v.array(
    v.object({
      endpoint: v.string(),
      usdc: v.number(),
      ghost: v.number(),
      requests: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const days = args.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateString = startDate.toISOString().split('T')[0]

    const endpointRevenue = await ctx.db
      .query('revenueByEndpoint')
      .filter((q) => q.gte(q.field('date'), startDateString))
      .collect()

    // Group by endpoint
    const grouped: Record<string, { usdc: number; ghost: number; requests: number }> = {}

    for (const record of endpointRevenue) {
      if (!grouped[record.endpoint]) {
        grouped[record.endpoint] = { usdc: 0, ghost: 0, requests: 0 }
      }

      grouped[record.endpoint].usdc += (record.usdcRevenueMicro || 0) / 1_000_000
      grouped[record.endpoint].ghost += (record.ghostRevenueMicro || 0) / 1_000_000
      grouped[record.endpoint].requests += record.requestCount
    }

    // Convert to array and sort by total revenue (USDC + GHOST equivalent)
    return Object.entries(grouped)
      .map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
      }))
      .sort((a, b) => b.usdc + b.ghost - (a.usdc + a.ghost))
  },
})

/**
 * Get staker pool balance (cumulative)
 */
export const getStakerPoolBalance = query({
  args: {},
  returns: v.object({
    usdc: v.number(),
    ghost: v.number(),
    totalDistributed: v.object({
      usdc: v.number(),
      ghost: v.number(),
    }),
    availableForDistribution: v.object({
      usdc: v.number(),
      ghost: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const allRevenue = await ctx.db.query('dailyRevenue').collect()

    const totalStakerPoolUsdc =
      allRevenue.reduce((sum, r) => sum + (r.usdcStakerPoolMicro || 0), 0) / 1_000_000
    const totalStakerPoolGhost =
      allRevenue.reduce((sum, r) => sum + (r.ghostStakerPoolMicro || 0), 0) / 1_000_000

    // TODO: Track actual distributions to stakers
    // For now, assume nothing has been distributed yet
    const distributedUsdc = 0
    const distributedGhost = 0

    return {
      usdc: totalStakerPoolUsdc,
      ghost: totalStakerPoolGhost,
      totalDistributed: {
        usdc: distributedUsdc,
        ghost: distributedGhost,
      },
      availableForDistribution: {
        usdc: totalStakerPoolUsdc - distributedUsdc,
        ghost: totalStakerPoolGhost - distributedGhost,
      },
    }
  },
})
