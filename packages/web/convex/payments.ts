/**
 * Payment Queries and Mutations
 * x402 payment records
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const getByUser = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('payments'),
      _creationTime: v.number(),
      userId: v.id('users'),
      resourceId: v.string(),
      resourceUrl: v.string(),
      resourceName: v.string(),
      amount: v.number(),
      network: v.string(),
      status: v.string(),
      conversationId: v.optional(v.id('conversations')),
      messageId: v.optional(v.id('messages')),
      transactionSignature: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(args.limit ?? 50)
  },
})

export const getByResource = query({
  args: { resourceId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('payments'),
      _creationTime: v.number(),
      userId: v.id('users'),
      resourceId: v.string(),
      resourceUrl: v.string(),
      resourceName: v.string(),
      amount: v.number(),
      network: v.string(),
      status: v.string(),
      conversationId: v.optional(v.id('conversations')),
      messageId: v.optional(v.id('messages')),
      transactionSignature: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('payments')
      .withIndex('by_resource', (q) => q.eq('resourceId', args.resourceId))
      .order('desc')
      .take(args.limit ?? 50)
  },
})

export const getUserStats = query({
  args: { userId: v.id('users') },
  returns: v.object({
    totalPayments: v.number(),
    totalSpent: v.number(),
    lastPaymentAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    const completed = payments.filter((p) => p.status === 'completed')

    return {
      totalPayments: completed.length,
      totalSpent: completed.reduce((sum, p) => sum + p.amount, 0),
      lastPaymentAt: completed.length > 0 ? Math.max(...completed.map((p) => p.createdAt)) : null,
    }
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id('users'),
    resourceId: v.string(),
    resourceUrl: v.string(),
    resourceName: v.string(),
    amount: v.number(),
    network: v.string(),
    conversationId: v.optional(v.id('conversations')),
    messageId: v.optional(v.id('messages')),
  },
  returns: v.id('payments'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('payments', {
      userId: args.userId,
      resourceId: args.resourceId,
      resourceUrl: args.resourceUrl,
      resourceName: args.resourceName,
      amount: args.amount,
      network: args.network,
      status: 'pending',
      conversationId: args.conversationId,
      messageId: args.messageId,
      createdAt: Date.now(),
    })
  },
})

export const complete = mutation({
  args: {
    paymentId: v.id('payments'),
    transactionSignature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: 'completed',
      transactionSignature: args.transactionSignature,
      completedAt: Date.now(),
    })

    // Update user stats
    const payment = await ctx.db.get(args.paymentId)
    if (payment) {
      const user = await ctx.db.get(payment.userId)
      if (user) {
        await ctx.db.patch(payment.userId, {
          totalSpent: (user.totalSpent ?? 0) + payment.amount,
          totalTransactions: (user.totalTransactions ?? 0) + 1,
        })
      }
    }
  },
})

export const fail = mutation({
  args: { paymentId: v.id('payments') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: 'failed',
    })
  },
})
