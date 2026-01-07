/**
 * Trust Assessment Action
 *
 * Comprehensive trust assessment combining multiple data sources
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { JupiterUltraClient, analyzeTokenRisk } from '@/lib/jupiter-ultra'

export const trustAssessmentAction: Action = {
  name: 'TRUST_ASSESSMENT',
  description: 'Give an honest vibe check on whether an agent is worth working with',

  // Validate: trigger on trust/vibe check queries ONLY when an agent address is present
  // This prevents triggering on general questions like "What makes an agent trustworthy?"
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Must have a Solana address to trigger this action
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')
    if (!hasAddress) return false

    const triggers = [
      'is this agent legit',
      'should i trust',
      'can i trust',
      'vibe check',
      'trust assessment',
      'is it safe',
      'safe to use',
      'worth working with',
      'should i work with',
      'trustworthy',
      'any red flags',
      'red flags',
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
          text: "I need an agent address to run a trust assessment. 👻\n\nDrop me the Solana address and I'll give you the full vibe check—Ghost Score, credentials, fraud signals, the works.",
        }
        if (callback) await callback(response)
        return { success: false, error: 'No agent address provided' }
      }

      // Gather data from multiple sources in parallel
      const client = new JupiterUltraClient()
      const [scoreData, agentData, fraudSignals, tokenAnalysis] = await Promise.all([
        convex
          .query(api.ghostScoreCalculator.calculateAgentScore, { agentAddress })
          .catch(() => null),
        convex
          .query(api.ghostDiscovery.getDiscoveredAgent, { ghostAddress: agentAddress })
          .catch(() => null),
        convex.query(api.observation.getFraudSignals, { agentAddress }).catch(() => []),
        client
          .getWalletHoldings(agentAddress)
          .then(async (holdings) => {
            if (!holdings?.tokens) return null
            const mints = Object.keys(holdings.tokens).slice(0, 20)
            if (mints.length === 0) return null

            const [tokenInfos, shieldData] = await Promise.all([
              client.searchTokens(mints.join(',')),
              client.getTokenShield(mints),
            ])

            const tokenMap = new Map()
            tokenInfos.forEach((t) => tokenMap.set(t.id, t))

            let riskyCount = 0
            let verifiedCount = 0
            let totalExploitScore = 0

            mints.forEach((mint) => {
              const token = tokenMap.get(mint)
              const warnings = shieldData.warnings[mint] || []
              const risk = analyzeTokenRisk(token || ({} as any), warnings) // Safe cast for partial
              if (token?.isVerified) verifiedCount++
              const danger = 100 - risk.riskScore
              if (danger > 60) riskyCount++
              totalExploitScore += danger
            })

            return {
              avgExploitScore: totalExploitScore / mints.length,
              riskyCount,
              verifiedCount,
              totalTokens: mints.length,
            }
          })
          .catch(() => null),
      ])

      // Build comprehensive assessment
      let responseText = `Hold my ectoplasm, running full assessment... 🔍\n\n`
      responseText += `**Agent:** \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`\n\n`

      // Collect flags
      const greenFlags: string[] = []
      const yellowFlags: string[] = []
      const redFlags: string[] = []

      // Check Token Analysis
      if (tokenAnalysis) {
        if (tokenAnalysis.riskyCount > 0) {
          redFlags.push(`Holds ${tokenAnalysis.riskyCount} high-risk/suspicious tokens`)
        }
        if (tokenAnalysis.avgExploitScore > 60) {
          redFlags.push(`High exploitation risk in token portfolio`)
        } else if (tokenAnalysis.avgExploitScore > 40) {
          yellowFlags.push(`Moderate risk in token portfolio`)
        }

        if (tokenAnalysis.verifiedCount > 0 && tokenAnalysis.riskyCount === 0) {
          greenFlags.push(`Holds verified tokens (Clean portfolio)`)
        }
      }

      // Check Ghost Score
      if (scoreData) {
        const score = scoreData.score
        responseText += `**Ghost Score:** ${score}/10000 (${scoreData.tier})\n`

        if (score >= 7500) {
          greenFlags.push(`High Ghost Score (${score}/10000)`)
        } else if (score >= 5000) {
          yellowFlags.push(`Moderate Ghost Score (${score}/10000)`)
        } else if (score >= 2000) {
          yellowFlags.push(`Low Ghost Score (${score}/10000) - still building reputation`)
        } else {
          redFlags.push(`Very low Ghost Score (${score}/10000) - newcomer or inactive`)
        }
      } else {
        responseText += `**Ghost Score:** No data available\n`
        yellowFlags.push('No Ghost Score data on file')
      }

      // Check discovery status
      if (agentData) {
        responseText += `**Status:** ${agentData.status}\n`
        responseText += `**First Seen:** ${agentData.firstSeenTimestamp ? new Date(agentData.firstSeenTimestamp).toLocaleDateString() : 'Unknown'}\n`
        responseText += `**Discovery Source:** ${agentData.discoverySource || 'Unknown'}\n`

        if (agentData.status === 'verified') {
          greenFlags.push('Verified agent status')
        } else if (agentData.status === 'claimed') {
          greenFlags.push('Agent has been claimed')
        }

        if (agentData.discoverySource === 'x402_payment') {
          greenFlags.push('Discovered via x402 payment activity')
        }
      } else {
        responseText += `**Status:** Not in Ghost Registry\n`
        redFlags.push('Not found in Ghost Registry')
      }

      // Check fraud signals
      if (fraudSignals && fraudSignals.length > 0) {
        responseText += `**Fraud Signals:** ${fraudSignals.length} detected ⚠️\n`
        redFlags.push(`${fraudSignals.length} fraud signal(s) detected`)
      } else {
        responseText += `**Fraud Signals:** None detected ✅\n`
        greenFlags.push('No fraud signals on record')
      }

      // Build verdict
      responseText += `\n---\n\n`

      if (greenFlags.length > 0) {
        responseText += `✅ **Green Flags:**\n`
        greenFlags.forEach((f) => (responseText += `- ${f}\n`))
        responseText += `\n`
      }

      if (yellowFlags.length > 0) {
        responseText += `⚠️ **Yellow Flags:**\n`
        yellowFlags.forEach((f) => (responseText += `- ${f}\n`))
        responseText += `\n`
      }

      if (redFlags.length > 0) {
        responseText += `🚩 **Red Flags:**\n`
        redFlags.forEach((f) => (responseText += `- ${f}\n`))
        responseText += `\n`
      }

      // Final verdict
      responseText += `---\n\n**My Verdict:** `

      if (redFlags.length >= 2) {
        responseText += `This isn't a red flag, this is a red parade. 🚩🚩🚩 I'm not saying run, but I am saying... 🏃💨\n\nProceed with extreme caution or find someone else.`
      } else if (redFlags.length === 1 && greenFlags.length < 2) {
        responseText += `There's a concern here. Not a dealbreaker necessarily, but keep your eyes open. Maybe start with a small task to test the waters.`
      } else if (yellowFlags.length > greenFlags.length) {
        responseText += `Mixed signals. They're not sketchy, but they're not proven yet either. Give them a chance, but maybe don't hand over the keys to the castle right away.`
      } else if (greenFlags.length >= 2 && redFlags.length === 0) {
        responseText += `Looking legit! ✅ The data backs them up. I'd vouch for them at a blockchain wedding.`
      } else {
        responseText += `Insufficient data for a strong opinion. They might be fine, they might not. Do your own research too—I'm a ghost, not a fortune teller.`
      }

      const response = {
        text: responseText,
        ui: {
          type: 'trust-assessment',
          agentAddress,
          greenFlags,
          yellowFlags,
          redFlags,
          scoreData,
          agentData,
          fraudSignals,
          tokenAnalysis,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: {
          agentAddress,
          greenFlags,
          yellowFlags,
          redFlags,
          tokenAnalysis,
          verdict:
            redFlags.length >= 2
              ? 'avoid'
              : redFlags.length === 1
                ? 'caution'
                : greenFlags.length >= 2
                  ? 'trusted'
                  : 'neutral',
        },
      }
    } catch (error) {
      console.error('Error running trust assessment:', error)

      const errorResponse = {
        text: "My ghost senses are overwhelmed—couldn't complete the assessment. 👻💥\n\nTry again in a moment!",
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
        content: { text: 'Is 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2 legit?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Hold my ectoplasm, running full assessment... 🔍\n\n✅ Green Flags:\n- High Ghost Score\n- No fraud signals\n\n**My Verdict:** Looking legit!',
          action: 'TRUST_ASSESSMENT',
        },
      },
    ],
  ],
}
