/**
 * Example demonstrating REAL Web3.js v2 transaction execution
 * This shows the complete flow from instruction building to blockchain submission
 */

import { createSolanaRpc, createDefaultRpcTransport, generateKeyPairSigner } from '@solana/kit'
import { GhostSpeakClient } from '../client/GhostSpeakClient.js'
import { getRegisterAgentInstruction } from '../generated/index.js'
import { deriveAgentPda, deriveUserRegistryPda } from '../utils/pda.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'

/**
 * Example: Register an agent using REAL blockchain transaction
 */
export async function registerAgentExample() {
  console.log('🚀 Starting REAL agent registration example...')
  
  try {
    // 1. Setup RPC connection (use devnet for testing)
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    
    // 2. Create GhostSpeak client
    const client = GhostSpeakClient.create(rpc, GHOSTSPEAK_PROGRAM_ID)
    
    // 3. Generate a new keypair for the agent owner
    const agentOwner = await generateKeyPairSigner()
    console.log(`👤 Agent owner: ${agentOwner.address}`)
    
    // 4. Derive necessary PDAs
    const agentPda = await deriveAgentPda(GHOSTSPEAK_PROGRAM_ID, agentOwner.address, 'my-ai-agent')
    const userRegistryPda = await deriveUserRegistryPda(GHOSTSPEAK_PROGRAM_ID)
    
    console.log(`🤖 Agent PDA: ${agentPda}`)
    console.log(`📋 User Registry PDA: ${userRegistryPda}`)
    
    // 5. Prepare agent registration parameters
    const agentParams = {
      agentType: 1, // General purpose agent
      metadataUri: 'https://example.com/agent-metadata.json',
      agentId: 'my-ai-agent'
    }
    
    // 6. Execute REAL transaction using the SDK
    console.log('📤 Sending REAL transaction to Solana devnet...')
    
    const signature = await client.registerAgent(
      agentOwner,
      agentPda,
      userRegistryPda,
      agentParams
    )
    
    console.log(`🎉 SUCCESS! Agent registered with signature: ${signature}`)
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    
    // 7. Verify the agent was created by fetching it back
    console.log('🔍 Fetching registered agent...')
    const registeredAgent = await client.getAgent(agentPda)
    
    if (registeredAgent) {
      console.log('✅ Agent successfully retrieved from blockchain:')
      console.log(`   Agent ID: ${registeredAgent.agentId}`)
      console.log(`   Owner: ${registeredAgent.owner}`)
      console.log(`   Metadata URI: ${registeredAgent.metadataUri}`)
      console.log(`   Active: ${registeredAgent.isActive}`)
    } else {
      console.log('⚠️ Agent not found (transaction may still be processing)')
    }
    
    return signature
    
  } catch (error) {
    console.error('❌ Transaction failed:', error)
    throw error
  }
}

/**
 * Example: Estimate costs before sending transaction
 */
export async function estimateTransactionCost() {
  console.log('💰 Estimating transaction costs...')
  
  try {
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc)
    
    const agentOwner = await generateKeyPairSigner()
    const agentPda = await deriveAgentPda(GHOSTSPEAK_PROGRAM_ID, agentOwner.address, 'test-agent')
    const userRegistryPda = await deriveUserRegistryPda(GHOSTSPEAK_PROGRAM_ID)
    
    // Build the instruction
    const instruction = getRegisterAgentInstruction({
      agentAccount: agentPda,
      userRegistry: userRegistryPda,
      signer: agentOwner,
      agentType: 1,
      metadataUri: 'https://example.com/metadata.json',
      agentId: 'test-agent'
    })
    
    // Get REAL cost estimation
    const estimatedCost = await client.agent.estimateTransactionCost([instruction], agentOwner.address)
    
    console.log(`💳 Estimated transaction cost: ${estimatedCost} lamports (${Number(estimatedCost) / 1_000_000_000} SOL)`)
    
    return estimatedCost
    
  } catch (error) {
    console.error('❌ Cost estimation failed:', error)
    throw error
  }
}

/**
 * Example: Simulate transaction before sending
 */
export async function simulateTransaction() {
  console.log('🧪 Running transaction simulation...')
  
  try {
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc)
    
    const agentOwner = await generateKeyPairSigner()
    const agentPda = await deriveAgentPda(GHOSTSPEAK_PROGRAM_ID, agentOwner.address, 'sim-agent')
    const userRegistryPda = await deriveUserRegistryPda(GHOSTSPEAK_PROGRAM_ID)
    
    // Build the instruction
    const instruction = getRegisterAgentInstruction({
      agentAccount: agentPda,
      userRegistry: userRegistryPda,
      signer: agentOwner,
      agentType: 1,
      metadataUri: 'https://example.com/metadata.json',
      agentId: 'sim-agent'
    })
    
    // Run REAL simulation
    const simulation = await client.agent.simulateTransaction([instruction], [agentOwner])
    
    console.log('✅ Simulation results:')
    console.log(`   Success: ${!simulation.err}`)
    console.log(`   Compute units consumed: ${simulation.unitsConsumed || 'N/A'}`)
    console.log(`   Log entries: ${simulation.logs?.length || 0}`)
    
    if (simulation.logs) {
      console.log('📋 Transaction logs:')
      simulation.logs.forEach((log, i) => console.log(`   ${i + 1}. ${log}`))
    }
    
    return simulation
    
  } catch (error) {
    console.error('❌ Simulation failed:', error)
    throw error
  }
}

// Example usage (uncomment to run):
// registerAgentExample().catch(console.error)
// estimateTransactionCost().catch(console.error)
// simulateTransaction().catch(console.error)