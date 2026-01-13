import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

export const checkQuotaAction: Action = {
  name: 'CHECK_QUOTA',
  description: 'Show generation quota status',
  similes: ['check quota', 'how many left', 'generations left', 'quota status', 'my limit'],
  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'How many generations do I have left?' },
      },
      {
        user: '{{agent}}',
        content: {
          text: "📊 **Your Generation Quota:**\n\n🆓 **Tier:** Free\n🎨 **Used:** 3/5 images this month\n✅ **Remaining:** 2 images\n⏰ **Resets:** in 17 days\n\n💡 **Upgrade to Holder tier for 25 images/month!**\nHold $10+ worth of $GHOST tokens.",
        },
      },
    ],
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase()
    return (
      text.includes('quota') ||
      text.includes('how many') && (text.includes('left') || text.includes('generations')) ||
      text.includes('generations left') ||
      text.includes('my limit')
    )
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const userId = message.userId
      const convexUrl = runtime.getSetting('CONVEX_URL') || process.env.NEXT_PUBLIC_CONVEX_URL

      if (!convexUrl) {
        throw new Error('CONVEX_URL not configured')
      }

      const convex = new ConvexHttpClient(convexUrl)

      // Get user's quota status from Convex
      const quotaStatus = await convex.query(api.messageQuota.checkMessageQuota, {
        userId,
      })

      if (!quotaStatus) {
        if (callback) {
          callback({
            text: 'Unable to fetch quota status. Please try again.',
          })
        }
        return false
      }

      const { tier, count, limit, canSendMessage } = quotaStatus

      // Calculate remaining
      const used = count
      const remaining = Math.max(0, limit - used)
      const percentUsed = Math.round((used / limit) * 100)

      // Get tier display info
      const tierInfo = {
        free: { emoji: '🆓', name: 'Free', upgrade: 'Hold $10+ worth of $GHOST for Holder tier (100 messages/day)!' },
        holder: { emoji: '🌟', name: 'Holder', upgrade: 'Hold $100+ worth of $GHOST for Whale tier (unlimited)!' },
        whale: { emoji: '🐋', name: 'Whale', upgrade: 'You have unlimited generations!' },
      }

      const info = tierInfo[tier] || tierInfo.free

      // Calculate reset time (daily reset at UTC midnight)
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)
      const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60))

      let response = '📊 **Your Generation Quota**\n\n'
      response += `${info.emoji} **Tier:** ${info.name}\n`
      response += `🎨 **Used:** ${used}/${limit} generations today\n`

      if (!canSendMessage) {
        response += `🚫 **Status:** Quota exhausted\n`
      } else {
        response += `✅ **Remaining:** ${remaining} generation${remaining === 1 ? '' : 's'}\n`
      }

      response += `⏰ **Resets in:** ${hoursUntilReset} hour${hoursUntilReset === 1 ? '' : 's'}\n\n`

      if (tier !== 'whale') {
        response += `💡 **Upgrade Tip:**\n${info.upgrade}`
      } else {
        response += `Keep creating amazing GhostSpeak content! 🚀`
      }

      if (callback) {
        callback({ text: response })
      }

      return true
    } catch (error) {
      console.error('Error in checkQuota:', error)
      if (callback) {
        callback({
          text: 'Failed to check quota status. Please try again.',
        })
      }
      return false
    }
  },
}
