/**
 * PayAI Test Merchant Server
 *
 * Simple x402 merchant endpoint for testing PayAI integration and discovering
 * the facilitator's Solana address.
 *
 * This script sets up a minimal HTTP server that:
 * 1. Advertises payment requirements (x402 protocol)
 * 2. Verifies payments via PayAI facilitator
 * 3. Logs payment details including facilitator address
 *
 * Usage:
 *   bun run scripts/test-payai-merchant.ts
 *
 * Then make a payment from a client:
 *   curl -X GET http://localhost:4000/protected \
 *     -H "x402-payment: <payment_payload>"
 *
 * Or use PayAI's client libraries to make the payment.
 */

import { serve } from 'bun'

const PORT = 4000
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.payai.network'
const X402_NETWORK = process.env.X402_NETWORK || 'solana-devnet'

// Your merchant wallet address (agent address)
// Generate one with: solana-keygen new
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || 'YOUR_MERCHANT_WALLET_ADDRESS'

console.log('🚀 PayAI Test Merchant Server')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
console.log('Configuration:')
console.log(`  Port: ${PORT}`)
console.log(`  Facilitator: ${FACILITATOR_URL}`)
console.log(`  Network: ${X402_NETWORK}`)
console.log(`  Merchant: ${MERCHANT_ADDRESS}`)
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

if (MERCHANT_ADDRESS === 'YOUR_MERCHANT_WALLET_ADDRESS') {
  console.warn('⚠️  WARNING: MERCHANT_ADDRESS not configured!')
  console.log('\nTo generate a merchant wallet:')
  console.log('  1. Run: solana-keygen new -o merchant-wallet.json')
  console.log('  2. Get address: solana address -k merchant-wallet.json')
  console.log('  3. Set env: export MERCHANT_ADDRESS=<your_address>\n')
}

console.log('📡 Server running at http://localhost:4000\n')
console.log('Endpoints:')
console.log('  GET  /            - Server info')
console.log('  GET  /protected   - Protected resource (requires payment)')
console.log('  POST /webhook     - PayAI webhook receiver\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Payment details storage (in-memory)
const payments = new Map<string, any>()

serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)

    // Root endpoint - server info
    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({
          merchant: 'PayAI Test Merchant',
          address: MERCHANT_ADDRESS,
          network: X402_NETWORK,
          facilitator: FACILITATOR_URL,
          endpoints: {
            protected: '/protected',
            webhook: '/webhook',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Protected resource - requires payment
    if (url.pathname === '/protected') {
      const paymentHeader = request.headers.get('x402-payment')

      // No payment provided - return 402 with payment requirements
      if (!paymentHeader) {
        console.log('💳 Payment required for /protected')

        return new Response(
          JSON.stringify({
            error: 'Payment required',
            message: 'This resource costs 0.01 USDC',
          }),
          {
            status: 402,
            headers: {
              'Content-Type': 'application/json',
              // x402 payment requirements
              'x402-accept': 'solana-devnet',
              'x402-price': '10000', // 0.01 USDC (6 decimals)
              'x402-facilitator': FACILITATOR_URL,
              'x402-merchant': MERCHANT_ADDRESS,
            },
          }
        )
      }

      // Payment provided - verify with facilitator
      console.log('\n💰 Payment received!')
      console.log('Payment header:', paymentHeader.substring(0, 100) + '...')

      try {
        // Parse payment payload
        const paymentPayload = JSON.parse(paymentHeader)

        console.log('\n📦 Payment Payload:')
        console.log('  Signature:', paymentPayload.signature || 'N/A')
        console.log('  Payer:', paymentPayload.payer || 'N/A')
        console.log('  Amount:', paymentPayload.amount || 'N/A')
        console.log('  Network:', paymentPayload.network || 'N/A')

        // Verify payment with facilitator
        console.log('\n🔍 Verifying payment with facilitator...')

        const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment: paymentPayload,
            merchant: MERCHANT_ADDRESS,
            network: X402_NETWORK,
          }),
        })

        const verifyResult = await verifyResponse.json()

        if (!verifyResponse.ok) {
          console.error('❌ Payment verification failed:', verifyResult)
          return new Response(
            JSON.stringify({
              error: 'Payment verification failed',
              details: verifyResult,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        console.log('✅ Payment verified!')
        console.log('Verification result:', verifyResult)

        // Store payment details
        const paymentId = paymentPayload.signature || `payment_${Date.now()}`
        payments.set(paymentId, {
          ...paymentPayload,
          verifiedAt: Date.now(),
          verificationResult: verifyResult,
        })

        // Return protected content
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment accepted! Here is your protected content.',
            data: {
              content: 'This is the protected resource you paid for.',
              timestamp: new Date().toISOString(),
              paymentId,
            },
            payment: {
              signature: paymentPayload.signature,
              amount: paymentPayload.amount,
              payer: paymentPayload.payer,
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      } catch (error) {
        console.error('❌ Error processing payment:', error)
        return new Response(
          JSON.stringify({
            error: 'Payment processing error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Webhook endpoint - receives PayAI notifications
    if (url.pathname === '/webhook' && request.method === 'POST') {
      console.log('\n📬 Webhook received!')

      try {
        const body = await request.text()
        const webhook = JSON.parse(body)

        console.log('\n📨 Webhook Event:')
        console.log('  Event:', webhook.event || 'N/A')
        console.log('  Signature:', webhook.signature || 'N/A')
        console.log('  Merchant:', webhook.merchant || 'N/A')
        console.log('  Payer:', webhook.payer || 'N/A')
        console.log('  Amount:', webhook.amount || 'N/A')

        console.log('\n🎯 FACILITATOR ADDRESS DISCOVERY:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('\nTo find the PayAI facilitator address:')
        console.log(`1. Transaction signature: ${webhook.signature}`)
        console.log(`2. Run the helper script:\n`)
        console.log(
          `   bun run scripts/find-payai-facilitator-address.ts ${webhook.signature} devnet\n`
        )
        console.log('3. The script will extract the facilitator address from the transaction')
        console.log('4. Add it to your .env.local file\n')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        // Store webhook event
        payments.set(webhook.signature, {
          ...webhook,
          webhookReceivedAt: Date.now(),
        })

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('❌ Webhook processing error:', error)
        return new Response(
          JSON.stringify({
            error: 'Webhook processing failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // 404 for unknown endpoints
    return new Response('Not found', { status: 404 })
  },
})
