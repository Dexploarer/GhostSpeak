/**
 * Casper AI Agent Chat
 *
 * Convex mutations and queries for chatting with Casper agent
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Store user message
 */
export const storeUserMessage = mutation({
  args: {
    walletAddress: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Get or create user by wallet address
    let user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    // Auto-create user if doesn't exist (for testing and convenience)
    if (!user) {
      const userId = await ctx.db.insert('users', {
        walletAddress: args.walletAddress,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    // Store user message
    const messageId = await ctx.db.insert('agentMessages', {
      userId: user._id,
      role: 'user',
      content: args.message,
      timestamp: Date.now(),
    })

    return { messageId }
  },
})

/**
 * Store agent response
 */
export const storeAgentResponse = mutation({
  args: {
    walletAddress: v.string(),
    response: v.string(),
    actionTriggered: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get or create user by wallet address
    let user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    // Auto-create user if doesn't exist (for testing and convenience)
    if (!user) {
      const userId = await ctx.db.insert('users', {
        walletAddress: args.walletAddress,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    // Store agent response
    const messageId = await ctx.db.insert('agentMessages', {
      userId: user._id,
      role: 'agent',
      content: args.response,
      actionTriggered: args.actionTriggered,
      metadata: args.metadata,
      timestamp: Date.now(),
    })

    return { messageId }
  },
})

/**
 * Get chat history for a user
 */
export const getChatHistory = query({
  args: {
    walletAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get user by wallet address
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      return []
    }

    // Fetch messages
    const messages = await ctx.db
      .query('agentMessages')
      .withIndex('by_user_timestamp', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(args.limit || 50)

    // Return in chronological order (oldest first)
    return messages.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
      actionTriggered: msg.actionTriggered,
      metadata: msg.metadata,
      timestamp: msg.timestamp,
    }))
  },
})

/**
 * Clear chat history for a user
 */
export const clearChatHistory = mutation({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user by wallet address
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Delete all messages for this user
    const messages = await ctx.db
      .query('agentMessages')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    return { deleted: messages.length }
  },
})
