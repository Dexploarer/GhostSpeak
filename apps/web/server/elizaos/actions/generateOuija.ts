import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export const generateOuijaAction: Action = {
  name: 'GENERATE_OUIJA_REPORT',
  similes: [
    'SUMMON_SPIRIT',
    'OUIJA_BOARD',
    'MYSTICAL_REPORT',
    'SPIRIT_SUMMARY',
    'CONSULT_SPIRITS',
    'DO_OUIJA',
  ],
  description:
    'Summon a mystical Ouija board report for an agent to reveal their true spirit and reliability.',
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    // Check if the message contains keywords related to Ouija, spirits, or mystical reports
    const text = (message.content.text || '').toLowerCase()
    return (
      text.includes('ouija') ||
      text.includes('spirit') ||
      text.includes('summon') ||
      text.includes('mystical')
    )
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      console.log('🔮 Assessing spirit realm (Ouija Action)...')

      // Extract agent address (similar to logic in other actions)
      // For now, we'll try to find a 32-44 char string that looks like a Solana address
      const text = message.content.text || ''
      const addressMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/)

      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      const agentAddress = addressMatch ? addressMatch[0] : null

      // If no address found in text, maybe use a default or ask for one?
      // In this specific flow, if no address, we return text asking for one.

      if (!agentAddress) {
        if (callback) {
          callback({
            text: "I sense you wish to consult the spirits, but I need a vessel's address (Agent Wallet Address) to focus the connection. Who shall we summon?",
          })
        }
        return { success: false }
      }

      console.log(`👻 Summoning report for: ${agentAddress}`)

      const report: any = await convex.action(api.reports.generateOuijaReport, {
        agentAddress,
      })

      if (!report) {
        if (callback) {
          callback({
            text: 'The spirits are silent... I could not find a trace of that agent.',
          })
        }
        return { success: false }
      }

      // Format a mystical text response
      const responseText = `
🔮 **THE SPIRITS HAVE SPOKEN** 🔮

**Identity:** ${report.summary.spiritShort}
_"${report.summary.spiritLong}"_

**Nature:** ${report.summary.reliability.toUpperCase()}

I have summoned the full Ouija Board visualization for you.
      `.trim()

      if (callback) {
        callback({
          text: responseText,
          ui: {
            type: 'ouija',
            agentAddress: report.agentAddress,
            summary: report.summary,
            reputation: report.reputation,
            reports: report.reports,
            transactions: report.transactions,
          },
        })
      }

      return {
        success: true,
        data: {
          type: 'ouija',
          agentAddress: report.agentAddress,
        },
      }
    } catch (error) {
      console.error('❌ Ouija action failed:', error)
      if (callback) {
        callback({
          text: 'The connection to the spirit realm was severed (Error generating report).',
        })
      }
      return { success: false }
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Do a ouija reading for 5DHhY...mHWcK' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Summoning the spirits for 5DHhY...mHWcK...',
          action: 'GENERATE_OUIJA_REPORT',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'What is the spirit of this agent?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I can reveal their spirit. Please provide the agent address.',
          action: 'GENERATE_OUIJA_REPORT',
        },
      },
    ],
  ],
}
