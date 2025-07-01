/**
 * Test script for agent service
 */

import { generateKeyPairSigner } from '@solana/signers';

import { createDevnetClient } from '../client-v2';

async function testAgentService() {
  console.log('🧪 Testing Agent Service...');

  try {
    // Create client
    const client = createDevnetClient();
    console.log('✅ Client created');

    // Test health check
    const health = await client.healthCheck();
    console.log('✅ Health check:', health);

    // Generate test keypair
    const keypair = await generateKeyPairSigner();
    console.log('✅ Test keypair generated:', keypair.address);

    // Test agent registration (mock for now)
    const signature = await client.agents.registerAgent(keypair, {
      capabilities: 1,
      metadataUri: 'https://example.com/metadata.json',
    });
    console.log('✅ Agent registration signature:', signature);

    // Test getting agent PDA
    const agentPDA = await client.agents.getAgentPDA(keypair.address);
    console.log('✅ Agent PDA:', agentPDA);

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAgentService();
