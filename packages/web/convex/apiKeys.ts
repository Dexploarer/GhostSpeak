/**
 * B2B API Key Management
 * Queries and mutations for enterprise API access
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get all API keys for a user
 */
export const getByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
  },
})

/**
 * Get active API keys for a user
 */
export const getActiveByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiKeys')
      .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
      .collect()
  },
})

/**
 * Get API key by hashed key (for authentication)
 */
export const getByHashedKey = query({
  args: { hashedKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiKeys')
      .withIndex('by_hashed_key', (q) => q.eq('hashedKey', args.hashedKey))
      .first()
  },
})

/**
 * Get API key stats (usage, rate limits, etc.)
 */
export const getKeyStats = query({
  args: { apiKeyId: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId)
    if (!apiKey) {
      return null
    }

    // Get usage stats for last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const usageRecords = await ctx.db
      .query('apiUsage')
      .withIndex('by_api_key_timestamp', (q) =>
        q.eq('apiKeyId', args.apiKeyId).gte('timestamp', thirtyDaysAgo)
      )
      .collect()

    const totalRequests = usageRecords.length
    const billableRequests = usageRecords.filter((r) => r.billable).length
    const totalCost = usageRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    const avgResponseTime =
      usageRecords.reduce((sum, r) => sum + r.responseTime, 0) / (totalRequests || 1)

    // Get today's usage
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayRequests = usageRecords.filter((r) => r.timestamp >= todayStart.getTime()).length

    return {
      ...apiKey,
      stats: {
        totalRequests,
        billableRequests,
        totalCost,
        avgResponseTime,
        todayRequests,
      },
    }
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Create a new API key
 */
export const create = mutation({
  args: {
    userId: v.id('users'),
    hashedKey: v.string(),
    keyPrefix: v.string(),
    tier: v.string(),
    rateLimit: v.number(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    return await ctx.db.insert('apiKeys', {
      userId: args.userId,
      hashedKey: args.hashedKey,
      keyPrefix: args.keyPrefix,
      tier: args.tier,
      rateLimit: args.rateLimit,
      isActive: true,
      name: args.name,
      createdAt: now,
    })
  },
})

/**
 * Revoke an API key
 */
export const revoke = mutation({
  args: {
    apiKeyId: v.id('apiKeys'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId)

    // Verify ownership
    if (!apiKey || apiKey.userId !== args.userId) {
      throw new Error('API key not found or access denied')
    }

    await ctx.db.patch(args.apiKeyId, {
      isActive: false,
      revokedAt: Date.now(),
    })
  },
})

/**
 * Update API key metadata (name, tier, rate limit)
 */
export const update = mutation({
  args: {
    apiKeyId: v.id('apiKeys'),
    userId: v.id('users'),
    name: v.optional(v.string()),
    tier: v.optional(v.string()),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId)

    // Verify ownership
    if (!apiKey || apiKey.userId !== args.userId) {
      throw new Error('API key not found or access denied')
    }

    await ctx.db.patch(args.apiKeyId, {
      name: args.name ?? apiKey.name,
      tier: args.tier ?? apiKey.tier,
      rateLimit: args.rateLimit ?? apiKey.rateLimit,
    })
  },
})

/**
 * Update last used timestamp
 */
export const updateLastUsed = mutation({
  args: { apiKeyId: v.id('apiKeys') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
    })
  },
})
