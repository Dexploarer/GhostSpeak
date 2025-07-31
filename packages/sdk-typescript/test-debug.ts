#!/usr/bin/env bun

import { AgentModule } from './src/core/modules/AgentModule.js'
import { generateKeyPairSigner } from '@solana/kit'

async function testAgentRegister() {
  try {
    console.log('🧪 Testing agent register with debug output...')
    
    // Generate a keypair and fund it manually
    const signer = await generateKeyPairSigner()
    console.log('✅ Created test signer:', signer.address)
    console.log('💰 Please fund this address with: solana airdrop 1', signer.address, '--url devnet')
    console.log('💰 Stopping here - please run the airdrop command above first')
    return
    
    // Initialize agent module directly
    const agentModule = new AgentModule({
      cluster: 'devnet',
      programId: '3yCZtq3dK1WDoz88kryyK7Cv6d9fpNdsbQHFbxcLe9ot',
      commitment: 'confirmed'
    })
    
    console.log('✅ Agent module initialized')
    
    // Test agent registration with debug
    const result = await agentModule.register(signer, {
      agentType: 1,
      metadataUri: 'https://example.com/metadata.json',
      agentId: 'test-debug-003'
    })
    
    console.log('✅ Agent registration result:', result)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
  }
}

testAgentRegister()