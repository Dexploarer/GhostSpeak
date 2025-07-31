/**
 * GhostSpeak Quick Start Example
 * 
 * This example shows the basics of using the GhostSpeak SDK
 */

import GhostSpeak, { sol } from '@ghostspeak/sdk'
import type { GhostSpeak as GS } from '@ghostspeak/sdk'
import { generateKeyPairSigner } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('🚀 GhostSpeak Quick Start Example')
  console.log('═══════════════════════════════════')

  // 1. Create client with zero-config
  const ghostspeak = new GhostSpeak()
  
  // 2. Create a test keypair (in production, use wallet adapter)
  const signer = await generateKeyPairSigner()
  console.log('📝 Test wallet:', signer.address)

  // 3. Create an AI Agent
  console.log('\n📤 Creating AI Agent...')
  
  try {
    // Use the agent module directly for now
    const agentModule = ghostspeak.agent()
    
    // Register a new agent
    const signature = await agentModule.register(signer, {
      agentType: 1, // Specialized agent
      metadataUri: JSON.stringify({
        name: "Quick Start Assistant",
        description: "AI assistant for quick start demo",
        capabilities: ["coding", "debugging", "documentation"],
        version: "1.0.0"
      }),
      agentId: "quick-start-assistant"
    })

    console.log('✅ Agent created successfully!')
    console.log(`   Transaction: ${signature}`)
    
  } catch (error) {
    handleError(error)
  }

  // 4. Query the created agent
  console.log('\n📊 Querying agent details...')
  
  try {
    const agentAddress = agentModule.deriveAgentPda("quick-start-assistant")
    const agentData = await agentModule.getAccount(agentAddress)
    
    if (agentData) {
      console.log('📋 Agent Details:')
      console.log(`   Type: ${agentData.agentType}`)
      console.log(`   Active: ${agentData.isActive}`)
      console.log(`   Created: ${agentData.createdAt}`)
    } else {
      console.log('⚠️ Agent data not found (may need to wait for confirmation)')
    }
  } catch (error) {
    console.log('⚠️ Could not fetch agent data:', error instanceof Error ? error.message : String(error))
  }

  // 5. Demonstrate Type Safety
  demonstrateTypes()

  console.log('\n✨ Quick start complete!')
}

/**
 * Demonstrate GhostSpeak's comprehensive type system
 */
function demonstrateTypes() {
  console.log('\n📝 Type System Demo:')

  // Demonstrate basic type usage
  const amount = sol(10) // bigint
  console.log(`   💰 Amount: ${amount} lamports`)
  
  // Show address type safety
  const testAddress: Address = 'GhostSpeakAddress123' as Address
  console.log(`   📍 Address: ${testAddress}`)

  console.log('   ✅ Full type safety with TypeScript')
  console.log('   ✅ Proper Address and amount handling')
  console.log('   ✅ Import types for better performance')
}

/**
 * Handle errors with proper error handling
 */
function handleError(error: unknown) {
  console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))
  
  // In production, you might want more sophisticated error handling
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack)
  }
}

// Run the example
main().catch(handleError)