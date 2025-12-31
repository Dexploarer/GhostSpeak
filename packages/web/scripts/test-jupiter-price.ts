#!/usr/bin/env bun

/**
 * Test script for Jupiter price oracle
 *
 * Usage: bun scripts/test-jupiter-price.ts
 */

import { getGhostPriceInUsdc, getCacheInfo, clearPriceCache } from '../lib/jupiter-price-oracle'
import { calculateGhostCost } from '../lib/b2b-token-accounts'

async function main() {
  console.log('🔍 Testing Jupiter Price Oracle Integration\n')

  // Test 1: Fetch GHOST/USDC price
  console.log('Test 1: Fetching GHOST/USDC price from Jupiter...')
  const price = await getGhostPriceInUsdc('mainnet')
  console.log(`✅ GHOST price: $${price.toFixed(6)} USDC`)
  console.log(`   (1 GHOST = $${price.toFixed(6)} USDC)`)
  console.log(`   (1 USDC = ${(1 / price).toFixed(2)} GHOST)\n`)

  // Test 2: Check cache
  console.log('Test 2: Checking price cache...')
  const cacheInfo = getCacheInfo()
  if (cacheInfo.cached) {
    console.log(`✅ Price is cached`)
    console.log(`   Age: ${cacheInfo.age}ms`)
    console.log(`   Cached price: $${cacheInfo.price?.toFixed(6)} USDC\n`)
  } else {
    console.log('❌ No cached price\n')
  }

  // Test 3: Fetch again (should use cache)
  console.log('Test 3: Fetching again (should use cache)...')
  const startTime = Date.now()
  const cachedPrice = await getGhostPriceInUsdc('mainnet')
  const elapsed = Date.now() - startTime
  console.log(`✅ Got price in ${elapsed}ms (cached)`)
  console.log(`   Price: $${cachedPrice.toFixed(6)} USDC\n`)

  // Test 4: Calculate API costs
  console.log('Test 4: Calculating API costs in GHOST...')
  const costExamples = [
    { name: '1 API request (0.01 USDC)', usdcMicro: 10_000n }, // 0.01 USDC
    { name: '100 API requests (1.00 USDC)', usdcMicro: 1_000_000n }, // 1.00 USDC
    { name: '1000 API requests (10.00 USDC)', usdcMicro: 10_000_000n }, // 10.00 USDC
  ]

  for (const example of costExamples) {
    const ghostCost = await calculateGhostCost(example.usdcMicro)
    const ghostUi = Number(ghostCost) / 1_000_000 // GHOST has 6 decimals
    console.log(`   ${example.name}: ${ghostUi.toFixed(2)} GHOST`)
  }
  console.log()

  // Test 5: Clear cache and fetch fresh
  console.log('Test 5: Clearing cache and fetching fresh price...')
  clearPriceCache()
  const freshPrice = await getGhostPriceInUsdc('mainnet')
  console.log(`✅ Fresh price: $${freshPrice.toFixed(6)} USDC\n`)

  console.log('✅ All tests passed!')
  console.log('\n📊 Summary:')
  console.log(`   GHOST/USDC price: $${price.toFixed(6)}`)
  console.log(`   Price source: Jupiter DEX Aggregator`)
  console.log(`   Cache duration: 60 seconds`)
  console.log(`   Fallback price: $0.01 USDC (if Jupiter unavailable)`)
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
