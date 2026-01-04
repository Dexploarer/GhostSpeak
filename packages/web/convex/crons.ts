/**
 * Convex Cron Jobs
 *
 * Scheduled tasks for GhostSpeak
 */

import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

// Poll for x402 transactions every 5 minutes
crons.interval(
  'poll x402 transactions',
  { minutes: 5 },
  api.x402Indexer.pollX402Transactions,
  {}
)

export default crons
