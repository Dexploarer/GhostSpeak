/**
 * GhostScore Convex Functions
 *
 * Manages agent verifications, subscriptions, and reviews
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

//
// ─── VERIFICATIONS ─────────────────────────────────────────────────────────
//

export const trackVerification = mutation({
  args: {
    agentAddress: v.string(),
    ghostScore: v.number(),
    tier: v.string(),
    subscriptionTier: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // Get or create user
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) throw new Error('User not found')

    // Create verification record
    return await ctx.db.insert('verifications', {
      userId: user._id,
      agentAddress: args.agentAddress,
      ghostScore: args.ghostScore,
      tier: args.tier,
      subscriptionTier: args.subscriptionTier,
      timestamp: Date.now(),
    })
  },
})

export const getVerificationCount = query({
  args: {
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return 0

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) return 0

    // Count verifications since startTime
    const verifications = await ctx.db
      .query('verifications')
      .withIndex('by_user_timestamp', (q) =>
        q.eq('userId', user._id).gte('timestamp', args.startTime)
      )
      .collect()

    return verifications.length
  },
})

export const getVerificationHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) return []

    return await ctx.db
      .query('verifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(50)
  },
})

//
// ─── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
//

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) return null

    return await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .first()
  },
})

export const createOrUpdateSubscription = mutation({
  args: {
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    tier: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) throw new Error('User not found')

    // Check if subscription exists
    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing
      return await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      })
    } else {
      // Create new
      return await ctx.db.insert('subscriptions', {
        userId: user._id,
        ...args,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

//
// ─── REVIEWS ───────────────────────────────────────────────────────────────
//

export const submitReview = mutation({
  args: {
    agentAddress: v.string(),
    rating: v.number(),
    review: v.string(),
    verifiedHire: v.boolean(),
    jobCategory: v.optional(v.string()),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) throw new Error('User not found')

    // Check if user already reviewed this agent
    const existingReview = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first()

    if (existingReview) {
      throw new Error('You have already reviewed this agent')
    }

    // Create review
    return await ctx.db.insert('reviews', {
      userId: user._id,
      agentAddress: args.agentAddress,
      rating: args.rating,
      review: args.review,
      verifiedHire: args.verifiedHire,
      upvotes: 0,
      downvotes: 0,
      jobCategory: args.jobCategory,
      transactionSignature: args.transactionSignature,
      timestamp: Date.now(),
    })
  },
})

export const getAgentReviews = query({
  args: {
    agentAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .order('desc')
      .take(limit)

    // Enrich with user data
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const user = await ctx.db.get(review.userId)
        return {
          ...review,
          user: user
            ? {
                name: user.name ?? 'Anonymous',
                avatarUrl: user.avatarUrl,
                walletAddress: user.walletAddress,
              }
            : null,
        }
      })
    )

    return enriched
  },
})

export const getReviewStats = query({
  args: {
    agentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedCount: 0,
      }
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = totalRating / reviews.length

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((r) => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
      ratingDistribution[rating]++
    })

    const verifiedCount = reviews.filter((r) => r.verifiedHire).length

    return {
      totalReviews: reviews.length,
      averageRating: Number(averageRating.toFixed(1)),
      ratingDistribution,
      verifiedCount,
    }
  },
})

export const voteOnReview = mutation({
  args: {
    reviewId: v.id('reviews'),
    vote: v.number(), // 1 or -1
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) throw new Error('User not found')

    // Check if user already voted
    const existingVote = await ctx.db
      .query('reviewVotes')
      .withIndex('by_user_review', (q) => q.eq('userId', user._id).eq('reviewId', args.reviewId))
      .first()

    const review = await ctx.db.get(args.reviewId)
    if (!review) throw new Error('Review not found')

    if (existingVote) {
      // Update vote if different
      if (existingVote.vote !== args.vote) {
        await ctx.db.patch(existingVote._id, {
          vote: args.vote,
          timestamp: Date.now(),
        })

        // Update review counts
        const delta = args.vote - existingVote.vote
        if (delta === 2) {
          // Changed from downvote to upvote
          await ctx.db.patch(args.reviewId, {
            upvotes: review.upvotes + 1,
            downvotes: review.downvotes - 1,
          })
        } else if (delta === -2) {
          // Changed from upvote to downvote
          await ctx.db.patch(args.reviewId, {
            upvotes: review.upvotes - 1,
            downvotes: review.downvotes + 1,
          })
        }
      }
    } else {
      // Create new vote
      await ctx.db.insert('reviewVotes', {
        reviewId: args.reviewId,
        userId: user._id,
        vote: args.vote,
        timestamp: Date.now(),
      })

      // Update review counts
      if (args.vote === 1) {
        await ctx.db.patch(args.reviewId, {
          upvotes: review.upvotes + 1,
        })
      } else {
        await ctx.db.patch(args.reviewId, {
          downvotes: review.downvotes + 1,
        })
      }
    }

    return { success: true }
  },
})

export const getUserVotes = query({
  args: {
    agentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return {}

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) return {}

    // Get all reviews for this agent
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const reviewIds = reviews.map((r) => r._id)

    // Get user's votes for these reviews
    const votes = await Promise.all(
      reviewIds.map(async (reviewId) => {
        const vote = await ctx.db
          .query('reviewVotes')
          .withIndex('by_user_review', (q) => q.eq('userId', user._id).eq('reviewId', reviewId))
          .first()
        return { reviewId, vote: vote?.vote }
      })
    )

    // Convert to map
    const voteMap: Record<string, number> = {}
    votes.forEach(({ reviewId, vote }) => {
      if (vote !== undefined) {
        voteMap[reviewId] = vote
      }
    })

    return voteMap
  },
})
