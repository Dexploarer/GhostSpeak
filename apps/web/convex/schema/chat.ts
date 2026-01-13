/**
 * Chat & Messaging Schema
 * Conversations, messages, agent messages
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()

export const conversations = defineTable({
  userId: v.id('users'),
  resourceId: v.string(),
  resourceUrl: v.string(),
  resourceName: v.string(),
  title: v.optional(v.string()),
  status: v.union(v.literal('active'), v.literal('completed'), v.literal('archived')),
  totalCost: v.number(),
  messageCount: v.number(),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_user', ['userId'])
  .index('by_user_resource', ['userId', 'resourceId'])

export const messages = defineTable({
  conversationId: v.id('conversations'),
  role: v.union(v.literal('user'), v.literal('agent')),
  content: v.string(),
  cost: v.optional(v.number()),
  transactionSignature: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
  createdAt: timestampValidator,
}).index('by_conversation', ['conversationId'])

export const agentMessages = defineTable({
  userId: v.id('users'),
  role: v.union(v.literal('user'), v.literal('agent')),
  content: v.string(),
  actionTriggered: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: timestampValidator,
})
  .index('by_user', ['userId'])
  .index('by_user_timestamp', ['userId', 'timestamp'])
