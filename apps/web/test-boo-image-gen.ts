/**
 * Test Boo image generation locally
 */

import { processAgentMessage } from './server/elizaos/runtime'

async function testBooImageGeneration() {
  console.log('🧪 Testing Boo image generation...\n')

  const testCases = [
    {
      name: 'Raid graphic',
      message: 'Generate a raid image: Join the Ghost Army - trust the verified agents!',
    },
    {
      name: 'Meme',
      message: 'Generate a meme image: When you finally understand Ghost Scores',
    },
  ]

  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`)
    console.log(`Message: "${test.message}"\n`)

    try {
      const response = await processAgentMessage({
        userId: 'telegram_test_12345',
        message: test.message,
        roomId: 'test-room',
        characterId: 'boo',
        source: 'telegram',
        correlationId: `test-${Date.now()}`,
      })

      console.log('✅ Response received:')
      console.log(`Text: ${response.text.substring(0, 200)}${response.text.length > 200 ? '...' : ''}`)
      console.log(`Action: ${response.action || 'NONE'}`)

      if (response.metadata?.imageUrl) {
        console.log(`🎨 Image URL: ${response.metadata.imageUrl}`)
      } else {
        console.log('⚠️  No image URL in metadata')
        console.log('Metadata:', JSON.stringify(response.metadata, null, 2))
      }
    } catch (error) {
      console.error(`❌ Error:`, error)
    }

    console.log('\n' + '='.repeat(80))
  }
}

testBooImageGeneration().catch(console.error)
