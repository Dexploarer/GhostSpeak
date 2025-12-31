/**
 * Test Credential Auto-Issuance
 *
 * Sends a single high-value payment to trigger Silver tier (5000 score) credential
 */

const WEBHOOK_URL = 'http://localhost:3000/api/payai/webhook'
// Valid Solana address for testing (32-byte base58 encoded)
const TEST_AGENT_ADDRESS = '11111111111111111111111111111111'

interface PayAIWebhookPayload {
  id: string
  type: 'payment.verified' | 'payment.settled' | 'payment.failed' | 'payment.refunded'
  timestamp: string
  data: {
    paymentId: string
    transactionSignature: string
    network: string
    payer: string
    merchant: string
    amount: string
    asset: string
    assetSymbol: string
    status: string
    resource: string
    responseTimeMs: number
    httpStatusCode: number
    success: boolean
    settledAt?: string
    verifiedAt?: string
  }
}

async function sendWebhook(payload: PayAIWebhookPayload): Promise<any> {
  console.log('\n📤 Sending webhook:', payload.type)
  console.log('   Agent:', payload.data.merchant)
  console.log('   Amount:', payload.data.amount, 'lamports')
  console.log('   Success:', payload.data.success)

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  console.log('✅ Response:', response.status)
  console.log('   Result:', JSON.stringify(result, null, 2))

  return result
}

async function checkGhostScore(): Promise<void> {
  console.log('\n🔍 Checking Ghost Score endpoint...')

  const response = await fetch(WEBHOOK_URL, {
    method: 'GET',
  })

  const stats = await response.json()
  console.log('📊 Current Stats:', JSON.stringify(stats, null, 2))
}

async function main() {
  console.log('🧪 Testing Credential Auto-Issuance\n')
  console.log('=' .repeat(60))

  // Send a single high-value payment to cross Silver tier threshold (5000)
  console.log('\n📝 Sending high-value payment to trigger Silver tier...')

  await sendWebhook({
    id: `evt_${Date.now()}_cred_test`,
    type: 'payment.settled',
    timestamp: new Date().toISOString(),
    data: {
      paymentId: `cred_test_payment_${Date.now()}`,
      transactionSignature: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      network: 'solana',
      payer: 'TestPayer11111111111111111111111111111111',
      merchant: TEST_AGENT_ADDRESS,
      amount: '1000000', // 1 USDC (should give ~+150 score, pushing 5000 -> 5150)
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      assetSymbol: 'USDC',
      status: 'settled',
      resource: 'https://api.example.com/ai/generate',
      responseTimeMs: 350, // Fast response for bonus
      httpStatusCode: 200,
      success: true,
      settledAt: new Date().toISOString(),
    },
  })

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Check final stats
  await checkGhostScore()

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test Complete!')
  console.log('\nExpected behavior:')
  console.log('  - Agent should cross 5000 (Silver tier) threshold')
  console.log('  - Both Bronze (2000) and Silver (5000) credentials should be issued')
  console.log('  - Check server logs for credential issuance confirmation')
}

main().catch(console.error)
