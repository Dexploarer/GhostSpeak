/**
 * Create USDC Associated Token Account for Caisper on Mainnet
 *
 * This script creates the USDC ATA for the new Caisper wallet so it can
 * receive x402 payments on mainnet.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { createAssociatedTokenAccountIdempotent, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'

const MAINNET_RPC = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
const CAISPER_ADDRESS = 'DwQDiEQzk5QAdYvA8aBcf9txLCUhV1MG5zzoDcDLnEqc'
const CAISPER_PRIVATE_KEY = process.env.CAISPER_WALLET_PRIVATE_KEY

async function main() {
  console.log('💰 Creating USDC Token Account for Caisper (Mainnet)\n')
  console.log('=' .repeat(80))

  if (!CAISPER_PRIVATE_KEY) {
    throw new Error('CAISPER_WALLET_PRIVATE_KEY environment variable is not set')
  }

  // Setup connection and keypair
  const connection = new Connection(MAINNET_RPC, 'confirmed')
  const secretKey = bs58.decode(CAISPER_PRIVATE_KEY)
  const caisperKeypair = Keypair.fromSecretKey(secretKey)

  console.log(`📋 Mainnet RPC: ${MAINNET_RPC}`)
  console.log(`📋 Caisper Address: ${CAISPER_ADDRESS}`)
  console.log(`📋 USDC Mint: ${USDC_MINT}`)

  // Verify keypair matches expected address
  if (caisperKeypair.publicKey.toBase58() !== CAISPER_ADDRESS) {
    throw new Error(`Keypair mismatch! Expected ${CAISPER_ADDRESS}, got ${caisperKeypair.publicKey.toBase58()}`)
  }

  try {
    // Check SOL balance first
    const balance = await connection.getBalance(caisperKeypair.publicKey)
    const solBalance = balance / 1e9
    console.log(`\n💰 Current SOL Balance: ${solBalance.toFixed(6)} SOL`)

    if (solBalance < 0.001) {
      console.log('\n⚠️  WARNING: Low SOL balance! Need at least 0.001 SOL for transaction fees.')
      console.log('   Please send some SOL to this wallet first:')
      console.log(`   ${CAISPER_ADDRESS}`)
      process.exit(1)
    }

    // Create USDC token account (idempotent - won't fail if already exists)
    console.log('\n🔨 Creating USDC Associated Token Account...')

    const usdcMint = new PublicKey(USDC_MINT)
    const tokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      caisperKeypair,  // Payer (pays for account creation)
      usdcMint,        // Mint address
      caisperKeypair.publicKey,  // Owner
      {},
      TOKEN_PROGRAM_ID
    )

    console.log('\n✅ SUCCESS! USDC Token Account Created')
    console.log(`   Token Account: ${tokenAccount.toBase58()}`)

    // Verify it was created
    const accountInfo = await connection.getAccountInfo(tokenAccount)
    if (accountInfo) {
      console.log(`\n✅ Verification Passed!`)
      console.log(`   Account exists: Yes`)
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`)
      console.log(`   Data length: ${accountInfo.data.length} bytes`)
    } else {
      throw new Error('Token account creation verification failed!')
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n✨ Setup Complete!')
    console.log('\n📊 Summary:')
    console.log(`   Wallet: ${CAISPER_ADDRESS}`)
    console.log(`   USDC Token Account: ${tokenAccount.toBase58()}`)
    console.log(`   Network: Mainnet`)
    console.log('\n🎯 Next Steps:')
    console.log('1. Update .env.example with this token account address')
    console.log('2. Caisper can now receive USDC payments via x402')
    console.log('3. Run observation tests to verify payment flow')
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
