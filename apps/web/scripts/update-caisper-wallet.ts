/**
 * Update Caisper Wallet in Convex
 *
 * This script updates the Convex caisperWallet table with the new Caisper address
 * after the wallet was rotated on 2026-01-07 due to compromise.
 */

import { ConvexHttpClient } from 'convex/browser'
import { internal } from '../convex/_generated/api'
import bs58 from 'bs58'

const NEW_CAISPER_ADDRESS = 'DwQDiEQzk5QAdYvA8aBcf9txLCUhV1MG5zzoDcDLnEqc'
const NEW_CAISPER_PRIVATE_KEY = process.env.CAISPER_WALLET_PRIVATE_KEY

async function main() {
  console.log('🔄 Updating Caisper Wallet in Convex\n')
  console.log('=' .repeat(80))

  if (!NEW_CAISPER_PRIVATE_KEY) {
    throw new Error('CAISPER_WALLET_PRIVATE_KEY environment variable is not set')
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set')
  }

  console.log(`📋 Convex URL: ${convexUrl}`)
  console.log(`📋 New Caisper Address: ${NEW_CAISPER_ADDRESS}`)

  const convex = new ConvexHttpClient(convexUrl)

  try {
    // Convert base58 private key to byte array
    const secretKeyBytes = bs58.decode(NEW_CAISPER_PRIVATE_KEY)
    const secretKeyArray = Array.from(secretKeyBytes)

    console.log('\n🔑 Updating Caisper wallet in Convex...')
    console.log(`   Public Key: ${NEW_CAISPER_ADDRESS}`)
    console.log(`   Secret Key Length: ${secretKeyArray.length} bytes`)

    // Update the wallet
    await convex.mutation(internal.lib.caisper.setCaisperWallet, {
      publicKey: NEW_CAISPER_ADDRESS,
      secretKey: secretKeyArray,
    })

    console.log('\n✅ SUCCESS! Caisper wallet updated in Convex')

    // Verify the update
    console.log('\n🔍 Verifying update...')
    const updatedPublicKey = await convex.query(internal.lib.caisper.getCaisperPublicKey as any)

    if (updatedPublicKey === NEW_CAISPER_ADDRESS) {
      console.log(`✅ Verification passed! Public key matches: ${updatedPublicKey}`)
    } else {
      console.error(`❌ Verification failed! Expected ${NEW_CAISPER_ADDRESS}, got ${updatedPublicKey}`)
      throw new Error('Wallet update verification failed')
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Caisper wallet successfully updated!')
    console.log('\n📚 Old Address: CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc')
    console.log(`📚 New Address: ${NEW_CAISPER_ADDRESS}`)
    console.log('\n🎯 Next Steps:')
    console.log('1. Test x402 payment flow with new address')
    console.log('2. Verify USDC token account is correct')
    console.log('3. Run: bun run scripts/check-usdc-balance.ts')
    console.log()

  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    throw error
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
