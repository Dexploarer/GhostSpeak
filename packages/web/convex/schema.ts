/**
 * GhostSpeak Convex Schema
 *
 * Real-time database schema for the x402 marketplace
 */

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  //
  // ─── USERS ─────────────────────────────────────────────────────────────────
  //
  users: defineTable({
    // Wallet address (Solana)
    walletAddress: v.string(),
    // Optional email (from Crossmint)
    email: v.optional(v.string()),
    // Display name
    name: v.optional(v.string()),
    // Avatar URL
    avatarUrl: v.optional(v.string()),
    // User preferences
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        notifications: v.optional(v.boolean()),
        favoriteCategories: v.optional(v.array(v.string())),
      })
    ),
    // Stats
    totalSpent: v.optional(v.number()),
    totalTransactions: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index('by_wallet', ['walletAddress'])
    .index('by_email', ['email']),

  //
  // ─── FAVORITE RESOURCES ────────────────────────────────────────────────────
  //
  favorites: defineTable({
    userId: v.id('users'),
    resourceId: v.string(), // External resource ID
    resourceUrl: v.string(),
    resourceName: v.string(),
    category: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_resource', ['resourceId']),

  //
  // ─── CONVERSATIONS ─────────────────────────────────────────────────────────
  // Human-to-Agent chat history
  //
  conversations: defineTable({
    userId: v.id('users'),
    resourceId: v.string(), // External resource ID
    resourceUrl: v.string(),
    resourceName: v.string(),
    // Conversation metadata
    title: v.optional(v.string()),
    status: v.string(), // 'active', 'completed', 'archived'
    totalCost: v.number(),
    messageCount: v.number(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_resource', ['userId', 'resourceId']),

  //
  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  //
  messages: defineTable({
    conversationId: v.id('conversations'),
    role: v.string(), // 'user' or 'agent'
    content: v.string(),
    // Payment info (for agent responses)
    cost: v.optional(v.number()),
    transactionSignature: v.optional(v.string()),
    // Metadata
    metadata: v.optional(v.any()),
    // Timestamp
    createdAt: v.number(),
  }).index('by_conversation', ['conversationId']),

  //
  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  // x402 payment records
  //
  payments: defineTable({
    userId: v.id('users'),
    // Resource info
    resourceId: v.string(),
    resourceUrl: v.string(),
    resourceName: v.string(),
    // Payment details
    amount: v.number(), // In USD
    network: v.string(), // 'base', 'solana'
    transactionSignature: v.optional(v.string()),
    status: v.string(), // 'pending', 'completed', 'failed'
    // Optional conversation reference
    conversationId: v.optional(v.id('conversations')),
    messageId: v.optional(v.id('messages')),
    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_resource', ['resourceId'])
    .index('by_status', ['status']),

  //
  // ─── CACHED RESOURCES ──────────────────────────────────────────────────────
  // Cache external x402 resources for fast queries
  //
  cachedResources: defineTable({
    // Resource identity
    externalId: v.string(), // External resource ID
    url: v.string(),
    // Resource info
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    // Pricing
    network: v.string(),
    priceUsd: v.string(),
    facilitatorId: v.string(),
    // Status
    isActive: v.boolean(),
    isVerified: v.boolean(),
    // Cache metadata
    lastFetchedAt: v.number(),
    fetchCount: v.number(),
  })
    .index('by_external_id', ['externalId'])
    .index('by_category', ['category'])
    .index('by_network', ['network'])
    .index('by_facilitator', ['facilitatorId'])
    .searchIndex('search_resources', {
      searchField: 'name',
      filterFields: ['category', 'network'],
    }),

  //
  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  // Platform-wide analytics
  //
  analytics: defineTable({
    type: v.string(), // 'daily', 'weekly', 'monthly'
    date: v.string(), // ISO date string
    // Metrics
    totalPayments: v.number(),
    totalVolume: v.number(),
    uniqueUsers: v.number(),
    topCategories: v.array(
      v.object({
        category: v.string(),
        count: v.number(),
      })
    ),
    topResources: v.array(
      v.object({
        resourceId: v.string(),
        name: v.string(),
        count: v.number(),
      })
    ),
  })
    .index('by_type_date', ['type', 'date']),
})
