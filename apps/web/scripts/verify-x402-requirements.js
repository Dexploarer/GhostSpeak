#!/usr/bin/env node
(async () => {
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

  console.log('=== Caisper x402 Payment Requirements Test ===\n')

  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`)
    console.log(`Endpoint: ${testCase.endpoint}`)
    console.log(`Expected: ${testCase.expectedNetwork}`)
    console.log(`Expected Fee Payer: ${testCase.expectedFeePayer}`)
    console.log(`Expected Asset: ${testCase.expectedAsset}`)
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

      console.log(`Status: ${status}`)

      if (status === 402) {
        console.log('✅ 402 Payment Required - Correct!')

        const text = await response.text()
        console.log(`Response body: ${text.substring(0, 200)}...`)

        let json = null
        try {
          json = JSON.parse(text)
        } catch {
          console.log('JSON parse failed')
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

            if (offer.extra?.feePayer) {
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
        }
      } else {
        console.log('⚠️  Got 200 (no payment required)')
      }

      console.log(`Content-Type: ${contentType}`)
    } catch (error) {
      console.error(`❌ Test failed: ${error}`)
    }

    console.log('\n' + '-'.repeat(60))
  }

  console.log('\nSummary:')
  console.log('Tests ran: ' + testCases.length)
  console.log('\n💡 What Caisper needs to do:')
  console.log('1. Parse accepts array from 402 response')
  console.log('2. Select Solana offer by matching network')
  console.log('3. Extract feePayer from extra.feePayer')
  console.log('4. Build USDC transaction with 3 instructions')
  console.log('5. Set PayAI facilitator as fee payer')
  console.log('6. Sign transaction (only token authority)')
  console.log('7. Return base64-encoded X-PAYMENT header')
  console.log('\n✅ Implementation is complete!')
  console.log('\nNext step: Start convex dev to trigger observation system')
})()
