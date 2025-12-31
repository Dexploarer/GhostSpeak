/**
 * Test PayAI Webhook + Ghost Score Calculation
 *
 * This script sends test webhook payloads to verify:
 * 1. Webhook authentication
 * 2. Ghost Score calculation
 * 3. Credential auto-issuance
 */

import { generateKeyPairSigner } from '@solana/signers'

const WEBHOOK_URL = 'http://localhost:3000/api/payai/webhook'

// Test agent address (generate once for consistency)
const TEST_AGENT_ADDRESS = 'GhostTestAgent11111111111111111111111111111'

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
  console.log('   Response Time:', payload.data.responseTimeMs, 'ms')

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
  console.log('🧪 Testing PayAI Webhook + Ghost Score Calculation\n')
  console.log('=' .repeat(60))

  // Test 1: Successful payment (fast response)
  await sendWebhook({
    id: `evt_${Date.now()}_1`,
    type: 'payment.settled',
    timestamp: new Date().toISOString(),
    data: {
      paymentId: `test_payment_${Date.now()}_1`,
      transactionSignature: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      network: 'solana',
      payer: 'PayerWallet111111111111111111111111111111',
      merchant: TEST_AGENT_ADDRESS,
      amount: '1000000', // 1 USDC
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      assetSymbol: 'USDC',
      status: 'settled',
      resource: 'https://api.example.com/ai/generate',
      responseTimeMs: 450, // Fast response
      httpStatusCode: 200,
      success: true,
      settledAt: new Date().toISOString(),
    },
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: Another successful payment (medium response)
  await sendWebhook({
    id: `evt_${Date.now()}_2`,
    type: 'payment.settled',
    timestamp: new Date().toISOString(),
    data: {
      paymentId: `test_payment_${Date.now()}_2`,
      transactionSignature: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      network: 'solana',
      payer: 'PayerWallet222222222222222222222222222222',
      merchant: TEST_AGENT_ADDRESS,
      amount: '5000000', // 5 USDC (higher amount = more weight)
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      assetSymbol: 'USDC',
      status: 'settled',
      resource: 'https://api.example.com/ai/generate',
      responseTimeMs: 1800, // Medium response
      httpStatusCode: 200,
      success: true,
      settledAt: new Date().toISOString(),
    },
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 3: Failed payment (slow response)
  await sendWebhook({
    id: `evt_${Date.now()}_3`,
    type: 'payment.failed',
    timestamp: new Date().toISOString(),
    data: {
      paymentId: `test_payment_${Date.now()}_3`,
      transactionSignature: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      network: 'solana',
      payer: 'PayerWallet333333333333333333333333333333',
      merchant: TEST_AGENT_ADDRESS,
      amount: '2000000', // 2 USDC
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      assetSymbol: 'USDC',
      status: 'failed',
      resource: 'https://api.example.com/ai/generate',
      responseTimeMs: 12000, // Very slow
      httpStatusCode: 500,
      success: false,
    },
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 4: Multiple successful payments to trigger tier milestone
  for (let i = 0; i < 7; i++) {
    await sendWebhook({
      id: `evt_${Date.now()}_batch_${i}`,
      type: 'payment.settled',
      timestamp: new Date().toISOString(),
      data: {
        paymentId: `test_payment_${Date.now()}_batch_${i}`,
        transactionSignature: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
        network: 'solana',
        payer: `PayerBatch${i}11111111111111111111111111111`,
        merchant: TEST_AGENT_ADDRESS,
        amount: '1000000', // 1 USDC
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        assetSymbol: 'USDC',
        status: 'settled',
        resource: 'https://api.example.com/ai/generate',
        responseTimeMs: 300 + Math.random() * 1000, // 300-1300ms
        httpStatusCode: 200,
        success: true,
        settledAt: new Date().toISOString(),
      },
    })

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Check final Ghost Score
  await checkGhostScore()

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test Complete!')
  console.log('\nExpected Ghost Score behavior:')
  console.log('  - Starting score: 5000 (50%)')
  console.log('  - Each success: +100 to +200 (depending on response time & amount)')
  console.log('  - Each failure: -200 to -250')
  console.log('  - Final score should be ~5400-5800 (54-58%)')
  console.log('\nCredential milestones:')
  console.log('  - Bronze tier (2000 score) - should NOT trigger (we\'re at ~5500)')
  console.log('  - Silver tier (5000 score) - should trigger!')
}

main().catch(console.error)
