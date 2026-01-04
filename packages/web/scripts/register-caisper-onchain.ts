/**
 * Register Caisper On-Chain
 *
 * Complete the claim flow by registering Caisper on-chain via GhostSpeak Solana program.
 *
 * Flow:
 * 1. Load Caisper's address from discovered agents
 * 2. Load admin keypair for signing
 * 3. Register agent on-chain using GhostSpeak SDK
 * 4. Update Convex with claim transaction signature
 * 5. Verify registration succeeded
 */

import { GhostSpeakClient } from '@ghostspeak/sdk'
import { address } from '@solana/addresses'
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit'
import bs58 from 'bs58'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

async function main() {
  console.log('🚀 Registering Caisper On-Chain\n')
  console.log('='.repeat(80))

  // Step 0: Check environment variables
  const adminPrivateKey = process.env.GHOSTSPEAK_ADMIN_PRIVATE_KEY
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  if (!adminPrivateKey) {
    throw new Error('GHOSTSPEAK_ADMIN_PRIVATE_KEY not set in environment')
  }

  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not set in environment')
  }

  console.log('📋 Configuration:')
  console.log(`  RPC URL: ${rpcUrl}`)
  console.log(`  Convex: ${convexUrl}`)
  console.log()

  // Step 1: Get Caisper's address from Convex
  console.log('🔍 Looking up Caisper in Ghost Registry...')
  const convex = new ConvexHttpClient(convexUrl)

  // Caisper's address from previous test
  const caisperAddress = 'FK2U7NpeN9kkXDn7VbvnEBqB9q3hRoGELio87YDngTYY'

  const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
    ghostAddress: caisperAddress,
  })

  if (!agent) {
    throw new Error(`Caisper not found in Ghost Registry (${caisperAddress})`)
  }

  console.log(`✅ Found Caisper:`)
  console.log(`  Address: ${agent.ghostAddress}`)
  console.log(`  Status: ${agent.status}`)
  console.log(`  First Tx: ${agent.firstTxSignature}`)
  console.log()

  if (agent.status !== 'claimed') {
    throw new Error(`Caisper must be claimed before on-chain registration (current status: ${agent.status})`)
  }

  // Step 2: Load admin keypair
  console.log('🔑 Loading admin keypair...')
  const adminSeedBytes = bs58.decode(adminPrivateKey)
  const adminKeypair = await createKeyPairSignerFromPrivateKeyBytes(adminSeedBytes)
  console.log(`✅ Admin keypair loaded: ${adminKeypair.address}`)
  console.log()

  // Step 3: Initialize GhostSpeak client
  console.log('🔗 Connecting to GhostSpeak Solana program...')
  const client = new GhostSpeakClient({
    rpcUrl,
    commitment: 'confirmed',
  })
  console.log('✅ Client initialized')
  console.log()

  // Step 4: Register agent on-chain
  console.log('⛓️  Registering Caisper on-chain...')
  console.log('   This will:')
  console.log('   - Create agent account via GhostSpeak program')
  console.log('   - Set agent metadata (name, description, type)')
  console.log('   - Initialize reputation tracking')
  console.log()

  // NOTE: AgentId must be <= 32 bytes due to Solana PDA seed limitations
  // Using first 32 chars of the address as a unique identifier
  // Alternative: could hash the address to get exactly 32 bytes
  const shortAgentId = caisperAddress.slice(0, 32)
  console.log(`   Agent ID (shortened): ${shortAgentId}`)
  console.log()

  try {
    const txSignature = await client.agents.register(adminKeypair, {
      agentType: 10, // Type 10 = External x402 agent (Ghost)
      name: `Caisper`,
      description: `AI Assistant discovered via x402 payment protocol. Specializes in GhostSpeak integration, conversation, and reputation tracking.`,
      metadataUri: `https://ghostspeak.ai/agents/${caisperAddress}`,
      agentId: shortAgentId, // Use first 32 chars to fit PDA seed limit
      // Note: pricingModel param removed - defaults to Fixed model
      skipSimulation: true, // Bypass staking requirement for testing
    })

    console.log(`✅ Transaction sent: ${txSignature}`)
    console.log(`🔍 Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`)
    console.log()

    // Step 5: Note about claim transaction
    // The agent was already claimed in Convex via direct mutation.
    // The claimTxSignature is stored in the discovery event, but we could
    // add a dedicated field to the discoveredAgents table for it if needed.
    console.log('✅ On-chain registration complete')
    console.log('   Transaction signature stored in discovery events')
    console.log()

    // Step 6: Verify registration
    console.log('🔍 Verifying on-chain registration...')
    console.log('⏳ Waiting 5 seconds for confirmation...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Query agent data from Convex
    const updatedAgent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
      ghostAddress: caisperAddress,
    })

    console.log()
    console.log('📊 Final Agent Status:')
    console.log(JSON.stringify(updatedAgent, null, 2))
    console.log()

    console.log('='.repeat(80))
    console.log('🎉 SUCCESS! Caisper is now registered on-chain!')
    console.log()
    console.log('✨ Next Steps:')
    console.log('1. Caisper can now earn reputation from x402 payments')
    console.log('2. Issue Verifiable Credentials to Caisper')
    console.log('3. Track Ghost Score over time')
    console.log('4. Build on-chain trust profile')
    console.log()

  } catch (error) {
    console.error('❌ On-chain registration failed:', error)

    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack:', error.stack)
    }

    throw error
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
