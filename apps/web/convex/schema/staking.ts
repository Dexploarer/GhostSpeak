/**
 * Staking Schema
 * GHOST token staking for reputation boosts
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()
const walletAddressValidator = v.string()

export const stakingAccounts = defineTable({
  agentAddress: walletAddressValidator,
  amountStaked: v.number(),
  stakedAt: timestampValidator,
  unlockAt: timestampValidator,
  lockDuration: v.number(),
  reputationBoostBps: v.number(),
  hasVerifiedBadge: v.boolean(),
  hasPremiumBenefits: v.boolean(),
  tier: v.union(v.literal(1), v.literal(2), v.literal(3)),
  isActive: v.boolean(),
})
  .index('by_agent', ['agentAddress'])
  .index('by_tier', ['tier'])
  .index('by_active', ['isActive'])

export const stakingEvents = defineTable({
  agentAddress: walletAddressValidator,
  eventType: v.union(v.literal('staked'), v.literal('unstaked'), v.literal('slashed')),
  amount: v.number(),
  timestamp: timestampValidator,
  txSignature: v.string(),
  lockDuration: v.optional(v.number()),
  tierReached: v.optional(v.number()),
})
  .index('by_agent', ['agentAddress'])
  .index('by_type', ['eventType'])
  .index('by_timestamp', ['timestamp'])
  .index('by_agent_timestamp', ['agentAddress', 'timestamp'])
