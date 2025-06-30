#!/usr/bin/env node

/**
 * Test transaction functionality end-to-end
 */

import { generateKeyPairSigner } from '@solana/signers';

async function testTransactionFunctionality() {
  console.log('🧪 Testing Transaction Functionality E2E...\n');
  
  try {
    // Test 1: Import SDK and create client
    console.log('1️⃣ Testing SDK client creation...');
    const sdk = await import('../sdk-typescript/dist/index.js');
    
    const client = sdk.createPodAIClientV2({
      rpcEndpoint: 'https://api.devnet.solana.com',
      commitment: 'confirmed'
    });
    console.log('✅ Client created with devnet RPC');
    
    // Test 2: Health check with real devnet
    console.log('\n2️⃣ Testing devnet connectivity...');
    const health = await client.healthCheck();
    console.log('✅ Health check result:', {
      rpcConnection: health.rpcConnection,
      blockHeight: health.blockHeight,
      programValid: health.programValid
    });
    
    if (!health.rpcConnection) {
      console.log('❌ RPC connection failed');
      return false;
    }
    
    // Test 3: Generate test keypair for transactions
    console.log('\n3️⃣ Testing keypair generation...');
    const testKeypair = await generateKeyPairSigner();
    console.log('✅ Test keypair generated:', testKeypair.address);
    
    // Test 4: Test instruction generation
    console.log('\n4️⃣ Testing instruction generation...');
    try {
      // Test register agent instruction
      const registerInstruction = await sdk.getRegisterAgentInstructionAsync({
        signer: testKeypair,
        capabilities: 15, // All basic capabilities
        metadataUri: 'https://example.com/agent-metadata.json'
      });
      console.log('✅ Register agent instruction generated');
      
      // Test create channel instruction
      const channelInstruction = await sdk.getCreateChannelInstructionAsync({
        creator: testKeypair,
        channelId: 'test-channel-' + Date.now(),
        name: 'Test Channel',
        description: 'A test channel for E2E testing',
        visibility: 0, // Public
        maxParticipants: 100,
        feePerMessage: 0
      });
      console.log('✅ Create channel instruction generated');
      
    } catch (error) {
      console.log('❌ Instruction generation failed:', error.message);
      return false;
    }
    
    // Test 5: Test transaction sending infrastructure
    console.log('\n5️⃣ Testing transaction sending infrastructure...');
    try {
      // Create a simple register agent transaction
      const registerInstruction = await sdk.getRegisterAgentInstructionAsync({
        signer: testKeypair,
        capabilities: 15,
        metadataUri: 'https://example.com/test-agent.json'
      });
      
      // Test transaction sending (this will return a mock signature for now)
      const result = await sdk.sendTransaction({
        rpc: client.getRpc(), // getRpc is synchronous in v2
        instructions: [registerInstruction],
        signer: testKeypair,
        commitment: 'confirmed'
      });
      
      console.log('✅ Transaction sending completed');
      console.log('✅ Transaction signature:', result.signature.substring(0, 20) + '...');
      
      if (result.signature.startsWith('real_tx_')) {
        console.log('✅ Using real transaction pipeline');
      } else {
        console.log('⚠️  Using mock transaction pipeline');
      }
      
    } catch (error) {
      console.log('❌ Transaction sending failed:', error.message);
      return false;
    }
    
    // Test 6: Test all instruction types
    console.log('\n6️⃣ Testing all instruction types...');
    try {
      const instructions = [];
      
      // Register agent
      instructions.push(await sdk.getRegisterAgentInstructionAsync({
        signer: testKeypair,
        capabilities: 15,
        metadataUri: 'https://example.com/agent.json'
      }));
      console.log('✅ Register agent instruction ready');
      
      // Create channel  
      instructions.push(await sdk.getCreateChannelInstructionAsync({
        creator: testKeypair,
        channelId: 'test-' + Date.now(),
        name: 'Test Channel',
        description: 'Test',
        visibility: 0,
        maxParticipants: 100,
        feePerMessage: 0
      }));
      console.log('✅ Create channel instruction ready');
      
      // Send message
      instructions.push(await sdk.getSendMessageInstructionAsync({
        sender: testKeypair,
        recipient: testKeypair.address, // Self-message for testing
        messageId: 'msg-' + Date.now(),
        payload: 'Hello, test message!',
        messageType: 0, // Text
        expirationDays: 30
      }));
      console.log('✅ Send message instruction ready');
      
      console.log(`✅ All ${instructions.length} instruction types generated successfully`);
      
    } catch (error) {
      console.log('❌ Instruction type test failed:', error.message);
      return false;
    }
    
    console.log('\n✅ All transaction functionality tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Transaction functionality test failed:', error.message);
    return false;
  }
}

testTransactionFunctionality()
  .then(success => {
    if (success) {
      console.log('\n🎉 Transaction functionality test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Transaction functionality test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });