/**
 * User Queries and Mutations
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const getByWallet = query({
  args: { walletAddress: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      walletAddress: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      createdAt: v.number(),
      lastActiveAt: v.number(),
      preferences: v.optional(
        v.object({
          theme: v.optional(v.string()),
          notifications: v.optional(v.boolean()),
          favoriteCategories: v.optional(v.array(v.string())),
        })
      ),
      totalSpent: v.optional(v.number()),
      totalTransactions: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', args.walletAddress))
      .first()
  },
})

export const getById = query({
  args: { userId: v.id('users') },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      walletAddress: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      createdAt: v.number(),
      lastActiveAt: v.number(),
      preferences: v.optional(
        v.object({
          theme: v.optional(v.string()),
          notifications: v.optional(v.boolean()),
          favoriteCategories: v.optional(v.array(v.string())),
        })
      ),
      totalSpent: v.optional(v.number()),
      totalTransactions: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    walletAddress: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email ?? existing.email,
        name: args.name ?? existing.name,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        lastActiveAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      walletAddress: args.walletAddress,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: now,
      lastActiveAt: now,
    })
  },
})

export const updatePreferences = mutation({
  args: {
    userId: v.id('users'),
    preferences: v.object({
      theme: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      favoriteCategories: v.optional(v.array(v.string())),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      preferences: args.preferences,
      lastActiveAt: Date.now(),
    })
  },
})

export const recordActivity = mutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastActiveAt: Date.now(),
    })
  },
})
