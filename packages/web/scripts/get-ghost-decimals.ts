#!/usr/bin/env bun

/**
 * Fetch GHOST token decimals from on-chain and recalculate price
 */

import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { createJupiterApiClient } from '@jup-ag/api'

const GHOST_MINT = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

async function main() {
  console.log('🔍 Fetching GHOST Token Decimals\n')

  const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com')
  const mintAddress = address(GHOST_MINT)

  // Get account info
  const accountInfo = await rpc.getAccountInfo(mintAddress, {
    encoding: 'base64'
  }).send()

  if (!accountInfo.value) {
    console.log('Token not found')
    return
  }

  // Decode the mint account data
  // Token mint layout: https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs
  // Decimals is at byte offset 44 (1 byte)
  const data = Buffer.from(accountInfo.value.data[0], 'base64')
  const decimals = data[44]

  console.log(`✅ Token Decimals: ${decimals}`)
  console.log(`   (I was assuming: 9)\n`)

  // Now get Jupiter quote with correct decimals
  console.log('🔍 Getting Jupiter Quote...\n')

  const jupiterApi = createJupiterApiClient()
  const amount = 1000 * Math.pow(10, decimals)

  const quote = await jupiterApi.quoteGet({
    inputMint: GHOST_MINT,
    outputMint: USDC_MINT,
    amount,
    slippageBps: 500,
  })

  if (!quote) {
    console.log('No quote')
    return
  }

  console.log('Quote Response:')
  console.log(`   Input: ${quote.inAmount} (${1000} GHOST with ${decimals} decimals)`)
  console.log(`   Output: ${quote.outAmount} (USDC with 6 decimals)\n`)

  // Calculate price correctly
  const inGhost = Number(quote.inAmount) / Math.pow(10, decimals)
  const outUsdc = Number(quote.outAmount) / Math.pow(10, 6)
  const price = outUsdc / inGhost

  console.log('💰 Price Calculation:')
  console.log(`   ${inGhost} GHOST → ${outUsdc} USDC`)
  console.log(`   1 GHOST = $${price.toFixed(8)} USDC`)
  console.log(`   1 USDC = ${(1/price).toFixed(2)} GHOST\n`)

  const expectedPrice = 0.00004804
  const diff = Math.abs(price - expectedPrice)
  const percentDiff = (diff / expectedPrice) * 100

  console.log('✅ Verification:')
  console.log(`   Expected: $${expectedPrice}`)
  console.log(`   Got:      $${price.toFixed(8)}`)
  console.log(`   Diff:     ${percentDiff.toFixed(2)}%`)
}

main()
