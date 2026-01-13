/**
 * Comprehensive test for all Boo image templates
 */

import { processAgentMessage } from './server/elizaos/runtime'

const templates = [
  { id: 'raid', prompt: 'Join the Ghost Army - trust verified agents only!' },
  { id: 'meme', prompt: 'When your Ghost Score hits 9000' },
  { id: 'quote', prompt: 'Trust is earned through verification, not promises' },
  { id: 'announcement', prompt: 'New Ghost Score tiers launched today!' },
  { id: 'infographic', prompt: 'How Ghost Score is calculated from your transactions' },
]

async function testAllTemplates() {
  console.log('🧪 Testing all Boo image templates...\n')

  for (const template of templates) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📝 Template: ${template.id}`)
    console.log(`💬 Prompt: "${template.prompt}"`)
    console.log('='.repeat(80) + '\n')

    try {
      const startTime = Date.now()

      const response = await processAgentMessage({
        userId: `telegram_test_${Date.now()}`,
        message: `Generate a ${template.id} image: ${template.prompt}`,
        roomId: `test-${template.id}`,
        characterId: 'boo',
        source: 'telegram',
        correlationId: `test-${template.id}-${Date.now()}`,
      })

      const duration = Date.now() - startTime

      console.log('✅ Response received:')
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`)
      console.log(`📄 Text: ${response.text.substring(0, 150)}...`)
      console.log(`🎬 Action: ${response.action || 'NONE'}`)

      if (response.metadata?.imageUrl) {
        console.log(`✅ Image URL: ${response.metadata.imageUrl}`)
        console.log(`📊 Template: ${response.metadata.template}`)
        console.log(`📐 Aspect Ratio: ${response.metadata.aspectRatio}`)
        console.log(`📏 Resolution: ${response.metadata.size}`)
        console.log(`⏳ Generation Time: ${(response.metadata.generationTime / 1000).toFixed(1)}s`)
      } else {
        console.log('⚠️  No image URL in metadata')
        console.log('Metadata:', JSON.stringify(response.metadata, null, 2))
      }
    } catch (error) {
      console.error(`❌ Error testing ${template.id}:`, error)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ All template tests complete!')
  console.log('='.repeat(80))
}

testAllTemplates().catch(console.error)
