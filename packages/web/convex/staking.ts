/**
 * GhostSpeak Convex: Staking Queries & Mutations
 *
 * Real-time staking data for GHOST token reputation boosts
 */

import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

//
// ─── QUERIES ───────────────────────────────────────────────────────────────
//

/**
 * Get staking account for a specific agent
 */
export const getStakingAccount = query({
  args: { agentAddress: v.string() },
  handler: async (ctx, args) => {
    const stakingAccount = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    return stakingAccount
  },
})

/**
 * Get staking leaderboard (top stakers)
 */
export const getStakingLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10

    const stakingAccounts = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()

    // Sort by amount staked (descending)
    const sorted = stakingAccounts
      .sort((a, b) => b.amountStaked - a.amountStaked)
      .slice(0, limit)

    return sorted
  },
})

/**
 * Get staking history for a specific agent
 */
export const getStakingHistory = query({
  args: { agentAddress: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query('stakingEvents')
      .withIndex('by_agent_timestamp', (q) => q.eq('agentAddress', args.agentAddress))
      .order('desc')
      .take(50)

    return events
  },
})

/**
 * Get platform-wide staking stats
 */
export const getStakingStats = query({
  handler: async (ctx) => {
    const allStakingAccounts = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()

    const totalStaked = allStakingAccounts.reduce((acc, curr) => acc + curr.amountStaked, 0)
    const totalStakers = allStakingAccounts.length

    // Count by tier
    const tier1 = allStakingAccounts.filter((a) => a.tier === 1).length
    const tier2 = allStakingAccounts.filter((a) => a.tier === 2).length
    const tier3 = allStakingAccounts.filter((a) => a.tier === 3).length

    return {
      totalStaked,
      totalStakers,
      tierDistribution: {
        tier1,
        tier2,
        tier3,
      },
    }
  },
})

//
// ─── MUTATIONS ─────────────────────────────────────────────────────────────
//

/**
 * Record a new stake (called after on-chain stake succeeds)
 */
export const recordStake = mutation({
  args: {
    agentAddress: v.string(),
    amountStaked: v.number(),
    lockDuration: v.number(), // seconds
    txSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const unlockAt = now + args.lockDuration * 1000

    // Calculate tier based on amount
    let tier = 1
    let reputationBoostBps = 500 // 5%
    let hasVerifiedBadge = false
    let hasPremiumBenefits = false

    if (args.amountStaked >= 100_000) {
      tier = 3
      reputationBoostBps = 1500 // 15%
      hasVerifiedBadge = true
      hasPremiumBenefits = true
    } else if (args.amountStaked >= 10_000) {
      tier = 2
      reputationBoostBps = 1500 // 15%
      hasVerifiedBadge = true
    }

    // Check if staking account already exists
    const existingAccount = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    if (existingAccount) {
      // Update existing staking account (restaking)
      await ctx.db.patch(existingAccount._id, {
        amountStaked: args.amountStaked,
        stakedAt: now,
        unlockAt,
        lockDuration: args.lockDuration,
        reputationBoostBps,
        hasVerifiedBadge,
        hasPremiumBenefits,
        tier,
      })
    } else {
      // Create new staking account
      await ctx.db.insert('stakingAccounts', {
        agentAddress: args.agentAddress,
        amountStaked: args.amountStaked,
        stakedAt: now,
        unlockAt,
        lockDuration: args.lockDuration,
        reputationBoostBps,
        hasVerifiedBadge,
        hasPremiumBenefits,
        tier,
        isActive: true,
      })
    }

    // Record staking event
    await ctx.db.insert('stakingEvents', {
      agentAddress: args.agentAddress,
      eventType: 'staked',
      amount: args.amountStaked,
      timestamp: now,
      txSignature: args.txSignature,
      lockDuration: args.lockDuration,
      tierReached: tier,
    })

    return { success: true, tier, reputationBoostBps }
  },
})

/**
 * Record an unstake (called after on-chain unstake succeeds)
 */
export const recordUnstake = mutation({
  args: {
    agentAddress: v.string(),
    txSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const stakingAccount = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    if (!stakingAccount) {
      throw new Error('No active staking account found')
    }

    // Mark as inactive
    await ctx.db.patch(stakingAccount._id, {
      isActive: false,
    })

    // Record unstaking event
    await ctx.db.insert('stakingEvents', {
      agentAddress: args.agentAddress,
      eventType: 'unstaked',
      amount: stakingAccount.amountStaked,
      timestamp: Date.now(),
      txSignature: args.txSignature,
    })

    return { success: true }
  },
})

/**
 * Record a slash event (called by admin after on-chain slash)
 */
export const recordSlash = mutation({
  args: {
    agentAddress: v.string(),
    slashedAmount: v.number(),
    txSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const stakingAccount = await ctx.db
      .query('stakingAccounts')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    if (!stakingAccount) {
      throw new Error('No active staking account found')
    }

    // Update staked amount
    const newAmount = Math.max(0, stakingAccount.amountStaked - args.slashedAmount)
    await ctx.db.patch(stakingAccount._id, {
      amountStaked: newAmount,
    })

    // Record slashing event
    await ctx.db.insert('stakingEvents', {
      agentAddress: args.agentAddress,
      eventType: 'slashed',
      amount: args.slashedAmount,
      timestamp: Date.now(),
      txSignature: args.txSignature,
    })

    return { success: true, newAmount }
  },
})
