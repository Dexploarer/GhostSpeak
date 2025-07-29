/**
 * Basic Agent Creation Example
 * 
 * Shows how to create, update, and manage AI agents
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'

async function main() {
  console.log('🤖 Basic Agent Management Example')
  console.log('═══════════════════════════════════')

  const ghostspeak = new GhostSpeak().enableDevMode()
  const signer = await Keypair.generate()

  // 1. Create a Basic Agent
  console.log('\n📤 Creating basic agent...')
  
  const agent = await ghostspeak
    .agent()
    .create({
      name: "Code Assistant",
      capabilities: [
        "typescript",
        "react", 
        "solana",
        "debugging",
        "code-review"
      ]
    })
    .withType(GS.AgentType.Specialized)
    .execute()

  console.log('✅ Agent created:')
  console.log(`   Address: ${agent.address}`)
  console.log(`   Transaction: ${agent.signature}`)

  // 2. Retrieve Agent Details
  console.log('\n📊 Retrieving agent details...')
  
  const agentModule = ghostspeak.agent()
  const agentData = await agentModule.getAccount(agent.address)
  
  if (agentData) {
    console.log('📋 Agent Details:')
    console.log(`   Type: ${agentData.agentType}`)
    console.log(`   Active: ${agentData.isActive}`)
    console.log(`   Verified: ${agentData.isVerified}`)
    console.log(`   Created: ${agentData.createdAt}`)
  }

  // 3. Update Agent Metadata
  console.log('\n📝 Updating agent metadata...')
  
  try {
    const updateTx = await agentModule.update(signer, {
      agentAddress: agent.address,
      metadataUri: JSON.stringify({
        name: "Senior Code Assistant",
        description: "Updated description with more capabilities",
        capabilities: [
          "typescript",
          "react",
          "solana",
          "debugging", 
          "code-review",
          "architecture-design",
          "performance-optimization"
        ],
        avatar: "https://example.com/avatar.png",
        website: "https://my-agent.com",
        socialLinks: {
          twitter: "https://twitter.com/my-agent",
          github: "https://github.com/my-agent"
        }
      })
    })
    
    console.log('✅ Agent updated successfully')
    console.log(`   Transaction: ${updateTx}`)
    
  } catch (error) {
    console.error('❌ Failed to update agent:', error)
  }

  // 4. Verify Agent (requires verification authority)
  console.log('\n✅ Verifying agent...')
  
  try {
    const verifyTx = await agentModule.verify(signer, {
      agentAddress: agent.address,
      verificationData: BigInt(Date.now()) // Timestamp as verification
    })
    
    console.log('✅ Agent verified successfully')
    console.log(`   Transaction: ${verifyTx}`)
    
  } catch (error) {
    console.warn('⚠️ Verification failed (may require special authority):', error.message)
  }

  // 5. Query User's Agents
  console.log('\n📋 Querying user agents...')
  
  const userAgents = await agentModule.getUserAgents(signer.address)
  console.log(`Found ${userAgents.length} agents owned by user`)
  
  for (const [index, { address, data }] of userAgents.entries()) {
    console.log(`   Agent ${index + 1}:`)
    console.log(`     Address: ${address}`)
    console.log(`     Type: ${data.agentType}`)
    console.log(`     Active: ${data.isActive}`)
  }

  // 6. Query Agents by Type
  console.log('\n🔍 Querying specialized agents...')
  
  const specializedAgents = await agentModule.getAgentsByType(GS.AgentType.Specialized)
  console.log(`Found ${specializedAgents.length} specialized agents`)

  // 7. Deactivate Agent (if needed)
  console.log('\n⏸️ Deactivating agent...')
  
  try {
    const deactivateTx = await agentModule.deactivate(signer, agent.address)
    console.log('✅ Agent deactivated')
    console.log(`   Transaction: ${deactivateTx}`)
    
    // Reactivate for demo
    const activateTx = await agentModule.activate(signer, agent.address)
    console.log('✅ Agent reactivated')
    console.log(`   Transaction: ${activateTx}`)
    
  } catch (error) {
    console.error('❌ Failed to deactivate/activate agent:', error)
  }

  // 8. Demonstrate Cost Estimation
  console.log('\n💰 Cost estimation for different operations:')
  
  const createCost = await ghostspeak
    .agent()
    .create({ name: "Test", capabilities: ["test"] })
    .getCost()
  
  console.log(`   Agent creation: ${(Number(createCost) / 1e9).toFixed(6)} SOL`)

  console.log('\n✨ Basic agent management complete!')
}

main().catch(console.error)