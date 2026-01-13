#!/usr/bin/env bun
/**
 * Register Bot Commands with Telegram BotFather
 *
 * This script registers all available commands so they appear in the
 * Telegram command autocomplete menu
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in environment')
  process.exit(1)
}

// Define all bot commands (Caisper - verification & credentials only)
const commands = [
  { command: 'start', description: 'Welcome message and bot introduction' },
  { command: 'help', description: 'Show help guide and available commands' },
  { command: 'quota', description: 'Check your daily message quota' },
  { command: 'about', description: 'About Caisper bot' },
  { command: 'mute', description: 'Mute bot auto-responses in groups (admins only)' },
  { command: 'unmute', description: 'Unmute bot auto-responses in groups (admins only)' },
]

console.log('🤖 Registering Bot Commands with Telegram\n')
console.log('━'.repeat(80))

// Check current commands
console.log('📋 Checking current commands...\n')
const getCurrentCommands = await fetch(
  `https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands`
)

const currentData = await getCurrentCommands.json()

if (currentData.ok) {
  console.log('Current registered commands:')
  if (currentData.result.length === 0) {
    console.log('  (none)')
  } else {
    currentData.result.forEach((cmd: { command: string; description: string }) => {
      console.log(`  /${cmd.command} - ${cmd.description}`)
    })
  }
} else {
  console.error('❌ Error getting current commands:', currentData.description)
}

console.log('\n' + '━'.repeat(80))
console.log('📝 New commands to register:\n')

commands.forEach(cmd => {
  console.log(`  /${cmd.command} - ${cmd.description}`)
})

console.log('\n' + '━'.repeat(80))
console.log('🚀 Registering commands...\n')

// Register commands for all chat types (private chats, groups, channels)
const scopes = [
  { type: 'default' }, // All private chats
  { type: 'all_private_chats' }, // All private chats
  { type: 'all_group_chats' }, // All group chats
  { type: 'all_chat_administrators' }, // All group/channel admins
]

let allSuccess = true

for (const scope of scopes) {
  console.log(`Setting commands for: ${scope.type}`)

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands,
        scope,
      }),
    }
  )

  const data = await response.json()

  if (data.ok) {
    console.log(`  ✅ ${scope.type}`)
  } else {
    console.error(`  ❌ ${scope.type}: ${data.description}`)
    allSuccess = false
  }
}

console.log('')

if (allSuccess) {
  console.log('✅ Commands registered successfully for all chat types!\n')
  console.log('━'.repeat(80))
  console.log('📱 Users will now see these commands in Telegram autocomplete:')
  console.log('')
  commands.forEach(cmd => {
    console.log(`  /${cmd.command}`)
  })
  console.log('')
  console.log('━'.repeat(80))
  console.log('\n🎉 Setup complete! Commands are now visible in:')
  console.log('  • Private chats (DMs)')
  console.log('  • Group chats')
  console.log('  • Channels (for admins)')
  console.log('\nTry typing "/" in any chat with the bot to see them!')
} else {
  console.error('⚠️  Some command registrations failed')
}

// Verify registration
console.log('\n' + '━'.repeat(80))
console.log('🔍 Verifying registration...\n')

const verifyResponse = await fetch(
  `https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands`
)

const verifyData = await verifyResponse.json()

if (verifyData.ok) {
  console.log('✅ Verification successful!')
  console.log(`   ${verifyData.result.length} commands registered\n`)
} else {
  console.error('⚠️  Could not verify:', verifyData.description)
}

console.log('━'.repeat(80))
