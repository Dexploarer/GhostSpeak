/**
 * Agent Reputation Cache
 * Fast lookups for B2B API responses
 */

import { v } from 'convex/values'
import { query, mutation, internalQuery } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get cached reputation by agent address
 */
export const getByAddress = query({
  args: { agentAddress: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('agentReputationCache'),
      _creationTime: v.number(),
      agentAddress: v.string(),
      ghostScore: v.number(),
      tier: v.string(),
      successRate: v.number(),
      avgResponseTime: v.optional(v.number()),
      totalJobs: v.number(),
      disputes: v.number(),
      disputeResolution: v.string(),
      payaiData: v.optional(
        v.object({
          last30Days: v.object({
            transactions: v.number(),
            volume: v.string(),
            avgAmount: v.string(),
          }),
        })
      ),
      credentialId: v.optional(v.string()),
      lastUpdated: v.number(),
      cacheHits: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
      .first()
  },
})

/**
 * Get all agents by tier
 */
export const getByTier = query({
  args: { tier: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('agentReputationCache'),
      _creationTime: v.number(),
      agentAddress: v.string(),
      ghostScore: v.number(),
      tier: v.string(),
      successRate: v.number(),
      avgResponseTime: v.optional(v.number()),
      totalJobs: v.number(),
      disputes: v.number(),
      disputeResolution: v.string(),
      payaiData: v.optional(
        v.object({
          last30Days: v.object({
            transactions: v.number(),
            volume: v.string(),
            avgAmount: v.string(),
          }),
        })
      ),
      credentialId: v.optional(v.string()),
      lastUpdated: v.number(),
      cacheHits: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentReputationCache')
      .withIndex('by_tier', (q) => q.eq('tier', args.tier))
      .collect()
  },
})

/**
 * Get top agents by score
 */
export const getTopByScore = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('agentReputationCache'),
      _creationTime: v.number(),
      agentAddress: v.string(),
      ghostScore: v.number(),
      tier: v.string(),
      successRate: v.number(),
      avgResponseTime: v.optional(v.number()),
      totalJobs: v.number(),
      disputes: v.number(),
      disputeResolution: v.string(),
      payaiData: v.optional(
        v.object({
          last30Days: v.object({
            transactions: v.number(),
            volume: v.string(),
            avgAmount: v.string(),
          }),
        })
      ),
      credentialId: v.optional(v.string()),
      lastUpdated: v.number(),
      cacheHits: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 10
    return await ctx.db
      .query('agentReputationCache')
      .withIndex('by_score')
      .order('desc')
      .take(limit)
  },
})

/**
 * Get all cached reputation records (for anomaly detection)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('agentReputationCache').collect()
  },
})

/**
 * Internal version of getByAddress for cron jobs
 */
export const getByAddressInternal = internalQuery({
  args: { agentAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
      .first()
  },
})

/**
 * Internal version of listAll for cron jobs
 */
export const listAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('agentReputationCache').collect()
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Upsert cached reputation data
 */
export const upsert = mutation({
  args: {
    agentAddress: v.string(),
    ghostScore: v.number(),
    tier: v.string(),
    successRate: v.number(),
    avgResponseTime: v.optional(v.number()),
    totalJobs: v.number(),
    disputes: v.number(),
    disputeResolution: v.string(),
    payaiData: v.optional(
      v.object({
        last30Days: v.object({
          transactions: v.number(),
          volume: v.string(),
          avgAmount: v.string(),
        }),
      })
    ),
    credentialId: v.optional(v.string()),
  },
  returns: v.id('agentReputationCache'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ghostScore: args.ghostScore,
        tier: args.tier,
        successRate: args.successRate,
        avgResponseTime: args.avgResponseTime,
        totalJobs: args.totalJobs,
        disputes: args.disputes,
        disputeResolution: args.disputeResolution,
        payaiData: args.payaiData,
        credentialId: args.credentialId ?? existing.credentialId,
        lastUpdated: now,
        cacheHits: existing.cacheHits + 1,
      })
      return existing._id
    }

    return await ctx.db.insert('agentReputationCache', {
      agentAddress: args.agentAddress,
      ghostScore: args.ghostScore,
      tier: args.tier,
      successRate: args.successRate,
      avgResponseTime: args.avgResponseTime,
      totalJobs: args.totalJobs,
      disputes: args.disputes,
      disputeResolution: args.disputeResolution,
      payaiData: args.payaiData,
      credentialId: args.credentialId,
      lastUpdated: now,
      cacheHits: 1,
    })
  },
})

/**
 * Invalidate cache for an agent (force refresh)
 */
export const invalidate = mutation({
  args: { agentAddress: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})
