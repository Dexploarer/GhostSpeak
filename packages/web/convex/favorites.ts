/**
 * Favorite Resources Queries and Mutations
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const getByUser = query({
  args: { userId: v.id('users') },
  returns: v.array(
    v.object({
      _id: v.id('favorites'),
      _creationTime: v.number(),
      userId: v.id('users'),
      resourceId: v.string(),
      resourceUrl: v.string(),
      resourceName: v.string(),
      category: v.optional(v.string()),
      addedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect()
  },
})

export const isFavorite = query({
  args: {
    userId: v.id('users'),
    resourceId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('resourceId'), args.resourceId))
      .first()

    return favorite !== null
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const add = mutation({
  args: {
    userId: v.id('users'),
    resourceId: v.string(),
    resourceUrl: v.string(),
    resourceName: v.string(),
    category: v.optional(v.string()),
  },
  returns: v.id('favorites'),
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('resourceId'), args.resourceId))
      .first()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert('favorites', {
      userId: args.userId,
      resourceId: args.resourceId,
      resourceUrl: args.resourceUrl,
      resourceName: args.resourceName,
      category: args.category,
      addedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: {
    userId: v.id('users'),
    resourceId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('resourceId'), args.resourceId))
      .first()

    if (favorite) {
      await ctx.db.delete(favorite._id)
    }
  },
})

export const toggle = mutation({
  args: {
    userId: v.id('users'),
    resourceId: v.string(),
    resourceUrl: v.string(),
    resourceName: v.string(),
    category: v.optional(v.string()),
  },
  returns: v.object({ favorited: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('resourceId'), args.resourceId))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return { favorited: false }
    }

    await ctx.db.insert('favorites', {
      userId: args.userId,
      resourceId: args.resourceId,
      resourceUrl: args.resourceUrl,
      resourceName: args.resourceName,
      category: args.category,
      addedAt: Date.now(),
    })

    return { favorited: true }
  },
})
