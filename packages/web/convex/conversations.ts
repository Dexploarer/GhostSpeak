/**
 * Conversation Queries and Mutations
 * Human-to-Agent chat functionality
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const getByUser = query({
  args: { userId: v.id('users') },
  returns: v.array(
    v.object({
      _id: v.id('conversations'),
      _creationTime: v.number(),
      userId: v.id('users'),
      resourceId: v.string(),
      resourceUrl: v.string(),
      resourceName: v.string(),
      title: v.string(),
      status: v.string(),
      totalCost: v.number(),
      messageCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(50)
  },
})

export const getById = query({
  args: { conversationId: v.id('conversations') },
  returns: v.union(
    v.object({
      _id: v.id('conversations'),
      _creationTime: v.number(),
      userId: v.id('users'),
      resourceId: v.string(),
      resourceUrl: v.string(),
      resourceName: v.string(),
      title: v.string(),
      status: v.string(),
      totalCost: v.number(),
      messageCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId)
  },
})

export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  returns: v.array(
    v.object({
      _id: v.id('messages'),
      _creationTime: v.number(),
      conversationId: v.id('conversations'),
      role: v.string(),
      content: v.string(),
      cost: v.optional(v.number()),
      transactionSignature: v.optional(v.string()),
      metadata: v.optional(v.any()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect()
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id('users'),
    resourceId: v.string(),
    resourceUrl: v.string(),
    resourceName: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.id('conversations'),
  handler: async (ctx, args) => {
    const now = Date.now()

    return await ctx.db.insert('conversations', {
      userId: args.userId,
      resourceId: args.resourceId,
      resourceUrl: args.resourceUrl,
      resourceName: args.resourceName,
      title: args.title ?? `Chat with ${args.resourceName}`,
      status: 'active',
      totalCost: 0,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const addMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    role: v.string(),
    content: v.string(),
    cost: v.optional(v.number()),
    transactionSignature: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id('messages'),
  handler: async (ctx, args) => {
    const now = Date.now()

    // Insert message
    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      cost: args.cost,
      transactionSignature: args.transactionSignature,
      metadata: args.metadata,
      createdAt: now,
    })

    // Update conversation stats
    const conversation = await ctx.db.get(args.conversationId)
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        messageCount: conversation.messageCount + 1,
        totalCost: conversation.totalCost + (args.cost ?? 0),
        updatedAt: now,
      })
    }

    return messageId
  },
})

export const archive = mutation({
  args: { conversationId: v.id('conversations') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      status: 'archived',
      updatedAt: Date.now(),
    })
  },
})
