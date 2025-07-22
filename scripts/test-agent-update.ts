#!/usr/bin/env node
/**
 * Test script to verify agent update functionality
 */

import { createGhostSpeakClient } from '@ghostspeak/sdk'
import { readKeyPairFromPath } from '@solana/kit'
import { createRpc } from '@solana/rpc'
import { address } from '@solana/addresses'

async function testAgentUpdate() {
  console.log('🧪 Testing Agent Update Functionality\n')
  
  try {
    // Load wallet
    const walletPath = process.env.WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`
    const wallet = await readKeyPairFromPath(walletPath)
    console.log(`✅ Wallet loaded: ${wallet.address}`)
    
    // Create RPC client
    const rpc = createRpc('https://api.devnet.solana.com')
    console.log('✅ Connected to Solana devnet')
    
    // Initialize client
    const client = createGhostSpeakClient({ rpc, wallet })
    console.log('✅ GhostSpeak client initialized\n')
    
    // Create a test agent first
    console.log('📝 Creating test agent...')
    const agentId = `test_agent_${Date.now()}`
    const agentAddress = await client.agent.create(wallet, {
      name: 'Test Agent for Update',
      description: 'This is a test agent to verify update functionality',
      category: 'automation',
      capabilities: ['testing', 'debugging'],
      metadataUri: '',
      serviceEndpoint: 'https://test.example.com'
    })
    
    console.log(`✅ Agent created:`)
    console.log(`   Address: ${agentAddress}`)
    console.log(`   Agent ID: ${agentId}\n`)
    
    // Wait a bit for blockchain confirmation
    console.log('⏳ Waiting for blockchain confirmation...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Now test the update
    console.log('🔄 Testing agent update...')
    const updateSignature = await client.agent.update(
      wallet,
      address(agentAddress),
      agentId, // Pass the agent_id we used during creation
      {
        description: 'Updated description - testing update functionality',
        capabilities: ['testing', 'debugging', 'automation'],
        serviceEndpoint: 'https://updated.example.com'
      }
    )
    
    console.log(`✅ Agent updated successfully!`)
    console.log(`   Update signature: ${updateSignature}`)
    console.log(`   Explorer: https://explorer.solana.com/tx/${updateSignature}?cluster=devnet\n`)
    
    // Verify the update
    console.log('🔍 Verifying update...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const updatedAgent = await client.agent.get({ agentAddress: address(agentAddress) })
    if (updatedAgent) {
      console.log('✅ Agent data after update:')
      console.log(`   Name: ${updatedAgent.name}`)
      console.log(`   Description: ${updatedAgent.description}`)
      console.log(`   Service Endpoint: ${updatedAgent.serviceEndpoint}`)
      console.log(`   Capabilities: ${updatedAgent.capabilities.join(', ')}`)
      
      // Check if metadata contains the updated info
      if (updatedAgent.metadataUri?.startsWith('data:application/json')) {
        try {
          const base64Data = updatedAgent.metadataUri.split(',')[1] ?? ''
          const metadata = JSON.parse(Buffer.from(base64Data, 'base64').toString())
          console.log('\n📋 Metadata:')
          console.log(JSON.stringify(metadata, null, 2))
        } catch {
          console.log('\n⚠️  Could not parse metadata')
        }
      }
    } else {
      console.error('❌ Failed to fetch updated agent')
    }
    
    console.log('\n✅ Test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testAgentUpdate().catch(console.error)