/**
 * Find PayAI Facilitator Address
 *
 * This script helps you discover the Solana blockchain address used by PayAI's
 * facilitator to receive x402 payments. You need this address to enable on-chain
 * polling in GhostSpeak.
 *
 * Usage:
 * 1. Make a test x402 payment via PayAI facilitator
 * 2. Get the transaction signature from the webhook
 * 3. Run this script:
 *
 *    bun run scripts/find-payai-facilitator-address.ts <transaction_signature> [network]
 *
 * Example:
 *    bun run scripts/find-payai-facilitator-address.ts 5wHu7...xyz devnet
 */

import { createSolanaRpc, type Address } from '@solana/web3.js'

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('❌ Error: Transaction signature required\n')
  console.log('Usage:')
  console.log('  bun run scripts/find-payai-facilitator-address.ts <signature> [network]\n')
  console.log('Example:')
  console.log('  bun run scripts/find-payai-facilitator-address.ts 5wHu7JQvK... devnet\n')
  console.log('Network options: devnet (default), mainnet\n')
  process.exit(1)
}

const signature = args[0]
const network = args[1] || 'devnet'

// Validate network
if (!['devnet', 'mainnet'].includes(network)) {
  console.error('❌ Error: Network must be "devnet" or "mainnet"\n')
  process.exit(1)
}

// RPC endpoints
const RPC_ENDPOINTS = {
  devnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  mainnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
}

const rpcUrl = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS]

console.log('🔍 Finding PayAI Facilitator Address...\n')
console.log(`Network: ${network}`)
console.log(`RPC: ${rpcUrl}`)
console.log(`Signature: ${signature}\n`)

async function findFacilitatorAddress() {
  try {
    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl)

    // Fetch transaction
    console.log('📥 Fetching transaction from blockchain...')
    const transaction = await rpc
      .getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        encoding: 'jsonParsed',
      })
      .send()

    if (!transaction) {
      console.error('❌ Transaction not found')
      console.log('\nPossible reasons:')
      console.log('1. Transaction signature is incorrect')
      console.log('2. Transaction is on a different network (try --network mainnet/devnet)')
      console.log('3. Transaction is too old (pruned from RPC node)')
      process.exit(1)
    }

    console.log('✅ Transaction found!\n')

    // Parse instructions to find SPL token transfer
    const instructions = transaction.transaction.message.instructions

    console.log('🔎 Analyzing transaction instructions...\n')

    let facilitatorAddress: Address | null = null
    let tokenMint: string | null = null
    let amount: string | null = null
    let payerAddress: string | null = null
    let merchantAddress: string | null = null

    // Look for SPL token transfer instructions
    for (const [index, instruction] of instructions.entries()) {
      const parsed = (instruction as any).parsed

      if (parsed && (parsed.type === 'transfer' || parsed.type === 'transferChecked')) {
        const info = parsed.info

        console.log(`Instruction ${index + 1}: SPL Token Transfer`)
        console.log(`  Type: ${parsed.type}`)
        console.log(`  Source: ${info.source || info.authority}`)
        console.log(`  Destination: ${info.destination}`)
        console.log(`  Amount: ${info.amount || info.tokenAmount?.amount}`)

        if (info.mint) {
          console.log(`  Token Mint: ${info.mint}`)
        }

        console.log()

        // The facilitator is typically the destination of the first token transfer
        if (!facilitatorAddress) {
          facilitatorAddress = info.destination as Address
          tokenMint = info.mint || null
          amount = info.amount || info.tokenAmount?.amount || null
          payerAddress = info.source || info.authority
        }
      }
    }

    if (!facilitatorAddress) {
      console.error('❌ No SPL token transfer found in this transaction')
      console.log('\nThis transaction may not be an x402 payment.')
      console.log('x402 payments should contain at least one SPL token transfer instruction.\n')
      process.exit(1)
    }

    // Extract account keys for merchant identification
    const accountKeys = transaction.transaction.message.accountKeys
    if (accountKeys.length > 1) {
      // Merchant is typically one of the writable accounts
      merchantAddress = accountKeys[1]?.pubkey?.toString() || null
    }

    // Success! Display results
    console.log('🎉 PayAI Facilitator Address Found!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log('📋 Add this to your .env.local:')
    console.log()
    console.log(`NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=${facilitatorAddress}`)
    console.log(`X402_POLLING_ENABLED=true`)
    console.log()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log('📊 Payment Details:')
    console.log()
    console.log(`  Facilitator: ${facilitatorAddress}`)
    console.log(`  Payer: ${payerAddress || 'Unknown'}`)
    console.log(`  Merchant: ${merchantAddress || 'Unknown'}`)
    console.log(`  Amount: ${amount ? Number(amount) / 1_000_000 : 'Unknown'} USDC`)
    console.log(`  Token Mint: ${tokenMint || 'Unknown'}`)
    console.log()
    console.log('🔗 View on Explorer:')
    console.log(
      `  https://explorer.solana.com/tx/${signature}${network === 'devnet' ? '?cluster=devnet' : ''}`
    )
    console.log()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log('✅ Setup Complete!')
    console.log()
    console.log('Next steps:')
    console.log('1. Add the facilitator address to your .env.local (see above)')
    console.log('2. Run: bunx convex dev (to deploy Convex functions)')
    console.log('3. Initialize sync state via Convex dashboard or script')
    console.log('4. On-chain polling will start automatically every 5 minutes')
    console.log()
  } catch (error) {
    console.error('❌ Error:', error)

    if (error instanceof Error) {
      console.log('\nError details:', error.message)
    }

    process.exit(1)
  }
}

// Run the script
findFacilitatorAddress()
