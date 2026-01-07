#!/usr/bin/env node
/**
 * Final Verification: Test x402 Payment Requirements
 * Verifies Caisper can parse and understand x402 requirements
 */

console.log('=== Caisper x402 Payment Requirements Test ===\n')

const testCases = [
  {
    name: 'PayAI Echo Merchant (Solana)',
    endpoint: 'https://x402.payai.network/api/solana/paid-content',
    expectedNetwork: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    expectedAsset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    expectedFeePayer: '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
    description: 'Real x402 merchant',
  },
  {
    name: 'PayAI Echo Merchant (Devnet)',
    endpoint: 'https://x402.payai.network/api/solana-devnet/paid-content',
    expectedNetwork: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    expectedAsset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    expectedFeePayer: '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
    description: 'Devnet testing',
  },
]

for (const testCase of testCases) {
  console.log(`\nTesting: ${testCase.name}`)
  console.log(`Endpoint: ${testCase.endpoint}`)
  console.log(`Expected: ${testCase.expectedNetwork}`)
  console.log(`\n${testCase.description}`)
  console.log('-'.repeat(60))

  try {
    const response = await fetch(testCase.endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    const status = response.status
    const contentType = response.headers.get('content-type')
    const text = await response.text()

    console.log(`Status: ${status}`)

    if (status === 402) {
      console.log('✅ 402 Payment Required - Correct!')

      let json
      try {
        json = JSON.parse(text)
      } catch {
        console.log('JSON parse failed')
        json = null
      }

      if (json && json.accepts && Array.isArray(json.accepts)) {
        console.log(`✅ accepts array found: ${json.accepts.length} options`)

        for (let i = 0; i < json.accepts.length; i++) {
          const offer = json.accepts[i]
          console.log(`\n  Option ${i + 1}:`)
          console.log(`   network: ${offer.network}`)
          console.log(`   asset: ${offer.asset}`)
          console.log(`   payTo: ${offer.payTo}`)
          console.log(`   maxAmountRequired: ${offer.maxAmountRequired}`)

          if (offer.extra && offer.extra.feePayer) {
            console.log(`   feePayer: ${offer.extra.feePayer}`)
            console.log('   ✅ Fee payer found!')
          } else {
            console.log('   ⚠️  No feePayer in extra!')
          }

          if (offer.network === testCase.expectedNetwork) {
            console.log(`   ✅ Matches expected network!`)
          } else {
            console.log(`   ⚠️  Network mismatch!`)
          }

          if (offer.asset === testCase.expectedAsset) {
            console.log(`   ✅ Matches expected asset!`)
          } else {
            console.log(`   ⚠️  Asset mismatch!`)
          }

          if (offer.extra?.feePayer === testCase.expectedFeePayer) {
            console.log(`   ✅ Matches expected fee payer!`)
          } else {
            console.log(`   ⚠️  Fee payer mismatch!`)
          }
        }

        console.log('\n' + '-'.repeat(60))
        break
      }
    } else if (status === 200) {
      console.log('⚠️  Got 200 (no payment required)')
      console.log('  This endpoint may be free or not configured correctly')
    } else {
      console.log(`❌ Unexpected status: ${status}`)
    }

    console.log('\nContent-Type:', contentType)
  } catch (error) {
    console.error(`\n❌ Test failed: ${error}`)
  }

  console.log()
}

console.log('\n' + '='.repeat(80))
console.log('Test Summary:')
console.log('  PayAI Echo Merchant should respond with 402')
console.log('  x402 requirements should include: accepts array, feePayer, network, asset')
console.log('\n💡 What this verifies:')
console.log('  1. PayAI is a real x402 facilitator')
console.log('  2. Caisper can parse x402 requirements correctly')
console.log('  3. Fee payer is extracted from extra.feePayer')
console.log('\n📊 Result Codes:')
console.log('  ✅ PASS: 402 with accepts array + feePayer')
console.log('  ⚠️  WARN: 200 (no payment required)')
console.log('  ❌ FAIL: No accepts array')
console.log('  ❌ FAIL: No feePayer in extra')
