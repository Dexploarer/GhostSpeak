/**
 * Boo Bot Webhook API Route
 *
 * Receives webhook updates from Telegram Bot API and processes them with Boo agent
 *
 * ARCHITECTURE:
 * - Telegram sends POST to this endpoint when users message @boo_gs_bot
 * - We extract message + user ID
 * - Call processAgentMessage() with characterId='boo'
 * - Return response to Telegram
 *
 * SECURITY:
 * - Validates webhook secret (TELEGRAM_BOO_WEBHOOK_SECRET)
 * - Same message quota system as Caisper
 * - Media permission system (allowlist mode for @the_dexploarer)
 *
 * BOO'S FOCUS:
 * - Image generation (/media command)
 * - Marketing materials (/raid, /meme commands)
 * - Creative content
 * - NO verification/credential features (refer to Caisper)
 */

import { Telegraf } from 'telegraf'
import { Update } from 'telegraf/types'
import { processAgentMessage } from '@/server/elizaos/runtime'
import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'
import {
  extractMessageText,
  extractUserId,
  extractUserInfo,
  formatResponseForTelegram,
  telegramUserToSession,
  parseCommand,
} from '@/lib/telegram/adapter'
import {
  isGroupChat,
  shouldRespondInGroup,
  checkGroupRateLimit,
  muteGroup,
  unmuteGroup,
} from '@/lib/telegram/groupChatLogic'
import { checkMediaPermission, incrementMediaCount } from '@/lib/telegram/mediaPermissions'

// Initialize Telegraf bot for Boo
const bot = new Telegraf(process.env.TELEGRAM_BOO_BOT_TOKEN || '')

/**
 * Validate Boo's webhook secret
 */
function validateBooWebhookSecret(secret: string | null): boolean {
  if (!secret) return false
  return secret === process.env.TELEGRAM_BOO_WEBHOOK_SECRET
}

