/**
 * B2B API Usage Tracking
 * Track API calls for billing and analytics
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get usage summary for an API key (for billing dashboard)
 */
export const getSummaryByKey = query({
  args: {
    apiKeyId: v.id('apiKeys'),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalRequests: v.number(),
    billableRequests: v.number(),
    totalCost: v.number(),
    byEndpoint: v.any(),
  }),
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query('apiUsage')
      .withIndex('by_api_key_timestamp', (q) =>
        q
          .eq('apiKeyId', args.apiKeyId)
          .gte('timestamp', args.startDate)
          .lte('timestamp', args.endDate)
      )
      .collect()

    // Aggregate by endpoint
    const byEndpoint = records.reduce(
      (acc, record) => {
        if (!acc[record.endpoint]) {
          acc[record.endpoint] = {
            count: 0,
            billableCount: 0,
            totalCost: 0,
            avgResponseTime: 0,
          }
        }
        acc[record.endpoint].count++
        if (record.billable) acc[record.endpoint].billableCount++
        acc[record.endpoint].totalCost += record.cost || 0
        acc[record.endpoint].avgResponseTime += record.responseTime
        return acc
      },
      {} as Record<
        string,
        { count: number; billableCount: number; totalCost: number; avgResponseTime: number }
      >
    )

    // Calculate averages
    Object.keys(byEndpoint).forEach((endpoint) => {
      byEndpoint[endpoint].avgResponseTime /= byEndpoint[endpoint].count
    })

    return {
      totalRequests: records.length,
      billableRequests: records.filter((r) => r.billable).length,
      totalCost: records.reduce((sum, r) => sum + (r.cost || 0), 0),
      byEndpoint,
    }
  },
})

/**
 * Get usage summary for a user (across all API keys)
 */
export const getSummaryByUser = query({
  args: {
    userId: v.id('users'),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalRequests: v.number(),
    billableRequests: v.number(),
    totalCost: v.number(),
    daily: v.any(),
  }),
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query('apiUsage')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', args.startDate).lte('timestamp', args.endDate)
      )
      .collect()

    // Daily breakdown
    const daily = records.reduce(
      (acc, record) => {
        const date = new Date(record.timestamp).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { count: 0, cost: 0 }
        }
        acc[date].count++
        acc[date].cost += record.cost || 0
        return acc
      },
      {} as Record<string, { count: number; cost: number }>
    )

    return {
      totalRequests: records.length,
      billableRequests: records.filter((r) => r.billable).length,
      totalCost: records.reduce((sum, r) => sum + (r.cost || 0), 0),
      daily,
    }
  },
})

/**
 * Get recent usage (for real-time monitoring)
 */
export const getRecent = query({
  args: {
    apiKeyId: v.id('apiKeys'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('apiUsage'),
      _creationTime: v.number(),
      apiKeyId: v.id('apiKeys'),
      userId: v.id('users'),
      endpoint: v.string(),
      method: v.string(),
      agentAddress: v.optional(v.string()),
      statusCode: v.number(),
      responseTime: v.number(),
      billable: v.boolean(),
      cost: v.optional(v.number()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    const records = await ctx.db
      .query('apiUsage')
      .withIndex('by_api_key_timestamp', (q) => q.eq('apiKeyId', args.apiKeyId))
      .order('desc')
      .take(limit)

    return records
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Track an API call
 */
export const track = mutation({
  args: {
    apiKeyId: v.id('apiKeys'),
    userId: v.id('users'),
    endpoint: v.string(),
    method: v.string(),
    agentAddress: v.optional(v.string()),
    statusCode: v.number(),
    responseTime: v.number(),
    billable: v.boolean(),
    cost: v.optional(v.number()),
  },
  returns: v.id('apiUsage'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('apiUsage', {
      apiKeyId: args.apiKeyId,
      userId: args.userId,
      endpoint: args.endpoint,
      method: args.method,
      agentAddress: args.agentAddress,
      statusCode: args.statusCode,
      responseTime: args.responseTime,
      billable: args.billable,
      cost: args.cost,
      timestamp: Date.now(),
    })
  },
})

/**
 * Batch track API calls (for high-volume usage)
 */
export const trackBatch = mutation({
  args: {
    records: v.array(
      v.object({
        apiKeyId: v.id('apiKeys'),
        userId: v.id('users'),
        endpoint: v.string(),
        method: v.string(),
        agentAddress: v.optional(v.string()),
        statusCode: v.number(),
        responseTime: v.number(),
        billable: v.boolean(),
        cost: v.optional(v.number()),
      })
    ),
  },
  returns: v.array(v.id('apiUsage')),
  handler: async (ctx, args) => {
    const timestamp = Date.now()
    const results = []

    for (const record of args.records) {
      const id = await ctx.db.insert('apiUsage', {
        ...record,
        timestamp,
      })
      results.push(id)
    }

    return results
  },
})
