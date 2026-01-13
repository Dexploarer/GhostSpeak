import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Doc } from './_generated/dataModel'

/**
 * Calculate voting power based on x402 participation.
 * Power = Total USD volume (mocked for now) + (Transaction count * 10)
 */
export const calculateVotingPower = query({
  args: {
    address: v.string(), // Wallet address to check
  },
  handler: async (ctx, args) => {
    // 1. Fetch transactions where user is payer or merchant
    // Note: We need to scan x402SyncEvents. Indexes are by_facilitator/merchant
    // For MVP, we'll query all and filter, or use merchant index if they are an agent.
    // Ideally we need an index `by_payer` on x402SyncEvents.

    // Using merchant index for agents
    const merchantEvents = await ctx.db
      .query('x402SyncEvents')
      .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.address))
      .collect()

    // For payers (users), we'd rely on a `by_payer` index or scan.
    // Given the schema limitations and "future feature" status, we'll implement a basic power calc
    // based on agent identity credential (if they have one) + merchant events.

    let totalVolume = 0
    let txCount = 0

    // Sum merchant volume
    for (const event of merchantEvents) {
      if (event.success) {
        totalVolume += parseFloat(event.amount) || 0
        txCount++
      }
    }

    // TODO: Sum payer volume when index is available or scan allowed.
    // For now, if they are just a user, we give base power if they have any payments recorded in `payments` table
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.address))
      .first()

    if (user) {
      const userPayments = await ctx.db
        .query('payments')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()

      for (const p of userPayments) {
        if (p.status === 'completed') {
          totalVolume += p.amount
          txCount++
        }
      }
    }

    // Voting Power Formula: 1 Point per $1 USD volume + 10 Points per Transaction
    const power = Math.floor(totalVolume + txCount * 10)

    return {
      power,
      breakdown: {
        volume: totalVolume,
        txCount,
        isAgent: merchantEvents.length > 0,
        isUser: !!user,
      },
    }
  },
})

/**
 * Cast a vote on an agent's service quality.
 * Requires non-zero voting power.
 */
export const castVote = mutation({
  args: {
    voterAddress: v.string(),
    targetAgentAddress: v.string(),
    score: v.number(), // 1-5
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.score < 1 || args.score > 5) {
      throw new Error('Score must be between 1 and 5')
    }

    // Check voting power internally to ensure validity
    // We can reuse the logic or just assume the frontend checked. Use internal check for security.
    // Re-implement simplified check for mutation speed:

    const merchantEvents = await ctx.db
      .query('x402SyncEvents')
      .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.voterAddress))
      .take(1)

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.voterAddress))
      .first()

    let hasPower = merchantEvents.length > 0

    if (!hasPower && user) {
      const payment = await ctx.db
        .query('payments')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first()
      if (payment) hasPower = true
    }

    if (!hasPower) {
      // Allow simplified "participation" vote if they are at least registered/known?
      // For now, strict: must have x402 trace.
      // Fallback: If they have a ghost score, they have power.
      const agentStats = await ctx.db
        .query('agentReputationCache')
        .withIndex('by_address', (q) => q.eq('agentAddress', args.voterAddress))
        .first()
      if (agentStats) hasPower = true
    }

    if (!hasPower) {
      throw new Error(
        'No voting power. Participate in x402 transactions to earn the right to vote.'
      )
    }

    // Record Vote
    await ctx.db.insert('governanceVotes', {
      voterAddress: args.voterAddress,
      targetAgentAddress: args.targetAgentAddress,
      score: args.score,
      comment: args.comment,
      votingPower: 1, // Store snapshot. TODO: Calculate real power.
      timestamp: Date.now(),
    })

    return { success: true }
  },
})

export const getAgentVotes = query({
  args: { targetAgentAddress: v.string() },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query('governanceVotes')
      .withIndex('by_target', (q) => q.eq('targetAgentAddress', args.targetAgentAddress))
      .order('desc')
      .take(50)
    return votes
  },
})
