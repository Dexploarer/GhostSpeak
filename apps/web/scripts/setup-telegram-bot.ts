/**
 * Telegram Bot Setup Script
 *
 * Registers webhook with Telegram Bot API and verifies configuration
 *
 * Usage:
 *   bun run scripts/setup-telegram-bot.ts
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN - Your Telegram bot token from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET - Random secret for webhook validation (generate with: openssl rand -hex 32)
 *   NEXT_PUBLIC_APP_URL - Your app's public URL (e.g., https://ghostspeak.vercel.app)
 */

import { Telegraf } from 'telegraf'

interface WebhookInfo {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_date?: number
  last_error_message?: string
  max_connections?: number
  allowed_updates?: string[]
}

async function setupTelegramWebhook() {
  console.log('🤖 Setting up Telegram bot webhook...\n')

  // Validate environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set!')
    console.log('\n📝 To create a bot:')
    console.log('1. Message @BotFather on Telegram')
    console.log('2. Send /newbot and follow instructions')
    console.log('3. Copy the bot token')
    console.log('4. Set TELEGRAM_BOT_TOKEN in your .env.local or Vercel env vars\n')
    process.exit(1)
  }

  if (!webhookSecret) {
    console.warn('⚠️ TELEGRAM_WEBHOOK_SECRET not set - webhook will be INSECURE!')
    console.log('\n📝 Generate a secret:')
    console.log('  openssl rand -hex 32')
    console.log('  Then set TELEGRAM_WEBHOOK_SECRET in your .env.local or Vercel env vars\n')
  }

  if (!appUrl) {
    console.error('❌ NEXT_PUBLIC_APP_URL or VERCEL_URL not set!')
    console.log('\n📝 For local development:')
    console.log('  Use ngrok: https://ngrok.com')
    console.log('  Set NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io\n')
    console.log('📝 For production:')
    console.log('  Set NEXT_PUBLIC_APP_URL=https://your-domain.com')
    console.log('  Or deploy to Vercel (auto-sets VERCEL_URL)\n')
    process.exit(1)
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`
  console.log(`📍 Webhook URL: ${webhookUrl}`)
  console.log(`🔐 Webhook Secret: ${webhookSecret ? '✅ Set' : '⚠️ Not set (INSECURE)'}`)

  // Initialize bot
  const bot = new Telegraf(botToken)

  try {
    // Get bot info
    const me = await bot.telegram.getMe()
    console.log(`\n✅ Bot found: @${me.username} (${me.first_name})`)
    console.log(`   Bot ID: ${me.id}`)

    // Delete existing webhook (if any)
    console.log('\n🧹 Removing existing webhook...')
    await bot.telegram.deleteWebhook({ drop_pending_updates: true })
    console.log('✅ Old webhook removed')

    // Set new webhook
    console.log('\n📡 Setting new webhook...')
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: webhookSecret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    })
    console.log('✅ Webhook set successfully!')

    // Verify webhook
    console.log('\n🔍 Verifying webhook...')
    const webhookInfo: WebhookInfo = await bot.telegram.getWebhookInfo()
    console.log(`   URL: ${webhookInfo.url}`)
    console.log(`   Pending updates: ${webhookInfo.pending_update_count}`)

    if (webhookInfo.last_error_date) {
      const errorDate = new Date(webhookInfo.last_error_date * 1000)
      console.warn(`\n⚠️ Last error: ${webhookInfo.last_error_message}`)
      console.warn(`   Error date: ${errorDate.toISOString()}`)
    }

    if (webhookInfo.url !== webhookUrl) {
      console.error(`\n❌ Webhook URL mismatch!`)
      console.error(`   Expected: ${webhookUrl}`)
      console.error(`   Got: ${webhookInfo.url}`)
      process.exit(1)
    }

    console.log('\n✅ Webhook verified!')

    // Test connection
    console.log('\n🧪 Testing connection...')
    const updates = await bot.telegram.getUpdates({ limit: 1 })
    console.log(`✅ Connection successful! (${updates.length} pending updates)`)

    // Success summary
    console.log('\n' + '═'.repeat(60))
    console.log('🎉 Telegram bot setup complete!')
    console.log('═'.repeat(60))
    console.log('\n📱 Next steps:')
    console.log(`1. Open Telegram and search for @${me.username}`)
    console.log('2. Send /start to begin chatting with Caisper')
    console.log('3. Try asking: "Find me some agents"')
    console.log('\n💡 Tips:')
    console.log('• Free tier: 3 messages/day')
    console.log('• Upgrade with $GHOST tokens for unlimited access')
    console.log('• Check quota with /quota command')
    console.log('\n📊 Monitor:')
    console.log('• Webhook health: GET ' + webhookUrl)
    console.log('• Convex logs: bunx convex logs')
    console.log('• Vercel logs: vercel logs')
    console.log('\n🔧 Troubleshooting:')
    console.log('• If messages not working, check webhook URL is publicly accessible')
    console.log('• Telegram requires HTTPS (not HTTP)')
    console.log('• Use ngrok for local development')
    console.log('• Check Vercel env vars match .env.local')
    console.log('\n👻 Happy haunting!\n')
  } catch (error) {
    console.error('\n❌ Setup failed:', error)

    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error('\n💡 Invalid bot token. Check TELEGRAM_BOT_TOKEN is correct.')
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('\n💡 Network error. Check your internet connection.')
      } else if (error.message.includes('webhook')) {
        console.error('\n💡 Webhook error. Ensure URL is HTTPS and publicly accessible.')
      }
    }

    process.exit(1)
  }
}

// Run setup
setupTelegramWebhook().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
