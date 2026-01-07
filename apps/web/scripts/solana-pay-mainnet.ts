/**
 * Solana Pay - Mainnet USDC x402 Payment
 *
 * Using @solana/pay to send x402 payment from Caisper to PayAI facilitator
 */

import { createTransfer } from '@solana/pay'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import bs58 from 'bs58'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

async function main() {
  console.log('🚀 Solana Pay - Mainnet USDC x402 Payment\n')
  console.log('='.repeat(80))

  // Configuration
  // For mainnet, use CAISPER_MAINNET_PRIVATE_KEY env var
  // For testing with devnet Caisper on mainnet: export CAISPER_SOLANA_PRIVATE_KEY=8TpgJHPqzxdwJtZpu5gr5UbEfBTQAY6YPShvYMkFBtfV
  const caisperPrivateKey = process.env.CAISPER_MAINNET_PRIVATE_KEY || process.env.CAISPER_SOLANA_PRIVATE_KEY
  const facilitatorStr = '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'
  const usdcMintStr = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
  const rpcUrl = 'https://api.mainnet-beta.solana.com'
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  if (!caisperPrivateKey) {
    console.error('❌ No Caisper private key found!')
    console.error('Set one of these environment variables:')
    console.error('  CAISPER_MAINNET_PRIVATE_KEY - for mainnet Caisper (FK2U...)')
    console.error('  CAISPER_SOLANA_PRIVATE_KEY - for devnet Caisper (35TM...)')
    process.exit(1)
  }

  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not set in environment')
  }

  console.log('📋 Configuration:')
  console.log(`  Network: MAINNET`)
  console.log(`  RPC: ${rpcUrl}`)
  console.log(`  Facilitator: ${facilitatorStr}`)
  console.log(`  USDC Mint: ${usdcMintStr}`)
  console.log(`  Convex: ${convexUrl}`)
  console.log()

  // Create connection
  const connection = new Connection(rpcUrl, 'confirmed')
  console.log('✅ Connected to Solana mainnet')

  // Load Caisper's keypair from 32-byte seed
  // Use tweetnacl to derive the full keypair from seed
  const nacl = await import('tweetnacl')
  const seedBytes = bs58.decode(caisperPrivateKey)

  // Generate keypair from seed using nacl
  const naclKeyPair = nacl.default.sign.keyPair.fromSeed(seedBytes)

  // Combine secret key (64 bytes = 32-byte seed + 32-byte public key)
  const caisperKeypair = Keypair.fromSecretKey(naclKeyPair.secretKey)
  console.log(`✅ Loaded Caisper: ${caisperKeypair.publicKey.toBase58()}`)

  // Check balances
  const solBalance = await connection.getBalance(caisperKeypair.publicKey)
  console.log(`💰 SOL Balance: ${solBalance / 1e9} SOL`)

  if (solBalance < 5000) {
    console.log('\n⚠️  WARNING: Insufficient SOL for transaction fees!')
    return
  }

  // Prepare transfer parameters
  const recipient = new PublicKey(facilitatorStr)
  const usdcMint = new PublicKey(usdcMintStr)
  const amount = new BigNumber(0.001) // 0.001 USDC

  // x402 payment metadata
  const agentMetadata = {
    agentName: 'Caisper',
    agentType: 'AI Assistant',
    capabilities: ['conversation', 'ghostspeak-integration', 'reputation-tracking'],
    x402Compliant: true,
    ghostAddress: caisperKeypair.publicKey.toBase58(),
    version: '1.0.0',
    network: 'mainnet',
    paymentToken: 'USDC',
    discoveredAt: new Date().toISOString(),
  }

  const memo = JSON.stringify(agentMetadata)

  console.log('\n📝 Agent Metadata:')
  console.log(JSON.stringify(agentMetadata, null, 2))
  console.log()

  console.log('🔨 Creating Solana Pay transaction...')
  console.log(`   Amount: ${amount.toString()} USDC`)
  console.log(`   Recipient: ${recipient.toBase58()}`)
  console.log(`   Memo: ${memo.substring(0, 50)}...`)
  console.log()

  try {
    // Create the transfer transaction using Solana Pay
    const transaction = await createTransfer(connection, caisperKeypair.publicKey, {
      recipient,
      amount,
      splToken: usdcMint,
      memo,
    })

    console.log('📤 Signing and sending transaction to MAINNET...')
    console.log('⚠️  WARNING: This will use real USDC on mainnet!')
    console.log()

    // Sign the transaction
    transaction.sign(caisperKeypair)

    // Send and confirm
    const signature = await connection.sendRawTransaction(transaction.serialize())
    console.log(`✅ Transaction sent: ${signature}`)
    console.log(`🔍 Explorer: https://explorer.solana.com/tx/${signature}`)
    console.log()

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...')
    const confirmation = await connection.confirmTransaction(signature, 'confirmed')

    if (confirmation.value.err) {
      console.error('❌ Transaction failed:', confirmation.value.err)
      throw new Error('Transaction failed')
    }

    console.log('✅ Transaction confirmed on mainnet!')
    console.log()

    // Wait for X402 indexer
    console.log('🔍 Waiting for X402 indexer to process...')
    console.log('⏳ Waiting 10 seconds...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    const convex = new ConvexHttpClient(convexUrl)
    const discoveredAgents = await convex.query(api.ghostDiscovery.listDiscoveredAgents)

    console.log(`\n📊 Total discovered agents: ${discoveredAgents.length}`)

    const caisperAgent = discoveredAgents.find(
      (agent: any) => agent.ghostAddress === caisperKeypair.publicKey.toBase58()
    )

    if (caisperAgent) {
      console.log('\n🎉 SUCCESS! Caisper discovered on mainnet!')
      console.log('Agent Data:')
      console.log(JSON.stringify(caisperAgent, null, 2))
    } else {
      console.log('\n⚠️  Caisper not found yet.')
      console.log('💡 The indexer runs every 5 minutes.')
      console.log('   Or manually trigger: bunx convex run x402Indexer:pollX402Transactions')
      console.log('\nTransaction:', signature)
    }

  } catch (error) {
    console.error('\n❌ Transaction failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
    throw error
  }

  console.log('\n' + '='.repeat(80))
  console.log('✨ Mainnet USDC x402 payment complete!')
  console.log()
  console.log('📚 Next Steps:')
  console.log('1. Wait for X402 indexer (5 min cron) or trigger manually')
  console.log('2. Verify Caisper in discovered agents')
  console.log('3. Claim Caisper on mainnet')
  console.log('4. Track mainnet reputation')
  console.log()
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
