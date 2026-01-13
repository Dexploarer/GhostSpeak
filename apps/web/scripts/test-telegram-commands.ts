#!/usr/bin/env bun

/**
 * Test Telegram /raid and /media commands
 *
 * Simulates the command flow without actually sending to Telegram
 */

import { processAgentMessage } from '../server/elizaos/runtime'

console.log('🧪 Testing Telegram Commands\n')
console.log('═'.repeat(80))
console.log('\n')

// Test wallet address
const testUserId = 'FmK3v7JgujgrzaMYTJaKgkDRpZUMReMUSwV7E1CLvDRf'

// ============================================================================
// Test 1: /raid command
// ============================================================================
console.log('📊 TEST 1: /raid Command')
console.log('─'.repeat(80))

const raidPrompt = `Generate an engaging X (Twitter) raid status to promote GhostSpeak.
Include:
- A catchy hook about AI agent trust and verification
- Mention Ghost Score system
- Call to action to check out GhostSpeak
- Use relevant emojis
- Keep it under 280 characters
- Make it shareable and exciting`

console.log('Prompt:', raidPrompt.substring(0, 100) + '...\n')

try {
  const raidStartTime = Date.now()
  const raidResponse = await processAgentMessage({
    userId: testUserId,
    message: raidPrompt,
    roomId: `telegram-raid-test`,
    correlationId: `test-raid-${Date.now()}`,
  })
  const raidDuration = Date.now() - raidStartTime

  console.log('✅ /raid Command Result:')
  console.log('─'.repeat(80))
  console.log(`Response Text (${raidResponse.text.length} chars):`)
  console.log(raidResponse.text)
  console.log('\n')
  console.log('Metadata:', JSON.stringify(raidResponse.metadata, null, 2))
  console.log(`Duration: ${raidDuration}ms`)
  console.log('─'.repeat(80))
  console.log('\n')

  // Validate response
  if (raidResponse.text.length > 0 && raidResponse.text.length <= 280) {
    console.log('✅ PASS: Response generated within 280 character limit')
  } else if (raidResponse.text.length > 280) {
    console.warn(`⚠️  WARNING: Response exceeds 280 chars (${raidResponse.text.length} chars)`)
  } else {
    console.error('❌ FAIL: Empty response')
  }
} catch (error) {
  console.error('❌ /raid command failed:', error)
}

console.log('\n')
console.log('═'.repeat(80))
console.log('\n')

// ============================================================================
// Test 2: /media command
// ============================================================================
console.log('📊 TEST 2: /media Command')
console.log('─'.repeat(80))

const mediaDescription = 'A friendly ghost floating in a digital void, ethereal and glowing with GhostSpeak branding'
const mediaPrompt = `Generate an image with this description: ${mediaDescription}

Use the image generation capability to create GhostSpeak themed media.`

console.log('Description:', mediaDescription)
console.log('Prompt:', mediaPrompt.substring(0, 100) + '...\n')

try {
  const mediaStartTime = Date.now()
  const mediaResponse = await processAgentMessage({
    userId: testUserId,
    message: mediaPrompt,
    roomId: `telegram-media-test`,
    correlationId: `test-media-${Date.now()}`,
  })
  const mediaDuration = Date.now() - mediaStartTime

  console.log('✅ /media Command Result:')
  console.log('─'.repeat(80))
  console.log(`Response Text (${mediaResponse.text.length} chars):`)
  console.log(mediaResponse.text)
  console.log('\n')
  console.log('Metadata:', JSON.stringify(mediaResponse.metadata, null, 2))
  console.log(`Duration: ${mediaDuration}ms`)
  console.log('─'.repeat(80))
  console.log('\n')

  // Check for image URL in response
  const imageUrlMatch = mediaResponse.text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i)

  if (imageUrlMatch) {
    const imageUrl = imageUrlMatch[0]
    console.log('✅ PASS: Image URL found in response')
    console.log('📸 Image URL:', imageUrl)
  } else {
    console.warn('⚠️  WARNING: No image URL found in response')
    console.log('ℹ️  This is expected if AI Gateway image generation is not configured')
    console.log('ℹ️  The agent should provide a conversational response instead')
  }
} catch (error) {
  console.error('❌ /media command failed:', error)
}

console.log('\n')
console.log('═'.repeat(80))
console.log('\n')

// ============================================================================
// Summary
// ============================================================================
console.log('📋 Test Summary')
console.log('─'.repeat(80))
console.log('Both commands use processAgentMessage() which:')
console.log('  1. Evaluates all registered ElizaOS actions')
console.log('  2. If no action matches, generates conversational LLM response')
console.log('  3. Returns { text, action?, metadata? }')
console.log('\n')
console.log('Expected Behavior:')
console.log('  /raid  → Generates promotional X/Twitter text (<280 chars)')
console.log('  /media → Generates image URL (if AI Gateway configured) or conversational response')
console.log('\n')
console.log('Configuration Check:')
console.log('  AI_GATEWAY_API_KEY:', process.env.AI_GATEWAY_API_KEY ? '✅ SET' : '❌ NOT SET')
console.log('  NEXT_PUBLIC_CONVEX_URL:', process.env.NEXT_PUBLIC_CONVEX_URL ? '✅ SET' : '❌ NOT SET')
console.log('─'.repeat(80))
console.log('\n')
console.log('✅ Test script complete!')
