/**
 * K6 Load Test for PayAI Webhook Processing
 *
 * This test simulates high-volume webhook delivery from PayAI.
 *
 * Installation:
 *   macOS: brew install k6
 *   Linux: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   k6 run tests/load/payai-webhook.js
 *
 * Environment Variables:
 *   WEBHOOK_URL - Webhook endpoint URL (default: http://localhost:3000/api/payai/webhook)
 *   PAYAI_SECRET - PayAI webhook secret for HMAC signature
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { crypto } from 'k6/experimental/webcrypto'

// Custom metrics
const errorRate = new Rate('errors')
const webhookLatency = new Trend('webhook_latency')
const successfulWebhooks = new Counter('successful_webhooks')
const failedWebhooks = new Counter('failed_webhooks')

// Test configuration - High volume webhook simulation
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 req/s
    { duration: '2m', target: 100 }, // 100 webhooks/s for 2 minutes
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1 second
    http_req_failed: ['rate<0.01'], // Less than 1% failure rate
    errors: ['rate<0.01'],
    webhook_latency: ['p(95)<1000'],
  },
}

// Configuration
const WEBHOOK_URL = __ENV.WEBHOOK_URL || 'http://localhost:3000/api/payai/webhook'
const PAYAI_SECRET = __ENV.PAYAI_SECRET || 'test_secret_123'

/**
 * Generate HMAC signature for webhook payload
 */
function generateHmacSignature(payload, secret) {
  // Note: k6's crypto module is limited, in real testing you may need to
  // pre-generate signatures or use a different approach
  // For this example, we'll use a placeholder
  return 'test_signature_' + Date.now()
}

/**
 * Generate sample webhook payloads
 */
function generateWebhookPayload(type = 'payment.succeeded') {
  const basePayload = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: type,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  }

  if (type === 'payment.succeeded') {
    return {
      ...basePayload,
      data: {
        object: {
          id: `pi_${Math.random().toString(36).substr(2, 9)}`,
          amount: Math.floor(Math.random() * 10000) + 1000, // $10-$100
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            agentAddress: generateRandomSolanaAddress(),
            verificationLevel: ['basic', 'verified', 'elite'][Math.floor(Math.random() * 3)],
          },
        },
      },
    }
  } else if (type === 'payment.failed') {
    return {
      ...basePayload,
      data: {
        object: {
          id: `pi_${Math.random().toString(36).substr(2, 9)}`,
          amount: Math.floor(Math.random() * 10000) + 1000,
          currency: 'usd',
          status: 'failed',
          last_payment_error: {
            message: 'Your card was declined.',
          },
        },
      },
    }
  }

  return basePayload
}

/**
 * Generate random Solana address (simplified)
 */
function generateRandomSolanaAddress() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Main test function
 */
export default function () {
  // Random webhook type (90% success, 10% failure to test error handling)
  const webhookType = Math.random() < 0.9 ? 'payment.succeeded' : 'payment.failed'

  const payload = generateWebhookPayload(webhookType)
  const payloadString = JSON.stringify(payload)

  // Generate signature
  const signature = generateHmacSignature(payloadString, PAYAI_SECRET)

  const headers = {
    'Content-Type': 'application/json',
    'X-PayAI-Signature': signature,
  }

  const startTime = Date.now()
  const response = http.post(WEBHOOK_URL, payloadString, { headers })
  const duration = Date.now() - startTime

  webhookLatency.add(duration)

  const success = check(response, {
    'webhook: status is 200': (r) => r.status === 200,
    'webhook: processed successfully': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.received === true || body.success === true
      } catch {
        return false
      }
    },
  })

  if (success) {
    successfulWebhooks.add(1)
    errorRate.add(0)
  } else {
    failedWebhooks.add(1)
    errorRate.add(1)
    console.error(`Webhook failed: ${response.status} - ${response.body.substring(0, 200)}`)
  }

  // Small sleep to prevent overwhelming the system
  sleep(0.1)
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting PayAI webhook load test...')
  console.log(`Target: ${WEBHOOK_URL}`)
  console.log('Simulating high-volume webhook delivery...')

  // Test if endpoint is reachable
  const testPayload = generateWebhookPayload('payment.succeeded')
  const response = http.post(WEBHOOK_URL, JSON.stringify(testPayload), {
    headers: {
      'Content-Type': 'application/json',
      'X-PayAI-Signature': 'test_signature',
    },
  })

  console.log(`Initial test response: ${response.status}`)
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('PayAI webhook load test completed!')
  console.log(`Note: Check that all successful webhooks were written to blockchain`)
}
