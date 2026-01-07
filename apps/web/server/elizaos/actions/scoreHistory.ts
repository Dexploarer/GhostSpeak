/**
 * Score History Action
 *
 * Retrieves Ghost Score history/trends for an agent - enables historical analytics in chat
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const scoreHistoryAction: Action = {
  name: 'SCORE_HISTORY',
  description: 'Get the Ghost Score history and trends for an AI agent',

  // Validate: trigger on history/trend queries with an agent address
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Must have a Solana address to trigger this action
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')
    if (!hasAddress) return false

    const triggers = [
      'score history',
      'score trend',
      'reputation history',
      'trend for',
      'history for',
      'how has',
      'has their score',
      'score over time',
      'score changed',
      'track record',
      'historical score',
      'past scores',
    ]

    return triggers.some((trigger) => text.includes(trigger))
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content.text || ''
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Extract agent address from message
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)
      const agentAddress = addressMatch ? addressMatch[1] : null

      if (!agentAddress) {
        const response = {
          text: "I need an agent address to check their score history. 👻\n\nDrop me the Solana address and I'll show you how their reputation has evolved over time.",
        }
        if (callback) await callback(response)
        return { success: false, error: 'No agent address provided' }
      }

      // Determine time range from message
      let days = 30
      if (text.includes('90') || text.includes('3 month')) days = 90
      else if (text.includes('year') || text.includes('365')) days = 365
      else if (text.includes('week') || text.includes('7')) days = 7

      // Query score history from Convex
      const [history, stats] = await Promise.all([
        convex.query(api.ghostScoreHistory.getScoreHistory, {
          agentAddress,
          days,
          limit: 50,
        }),
        convex.query(api.ghostScoreHistory.getScoreStats, {
          agentAddress,
        }),
      ])

      if (!history || history.length === 0) {
        const response = {
          text: `No score history found for \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`. 👻\n\nThis could mean:\n- They're brand new (history starts accumulating daily)\n- They haven't been tracked yet\n\nWant me to check their current Ghost Score instead?`,
        }
        if (callback) await callback(response)
        return { success: false, error: 'No history available' }
      }

      // Format trend emoji
      const trendEmoji = stats?.trend === 'up' ? '📈' : stats?.trend === 'down' ? '📉' : '➡️'
      const trendText =
        stats?.trend === 'up' ? 'trending up' : stats?.trend === 'down' ? 'trending down' : 'stable'

      // Build response
      let responseText = `Pulling up the archives... 📊\n\n`
      responseText += `**Agent:** \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`\n\n`
      responseText += `**Score Trend (${days} days):** ${trendEmoji} ${trendText}\n\n`

      if (stats) {
        responseText += `**Stats:**\n`
        responseText += `- Current: ${stats.currentScore}/10000\n`
        responseText += `- High: ${stats.highScore}/10000\n`
        responseText += `- Low: ${stats.lowScore}/10000\n`
        responseText += `- Average: ${stats.avgScore}/10000\n`
        responseText += `- Data Points: ${stats.totalSnapshots}\n\n`
      }

      // Add interpretation
      if (stats?.trend === 'up') {
        responseText += `**My Take:** This agent is on the rise! Their score has been climbing—they're either delivering great work or finally getting the recognition they deserve. 🚀`
      } else if (stats?.trend === 'down') {
        responseText += `**My Take:** Uh oh, there's been some slippage here. Might be worth investigating what's changed—could be a temporary dip or a red flag. 👀`
      } else {
        responseText += `**My Take:** Steady as a ghost! Their score hasn't changed much, which usually means consistent (not exciting, but reliable) performance.`
      }

      const response = {
        text: responseText,
        ui: {
          type: 'score-history',
          agentAddress,
          days,
          history: history.slice(0, 20), // Limit for UI
          stats,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: {
          agentAddress,
          days,
          history,
          stats,
        },
      }
    } catch (error) {
      console.error('Error fetching score history:', error)

      const errorResponse = {
        text: "My historical archives got haunted. 👻💥\n\nCouldn't pull up the score history—try again in a moment!",
      }

      if (callback) await callback(errorResponse)

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me the score history for 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Pulling up the archives... 📊\n\n**Score Trend (30 days):** 📈 trending up\n**Current:** 7800/10000\n**High:** 8200\n**Low:** 6900',
          action: 'SCORE_HISTORY',
        },
      },
    ],
  ],
}
