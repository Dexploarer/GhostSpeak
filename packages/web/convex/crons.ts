/**
 * Convex Cron Jobs
 *
 * Scheduled tasks for webhook delivery and data maintenance.
 */

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/**
 * Process webhook deliveries every 1 minute
 *
 * Attempts to deliver pending webhooks with exponential backoff retry logic.
 */
crons.interval('process-webhooks', { minutes: 1 }, internal.webhookProcessor.processWebhooks)

/**
 * Clean up old webhook deliveries every day at 2am UTC
 *
 * Removes delivered/failed webhook records older than 30 days.
 */
crons.daily(
  'cleanup-webhooks',
  { hourUTC: 2, minuteUTC: 0 },
  internal.webhookDelivery.cleanupOldWebhooks
)

/**
 * Sync x402 payments from on-chain every 5 minutes
 *
 * Polls Solana blockchain for PayAI x402 transactions to:
 * - Catch missed webhook events
 * - Verify webhook data integrity
 * - Enable historical backfilling
 * - Eliminate webhook dependency
 *
 * NOTE: This requires environment variable configuration:
 * - X402_POLLING_ENABLED=true (default)
 * - NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=<facilitator_address>
 * - X402_POLLING_BATCH_SIZE=100 (optional, default 100)
 *
 * Disable by setting X402_POLLING_ENABLED=false in production.env
 */
if (process.env.X402_POLLING_ENABLED !== 'false') {
  crons.interval(
    'sync-x402-payments',
    { minutes: 5 },
    // @ts-expect-error - x402Indexer not in generated types, run `bunx convex dev` to regenerate
    internal.x402Indexer.syncX402Payments,
    {
      facilitatorAddress: process.env.NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS || '',
      batchSize: parseInt(process.env.X402_POLLING_BATCH_SIZE || '100', 10),
    }
  )
}

/**
 * Verify webhook integrity against on-chain data every hour
 *
 * Compares webhook events with on-chain transactions to:
 * - Detect missed webhook deliveries
 * - Flag discrepancies between webhook and on-chain data
 * - Monitor webhook reliability
 *
 * Only runs when X402_POLLING_ENABLED=true
 */
if (process.env.X402_POLLING_ENABLED !== 'false') {
  // @ts-expect-error - x402Indexer not in generated types, run `bunx convex dev` to regenerate
  crons.hourly('verify-webhook-integrity', { minuteUTC: 30 }, internal.x402Indexer.verifyWebhookIntegrity)
}

export default crons
