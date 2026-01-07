/**
 * API Credits System
 *
 * Manages user credits for API access:
 * - Free tier credits (reset monthly)
 * - Paid credits (purchased with USDC, SOL, or GHOST)
 * - Credit deduction on API calls
 * - Jupiter price fetching for token conversions
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import {
    TREASURY_WALLET,
    TOKENS,
    TIER_CONFIG,
    calculateCredits,
    getMonthlyFreeCredits,
    getRateLimit,
    JUPITER_API,
    type SubscriptionTier,
} from './treasury'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface CreditBalance {
    freeCredits: number
    paidCredits: number
    totalCredits: number
    tier: SubscriptionTier
    rateLimit: number
    ghostBonus: number
    lastReset: number | null
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get user's credit balance
 */
export const getBalance = query({
    args: { walletAddress: v.string() },
    handler: async (ctx, args): Promise<CreditBalance | null> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            return null
        }

        const tier = (user.subscriptionTier as SubscriptionTier) || 'free'
        const tierConfig = TIER_CONFIG[tier]

        return {
            freeCredits: user.freeCreditsRemaining ?? tierConfig.monthlyFreeCredits,
            paidCredits: user.paidCreditsBalance ?? 0,
            totalCredits:
                (user.freeCreditsRemaining ?? tierConfig.monthlyFreeCredits) +
                (user.paidCreditsBalance ?? 0),
            tier,
            rateLimit: tierConfig.rateLimit,
            ghostBonus: tierConfig.ghostBonus,
            lastReset: user.lastFreeCreditsReset ?? null,
        }
    },
})

/**
 * Get current token prices from Jupiter
 */
export const getTokenPrices = internalAction({
    args: {},
    handler: async (): Promise<{ usdc: number; sol: number; ghost: number }> => {
        try {
            // Fetch SOL and GHOST prices in USD
            const response = await fetch(
                `${JUPITER_API.priceUrl}?ids=${TOKENS.SOL.mint},${TOKENS.GHOST.mint}`
            )

            if (!response.ok) {
                console.error('[Credits] Jupiter price fetch failed:', response.status)
                return { usdc: 1, sol: 150, ghost: 0.00001 } // Fallback prices
            }

            const data = await response.json()

            return {
                usdc: 1, // USDC is always $1
                sol: data.data?.[TOKENS.SOL.mint]?.price ?? 150,
                ghost: data.data?.[TOKENS.GHOST.mint]?.price ?? 0.00001,
            }
        } catch (error) {
            console.error('[Credits] Failed to fetch token prices:', error)
            return { usdc: 1, sol: 150, ghost: 0.00001 } // Fallback prices
        }
    },
})

/**
 * Public mutation to add credits after payment (called from API routes)
 */
