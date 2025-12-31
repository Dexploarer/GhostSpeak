#!/usr/bin/env bun

/**
 * Debug Jupiter quote response to see ALL fields
 */

import { createJupiterApiClient, type QuoteGetRequest } from '@jup-ag/api'

const YOUR_GHOST_MINT = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

async function main() {
  console.log('🔍 Debugging Jupiter Quote Response\n')

  const jupiterApi = createJupiterApiClient()

  const params: QuoteGetRequest = {
    inputMint: YOUR_GHOST_MINT,
    outputMint: USDC_MAINNET,
    amount: 1000 * Math.pow(10, 9), // 1000 GHOST with 9 decimals
    slippageBps: 500,
  }

  console.log('Request params:')
  console.log(JSON.stringify(params, null, 2))
  console.log('\n---\n')

  const quote = await jupiterApi.quoteGet(params)

  if (!quote) {
    console.log('No quote returned')
    return
  }

  console.log('FULL QUOTE RESPONSE:')
  console.log(JSON.stringify(quote, null, 2))

  console.log('\n---\n')
  console.log('Key fields:')
  console.log(`inputMint: ${quote.inputMint}`)
  console.log(`outputMint: ${quote.outputMint}`)
  console.log(`inAmount: ${quote.inAmount}`)
  console.log(`outAmount: ${quote.outAmount}`)
  console.log(`otherAmountThreshold: ${quote.otherAmountThreshold}`)
  console.log(`swapMode: ${quote.swapMode}`)
  console.log(`priceImpactPct: ${quote.priceImpactPct}`)

  console.log('\n---\n')
  console.log('Price calculations:')

  // My current calculation
  const inAmountNum = Number(quote.inAmount) / Math.pow(10, 9) // GHOST decimals
  const outAmountNum = Number(quote.outAmount) / Math.pow(10, 6) // USDC decimals
  const myPrice = outAmountNum / inAmountNum
  console.log(`My calculation: 1 GHOST = $${myPrice.toFixed(8)} USDC`)

  // Alternative: use otherAmountThreshold
  if (quote.otherAmountThreshold) {
    const altPrice = Number(quote.otherAmountThreshold) / Number(quote.inAmount)
    console.log(`Using otherAmountThreshold: ${altPrice.toFixed(8)}`)
  }

  // Show the route
  if (quote.routePlan && quote.routePlan.length > 0) {
    console.log('\nRoute Plan:')
    quote.routePlan.forEach((route, i) => {
      console.log(`\nRoute ${i + 1}:`)
      console.log(`  Swap Info:`, route.swapInfo)
      console.log(`  Percent: ${route.percent}`)
    })
  }
}

main()
