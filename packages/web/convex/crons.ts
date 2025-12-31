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
  internal.webhookProcessor.cleanupOldWebhooks
)

export default crons
