/**
 * GhostSpeak Quick Start Example
 * 
 * This example shows the basics of using the GhostSpeak SDK
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('🚀 GhostSpeak Quick Start Example')
  console.log('═══════════════════════════════════')

  // 1. Create client with zero-config
  const ghostspeak = new GhostSpeak()
  
  // Enable development mode for extra logging
  ghostspeak.enableDevMode()

  // 2. Create a test keypair (in production, use wallet adapter)
  const signer = await Keypair.generate()
  console.log('📝 Test wallet:', signer.address)

  // 3. Create an AI Agent
  console.log('\n📤 Creating AI Agent...')
  
  // First, let's see what this will cost
  const agentCost = await ghostspeak
    .agent()
    .create({ 
      name: "Quick Start Assistant",
      capabilities: ["coding", "debugging", "documentation"]
    })
    .getCost()
  
  console.log(`💰 Agent creation will cost: ${(Number(agentCost) / 1e9).toFixed(6)} SOL`)

  // Get a human-readable explanation
  const explanation = await ghostspeak
    .agent()
    .create({
      name: "Quick Start Assistant",
      capabilities: ["coding", "debugging", "documentation"]
    })
    .explain()
  
  console.log('\n📋 Transaction Explanation:')
  console.log(explanation)

  // Now create the agent with debug mode
  try {
    const agent = await ghostspeak
      .agent()
      .create({
        name: "Quick Start Assistant",
        capabilities: ["coding", "debugging", "documentation"]
      })
      .compressed() // Use state compression (5000x cheaper!)
      .debug()      // Show transaction details
      .execute()

    console.log('\n✅ Agent created successfully!')
    console.log(`   Address: ${agent.address}`)
    console.log(`   Transaction: ${agent.signature}`)
    
  } catch (error) {
    handleError(error)
  }

  // 4. Create an Escrow
  console.log('\n📤 Creating Escrow...')
  
  const buyer = 'BuyerAddressHere' as Address
  const seller = 'SellerAddressHere' as Address

  // Check escrow cost
  const escrowCost = await ghostspeak
    .escrow()
    .between(buyer, seller)
    .amount(sol(10))
    .description("Quick Start Demo")
    .getCost()
  
  console.log(`💰 Escrow creation will cost: ${(Number(escrowCost) / 1e9).toFixed(6)} SOL`)

  // 5. Create a Channel
  console.log('\n📤 Creating Channel...')
  
  try {
    const channel = await ghostspeak
      .channel()
      .create("quick-start-chat")
      .description("Demo channel for quick start")
      .private()
      .maxMembers(5)
      .debug()
      .execute()

    console.log('\n✅ Channel created successfully!')
    console.log(`   Address: ${channel.address}`)
    
  } catch (error) {
    handleError(error)
  }

  // 6. Demonstrate Type Safety
  demonstrateTypes()

  console.log('\n✨ Quick start complete!')
}

/**
 * Demonstrate GhostSpeak's comprehensive type system
 */
function demonstrateTypes() {
  console.log('\n📝 Type System Demo:')

  // All types under GhostSpeak namespace
  const agent: GS.Agent = {
    address: 'AgentAddress123' as Address,
    type: GS.AgentType.Specialized,
    owner: 'OwnerAddress456' as Address,
    metadata: {
      name: "Demo Agent",
      description: "Example agent for type demo",
      capabilities: ["example", "demo"]
    },
    reputation: {
      score: 95,
      jobsCompleted: 5,
      successRate: 1.0,
      totalEarnings: sol(100),
      ratings: []
    },
    isActive: true,
    isVerified: false,
    createdAt: new Date()
  }

  console.log('   ✅ Full type safety and IntelliSense')
  console.log('   ✅ All types under GhostSpeak namespace')
  console.log('   ✅ Comprehensive error types with solutions')
}

/**
 * Handle errors with GhostSpeak's smart error system
 */
function handleError(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    const gsError = error as GS.SDKError
    console.error('\n❌ Error:', gsError.message)
    
    if (gsError.solution) {
      console.log('💡 Solution:', gsError.solution)
    }
    
    if (gsError.context) {
      console.log('📊 Context:', gsError.context)
    }
  } else {
    console.error('\n❌ Error:', error)
  }
}

// Run the example
main().catch(handleError)