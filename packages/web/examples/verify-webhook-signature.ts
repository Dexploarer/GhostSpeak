/**
 * Webhook Signature Verification Example
 *
 * Demonstrates how to verify GhostSpeak webhook signatures using HMAC-SHA256
 */

import { createHmac } from 'crypto'

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return signature === expectedSignature
}

/**
 * Example: Express.js webhook handler
 */
export function expressWebhookHandler() {
  // Example usage with Express
  const express = require('express')
  const app = express()

  // IMPORTANT: Use raw body parser for webhook endpoints
  app.use(
    '/webhooks/ghostspeak',
    express.json({
      verify: (req: any, res: any, buf: Buffer) => {
        req.rawBody = buf.toString()
      },
    })
  )

  app.post('/webhooks/ghostspeak', (req: any, res: any) => {
    const signature = req.headers['x-ghostspeak-signature']
    const webhookSecret = process.env.GHOSTSPEAK_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return res.status(401).send('Missing signature or secret')
    }

    // Verify signature using raw body
    const isValid = verifyWebhookSignature(req.rawBody, signature, webhookSecret)

    if (!isValid) {
      console.error('[Webhook] Invalid signature')
      return res.status(401).send('Invalid signature')
    }

    // Process webhook event
    const { event, agentAddress, data } = req.body

    console.log(`[Webhook] Received ${event} for agent ${agentAddress}`)

    switch (event) {
      case 'score.updated':
        handleScoreUpdate(agentAddress, data)
        break
      case 'tier.changed':
        handleTierChange(agentAddress, data)
        break
      case 'credential.issued':
        handleCredentialIssued(agentAddress, data)
        break
      default:
        console.warn(`[Webhook] Unknown event type: ${event}`)
    }

    res.status(200).send('OK')
  })

  app.listen(3000, () => {
    console.log('Webhook server listening on port 3000')
  })
}

/**
 * Example: Next.js API route webhook handler
 */
export async function nextjsWebhookHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const signature = req.headers['x-ghostspeak-signature']
  const webhookSecret = process.env.GHOSTSPEAK_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return res.status(401).json({ error: 'Missing signature or secret' })
  }

  // Get raw body as string
  const payload = JSON.stringify(req.body)

  // Verify signature
  const isValid = verifyWebhookSignature(payload, signature, webhookSecret)

  if (!isValid) {
    console.error('[Webhook] Invalid signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Process webhook event
  const { event, agentAddress, data } = req.body

  console.log(`[Webhook] Received ${event} for agent ${agentAddress}`)

  // Handle the event
  await processWebhookEvent(event, agentAddress, data)

  return res.status(200).json({ received: true })
}

/**
 * Event handlers
 */
function handleScoreUpdate(agentAddress: string, data: any) {
  console.log(`Agent ${agentAddress} score updated:`, {
    from: data.previousScore,
    to: data.ghostScore,
    tier: data.tier,
  })

  // TODO: Update your database, notify users, etc.
}

function handleTierChange(agentAddress: string, data: any) {
  console.log(`Agent ${agentAddress} tier changed:`, {
    from: data.previousTier,
    to: data.tier,
    score: data.ghostScore,
  })

  // TODO: Send congratulations email, update badges, etc.
}

function handleCredentialIssued(agentAddress: string, data: any) {
  console.log(`Credential issued for agent ${agentAddress}:`, {
    credentialId: data.credentialId,
    tier: data.tier,
    milestone: data.milestone,
  })

  // TODO: Display badge, send notification, etc.
}

async function processWebhookEvent(event: string, agentAddress: string, data: any) {
  switch (event) {
    case 'score.updated':
      handleScoreUpdate(agentAddress, data)
      break
    case 'tier.changed':
      handleTierChange(agentAddress, data)
      break
    case 'credential.issued':
      handleCredentialIssued(agentAddress, data)
      break
    default:
      console.warn(`Unknown event type: ${event}`)
  }
}

/**
 * Example: Test webhook locally
 */
export function testWebhookLocally() {
  const testPayload = {
    event: 'score.updated',
    agentAddress: 'TestAgent123...',
    data: {
      ghostScore: 5500,
      tier: 'GOLD',
      previousScore: 5000,
      previousTier: 'SILVER',
    },
    timestamp: Date.now(),
  }

  const secret = 'whsec_test123...'
  const payload = JSON.stringify(testPayload)

  // Generate signature
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const signature = hmac.digest('hex')

  console.log('Test Webhook:')
  console.log('Payload:', payload)
  console.log('Signature:', signature)
  console.log('Valid:', verifyWebhookSignature(payload, signature, secret))
}

// Run test if this file is executed directly
if (require.main === module) {
  testWebhookLocally()
}
