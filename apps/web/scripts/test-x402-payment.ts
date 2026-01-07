/**
 * Test x402 Payment for Caisper Discovery
 *
 * This script simulates an x402 payment from Caisper to trigger agent discovery.
 * The X402TransactionIndexer should pick up this payment and add Caisper to Convex.
 *
 * Flow:
 * 1. Create SPL token transfer from Caisper to PayAI facilitator
 * 2. Add memo with agent metadata
 * 3. Sign and send transaction
 * 4. Wait for X402TransactionIndexer to process
 * 5. Verify Caisper appears in discovered agents
 */

import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { address } from '@solana/addresses'
import bs58 from 'bs58'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

// Types for modern Solana SDK
type Address = ReturnType<typeof address>

async function main() {
  console.log('🚀 Testing x402 Payment Discovery Flow\n')
  console.log('=' .repeat(80))

  // Step 0: Check environment variables
  const caisperPrivateKey = process.env.CAISPER_SOLANA_PRIVATE_KEY
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const facilitatorAddressStr = process.env.GHOSTSPEAK_MERCHANT_ADDRESS || '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  if (!caisperPrivateKey) {
    throw new Error('CAISPER_SOLANA_PRIVATE_KEY not set in environment')
  }

  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not set in environment')
  }

  console.log('📋 Configuration:')
  console.log(`  RPC URL: ${rpcUrl}`)
  console.log(`  Facilitator: ${facilitatorAddressStr}`)
  console.log(`  Convex: ${convexUrl}`)
  console.log()

  // Step 1: Create RPC client
  const rpc = createSolanaRpc(rpcUrl)
  console.log('✅ Connected to Solana RPC')

  // Step 2: Load Caisper's keypair
  // The private key in .env is actually a 32-byte seed, not a 64-byte keypair
  // We need to use @solana/kit to create the keypair from the seed
  const { createKeyPairSignerFromPrivateKeyBytes } = await import('@solana/kit')
  const seedBytes = bs58.decode(caisperPrivateKey)

  // Create keypair signer from seed (32 bytes)
  const caisperSigner = await createKeyPairSignerFromPrivateKeyBytes(seedBytes)
  console.log(`✅ Loaded Caisper keypair: ${caisperSigner.address}`)

  // Step 3: Check Caisper's balance
  try {
    const balance = await rpc.getBalance(caisperSigner.address).send()
    console.log(`💰 Caisper balance: ${Number(balance.value) / 1e9} SOL`)

    if (Number(balance.value) < 1_000_000) {
      console.log('\n⚠️  WARNING: Caisper has insufficient balance!')
      console.log('Run: solana airdrop 2 35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt --url devnet')
      return
    }
  } catch (error) {
    console.error('❌ Failed to check balance:', error)
    return
  }

  // Step 4: Prepare payment metadata
  const agentMetadata = {
    agentName: 'Caisper',
    agentType: 'AI Assistant',
    capabilities: ['conversation', 'ghostspeak-integration', 'reputation-tracking'],
    x402Compliant: true,
    ghostAddress: caisperSigner.address,
    version: '1.0.0',
    discoveredAt: new Date().toISOString(),
  }

  console.log('\n📝 Agent Metadata:')
  console.log(JSON.stringify(agentMetadata, null, 2))

  // Step 5: Create transaction with memo
  const facilitatorAddress: Address = address(facilitatorAddressStr)
  const memoData = JSON.stringify(agentMetadata)

  console.log('\n🔨 Creating x402 payment transaction...')

  /**
   * NOTE: For now, we're using a simple SOL transfer to test the discovery flow.
   * In production, this should be an SPL token transfer (USDC).
   *
   * The X402TransactionIndexer is configured to detect:
   * 1. Transactions TO the facilitator address
   * 2. With memo instructions containing agent metadata
   * 3. SPL token transfers (but also works with SOL for testing)
   */

  try {
    // Use @solana/kit for simpler transaction building
    const { createTransaction } = await import('@solana/kit')
    const { getTransferSolInstruction } = await import('@solana-program/system')

    // Get recent blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    // Create memo instruction
    const memoInstruction = {
      programAddress: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      accounts: [],
      data: new TextEncoder().encode(memoData),
    }

    // Create transfer instruction (0.001 SOL test payment)
    const transferInstruction = getTransferSolInstruction({
      source: caisperSigner,
      destination: facilitatorAddress,
      amount: 1_000_000n, // 0.001 SOL (lamports)
    })

    // Build and send transaction using kit
    const tx = await createTransaction({
      feePayer: caisperSigner,
      instructions: [memoInstruction, transferInstruction],
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    })

    console.log('📤 Sending transaction...')

    // Sign and send
    const { signTransaction } = await import('@solana/kit')
    const signedTx = await signTransaction(tx, [caisperSigner])

    // Send to RPC
    const signature = await rpc.sendTransaction(signedTx, {
      encoding: 'base64',
      skipPreflight: false,
    }).send()

    console.log(`✅ Transaction sent: ${signature}`)
    console.log(`🔍 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

    // Step 6: Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...')

    // Poll for confirmation (simplified approach)
    let confirmed = false
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max

    while (!confirmed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++

      try {
        const status = await rpc.getSignatureStatuses([signature]).send()
        if (status.value[0]?.confirmationStatus === 'confirmed' || status.value[0]?.confirmationStatus === 'finalized') {
          confirmed = true
        }
      } catch (error) {
        // Continue polling
      }

      process.stdout.write(`\r⏳ Waiting for confirmation... ${attempts}s`)
    }

    if (confirmed) {
      console.log('\n✅ Transaction confirmed!')
    } else {
      console.log('\n⚠️  Transaction not confirmed within 30s (may still succeed)')
    }

    // Step 7: Check if X402TransactionIndexer picked it up
    console.log('\n🔍 Checking Convex for discovered agent...')
    console.log('⏳ Waiting 5 seconds for indexer to process...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    const convex = new ConvexHttpClient(convexUrl)
    const discoveredAgents = await convex.query(api.ghostDiscovery.getDiscoveredAgents)

    console.log(`\n📊 Total discovered agents: ${discoveredAgents.length}`)

    const caisperAgent = discoveredAgents.find(
      (agent: any) => agent.ghostAddress === caisperSigner.address
    )

    if (caisperAgent) {
      console.log('\n🎉 SUCCESS! Caisper was discovered!')
      console.log('Agent Data:')
      console.log(JSON.stringify(caisperAgent, null, 2))
    } else {
      console.log('\n⚠️  Caisper not found in discovered agents yet.')
      console.log('This may be because:')
      console.log('1. X402TransactionIndexer is not running')
      console.log('2. Indexer polling interval hasn\'t elapsed yet')
      console.log('3. Transaction memo parsing failed')
      console.log('\nCheck the indexer logs for more details.')
      console.log('\nAll discovered agents:')
      console.log(JSON.stringify(discoveredAgents, null, 2))
    }

  } catch (error) {
    console.error('\n❌ Transaction failed:', error)

    if (error instanceof Error) {
      console.error('Error details:', error.message)

      // Check for common errors
      if (error.message.includes('insufficient')) {
        console.log('\n💡 Tip: Fund Caisper\'s wallet:')
        console.log(`solana airdrop 2 ${caisperSigner.address} --url devnet`)
      }
    }

    throw error
  }

  console.log('\n' + '='.repeat(80))
  console.log('✨ Test complete!')
  console.log('\n📚 Next Steps:')
  console.log('1. If Caisper was discovered: Navigate to /caisper page')
  console.log('2. Query: "What agents are available?"')
  console.log('3. Click "Claim Now" on Caisper')
  console.log('4. Verify on-chain registration succeeds')
  console.log()
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
