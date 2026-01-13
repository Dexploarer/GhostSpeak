#!/usr/bin/env bun

/**
 * Check Telegram Bot Configuration
 *
 * Verifies all required environment variables and configuration for Telegram bot
 */

console.log('🔍 Checking Telegram Bot Configuration...\n')

// Check required environment variables
const requiredVars = {
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
  'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
  'TELEGRAM_WEBHOOK_SECRET': process.env.TELEGRAM_WEBHOOK_SECRET,
  'NEXT_PUBLIC_GHOST_TOKEN_MINT': process.env.NEXT_PUBLIC_GHOST_TOKEN_MINT,
  'NEXT_PUBLIC_GHOST_TOKEN_DECIMALS': process.env.NEXT_PUBLIC_GHOST_TOKEN_DECIMALS,
}

let hasErrors = false

console.log('📋 Environment Variables:')
console.log('━'.repeat(80))

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`❌ ${key}: NOT SET`)
    hasErrors = true
  } else {
    // Mask sensitive values
    const displayValue = key.includes('TOKEN') || key.includes('SECRET')
      ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
      : value
    console.log(`✅ ${key}: ${displayValue}`)
  }
}

console.log('━'.repeat(80))
console.log()

// Check domain configuration
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl) {
  console.log('🌐 Domain Configuration:')
  console.log('━'.repeat(80))

  if (appUrl === 'https://www.ghostspeak.io') {
    console.log('✅ Production domain correctly configured')
  } else if (appUrl.includes('localhost')) {
    console.log('⚠️  Development mode (localhost)')
  } else {
    console.log(`⚠️  Non-standard domain: ${appUrl}`)
    console.log('   Expected: https://www.ghostspeak.io for production')
  }

  console.log('━'.repeat(80))
  console.log()
}

// Check $GHOST token configuration
const ghostMint = process.env.NEXT_PUBLIC_GHOST_TOKEN_MINT
const ghostDecimals = process.env.NEXT_PUBLIC_GHOST_TOKEN_DECIMALS

console.log('🪙 $GHOST Token Configuration:')
console.log('━'.repeat(80))

if (ghostMint === 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRRYJkehvpump') {
  console.log('✅ Mainnet $GHOST token mint configured')
} else if (ghostMint) {
  console.log(`⚠️  Non-standard mint: ${ghostMint}`)
  console.log('   Expected: DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump (mainnet)')
} else {
  console.log('❌ $GHOST token mint not set')
  hasErrors = true
}

if (ghostDecimals === '9') {
  console.log('✅ Token decimals: 9 (correct)')
} else {
  console.log(`⚠️  Token decimals: ${ghostDecimals} (expected: 9)`)
}

console.log('━'.repeat(80))
console.log()

// Check webhook URL
const botToken = process.env.TELEGRAM_BOT_TOKEN
if (botToken && appUrl) {
  console.log('🔗 Webhook Information:')
  console.log('━'.repeat(80))
  console.log(`Webhook URL: ${appUrl}/api/telegram/webhook`)
  console.log()
  console.log('To set webhook, run:')
  console.log(`curl -X POST "https://api.telegram.org/bot${botToken}/setWebhook" \\`)
  console.log(`  -H "Content-Type: application/json" \\`)
  console.log(`  -d '{`)
  console.log(`    "url": "${appUrl}/api/telegram/webhook",`)
  console.log(`    "secret_token": "${process.env.TELEGRAM_WEBHOOK_SECRET}"`)
  console.log(`  }'`)
  console.log()
  console.log('To check webhook status:')
  console.log(`curl "https://api.telegram.org/bot${botToken}/getWebhookInfo"`)
  console.log('━'.repeat(80))
  console.log()
}

// Summary
console.log('📊 Configuration Summary:')
console.log('━'.repeat(80))

if (hasErrors) {
  console.log('❌ Configuration has ERRORS - please fix missing variables')
  process.exit(1)
} else {
  console.log('✅ All required environment variables are set')

  if (appUrl === 'https://www.ghostspeak.io' && ghostMint === 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRRYJkehvpump') {
    console.log('🎉 Production configuration looks good!')
  } else if (appUrl?.includes('localhost')) {
    console.log('⚠️  Development configuration - remember to update for production')
  } else {
    console.log('⚠️  Some values differ from expected production values')
  }
}

console.log('━'.repeat(80))
