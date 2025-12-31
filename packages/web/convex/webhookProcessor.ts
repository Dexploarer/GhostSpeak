"use node";

/**
 * Webhook Processor
 *
 * Background worker that delivers webhooks to subscriber URLs.
 * Called by cron jobs every 1 minute.
 */

import { internalAction, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { createHmac } from 'crypto'

/**
 * Process pending webhooks
 */
export const processWebhooks = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; successful: number; failed: number }> => {
    // Get pending webhooks ready for delivery
    const pendingWebhooks: any[] = await ctx.runQuery(internal.webhookDelivery.getPendingWebhooks)

    console.log(`[Webhook Processor] Found ${pendingWebhooks.length} pending webhooks`)

    // Process up to 50 webhooks per run to avoid timeouts
    const webhooksToProcess: any[] = pendingWebhooks.slice(0, 50)

    const results = await Promise.allSettled(
      webhooksToProcess.map((webhook: any) => deliverWebhook(ctx, webhook))
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
async function deliverWebhook(ctx: any, webhook: any) {
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
  } catch (error: any) {
    // Network error or timeout - mark as failed
    await ctx.runMutation(internal.webhookDelivery.markWebhookFailed, {
      webhookId: _id,
      error: error.message || 'Network error',
    })

    console.error(`[Webhook Delivery] Error: ${url} - ${error.message}`)
  }
}

