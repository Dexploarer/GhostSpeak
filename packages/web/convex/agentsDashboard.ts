/**
 * Agents Dashboard Queries
 *
 * Reactive queries for the web dashboard that join discovered agents
 * with their Ghost Scores and x402 payment data.
 *
 * Replaces polling-based React Query with real-time Convex subscriptions.
 */

import { v } from 'convex/values'
import { query } from './_generated/server'
import { paginationOptsValidator } from 'convex/server'

/**
 * Enriched agent type with Ghost Score and payment data
 */
type EnrichedAgent = {
  // Discovery data
  ghostAddress: string
  status: string
  firstSeenTimestamp: number
  discoverySource: string
  facilitatorAddress?: string
  ipfsUri?: string
  createdAt: number
  claimedAt?: number
  claimedBy?: string

  // Ghost Score data (may be null if not yet calculated)
  ghostScore?: number
  tier?: string
  successRate?: number
  avgResponseTime?: number
  totalJobs?: number
  disputes?: number
  lastScoreUpdate?: number

  // x402 payment data (may be null if no payments yet)
  payaiData?: {
    last30Days: {
      transactions: number
      volume: string
      avgAmount: string
    }
  }
}

/**
 * List all discovered agents with Ghost Scores (paginated)
 *
 * Real-time reactive query that automatically updates when:
 * - New agents are discovered
 * - Ghost Scores are recalculated
 * - Payment data changes
 *
 * Use with Convex useQuery hook for automatic reactivity:
 * ```tsx
 * const agents = useQuery(api.agentsDashboard.listAgentsWithScores, {
 *   paginationOpts: { numItems: 20, cursor: null }
 * })
 * ```
 */
export const listAgentsWithScores = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.union(v.literal('discovered'), v.literal('claimed'), v.literal('verified'))),
    minScore: v.optional(v.number()),
    tier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get paginated discovered agents
    const baseQuery = args.status !== undefined
      ? ctx.db.query('discoveredAgents').withIndex('by_status', (q) => q.eq('status', args.status!))
      : ctx.db.query('discoveredAgents')

    // Order by most recent first and paginate
    const paginatedAgents = await baseQuery
      .order('desc')
      .paginate(args.paginationOpts)

    // Enrich each agent with Ghost Score data
    const enrichedAgents: EnrichedAgent[] = await Promise.all(
      paginatedAgents.page.map(async (agent) => {
        // Fetch Ghost Score from cache
        const scoreData = await ctx.db
          .query('agentReputationCache')
          .withIndex('by_address', (q) => q.eq('agentAddress', agent.ghostAddress))
          .first()

        // Build enriched agent object
        const enriched: EnrichedAgent = {
          ghostAddress: agent.ghostAddress,
          status: agent.status,
          firstSeenTimestamp: agent.firstSeenTimestamp,
          discoverySource: agent.discoverySource,
          facilitatorAddress: agent.facilitatorAddress,
          ipfsUri: agent.ipfsUri,
          createdAt: agent.createdAt,
          claimedAt: agent.claimedAt,
          claimedBy: agent.claimedBy,
        }

        // Add Ghost Score data if available
        if (scoreData) {
          enriched.ghostScore = scoreData.ghostScore
          enriched.tier = scoreData.tier
          enriched.successRate = scoreData.successRate
          enriched.avgResponseTime = scoreData.avgResponseTime
          enriched.totalJobs = scoreData.totalJobs
          enriched.disputes = scoreData.disputes
          enriched.lastScoreUpdate = scoreData.lastUpdated
          enriched.payaiData = scoreData.payaiData
        }

        return enriched
      })
    )

    // Apply client-side filters (until we have compound indexes)
    let filteredAgents = enrichedAgents

    if (args.minScore !== undefined) {
      filteredAgents = filteredAgents.filter((a) => (a.ghostScore ?? 0) >= args.minScore!)
    }

    if (args.tier !== undefined) {
      filteredAgents = filteredAgents.filter((a) => a.tier === args.tier)
    }

    return {
      ...paginatedAgents,
      page: filteredAgents,
    }
  },
})

/**
 * Get a single agent with full enriched data
 *
 * Real-time reactive query for agent detail pages
 */
