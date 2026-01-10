/**
 * Telegram Bot Webhook API Route
 *
 * Receives webhook updates from Telegram Bot API and processes them with Caisper agent
 *
 * ARCHITECTURE:
 * - Telegram sends POST to this endpoint when users message the bot
 * - We extract message + user ID
 * - Call processAgentMessage() (same as web chat)
 * - Return response to Telegram
 *
 * SECURITY:
 * - Validates webhook secret (TELEGRAM_WEBHOOK_SECRET)
 * - Same message quota system as web chat ($GHOST holdings)
 * - Telegram user ID prefixed with "telegram_" to avoid collision
 *
 * QUOTA:
 * - Telegram users use the same quota as web users
 * - Free: 3 messages/day
 * - Can be upgraded by linking Solana wallet (future feature)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Telegraf } from 'telegraf'
import { Update } from 'telegraf/types'
import { processAgentMessage } from '@/server/elizaos/runtime'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import {
  extractMessageText,
  extractUserId,
  extractUserInfo,
  formatResponseForTelegram,
  validateWebhookSecret,
  telegramUserToSession,
  parseCommand,
} from '@/lib/telegram/adapter'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Initialize Telegraf bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '')

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get('x-telegram-bot-api-secret-token')
    if (!validateWebhookSecret(webhookSecret)) {
      console.error('❌ Invalid webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse Telegram update
    const update: Update = await req.json()
    console.log('📨 Telegram update received:', JSON.stringify(update, null, 2))

    // Handle callback queries (button presses)
    if ('callback_query' in update && update.callback_query) {
      await handleCallbackQuery(update.callback_query)
      return NextResponse.json({ ok: true })
    }

    // Extract message and user
    if (!('message' in update) || !update.message) {
      console.log('⚠️ No message in update, skipping')
      return NextResponse.json({ ok: true })
    }

    const message = update.message
    const messageText = extractMessageText({ message, update } as any)
    const userId = extractUserId({ message, update, from: message.from } as any)
    const userInfo = extractUserInfo({ message, update, from: message.from } as any)

    if (!messageText || !userId) {
      console.warn('⚠️ No message text or user ID')
      return NextResponse.json({ ok: true })
    }

    console.log(`📨 Message from @${userInfo.username} (${userId}): ${messageText}`)

    // Handle commands
    const command = parseCommand(messageText)
    if (command) {
      await handleCommand(message.chat.id, command, userId)
      return NextResponse.json({ ok: true })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MESSAGE QUOTA CHECK (same as web chat)
    // ═══════════════════════════════════════════════════════════════════════════
    const session = telegramUserToSession(message.from.id)
    const { walletAddress } = session

    try {
      // Check quota (Telegram users treated as free tier unless upgraded)
      const quota = await convex.query(api.messageQuota.checkMessageQuota, { walletAddress })

      if (!quota.canSend) {
        console.log(`🚫 Quota exceeded for ${userId}: ${quota.currentCount}/${quota.limit}`)

        await bot.telegram.sendMessage(
          message.chat.id,
          `⚠️ Daily message limit reached (${quota.currentCount}/${quota.limit})!\n\n` +
          `To unlock more messages:\n` +
          `• Holder tier: $10 in $GHOST = 100 messages/day\n` +
          `• Whale tier: $100 in $GHOST = Unlimited\n\n` +
          `Get $GHOST: https://jup.ag/swap/SOL-DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump\n\n` +
          `💡 Future: Link your Solana wallet to auto-upgrade your tier!`,
          { parse_mode: 'Markdown', disable_web_page_preview: true }
        )

        return NextResponse.json({ ok: true })
      }

      console.log(`✅ Quota check passed: ${quota.currentCount}/${quota.limit} (${quota.tier})`)
    } catch (quotaError) {
      console.warn('⚠️ Quota check failed, allowing message:', quotaError)
    }

    // Store user message in Convex
    try {
      await convex.mutation(api.agent.storeUserMessage, {
        walletAddress,
        message: messageText,
      })
    } catch (error) {
      console.warn('Failed to store user message:', error)
    }

    // Process message with Caisper agent
    const agentResponse = await processAgentMessage({
      userId,
      message: messageText,
      roomId: `telegram-${message.from.id}`,
    })

    console.log(`🤖 Caisper response: ${agentResponse.text.substring(0, 100)}...`)

    // Store agent response in Convex
    try {
      await convex.mutation(api.agent.storeAgentResponse, {
        walletAddress,
        response: agentResponse.text,
        actionTriggered: agentResponse.action,
        metadata: agentResponse.metadata,
      })
    } catch (error) {
      console.warn('Failed to store agent response:', error)
    }

    // Format and send response to Telegram
    const { messages, replyMarkup } = formatResponseForTelegram(
      agentResponse.text,
      agentResponse.metadata
    )

    for (let i = 0; i < messages.length; i++) {
      await bot.telegram.sendMessage(
        message.chat.id,
        messages[i],
        {
          parse_mode: 'Markdown',
          reply_markup: i === messages.length - 1 ? replyMarkup : undefined,
        }
      )
    }

    // Increment message count
    try {
      await convex.mutation(api.messageQuota.incrementMessageCount, { walletAddress })
    } catch (error) {
      console.warn('Failed to increment message count:', error)
    }

    const duration = Date.now() - startTime
    console.log(`✅ Telegram webhook processed in ${duration}ms`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Telegram webhook error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * Handle callback queries (button presses)
 */
