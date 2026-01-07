/**
 * Test X402 Query Functionality
 * 
 * Tests both the API endpoint and the action handler
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3333'

async function testX402QueryAPI() {
  console.log('🧪 Testing X402 Query API Endpoint...\n')

  // Test 1: Query with agent address
  console.log('Test 1: Query with agent address')
  try {
    const response1 = await fetch(`${API_BASE}/api/v1/x402/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentAddress: 'SAT8g2xU7AFy7eUmNJ9SNrM6yYo7LDCi13GXJ8Ez9kC',
      }),
    })

    const data1 = await response1.json()
    console.log('✅ Response:', JSON.stringify(data1, null, 2))
    console.log('   Status:', response1.status)
    console.log('   Structured:', data1.isStructured)
    console.log('   Response Time:', data1.responseTime, 'ms\n')
  } catch (error) {
    console.error('❌ Error:', error)
  }

  // Test 2: Query with direct endpoint URL
  console.log('Test 2: Query with direct endpoint URL')
  try {
    const response2 = await fetch(`${API_BASE}/api/v1/x402/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://api.syraa.fun/x-search',
        method: 'POST',
        body: { query: 'test query' },
      }),
    })

    const data2 = await response2.json()
    console.log('✅ Response:', JSON.stringify(data2, null, 2))
    console.log('   Status:', response2.status)
    console.log('   Structured:', data2.isStructured)
    console.log('   Response Time:', data2.responseTime, 'ms\n')
  } catch (error) {
    console.error('❌ Error:', error)
  }

  // Test 3: Query GET endpoint
  console.log('Test 3: Query GET endpoint')
  try {
    const response3 = await fetch(`${API_BASE}/api/v1/x402/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://wurkapi.fun/solana/xraid/small?url=https%3A%2F%2Fx.com%2Fvgpuyuh%2Fstatus%2F2006500524854751402',
        method: 'GET',
      }),
    })

    const data3 = await response3.json()
    console.log('✅ Response:', JSON.stringify(data3, null, 2))
    console.log('   Status:', response3.status)
    console.log('   Structured:', data3.isStructured)
    console.log('   Response Time:', data3.responseTime, 'ms\n')
  } catch (error) {
    console.error('❌ Error:', error)
  }

  // Test 4: Query multiple endpoints from validated agents
  console.log('Test 4: Query multiple endpoints from validated agents')
  const endpoints = [
    'https://api.syraa.fun/trending-jupiter',
    'https://agent.collabrachain.fun/api/health',
    'https://x402factory.ai/solana/coinprice',
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`\n   Testing: ${endpoint}`)
      const response = await fetch(`${API_BASE}/api/v1/x402/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          method: 'GET',
        }),
      })

      const data = await response.json()
      console.log(`   ✅ Status: ${response.status}, Structured: ${data.isStructured}, Time: ${data.responseTime}ms`)
      
      if (data.data && typeof data.data === 'object') {
        console.log(`   📊 Response keys: ${Object.keys(data.data).join(', ')}`)
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}`)
    }
  }
}

async function testChatAction() {
  console.log('\n\n🧪 Testing Chat Action Integration...\n')

  // Test via chat API
  const testMessages = [
    'Query the x402 agent endpoint for agent SAT8g2xU7AFy7eUmNJ9SNrM6yYo7LDCi13GXJ8Ez9kC',
    'Test the x402 endpoint at https://api.syraa.fun/trending-jupiter',
    'Query agent 53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t',
  ]

  for (const message of testMessages) {
    try {
      console.log(`\n   Testing message: "${message}"`)
      const response = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          walletAddress: 'TestWallet123456789012345678901234567890',
          sessionToken: 'session_test_123',
        }),
      })

      const data = await response.json()
      console.log(`   ✅ Response received`)
      console.log(`   Action: ${data.actionTriggered || 'none'}`)
      console.log(`   Has metadata: ${!!data.metadata}`)
      
      if (data.metadata?.type === 'x402-query-result') {
        console.log(`   📊 Query Result Metadata:`)
        console.log(`      - Endpoint: ${data.metadata.endpoint}`)
        console.log(`      - Status: ${data.metadata.status}`)
        console.log(`      - Structured: ${data.metadata.isStructured}`)
        console.log(`      - Response Time: ${data.metadata.responseTime}ms`)
      }
      
      // Show first 200 chars of response
      const responseText = data.response || data.content || ''
      console.log(`   Response preview: ${responseText.substring(0, 200)}...`)
    } catch (error) {
      console.error(`   ❌ Error: ${error}`)
    }
  }
}

async function main() {
  console.log('🚀 Starting X402 Query Tests\n')
  console.log(`API Base: ${API_BASE}\n`)

  try {
    await testX402QueryAPI()
    await testChatAction()
    
    console.log('\n\n✅ All tests completed!')
  } catch (error) {
    console.error('\n\n❌ Test suite failed:', error)
    process.exit(1)
  }
}

main()
