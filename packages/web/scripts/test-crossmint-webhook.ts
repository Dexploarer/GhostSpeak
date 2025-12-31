#!/usr/bin/env bun

/**
 * Test Crossmint Webhook Handler
 *
 * This script simulates Crossmint webhook calls to test signature verification
 * and payment processing logic.
 *
 * Usage:
 *   bun scripts/test-crossmint-webhook.ts
 */

import crypto from 'crypto'

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/crossmint/webhook'
const WEBHOOK_SECRET = process.env.CROSSMINT_WEBHOOK_SECRET || 'whsec_test_secret_123'

// Test payload for successful payment
const testPayload = {
  type: 'orders.payment.succeeded',
  orderId: 'test_order_' + Date.now(),
  metadata: {
    agentAddress: 'TestAgent123456789',
    userWallet: 'TestUser123456789',
    verificationType: 'ghost_score',
  },
  payment: {
    status: 'completed',
    transactionHash: '0xtest_tx_' + Date.now(),
    amount: '1.00',
    currency: 'usdc',
  },
}

/**
 * Generate Svix signature for webhook
 */
function generateSvixSignature(payload: object, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const msgId = 'msg_' + crypto.randomBytes(12).toString('hex')

  // Create the signed content (Svix format)
  const payloadString = JSON.stringify(payload)
  const toSign = `${msgId}.${timestamp}.${payloadString}`

  // Generate HMAC signature
  const signature = crypto.createHmac('sha256', secret).update(toSign).digest('base64')

  return {
    headers: {
      'svix-id': msgId,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`,
      'content-type': 'application/json',
    },
    body: payloadString,
  }
}

/**
 * Test webhook endpoint
 */
async function testWebhook() {
  console.log('🧪 Testing Crossmint Webhook Handler\n')
  console.log('Webhook URL:', WEBHOOK_URL)
  console.log('Payload:', JSON.stringify(testPayload, null, 2))
  console.log('\n')

  // Generate signature
  const { headers, body } = generateSvixSignature(testPayload, WEBHOOK_SECRET)

  console.log('Headers:', headers)
  console.log('\n')

  try {
    console.log('📤 Sending webhook request...')
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body,
    })

    const responseBody = await response.text()

    console.log('\n📥 Response:')
    console.log('Status:', response.status, response.statusText)
    console.log('Body:', responseBody)

    if (response.ok) {
      console.log('\n✅ Webhook test PASSED')
    } else {
      console.log('\n❌ Webhook test FAILED')
      console.log('Expected: 200 OK')
      console.log('Got:', response.status)
    }
  } catch (error) {
    console.error('\n❌ Error sending webhook:')
    console.error(error)
  }
}

/**
 * Test signature verification failure
 */
async function testInvalidSignature() {
  console.log('\n\n🧪 Testing Invalid Signature Rejection\n')

  const { headers, body } = generateSvixSignature(testPayload, WEBHOOK_SECRET)

  // Corrupt the signature
  headers['svix-signature'] = 'v1,invalid_signature_12345'

  try {
    console.log('📤 Sending webhook with invalid signature...')
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body,
    })

    const responseBody = await response.text()

    console.log('\n📥 Response:')
    console.log('Status:', response.status, response.statusText)
    console.log('Body:', responseBody)

    if (response.status === 401) {
      console.log('\n✅ Invalid signature rejection test PASSED')
    } else {
      console.log('\n❌ Invalid signature rejection test FAILED')
      console.log('Expected: 401 Unauthorized')
      console.log('Got:', response.status)
    }
  } catch (error) {
    console.error('\n❌ Error sending webhook:')
    console.error(error)
  }
}

/**
 * Test idempotency (duplicate webhook)
 */
async function testIdempotency() {
  console.log('\n\n🧪 Testing Idempotency (Duplicate Webhook)\n')

  const { headers, body } = generateSvixSignature(testPayload, WEBHOOK_SECRET)

  try {
    // First request
    console.log('📤 Sending first webhook...')
    const response1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body,
    })
    console.log('Response 1:', response1.status)

    // Second request (duplicate)
    console.log('📤 Sending duplicate webhook (same svix-id)...')
    const response2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body,
    })

    const responseBody2 = await response2.text()
    console.log('\n📥 Response 2:')
    console.log('Status:', response2.status)
    console.log('Body:', responseBody2)

    if (responseBody2.includes('Already processed')) {
      console.log('\n✅ Idempotency test PASSED')
    } else {
      console.log('\n⚠️ Idempotency test inconclusive')
      console.log('Expected response to mention "Already processed"')
    }
  } catch (error) {
    console.error('\n❌ Error testing idempotency:')
    console.error(error)
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║         Crossmint Webhook Handler Test Suite            ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log('\n')

  // Check if webhook server is running
  try {
    await fetch(WEBHOOK_URL.replace('/webhook', '/webhook') + '?test=1', { method: 'GET' })
  } catch (error) {
    console.error('❌ Cannot reach webhook server at', WEBHOOK_URL)
    console.error('Make sure your Next.js dev server is running:\n')
    console.error('  cd packages/web')
    console.error('  bun dev\n')
    process.exit(1)
  }

  await testWebhook()
  await testInvalidSignature()
  await testIdempotency()

  console.log('\n\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                    Test Suite Complete                  ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
}

// Run tests
runAllTests()
