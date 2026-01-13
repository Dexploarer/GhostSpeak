/**
 * API Management Schema
 * API keys, usage tracking, webhooks for B2B customers
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()

// API keys
export const apiKeys = defineTable({
  userId: v.id('users'),
  hashedKey: v.string(),
  keyPrefix: v.string(),
  tier: v.union(v.literal('startup'), v.literal('growth'), v.literal('enterprise'), v.literal('free')),
  rateLimit: v.number(),
  isActive: v.boolean(),
  name: v.optional(v.string()),
  lastUsedAt: v.optional(timestampValidator),
  createdAt: timestampValidator,
  revokedAt: v.optional(timestampValidator),
})
  .index('by_user', ['userId'])
  .index('by_hashed_key', ['hashedKey'])
  .index('by_user_active', ['userId', 'isActive'])

// API usage tracking
export const apiUsage = defineTable({
  apiKeyId: v.id('apiKeys'),
  userId: v.id('users'),
  endpoint: v.string(),
  method: v.union(v.literal('GET'), v.literal('POST'), v.literal('PUT'), v.literal('DELETE')),
  agentAddress: v.optional(v.string()),
  statusCode: v.number(),
  responseTime: v.number(),
  billable: v.boolean(),
  cost: v.optional(v.number()),
  timestamp: timestampValidator,
})
  .index('by_api_key', ['apiKeyId'])
  .index('by_user', ['userId'])
  .index('by_timestamp', ['timestamp'])
  .index('by_user_timestamp', ['userId', 'timestamp'])
  .index('by_api_key_timestamp', ['apiKeyId', 'timestamp'])

// Webhook subscriptions
export const webhookSubscriptions = defineTable({
  apiKeyId: v.id('apiKeys'),
  userId: v.id('users'),
  url: v.string(),
  secret: v.string(),
  events: v.array(v.string()),
  agentAddresses: v.optional(v.array(v.string())),
  isActive: v.boolean(),
  totalDeliveries: v.number(),
  failedDeliveries: v.number(),
  lastDeliveryAt: v.optional(timestampValidator),
  lastFailureAt: v.optional(timestampValidator),
  createdAt: timestampValidator,
})
  .index('by_api_key', ['apiKeyId'])
  .index('by_user', ['userId'])
  .index('by_active', ['isActive'])

// Webhook delivery validator
const webhookEventDataValidator = v.union(
  v.object({
    kind: v.literal('score.updated'),
    ghostScore: v.number(),
    tier: v.string(),
    previousScore: v.number(),
    previousTier: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal('tier.changed'),
    tier: v.string(),
    ghostScore: v.number(),
    previousTier: v.string(),
  }),
  v.object({
    kind: v.literal('credential.issued'),
    credentialId: v.string(),
    tier: v.string(),
    milestone: v.number(),
  }),
  v.object({
    kind: v.literal('staking.created'),
    agentAddress: v.string(),
    amountStaked: v.number(),
    stakingTier: v.number(),
    reputationBoostBps: v.number(),
    lockDuration: v.number(),
  }),
  v.object({
    kind: v.literal('staking.updated'),
    agentAddress: v.string(),
    amountStaked: v.number(),
    stakingTier: v.number(),
    reputationBoostBps: v.number(),
    isActive: v.boolean(),
  })
)

// Webhook deliveries
export const webhookDeliveries = defineTable({
  subscriptionId: v.id('webhookSubscriptions'),
  userId: v.id('users'),
  event: v.string(),
  payload: v.object({
    event: v.union(
      v.literal('score.updated'),
      v.literal('tier.changed'),
      v.literal('credential.issued'),
      v.literal('staking.created'),
      v.literal('staking.updated')
    ),
    agentAddress: v.string(),
    data: webhookEventDataValidator,
    timestamp: timestampValidator,
  }),
  url: v.string(),
  secret: v.string(),
  status: v.union(v.literal('pending'), v.literal('delivered'), v.literal('failed')),
  attemptCount: v.number(),
  maxAttempts: v.number(),
  lastAttemptAt: v.optional(timestampValidator),
  deliveredAt: v.optional(timestampValidator),
  lastError: v.optional(v.string()),
  lastResponseStatus: v.optional(v.number()),
  lastResponseBody: v.optional(v.string()),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_subscription', ['subscriptionId'])
  .index('by_status', ['status'])
  .index('by_user', ['userId'])
