/**
 * Ghost Score Action
 *
 * Check reputation/Ghost Score for an agent - implements CHECK_REPUTATION capability
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const ghostScoreAction: Action = {
  name: 'CHECK_REPUTATION',
  description: 'Check the Ghost Score and reputation breakdown for an AI agent',

  // Validate: trigger on reputation/score queries ONLY when an agent address is present
  // This prevents triggering on general questions like "How does reputation work?"
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Must have a Solana address to trigger this action
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')
    if (!hasAddress) return false

    const triggers = [
      'ghost score',
      'reputation',
      'check score',
      'score for',
      'trust score',
      'how trusted',
      'is this agent trustworthy',
      'check reputation',
      'reputation score',
      'agent score',
    ]

    return triggers.some((trigger) => text.includes(trigger))
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ) => {
    try {
      const text = message.content.text || ''
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Extract agent address from message
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)
      const agentAddress = addressMatch ? addressMatch[1] : null

      if (!agentAddress) {
        const response = {
          text: "I need an agent address to check their Ghost Score. 👻\n\nDrop me the Solana address and I'll pull up their full reputation file—job history, response times, the whole haunted dossier.",
        }
        if (callback) await callback(response)
        return { success: false, error: 'No agent address provided' }
      }

      // Query Ghost Score from Convex
      const scoreData = await convex.query(api.ghostScoreCalculator.calculateAgentScore, {
        agentAddress,
      })

      if (!scoreData) {
        const response = {
          text: `Hmm, I can't find any reputation data for \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`. 👻\n\nThis could mean:\n- They're brand new (everyone starts somewhere)\n- They haven't made any x402 transactions yet\n- The address is incorrect\n\nWant me to check if they exist in the Ghost Registry instead?`,
        }
        if (callback) await callback(response)
        return { success: false, error: 'Agent not found' }
      }

      // Format tier emoji
      const tierEmoji: Record<string, string> = {
        NEWCOMER: '🌱',
        BRONZE: '🥉',
        SILVER: '🥈',
        GOLD: '🥇',
        PLATINUM: '💎',
      }

      const emoji = tierEmoji[scoreData.tier] || '👻'

      // Build response
      let responseText = `Hold my ectoplasm, pulling up the file... 🔍\n\n`
      responseText += `**Agent:** \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`\n\n`
      responseText += `**Ghost Score:** ${scoreData.score}/10000 ${emoji} (${scoreData.tier} tier)\n\n`

      // Add breakdown if available
      if (scoreData.sources) {
        responseText += `**Score Breakdown:**\n`
        const sources = scoreData.sources as Record<string, any>
        
        if (sources.paymentHistory) {
          responseText += `- Payment History: ${sources.paymentHistory.score || 0} pts (${sources.paymentHistory.dataPoints || 0} transactions)\n`
        }
        if (sources.credentialVerifications) {
          responseText += `- Credentials: ${sources.credentialVerifications.score || 0} pts (${sources.credentialVerifications.dataPoints || 0} verified)\n`
        }
        if (sources.stakingCommitment) {
          responseText += `- Staking: ${sources.stakingCommitment.score || 0} pts\n`
        }
        if (sources.observatoryQuality) {
          responseText += `- Endpoint Quality: ${sources.observatoryQuality.score || 0} pts\n`
        }
        if (sources.fraudSignals) {
          responseText += `- Fraud Clearance: ${sources.fraudSignals.score || 0} pts\n`
        }
      }

      // Add vibe check
      responseText += `\n**My Take:** `
      if (scoreData.score >= 9000) {
        responseText += `Platinum tier? This agent is basically blockchain royalty. I'd vouch for them at a blockchain wedding. 💎`
      } else if (scoreData.score >= 7500) {
        responseText += `Gold tier is no joke—this agent has their life together more than I did when I was alive. Solid choice.`
      } else if (scoreData.score >= 5000) {
        responseText += `Silver tier means they're building a track record. Not quite elite, but definitely not sketchy.`
      } else if (scoreData.score >= 2000) {
        responseText += `Bronze tier—they're climbing the ladder. Keep an eye on them, but don't write them off yet.`
      } else {
        responseText += `Newcomer tier. Everyone starts somewhere! Just... maybe verify their credentials before anything major.`
      }

      const response = {
        text: responseText,
        ui: {
          type: 'ghost-score',
          agentAddress,
          score: scoreData.score,
          tier: scoreData.tier,
          breakdown: scoreData.sources,
          network: scoreData.network,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: {
          agentAddress,
          score: scoreData.score,
          tier: scoreData.tier,
          sources: scoreData.sources,
        },
      }
    } catch (error) {
      console.error('Error checking ghost score:', error)

      const errorResponse = {
        text: "My ghost senses malfunctioned trying to pull that score. 👻💥\n\nThe reputation oracle might be taking a coffee break. Try again in a moment!",
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
        content: { text: 'What is the ghost score for 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Hold my ectoplasm, pulling up the file... 🔍\n\n**Ghost Score:** 7800/10000 🥇 (GOLD tier)',
          action: 'CHECK_REPUTATION',
        },
      },
    ],
  ],
}
