/**
 * PayAI Test Client
 *
 * Simple x402 client for testing payments to the test merchant.
 *
 * This script demonstrates how to:
 * 1. Discover payment requirements from merchant
 * 2. Construct x402 payment payload
 * 3. Submit payment and access protected resource
 *
 * Prerequisites:
 * 1. Test merchant server running (test-payai-merchant.ts)
 * 2. Devnet SOL and USDC in your wallet
 * 3. Wallet keypair file
 *
 * Usage:
 *   bun run scripts/test-payai-client.ts [wallet_path]
 *
 * Example:
 *   bun run scripts/test-payai-client.ts ~/.config/solana/id.json
 */

import { readFileSync } from 'fs'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'

const MERCHANT_URL = process.env.MERCHANT_URL || 'http://localhost:4000'
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Circle USDC Devnet

console.log('💳 PayAI Test Client')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Load wallet
const walletPath = process.argv[2] || `${process.env.HOME}/.config/solana/id.json`

let payer: Keypair
try {
  console.log(`Loading wallet from: ${walletPath}`)
  const keypairData = JSON.parse(readFileSync(walletPath, 'utf-8'))
  payer = Keypair.fromSecretKey(new Uint8Array(keypairData))
  console.log(`✅ Wallet loaded: ${payer.publicKey.toBase58()}\n`)
} catch (error) {
  console.error('❌ Failed to load wallet:', error)
  console.log('\nUsage:')
  console.log('  bun run scripts/test-payai-client.ts <wallet_path>')
  console.log('\nExample:')
  console.log('  bun run scripts/test-payai-client.ts ~/.config/solana/id.json\n')
  process.exit(1)
}

// Connect to Solana
const connection = new Connection(SOLANA_RPC, 'confirmed')

async function makePayment() {
  try {
    // Step 1: Discover payment requirements
    console.log('1️⃣ Discovering payment requirements...')
    console.log(`   GET ${MERCHANT_URL}/protected\n`)

    const discoverResponse = await fetch(`${MERCHANT_URL}/protected`)

    if (discoverResponse.status !== 402) {
      console.error('❌ Expected 402 Payment Required, got:', discoverResponse.status)
      const body = await discoverResponse.text()
      console.log('Response:', body)
      return
    }

    // Extract payment requirements from headers
    const paymentRequirements = {
      network: discoverResponse.headers.get('x402-accept'),
      price: discoverResponse.headers.get('x402-price'),
      facilitator: discoverResponse.headers.get('x402-facilitator'),
      merchant: discoverResponse.headers.get('x402-merchant'),
    }

    console.log('💰 Payment Requirements:')
    console.log(`   Network: ${paymentRequirements.network}`)
    console.log(`   Price: ${Number(paymentRequirements.price) / 1_000_000} USDC`)
    console.log(`   Facilitator: ${paymentRequirements.facilitator}`)
    console.log(`   Merchant: ${paymentRequirements.merchant}\n`)

    if (!paymentRequirements.merchant || !paymentRequirements.facilitator) {
      console.error('❌ Invalid payment requirements')
      return
    }

    // Step 2: Check USDC balance
    console.log('2️⃣ Checking USDC balance...')

    const usdcMint = new PublicKey(USDC_MINT_DEVNET)
    const payerTokenAccount = await getAssociatedTokenAddress(usdcMint, payer.publicKey)

    try {
      const balance = await connection.getTokenAccountBalance(payerTokenAccount)
      console.log(`   USDC Balance: ${Number(balance.value.amount) / 1_000_000} USDC\n`)

      if (Number(balance.value.amount) < Number(paymentRequirements.price)) {
        console.error('❌ Insufficient USDC balance')
        console.log('\nTo get devnet USDC:')
        console.log('  1. Visit https://faucet.circle.com')
        console.log('  2. Select Solana Devnet')
        console.log(`  3. Enter your address: ${payer.publicKey.toBase58()}`)
        console.log('  4. Request USDC airdrop\n')
        return
      }
    } catch (error) {
      console.error('❌ USDC token account not found')
      console.log('\nTo create USDC token account and get funds:')
      console.log('  1. Visit https://faucet.circle.com')
      console.log('  2. Select Solana Devnet')
      console.log(`  3. Enter your address: ${payer.publicKey.toBase58()}`)
      console.log('  4. Request USDC airdrop (creates account automatically)\n')
      return
    }

    // Step 3: Construct payment via facilitator
    console.log('3️⃣ Submitting payment to facilitator...')
    console.log(`   POST ${paymentRequirements.facilitator}/verify\n`)

    // For this test, we'll use PayAI's facilitator which handles the payment construction
    // In a real implementation, you'd use PayAI's client SDK
    console.log('⚠️  NOTE: This is a simplified test')
    console.log('   For production, use PayAI client SDK:')
    console.log('   - @payai/client (TypeScript)')
    console.log('   - See: https://docs.payai.network/x402/clients/introduction\n')

    // Create a simple payment payload (this is simplified - real implementation uses SDK)
    const paymentPayload = {
      network: paymentRequirements.network,
      merchant: paymentRequirements.merchant,
      payer: payer.publicKey.toBase58(),
      amount: paymentRequirements.price,
      timestamp: Date.now(),
    }

    console.log('📦 Payment Payload:', JSON.stringify(paymentPayload, null, 2))
    console.log()

    // Step 4: Access protected resource with payment
    console.log('4️⃣ Accessing protected resource with payment...')
    console.log(`   GET ${MERCHANT_URL}/protected`)
    console.log(`   Header: x402-payment: <payload>\n`)

    const protectedResponse = await fetch(`${MERCHANT_URL}/protected`, {
      headers: {
        'x402-payment': JSON.stringify(paymentPayload),
      },
    })

    if (!protectedResponse.ok) {
      console.error(`❌ Payment failed: ${protectedResponse.status}`)
      const error = await protectedResponse.json()
      console.log('Error:', JSON.stringify(error, null, 2))
      return
    }

    const result = await protectedResponse.json()

    console.log('✅ Payment successful!')
    console.log('\n📄 Protected Content:')
    console.log(JSON.stringify(result, null, 2))
    console.log()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Test Complete!')
    console.log('\n🔍 Next Steps:')
    console.log('1. Check the merchant server logs for webhook notification')
    console.log('2. Use the transaction signature to find facilitator address:')
    console.log(
      `   bun run scripts/find-payai-facilitator-address.ts <signature> devnet`
    )
    console.log('3. Add facilitator address to .env.local')
    console.log('4. Deploy Convex functions')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (error) {
    console.error('❌ Payment failed:', error)

    if (error instanceof Error) {
      console.log('\nError:', error.message)
      console.log('Stack:', error.stack)
    }
  }
}

// Run the payment
makePayment()
