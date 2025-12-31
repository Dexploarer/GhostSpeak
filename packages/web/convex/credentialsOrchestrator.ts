/**
 * Credential Orchestration System
 *
 * Checks reputation milestones and triggers automatic credential issuance.
 * Called after reputation updates from both webhook and on-chain paths.
 */

import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

// Tier milestones for automatic credential issuance
const TIER_MILESTONES = [
  { score: 2000, tier: 'Bronze' },
  { score: 5000, tier: 'Silver' },
  { score: 7500, tier: 'Gold' },
  { score: 9000, tier: 'Platinum' },
] as const

/**
 * Check reputation tier milestones and issue credentials
 *
 * Called after every reputation update to check if agent crossed a tier threshold
 */
export const checkAndIssueReputationCredentials = internalMutation({
  args: {
    agentAddress: v.string(),
    previousScore: v.number(),
    newScore: v.number(),
    totalJobs: v.number(),
    successRate: v.number(),
  },
  returns: v.object({
    credentialsIssued: v.number(),
    tiers: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const credentialsIssued: string[] = []

    // Check each tier milestone
    for (const milestone of TIER_MILESTONES) {
      // Check if agent crossed this threshold
      const crossedThreshold =
        args.previousScore < milestone.score && args.newScore >= milestone.score

      if (crossedThreshold) {
        // Check if credential already issued for this tier
        const existingCredential = await ctx.db
          .query('payaiCredentialsIssued')
          .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
          .filter((q) => q.eq(q.field('tier'), milestone.tier))
          .first()

        if (!existingCredential) {
          console.log('[Credentials] Tier milestone reached:', {
            agent: args.agentAddress.slice(0, 8),
            tier: milestone.tier,
            score: args.newScore,
          })

          // Calculate total earnings from payment history
          const payments = await ctx.db
            .query('x402SyncEvents')
            .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.agentAddress))
            .collect()

          const totalEarnings = payments.reduce((sum, p) => sum + BigInt(p.amount), BigInt(0))

          // Schedule credential issuance (async via Action)
          await ctx.scheduler.runAfter(0, internal.credentialsAction.issueReputationTierCredential, {
            agentAddress: args.agentAddress,
            tier: milestone.tier,
            ghostScore: args.newScore,
            totalJobs: args.totalJobs,
            successRate: args.successRate,
            totalEarnings: totalEarnings.toString(),
          })

          credentialsIssued.push(milestone.tier)
        }
      }
    }

    if (credentialsIssued.length > 0) {
      console.log('[Credentials] Scheduled credential issuance:', {
        agent: args.agentAddress.slice(0, 8),
        tiers: credentialsIssued,
      })
    }

    return {
      credentialsIssued: credentialsIssued.length,
      tiers: credentialsIssued,
    }
  },
})

/**
 * Record credential issuance in database
 *
 * Called by credentialsAction after successful Crossmint API call
 */
export const recordCredentialIssuance = internalMutation({
  args: {
    agentAddress: v.string(),
    credentialType: v.string(),
    tier: v.string(),
    credentialId: v.string(),
    crossmintId: v.string(),
    ghostScore: v.number(),
    totalJobs: v.number(),
  },
  returns: v.id('payaiCredentialsIssued'),
  handler: async (ctx, args) => {
    const credentialId = await ctx.db.insert('payaiCredentialsIssued', {
      agentAddress: args.agentAddress,
      credentialId: args.credentialId,
      tier: args.tier,
      milestone: getTierMilestone(args.tier),
      ghostScore: args.ghostScore,
      crossmintCredentialId: args.crossmintId,
      issuedAt: Date.now(),
    })

    console.log('[Credentials] Credential recorded in database:', {
      id: credentialId,
      agent: args.agentAddress.slice(0, 8),
      tier: args.tier,
    })

    // Update agent reputation cache with credential ID
    const reputation = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
      .first()

    if (reputation) {
      await ctx.db.patch(reputation._id, {
        credentialId: args.credentialId,
      })
    }

    return credentialId
  },
})

/**
 * Get milestone score for a tier
 */
