/**
 * Credential Analytics & Dashboard Queries
 *
 * Provides comprehensive analytics for all issued credentials,
 * reputation distribution, and credential issuance metrics.
 */

import { query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get all credentials for an agent
 */
export const getAgentCredentials = query({
  args: { agentAddress: v.string() },
  returns: v.object({
    agentIdentity: v.union(
      v.object({
        _id: v.id('agentIdentityCredentials'),
        credentialId: v.string(),
        did: v.string(),
        issuedAt: v.number(),
      }),
      v.null()
    ),
    reputationTiers: v.array(
      v.object({
        _id: v.id('payaiCredentialsIssued'),
        credentialId: v.string(),
        tier: v.string(),
        ghostScore: v.number(),
        milestone: v.number(),
        issuedAt: v.number(),
      })
    ),
    paymentMilestones: v.array(
      v.object({
        _id: v.id('paymentMilestoneCredentials'),
        credentialId: v.string(),
        milestone: v.number(),
        tier: v.string(),
        issuedAt: v.number(),
      })
    ),
    staking: v.array(
      v.object({
        _id: v.id('stakingCredentials'),
        credentialId: v.string(),
        tier: v.string(),
        stakingTier: v.number(),
        amountStaked: v.number(),
        issuedAt: v.number(),
      })
    ),
    verifiedHires: v.array(
      v.object({
        _id: v.id('verifiedHireCredentials'),
        credentialId: v.string(),
        rating: v.number(),
        transactionSignature: v.string(),
        issuedAt: v.number(),
      })
    ),
    totalCredentials: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get agent identity credential
    const agentIdentity = await ctx.db
      .query('agentIdentityCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .first()

    // Get reputation tier credentials
    const reputationTiers = await ctx.db
      .query('payaiCredentialsIssued')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    // Get payment milestone credentials
    const paymentMilestones = await ctx.db
      .query('paymentMilestoneCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    // Get staking credentials
    const staking = await ctx.db
      .query('stakingCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    // Get verified hire credentials
    const verifiedHires = await ctx.db
      .query('verifiedHireCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const totalCredentials =
      (agentIdentity ? 1 : 0) +
      reputationTiers.length +
      paymentMilestones.length +
      staking.length +
      verifiedHires.length

    return {
      agentIdentity: agentIdentity
        ? {
            _id: agentIdentity._id,
            credentialId: agentIdentity.credentialId,
            did: agentIdentity.did,
            issuedAt: agentIdentity.issuedAt,
          }
        : null,
      reputationTiers: reputationTiers.map((c) => ({
        _id: c._id,
        credentialId: c.credentialId,
        tier: c.tier,
        ghostScore: c.ghostScore,
        milestone: c.milestone,
        issuedAt: c.issuedAt,
      })),
      paymentMilestones: paymentMilestones.map((c) => ({
        _id: c._id,
        credentialId: c.credentialId,
        milestone: c.milestone,
        tier: c.tier,
        issuedAt: c.issuedAt,
      })),
      staking: staking.map((c) => ({
        _id: c._id,
        credentialId: c.credentialId,
        tier: c.tier,
        stakingTier: c.stakingTier,
        amountStaked: c.amountStaked,
        issuedAt: c.issuedAt,
      })),
      verifiedHires: verifiedHires.map((c) => ({
        _id: c._id,
        credentialId: c.credentialId,
        rating: c.rating,
        transactionSignature: c.transactionSignature,
        issuedAt: c.issuedAt,
      })),
      totalCredentials,
    }
  },
})

/**
 * Get reputation distribution across all agents
 */
export const getReputationDistribution = query({
  args: {},
  returns: v.object({
    totalAgents: v.number(),
    distribution: v.object({
      unranked: v.number(), // 0-1999
      bronze: v.number(), // 2000-4999
      silver: v.number(), // 5000-7499
      gold: v.number(), // 7500-8999
      platinum: v.number(), // 9000+
    }),
    averageScore: v.number(),
    medianScore: v.number(),
    topAgents: v.array(
      v.object({
        agentAddress: v.string(),
        ghostScore: v.number(),
        tier: v.string(),
        totalJobs: v.number(),
        successRate: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const allAgents = await ctx.db.query('agentReputationCache').collect()

    if (allAgents.length === 0) {
      return {
        totalAgents: 0,
        distribution: { unranked: 0, bronze: 0, silver: 0, gold: 0, platinum: 0 },
        averageScore: 0,
        medianScore: 0,
        topAgents: [],
      }
    }

    // Calculate distribution
    const distribution = {
      unranked: 0,
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    }

    allAgents.forEach((agent) => {
      if (agent.ghostScore < 2000) distribution.unranked++
      else if (agent.ghostScore < 5000) distribution.bronze++
      else if (agent.ghostScore < 7500) distribution.silver++
      else if (agent.ghostScore < 9000) distribution.gold++
      else distribution.platinum++
    })

    // Calculate average score
    const totalScore = allAgents.reduce((sum, agent) => sum + agent.ghostScore, 0)
    const averageScore = Math.round(totalScore / allAgents.length)

    // Calculate median score
    const sortedScores = allAgents.map((a) => a.ghostScore).sort((a, b) => a - b)
    const medianScore =
      sortedScores.length % 2 === 0
        ? Math.round((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2)
        : sortedScores[Math.floor(sortedScores.length / 2)]

    // Get top 10 agents
    const topAgents = allAgents
      .sort((a, b) => b.ghostScore - a.ghostScore)
      .slice(0, 10)
      .map((agent) => ({
        agentAddress: agent.agentAddress,
        ghostScore: agent.ghostScore,
        tier: agent.tier,
        totalJobs: agent.totalJobs,
        successRate: agent.successRate,
      }))

    return {
      totalAgents: allAgents.length,
      distribution,
      averageScore,
      medianScore,
      topAgents,
    }
  },
})

/**
 * Get credential issuance statistics
 */
export const getCredentialIssuanceStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    byType: v.object({
      agentIdentity: v.number(),
      reputationTier: v.number(),
      paymentMilestone: v.number(),
      staking: v.number(),
      verifiedHire: v.number(),
    }),
    recentIssuances: v.array(
      v.object({
        credentialType: v.string(),
        agentAddress: v.string(),
        tier: v.optional(v.string()),
        issuedAt: v.number(),
      })
    ),
    issuanceRate: v.object({
      last24h: v.number(),
      last7d: v.number(),
      last30d: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const week = 7 * day
    const month = 30 * day

    // Get all credentials
    const agentIdentity = await ctx.db.query('agentIdentityCredentials').collect()
    const reputationTier = await ctx.db.query('payaiCredentialsIssued').collect()
    const paymentMilestone = await ctx.db.query('paymentMilestoneCredentials').collect()
    const staking = await ctx.db.query('stakingCredentials').collect()
    const verifiedHire = await ctx.db.query('verifiedHireCredentials').collect()

    const total =
      agentIdentity.length +
      reputationTier.length +
      paymentMilestone.length +
      staking.length +
      verifiedHire.length

    // Combine all credentials for recent issuances
    const allCredentials = [
      ...agentIdentity.map((c) => ({
        credentialType: 'Agent Identity',
        agentAddress: c.agentAddress,
        issuedAt: c.issuedAt,
      })),
      ...reputationTier.map((c) => ({
        credentialType: 'Reputation Tier',
        agentAddress: c.agentAddress,
        tier: c.tier,
        issuedAt: c.issuedAt,
      })),
      ...paymentMilestone.map((c) => ({
        credentialType: 'Payment Milestone',
        agentAddress: c.agentAddress,
        tier: c.tier,
        issuedAt: c.issuedAt,
      })),
      ...staking.map((c) => ({
        credentialType: 'Staking',
        agentAddress: c.agentAddress,
        tier: c.tier,
        issuedAt: c.issuedAt,
      })),
      ...verifiedHire.map((c) => ({
        credentialType: 'Verified Hire',
        agentAddress: c.agentAddress,
        issuedAt: c.issuedAt,
      })),
    ]

    // Sort by issuedAt and get recent 20
    const recentIssuances = allCredentials.sort((a, b) => b.issuedAt - a.issuedAt).slice(0, 20)

    // Calculate issuance rates
    const last24h = allCredentials.filter((c) => c.issuedAt >= now - day).length
    const last7d = allCredentials.filter((c) => c.issuedAt >= now - week).length
    const last30d = allCredentials.filter((c) => c.issuedAt >= now - month).length

    return {
      total,
      byType: {
        agentIdentity: agentIdentity.length,
        reputationTier: reputationTier.length,
        paymentMilestone: paymentMilestone.length,
        staking: staking.length,
        verifiedHire: verifiedHire.length,
      },
      recentIssuances,
      issuanceRate: {
        last24h,
        last7d,
        last30d,
      },
    }
  },
})

/**
 * Get payment milestone progress for an agent
 */
export const getPaymentMilestoneProgress = query({
  args: { agentAddress: v.string() },
  returns: v.object({
    totalPayments: v.number(),
    nextMilestone: v.union(v.number(), v.null()),
    progress: v.number(), // Percentage to next milestone
    earnedMilestones: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    // Get total successful payments
    const payments = await ctx.db
      .query('x402SyncEvents')
      .withIndex('by_merchant', (q) => q.eq('merchantAddress', args.agentAddress))
      .filter((q) => q.eq(q.field('success'), true))
      .collect()

    const totalPayments = payments.length

    // Get earned milestones
    const earnedMilestones = await ctx.db
      .query('paymentMilestoneCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const earnedMilestoneNumbers = earnedMilestones.map((m) => m.milestone).sort((a, b) => a - b)

    // Determine next milestone
    const milestones = [10, 100, 1000]
    const nextMilestone = milestones.find((m) => !earnedMilestoneNumbers.includes(m)) || null

    // Calculate progress to next milestone
    let progress = 0
    if (nextMilestone !== null) {
      progress = Math.min(100, Math.round((totalPayments / nextMilestone) * 100))
    } else {
      progress = 100 // All milestones earned
    }

    return {
      totalPayments,
      nextMilestone,
      progress,
      earnedMilestones: earnedMilestoneNumbers,
    }
  },
})