export const getAgentWithScore = query({
  args: { ghostAddress: v.string() },
  handler: async (ctx, args) => {
    // Fetch discovered agent
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (!agent) {
      return null
    }

    // Fetch Ghost Score
    const scoreData = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_address', (q) => q.eq('agentAddress', args.ghostAddress))
      .first()

    // Fetch external ID mappings (x402 addresses, GitHub, Twitter, etc.)
    const externalMappings = await ctx.db
      .query('externalIdMappings')
      .withIndex('by_ghost', (q) => q.eq('ghostAddress', args.ghostAddress))
      .collect()

    // Build enriched response
    const enriched: EnrichedAgent & {
      externalIds?: Array<{
        platform: string
        externalId: string
        verified: boolean
      }>
    } = {
      ghostAddress: agent.ghostAddress,
      status: agent.status,
      firstSeenTimestamp: agent.firstSeenTimestamp,
      discoverySource: agent.discoverySource,
      facilitatorAddress: agent.facilitatorAddress,
      ipfsUri: agent.ipfsUri,
      createdAt: agent.createdAt,
      claimedAt: agent.claimedAt,
      claimedBy: agent.claimedBy,
    }

    if (scoreData) {
      enriched.ghostScore = scoreData.ghostScore
      enriched.tier = scoreData.tier
      enriched.successRate = scoreData.successRate
      enriched.avgResponseTime = scoreData.avgResponseTime
      enriched.totalJobs = scoreData.totalJobs
      enriched.disputes = scoreData.disputes
      enriched.lastScoreUpdate = scoreData.lastUpdated
      enriched.payaiData = scoreData.payaiData
    }

    if (externalMappings.length > 0) {
      enriched.externalIds = externalMappings.map((m) => ({
        platform: m.platform,
        externalId: m.externalId,
        verified: m.verified,
      }))
    }

    return enriched
  },
})

/**
 * Get dashboard stats (real-time)
 *
 * Aggregate statistics for dashboard overview
 */
export const getDashboardStats = query({
  returns: v.object({
    totalAgents: v.number(),
    discovered: v.number(),
    claimed: v.number(),
    verified: v.number(),
    totalWithScores: v.number(),
    avgGhostScore: v.number(),
    activeAgents: v.number(),
    tierDistribution: v.any(),
  }),
  handler: async (ctx) => {
    // Total agents
    const allAgents = await ctx.db.query('discoveredAgents').collect()
    const totalAgents = allAgents.length

    // Agents by status
    const discovered = allAgents.filter((a) => a.status === 'discovered').length
    const claimed = allAgents.filter((a) => a.status === 'claimed').length
    const verified = allAgents.filter((a) => a.status === 'verified').length

    // Get all Ghost Scores to calculate averages
    const allScores = await ctx.db.query('agentReputationCache').collect()

    const totalWithScores = allScores.length
    const avgGhostScore =
      totalWithScores > 0
        ? allScores.reduce((sum, s) => sum + s.ghostScore, 0) / totalWithScores
        : 0

    // Tier distribution
    const tierCounts: Record<string, number> = {}
    allScores.forEach((s) => {
      tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1
    })

    // Active agents (with recent activity - scored in last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const activeAgents = allScores.filter((s) => s.lastUpdated > sevenDaysAgo).length

    return {
      totalAgents,
      discovered,
      claimed,
      verified,
      totalWithScores,
      avgGhostScore: Math.round(avgGhostScore),
      activeAgents,
      tierDistribution: tierCounts,
    }
  },
})

/**
 * Get top agents by Ghost Score (leaderboard)
 *
 * Real-time reactive leaderboard query
 */
export const getTopAgents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10

    // Get top scores from cache
    const topScores = await ctx.db
      .query('agentReputationCache')
      .withIndex('by_score')
      .order('desc')
      .take(limit)

    // Enrich with discovery data
    const enrichedTop: EnrichedAgent[] = await Promise.all(
      topScores.map(async (scoreData) => {
        const agent = await ctx.db
          .query('discoveredAgents')
          .withIndex('by_address', (q) => q.eq('ghostAddress', scoreData.agentAddress))
          .first()

        if (!agent) {
          // Score exists but agent not in discovery table (shouldn't happen, but handle it)
          return {
            ghostAddress: scoreData.agentAddress,
            status: 'unknown',
            firstSeenTimestamp: 0,
            discoverySource: 'unknown',
            createdAt: 0,
            ghostScore: scoreData.ghostScore,
            tier: scoreData.tier,
            successRate: scoreData.successRate,
            avgResponseTime: scoreData.avgResponseTime,
            totalJobs: scoreData.totalJobs,
            disputes: scoreData.disputes,
            lastScoreUpdate: scoreData.lastUpdated,
            payaiData: scoreData.payaiData,
          }
        }

        return {
          ghostAddress: agent.ghostAddress,
          status: agent.status,
          firstSeenTimestamp: agent.firstSeenTimestamp,
          discoverySource: agent.discoverySource,
          facilitatorAddress: agent.facilitatorAddress,
          ipfsUri: agent.ipfsUri,
          createdAt: agent.createdAt,
          claimedAt: agent.claimedAt,
          claimedBy: agent.claimedBy,
          ghostScore: scoreData.ghostScore,
          tier: scoreData.tier,
          successRate: scoreData.successRate,
          avgResponseTime: scoreData.avgResponseTime,
          totalJobs: scoreData.totalJobs,
          disputes: scoreData.disputes,
          lastScoreUpdate: scoreData.lastUpdated,
          payaiData: scoreData.payaiData,
        }
      })
    )

    return enrichedTop
  },
})

