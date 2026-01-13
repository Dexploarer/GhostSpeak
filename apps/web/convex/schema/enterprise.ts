/**
 * Enterprise Schema
 * Teams, members, invites for B2B customers
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()

export const teams = defineTable({
  name: v.string(),
  ownerUserId: v.id('users'),
  plan: v.union(v.literal('startup'), v.literal('growth'), v.literal('enterprise')),
  usdcTokenAccount: v.optional(v.string()),
  monthlyBudget: v.optional(v.number()),
  currentBalance: v.optional(v.number()),
  lastBillingAt: v.optional(timestampValidator),
  maxMembers: v.number(),
  maxApiKeys: v.number(),
  isActive: v.boolean(),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_owner', ['ownerUserId'])
  .index('by_usdc_account', ['usdcTokenAccount'])

export const teamMembers = defineTable({
  teamId: v.id('teams'),
  userId: v.id('users'),
  role: v.union(
    v.literal('owner'),
    v.literal('admin'),
    v.literal('developer'),
    v.literal('viewer')
  ),
  canManageMembers: v.boolean(),
  canManageApiKeys: v.boolean(),
  canViewBilling: v.boolean(),
  isActive: v.boolean(),
  joinedAt: timestampValidator,
})
  .index('by_team', ['teamId'])
  .index('by_user', ['userId'])
  .index('by_team_user', ['teamId', 'userId'])

export const teamInvites = defineTable({
  teamId: v.id('teams'),
  email: v.string(),
  role: v.string(),
  invitedBy: v.id('users'),
  token: v.string(),
  status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('expired')),
  expiresAt: timestampValidator,
  createdAt: timestampValidator,
  acceptedAt: v.optional(timestampValidator),
})
  .index('by_team', ['teamId'])
  .index('by_email', ['email'])
  .index('by_token', ['token'])
  .index('by_status', ['status'])

export const billingDeductions = defineTable({
  teamId: v.id('teams'),
  amountMicroUsdc: v.number(),
  amountUsdc: v.number(),
  requestCount: v.number(),
  endpoint: v.string(),
  transactionSignature: v.optional(v.string()),
  timestamp: timestampValidator,
})
  .index('by_team', ['teamId'])
  .index('by_team_timestamp', ['teamId', 'timestamp'])
  .index('by_timestamp', ['timestamp'])

export const billingDeposits = defineTable({
  teamId: v.id('teams'),
  amountMicroUsdc: v.number(),
  amountUsdc: v.number(),
  transactionSignature: v.optional(v.string()),
  timestamp: timestampValidator,
})
  .index('by_team', ['teamId'])
  .index('by_team_timestamp', ['teamId', 'timestamp'])
  .index('by_timestamp', ['timestamp'])
