#!/usr/bin/env bun

/**
 * Verify GHOST token metadata and price
 *
 * Usage: bun scripts/verify-ghost-token.ts
 */

import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { getMint } from '@solana/spl-token'

const GHOST_MINT_ADDRESS = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'

async function main() {
  console.log('🔍 Verifying GHOST Token Metadata\n')
  console.log(`Token Address: ${GHOST_MINT_ADDRESS}\n`)

  // Connect to mainnet
  const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com')

  try {
    // Get token mint info
    const mintAddress = address(GHOST_MINT_ADDRESS)
    console.log('Fetching token metadata from Solana mainnet...')

    const mintInfo = await getMint(
      rpc as any,
      // @ts-expect-error - Address type from @solana/addresses vs PublicKey from @solana/web3.js
      mintAddress,
      'confirmed'
    )

    console.log('\n✅ Token Metadata:')
    console.log(`   Mint Address: ${GHOST_MINT_ADDRESS}`)
    console.log(`   Decimals: ${mintInfo.decimals}`)
    console.log(`   Supply: ${mintInfo.supply.toString()}`)
    console.log(`   UI Supply: ${Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)}`)
    console.log(`   Mint Authority: ${mintInfo.mintAuthority}`)
    console.log(`   Freeze Authority: ${mintInfo.freezeAuthority}`)

    // Check Jupiter quote
    console.log('\n🔍 Checking Jupiter Price...')
    const { getGhostPriceInUsdc, clearPriceCache } = await import('../lib/jupiter-price-oracle')

    clearPriceCache()
    const jupiterPrice = await getGhostPriceInUsdc('mainnet')

    console.log(`   Jupiter Price: $${jupiterPrice.toFixed(8)} USDC per GHOST`)
    console.log(`   Market Cap (if accurate): $${((Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)) * jupiterPrice).toFixed(2)}`)

    // Links
    console.log('\n🔗 Verify on:')
    console.log(`   Solscan: https://solscan.io/token/${GHOST_MINT_ADDRESS}`)
    console.log(`   Birdeye: https://birdeye.so/token/${GHOST_MINT_ADDRESS}?chain=solana`)
    console.log(`   DexScreener: https://dexscreener.com/solana/${GHOST_MINT_ADDRESS}`)
    console.log(`   Jupiter: https://jup.ag/swap/SOL-${GHOST_MINT_ADDRESS}`)

  } catch (error) {
    console.error('❌ Error fetching token metadata:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