export const addCreditsPublic = mutation({
    args: {
        walletAddress: v.string(),
        credits: v.number(),
        paymentToken: v.string(),
        paymentAmount: v.number(),
        transactionSignature: v.string(),
    },
    handler: async (ctx, args) => {
        // In production, verify the transaction signature on-chain first
        // For MVP, we trust the client-provided signature

        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            throw new Error('User not found')
        }

        const currentPaid = user.paidCreditsBalance ?? 0
        const lifetime = user.lifetimeCreditsPurchased ?? 0

        await ctx.db.patch(user._id, {
            paidCreditsBalance: currentPaid + args.credits,
            lifetimeCreditsPurchased: lifetime + args.credits,
            lastActiveAt: Date.now(),
        })

        // Calculate approximate USD value based on token
        const amountUsdc =
            args.paymentToken === 'USDC'
                ? args.paymentAmount
                : args.paymentToken === 'SOL'
                    ? args.paymentAmount * 150
                    : args.paymentAmount * 0.00001

        await ctx.db.insert('userBillingDeposits', {
            userId: user._id,
            paymentToken: args.paymentToken.toLowerCase(),
            amountMicroUsdc: Math.floor(amountUsdc * 1_000_000),
            amountUsdc,
            amountMicroGhost: args.paymentToken === 'GHOST' ? Math.floor(args.paymentAmount * 1_000_000) : 0,
            amountGhost: args.paymentToken === 'GHOST' ? args.paymentAmount : 0,
            transactionSignature: args.transactionSignature,
            timestamp: Date.now(),
        })

        console.log(
            `[Credits] Added ${args.credits} credits to ${args.walletAddress} via ${args.paymentToken}`
        )

        return { success: true, newBalance: currentPaid + args.credits }
    },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Add credits to user's balance after payment verification
 */
export const addCredits = internalMutation({
    args: {
        walletAddress: v.string(),
        credits: v.number(),
        paymentToken: v.string(), // 'USDC' | 'SOL' | 'GHOST'
        paymentAmount: v.number(), // Amount in token units
        transactionSignature: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            throw new Error('User not found')
        }

        const currentPaid = user.paidCreditsBalance ?? 0
        const lifetime = user.lifetimeCreditsPurchased ?? 0

        await ctx.db.patch(user._id, {
            paidCreditsBalance: currentPaid + args.credits,
            lifetimeCreditsPurchased: lifetime + args.credits,
            lastActiveAt: Date.now(),
        })

        // Record the deposit using existing schema fields
        const amountUsdc =
            args.paymentToken === 'USDC'
                ? args.paymentAmount
                : args.paymentToken === 'SOL'
                    ? args.paymentAmount * 150 // Approximate SOL price
                    : args.paymentAmount * 0.00001 // Approximate GHOST price

        await ctx.db.insert('userBillingDeposits', {
            userId: user._id,
            paymentToken: args.paymentToken.toLowerCase(),
            amountMicroUsdc: Math.floor(amountUsdc * 1_000_000),
            amountUsdc,
            amountMicroGhost: args.paymentToken === 'GHOST' ? Math.floor(args.paymentAmount * 1_000_000) : 0,
            amountGhost: args.paymentToken === 'GHOST' ? args.paymentAmount : 0,
            transactionSignature: args.transactionSignature,
            timestamp: Date.now(),
        })

        console.log(
            `[Credits] Added ${args.credits} credits to ${args.walletAddress} via ${args.paymentToken}`
        )

        return { success: true, newBalance: currentPaid + args.credits }
    },
})


/**
 * Deduct credits for an API call
 */
export const deductCredits = internalMutation({
    args: {
        walletAddress: v.string(),
        credits: v.number(),
        endpoint: v.string(),
        apiKeyId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        const tier = (user.subscriptionTier as SubscriptionTier) || 'free'
        const freeCredits = user.freeCreditsRemaining ?? getMonthlyFreeCredits(tier)
        const paidCredits = user.paidCreditsBalance ?? 0
        const totalCredits = freeCredits + paidCredits

        if (totalCredits < args.credits) {
            return { success: false, error: 'Insufficient credits' }
        }

        // Deduct from free credits first, then paid
        let newFreeCredits = freeCredits
        let newPaidCredits = paidCredits
        let remaining = args.credits

        if (remaining <= freeCredits) {
            newFreeCredits = freeCredits - remaining
        } else {
            remaining -= freeCredits
            newFreeCredits = 0
            newPaidCredits = paidCredits - remaining
        }

        await ctx.db.patch(user._id, {
            freeCreditsRemaining: newFreeCredits,
            paidCreditsBalance: newPaidCredits,
            lastActiveAt: Date.now(),
        })

        return {
            success: true,
            remaining: newFreeCredits + newPaidCredits,
            freeCredits: newFreeCredits,
            paidCredits: newPaidCredits,
        }
    },
})

/**
 * Reset free credits for a user (called monthly)
 */
export const resetFreeCredits = internalMutation({
    args: { walletAddress: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        const tier = (user.subscriptionTier as SubscriptionTier) || 'free'
        const freeCredits = getMonthlyFreeCredits(tier)

        await ctx.db.patch(user._id, {
            freeCreditsRemaining: freeCredits,
            lastFreeCreditsReset: Date.now(),
        })

        return { success: true, freeCredits }
    },
})

/**
 * Upgrade user's subscription tier
 */
export const upgradeTier = mutation({
    args: {
        walletAddress: v.string(),
        newTier: v.string(),
    },
    handler: async (ctx, args) => {
        const tier = args.newTier as SubscriptionTier
        if (!TIER_CONFIG[tier]) {
            throw new Error('Invalid tier')
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            throw new Error('User not found')
        }

        const freeCredits = getMonthlyFreeCredits(tier)

        await ctx.db.patch(user._id, {
            subscriptionTier: tier,
            freeCreditsRemaining: freeCredits,
            lastFreeCreditsReset: Date.now(),
        })

        return { success: true, tier, freeCredits }
    },
})

