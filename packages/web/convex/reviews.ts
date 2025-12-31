/**
 * Convex Reviews Module
 * Manage agent reviews and ratings
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Get all reviews for an agent
 */
export const getAgentReviews = query({
  args: {
    agentAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50

    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_agent_timestamp', (q) => q.eq('agentAddress', args.agentAddress))
      .order('desc')
      .take(limit)

    // Get user info for each review
    const reviewsWithUsers = await Promise.all(
      reviews.map(async (review) => {
        const user = await ctx.db.get(review.userId)
        return {
          ...review,
          user: user
            ? {
                name: user.name || 'Anonymous',
                avatarUrl: user.avatarUrl,
                walletAddress: user.walletAddress,
              }
            : null,
        }
      })
    )

    return reviewsWithUsers
  },
})

/**
 * Get agent average rating
 */
export const getAgentAverageRating = query({
  args: { agentAddress: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        verifiedReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / reviews.length
    const verifiedReviews = reviews.filter((r) => r.verifiedHire).length

    // Calculate rating distribution
    const ratingDistribution = reviews.reduce(
      (dist, review) => {
        dist[review.rating as 1 | 2 | 3 | 4 | 5]++
        return dist
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    )

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      verifiedReviews,
      ratingDistribution,
    }
  },
})

/**
 * Submit a review
 */
export const createReview = mutation({
  args: {
    agentAddress: v.string(),
    userId: v.id('users'),
    rating: v.number(),
    review: v.string(),
    verifiedHire: v.boolean(),
    jobCategory: v.optional(v.string()),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    // Check for duplicate review
    const existingReview = await ctx.db
      .query('reviews')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .first()

    if (existingReview) {
      throw new Error('You have already reviewed this agent')
    }

    // Create review
    const now = Date.now()
    return await ctx.db.insert('reviews', {
      agentAddress: args.agentAddress,
      userId: args.userId,
      rating: args.rating,
      review: args.review,
      verifiedHire: args.verifiedHire,
      jobCategory: args.jobCategory,
      transactionSignature: args.transactionSignature,
      upvotes: 0,
      downvotes: 0,
      timestamp: now,
    })
  },
})

/**
 * Upvote a review
 */
export const upvoteReview = mutation({
  args: {
    reviewId: v.id('reviews'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Check if user already voted
    const existingVote = await ctx.db
      .query('reviewVotes')
      .withIndex('by_user_review', (q) => q.eq('userId', args.userId).eq('reviewId', args.reviewId))
      .first()

    const review = await ctx.db.get(args.reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote === 1) {
        // Already upvoted, remove vote
        await ctx.db.delete(existingVote._id)
        await ctx.db.patch(args.reviewId, {
          upvotes: review.upvotes - 1,
        })
      } else {
        // Was downvote, change to upvote
        await ctx.db.patch(existingVote._id, {
          vote: 1,
          timestamp: Date.now(),
        })
        await ctx.db.patch(args.reviewId, {
          upvotes: review.upvotes + 1,
          downvotes: review.downvotes - 1,
        })
      }
    } else {
      // Create new upvote
      await ctx.db.insert('reviewVotes', {
        reviewId: args.reviewId,
        userId: args.userId,
        vote: 1,
        timestamp: Date.now(),
      })
      await ctx.db.patch(args.reviewId, {
        upvotes: review.upvotes + 1,
      })
    }
  },
})

/**
 * Downvote a review
 */
export const downvoteReview = mutation({
  args: {
    reviewId: v.id('reviews'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Check if user already voted
    const existingVote = await ctx.db
      .query('reviewVotes')
      .withIndex('by_user_review', (q) => q.eq('userId', args.userId).eq('reviewId', args.reviewId))
      .first()

    const review = await ctx.db.get(args.reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote === -1) {
        // Already downvoted, remove vote
        await ctx.db.delete(existingVote._id)
        await ctx.db.patch(args.reviewId, {
          downvotes: review.downvotes - 1,
        })
      } else {
        // Was upvote, change to downvote
        await ctx.db.patch(existingVote._id, {
          vote: -1,
          timestamp: Date.now(),
        })
        await ctx.db.patch(args.reviewId, {
          upvotes: review.upvotes - 1,
          downvotes: review.downvotes + 1,
        })
      }
    } else {
      // Create new downvote
      await ctx.db.insert('reviewVotes', {
        reviewId: args.reviewId,
        userId: args.userId,
        vote: -1,
        timestamp: Date.now(),
      })
      await ctx.db.patch(args.reviewId, {
        downvotes: review.downvotes + 1,
      })
    }
  },
})

/**
 * Get user's vote on a review
 */
export const getUserVote = query({
  args: {
    reviewId: v.id('reviews'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query('reviewVotes')
      .withIndex('by_user_review', (q) => q.eq('userId', args.userId).eq('reviewId', args.reviewId))
      .first()

    return vote?.vote || 0
  },
})

/**
 * Get reviews written by a user
 */
export const getUserReviews = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20

    return await ctx.db
      .query('reviews')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
  },
})
