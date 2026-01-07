/**
 * Check Caisper's USDC Balance
 *
 * Checks the USDC token balance for Caisper's wallet on both mainnet and devnet.
 * This is needed for x402 payments to work.
 */

import { createSolanaRpc } from '@solana/rpc'
import bs58 from 'bs58'

// Caisper's wallet addresses
const CAISPER_PUBLIC_KEY = process.env.CAISPER_WALLET_ADDRESS

// USDC mint addresses
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

// RPC endpoints
const MAINNET_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const DEVNET_RPC = 'https://api.devnet.solana.com'

async function checkTokenBalance(
  rpcUrl: string,
  walletAddress: string,
  mintAddress: string,
  network: string
) {
  console.log(`\n🔍 Checking USDC balance on ${network}...`)
  console.log(`   RPC: ${rpcUrl}`)
  console.log(`   Wallet: ${walletAddress}`)
  console.log(`   Mint: ${mintAddress}`)

  try {
    const rpc = createSolanaRpc(rpcUrl)

    const tokenAccounts = await rpc
      .getTokenAccountsByOwner({
        owner: walletAddress,
        mint: mintAddress,
        encoding: 'jsonParsed',
      })
      .send()

    if (tokenAccounts.value && tokenAccounts.value.length > 0) {
      for (const account of tokenAccounts.value) {
        const parsed = account.account.data.parsed.info
        const balance = BigInt(parsed.tokenAmount.amount)
        const decimals = parsed.tokenAmount.decimals
        const usdcBalance = Number(balance) / 10 ** decimals

        console.log(`\n✅ USDC Token Account Found:`)
        console.log(`   Address: ${account.pubkey}`)
        console.log(`   Balance: ${usdcBalance.toFixed(2)} USDC`)
        console.log(`   Raw: ${balance.toString()} (${decimals} decimals)`)

        return usdcBalance
      }
    } else {
      console.log(`\n⚠️  No USDC token account found`)
      console.log(`   This wallet has not been initialized for USDC on ${network}`)
      console.log(`\n💡 To fix this, you can:`)
      console.log(`   1. Send USDC to this wallet address`)
      console.log(`   2. Use a USDC faucet (for devnet)`)
    }

    return 0
  } catch (error) {
    console.error(`\n❌ Error checking ${network}:`, error)
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    }
    return 0
  }
}

async function main() {
  if (!CAISPER_PUBLIC_KEY) {
    console.error('❌ CAISPER_WALLET_ADDRESS environment variable not set')
    console.error('\n💡 Set it in your .env file:')
    console.error('   CAISPER_WALLET_ADDRESS=CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc')
    process.exit(1)
  }

  console.log('🔐 Caisper USDC Balance Checker\n')
  console.log('='.repeat(80))
  console.log(`Caisper Wallet: ${CAISPER_PUBLIC_KEY}`)

  // Check mainnet
  const mainnetBalance = await checkTokenBalance(
    MAINNET_RPC,
    CAISPER_PUBLIC_KEY,
    USDC_MINT_MAINNET,
    'mainnet'
  )

  // Check devnet
  const devnetBalance = await checkTokenBalance(
    DEVNET_RPC,
    CAISPER_PUBLIC_KEY,
    USDC_MINT_DEVNET,
    'devnet'
  )

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary\n')
  console.log(`Mainnet: ${mainnetBalance.toFixed(2)} USDC`)
  console.log(`Devnet:  ${devnetBalance.toFixed(2)} USDC`)

  const totalBalance = mainnetBalance + devnetBalance

  if (totalBalance === 0) {
    console.log('\n❌ No USDC balance found on either network')
    console.log('\n💡 x402 payments require USDC. You have options:')
    console.log()
    console.log('   1. Fund with real USDC (mainnet):')
    console.log(`      Send USDC to: ${CAISPER_PUBLIC_KEY}`)
    console.log()
    console.log('   2. Use devnet test faucet:')
    console.log('      Visit: https://faucet.solana.com/')
    console.log(`      Enter: ${CAISPER_PUBLIC_KEY}`)
    console.log('      Select: USDC')
    console.log()
    console.log('   3. Use CDP (cross-chain payment) if available')
  } else {
    console.log('\n✅ Caisper has USDC balance - x402 payments ready!')
    console.log(`   Total: ${totalBalance.toFixed(2)} USDC`)
    console.log('\n💡 Minimum for testing: 0.01 USDC (10,000 micro-units)')
  }

  console.log()
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
