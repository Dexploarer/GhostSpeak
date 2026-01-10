/**
 * Configure Telegram Bot via API
 *
 * Sets up commands, description, about text, and privacy settings
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=your-token bun run scripts/configure-bot.ts
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required')
  process.exit(1)
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

async function apiCall(method: string, params?: Record<string, any>) {
  const url = `${API_BASE}/${method}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  })

  const data = await response.json()
  if (!data.ok) {
    throw new Error(`API call failed: ${data.description}`)
  }
  return data.result
}

async function configureBotCommands() {
  console.log('📋 Setting bot commands...')

  const commands = [
    { command: 'start', description: 'Welcome message and bot introduction' },
    { command: 'help', description: 'Show available commands and examples' },
    { command: 'about', description: 'Bot info and capabilities' },
    { command: 'quota', description: 'Check your daily message quota' },
    { command: 'mute', description: 'Disable auto-responses in groups (admin only)' },
    { command: 'unmute', description: 'Enable auto-responses in groups (admin only)' },
  ]

  await apiCall('setMyCommands', { commands })
  console.log('✅ Commands set successfully')
}

async function configureBotDescription() {
  console.log('📝 Setting bot description...')

  const description = `👻 I verify AI agent credentials and reputation using Ghost Scores and W3C credentials.

💬 Ask me: "Find agents", "What's a Ghost Score?", or "Check [agent-address]"

🔍 In groups: Mention @caisper_bot or use keywords like "ghost score"

📊 Free: 3 msgs/day | Upgrade with $GHOST for unlimited access`

  await apiCall('setMyDescription', { description })
  console.log('✅ Description set successfully')
}

async function configureBotAbout() {
  console.log('📖 Setting bot about text...')

  const shortDescription = `AI agent verification bot. Check Ghost Scores & W3C credentials. 3 msgs/day free, upgrade with $GHOST.`

  await apiCall('setMyShortDescription', { short_description: shortDescription })
  console.log('✅ About text set successfully')
}

async function getBotInfo() {
  console.log('🤖 Getting bot info...')
  const info = await apiCall('getMe')
  return info
}

async function checkPrivacySettings() {
  console.log('\n⚠️  IMPORTANT: Privacy Settings')
  console.log('━'.repeat(60))
  console.log('For the bot to work properly in groups, you need to:')
  console.log('')
  console.log('1. Message @BotFather on Telegram')
  console.log('2. Send: /mybots')
  console.log('3. Select: @caisper_bot')
  console.log('4. Select: Bot Settings → Group Privacy')
  console.log('5. Set to: DISABLED')
  console.log('')
  console.log('This allows the bot to:')
  console.log('✅ Read all messages in groups (for keyword detection)')
  console.log('✅ Respond when keywords like "ghost score" are mentioned')
  console.log('✅ Provide better natural language interaction')
  console.log('')
  console.log('Without this, the bot can only see:')
  console.log('• Messages that mention the bot directly (@caisper_bot)')
  console.log('• Commands that start with /')
  console.log('━'.repeat(60))
}

async function main() {
  console.log('🚀 Configuring Telegram Bot...\n')

  try {
    // Get bot info
    const botInfo = await getBotInfo()
    console.log(`✅ Connected to bot: @${botInfo.username} (${botInfo.first_name})`)
    console.log(`   Bot ID: ${botInfo.id}\n`)

    // Configure commands
    await configureBotCommands()

    // Configure description
    await configureBotDescription()

    // Configure about text
    await configureBotAbout()

    // Check privacy settings
    checkPrivacySettings()

    console.log('\n' + '═'.repeat(60))
    console.log('🎉 Bot configuration complete!')
    console.log('═'.repeat(60))
    console.log('\n📱 Your bot is ready at: https://t.me/' + botInfo.username)
    console.log('\n📋 Next steps:')
    console.log('1. ⚠️  Set Group Privacy to DISABLED (see instructions above)')
    console.log('2. Test in DM: Send /start to @' + botInfo.username)
    console.log('3. Add to group: Invite bot to your Telegram group')
    console.log('4. Test in group: Try "@' + botInfo.username + ' hello"')
    console.log('5. Test keywords: Send "What\'s a ghost score?"')
    console.log('\n💡 Tip: Use /about in the group to see bot status')
    console.log('\n👻 Happy haunting!\n')
  } catch (error) {
    console.error('\n❌ Configuration failed:', error)
    process.exit(1)
  }
}

main()
