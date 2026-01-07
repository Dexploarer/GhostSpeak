/**
 * Ghost Score History Module
 *
 * Tracks historical Ghost Score changes for analytics, trends, and comparisons.
 * Used by the Enhanced Analytics dashboard.
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { calculateTier } from './ghostScoreCalculator'

// ============================================================================
// Snapshot Functions
// ============================================================================

/**
 * Snapshot a single agent's Ghost Score
 * Called on score changes and by the daily cron job
 */
export const snapshotAgent = internalMutation({
  args: {
    agentAddress: v.string(),
    score: v.number(),
    tier: v.string(),
    breakdown: v.optional(
      v.object({
        paymentActivity: v.optional(v.number()),
        stakingCommitment: v.optional(v.number()),
        credentialVerifications: v.optional(v.number()),
        userReviews: v.optional(v.number()),
        onChainActivity: v.optional(v.number()),
        apiQualityMetrics: v.optional(v.number()),
      })
    ),
    snapshotType: v.string(),
  },
  handler: async (ctx, args) => {
    const { agentAddress, score, tier, breakdown, snapshotType } = args

    // Insert snapshot
    await ctx.db.insert('ghostScoreHistory', {
      agentAddress,
      score,
      tier,
      breakdown,
      snapshotType,
      timestamp: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Snapshot all active agents' Ghost Scores
 * Called by the daily cron job at midnight UTC
 */
export const snapshotAllAgents = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all agents from the reputation cache
    const agents = await ctx.db.query('agentReputationCache').collect()

    let snapshotCount = 0

    for (const agent of agents) {
      // Create snapshot for each agent
      await ctx.db.insert('ghostScoreHistory', {
        agentAddress: agent.agentAddress,
        score: agent.ghostScore,
        tier: agent.tier,
        breakdown: undefined, // Full breakdown not stored in cache
        snapshotType: 'daily',
        timestamp: Date.now(),
      })
      snapshotCount++
    }

    console.log(`[ghostScoreHistory] Daily snapshot: ${snapshotCount} agents`)
    return { snapshotCount }
  },
})

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get score history for a single agent
 */
export const getScoreHistory = query({
  args: {
    agentAddress: v.string(),
    days: v.optional(v.number()), // Default 30 days
    limit: v.optional(v.number()), // Max records to return
  },
  handler: async (ctx, args) => {
    const { agentAddress, days = 30, limit = 100 } = args

    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000

    const history = await ctx.db
      .query('ghostScoreHistory')
      .withIndex('by_agent_timestamp', (q) => q.eq('agentAddress', agentAddress))
      .filter((q) => q.gte(q.field('timestamp'), cutoffTimestamp))
      .order('asc') // Oldest first for charting
      .take(limit)

    // Format for frontend charting
    return history.map((h) => ({
      score: h.score,
      tier: h.tier,
      timestamp: h.timestamp,
      date: new Date(h.timestamp).toISOString().split('T')[0],
      breakdown: h.breakdown,
    }))
  },
})

/**
 * Compare score histories for multiple agents
 */
export const compareAgents = query({
  args: {
    agentAddresses: v.array(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { agentAddresses, days = 30 } = args

    if (agentAddresses.length === 0 || agentAddresses.length > 5) {
      return { error: 'Provide 1-5 agent addresses' }
    }

    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000

    const results: Record<
      string,
      Array<{ score: number; tier: string; timestamp: number; date: string }>
    > = {}

    for (const address of agentAddresses) {
      const history = await ctx.db
        .query('ghostScoreHistory')
        .withIndex('by_agent_timestamp', (q) => q.eq('agentAddress', address))
        .filter((q) => q.gte(q.field('timestamp'), cutoffTimestamp))
        .order('asc')
        .take(100)

      results[address] = history.map((h) => ({
        score: h.score,
        tier: h.tier,
        timestamp: h.timestamp,
        date: new Date(h.timestamp).toISOString().split('T')[0],
      }))
    }

    return results
  },
})

/**
 * Get fraud signal timeline for an agent
 * Combines fraud signals with score history
 */
export const getFraudTimeline = query({
  args: {
    agentAddress: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { agentAddress, days = 90 } = args

    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000

    // Get fraud signals from fraudSignals table
    const fraudSignals = await ctx.db
      .query('fraudSignals')
      .withIndex('by_agent', (q) => q.eq('agentAddress', agentAddress))
      .filter((q) => q.gte(q.field('detectedAt'), cutoffTimestamp))
      .order('desc')
      .take(50)

    // Get score history for context
    const scoreHistory = await ctx.db
      .query('ghostScoreHistory')
      .withIndex('by_agent_timestamp', (q) => q.eq('agentAddress', agentAddress))
      .filter((q) => q.gte(q.field('timestamp'), cutoffTimestamp))
      .order('desc')
      .take(20)

    // Build unified timeline
    const timeline = [
      ...fraudSignals.map((f) => ({
        type: 'fraud_signal' as const,
        timestamp: f.detectedAt,
        date: new Date(f.detectedAt).toISOString(),
        severity: f.severity === 'critical' || f.severity === 'high' ? 'red' : 'yellow',
        message: f.evidence || `${f.signalType} detected`,
        details: {
          signalType: f.signalType,
          severity: f.severity,
        },
      })),
      ...scoreHistory
        .filter((s, i, arr) => {
          // Only include score changes > 100 points
          if (i === arr.length - 1) return false
          return Math.abs(s.score - arr[i + 1].score) > 100
        })
        .map((s) => ({
          type: 'score_change' as const,
          timestamp: s.timestamp,
          date: new Date(s.timestamp).toISOString(),
          severity: 'info' as const,
          message: `Score changed to ${s.score} (${s.tier})`,
          details: {
            score: s.score,
            tier: s.tier,
          },
        })),
    ].sort((a, b) => b.timestamp - a.timestamp)

    return timeline
  },
})

/**
 * Get score statistics for an agent
 */
export const getScoreStats = query({
  args: {
    agentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { agentAddress } = args

    // Get all history for this agent
    const history = await ctx.db
      .query('ghostScoreHistory')
      .withIndex('by_agent', (q) => q.eq('agentAddress', agentAddress))
      .collect()

    if (history.length === 0) {
      return null
    }

    const scores = history.map((h) => h.score)
    const sortedScores = [...scores].sort((a, b) => a - b)

    const currentScore = history[history.length - 1]?.score ?? 0
    const highScore = Math.max(...scores)
    const lowScore = Math.min(...scores)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

    // Calculate trend (last 7 days vs previous 7 days)
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000

    const recentScores = history.filter((h) => h.timestamp >= sevenDaysAgo)
    const previousScores = history.filter(
      (h) => h.timestamp >= fourteenDaysAgo && h.timestamp < sevenDaysAgo
    )

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (recentScores.length > 0 && previousScores.length > 0) {
      const recentAvg = recentScores.reduce((a, b) => a + b.score, 0) / recentScores.length
      const previousAvg = previousScores.reduce((a, b) => a + b.score, 0) / previousScores.length
      if (recentAvg > previousAvg + 100) trend = 'up'
      else if (recentAvg < previousAvg - 100) trend = 'down'
    }

    return {
      currentScore,
      highScore,
      lowScore,
      avgScore: Math.round(avgScore),
      totalSnapshots: history.length,
      trend,
      firstSnapshot: history[0]?.timestamp,
      lastSnapshot: history[history.length - 1]?.timestamp,
    }
  },
})
