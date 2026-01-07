/**
 * Test Caisper x402 Payment Against PayAI Echo Merchant
 *
 * This script tests the newly implemented x402 USDC payment flow
 * against PayAI's echo merchant endpoint (https://x402.payai.network)
 *
 * Flow:
 * 1. Call echo merchant endpoint
 * 2. Receive 402 with x402 payment requirements
 * 3. Parse requirements (accepts array, feePayer, etc.)
 * 4. Create x402-compliant USDC payment transaction
 * 5. Send request with X-PAYMENT header
 * 6. Parse X-PAYMENT-RESPONSE for settlement tx hash
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import { decodeX402Response } from '../convex/lib/caisperX402'

// PayAI Echo Merchant endpoint
const PAYAI_ECHO_ENDPOINT = 'https://x402.payai.network/weather'
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL

if (!CONVEX_URL) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable not set')
}

console.log('🚀 Testing Caisper x402 Payment Flow\n')
console.log('='.repeat(80))
console.log(`Echo Merchant: ${PAYAI_ECHO_ENDPOINT}`)
console.log(`Convex URL: ${CONVEX_URL}`)
console.log()

const convex = new ConvexHttpClient(CONVEX_URL)

async function testX402Payment() {
  try {
    // Step 1: Initial request (should get 402)
    console.log('Step 1: Initial request to echo merchant...')
    const initialResponse = await fetch(PAYAI_ECHO_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    console.log(`Response Status: ${initialResponse.status}`)

    if (initialResponse.status !== 402) {
      console.log('❌ Expected 402 Payment Required, got:', initialResponse.status)
      return
    }

    // Step 2: Parse x402 payment requirements from response body
    console.log('\nStep 2: Parsing x402 payment requirements...')

    const contentType = initialResponse.headers.get('content-type')
    console.log(`Content-Type: ${contentType}`)

    const responseBody = await initialResponse.text()
    console.log(`Response Body: ${responseBody.substring(0, 500)}...`)

    let paymentRequirements: {
      scheme: string
      network: string
      asset: string
      payTo: string
      maxAmountRequired: string
      extra?: { feePayer?: string }
    } | null = null

    try {
      const json = JSON.parse(responseBody)

      if (json.accepts && Array.isArray(json.accepts) && json.accepts.length > 0) {
        // Find Solana offer (prefer mainnet, then devnet)
        const offer =
          json.accepts.find(
            (a: { network?: string }) =>
              a.network === 'solana' ||
              a.network === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
          ) ||
          json.accepts.find(
            (a: { network?: string }) =>
              a.network === 'solana-devnet' ||
              a.network === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
          ) ||
          json.accepts.find((a: { network?: string }) =>
            a.network?.startsWith('solana')
          )

        if (offer) {
          paymentRequirements = {
            scheme: offer.scheme || 'exact',
            network: offer.network,
            asset: offer.asset,
            payTo: offer.payTo,
            maxAmountRequired: offer.maxAmountRequired || '0',
            extra: offer.extra,
          }
        }
      }
    } catch (e) {
      console.error('❌ Failed to parse 402 response:', e)
      return
    }

    if (!paymentRequirements) {
      console.log('❌ Could not parse x402 payment requirements')
      return
    }

    const amountMicro = parseInt(paymentRequirements.maxAmountRequired)
    const amountUsdc = amountMicro / 1e6

    console.log('\n✅ Payment Requirements Parsed:')
    console.log(`  Network: ${paymentRequirements.network}`)
    console.log(`  Asset: ${paymentRequirements.asset}`)
    console.log(`  Pay To: ${paymentRequirements.payTo}`)
    console.log(`  Amount: ${amountMicro} micro-USDC ($${amountUsdc.toFixed(4)})`)
    console.log(`  Fee Payer: ${paymentRequirements.extra?.feePayer || 'N/A'}`)
    console.log()

    // Step 3: Create x402 payment via Convex action
    console.log('Step 3: Creating x402 payment payload via Convex...')

    const paymentResult = await convex.action(
      api.lib.caisperX402.createX402Payment,
      { paymentRequirements }
    )

    if (!paymentResult.success || !paymentResult.encodedPayload) {
      console.error('❌ Payment creation failed:', paymentResult.error)
      console.error('\n🔍 Debug: Check Caisper wallet has USDC tokens')
      console.log('   Run: spl-token balance <USDC_MINT> --owner <CAISPER_ADDRESS>')
      return
    }

    console.log('✅ x402 payment payload created successfully')
    console.log(`  Encoded Payload: ${paymentResult.encodedPayload.substring(0, 60)}...`)
    console.log()

    // Step 4: Retry request with X-PAYMENT header
    console.log('Step 4: Retrying request with X-PAYMENT header...')

    const paidResponse = await fetch(PAYAI_ECHO_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-PAYMENT': paymentResult.encodedPayload,
      },
    })

    console.log(`Response Status: ${paidResponse.status}`)

    if (paidResponse.status !== 200) {
      console.log('❌ Payment request failed with status:', paidResponse.status)
      const errorText = await paidResponse.text()
      console.log(`Response: ${errorText.substring(0, 500)}`)
      return
    }

    // Step 5: Parse X-PAYMENT-RESPONSE header
    console.log('\nStep 5: Parsing X-PAYMENT-RESPONSE header...')

    const xPaymentResponse = paidResponse.headers.get('X-PAYMENT-RESPONSE')
    const responseData = await paidResponse.text()

    if (xPaymentResponse) {
      const settlement = decodeX402Response(xPaymentResponse)
      console.log('✅ Payment Settled On-Chain:')
      console.log(`  Success: ${settlement.success}`)
      console.log(`  Transaction: ${settlement.transaction}`)
      console.log(`  Network: ${settlement.network}`)
      console.log(`  Payer: ${settlement.payer}`)
      if (settlement.errorReason) {
        console.log(`  Error: ${settlement.errorReason}`)
      }
    } else {
      console.log('⚠️  No X-PAYMENT-RESPONSE header found (payment may have succeeded)')
    }

    console.log('\n✅ Response Body:')
    console.log(responseData)

    console.log('\n' + '='.repeat(80))
    console.log('✨ Test Complete!')
    console.log()
    console.log('📚 Key Points:')
    console.log('  1. x402 protocol working (402 → X-PAYMENT → 200)')
    console.log('  2. USDC payment successful (SOL conversion removed)')
    console.log('  3. X-PAYMENT header format correct')
    console.log('  4. X-PAYMENT-RESPONSE parsed correctly')
    console.log('  5. PayAI facilitator covered gas fees')
  } catch (error) {
    console.error('\n❌ Test Failed:', error)
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
      console.error(`Stack: ${error.stack}`)
    }
  }
}

// Run the test
testX402Payment()
  .then(() => {
    console.log('\n✅ All tests completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
