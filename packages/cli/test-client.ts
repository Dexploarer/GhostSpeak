/**
 * Test script for PodAI Client - No V1 Dependencies
 * 
 * This script tests the client without complex CLI dependencies
 */

import { createPodAIClient, generateKeypair } from './src/client.js';

async function testClient() {
  console.log('🚀 Testing PodAI Client...\n');

  try {
    // Create client
    const client = createPodAIClient({
      rpcUrl: 'https://api.devnet.solana.com',
      network: 'devnet',
      commitment: 'confirmed'
    });

    // Initialize
    console.log('📡 Initializing client...');
    const initialized = await client.initialize();
    console.log(`✅ Client initialized: ${initialized}\n`);

    // Test network health
    console.log('🏥 Getting network health...');
    const health = await client.getNetworkHealth();
    console.log(`Block Height: ${health.blockHeight}`);
    console.log(`TPS: ${health.tps}`);
    console.log(`Slot Time: ${health.averageSlotTime}ms\n`);

    // Test compression metrics
    console.log('🗜️ Getting compression metrics...');
    const compression = await client.getCompressionMetrics();
    console.log(`Total Accounts: ${compression.totalAccounts.toLocaleString()}`);
    console.log(`Compressed: ${compression.compressedAccounts.toLocaleString()}`);
    console.log(`Savings: ${compression.estimatedSavings.toFixed(4)} SOL\n`);

    // Test agent registration
    console.log('🤖 Testing agent registration...');
    const payerAddress = 'TEST_PAYER_' + Date.now();
    const agentResult = await client.registerAgent(payerAddress, {
      name: 'Test Agent',
      description: 'Test agent for validation',
      capabilities: ['testing', 'validation']
    });
    console.log(`Agent ID: ${agentResult.agentId}`);
    console.log(`Transaction: ${agentResult.transaction}`);
    console.log(`Compressed: ${agentResult.compressed}\n`);

    // Test keypair generation
    console.log('🔑 Testing keypair generation...');
    const keypair = await generateKeypair();
    console.log(`Public Key: ${keypair.publicKey}`);
    console.log(`Secret Key: ${keypair.secretKey.slice(0, 16)}...\n`);

    // Test channel creation
    console.log('💬 Testing channel creation...');
    const channelResult = await client.createChannel(
      payerAddress,
      'Test Channel',
      ['PARTICIPANT_1', 'PARTICIPANT_2']
    );
    console.log(`Channel ID: ${channelResult.channelId}`);
    console.log(`Transaction: ${channelResult.transaction}`);
    console.log(`Compression: ${channelResult.compressionEnabled}\n`);

    // Test message sending
    console.log('📨 Testing message sending...');
    const messageResult = await client.sendMessage(
      payerAddress,
      channelResult.channelId,
      'Hello from test script!',
      true
    );
    console.log(`Message ID: ${messageResult.messageId}`);
    console.log(`Compression Savings: ${messageResult.savingsPercent}%\n`);

    // Cleanup
    await client.disconnect();
    console.log('✅ All tests passed! Client is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testClient(); 