/**
 * User Queries and Mutations
 *
 * All queries and mutations in this file require authentication via Crossmint JWT.
 * The JWT is validated by Convex using the configuration in auth.config.ts.
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get the currently authenticated user
 *
 * Uses ctx.auth.getUserIdentity() to get the authenticated user from the JWT
 */
export const getCurrent = query({
  args: {},
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
      usdcTokenAccount: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      currentBalance: v.optional(v.number()),
      lastBillingAt: v.optional(v.number()),
      ghostTokenAccount: v.optional(v.string()),
      currentGhostBalance: v.optional(v.number()),
      preferredPaymentToken: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get authenticated user identity from JWT
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    // Extract wallet address from JWT
    // Crossmint typically puts the wallet address in the 'subject' or 'tokenIdentifier' claim
    const walletAddress = identity.subject || identity.tokenIdentifier

    if (!walletAddress) {
      console.error('[users.getCurrent] No wallet address in JWT identity', identity)
      return null
    }

    return await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', walletAddress))
      .first()
  },
})

/**
 * Get user by wallet address (public query, no auth required)
 */
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
      // Individual billing fields - USDC
      usdcTokenAccount: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      currentBalance: v.optional(v.number()),
      lastBillingAt: v.optional(v.number()),
      // Individual billing fields - GHOST
      ghostTokenAccount: v.optional(v.string()),
      currentGhostBalance: v.optional(v.number()),
      preferredPaymentToken: v.optional(v.string()),
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
      // Individual billing fields - USDC
      usdcTokenAccount: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      currentBalance: v.optional(v.number()),
      lastBillingAt: v.optional(v.number()),
      // Individual billing fields - GHOST
      ghostTokenAccount: v.optional(v.string()),
      currentGhostBalance: v.optional(v.number()),
      preferredPaymentToken: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Upsert user (create or update)
 *
 * REQUIRES AUTHENTICATION
 * Creates a new user or updates an existing one based on wallet address
 */
export const upsert = mutation({
  args: {
    walletAddress: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized: Must be logged in to create/update user')
    }

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

/**
 * Update user preferences
 *
 * REQUIRES AUTHENTICATION
 */
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
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized: Must be logged in to update preferences')
    }

    // Verify the user owns this account
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const walletAddress = identity.subject || identity.tokenIdentifier
    if (user.walletAddress !== walletAddress) {
      throw new Error('Forbidden: Cannot update another user\'s preferences')
    }

    await ctx.db.patch(args.userId, {
      preferences: args.preferences,
      lastActiveAt: Date.now(),
    })
  },
})

/**
 * Record user activity
 *
 * REQUIRES AUTHENTICATION
 */
export const recordActivity = mutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized: Must be logged in to record activity')
    }

    // Verify the user owns this account
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const walletAddress = identity.subject || identity.tokenIdentifier
    if (user.walletAddress !== walletAddress) {
      throw new Error('Forbidden: Cannot update another user\'s activity')
    }

    await ctx.db.patch(args.userId, {
      lastActiveAt: Date.now(),
    })
  },
})
