/**
 * Simple test for the PodAI Client - Workspace compatible
 */

console.log('🚀 Testing PodAI Client in workspace...\n');

async function testPodAIClient() {
  try {
    // Import our client
    const { createPodAIClient, generateKeypair } = await import('./src/client.js');
    console.log('✅ Successfully imported PodAI client\n');
    
    // Create client
    const client = createPodAIClient({
      rpcUrl: 'https://api.devnet.solana.com',
      network: 'devnet',
      commitment: 'confirmed'
    });
    console.log('✅ Client created successfully\n');
    
    // Initialize client
    console.log('📡 Initializing client...');
    const initialized = await client.initialize();
    console.log(`✅ Client initialized: ${initialized}\n`);
    
    // Test network health
    console.log('🏥 Testing network health...');
    const health = await client.getNetworkHealth();
    console.log(`Block Height: ${health.blockHeight.toLocaleString()}`);
    console.log(`TPS: ${health.tps}`);
    console.log(`Slot Time: ${health.averageSlotTime}ms\n`);
    
    // Test compression metrics
    console.log('🗜️ Testing compression metrics...');
    const compression = await client.getCompressionMetrics();
    console.log(`Total Accounts: ${compression.totalAccounts.toLocaleString()}`);
    console.log(`Compressed: ${compression.compressedAccounts.toLocaleString()}`);
    console.log(`Savings: ${compression.estimatedSavings.toFixed(4)} SOL\n`);
    
    // Test agent registration
    console.log('🤖 Testing agent registration...');
    const agentResult = await client.registerAgent('DEMO_PAYER_' + Date.now(), {
      name: 'Test Agent',
      description: 'Test workspace agent',
      capabilities: ['testing', 'validation']
    });
    console.log(`Agent ID: ${agentResult.agentId}`);
    console.log(`Compressed: ${agentResult.compressed}\n`);
    
    // Test keypair generation
    console.log('🔑 Testing keypair generation...');
    const keypair = await generateKeypair();
    console.log(`Public Key: ${keypair.publicKey}`);
    console.log(`Secret Key: ${keypair.secretKey.slice(0, 16)}...\n`);
    
    // Clean up
    await client.disconnect();
    
    console.log('🎉 All tests passed! PodAI client is working in workspace.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testPodAIClient(); 