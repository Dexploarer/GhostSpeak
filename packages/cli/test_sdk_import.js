#!/usr/bin/env node

/**
 * Test SDK import and functionality
 */

async function testSDKImport() {
  console.log('🧪 Testing SDK Import...');
  
  try {
    // Test import
    const sdk = await import('../sdk-typescript/dist/index.js');
    console.log('✅ SDK import successful');
    console.log('📋 Available exports:', Object.keys(sdk));
    
    // Test client creation
    if (sdk.createPodAIClientV2) {
      console.log('✅ createPodAIClientV2 function available');
      
      try {
        const client = sdk.createPodAIClientV2({
          rpcEndpoint: 'https://api.devnet.solana.com',
          commitment: 'confirmed'
        });
        console.log('✅ Client created successfully');
        
        // Test health check
        if (client.healthCheck) {
          const health = await client.healthCheck();
          console.log('✅ Health check completed:', health);
        } else {
          console.log('⚠️  Health check method not available');
        }
      } catch (clientError) {
        console.error('❌ Client creation failed:', clientError.message);
      }
    } else {
      console.log('❌ createPodAIClientV2 function not found');
    }
    
    return true;
  } catch (error) {
    console.error('❌ SDK import failed:', error.message);
    return false;
  }
}

testSDKImport()
  .then(success => {
    if (success) {
      console.log('✅ SDK import test passed');
      process.exit(0);
    } else {
      console.log('❌ SDK import test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });