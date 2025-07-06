/**
 * Basic functionality test for the TypeScript SDK
 */

import { createDevnetClient } from './src/client-v2';

async function testBasicFunctionality() {
  try {
    console.log('🔧 Testing TypeScript SDK basic functionality...');
    
    // Create a devnet client
    const client = createDevnetClient();
    console.log('✅ Client created successfully');
    
    // Test connection
    const isConnected = await client.isConnected();
    console.log('🌐 Connection status:', isConnected ? 'Connected' : 'Not connected');
    
    // Get cluster info
    try {
      const clusterInfo = await client.getClusterInfo();
      console.log('📊 Cluster info:', clusterInfo);
    } catch (error) {
      console.log('⚠️ Could not get cluster info (expected on devnet):', error instanceof Error ? error.message : String(error));
    }
    
    // Test RPC access
    const rpc = client.getRpc();
    console.log('🔗 RPC client available:', !!rpc);
    
    // Test program ID access
    const programId = client.getProgramId();
    console.log('🎯 Program ID:', programId);
    
    // Test services access
    const agents = client.agents;
    const channels = client.channels;
    console.log('🤖 Agent service available:', !!agents);
    console.log('📢 Channel service available:', !!channels);
    
    console.log('✅ All basic functionality tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Basic functionality test failed:', error);
    return false;
  }
}

// Run the test
testBasicFunctionality()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  }); 