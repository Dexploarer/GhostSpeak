/**
 * Billing & Payments Schema
 * Revenue tracking, user billing, team billing
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()
const walletAddressValidator = v.string()

// Payments
export const payments = defineTable({
  userId: v.id('users'),
  resourceId: v.string(),
  resourceUrl: v.string(),
  resourceName: v.string(),
  amount: v.number(),
  network: v.string(),
  transactionSignature: v.optional(v.string()),
  status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
  conversationId: v.optional(v.id('conversations')),
  messageId: v.optional(v.id('messages')),
  createdAt: timestampValidator,
  completedAt: v.optional(timestampValidator),
})
  .index('by_user', ['userId'])
  .index('by_resource', ['resourceId'])
  .index('by_status', ['status'])

// x402 sync state
export const x402SyncState = defineTable({
  facilitatorAddress: walletAddressValidator,
  lastSignature: v.string(),
  lastSyncAt: timestampValidator,
  totalSynced: v.number(),
  errors: v.optional(v.number()),
}).index('by_facilitator', ['facilitatorAddress'])

// x402 sync events
export const x402SyncEvents = defineTable({
  signature: v.string(),
  facilitatorAddress: walletAddressValidator,
  merchantAddress: walletAddressValidator,
  payerAddress: walletAddressValidator,
  amount: v.string(),
  success: v.boolean(),
  syncedAt: timestampValidator,
  sourceWebhook: v.boolean(),
  sourceOnChain: v.boolean(),
})
  .index('by_signature', ['signature'])
  .index('by_facilitator', ['facilitatorAddress'])
  .index('by_merchant', ['merchantAddress'])

// PayAI failed recordings
export const payaiFailedRecordings = defineTable({
  agentAddress: walletAddressValidator,
  paymentSignature: v.string(),
  amount: v.string(),
  responseTimeMs: v.number(),
  success: v.boolean(),
  payerAddress: walletAddressValidator,
  network: v.string(),
  error: v.string(),
  retryCount: v.number(),
  lastRetryAt: v.optional(timestampValidator),
  maxRetries: v.number(),
  status: v.union(
    v.literal('pending'),
    v.literal('retrying'),
    v.literal('succeeded'),
    v.literal('failed')
  ),
  timestamp: timestampValidator,
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_timestamp', ['timestamp'])
  .index('by_status', ['status'])
  .index('by_agent', ['agentAddress'])
  .index('by_payment_signature', ['paymentSignature'])

// User billing deductions
export const userBillingDeductions = defineTable({
  userId: v.id('users'),
  paymentToken: v.union(v.literal('usdc'), v.literal('ghost')),
  amountMicroUsdc: v.number(),
  amountUsdc: v.number(),
  amountMicroGhost: v.optional(v.number()),
  amountGhost: v.optional(v.number()),
  requestCount: v.number(),
  endpoint: v.string(),
  transactionSignature: v.optional(v.string()),
  timestamp: timestampValidator,
})
  .index('by_user', ['userId'])
  .index('by_user_timestamp', ['userId', 'timestamp'])
  .index('by_timestamp', ['timestamp'])
  .index('by_payment_token', ['paymentToken'])

// User billing deposits
export const userBillingDeposits = defineTable({
  userId: v.id('users'),
  paymentToken: v.union(v.literal('usdc'), v.literal('ghost')),
  amountMicroUsdc: v.number(),
  amountUsdc: v.number(),
  amountMicroGhost: v.optional(v.number()),
  amountGhost: v.optional(v.number()),
  transactionSignature: v.optional(v.string()),
  timestamp: timestampValidator,
})
  .index('by_user', ['userId'])
  .index('by_user_timestamp', ['userId', 'timestamp'])
  .index('by_timestamp', ['timestamp'])
  .index('by_payment_token', ['paymentToken'])

// Daily revenue
export const dailyRevenue = defineTable({
  date: v.string(),
  usdcRevenueMicro: v.optional(v.number()),
  usdcStakerPoolMicro: v.optional(v.number()),
  usdcProtocolMicro: v.optional(v.number()),
  ghostRevenueMicro: v.optional(v.number()),
  ghostStakerPoolMicro: v.optional(v.number()),
  ghostProtocolMicro: v.optional(v.number()),
  // Legacy fields
  b2cRevenue: v.optional(v.number()),
  b2bRevenue: v.optional(v.number()),
  payaiRevenue: v.optional(v.number()),
  otherRevenue: v.optional(v.number()),
  totalRevenue: v.optional(v.number()),
  stakerPoolRevenue: v.optional(v.number()),
  treasuryRevenue: v.optional(v.number()),
  verificationCount: v.optional(v.number()),
  b2bApiCalls: v.optional(v.number()),
  requestCount: v.optional(v.number()),
  lastUpdated: v.optional(timestampValidator),
  timestamp: timestampValidator,
})
  .index('by_date', ['date'])
  .index('by_timestamp', ['timestamp'])

// Revenue by endpoint
export const revenueByEndpoint = defineTable({
  endpoint: v.string(),
  date: v.string(),
  usdcRevenueMicro: v.optional(v.number()),
  ghostRevenueMicro: v.optional(v.number()),
  requestCount: v.number(),
  lastUpdated: timestampValidator,
  timestamp: timestampValidator,
})
  .index('by_endpoint', ['endpoint'])
  .index('by_endpoint_date', ['endpoint', 'date'])
  .index('by_date', ['date'])

// APY snapshots
export const apySnapshots = defineTable({
  date: v.string(),
  apy7Day: v.number(),
  apy30Day: v.number(),
  apy90Day: v.number(),
  totalWeightedStake: v.number(),
  totalStakers: v.number(),
  last7DaysRevenue: v.number(),
  last30DaysRevenue: v.number(),
  last90DaysRevenue: v.number(),
  timestamp: timestampValidator,
})
  .index('by_date', ['date'])
  .index('by_timestamp', ['timestamp'])

// User rewards
export const userRewards = defineTable({
  walletAddress: walletAddressValidator,
  pendingRewardsUsdc: v.number(),
  claimedRewardsUsdc: v.number(),
  lastClaimAt: v.optional(timestampValidator),
  currentStake: v.number(),
  stakingTier: v.number(),
  tierMultiplier: v.number(),
  weightedStake: v.number(),
  shareOfPool: v.number(),
  estimatedMonthlyUsdc: v.number(),
  estimatedApy: v.number(),
  lastUpdated: timestampValidator,
})
  .index('by_wallet', ['walletAddress'])
  .index('by_tier', ['stakingTier'])
  .index('by_last_updated', ['lastUpdated'])

// Reward claims
export const rewardClaims = defineTable({
  walletAddress: walletAddressValidator,
  amountUsdc: v.number(),
  transactionSignature: v.string(),
  stakedAmount: v.number(),
  stakingTier: v.number(),
  timestamp: timestampValidator,
})
  .index('by_wallet', ['walletAddress'])
  .index('by_wallet_timestamp', ['walletAddress', 'timestamp'])
  .index('by_timestamp', ['timestamp'])
