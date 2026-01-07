import { query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get recent x402 payments for the dashboard ticker
 */
export const getRecentX402Payments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20

    // Fetch recent interactions that are x402 payments
    const payments = await ctx.db
      .query('historicalInteractions')
      .withIndex('by_block_time')
      .order('desc')
      .take(limit)

    return payments.map((p: any) => ({
      signature: p.transactionSignature,
      payer: p.userWalletAddress,
      merchant: p.agentWalletAddress, // In x402, agent is the merchant/receiver
      amount: p.amount || '0',
      timestamp: p.blockTime * 1000,
      facilitator: p.facilitatorAddress,
    }))
  },
})