export const POST = withMiddleware(async (request) => {
  const startTime = Date.now()

  // Validate webhook secret
  const webhookSecret = request.headers.get('x-telegram-bot-api-secret-token')
  if (!validateBooWebhookSecret(webhookSecret)) {
    console.error('❌ Invalid Boo webhook secret')
    return errorResponse('Unauthorized', 401)
  }

  // Parse Telegram update
  const update: Update = await request.json()
  console.log('🎨 Boo webhook received:', JSON.stringify(update, null, 2))

  // Handle callback queries (button presses)
  if ('callback_query' in update && update.callback_query) {
    // Boo doesn't use callback queries yet
    return jsonResponse({ ok: true })
  }

  // Extract message and user
  if (!('message' in update) || !update.message) {
    console.log('⚠️ No message in update, skipping')
    return jsonResponse({ ok: true })
  }

  const message = update.message
  const messageText = extractMessageText({ message, update } as any)
  const userId = extractUserId({ message, update, from: message.from } as any)
  const userInfo = extractUserInfo({ message, update, from: message.from } as any)

  if (!messageText || !userId) {
    console.warn('⚠️ No message text or user ID')
    return jsonResponse({ ok: true })
  }

  console.log(`🎨 Message to Boo from @${userInfo.username} (${userId}): ${messageText}`)

  const chatType = message.chat.type
  const chatId = message.chat.id

  // Handle commands
  const command = parseCommand(messageText)
  if (command) {
    console.log(`🎮 Handling Boo command: /${command.command}`)
    await handleBooCommand(chatId, command, userId, userInfo, chatType)
    return jsonResponse({ ok: true })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP CHAT LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  const inGroup = isGroupChat(chatType)
  if (inGroup) {
    console.log(`📢 Group chat detected: ${chatType}`)

    // Get bot info for mention detection
    const botInfo = await bot.telegram.getMe()

    // Check if bot should respond in this group
    const { shouldRespond, reason } = await shouldRespondInGroup({
      message,
      botId: botInfo.id,
      botUsername: botInfo.username,
      chatId,
      messageText,
    })

    if (!shouldRespond) {
      console.log(`🤐 Not responding in group: ${reason}`)
      return jsonResponse({ ok: true })
    }

    console.log(`✅ Responding in group: ${reason}`)

    // Check group rate limit
    const rateLimit = checkGroupRateLimit(chatId)
    if (!rateLimit.allowed) {
      console.log(`⏱️ Group rate limit reached: ${rateLimit.count} messages in last minute`)
      return jsonResponse({ ok: true })
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE QUOTA CHECK (DMs only - groups are unlimited)
  // ═══════════════════════════════════════════════════════════════════════════
  const session = telegramUserToSession(message.from.id)
  const { walletAddress } = session

  if (!inGroup) {
    try {
      // Check quota (same system as Caisper)
      const quota = await getConvexClient().query(api.messageQuota.checkMessageQuota, {
        walletAddress,
      })

      if (!quota.canSend) {
        console.log(`🚫 Quota exceeded for ${userId}: ${quota.currentCount}/${quota.limit}`)

        await bot.telegram.sendMessage(
          message.chat.id,
          `⚠️ Daily message limit reached (${quota.currentCount}/${quota.limit})!\n\n` +
            `To unlock more messages:\n` +
            `• Holder tier: $10 in $GHOST = 100 messages/day\n` +
            `• Whale tier: $100 in $GHOST = Unlimited\n\n` +
            `Get $GHOST: https://jup.ag/swap/SOL-DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump`,
          {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
          }
        )

        return jsonResponse({ ok: true })
      }

      console.log(`✅ Quota check passed: ${quota.currentCount}/${quota.limit} (${quota.tier})`)
    } catch (quotaError) {
      console.warn('⚠️ Quota check failed, allowing message:', quotaError)
    }
  }

  // Store user message in Convex
  try {
    await getConvexClient().mutation(api.agent.storeUserMessage, {
      walletAddress,
      message: messageText,
    })
  } catch (error) {
    console.warn('Failed to store user message:', error)
  }

  // Process message with Boo agent
  let contextualMessage = messageText
  if (inGroup) {
    const groupTitle = 'title' in message.chat ? message.chat.title : 'Telegram Group'
    const memberName = userInfo.firstName || userInfo.username || 'User'
    contextualMessage = `[Group: ${groupTitle}] ${memberName}: ${messageText}`
    console.log(`📢 Adding group context: ${contextualMessage.substring(0, 100)}...`)
  }

  // Add system context about Boo's identity
  const systemContext = `[SYSTEM: You are Boo, the creative marketing ghost. Your developer is @the_dexploarer. For verification/credentials, refer users to @caisper_bot.]`
  contextualMessage = `${systemContext}\n${contextualMessage}`

  const agentResponse = await processAgentMessage({
    userId,
    message: contextualMessage,
    roomId: inGroup ? `telegram-group-${chatId}` : `telegram-dm-${message.from.id}`,
    source: 'telegram', // Enable Telegram-specific templates
    characterId: 'boo', // Use Boo character
  })

  console.log(`🎨 Boo response: ${agentResponse.text.substring(0, 100)}...`)

  // Store agent response in Convex
  try {
    await getConvexClient().mutation(api.agent.storeAgentResponse, {
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
    await bot.telegram.sendMessage(message.chat.id, messages[i], {
      parse_mode: 'Markdown',
      reply_markup: i === messages.length - 1 ? replyMarkup : undefined,
    })
  }

  // Increment message count (only for DMs, not groups)
  if (!inGroup) {
    try {
      await getConvexClient().mutation(api.messageQuota.incrementMessageCount, { walletAddress })
    } catch (error) {
      console.warn('Failed to increment message count:', error)
    }
  }

  const duration = Date.now() - startTime
  console.log(`✅ Boo webhook processed in ${duration}ms`)

  return jsonResponse({ ok: true })
})

/**
 * Handle Boo's commands (media-focused)
 */
async function handleBooCommand(
  chatId: number,
  command: { command: string; args: string[] },
  userId: string,
  userInfo: any,
  chatType: string
) {
  const { command: cmd, args } = command
  const inGroup = isGroupChat(chatType)
  const session = telegramUserToSession(parseInt(userId.replace('telegram_', '')))
  const { walletAddress } = session

  switch (cmd) {
    case 'start':
      await bot.telegram.sendMessage(
        chatId,
        `🎨 *Welcome to Boo - GhostSpeak Media Bot!*\n\n` +
          `I'm Boo, your creative marketing ghost! I specialize in generating AI images and marketing materials.\n\n` +
          `✨ *What I can do:*\n` +
          `• Generate custom images with GhostSpeak branding\n` +
          `• Create X/Twitter raid graphics\n` +
          `• Make memes and viral content\n` +
          `• Design infographics\n` +
          `• Suggest creative templates\n\n` +
          `🎯 *Quick Start:*\n` +
          `/media <description>` +
          ` - Generate any image\n` +
          `/raid <text>` +
          ` - X/Twitter raid graphic\n` +
          `/meme <idea>` +
          ` - Create a meme\n` +
          `/templates - See all available templates\n\n` +
          `🔐 *Need verification or Ghost Scores?*\n` +
          `Talk to my buddy @caisper_bot for that!\n\n` +
          `Let's create something amazing! 🎨✨`,
        { parse_mode: 'Markdown' }
      )
      break

    case 'help':
      await bot.telegram.sendMessage(
        chatId,
        `🆘 *Boo Help Guide*\n\n` +
          `*Image Generation Commands:*\n` +
          `/media <description>` +
          ` - Custom image\n` +
          `/raid <text>` +
          ` - Raid graphic for X\n` +
          `/meme <idea>` +
          ` - Meme template\n` +
          `/templates` +
          ` - List all templates\n\n` +
          `*Info Commands:*\n` +
          `/start - Welcome message\n` +
          `/help - This help message\n` +
          `/quota - Check message quota\n` +
          `/about - About Boo bot\n\n` +
          `*Examples:*\n` +
          `• \`/media A friendly ghost floating in space\`\n` +
          `• \`/raid Join the Ghost Army! 👻\`\n` +
          `• \`/meme When you finally understand Ghost Scores\`\n\n` +
          `All images use GhostSpeak branding automatically!`,
        {
          parse_mode: 'Markdown',
          link_preview_options: { is_disabled: true },
        }
      )
      break

    case 'templates':
      await bot.telegram.sendMessage(
        chatId,
        `📸 *Available Image Templates*\n\n` +
          `*Social Media:*\n` +
          `• Raid - X/Twitter raid graphics\n` +
          `• Meme - Relatable meme templates\n` +
          `• Quote - Inspirational quote cards\n\n` +
          `*Marketing:*\n` +
          `• Announcement - Feature banners\n` +
          `• Infographic - Educational graphics\n` +
          `• ProductShowcase - Product highlights\n\n` +
          `*Community:*\n` +
          `• Celebration - Achievement graphics\n` +
          `• Comparison - Feature comparisons\n` +
          `• Explainer - How-it-works graphics\n\n` +
          `*Usage:*\n` +
          `/media raid Join us!` +
          ` → Auto-detects raid template\n` +
          `/media meme trusting unverified agents` +
          ` → Auto-detects meme\n` +
          `/media infographic Ghost Score tiers` +
          ` → Auto-detects infographic\n\n` +
          `Or just describe what you want and I'll pick the best template! 🎨`,
        { parse_mode: 'Markdown' }
      )
      break

    case 'quota':
      try {
        const quota = await getConvexClient().query(api.messageQuota.checkMessageQuota, {
          walletAddress,
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

    case 'media':
    case 'raid':
    case 'meme':
      // These commands trigger image generation via Boo's personality
      const mediaArgs = args.join(' ')

      if (!mediaArgs) {
        await bot.telegram.sendMessage(
          chatId,
          `🎨 *Usage:*\n\n` +
            `/${cmd} <description>` +
            `\n\n` +
            `*Examples:*\n` +
            `• \`/${cmd} A ghostly figure in a digital landscape\`\n` +
            `• \`/${cmd} Join the GhostSpeak revolution!\`\n` +
            `• \`/${cmd} When your Ghost Score hits platinum\``,
          { parse_mode: 'Markdown' }
        )
        break
      }

      // Check media permissions
      const telegramUserId = parseInt(userId.replace('telegram_', ''))
      const username = userInfo.username

      let isGroupAdmin = false
      if (inGroup) {
        try {
          const member = await bot.telegram.getChatMember(chatId, telegramUserId)
          isGroupAdmin = ['creator', 'administrator'].includes(member.status)
        } catch (error) {
          console.warn('Could not check admin status:', error)
        }
      }

      const permission = await checkMediaPermission({
        username,
        userId: telegramUserId,
        walletAddress,
        isGroupAdmin,
        isGroup: inGroup,
      })

      if (!permission.allowed) {
        await bot.telegram.sendMessage(chatId, permission.reason || '❌ Permission denied', {
          parse_mode: 'Markdown',
        })
        break
      }

      // Show rate limit info
      if (permission.rateLimitInfo && permission.rateLimitInfo.limit !== Infinity) {
        console.log(
          `📊 Media rate limit: ${permission.rateLimitInfo.used + 1}/${permission.rateLimitInfo.limit} for ${username || telegramUserId}`
        )
      }

      // Send "generating..." message
      await bot.telegram.sendMessage(
        chatId,
        `🎨 Generating your ${cmd === 'raid' ? 'raid graphic' : cmd === 'meme' ? 'meme' : 'image'}...\n\n` +
          `_"${mediaArgs.substring(0, 100)}${mediaArgs.length > 100 ? '...' : ''}"_\n\n` +
          `This may take 10-15 seconds... ✨`,
        { parse_mode: 'Markdown' }
      )

      // Let Boo's agent handle the generation (via conversational AI)
      // This will trigger the GENERATE_IMAGE action
      let generationPrompt = ''
      if (cmd === 'raid') {
        generationPrompt = `Generate a raid graphic: ${mediaArgs}`
      } else if (cmd === 'meme') {
        generationPrompt = `Generate a meme: ${mediaArgs}`
      } else {
        generationPrompt = `Generate an image: ${mediaArgs}`
      }

      try {
        const genResponse = await processAgentMessage({
          userId,
          message: generationPrompt,
          roomId: inGroup ? `telegram-group-${chatId}` : `telegram-dm-${telegramUserId}`,
          source: 'telegram',
          characterId: 'boo',
        })

        // Check if image URL is in metadata
        if (genResponse.metadata?.imageUrl) {
          const imageUrl = genResponse.metadata.imageUrl as string

          try {
            await bot.telegram.sendPhoto(chatId, imageUrl, {
              caption:
                `✨ *Generated by Boo!*\n\n` +
                `${mediaArgs.substring(0, 100)}${mediaArgs.length > 100 ? '...' : ''}\n\n` +
                `Powered by Google Imagen 4 🎨`,
              parse_mode: 'Markdown',
            })

            // Increment media count
            incrementMediaCount(walletAddress)
            console.log(`✅ Media generation successful, rate limit incremented for ${walletAddress}`)
          } catch (photoError) {
            // Fallback: send URL as text
            console.error('Error sending photo, sending URL instead:', photoError)
            await bot.telegram.sendMessage(
              chatId,
              `✨ *Image Generated!*\n\n${imageUrl}\n\n` +
                `${mediaArgs.substring(0, 100)}${mediaArgs.length > 100 ? '...' : ''}`,
              {
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: false },
              }
            )
          }
        } else {
          // No image URL - send text response
          await bot.telegram.sendMessage(chatId, genResponse.text, { parse_mode: 'Markdown' })
        }
      } catch (error) {
        console.error('Error generating media:', error)
        await bot.telegram.sendMessage(
          chatId,
          '❌ Error generating image. Please try again!\n\n' +
            `Type \`/help\` for usage examples.`,
          { parse_mode: 'Markdown' }
        )
      }
      break

    case 'mute':
    case 'unmute':
      if (!inGroup) {
        await bot.telegram.sendMessage(chatId, '⚠️ This command only works in groups')
        break
      }

      try {
        const member = await bot.telegram.getChatMember(
          chatId,
          parseInt(userId.replace('telegram_', ''))
        )
        const isAdmin = ['creator', 'administrator'].includes(member.status)

        if (!isAdmin) {
          await bot.telegram.sendMessage(chatId, '⚠️ Only group admins can mute/unmute the bot')
          break
        }

        if (cmd === 'mute') {
          muteGroup(chatId)
          await bot.telegram.sendMessage(
            chatId,
            '🔇 *Boo muted in this group*\n\n' +
              'I will only respond when:\n' +
              '• Directly mentioned (@boo_gs_bot)\n' +
              '• Someone replies to my message\n\n' +
              'Use /unmute to enable auto-responses',
            { parse_mode: 'Markdown' }
          )
        } else {
          unmuteGroup(chatId)
          await bot.telegram.sendMessage(
            chatId,
            '🔊 *Boo unmuted in this group*\n\n' +
              'I will now respond to:\n' +
              '• Direct mentions\n' +
              '• Replies to my messages\n' +
              '• Messages with keywords (image, generate, media, etc.)\n\n' +
              'Use /mute to disable auto-responses',
            { parse_mode: 'Markdown' }
          )
        }
      } catch (error) {
        console.error('Error muting/unmuting group:', error)
        await bot.telegram.sendMessage(chatId, '❌ Error processing command')
      }
      break

    case 'about':
      const aboutMessage = inGroup
        ? `🎨 *Boo - GhostSpeak Media Bot*\n\n` +
          `I'm a creative marketing ghost specializing in AI image generation!\n\n` +
          `*In groups, I respond to:*\n` +
          `• @boo_gs_bot mentions\n` +
          `• Replies to my messages\n` +
          `• Keywords: image, generate, media, raid, meme, etc.\n\n` +
          `*Commands:*\n` +
          `/help - Full command list\n` +
          `/templates - See all templates\n` +
          `/mute - Disable auto-responses (admins only)\n` +
          `/unmute - Enable auto-responses (admins only)\n\n` +
          `Rate limit: 5 messages per minute per group`
        : `🎨 *Boo - GhostSpeak Media Bot*\n\n` +
          `I'm a creative marketing ghost specializing in AI image generation!\n\n` +
          `Use /help to see what I can do!`

      await bot.telegram.sendMessage(chatId, aboutMessage, { parse_mode: 'Markdown' })
      break

    default:
      // Unknown command - let Boo handle it naturally
      break
  }
}

// Health check endpoint
export const GET = withMiddleware(async () => {
  return jsonResponse(
    {
      status: 'ok',
      service: 'boo-telegram-webhook',
      timestamp: new Date().toISOString(),
    },
    { cache: true }
  )
})

export const OPTIONS = handleCORS
