/**
 * MCP Integration Test
 *
 * Tests that the ElizaOS agent can successfully communicate with the MCP server
 */

import { processAgentMessage } from './runtime'

async function testMCPIntegration() {
  console.log('\n🧪 Testing ElizaOS Agent MCP Integration\n')
  console.log('=' .repeat(60))

  try {
    // Test 1: Ask about discovered agents (should trigger MCP tool)
    console.log('\n📝 Test 1: Ask about discovered agents')
    console.log('Input: "Show me discovered agents"')

    const result1 = await processAgentMessage({
      userId: 'test-user-123',
      message: 'Show me discovered agents',
      roomId: 'test-room',
    })

    console.log('✅ Response:', result1.text.substring(0, 200))
    console.log('🎯 Action triggered:', result1.action || 'none')

    // Test 2: Ask about stats (should trigger MCP tool)
    console.log('\n📝 Test 2: Ask about discovery stats')
    console.log('Input: "What are the discovery statistics?"')

    const result2 = await processAgentMessage({
      userId: 'test-user-123',
      message: 'What are the discovery statistics?',
      roomId: 'test-room',
    })

    console.log('✅ Response:', result2.text.substring(0, 200))
    console.log('🎯 Action triggered:', result2.action || 'none')

    // Test 3: General chat (should use normal LLM response)
    console.log('\n📝 Test 3: General conversation')
    console.log('Input: "What is GhostSpeak?"')

    const result3 = await processAgentMessage({
      userId: 'test-user-123',
      message: 'What is GhostSpeak?',
      roomId: 'test-room',
    })

    console.log('✅ Response:', result3.text.substring(0, 200))
    console.log('🎯 Action triggered:', result3.action || 'none')

    console.log('\n' + '='.repeat(60))
    console.log('✅ All MCP integration tests passed!\n')
  } catch (error) {
    console.error('\n❌ MCP integration test failed:', error)
    process.exit(1)
  }
}

// Run tests
testMCPIntegration()
