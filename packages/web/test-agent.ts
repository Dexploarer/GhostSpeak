/**
 * Test script for Caisper agent
 * Tests all core actions
 */

const AGENT_URL = 'http://localhost:3000/api/agent/chat'
const TEST_WALLET = '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'
const SESSION_TOKEN = 'session_test_1234567890'

async function testAgent(message: string) {
  console.log(`\n📨 Testing: "${message}"`)
  console.log('─'.repeat(80))

  try {
    const response = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        walletAddress: TEST_WALLET,
        sessionToken: SESSION_TOKEN,
      }),
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Response:', data.response)
      if (data.actionTriggered) {
        console.log('🎯 Action triggered:', data.actionTriggered)
      }
    } else {
      console.log('❌ Error:', data.error)
    }
  } catch (error) {
    console.log('❌ Request failed:', error)
  }
}

async function runTests() {
  console.log('🚀 Starting Caisper Agent Tests\n')

  // Test 1: Discover agents
  await testAgent('What ghosts are available to claim?')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: Claim without address (should ask for address)
  await testAgent('I want to claim an agent')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 3: Claim with matching wallet (should succeed)
  await testAgent(`I want to claim agent ${TEST_WALLET}`)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 4: Try to claim already claimed agent
  await testAgent(`Claim agent ${TEST_WALLET}`)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 5: Claim with wrong wallet (should fail validation)
  await testAgent('I want to claim agent 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 6: Discover agents again (claimed one should be gone)
  await testAgent('Show me available agents')
  await new Promise(resolve => setTimeout(resolve, 1000))

  console.log('\n✨ Tests completed!')
}

runTests()
