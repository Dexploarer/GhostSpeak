#!/usr/bin/env bun

/**
 * Test Jupiter quote for the EXACT GHOST token address
 */

import { createJupiterApiClient, type QuoteGetRequest } from '@jup-ag/api'
import { address } from '@solana/addresses'

const YOUR_GHOST_MINT = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

async function main() {
  console.log('🔍 Testing Jupiter Quote for YOUR GHOST Token\n')
  console.log(`GHOST Address: ${YOUR_GHOST_MINT}`)
  console.log(`USDC Address: ${USDC_MAINNET}\n`)

  const jupiterApi = createJupiterApiClient()

  try {
    // Try to get a quote for YOUR specific GHOST token
    const params: QuoteGetRequest = {
      inputMint: YOUR_GHOST_MINT,  // YOUR token
      outputMint: USDC_MAINNET,
      amount: 1000 * Math.pow(10, 9), // 1000 GHOST
      slippageBps: 500, // 5% slippage (higher for low liquidity)
    }

    console.log('Requesting quote from Jupiter...')
    const quote = await jupiterApi.quoteGet(params)

    if (!quote) {
      console.log('❌ Jupiter returned NO QUOTE')
      console.log('\nThis means:')
      console.log('   - Your GHOST token has no liquidity pools on DEXs')
      console.log('   - Jupiter cannot route this token')
      console.log('   - You need to use a FIXED PRICE instead\n')
      console.log('💡 Recommendation: Set a fixed price (e.g., 1 GHOST = $0.01 USDC)')
      return
    }

    console.log('✅ Got quote from Jupiter!\n')
    console.log('Quote details:')
    console.log(`   Input Mint: ${quote.inputMint}`)
    console.log(`   Output Mint: ${quote.outputMint}`)
    console.log(`   In Amount: ${quote.inAmount}`)
    console.log(`   Out Amount: ${quote.outAmount}`)

    // Verify this is YOUR token
    if (quote.inputMint !== YOUR_GHOST_MINT) {
      console.log(`\n⚠️  WARNING: Jupiter used a DIFFERENT token!`)
      console.log(`   Expected: ${YOUR_GHOST_MINT}`)
      console.log(`   Got:      ${quote.inputMint}`)
      console.log('\n   Jupiter is routing to a different GHOST token with liquidity!')
    } else {
      console.log('\n✅ Jupiter is using YOUR correct GHOST token')

      const price = (Number(quote.outAmount) / 1_000_000) / (Number(quote.inAmount) / 1_000_000_000)
      console.log(`\n   Price: 1 GHOST = $${price.toFixed(8)} USDC`)
    }

  } catch (error) {
    console.error('❌ Error getting quote:', error)
    console.log('\nYour GHOST token likely has NO liquidity on DEXs')
    console.log('💡 Use a fixed price instead of Jupiter')
  }

  console.log('\n📝 Next Steps:')
  console.log('   1. If no liquidity: Use fixed price (e.g., $0.01 per GHOST)')
  console.log('   2. If you want liquidity: Add liquidity pools on Raydium/Orca')
  console.log('   3. Alternative: Set up a price configuration table in Convex')
}

main()
