#!/usr/bin/env bun

/**
 * Check if GHOST token exists on-chain
 */

import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'

const GHOST_MINT_ADDRESS = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'

async function main() {
  console.log('🔍 Checking GHOST Token on Solana\n')
  console.log(`Token Address: ${GHOST_MINT_ADDRESS}\n`)

  const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com')
  const mintAddress = address(GHOST_MINT_ADDRESS)

  try {
    // Try to get account info
    console.log('Fetching account info...')
    const accountInfo = await rpc.getAccountInfo(mintAddress, { encoding: 'base64' }).send()

    if (accountInfo.value) {
      console.log('✅ Token account exists on mainnet!')
      console.log('\nAccount Info:')
      console.log(`   Owner: ${accountInfo.value.owner}`)
      console.log(`   Lamports: ${accountInfo.value.lamports}`)
      console.log(`   Executable: ${accountInfo.value.executable}`)
      console.log(`   Data length: ${accountInfo.value.data[0].length} bytes`)
    } else {
      console.log('❌ Token account NOT found on mainnet')
      console.log('\nThis could mean:')
      console.log('   1. Token address is incorrect')
      console.log('   2. Token is on devnet/testnet, not mainnet')
      console.log('   3. Token has been closed')
    }

    // Check on devnet too
    console.log('\n🔍 Checking devnet...')
    const devnetRpc = createSolanaRpc('https://api.devnet.solana.com')
    const devnetInfo = await devnetRpc.getAccountInfo(mintAddress, { encoding: 'base64' }).send()

    if (devnetInfo.value) {
      console.log('✅ Token found on DEVNET!')
      console.log('   Owner:', devnetInfo.value.owner)
    } else {
      console.log('❌ Not found on devnet either')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }

  // Provide verification links
  console.log('\n🔗 Verify on block explorers:')
  console.log(`   Solscan: https://solscan.io/token/${GHOST_MINT_ADDRESS}`)
  console.log(`   Solana Explorer: https://explorer.solana.com/address/${GHOST_MINT_ADDRESS}`)
  console.log(`   Birdeye: https://birdeye.so/token/${GHOST_MINT_ADDRESS}?chain=solana`)
}

main()
