/**
 * Telegram ↔ ElizaOS Adapter
 *
 * Converts between Telegram message format and ElizaOS processAgentMessage format
 */

import { Context } from 'telegraf'

/**
 * Extract message text from Telegram update
 */
export function extractMessageText(ctx: Context): string | null {
  // Handle text messages
  if (ctx.message && 'text' in ctx.message) {
    return ctx.message.text
  }

  // Handle callback queries (button presses)
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
    return ctx.callbackQuery.data
  }

  return null
}

/**
 * Extract user ID from Telegram update
 * Returns Telegram user ID as string (e.g., "telegram_123456789")
 */
export function extractUserId(ctx: Context): string | null {
  const telegramId = ctx.from?.id
  if (!telegramId) return null

  // Prefix with "telegram_" to avoid collision with Solana wallet addresses
  return `telegram_${telegramId}`
}

/**
 * Extract user info for logging/analytics
 */
export function extractUserInfo(ctx: Context) {
  return {
    telegramId: ctx.from?.id,
    username: ctx.from?.username,
    firstName: ctx.from?.first_name,
    lastName: ctx.from?.last_name,
    isBot: ctx.from?.is_bot || false,
    languageCode: ctx.from?.language_code,
  }
}

/**
 * Format ElizaOS response for Telegram
 * Handles Telegram's 4096 character limit by splitting long messages
 */
export function formatResponseForTelegram(text: string, metadata?: Record<string, unknown>): {
  messages: string[]
  replyMarkup?: any
} {
  const MAX_MESSAGE_LENGTH = 4096

  // Split long messages into chunks
  const messages: string[] = []
  let currentMessage = text

  while (currentMessage.length > MAX_MESSAGE_LENGTH) {
    // Find last newline before limit
    let splitIndex = currentMessage.lastIndexOf('\n', MAX_MESSAGE_LENGTH)
    if (splitIndex === -1) {
      // No newline found, split at space
      splitIndex = currentMessage.lastIndexOf(' ', MAX_MESSAGE_LENGTH)
    }
    if (splitIndex === -1) {
      // No space found, hard split
      splitIndex = MAX_MESSAGE_LENGTH
    }

    messages.push(currentMessage.substring(0, splitIndex))
    currentMessage = currentMessage.substring(splitIndex).trim()
  }

  if (currentMessage) {
    messages.push(currentMessage)
  }

  // Build inline keyboard from metadata if present
  let replyMarkup
  if (metadata?.type === 'agents') {
    // Build agent discovery keyboard
    const agents = (metadata.agents as any[]) || []
    const keyboard = agents.slice(0, 5).map((agent) => ([
      {
        text: `👻 ${agent.name || agent.address.slice(0, 8)}...`,
        callback_data: `claim_${agent.address}`,
      }
    ]))

    if (keyboard.length > 0) {
      replyMarkup = {
        inline_keyboard: keyboard,
      }
    }
  }

  return { messages, replyMarkup }
}

/**
 * Validate webhook secret to prevent unauthorized requests
 */
export function validateWebhookSecret(requestSecret: string | null): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!expectedSecret) {
    console.warn('⚠️ TELEGRAM_WEBHOOK_SECRET not set - webhook is INSECURE')
    return true // Allow in development
  }

  return requestSecret === expectedSecret
}

/**
 * Convert Telegram user to session format
 * Creates a pseudo-wallet address for Telegram users
 */
export function telegramUserToSession(telegramId: number) {
  return {
    userId: `telegram_${telegramId}`,
    // For quota checking, we'll use Telegram ID as wallet address
    // Future: Link Telegram users to actual Solana wallets
    walletAddress: `telegram_${telegramId}`,
    platform: 'telegram',
  }
}

/**
 * Parse command from message text
 * Example: "/start" -> { command: "start", args: [] }
 */
export function parseCommand(text: string): { command: string; args: string[] } | null {
  if (!text.startsWith('/')) return null

  const parts = text.slice(1).split(' ')
  return {
    command: parts[0],
    args: parts.slice(1),
  }
}
