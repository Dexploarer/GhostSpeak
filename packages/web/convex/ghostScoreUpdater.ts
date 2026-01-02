/**
 * Ghost Score Batch Updater
 *
 * Scheduled cron job to recalculate and update agent reputation scores
 * Uses the GhostScoreCalculator for multi-source aggregation
 */

import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

/**
 * Batch update Ghost Scores for all active agents
 * Called by cron every 5 minutes
 */
export const recalculateScores = internalAction({
  args: {},
  handler: async (ctx): Promise<{ updated: number; failed: number; total: number }> => {
    console.log('[GhostScore] Starting batch recalculation...')

    // Get all discovered agents (active ones)
    const agents: Array<any> = await ctx.runQuery(internal.ghostDiscovery.listDiscoveredAgentsInternal, {})

    console.log(`[GhostScore] Found ${agents.length} agents to process`)

    let updated = 0
    let failed = 0

    // Process in batches of 10 to avoid timeouts
    for (let i = 0; i < agents.length; i += 10) {
      const batch = agents.slice(i, i + 10)

      await Promise.allSettled(
        batch.map(async (agent: any) => {
          try {
            // Calculate new score
            const result: any = await ctx.runQuery(internal.ghostScoreCalculator.calculateAgentScoreInternal, {
              agentAddress: agent.ghostAddress,
            })

            // Update cache
            await ctx.runMutation(internal.ghostScoreCalculator.updateCachedScore, {
              agentAddress: agent.ghostAddress,
              score: result.score,
              tier: result.tier,
            })

            updated++

            // Check for tier upgrades
            const cached = await ctx.runQuery(internal.agentReputationCache.getByAddressInternal, {
              agentAddress: agent.ghostAddress,
            })

            if (cached && cached.tier !== result.tier) {
              console.log(
                `[GhostScore] Tier upgrade: ${agent.ghostAddress} ${cached.tier} → ${result.tier}`
              )

              // Trigger tier upgrade webhook
              await ctx.runMutation(internal.webhookDelivery.queueWebhookEventInternal, {
                event: 'tier.changed',
                agentAddress: agent.ghostAddress,
                data: {
                  previousTier: cached.tier,
                  newTier: result.tier,
                  score: result.score,
                },
              })

              // Issue reputation tier credential if milestone
              if (['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].includes(result.tier)) {
                await ctx.runAction(internal.sasCredentialsAction.issueReputationTierCredential, {
                  agentAddress: agent.ghostAddress,
                  tier: result.tier,
                  ghostScore: result.score,
                  totalJobs: result.sources?.paymentActivity?.dataPoints ?? 0,
                  successRate: result.sources?.paymentActivity?.normalizedScore ?? 0,
                  totalEarnings: '0', // TODO: Get from transaction data
                })
              }
            }
          } catch (error) {
            console.error(`[GhostScore] Failed to update ${agent.ghostAddress}:`, error)
            failed++
          }
        })
      )

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(
      `[GhostScore] Batch complete: ${updated} updated, ${failed} failed, ${agents.length} total`
    )

    return {
      updated,
      failed,
      total: agents.length,
    }
  },
})

/**
 * Recalculate score for a single agent (on-demand)
 * Useful for real-time updates after significant events
 */
export const recalculateSingleAgent = internalAction({
  args: { agentAddress: v.string() },
  handler: async (ctx, args): Promise<any> => {
    console.log(`[GhostScore] Recalculating score for ${args.agentAddress}`)

    try {
      // Calculate new score
      const result: any = await ctx.runQuery(internal.ghostScoreCalculator.calculateAgentScoreInternal, {
        agentAddress: args.agentAddress,
      })

      // Update cache
      await ctx.runMutation(internal.ghostScoreCalculator.updateCachedScore, {
        agentAddress: args.agentAddress,
        score: result.score,
        tier: result.tier,
      })

      console.log(`[GhostScore] Updated ${args.agentAddress}: Score=${result.score}, Tier=${result.tier}`)

      return result
    } catch (error) {
      console.error(`[GhostScore] Failed to recalculate ${args.agentAddress}:`, error)
      throw error
    }
  },
})

/**
 * Detect and handle anomalies (fraud detection)
 * Called periodically to check for suspicious score patterns
 */
export const detectAnomalies = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('[GhostScore] Starting anomaly detection...')

    const agents = await ctx.runQuery(internal.agentReputationCache.listAllInternal, {})

    const anomalies: Array<{
      agentAddress: string
      anomalyType: string
      severity: 'low' | 'medium' | 'high'
    }> = []

    for (const agent of agents) {
      // Fetch historical scores (last 30 days)
      // This would be implemented with a new query
      // For now, use placeholder logic

      // Check for rapid score increases (potential Sybil attack)
      if (agent.ghostScore > 7000 && agent.totalJobs < 10) {
        anomalies.push({
          agentAddress: agent.agentAddress,
          anomalyType: 'rapid_reputation_growth',
          severity: 'high',
        })
      }

      // Check for low diversity (wash trading indicator)
      // This would check if all payments come from same source
      // Placeholder for now

      // Check for score-job mismatch
      if (agent.ghostScore > 8000 && agent.successRate < 0.8) {
        anomalies.push({
          agentAddress: agent.agentAddress,
          anomalyType: 'score_performance_mismatch',
          severity: 'medium',
        })
      }
    }

    if (anomalies.length > 0) {
      console.log(`[GhostScore] Detected ${anomalies.length} anomalies`)

      // Create webhook notifications for high-severity anomalies
      // Note: Anomaly event type needs to be added to webhook schema
      for (const anomaly of anomalies.filter((a) => a.severity === 'high')) {
        // TODO: Add 'reputation.anomaly_detected' to webhookDelivery event types
        // await ctx.runMutation(internal.webhookDelivery.queueWebhookEvent, {
        //   event: 'reputation.anomaly_detected',
        //   agentAddress: anomaly.agentAddress,
        //   data: anomaly,
        // })
        console.log(`[GhostScore] High-severity anomaly detected: ${anomaly.agentAddress}`)
      }
    }

    return anomalies
  },
})
