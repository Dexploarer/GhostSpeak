/**
 * Direct HTTP Test of PayAI Echo Merchant
 * 
 * Tests the x402 flow without Convex dependencies
 */

const PAYAI_ECHO_ENDPOINT = 'https://x402.payai.network/weather'
const CAISPER_PUBLIC_KEY = 'DwQDiEQzk5QAdYvA8aBcf9txLCUhV1MG5zzoDcDLnEqc'

console.log('🚀 Testing PayAI Echo Merchant (Direct HTTP)\n')
console.log('='.repeat(80))

async function testX402Flow() {
  try {
    // Step 1: Initial request (expect 402)
    console.log('\n[Step 1] Initial request to echo merchant...')
    const initialResponse = await fetch(PAYAI_ECHO_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    console.log(`   Status: ${initialResponse.status}`)
    const contentType = initialResponse.headers.get('content-type')
    console.log(`   Content-Type: ${contentType}`)

    if (initialResponse.status !== 402) {
      console.log(`\n❌ Expected 402, got ${initialResponse.status}`)
      console.log('   This endpoint should require x402 payment')
      return
    }

    // Step 2: Parse 402 response
    console.log('\n[Step 2] Parsing 402 payment requirements...')
    const responseText = await initialResponse.text()
    console.log(`   Response body: ${responseText.substring(0, 300)}...`)

    let paymentRequirements: any = null
    try {
      const json = JSON.parse(responseText)

      if (json.accepts && Array.isArray(json.accepts) && json.accepts.length > 0) {
        // Find Solana offer
        const offer =
          json.accepts.find(
            (a: any) =>
              a.network === 'solana' ||
              a.network === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
          ) ||
          json.accepts.find(
            (a: any) =>
              a.network === 'solana-devnet' ||
              a.network === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
          ) ||
          json.accepts.find((a: any) => a.network?.startsWith('solana'))

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
      console.error('   Parse error:', e)
      return
    }

    if (!paymentRequirements) {
      console.log('\n❌ Could not parse x402 payment requirements')
      return
    }

    const amountMicro = parseInt(paymentRequirements.maxAmountRequired)
    const amountUsdc = amountMicro / 1e6

    console.log('\n✅ Payment Requirements Parsed:')
    console.log(`   Network: ${paymentRequirements.network}`)
    console.log(`   Asset (Mint): ${paymentRequirements.asset}`)
    console.log(`   Pay To: ${paymentRequirements.payTo}`)
    console.log(`   Amount: ${amountMicro} micro-USDC ($${amountUsdc.toFixed(4)})`)
    console.log(`   Fee Payer: ${paymentRequirements.extra?.feePayer || 'N/A'}`)
    console.log(`   Scheme: ${paymentRequirements.scheme}`)

    // Step 3: Payment requirement analysis
    console.log('\n[Step 3] Analyzing payment requirements...')

    if (amountMicro > 100000) {
      console.log(`   ⚠️  Payment amount ($${amountUsdc.toFixed(2)}) exceeds $0.10 limit`)
      console.log('   This is for safety - actual payment would fail')
    }

    if (!paymentRequirements.extra?.feePayer) {
      console.log('   ⚠️  No feePayer in extra.feePayer')
      console.log('   PayAI facilitator won't cover gas fees - payment more expensive')
    }

    // Step 4: Check if merchant accepts USDC from Caisper's network
    console.log('\n[Step 4] Checking network compatibility...')
    console.log(`   Caisper Wallet: ${CAISPER_PUBLIC_KEY}`)
    
    if (paymentRequirements.network.includes('devnet')) {
      console.log('   Network: Devnet')
      console.log('   ⚠️  Devnet USDC faucet needed')
      console.log('   Get test USDC at: https://faucet.solana.com/')
    } else {
      console.log('   Network: Mainnet')
      console.log('   ✅ Real USDC required')
    }

    // Step 5: Test result
    console.log('\n' + '='.repeat(80))
    console.log('✅ Test Complete!')
    console.log()
    console.log('📊 Summary:')
    console.log('   1. PayAI Echo Merchant is responding with 402')
    console.log('   2. x402 payment requirements are properly formatted')
    console.log('   3. Network detection working')
    console.log()
    console.log('🔑 What Caisper needs to complete payment:')
    console.log('   1. Create x402-compliant USDC transaction')
    console.log('   2. Include facilitator fee payer address')
    console.log('   3. Sign with Caisper private key')
    console.log('   4. Send with X-PAYMENT header')
    console.log()
    console.log('💡 Next steps:')
    console.log('   1. Fund Caisper with USDC (already done ✓)')
    console.log('   2. Trigger observation system to test endpoints')
    console.log('   3. Monitor logs for successful payments')

  } catch (error) {
    console.error('\n❌ Test Failed:', error)
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`)
    }
  }
}

testX402Flow()
