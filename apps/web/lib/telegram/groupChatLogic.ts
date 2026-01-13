/**
 * Group Chat Logic for Telegram Bot
 *
 * Determines when Caisper should respond in group chats using smart heuristics
 * inspired by ElizaOS shouldRespond patterns
 */

import { Context } from 'telegraf'
import { Message } from 'telegraf/types'

export interface GroupChatContext {
  chatId: number
  chatType: 'private' | 'group' | 'supergroup' | 'channel'
  messageText: string
  userId: number
  botId: number
  isReplyToBot: boolean
  mentionsBot: boolean
  hasKeywords: boolean
  recentBotActivity: boolean
}

/**
 * Keywords that trigger bot response in groups
 * Can be configured via environment variable: TELEGRAM_GROUP_KEYWORDS
 */
function getResponseKeywords(): string[] {
  const defaultKeywords = [
    'ghost',
    'caisper',
    'score',
    'reputation',
    'credential',
    'verify',
    'agent',
    'trust',
    'check',
  ]

  const envKeywords = process.env.TELEGRAM_GROUP_KEYWORDS
  if (envKeywords) {
    return envKeywords.split(',').map((k: any) => k.trim().toLowerCase())
  }

  return defaultKeywords
}

/**
 * Detect if message is in a group chat
 */
export function isGroupChat(chatType: string): boolean {
  return chatType === 'group' || chatType === 'supergroup'
}

/**
 * Check if message is a reply to the bot
 */
export function isReplyToBot(message: any, botId: number): boolean {
  if (!message.reply_to_message) return false
  return message.reply_to_message.from?.id === botId
}

/**
 * Check if message mentions the bot
 */
export function mentionsBot(message: any, botUsername: string): boolean {
  const text = message.text || message.caption || ''

  // Check for @username mention
  if (text.includes(`@${botUsername}`)) return true

  // Check for entities (mentions)
  const entities = message.entities || []
  for (const entity of entities) {
    if (entity.type === 'mention' || entity.type === 'text_mention') {
      const mention = text.substring(entity.offset, entity.offset + entity.length)
      if (mention.includes(botUsername)) return true
    }
  }

  return false
}

/**
 * Check if message contains response keywords
 */
export function containsKeywords(text: string): boolean {
  const keywords = getResponseKeywords()
  const lowerText = text.toLowerCase()

  return keywords.some((keyword) => lowerText.includes(keyword))
}

/**
 * Determine if bot should respond in a group chat
 *
 * Response logic (in order of priority):
 * 1. Always respond to direct mentions (@caisper_bot)
 * 2. Always respond to replies to bot's messages
 * 3. Otherwise, stay silent (mention-only mode to prevent spam)
 */
export async function shouldRespondInGroup(params: {
  message: Message
  botId: number
  botUsername: string
  chatId: number
  messageText: string
}): Promise<{
  shouldRespond: boolean
  reason: string
  skipQuotaCheck?: boolean
}> {
  const { message, botId, botUsername, chatId, messageText } = params

  // 1. Always respond to direct mentions
  if (mentionsBot(message, botUsername)) {
    console.log('🎯 Bot mentioned, responding')
    return {
      shouldRespond: true,
      reason: 'mentioned',
      skipQuotaCheck: false, // Still check quota for mentioned messages
    }
  }

  // 2. Always respond to replies
  if (isReplyToBot(message, botId)) {
    console.log('💬 Reply to bot, responding')
    return {
      shouldRespond: true,
      reason: 'reply',
      skipQuotaCheck: false,
    }
  }

  // 3. Default: Only respond to mentions and replies (don't respond to keywords)
  // This prevents the bot from spamming groups
  console.log('🤐 No trigger conditions met, staying silent')
  return {
    shouldRespond: false,
    reason: 'no_trigger',
  }
}

/**
 * Check if a group is muted
 * Muted groups are stored in an in-memory set (can be moved to database)
 */
const mutedGroups = new Set<number>()

export async function isGroupMuted(chatId: number): Promise<boolean> {
  return mutedGroups.has(chatId)
}

export function muteGroup(chatId: number): void {
  mutedGroups.add(chatId)
  console.log(`🔇 Muted group: ${chatId}`)
}

export function unmuteGroup(chatId: number): void {
  mutedGroups.delete(chatId)
  console.log(`🔊 Unmuted group: ${chatId}`)
}

/**
 * Rate limiting for group responses
 * Prevents bot from spamming groups
 */
const groupResponseTimestamps = new Map<number, number[]>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_RESPONSES_PER_WINDOW = 5

export function checkGroupRateLimit(chatId: number): {
  allowed: boolean
  count: number
  remaining: number
} {
  const now = Date.now()
  const timestamps = groupResponseTimestamps.get(chatId) || []

  // Remove timestamps outside the window
  const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW)

  if (recentTimestamps.length >= MAX_RESPONSES_PER_WINDOW) {
    return {
      allowed: false,
      count: recentTimestamps.length,
      remaining: 0,
    }
  }

  // Add current timestamp
  recentTimestamps.push(now)
  groupResponseTimestamps.set(chatId, recentTimestamps)

  return {
    allowed: true,
    count: recentTimestamps.length,
    remaining: MAX_RESPONSES_PER_WINDOW - recentTimestamps.length,
  }
}

/**
 * Get group chat statistics (for admin dashboard)
 */
export interface GroupStats {
  totalGroups: number
  mutedGroups: number
  activeGroups: number
}

export function getGroupStats(): GroupStats {
  return {
    totalGroups: groupResponseTimestamps.size,
    mutedGroups: mutedGroups.size,
    activeGroups: groupResponseTimestamps.size - mutedGroups.size,
  }
}

/**
 * Format group context for ElizaOS agent
 * Adds group-specific metadata to help agent understand context
 */
export function formatGroupContext(params: {
  chatId: number
  chatTitle?: string
  chatType: string
  memberCount?: number
  isAdmin?: boolean
}): string {
  const { chatTitle, chatType, memberCount, isAdmin } = params

  let context = `**Group Chat Context:**\n`
  context += `- Chat Type: ${chatType}\n`
  if (chatTitle) context += `- Group Name: ${chatTitle}\n`
  if (memberCount) context += `- Members: ${memberCount}\n`
  if (isAdmin !== undefined) context += `- Bot is Admin: ${isAdmin ? 'Yes' : 'No'}\n`

  return context
}
