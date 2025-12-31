/**
 * Devnet Setup Script
 *
 * Initializes required on-chain accounts for E2E testing:
 * 1. Staking config (if not already initialized)
 * 2. Test agent registration
 *
 * Run: bun run tests/setup/devnet-setup.ts
 */

import { GhostSpeakClient } from '../../src/core/GhostSpeakClient.js'
import { loadDevnetWallet, loadDevnetKeypair } from '../utils/test-signers.js'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('🔧 GhostSpeak Devnet Setup')
  console.log('='.repeat(50))

  // Load funded devnet wallet
  const wallet = await loadDevnetWallet()
  const keypair = loadDevnetKeypair()

  console.log('\n📍 Configuration:')
  console.log('  Wallet:', keypair.publicKey.toBase58())
  console.log('  Network: devnet')
  console.log('  RPC:', process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com')

  // Initialize client
  const client = new GhostSpeakClient({
    network: 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  })

  // Check SOL balance
  const { createSolanaRpc } = await import('@solana/kit')
  const rpc = createSolanaRpc(client['config'].rpcEndpoint ?? 'https://api.devnet.solana.com')
  const balanceResult = await rpc.getBalance(wallet.address).send()
  const balance = typeof balanceResult === 'object' && 'value' in balanceResult
    ? balanceResult.value
    : BigInt(balanceResult)

  console.log(`  SOL Balance: ${Number(balance) / 1e9} SOL`)

  if (Number(balance) < 1e9) {
    console.error('\n❌ Insufficient SOL! Need at least 1 SOL for devnet testing.')
    console.log('   Airdrop: solana airdrop 2 ' + keypair.publicKey.toBase58() + ' --url devnet')
    process.exit(1)
  }

  // Step 1: Initialize staking config
  console.log('\n📦 Step 1: Initialize Staking Config')
  console.log('-'.repeat(50))

  try {
    // Derive staking config PDA
    const { getProgramDerivedAddress, getBytesEncoder } = await import('@solana/kit')
    const [stakingConfigPda] = await getProgramDerivedAddress({
      programAddress: client.staking.getProgramId(),
      seeds: [
        getBytesEncoder().encode(new Uint8Array([115, 116, 97, 107, 105, 110, 103, 95, 99, 111, 110, 102, 105, 103])) // "staking_config"
      ]
    })

    console.log('  Staking Config PDA:', stakingConfigPda)

    // Check if already initialized
    const existingConfig = await client.staking.getStakingConfig(stakingConfigPda)

    if (existingConfig) {
      console.log('  ✅ Staking config already initialized')
      console.log('     Min Stake:', existingConfig.minStake.toString())
      console.log('     Treasury:', existingConfig.treasury)
    } else {
      console.log('  📝 Initializing new staking config...')

      const signature = await client.staking.initializeStakingConfig({
        authority: wallet,
        minStake: BigInt(1000000), // 1 GHOST (6 decimals)
        treasury: wallet.address, // Use our wallet as treasury for testing
      })

      console.log('  ✅ Staking config initialized!')
      console.log('     Transaction:', signature)
      console.log('     Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet')
    }
  } catch (error) {
    console.error('  ❌ Failed to initialize staking config:', error)
    throw error
  }

  // Step 2: Register test agent
  console.log('\n👤 Step 2: Register Test Agent')
  console.log('-'.repeat(50))

  try {
    const agentId = `e2e-test-agent-${Date.now()}`

    console.log('  📝 Registering agent...')
    console.log('     Agent ID:', agentId)

    const signature = await client.agents.register(wallet, {
      agentId,
      agentType: 1,
      name: 'E2E Test Agent',
      description: 'Agent for E2E authorization testing',
      metadataUri: 'https://test.ghostspeak.dev/metadata.json',
      skipSimulation: false
    })

    // Derive agent address
    const { deriveAgentPda } = await import('../../src/utils/pda.js')
    const [agentAddress] = await deriveAgentPda({
      programAddress: client.agents.getProgramId(),
      owner: wallet.address,
      agentId
    })

    console.log('  ✅ Agent registered successfully!')
    console.log('     Agent Address:', agentAddress)
    console.log('     Transaction:', signature)
    console.log('     Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet')

    // Save agent info for tests
    console.log('\n💾 Test Configuration')
    console.log('-'.repeat(50))
    console.log('Add to .env.test:')
    console.log(`TEST_AGENT_ID=${agentId}`)
    console.log(`TEST_AGENT_ADDRESS=${agentAddress}`)
    console.log(`TEST_WALLET=${keypair.publicKey.toBase58()}`)

  } catch (error) {
    console.error('  ❌ Failed to register agent:', error)
    throw error
  }

  console.log('\n✅ Devnet setup complete!')
  console.log('   You can now run: bun test tests/e2e/authorization-flow.test.ts')
}

main().catch(error => {
  console.error('\n💥 Setup failed:', error)
  process.exit(1)
})