function getTierMilestone(tier: string): number {
  const milestone = TIER_MILESTONES.find((m) => m.tier === tier)
  return milestone?.score ?? 0
}

/**
 * Record Agent Identity credential in database
 */
export const recordAgentIdentityCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintId: v.string(),
    did: v.string(),
  },
  returns: v.id('agentIdentityCredentials'),
  handler: async (ctx, args) => {
    const credentialId = await ctx.db.insert('agentIdentityCredentials', {
      agentAddress: args.agentAddress,
      credentialId: args.credentialId,
      crossmintCredentialId: args.crossmintId,
      did: args.did,
      issuedAt: Date.now(),
    })

    console.log('[Credentials] Agent identity credential recorded:', {
      id: credentialId,
      agent: args.agentAddress.slice(0, 8),
    })

    return credentialId
  },
})

/**
 * Record Payment Milestone credential in database
 */
export const recordPaymentMilestoneCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintId: v.string(),
    milestone: v.number(),
    tier: v.string(),
  },
  returns: v.id('paymentMilestoneCredentials'),
  handler: async (ctx, args) => {
    const credentialId = await ctx.db.insert('paymentMilestoneCredentials', {
      agentAddress: args.agentAddress,
      credentialId: args.credentialId,
      crossmintCredentialId: args.crossmintId,
      milestone: args.milestone,
      tier: args.tier,
      issuedAt: Date.now(),
    })

    console.log('[Credentials] Payment milestone credential recorded:', {
      id: credentialId,
      agent: args.agentAddress.slice(0, 8),
      milestone: args.milestone,
    })

    return credentialId
  },
})

/**
 * Record Staking credential in database
 */
export const recordStakingCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintId: v.string(),
    tier: v.string(),
    stakingTier: v.number(),
    amountStaked: v.number(),
  },
  returns: v.id('stakingCredentials'),
  handler: async (ctx, args) => {
    const credentialId = await ctx.db.insert('stakingCredentials', {
      agentAddress: args.agentAddress,
      credentialId: args.credentialId,
      crossmintCredentialId: args.crossmintId,
      tier: args.tier,
      stakingTier: args.stakingTier,
      amountStaked: args.amountStaked,
      issuedAt: Date.now(),
    })

    console.log('[Credentials] Staking credential recorded:', {
      id: credentialId,
      agent: args.agentAddress.slice(0, 8),
      tier: args.tier,
    })

    return credentialId
  },
})

/**
 * Record Verified Hire credential in database
 */
export const recordVerifiedHireCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintId: v.string(),
    clientAddress: v.string(),
    rating: v.number(),
    transactionSignature: v.string(),
  },
  returns: v.id('verifiedHireCredentials'),
  handler: async (ctx, args) => {
    const credentialId = await ctx.db.insert('verifiedHireCredentials', {
      agentAddress: args.agentAddress,
      credentialId: args.credentialId,
      crossmintCredentialId: args.crossmintId,
      clientAddress: args.clientAddress,
      rating: args.rating,
      transactionSignature: args.transactionSignature,
      issuedAt: Date.now(),
    })

    console.log('[Credentials] Verified hire credential recorded:', {
      id: credentialId,
      agent: args.agentAddress.slice(0, 8),
      rating: args.rating,
    })

    return credentialId
  },
})

/**
 * Check payment milestones and issue credentials
 *
 * Called after each PayAI payment to check if agent reached 10/100/1000 payments
 */
