/**
 * Escrow Schema
 * Ghost Protect escrow transactions
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()
const walletAddressValidator = v.string()

export const escrows = defineTable({
  escrowId: v.string(),
  escrowIdNumber: v.string(),
  clientAddress: walletAddressValidator,
  agentAddress: walletAddressValidator,
  amount: v.string(),
  tokenMint: v.string(),
  tokenSymbol: v.optional(v.string()),
  tokenDecimals: v.optional(v.number()),
  jobDescription: v.string(),
  deliveryProof: v.optional(v.string()),
  status: v.union(
    v.literal('Active'),
    v.literal('Completed'),
    v.literal('Disputed'),
    v.literal('Cancelled')
  ),
  deadline: timestampValidator,
  createdAt: timestampValidator,
  completedAt: v.optional(timestampValidator),
  disputeReason: v.optional(v.string()),
  arbitratorDecision: v.optional(v.string()),
  transactionSignature: v.optional(v.string()),
  lastUpdated: timestampValidator,
})
  .index('by_escrow_id', ['escrowId'])
  .index('by_client', ['clientAddress'])
  .index('by_agent', ['agentAddress'])
  .index('by_status', ['status'])
  .index('by_client_status', ['clientAddress', 'status'])
  .index('by_agent_status', ['agentAddress', 'status'])
  .index('by_deadline', ['deadline'])

export const escrowEvents = defineTable({
  escrowId: v.string(),
  eventType: v.union(
    v.literal('created'),
    v.literal('delivery_submitted'),
    v.literal('approved'),
    v.literal('disputed'),
    v.literal('resolved'),
    v.literal('cancelled')
  ),
  actor: walletAddressValidator,
  data: v.optional(
    v.object({
      deliveryProof: v.optional(v.string()),
      disputeReason: v.optional(v.string()),
      arbitratorDecision: v.optional(v.string()),
      transactionSignature: v.optional(v.string()),
    })
  ),
  timestamp: timestampValidator,
})
  .index('by_escrow', ['escrowId'])
  .index('by_escrow_timestamp', ['escrowId', 'timestamp'])
  .index('by_event_type', ['eventType'])
