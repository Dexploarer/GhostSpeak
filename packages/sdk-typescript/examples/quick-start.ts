/**
 * GhostSpeak SDK Quick Start Example
 * 
 * This example demonstrates the new fluent API and zero-config setup
 */

import GhostSpeak, { sol } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'

async function main() {
  // Create client with zero-config (defaults to devnet)
  const ghostspeak = new GhostSpeak()

  // Or configure for mainnet
  // const ghostspeak = new GhostSpeak().useNetwork('mainnet-beta')

  // Or use custom RPC
  // const ghostspeak = new GhostSpeak().useRpc('https://my-rpc.com')

  // Create a signer (in real app, use wallet adapter)
  const signer = await Keypair.generate()

  try {
    // =====================================================
    // Create an AI Agent (5000x cheaper with compression)
    // =====================================================
    
    const agent = await ghostspeak
      .agent()
      .create({
        name: "Code Assistant",
        capabilities: ["typescript", "solana", "rust"]
      })
      .withType(1) // Specialized agent
      .compressed() // Use state compression (5000x cheaper!)
      .execute()

    console.log('✅ Agent created:', agent.address)
    console.log('   Transaction:', agent.signature)

    // =====================================================
    // Create an Escrow with Milestones
    // =====================================================
    
    const buyer = 'BuyerAddressHere' as Address
    const seller = 'SellerAddressHere' as Address

    const escrow = await ghostspeak
      .escrow()
      .between(buyer, seller)
      .amount(sol(100))
      .description("Website Development")
      .withMilestones([
        { amount: sol(30), description: "Design Phase" },
        { amount: sol(50), description: "Development Phase" },
        { amount: sol(20), description: "Testing & Deployment" }
      ])
      .execute()

    console.log('✅ Escrow created:', escrow.address)

    // =====================================================
    // Create a Communication Channel
    // =====================================================
    
    const channel = await ghostspeak
      .channel()
      .create("dev-updates")
      .description("Development progress updates")
      .private()
      .maxMembers(10)
      .execute()

    console.log('✅ Channel created:', channel.address)

    // =====================================================
    // Query Data with Type Safety
    // =====================================================
    
    // Get agent details
    const agentModule = ghostspeak.agent()
    const agentData = await agentModule.getAccount(agent.address)
    
    if (agentData) {
      console.log('📊 Agent Details:')
      console.log('   Type:', agentData.agentType)
      console.log('   Active:', agentData.isActive)
      console.log('   Verified:', agentData.isVerified)
    }

    // Get all user's agents
    const myAgents = await agentModule.getUserAgents(signer.address)
    console.log(`📋 Found ${myAgents.length} agents`)

    // =====================================================
    // Error Handling with Solutions
    // =====================================================
    
    try {
      // This will fail with helpful error message
      await ghostspeak
        .escrow()
        .between(buyer, seller)
        .amount(sol(1000000)) // Too much!
        .execute()
    } catch (error) {
      // Smart errors provide solutions
      console.error('❌ Error:', error.message)
      console.error('💡 Solution:', error.solution)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

// =====================================================
// Advanced Examples
// =====================================================

async function advancedExamples() {
  const ghostspeak = new GhostSpeak()
    .useNetwork('devnet')
    .enableDevMode() // Enable debugging features

  // Estimate costs before execution
  const cost = await ghostspeak
    .agent()
    .create({ name: "Test", capabilities: [] })
    .getCost()
  
  console.log(`💰 Estimated cost: ${cost} lamports`)

  // Simulate transaction
  const simulation = await ghostspeak
    .agent()
    .create({ name: "Test", capabilities: [] })
    .simulate()
  
  console.log('🧪 Simulation result:', simulation)

  // Debug transaction (shows decoded tx before sending)
  const debugResult = await ghostspeak
    .agent()
    .create({ name: "Test", capabilities: [] })
    .debug()
    .execute()
}

// =====================================================
// Type-Safe Development
// =====================================================

import { GhostSpeak } from '@ghostspeak/sdk'

function typeExamples() {
  // All types under GhostSpeak namespace
  const agent: GhostSpeak.Agent = {
    address: '...' as Address,
    type: GhostSpeak.AgentType.Specialized,
    owner: '...' as Address,
    metadata: {
      name: "Assistant",
      description: "AI coding assistant",
      capabilities: ["code", "debug"]
    },
    reputation: {
      score: 95,
      jobsCompleted: 10,
      successRate: 1.0,
      totalEarnings: 1000000000n,
      ratings: []
    },
    isActive: true,
    isVerified: true,
    createdAt: new Date()
  }

  // Type-safe error handling
  function handleResult(result: GhostSpeak.Result<string>) {
    if (result.success) {
      console.log('Success:', result.data)
      console.log('Explorer:', result.explorer)
    } else {
      console.error('Error:', result.error.message)
      console.error('Solution:', result.error.solution)
    }
  }
}

// Run the example
main().catch(console.error)