/**
 * Search agents by address or external ID
 *
 * Real-time search query (client-side filtering until full-text search is added)
 */
export const searchAgents = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const searchLower = args.searchTerm.toLowerCase()

    // If search term looks like a Solana address (starts with capital letter, long string)
    if (args.searchTerm.length > 32) {
      const agent = await ctx.db
        .query('discoveredAgents')
        .withIndex('by_address', (q) => q.eq('ghostAddress', args.searchTerm))
        .first()

      if (agent) {
        const scoreData = await ctx.db
          .query('agentReputationCache')
          .withIndex('by_address', (q) => q.eq('agentAddress', agent.ghostAddress))
          .first()

        return [
          {
            ghostAddress: agent.ghostAddress,
            status: agent.status,
            firstSeenTimestamp: agent.firstSeenTimestamp,
            discoverySource: agent.discoverySource,
            facilitatorAddress: agent.facilitatorAddress,
            ipfsUri: agent.ipfsUri,
            createdAt: agent.createdAt,
            claimedAt: agent.claimedAt,
            claimedBy: agent.claimedBy,
            ghostScore: scoreData?.ghostScore,
            tier: scoreData?.tier,
            successRate: scoreData?.successRate,
            avgResponseTime: scoreData?.avgResponseTime,
            totalJobs: scoreData?.totalJobs,
            disputes: scoreData?.disputes,
            lastScoreUpdate: scoreData?.lastUpdated,
            payaiData: scoreData?.payaiData,
          },
        ]
      }
    }

    // Search external IDs (GitHub username, Twitter handle, etc.)
    const externalMatches = await ctx.db
      .query('externalIdMappings')
      .filter((q) => q.gte(q.field('externalId'), searchLower))
      .take(limit)

    // Get unique ghost addresses from external matches
    const ghostAddresses = [...new Set(externalMatches.map((m) => m.ghostAddress))]

    // Enrich matches
    const results: EnrichedAgent[] = await Promise.all(
      ghostAddresses.map(async (ghostAddress) => {
        const agent = await ctx.db
          .query('discoveredAgents')
          .withIndex('by_address', (q) => q.eq('ghostAddress', ghostAddress))
          .first()

        const scoreData = await ctx.db
          .query('agentReputationCache')
          .withIndex('by_address', (q) => q.eq('agentAddress', ghostAddress))
          .first()

        if (!agent) {
          return {
            ghostAddress,
            status: 'unknown',
            firstSeenTimestamp: 0,
            discoverySource: 'external_id',
            createdAt: 0,
            ghostScore: scoreData?.ghostScore,
            tier: scoreData?.tier,
            successRate: scoreData?.successRate,
            avgResponseTime: scoreData?.avgResponseTime,
            totalJobs: scoreData?.totalJobs,
            disputes: scoreData?.disputes,
            lastScoreUpdate: scoreData?.lastUpdated,
            payaiData: scoreData?.payaiData,
          }
        }

        return {
          ghostAddress: agent.ghostAddress,
          status: agent.status,
          firstSeenTimestamp: agent.firstSeenTimestamp,
          discoverySource: agent.discoverySource,
          facilitatorAddress: agent.facilitatorAddress,
          ipfsUri: agent.ipfsUri,
          createdAt: agent.createdAt,
          claimedAt: agent.claimedAt,
          claimedBy: agent.claimedBy,
          ghostScore: scoreData?.ghostScore,
          tier: scoreData?.tier,
          successRate: scoreData?.successRate,
          avgResponseTime: scoreData?.avgResponseTime,
          totalJobs: scoreData?.totalJobs,
          disputes: scoreData?.disputes,
          lastScoreUpdate: scoreData?.lastUpdated,
          payaiData: scoreData?.payaiData,
        }
      })
    )

    return results
  },
})
