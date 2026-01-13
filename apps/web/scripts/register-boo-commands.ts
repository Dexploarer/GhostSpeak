/**
 * Register Boo Bot Commands with Telegram
 *
 * This script registers all available bot commands with Telegram's BotFather
 * so they appear in the command autocomplete menu for users.
 *
 * Usage:
 * cd apps/web && bun scripts/register-boo-commands.ts
 *
 * Note: Bun automatically loads .env.local when run from apps/web directory
 */

const BOT_TOKEN = process.env.TELEGRAM_BOO_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOO_BOT_TOKEN not set in environment')
  process.exit(1)
}

// Define all Boo bot commands (media & marketing focused)
const commands = [
  { command: 'start', description: 'Welcome message and bot introduction' },
  { command: 'help', description: 'Show help guide and available commands' },
  { command: 'quota', description: 'Check your daily message quota' },
  // Image generation commands
  { command: 'media', description: 'Generate custom AI images with GhostSpeak branding' },
  { command: 'raid', description: 'Generate X/Twitter raid graphics' },
  { command: 'meme', description: 'Generate meme templates' },
  { command: 'templates', description: 'List all available image templates' },
  // Text generation commands (NEW)
  { command: 'thread', description: 'Generate X/Twitter threads (raid, announcement, etc.)' },
  { command: 'post', description: 'Generate standalone post variations' },
  { command: 'raidpackage', description: 'Generate complete raid package with strategy' },
  // Info & settings
  { command: 'about', description: 'About Boo bot' },
  { command: 'mute', description: 'Mute bot auto-responses in groups (admins only)' },
  { command: 'unmute', description: 'Unmute bot auto-responses in groups (admins only)' },
]

console.log('🤖 Registering Boo Bot Commands with Telegram\n')
console.log('━'.repeat(80))

// Register commands for all scopes
const scopes = [
  { type: 'default' },
  { type: 'all_private_chats' },
  { type: 'all_group_chats' },
  { type: 'all_chat_administrators' },
]

async function registerCommands() {
  let successCount = 0
  let failCount = 0

  for (const scope of scopes) {
    console.log(`\n📝 Registering for scope: ${scope.type}`)

    try {
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

      const data: any = await response.json()

      if (data.ok) {
        console.log(`✅ Successfully registered ${commands.length} commands for ${scope.type}`)
        successCount++
      } else {
        console.error(`❌ Failed for ${scope.type}:`, data.description)
        failCount++
      }
    } catch (error) {
      console.error(`❌ Error for ${scope.type}:`, error)
      failCount++
    }
  }

  console.log('\n' + '━'.repeat(80))
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Success: ${successCount}/${scopes.length}`)
  console.log(`   ❌ Failed: ${failCount}/${scopes.length}`)

  if (successCount === scopes.length) {
    console.log('\n🎉 All commands registered successfully!')
    console.log('\n📋 Registered commands:')
    commands.forEach((cmd: any) => {
      console.log(`   • /${cmd.command} - ${cmd.description}`)
    })
  } else {
    console.log('\n⚠️  Some commands failed to register')
    process.exit(1)
  }
}

registerCommands()