async function handleCallbackQuery(callbackQuery: any) {
  const data = callbackQuery.data
  const chatId = callbackQuery.message?.chat.id

  if (!chatId) return

  try {
    // Handle agent claim buttons
    if (data.startsWith('claim_')) {
      const agentAddress = data.replace('claim_', '')

      await bot.telegram.sendMessage(
        chatId,
        `🔮 Claiming agent ${agentAddress.slice(0, 8)}...\n\n` +
        `To complete the claim, connect your Solana wallet at:\n` +
        `https://ghostspeak.io/dashboard\n\n` +
        `💡 Telegram wallet linking coming soon!`,
        { parse_mode: 'Markdown' }
      )

      // Answer callback query to remove loading state
      await bot.telegram.answerCbQuery(callbackQuery.id)
    }
  } catch (error) {
    console.error('Error handling callback query:', error)
    await bot.telegram.answerCbQuery(callbackQuery.id, {
      text: 'Error processing request',
      show_alert: true,
    })
  }
}

/**
 * Handle bot commands
 */
async function handleCommand(
  chatId: number,
  command: { command: string; args: string[] },
  userId: string
) {
  const { command: cmd } = command

  switch (cmd) {
    case 'start':
      await bot.telegram.sendMessage(
        chatId,
        `👻 *Welcome to GhostSpeak!*\n\n` +
        `I'm Caisper, your friendly neighborhood ghost who verifies AI agent credentials and reputation.\n\n` +
        `🔍 *What I can do:*\n` +
        `• Check Ghost Scores for agents\n` +
        `• Verify W3C credentials\n` +
        `• Discover available agents\n` +
        `• Run trust assessments\n` +
        `• Issue new credentials\n\n` +
        `💬 *Just ask me anything!* For example:\n` +
        `"Find me some agents"\n` +
        `"What's a Ghost Score?"\n` +
        `"Check reputation for [agent-address]"\n\n` +
        `📊 Free tier: 3 messages/day\n` +
        `🚀 Upgrade with $GHOST tokens for unlimited access!\n\n` +
        `Let's get haunting! 👻✨`,
        { parse_mode: 'Markdown' }
      )
      break

    case 'help':
      await bot.telegram.sendMessage(
        chatId,
        `🆘 *Caisper Help Guide*\n\n` +
        `*Commands:*\n` +
        `/start - Welcome message\n` +
        `/help - This help message\n` +
        `/quota - Check your message quota\n\n` +
        `*Ask me anything!*\n` +
        `"Find agents" - Discover AI agents\n` +
        `"Check score for [address]" - Verify reputation\n` +
        `"What credentials can you issue?" - Learn about VCs\n\n` +
        `*Need more messages?*\n` +
        `Get $GHOST tokens: https://jup.ag/swap/SOL-GHOST`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      )
      break

    case 'quota':
      try {
        const session = telegramUserToSession(parseInt(userId.replace('telegram_', '')))
        const quota = await convex.query(api.messageQuota.checkMessageQuota, {
          walletAddress: session.walletAddress,
        })

        await bot.telegram.sendMessage(
          chatId,
          `📊 *Your Message Quota*\n\n` +
          `Tier: ${quota.tier.toUpperCase()}\n` +
          `Used: ${quota.currentCount}/${quota.limit === Infinity ? '∞' : quota.limit}\n` +
          `Remaining: ${quota.limit === Infinity ? '∞' : quota.limit - quota.currentCount}\n\n` +
          `${quota.tier === 'free' ? `💡 Upgrade with $GHOST tokens for more messages!` : '✅ You have premium access!'}`,
          { parse_mode: 'Markdown' }
        )
      } catch (error) {
        console.error('Error checking quota:', error)
        await bot.telegram.sendMessage(chatId, '❌ Error checking quota')
      }
      break

    default:
      // Unknown command - let Caisper handle it naturally
      break
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-webhook',
    timestamp: new Date().toISOString(),
  })
}
