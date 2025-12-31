/**
 * Convex Verifications Module
 * Track agent verification usage for freemium limits
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Get user's verification count for current month
 */
export const getUserVerificationCount = query({
  args: { userId: v.id('users') },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Get start of current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    // Count verifications this month
    const verifications = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startOfMonth)
      )
      .collect()

    return verifications.length
  },
})

/**
 * Get user's recent verifications
 */
export const getUserVerifications = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('verifications'),
      _creationTime: v.number(),
      userId: v.id('users'),
      agentAddress: v.string(),
      ghostScore: v.number(),
      tier: v.string(),
      paymentMethod: v.optional(v.string()),
      paymentSignature: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 10

    return await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Check if user can verify (free tier monthly limit)
 */
export const canUserVerify = query({
  args: { userId: v.id('users') },
  returns: v.object({
    canVerify: v.boolean(),
    tier: v.string(),
    verificationsUsed: v.number(),
    verificationsLimit: v.number(),
  }),
  handler: async (ctx, args) => {
    // Free tier - check monthly limit
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    const verifications = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', args.userId).gte('timestamp', startOfMonth)
      )
      .collect()

    const FREE_TIER_LIMIT = 3
    const canVerify = verifications.length < FREE_TIER_LIMIT

    return {
      canVerify,
      tier: 'free',
      verificationsUsed: verifications.length,
      verificationsLimit: FREE_TIER_LIMIT,
    }
  },
})

/**
 * Get verification statistics
 */
export const getVerificationStats = query({
  args: { userId: v.id('users') },
  returns: v.object({
    totalVerifications: v.number(),
    thisMonth: v.number(),
    uniqueAgents: v.number(),
  }),
  handler: async (ctx, args) => {
    const allVerifications = await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    // Get this month's count
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const thisMonth = allVerifications.filter((v) => v.timestamp >= startOfMonth).length

    return {
      totalVerifications: allVerifications.length,
      thisMonth,
      uniqueAgents: new Set(allVerifications.map((v) => v.agentAddress)).size,
    }
  },
})

/**
 * Credit a paid verification (called from webhook)
 * This mutation is idempotent - it won't create duplicate verifications
 */
export const creditVerification = mutation({
  args: {
    userId: v.id('users'),
    agentAddress: v.string(),
    paymentMethod: v.string(), // 'crossmint', 'usdc', 'ghost_burned'
    paymentSignature: v.string(),
    amount: v.optional(v.string()), // Payment amount for record keeping
  },
  returns: v.id('verifications'),
  handler: async (ctx, args) => {
    // Check if verification already exists with this payment signature (idempotency)
    const existing = await ctx.db
      .query('verifications')
      .filter((q) => q.eq(q.field('paymentSignature'), args.paymentSignature))
      .first()

    if (existing) {
      console.log('[Convex] Verification already credited for payment:', args.paymentSignature)
      return existing._id
    }

    // Create new verification record
    const verificationId = await ctx.db.insert('verifications', {
      userId: args.userId,
      agentAddress: args.agentAddress,
      ghostScore: 0, // Will be updated by verification route
      tier: 'UNKNOWN', // Will be updated by verification route
      paymentMethod: args.paymentMethod,
      paymentSignature: args.paymentSignature,
      timestamp: Date.now(),
    })

    console.log('[Convex] Verification credited:', {
      verificationId,
      userId: args.userId,
      agentAddress: args.agentAddress,
      paymentMethod: args.paymentMethod,
    })

    return verificationId
  },
})

/**
 * Create verification with full details (called from verification route)
 */
export const createVerification = mutation({
  args: {
    userId: v.id('users'),
    agentAddress: v.string(),
    ghostScore: v.number(),
    tier: v.string(),
    paymentMethod: v.optional(v.string()),
    paymentSignature: v.optional(v.string()),
    timestamp: v.number(),
  },
  returns: v.id('verifications'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('verifications', {
      userId: args.userId,
      agentAddress: args.agentAddress,
      ghostScore: args.ghostScore,
      tier: args.tier,
      paymentMethod: args.paymentMethod,
      paymentSignature: args.paymentSignature,
      timestamp: args.timestamp,
    })
  },
})