export const checkAndIssuePaymentMilestoneCredentials = internalMutation({
  args: {
    agentAddress: v.string(),
    totalPayments: v.number(),
    totalVolume: v.string(),
    successRate: v.number(),
  },
  returns: v.object({
    credentialsIssued: v.number(),
    milestones: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    const credentialsIssued: number[] = []

    const milestones = [
      { count: 10, tier: 'Bronze' },
      { count: 100, tier: 'Silver' },
      { count: 1000, tier: 'Gold' },
    ]

    for (const milestone of milestones) {
      // Check if agent just crossed this threshold
      if (args.totalPayments >= milestone.count) {
        // Check if credential already issued
        const existingCredential = await ctx.db
          .query('paymentMilestoneCredentials')
          .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
          .filter((q) => q.eq(q.field('milestone'), milestone.count))
          .first()

        if (!existingCredential) {
          console.log('[Credentials] Payment milestone reached:', {
            agent: args.agentAddress.slice(0, 8),
            milestone: milestone.count,
            tier: milestone.tier,
          })

          // Schedule credential issuance
          await ctx.scheduler.runAfter(
            0,
            internal.credentialsAction.issuePaymentMilestoneCredential,
            {
              agentAddress: args.agentAddress,
              milestone: milestone.count,
              tier: milestone.tier,
              totalPayments: args.totalPayments,
              totalVolume: args.totalVolume,
              successRate: args.successRate,
            }
          )

          credentialsIssued.push(milestone.count)
        }
      }
    }

    if (credentialsIssued.length > 0) {
      console.log('[Credentials] Scheduled payment milestone credentials:', {
        agent: args.agentAddress.slice(0, 8),
        milestones: credentialsIssued,
      })
    }

    return {
      credentialsIssued: credentialsIssued.length,
      milestones: credentialsIssued,
    }
  },
})

/**
 * Check staking tier and issue credential
 *
 * Called when agent stakes GHOST tokens
 */
export const checkAndIssueStakingCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    amountStaked: v.number(),
    stakingTier: v.number(),
    reputationBoostBps: v.number(),
    unlockAt: v.number(),
  },
  returns: v.object({
    credentialIssued: v.boolean(),
    tier: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Determine tier badge
    let tier = 'Basic'
    let badge = 'Verified Staker'

    if (args.amountStaked >= 500000) {
      tier = 'Elite'
      badge = 'Elite Staker'
    } else if (args.amountStaked >= 50000) {
      tier = 'Premium'
      badge = 'Premium Staker'
    }

    // Check if credential already issued for this tier
    const existingCredential = await ctx.db
      .query('stakingCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('tier'), tier))
      .first()

    if (!existingCredential) {
      console.log('[Credentials] Staking milestone reached:', {
        agent: args.agentAddress.slice(0, 8),
        tier,
        amount: args.amountStaked,
      })

      // Schedule credential issuance
      await ctx.scheduler.runAfter(0, internal.credentialsAction.issueStakingCredential, {
        agentAddress: args.agentAddress,
        tier,
        badge,
        amountStaked: args.amountStaked,
        stakingTier: args.stakingTier,
        reputationBoostBps: args.reputationBoostBps,
        unlockAt: args.unlockAt,
      })

      return {
        credentialIssued: true,
        tier,
      }
    }

    return {
      credentialIssued: false,
    }
  },
})

/**
 * Issue verified hire credential for review with payment proof
 *
 * Called when a user submits a review with transaction signature
 */
export const issueVerifiedHireCredentialFromReview = internalMutation({
  args: {
    agentAddress: v.string(),
    clientAddress: v.string(),
    rating: v.number(),
    review: v.string(),
    transactionSignature: v.string(),
    jobCategory: v.optional(v.string()),
    timestamp: v.number(),
  },
  returns: v.object({
    credentialIssued: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check if credential already issued for this transaction
    const existingCredential = await ctx.db
      .query('verifiedHireCredentials')
      .filter((q) => q.eq(q.field('transactionSignature'), args.transactionSignature))
      .first()

    if (!existingCredential) {
      console.log('[Credentials] Issuing verified hire credential:', {
        agent: args.agentAddress.slice(0, 8),
        client: args.clientAddress.slice(0, 8),
        rating: args.rating,
      })

      // Schedule credential issuance
      await ctx.scheduler.runAfter(0, internal.credentialsAction.issueVerifiedHireCredential, {
        agentAddress: args.agentAddress,
        clientAddress: args.clientAddress,
        rating: args.rating,
        review: args.review,
        transactionSignature: args.transactionSignature,
        jobCategory: args.jobCategory,
        timestamp: args.timestamp,
      })

      return {
        credentialIssued: true,
      }
    }

    return {
      credentialIssued: false,
    }
  },
})