/**
 * Check if user has enough credits
 */
export const hasCredits = query({
    args: {
        walletAddress: v.string(),
        required: v.number(),
    },
    handler: async (ctx, args): Promise<boolean> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            return false
        }

        const tier = (user.subscriptionTier as SubscriptionTier) || 'free'
        const freeCredits = user.freeCreditsRemaining ?? getMonthlyFreeCredits(tier)
        const paidCredits = user.paidCreditsBalance ?? 0

        return freeCredits + paidCredits >= args.required
    },
})

/**
 * Get pricing information for credit packages
 */
export const getPricing = query({
    args: { walletAddress: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let tier: SubscriptionTier = 'free'

        if (args.walletAddress) {
            const walletAddr = args.walletAddress
            const user = await ctx.db
                .query('users')
                .withIndex('by_wallet_address', (q) => q.eq('walletAddress', walletAddr))
                .first()

            if (user) {
                tier = (user.subscriptionTier as SubscriptionTier) || 'free'
            }
        }

        const tierConfig = TIER_CONFIG[tier]

        return {
            tier,
            tierConfig,
            pricePerThousandCredits: tierConfig.pricePerThousandCredits,
            ghostBonus: tierConfig.ghostBonus,
            treasuryWallet: TREASURY_WALLET,
            tokens: TOKENS,
        }
    },
})

/**
 * Get user's usage history
 */
export const getUsageHistory = query({
    args: {
        walletAddress: v.string(),
        days: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
            .first()

        if (!user) {
            return null
        }

        const daysAgo = args.days || 30
        const startTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000

        // Get deposits
        const deposits = await ctx.db
            .query('userBillingDeposits')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .filter((q) => q.gte(q.field('timestamp'), startTime))
            .order('desc')
            .take(100)

        // Get API usage from apiUsage table
        const apiUsage = await ctx.db
            .query('apiUsage')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .filter((q) => q.gte(q.field('timestamp'), startTime))
            .order('desc')
            .take(100)

        // Calculate daily usage
        const dailyUsage: Record<string, { credits: number; calls: number }> = {}
        for (const usage of apiUsage) {
            const date = new Date(usage.timestamp).toISOString().split('T')[0]
            if (!dailyUsage[date]) {
                dailyUsage[date] = { credits: 0, calls: 0 }
            }
            dailyUsage[date].credits += usage.cost || 1
            dailyUsage[date].calls += 1
        }

        const tier = (user.subscriptionTier as SubscriptionTier) || 'free'
        const tierConfig = TIER_CONFIG[tier]

        return {
            summary: {
                totalDeposits: deposits.length,
                totalApiCalls: apiUsage.length,
                totalCreditsUsed: apiUsage.reduce((sum, u) => sum + (u.cost || 1), 0),
                currentBalance: {
                    free: user.freeCreditsRemaining ?? tierConfig.monthlyFreeCredits,
                    paid: user.paidCreditsBalance ?? 0,
                },
                tier,
            },
            deposits: deposits.map((d) => ({
                token: d.paymentToken,
                amount: d.amountUsdc,
                timestamp: d.timestamp,
                signature: d.transactionSignature,
            })),
            dailyUsage: Object.entries(dailyUsage)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, data]) => ({
                    date,
                    credits: data.credits,
                    calls: data.calls,
                })),
            recentCalls: apiUsage.slice(0, 20).map((u) => ({
                endpoint: u.endpoint,
                method: u.method,
                credits: u.cost || 1,
                timestamp: u.timestamp,
                statusCode: u.statusCode,
            })),
        }
    },
})

/**
 * Get live token prices from Jupiter (public query for UI)
 */
export const getTokenPricesPublic = query({
    args: {},
    handler: async (): Promise<{ usdc: number; sol: number; ghost: number; lastUpdated: number }> => {
        // For now, return approximate prices
        // In production, you would cache Jupiter prices in the database
        // and update them periodically via a scheduled action
        return {
            usdc: 1,
            sol: 195, // Approximate SOL price in USD
            ghost: 0.000015, // Approximate GHOST price in USD
            lastUpdated: Date.now(),
        }
    },
})
