"use node";

/**
 * Webhook Processor
 *
 * Background worker that delivers webhooks to subscriber URLs.
 * Called by cron jobs every 1 minute.
 */

import { internalAction } from './_generated/server'
import type { ActionCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { internal } from './_generated/api'
import { createHmac } from 'crypto'
import { v } from 'convex/values'

/**
 * Process pending webhooks
 */
export const processWebhooks = internalAction({
  args: {},
  returns: v.object({
    processed: v.number(),
    successful: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx): Promise<{ processed: number; successful: number; failed: number }> => {
    // Get pending webhooks ready for delivery
    const pendingWebhooks: Doc<"webhookDeliveries">[] = await ctx.runQuery(
      internal.webhookDelivery.getPendingWebhooks
    )

    console.log(`[Webhook Processor] Found ${pendingWebhooks.length} pending webhooks`)

    // Process up to 50 webhooks per run to avoid timeouts
    const webhooksToProcess: Doc<"webhookDeliveries">[] = pendingWebhooks.slice(0, 50)

    const results = await Promise.allSettled(
      webhooksToProcess.map((webhook: Doc<"webhookDeliveries">) =>
        deliverWebhook(ctx, webhook)
      )
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    console.log(
      `[Webhook Processor] Processed ${webhooksToProcess.length} webhooks: ${successful} successful, ${failed} failed`
    )

    return { processed: webhooksToProcess.length, successful, failed }
  },
})

/**
 * Deliver a single webhook
 */
async function deliverWebhook(
  ctx: ActionCtx,
  webhook: Doc<"webhookDeliveries">
): Promise<void> {
  const { _id, url, secret, payload } = webhook

  try {
    // Generate HMAC signature
    const payloadString = JSON.stringify(payload)
    const hmac = createHmac('sha256', secret)
    hmac.update(payloadString)
    const signature = hmac.digest('hex')

    // Attempt delivery
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GhostSpeak-Signature': signature,
        'X-GhostSpeak-Event': payload.event,
        'X-GhostSpeak-Timestamp': payload.timestamp.toString(),
        'User-Agent': 'GhostSpeak-Webhook/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    const responseBody = await response.text().catch(() => '')

    if (response.ok) {
      // Success - mark as delivered
      await ctx.runMutation(internal.webhookDelivery.markWebhookDelivered, {
        webhookId: _id,
        responseStatus: response.status,
        responseBody: responseBody.slice(0, 1000), // Store first 1000 chars
      })

      console.log(`[Webhook Delivery] Success: ${url} (${response.status})`)
    } else {
      // HTTP error - mark as failed
      await ctx.runMutation(internal.webhookDelivery.markWebhookFailed, {
        webhookId: _id,
        error: `HTTP ${response.status}: ${responseBody}`,
        responseStatus: response.status,
      })

      console.error(`[Webhook Delivery] Failed: ${url} (${response.status})`)
    }
  } catch (error: unknown) {
    // Network error or timeout - mark as failed
    const errorMessage = error instanceof Error ? error.message : 'Network error'

    await ctx.runMutation(internal.webhookDelivery.markWebhookFailed, {
      webhookId: _id,
      error: errorMessage,
    })

    console.error(`[Webhook Delivery] Error: ${url} - ${errorMessage}`)
  }
}

