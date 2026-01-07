/**
 * Get User Portfolio Action
 *
 * Retrieves the authenticated user's Ghosthunter/Ecto scores, wallet stats, and recent activity
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const getUserPortfolioAction: Action = {
  name: 'GET_USER_PORTFOLIO',
  description:
    "Get the authenticated user's portfolio, reputation scores (Ecto/Ghosthunter), and recent activity",

  // Validate: trigger when user asks about their own stats, score, or portfolio
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Check if the user is asking about THEMSELVES (not a specific agent address)
    const selfTriggers = [
      'my portfolio',
      'my stats',
      'my score',
      'my reputation',
      'how am i doing',
      'my ghosthunter score',
      'my ecto score',
      'my activity',
      'what have i done',
      'my rank',
      'who am i',
    ]

    // If there is an agent address in the text, let CHECK_REPUTATION handle it instead
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')
    if (hasAddress) return false

    return selfTriggers.some((trigger) => text.includes(trigger))
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const walletAddress = (message.content as any).walletAddress

      if (!walletAddress) {
        const response = {
          text: "I'd love to check your portfolio, but I can't quite see your wallet from the spirit realm. 👻\n\nMake sure you're connected and signed in, then ask me again!",
        }
        if (callback) await callback(response)
        return { success: false, error: 'No wallet address in context' }
      }

      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Query user dashboard data from Convex
      const dashboardData = await convex.query(api.dashboard.getUserDashboard, {
        walletAddress,
      })

      if (!dashboardData) {
        const response = {
          text: `I couldn't find any profile data for \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}\`. 👻\n\nYou might be new here! Start by verifying some agents or registering your own to build your reputation.`,
        }
        if (callback) await callback(response)
        return { success: false, error: 'User not found in Convex' }
      }

      // Format response based on user roles
      let responseText = `Hold my ectoplasm, pulling up your file... 🔍\n\n`
      responseText += `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}\`\n`

      const { reputation, stats, gamification } = dashboardData

      // 1. Ghosthunter Score (Customer role)
      if (reputation.ghosthunter) {
        const tierEmojis: Record<string, string> = {
          ROOKIE: '🐣',
          TRACKER: '🕵️‍♂️',
          VETERAN: '🎖️',
          ELITE: '⚔️',
          LEGENDARY: '🏆',
        }
        const emoji = tierEmojis[reputation.ghosthunter.tier] || '👻'
        responseText += `**Ghosthunter Score:** ${reputation.ghosthunter.score}/10000 ${emoji} (${reputation.ghosthunter.tier} tier)\n`
      }

      // 2. Ecto Score (Developer role)
      if (reputation.ecto) {
        const tierEmojis: Record<string, string> = {
          NOVICE: '🌱',
          APPRENTICE: '🔨',
          ARTISAN: '🎨',
          MASTER: '🧙‍♂️',
          LEGEND: '🌟',
        }
        const emoji = tierEmojis[reputation.ecto.tier] || '👻'
        responseText += `**Ecto Score:** ${reputation.ecto.score}/10000 ${emoji} (${reputation.ecto.tier} tier)\n`
        responseText += `**Agents Registered:** ${reputation.ecto.agentsRegistered}\n`
      }

      // 3. Stats Summary
      responseText += `\n**Activity Summary:**\n`
      responseText += `- Verifications: ${stats.totalVerifications}\n`
      responseText += `- Monthly API Calls: ${stats.apiCallsThisMonth}\n`
      responseText += `- Total Spent: $${stats.totalSpent}\n`

      if (gamification?.streak?.isActive) {
        responseText += `- Active Streak: ${gamification.streak.days} days 🔥\n`
      }

      // 4. Personalized Vibe Check
      let myTake = ''
      if ((reputation.ghosthunter?.score || 0) > 7500 || (reputation.ecto?.score || 0) > 7500) {
        myTake =
          "You're a power user! Your presence in the GhostSpeak network is felt across the blockchain. Respect. 🫡"
      } else if (stats.totalVerifications > 10) {
        myTake =
          "You've been busy verifying spirits! Keep it up—the network depends on hunters like you. 🕵️‍♂️"
      } else {
        myTake =
          "You're just getting started, but the foundations are solid. Want me to find some unclaimed agents for you to register? 👻"
      }

      responseText += `\n**My Take:** ${myTake}`

      const response = {
        text: responseText,
        ui: {
          type: 'user-portfolio',
          walletAddress,
          dashboardData,
          myTake,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: dashboardData,
      }
    } catch (error) {
      console.error('Error fetching user portfolio:', error)

      const errorResponse = {
        text: 'I tried to peek into your portfolio but the spirit realm is a bit hazy right now. 👻💥\n\nTry again in a moment!',
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
        content: { text: 'Show me my portfolio' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Hold my ectoplasm, pulling up your file... 🔍\n\n**Ghosthunter Score:** 5400/10000 🎖️ (VETERAN tier)',
          action: 'GET_USER_PORTFOLIO',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: "What's my reputation score?" },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Investigating your on-chain ghost trail... 🕵️‍♂️\n\n**Ecto Score:** 8200/10000 🧙‍♂️ (MASTER tier)',
          action: 'GET_USER_PORTFOLIO',
        },
      },
    ],
  ],
}
