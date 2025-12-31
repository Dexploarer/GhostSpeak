/**
 * Webhook Subscriptions
 *
 * Queries and mutations for managing webhook subscriptions.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Create a new webhook subscription
 */
export const createWebhookSubscription = mutation({
  args: {
    apiKeyId: v.id('apiKeys'),
    url: v.string(),
    secret: v.string(),
    events: v.array(v.string()),
    agentAddresses: v.optional(v.array(v.string())),
  },
  returns: v.id('webhookSubscriptions'),
  handler: async (ctx, args) => {
    // Get API key to verify it exists and get userId
    const apiKey = await ctx.db.get(args.apiKeyId)
    if (!apiKey || !apiKey.isActive) {
      throw new Error('Invalid API key')
    }

    // Create webhook subscription
    const subscriptionId = await ctx.db.insert('webhookSubscriptions', {
      apiKeyId: args.apiKeyId,
      userId: apiKey.userId,
      url: args.url,
      secret: args.secret,
      events: args.events,
      agentAddresses: args.agentAddresses,
      isActive: true,
      totalDeliveries: 0,
      failedDeliveries: 0,
      createdAt: Date.now(),
    })

    return subscriptionId
  },
})

/**
 * List webhook subscriptions for an API key
 */
export const listWebhookSubscriptions = query({
  args: {
    apiKeyId: v.id('apiKeys'),
  },
  returns: v.array(
    v.object({
      _id: v.id('webhookSubscriptions'),
      _creationTime: v.number(),
      apiKeyId: v.id('apiKeys'),
      userId: v.id('users'),
      url: v.string(),
      secret: v.string(),
      events: v.array(v.string()),
      agentAddresses: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      totalDeliveries: v.number(),
      failedDeliveries: v.number(),
      createdAt: v.number(),
      lastDeliveryAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('webhookSubscriptions')
      .withIndex('by_api_key', (q) => q.eq('apiKeyId', args.apiKeyId))
      .collect()
  },
})

/**
 * Get a specific webhook subscription
 */
export const getWebhookSubscription = query({
  args: {
    subscriptionId: v.id('webhookSubscriptions'),
    apiKeyId: v.id('apiKeys'),
  },
  returns: v.union(
    v.object({
      _id: v.id('webhookSubscriptions'),
      _creationTime: v.number(),
      apiKeyId: v.id('apiKeys'),
      userId: v.id('users'),
      url: v.string(),
      secret: v.string(),
      events: v.array(v.string()),
      agentAddresses: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      totalDeliveries: v.number(),
      failedDeliveries: v.number(),
      createdAt: v.number(),
      lastDeliveryAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId)

    // Verify ownership
    if (subscription && subscription.apiKeyId !== args.apiKeyId) {
      throw new Error('Unauthorized')
    }

    return subscription
  },
})

/**
 * Delete a webhook subscription
 */
export const deleteWebhookSubscription = mutation({
  args: {
    subscriptionId: v.id('webhookSubscriptions'),
    apiKeyId: v.id('apiKeys'),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId)

    if (!subscription) {
      throw new Error('Webhook not found')
    }

    // Verify ownership
    if (subscription.apiKeyId !== args.apiKeyId) {
      throw new Error('Unauthorized')
    }

    // Soft delete by marking as inactive
    await ctx.db.patch(args.subscriptionId, {
      isActive: false,
    })

    return { success: true }
  },
})
