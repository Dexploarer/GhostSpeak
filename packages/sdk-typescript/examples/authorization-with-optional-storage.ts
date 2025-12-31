/**
 * Example: Authorization with Optional On-Chain Storage
 *
 * Demonstrates GhostSpeak's flexible authorization storage:
 * - Off-chain (default): Free, lightweight
 * - On-chain: ~0.002 SOL, provides audit trail
 *
 * Run: bun run examples/authorization-with-optional-storage.ts
 */

import { GhostSpeakClient } from '../src/core/GhostSpeakClient.js'
import { Keypair } from '@solana/web3.js'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('🔐 GhostSpeak Authorization - On-Chain Storage Demo')
  console.log('='.repeat(60))

  // Initialize client
  const client = new GhostSpeakClient({
    network: 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  })

  // Generate test keypairs (in production, use actual agent keys)
  const agentKeypair = Keypair.generate()
  const facilitatorAddress = Keypair.generate().publicKey.toBase58() as Address

  console.log('\n👤 Participants:')
  console.log('  Agent:', agentKeypair.publicKey.toBase58())
  console.log('  Facilitator:', facilitatorAddress)

  // =========================================================================
  // Scenario 1: Off-Chain Authorization (Default - Free)
  // =========================================================================

  console.log('\n📝 Scenario 1: Off-Chain Authorization (Free)')
  console.log('-'.repeat(60))

  const offChainAuth = await client.authorization.createAuthorization({
    authorizedSource: facilitatorAddress,
    indexLimit: 1000,
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    network: 'devnet',
    // No on-chain storage configuration = defaults to off-chain (free)
  }, agentKeypair)

  console.log('✅ Authorization created (off-chain)')
  console.log('   Index Limit:', offChainAuth.indexLimit)
  console.log('   Expires:', new Date(offChainAuth.expiresAt * 1000).toISOString())
  console.log('   Cost: FREE (no on-chain storage)')
  console.log('\n💡 Use case: Low-stakes authorizations, high-volume updates')
  console.log('   The signed authorization is shared directly with facilitator')

  // =========================================================================
  // Scenario 2: On-Chain Authorization (Audit Trail)
  // =========================================================================

  console.log('\n📦 Scenario 2: On-Chain Authorization (Audit Trail)')
  console.log('-'.repeat(60))

  // First, estimate the cost
  const estimatedCost = await client.authorization.estimateStorageCost({
    authorizedSource: facilitatorAddress,
    expiresIn: 30 * 24 * 60 * 60,
  })

  console.log(`💰 Estimated storage cost: ${estimatedCost} SOL (~$${(estimatedCost * 100).toFixed(2)} at $100/SOL)`)

  const onChainAuth = await client.authorization.createAuthorization({
    authorizedSource: facilitatorAddress,
    indexLimit: 1000,
    expiresIn: 30 * 24 * 60 * 60,
    network: 'devnet',
    onChainStorage: {
      enabled: true,
      autoStore: false, // We'll store manually to show the process
      feePayedByAgent: true, // Agent pays for their authorization storage
    }
  }, agentKeypair)

  console.log('✅ Authorization created (configured for on-chain)')
  console.log('   Status: Signature generated, pending on-chain storage')
  console.log('\n💡 Use case: High-value authorizations, compliance requirements')

  // Note: To actually store on-chain, you need a funded wallet:
  // const { keypairToTransactionSigner } = await import('../tests/utils/test-signers.js')
  // const agentSigner = await keypairToTransactionSigner(agentKeypair)
  // const signature = await client.authorization.storeAuthorizationOnChain(onChainAuth, agentSigner)
  // console.log('   Transaction:', signature)

  console.log('\n⚠️  To store on-chain:')
  console.log('   1. Ensure agent wallet has ~0.002 SOL')
  console.log('   2. Call: client.authorization.storeAuthorizationOnChain(auth, signer)')
  console.log('   3. Authorization is stored as immutable on-chain record')

  // =========================================================================
  // Scenario 3: Custom Fee Structure (Tiered Pricing)
  // =========================================================================

  console.log('\n💎 Scenario 3: Custom Fee Structure (Tiered Pricing)')
  console.log('-'.repeat(60))

  const tierConfig = {
    // 7 days = 0.001 SOL
    604800: 1000000n,
    // 30 days = 0.0015 SOL
    2592000: 1500000n,
    // 90 days = 0.002 SOL
    7776000: 2000000n,
  }

  // Short-duration authorization (cheaper)
  const shortCost = await client.authorization.estimateStorageCost({
    authorizedSource: facilitatorAddress,
    expiresIn: 7 * 24 * 60 * 60, // 7 days
  }, {
    customFees: tierConfig
  })

  console.log(`   7-day authorization: ${shortCost} SOL`)

  // Medium-duration authorization
  const mediumCost = await client.authorization.estimateStorageCost({
    authorizedSource: facilitatorAddress,
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  }, {
    customFees: tierConfig
  })

  console.log(`  30-day authorization: ${mediumCost} SOL`)

  // Long-duration authorization
  const longCost = await client.authorization.estimateStorageCost({
    authorizedSource: facilitatorAddress,
    expiresIn: 90 * 24 * 60 * 60, // 90 days
  }, {
    customFees: tierConfig
  })

  console.log(`  90-day authorization: ${longCost} SOL`)

  console.log('\n💡 Use case: Incentivize shorter authorizations, tiered pricing model')

  // =========================================================================
  // Scenario 4: Facilitator-Paid Storage
  // =========================================================================

  console.log('\n🤝 Scenario 4: Facilitator-Paid Storage')
  console.log('-'.repeat(60))

  const facilitatorPaidAuth = await client.authorization.createAuthorization({
    authorizedSource: facilitatorAddress,
    indexLimit: 1000,
    expiresIn: 30 * 24 * 60 * 60,
    network: 'devnet',
    onChainStorage: {
      enabled: true,
      autoStore: false,
      feePayedByAgent: false, // Facilitator pays for storage
      storageFee: 1500000n, // Custom fee: 0.0015 SOL
    }
  }, agentKeypair)

  console.log('✅ Authorization created (facilitator-paid storage)')
  console.log('   Storage Cost: 0.0015 SOL')
  console.log('   Fee Payer: Facilitator')
  console.log('\n💡 Use case: Facilitator wants on-chain proof, agent has limited funds')

  // =========================================================================
  // Summary & Recommendations
  // =========================================================================

  console.log('\n📊 Storage Strategy Recommendations')
  console.log('='.repeat(60))
  console.log('\n✅ Use Off-Chain (Default/Free) When:')
  console.log('   • Low-stakes reputation updates')
  console.log('   • High-volume, short-lived authorizations')
  console.log('   • Cost is a primary concern')
  console.log('   • Direct agent-facilitator relationship')

  console.log('\n✅ Use On-Chain (~0.002 SOL) When:')
  console.log('   • High-value authorizations need transparency')
  console.log('   • Regulatory/compliance requirements')
  console.log('   • Public audit trail desired')
  console.log('   • Multi-party verification needed')

  console.log('\n💡 Best Practice:')
  console.log('   Start with off-chain (free) for most use cases')
  console.log('   Upgrade to on-chain selectively for high-value scenarios')
  console.log('   Use custom fee tiers to incentivize desired behavior')

  console.log('\n✨ Demo complete!')
}

main().catch(error => {
  console.error('\n💥 Error:', error)
  process.exit(1)
})
