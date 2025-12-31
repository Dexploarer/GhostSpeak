/**
 * Webhook Delivery System
 *
 * Handles queuing and delivery of webhook events to B2B API customers.
 * Includes retry logic with exponential backoff for failed deliveries.
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { Id } from './_generated/dataModel'

/**
 * Queue a webhook event for delivery
 */
export const queueWebhookEvent = mutation({
  args: {
    event: v.union(
      v.literal('score.updated'),
      v.literal('tier.changed'),
      v.literal('credential.issued'),
      v.literal('staking.created'),
      v.literal('staking.updated')
    ),
    agentAddress: v.string(),
    data: v.any(),
  },
  returns: v.object({
    queued: v.number(),
    webhookIds: v.array(v.id('webhookDeliveries')),
  }),
  handler: async (ctx, args) => {
    const { event, agentAddress, data } = args

    // Find all active subscriptions for this event type
    const subscriptions = await ctx.db
      .query('webhookSubscriptions')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()

    // Filter subscriptions that match this event and agent
    const matchingSubscriptions = subscriptions.filter((sub) => {
      // Check if event type matches
      if (!sub.events.includes(event)) return false

      // Check if agent filter matches (if specified)
      if (sub.agentAddresses && sub.agentAddresses.length > 0) {
        return sub.agentAddresses.includes(agentAddress)
      }

      return true
    })

    // Create webhook delivery records for each matching subscription
    const webhookIds: Id<'webhookDeliveries'>[] = []

    for (const subscription of matchingSubscriptions) {
      const webhookId = await ctx.db.insert('webhookDeliveries', {
        subscriptionId: subscription._id,
        userId: subscription.userId,
        event,
        payload: {
          event,
          agentAddress,
          data,
          timestamp: Date.now(),
        },
        url: subscription.url,
        secret: subscription.secret,
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      webhookIds.push(webhookId)
    }

    return { queued: webhookIds.length, webhookIds }
  },
})

/**
 * Get pending webhooks ready for delivery
 */
export const getPendingWebhooks = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('webhookDeliveries'),
      _creationTime: v.number(),
      subscriptionId: v.id('webhookSubscriptions'),
      userId: v.string(),
      event: v.string(),
      payload: v.any(),
      url: v.string(),
      secret: v.string(),
      status: v.string(),
      attemptCount: v.number(),
      maxAttempts: v.number(),
      lastAttemptAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      lastResponseStatus: v.optional(v.number()),
      lastResponseBody: v.optional(v.string()),
      deliveredAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    // Get pending webhooks that haven't been tried recently
    const webhooks = await ctx.db
      .query('webhookDeliveries')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()

    // Filter out webhooks that were attempted less than exponential backoff time ago
    return webhooks.filter((webhook) => {
      if (!webhook.lastAttemptAt) return true

      // Exponential backoff: 1min, 2min, 4min, 8min, 16min
      const backoffMs = Math.min(Math.pow(2, webhook.attemptCount) * 60 * 1000, 16 * 60 * 1000)

      return now - webhook.lastAttemptAt > backoffMs
    })
  },
})

/**
 * Mark webhook as delivered successfully
 */
export const markWebhookDelivered = internalMutation({
  args: {
    webhookId: v.id('webhookDeliveries'),
    responseStatus: v.number(),
    responseBody: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId)
    if (!webhook) return

    await ctx.db.patch(args.webhookId, {
      status: 'delivered',
      deliveredAt: Date.now(),
      updatedAt: Date.now(),
      lastResponseStatus: args.responseStatus,
      lastResponseBody: args.responseBody,
    })

    // Update subscription stats
    const subscription = await ctx.db.get(webhook.subscriptionId)
    if (subscription) {
      await ctx.db.patch(webhook.subscriptionId, {
        totalDeliveries: subscription.totalDeliveries + 1,
        lastDeliveryAt: Date.now(),
      })
    }
  },
})

/**
 * Mark webhook as failed
 */
