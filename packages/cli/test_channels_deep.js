#!/usr/bin/env node

/**
 * Deep test for Manage Channels command functionality
 */

async function testChannelsDeep() {
  console.log('🧪 Deep Testing Manage Channels Command...\n');
  
  try {
    // Test 1: Import and instantiate
    console.log('1️⃣ Testing command import...');
    const { ManageChannelsCommand } = await import('./src/commands/manage-channels.js');
    const command = new ManageChannelsCommand();
    console.log('✅ ManageChannelsCommand imported and instantiated');
    
    // Test 2: Check if using devnet RPC
    console.log('\n2️⃣ Testing RPC configuration...');
    const { ConfigManager } = await import('./src/utils/config-manager.js');
    const config = new ConfigManager();
    const configData = await config.load();
    const rpcUrl = await config.getRpcUrl();
    
    console.log('✅ Network:', configData?.network || 'default');
    console.log('✅ RPC URL:', rpcUrl);
    
    if (rpcUrl.includes('devnet')) {
      console.log('✅ Using devnet RPC as required');
    } else {
      console.log('⚠️  Not using devnet RPC');
    }
    
    // Test 3: Test SDK integration for channels
    console.log('\n3️⃣ Testing SDK channels integration...');
    const sdk = await import('../sdk-typescript/dist/index.js');
    
    if (sdk.createPodAIClientV2) {
      const client = sdk.createPodAIClientV2({
        rpcEndpoint: 'https://api.devnet.solana.com', // Ensure devnet
        commitment: 'confirmed'
      });
      console.log('✅ Client created with devnet RPC');
      
      // Test channels service
      if (client.channels) {
        console.log('✅ Channels service available');
        
        // Test channel methods
        const channelMethods = ['createChannel', 'joinChannel', 'broadcastMessage', 'getAllChannels'];
        for (const method of channelMethods) {
          if (client.channels[method]) {
            console.log(`✅ ${method} method available`);
          } else {
            console.log(`❌ ${method} method missing`);
            return false;
          }
        }
      } else {
        console.log('❌ Channels service not found');
        return false;
      }
    } else {
      console.log('❌ createPodAIClientV2 not available');
      return false;
    }
    
    // Test 4: Test instruction imports
    console.log('\n4️⃣ Testing instruction imports...');
    try {
      const instructions = [
        'getCreateChannelInstructionAsync',
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
      console.log('❌ Instruction import failed:', error.message);
      return false;
    }
    
    // Test 5: Test transaction utilities
    console.log('\n5️⃣ Testing transaction utilities...');
    try {
      const transactionUtils = ['sendTransaction', 'estimateTransactionFee', 'checkTransactionStatus'];
      
      for (const util of transactionUtils) {
        if (sdk[util]) {
          console.log(`✅ ${util} available`);
        } else {
          console.log(`❌ ${util} missing`);
          return false;
        }
      }
    } catch (error) {
      console.log('❌ Transaction utilities test failed:', error.message);
      return false;
    }
    
    console.log('\n✅ All Manage Channels infrastructure tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Channels deep test failed:', error.message);
    return false;
  }
}

testChannelsDeep()
  .then(success => {
    if (success) {
      console.log('\n🎉 Manage Channels deep test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Manage Channels deep test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });