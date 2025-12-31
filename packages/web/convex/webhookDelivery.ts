/**
 * Webhook Delivery System
 *
 * Handles queuing and delivery of webhook events to B2B API customers.
 * Includes retry logic with exponential backoff for failed deliveries.
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { Id } from './_generated/dataModel'
import { createHmac } from 'crypto'

/**
 * Queue a webhook event for delivery
 */
export const queueWebhookEvent = mutation({
  args: {
    event: v.string(), // 'score.updated', 'tier.changed', 'credential.issued'
    agentAddress: v.string(),
    data: v.any(),
  },
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
  handler: async (ctx) => {
    const _now = Date.now()
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
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(secret: string, payload: any): string {
  const payloadString = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret)
  hmac.update(payloadString)
  return hmac.digest('hex')
}

/**
 * Test webhook delivery (returns mock data without saving)
 */
export const testWebhook = mutation({
  args: {
    url: v.string(),
    secret: v.string(),
  },
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

    const signature = generateWebhookSignature(args.secret, testPayload)

    return {
      payload: testPayload,
      signature,
      headers: {
        'X-GhostSpeak-Signature': signature,
        'X-GhostSpeak-Event': 'score.updated',
        'Content-Type': 'application/json',
      },
    }
  },
})
