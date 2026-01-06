/**
 * Convex Cron Jobs
 *
 * Scheduled tasks for GhostSpeak
 */

import { cronJobs } from 'convex/server'
import { api, internal } from './_generated/api'

const crons = cronJobs()

// Poll for x402 transactions every 5 minutes
crons.interval('poll x402 transactions', { minutes: 5 }, api.x402Indexer.pollX402Transactions, {})

// ─── AGENT OBSERVATION SYSTEM ───────────────────────────────────────────────────

// Test x402 endpoints every hour (24x/day)
// Budget: ~$1/day, testing cheap endpoints ($0.001-$0.01)
crons.interval('test x402 endpoints', { hours: 1 }, internal.observation.runHourlyTests, {})

// Compile daily observation reports at midnight UTC
crons.cron(
  'compile daily observation reports',
  '0 0 * * *', // Every day at 00:00 UTC
  internal.observation.compileDailyReports,
  {}
)

// ─── CREDENTIAL SYSTEM ────────────────────────────────────────────────────────────

// Check for credential milestones daily at 1am UTC
// Issues credentials for agents who have crossed payment/reputation thresholds
crons.cron(
  'check credential milestones',
  '0 1 * * *', // Every day at 01:00 UTC
  internal.credentials.checkAndIssueMilestoneCredentials,
  {}
)

export default crons
