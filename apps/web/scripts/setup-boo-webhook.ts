/**
 * Setup Boo Bot Webhook
 *
 * Configures the Telegram webhook for Boo bot to receive updates
 *
 * Usage:
 * cd apps/web && bun scripts/setup-boo-webhook.ts
 */

const BOT_TOKEN = process.env.TELEGRAM_BOO_BOT_TOKEN
const WEBHOOK_SECRET = process.env.TELEGRAM_BOO_WEBHOOK_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOO_BOT_TOKEN not set')
  process.exit(1)
}

if (!WEBHOOK_SECRET) {
  console.error('❌ TELEGRAM_BOO_WEBHOOK_SECRET not set')
  process.exit(1)
}

if (!APP_URL) {
  console.error('❌ NEXT_PUBLIC_APP_URL not set')
  process.exit(1)
}

const WEBHOOK_URL = `${APP_URL}/api/telegram/boo-webhook`

console.log('🎨 Setting up Boo Bot Webhook\n')
console.log('━'.repeat(80))
console.log(`\n📍 Webhook URL: ${WEBHOOK_URL}`)
console.log(`🔐 Using secret: ${WEBHOOK_SECRET.substring(0, 16)}...`)

async function setupWebhook() {
  try {
    // Set webhook
    console.log('\n📡 Setting webhook...')
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true, // Clear any pending updates
      }),
    })

    const data: any = await response.json()

    if (data.ok) {
      console.log('✅ Webhook set successfully!')
    } else {
      console.error('❌ Failed to set webhook:', data.description)
      process.exit(1)
    }

    // Get webhook info to verify
    console.log('\n📊 Verifying webhook info...')
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    )
    const infoData: any = await infoResponse.json()

    if (infoData.ok) {
      const info = infoData.result
      console.log('\n✅ Webhook Info:')
      console.log(`   URL: ${info.url}`)
      console.log(`   Has custom certificate: ${info.has_custom_certificate}`)
      console.log(`   Pending update count: ${info.pending_update_count}`)
      console.log(`   Max connections: ${info.max_connections}`)
      console.log(`   Allowed updates: ${info.allowed_updates?.join(', ')}`)

      if (info.last_error_message) {
        console.log(`\n⚠️  Last error: ${info.last_error_message}`)
        console.log(`   Last error date: ${new Date(info.last_error_date * 1000).toISOString()}`)
      } else {
        console.log('\n✅ No errors!')
      }
    }

    console.log('\n' + '━'.repeat(80))
    console.log('\n🎉 Boo bot webhook setup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Test the bot by messaging @boo_gs_bot on Telegram')
    console.log('   2. Try commands: /start, /help, /media, /raid')
    console.log('   3. Monitor logs: tail -f apps/web/logs/webhook.log')
    console.log('\n✨ Happy image generating! 🎨')
  } catch (error) {
    console.error('\n❌ Error setting up webhook:', error)
    process.exit(1)
  }
}

setupWebhook()
