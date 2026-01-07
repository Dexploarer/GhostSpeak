/**
 * Full flow test: Discovery → Claim
 */

const AGENT_URL = 'http://localhost:3000/api/agent/chat'
const TEST_WALLET = '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'
const SESSION_TOKEN = 'session_test_1234567890'

async function testAgent(message: string, walletAddress = TEST_WALLET) {
  console.log(`\n📨 "${message}"`)
  console.log('─'.repeat(80))

  try {
    const response = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        walletAddress,
        sessionToken: SESSION_TOKEN,
      }),
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Response:', data.response.substring(0, 200))
      if (data.actionTriggered) {
        console.log('🎯 Action:', data.actionTriggered)
      }
      if (data.metadata?.agents) {
        console.log('📋 Found', data.metadata.agents.length, 'agents')
        return data.metadata.agents
      }
    } else {
      console.log('❌ Error:', data.error)
    }
  } catch (error) {
    console.log('❌ Failed:', error)
  }
  return null
}

async function runFullFlowTest() {
  console.log('🚀 Testing Full Discovery → Claim Flow\n')

  // Step 1: Discover agents
  console.log('=== STEP 1: DISCOVER AGENTS ===')
  const agents = await testAgent('What agents are available?')
  await new Promise(resolve => setTimeout(resolve, 1000))

  if (!agents || agents.length === 0) {
    console.log('\n⚠️  No discovered agents found - test cannot continue')
    return
  }

  // Step 2: Try to claim first discovered agent
  console.log('\n=== STEP 2: CLAIM DISCOVERED AGENT ===')
  const firstAgent = agents[0]
  console.log(`\nAttempting to claim: ${firstAgent.ghostAddress}`)

  // This should succeed if wallet matches
  await testAgent(`I want to claim agent ${firstAgent.ghostAddress}`, firstAgent.ghostAddress)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Step 3: Try to claim same agent again (should fail - already claimed)
  console.log('\n=== STEP 3: TRY TO CLAIM AGAIN (should fail) ===')
  await testAgent(`Claim agent ${firstAgent.ghostAddress}`, firstAgent.ghostAddress)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Step 4: Try to claim with wrong wallet (should fail)
  console.log('\n=== STEP 4: CLAIM WITH WRONG WALLET (should fail) ===')
  await testAgent(`I want to claim agent ${firstAgent.ghostAddress}`, TEST_WALLET)

  console.log('\n✨ Full flow test completed!')
}

runFullFlowTest()
