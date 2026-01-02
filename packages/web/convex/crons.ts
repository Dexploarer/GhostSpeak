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
 * Retry failed credential issuances every 15 minutes
 *
 * Attempts to re-issue credentials that failed due to temporary errors
 * (network issues, Crossmint API timeouts, etc.)
 */
crons.interval(
  'retry-failed-credentials',
  { minutes: 15 },
  internal.credentialsRetry.retryFailedIssuances
)

/**
 * Sync x402 payments from on-chain every 5 minutes
 *
 * Polls Solana blockchain for x402 transactions to:
 * - Catch missed webhook events
 * - Verify webhook data integrity
 * - Enable historical backfilling
 * - Eliminate webhook dependency
 *
 * NOTE: This requires environment variable configuration:
 * - X402_POLLING_ENABLED=true (default)
 * - NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=<facilitator_address>
 * - X402_POLLING_BATCH_SIZE=100 (optional, default 100)
 */
if (process.env.X402_POLLING_ENABLED !== 'false') {
  crons.interval(
    'sync-x402-payments',
    { minutes: 5 },
    internal.x402Actions.pollX402Transactions,
    {
      facilitatorAddress: process.env.NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS || '',
      batchSize: parseInt(process.env.X402_POLLING_BATCH_SIZE || '10', 10),
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
 */
if (process.env.X402_POLLING_ENABLED !== 'false') {
  crons.hourly('verify-webhook-integrity', { minuteUTC: 30 }, internal.x402Indexer.verifyWebhookIntegrity)
}

/**
 * Discover Ghost agents from x402 payments every 5 minutes
 *
 * Scans recent x402 payment transactions to discover new agents:
 * - Extracts merchant addresses from successful payments
 * - Pre-registers them as discovered agents (off-chain)
 * - Enables agents to claim their Ghost identity on-chain later
 * - Builds comprehensive agent discovery database
 *
 * This is the primary discovery method for devnet.
 * On mainnet, agents won't be created until claimed.
 */
crons.interval(
  'discover-from-x402-payments',
  { minutes: 5 },
  internal.ghostDiscoveryActions.discoverFromX402Payments,
  {
    facilitatorAddress: process.env.NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS || '',
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    batchSize: 100,
  }
)

/**
 * Monitor Ghost program logs for claim events every 10 minutes
 *
 * Tracks when discovered agents claim their Ghost identity on-chain:
 * - Detects claim transactions
 * - Updates agent status from "discovered" to "claimed"
 * - Syncs on-chain state with off-chain discovery database
 *
 * This is the secondary monitoring for claimed agents.
 */
crons.interval(
  'monitor-ghost-claims',
  { minutes: 10 },
  internal.ghostDiscoveryActions.pollGhostProgramLogs,
  {
    programId: process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID || '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
  }
)

/**
 * Recalculate Ghost Scores for all agents every 5 minutes
 *
 * Multi-source reputation aggregation with:
 * - 8 data sources (Payment activity, staking commitment, credentials, reviews, on-chain activity, governance, API quality, endorsements)
 * - Exponential time decay (different half-lives per source type)
 * - Sybil resistance via MAD-based outlier detection
 * - Bayesian confidence intervals for uncertainty quantification
 * - Tier calculation (Newcomer → Bronze → Silver → Gold → Platinum → Diamond)
 * - Badge assignment based on milestones
 *
 * Triggers webhooks and credential issuance for tier upgrades.
 */
crons.interval(
  'recalculate-ghost-scores',
  { minutes: 5 },
  internal.ghostScoreUpdater.recalculateScores
)

/**
 * Detect reputation anomalies every hour
 *
 * Fraud detection patterns:
 * - Rapid reputation growth (high score with low job count - potential Sybil attack)
 * - Score-performance mismatch (high score with low success rate)
 * - Low diversity indicators (wash trading detection)
 *
 * Creates webhook notifications for high-severity anomalies.
 */
crons.hourly(
  'detect-reputation-anomalies',
  { minuteUTC: 15 },
  internal.ghostScoreUpdater.detectAnomalies
)

export default crons
