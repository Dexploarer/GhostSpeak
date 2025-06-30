#!/usr/bin/env node

/**
 * Deep test for Test E2E command functionality
 */

async function testE2EDeep() {
  console.log('🧪 Deep Testing Test E2E Command...\n');
  
  try {
    // Test 1: Import and instantiate
    console.log('1️⃣ Testing command import...');
    const { TestE2ECommand } = await import('./src/commands/test-e2e.js');
    const command = new TestE2ECommand();
    console.log('✅ TestE2ECommand imported and instantiated');
    
    // Test 2: Test SDK full integration for E2E
    console.log('\n2️⃣ Testing SDK full integration...');
    const sdk = await import('../sdk-typescript/dist/index.js');
    
    if (sdk.createPodAIClientV2) {
      const client = sdk.createPodAIClientV2({
        rpcEndpoint: 'https://api.devnet.solana.com', // Ensure devnet
        commitment: 'confirmed'
      });
      console.log('✅ Client created with devnet RPC');
      
      // Test all services for E2E
      const services = ['agents', 'channels', 'messages', 'analytics'];
      for (const service of services) {
        if (client[service]) {
          console.log(`✅ ${service} service available`);
        } else {
          console.log(`❌ ${service} service missing`);
          return false;
        }
      }
      
      // Test health check
      const health = await client.healthCheck();
      if (health.rpcConnection && health.programValid) {
        console.log('✅ Full health check passed');
      } else {
        console.log('❌ Health check failed');
        return false;
      }
    } else {
      console.log('❌ createPodAIClientV2 not available');
      return false;
    }
    
    // Test 3: Test instruction generation
    console.log('\n3️⃣ Testing instruction generation...');
    try {
      const instructions = [
        'getRegisterAgentInstructionAsync',
        'getCreateChannelInstructionAsync',
        'getSendMessageInstructionAsync',
        'getBroadcastMessageInstructionAsync',
        'getAddParticipantInstruction'
      ];
      
      for (const instruction of instructions) {
        if (sdk[instruction]) {
          console.log(`✅ ${instruction} available`);
        } else {
          console.log(`❌ ${instruction} missing`);
          return false;
        }
      }
    } catch (error) {
      console.log('❌ Instruction generation test failed:', error.message);
      return false;
    }
    
    // Test 4: Test transaction pipeline
    console.log('\n4️⃣ Testing transaction pipeline...');
    try {
      const transactionUtils = [
        'sendTransaction', 
        'sendTransactionBatch',
        'estimateTransactionFee', 
        'checkTransactionStatus'
      ];
      
      for (const util of transactionUtils) {
        if (sdk[util]) {
          console.log(`✅ ${util} available`);
        } else {
          console.log(`❌ ${util} missing`);
          return false;
        }
      }
    } catch (error) {
      console.log('❌ Transaction pipeline test failed:', error.message);
      return false;
    }
    
    // Test 5: Test constants and types
    console.log('\n5️⃣ Testing constants and types...');
    const constants = ['PODAI_PROGRAM_ID', 'DEVNET_RPC', 'VERSION'];
    for (const constant of constants) {
      if (sdk[constant]) {
        console.log(`✅ ${constant} available`);
      } else {
        console.log(`❌ ${constant} missing`);
        return false;
      }
    }
    
    console.log('\n✅ All Test E2E infrastructure tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ E2E deep test failed:', error.message);
    return false;
  }
}

testE2EDeep()
  .then(success => {
    if (success) {
      console.log('\n🎉 Test E2E deep test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Test E2E deep test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });