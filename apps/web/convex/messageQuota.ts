/**
 * Message Quota Management
 *
 * Tracks daily message usage and enforces limits based on $GHOST holdings:
 * - Free: 3 messages/day
 * - $10+ GHOST: 100 messages/day
 * - $100+ GHOST: Unlimited
 */

import { v } from 'convex/values'
import { query, mutation, action } from './_generated/server'
import { api } from './_generated/api'

// Message tier limits
const MESSAGE_LIMITS = {
    free: 3,
    holder: 100,
    whale: 999999, // Effectively unlimited
}

// USD thresholds for tiers
const TIER_THRESHOLDS = {
    holder: 10, // $10 in $GHOST
    whale: 100, // $100 in $GHOST
}

// Cache duration for balance checks (5 minutes)
const BALANCE_CACHE_DURATION_MS = 5 * 60 * 1000

/**
 * Check if user can send a message
 * Returns: { canSend, remaining, tier, limit, reason? }
 */
export const checkMessageQuota = query({
    args: {
        walletAddress: v.string(),
    },
    handler: async (ctx, { walletAddress }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', walletAddress))
            .first()

        const todayUTC = new Date()
        const today = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUTC.getUTCDate()).padStart(2, '0')}`
        const tier = user?.messageTier || 'free'
        const limit = MESSAGE_LIMITS[tier as keyof typeof MESSAGE_LIMITS] || MESSAGE_LIMITS.free

        // Check if we need to reset for new day
        const isNewDay = user?.lastMessageDate !== today
        const currentCount = isNewDay ? 0 : (user?.dailyMessageCount || 0)
        const remaining = Math.max(0, limit - currentCount)
        const canSend = remaining > 0

        return {
            canSend,
            remaining,
            tier,
            limit,
            currentCount,
            isNewDay,
            reason: canSend ? undefined : `Daily limit of ${limit} messages reached. Hold more $GHOST for higher limits.`,
        }
    },
})

/**
 * Increment message count (call after successful message send)
 */
export const incrementMessageCount = mutation({
    args: {
        walletAddress: v.string(),
    },
    handler: async (ctx, { walletAddress }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', walletAddress))
            .first()

        const todayUTC = new Date()
        const today = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUTC.getUTCDate()).padStart(2, '0')}`
        const isNewDay = user?.lastMessageDate !== today
        const newCount = isNewDay ? 1 : (user?.dailyMessageCount || 0) + 1

        if (user) {
            await ctx.db.patch(user._id, {
                dailyMessageCount: newCount,
                lastMessageDate: today,
                lastActiveAt: Date.now(),
            })
        } else {
            // Create user if doesn't exist
            await ctx.db.insert('users', {
                walletAddress,
                dailyMessageCount: 1,
                lastMessageDate: today,
                messageTier: 'free',
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
            })
        }

        return { success: true, newCount }
    },
})

/**
 * Update user's message tier based on $GHOST balance
 * Called by action that checks on-chain balance
 */
export const updateMessageTier = mutation({
    args: {
        walletAddress: v.string(),
        ghostBalanceUsd: v.number(),
    },
    handler: async (ctx, { walletAddress, ghostBalanceUsd }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', walletAddress))
            .first()

        let tier: 'free' | 'holder' | 'whale' = 'free'
        if (ghostBalanceUsd >= TIER_THRESHOLDS.whale) {
            tier = 'whale'
        } else if (ghostBalanceUsd >= TIER_THRESHOLDS.holder) {
            tier = 'holder'
        }

        if (user) {
            await ctx.db.patch(user._id, {
                messageTier: tier,
                cachedGhostBalanceUsd: ghostBalanceUsd,
                lastGhostBalanceCheck: Date.now(),
            })
        } else {
            await ctx.db.insert('users', {
                walletAddress,
                messageTier: tier,
                cachedGhostBalanceUsd: ghostBalanceUsd,
                lastGhostBalanceCheck: Date.now(),
                dailyMessageCount: 0,
                lastMessageDate: (() => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; })(),
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
            })
        }

        return { tier, ghostBalanceUsd }
    },
})

/**
 * Check if we need to refresh balance
 */
export const needsBalanceRefresh = query({
    args: {
        walletAddress: v.string(),
    },
    handler: async (ctx, { walletAddress }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', walletAddress))
            .first()

        if (!user?.lastGhostBalanceCheck) return true

        const timeSinceCheck = Date.now() - user.lastGhostBalanceCheck
        return timeSinceCheck > BALANCE_CACHE_DURATION_MS
    },
})

/**
 * Get user's current tier and balance info
 */
export const getUserTier = query({
    args: {
        walletAddress: v.string(),
    },
    handler: async (ctx, { walletAddress }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', walletAddress))
            .first()

        return {
            tier: user?.messageTier || 'free',
            cachedBalanceUsd: user?.cachedGhostBalanceUsd || 0,
            limit: MESSAGE_LIMITS[(user?.messageTier as keyof typeof MESSAGE_LIMITS) || 'free'],
            thresholds: TIER_THRESHOLDS,
        }
    },
})