export const markWebhookFailed = internalMutation({
  args: {
    webhookId: v.id('webhookDeliveries'),
    error: v.string(),
    responseStatus: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId)
    if (!webhook) return

    const attemptCount = webhook.attemptCount + 1
    const status = attemptCount >= webhook.maxAttempts ? 'failed' : 'pending'

    await ctx.db.patch(args.webhookId, {
      attemptCount,
      status,
      lastAttemptAt: Date.now(),
      lastError: args.error,
      lastResponseStatus: args.responseStatus,
      updatedAt: Date.now(),
    })

    // Update subscription stats if permanently failed
    if (status === 'failed') {
      const subscription = await ctx.db.get(webhook.subscriptionId)
      if (subscription) {
        await ctx.db.patch(webhook.subscriptionId, {
          failedDeliveries: subscription.failedDeliveries + 1,
          lastFailureAt: Date.now(),
        })
      }
    }
  },
})

/**
 * Get webhook delivery history for a subscription
 */
export const getWebhookHistory = query({
  args: {
    subscriptionId: v.id('webhookSubscriptions'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('webhookDeliveries'),
      _creationTime: v.number(),
      subscriptionId: v.id('webhookSubscriptions'),
      userId: v.string(),
      event: v.string(),
      payload: v.any(),
      url: v.string(),
      secret: v.string(),
      status: v.string(),
      attemptCount: v.number(),
      maxAttempts: v.number(),
      lastAttemptAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      lastResponseStatus: v.optional(v.number()),
      lastResponseBody: v.optional(v.string()),
      deliveredAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 50

    const deliveries = await ctx.db
      .query('webhookDeliveries')
      .withIndex('by_subscription', (q) => q.eq('subscriptionId', args.subscriptionId))
      .order('desc')
      .take(limit)

    return deliveries
  },
})

/**
 * Retry a failed webhook
 */
export const retryWebhook = mutation({
  args: {
    webhookId: v.id('webhookDeliveries'),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    // Verify user owns this webhook
    if (webhook.userId !== (await ctx.auth.getUserIdentity())?.subject) {
      throw new Error('Unauthorized')
    }

    // Reset status to pending and reset attempt count
    await ctx.db.patch(args.webhookId, {
      status: 'pending',
      attemptCount: 0,
      lastError: undefined,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Test webhook delivery (returns mock data without saving)
 *
 * Note: Signature generation should be done client-side using:
 * const crypto = require('crypto');
 * const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
 */
export const testWebhook = mutation({
  args: {
    url: v.string(),
    secret: v.string(),
  },
  returns: v.object({
    payload: v.any(),
    signatureInstructions: v.string(),
    signatureAlgorithm: v.string(),
    headers: v.object({
      'X-GhostSpeak-Signature': v.string(),
      'X-GhostSpeak-Event': v.string(),
      'X-GhostSpeak-Timestamp': v.string(),
      'Content-Type': v.string(),
    }),
  }),
  handler: async (ctx, args) => {
    const testPayload = {
      event: 'score.updated',
      agentAddress: 'TestAgent123...',
      data: {
        ghostScore: 5500,
        tier: 'GOLD',
        previousScore: 5000,
        previousTier: 'SILVER',
      },
      timestamp: Date.now(),
    }

    return {
      payload: testPayload,
      signatureInstructions: 'Generate HMAC-SHA256 signature client-side using your webhook secret',
      signatureAlgorithm: 'HMAC-SHA256',
      headers: {
        'X-GhostSpeak-Signature': '<generate HMAC-SHA256 of payload with your secret>',
        'X-GhostSpeak-Event': 'score.updated',
        'X-GhostSpeak-Timestamp': testPayload.timestamp.toString(),
        'Content-Type': 'application/json',
      },
    }
  },
})

/**
 * Clean up old webhook delivery records
 */
export const cleanupOldWebhooks = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    // Find old delivered/failed webhooks
    const oldWebhooks = await ctx.db
      .query('webhookDeliveries')
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field('status'), 'delivered'), q.eq(q.field('status'), 'failed')),
          q.lt(q.field('createdAt'), thirtyDaysAgo)
        )
      )
      .collect()

    // Delete them
    for (const webhook of oldWebhooks) {
      await ctx.db.delete(webhook._id)
    }

    console.log(`[Webhook Cleanup] Deleted ${oldWebhooks.length} old webhook records`)

    return { deleted: oldWebhooks.length }
  },
})
