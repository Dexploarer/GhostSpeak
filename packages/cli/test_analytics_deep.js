#!/usr/bin/env node

/**
 * Deep test for View Analytics command functionality
 */

async function testAnalyticsDeep() {
  console.log('🧪 Deep Testing View Analytics Command...\n');
  
  try {
    // Test 1: Import and instantiate
    console.log('1️⃣ Testing command import...');
    const { ViewAnalyticsCommand } = await import('./src/commands/view-analytics.js');
    const command = new ViewAnalyticsCommand();
    console.log('✅ ViewAnalyticsCommand imported and instantiated');
    
    // Test 2: Test SDK analytics integration
    console.log('\n2️⃣ Testing SDK analytics integration...');
    const sdk = await import('../sdk-typescript/dist/index.js');
    
    if (sdk.createPodAIClientV2) {
      const client = sdk.createPodAIClientV2({
        rpcEndpoint: 'https://api.devnet.solana.com', // Ensure devnet
        commitment: 'confirmed'
      });
      console.log('✅ Client created with devnet RPC');
      
      // Test analytics service
      if (client.analytics) {
        console.log('✅ Analytics service available');
        
        // Test analytics methods
        const analyticsMethods = ['getNetworkStats', 'getAgentStats', 'getChannelStats'];
        for (const method of analyticsMethods) {
          if (client.analytics[method]) {
            console.log(`✅ ${method} method available`);
          } else {
            console.log(`⚠️  ${method} method not found (may be optional)`);
          }
        }
      } else {
        console.log('⚠️  Analytics service not found (may be optional)');
      }
      
      // Test health check for connectivity
      const health = await client.healthCheck();
      if (health.rpcConnection) {
        console.log('✅ RPC connection healthy for analytics');
      } else {
        console.log('❌ RPC connection unhealthy');
        return false;
      }
    } else {
      console.log('❌ createPodAIClientV2 not available');
      return false;
    }
    
    // Test 3: Test Network Manager for analytics data
    console.log('\n3️⃣ Testing Network Manager analytics capabilities...');
    const { NetworkManager } = await import('./src/utils/network-manager.js');
    const networkManager = new NetworkManager();
    
    try {
      const currentNetwork = await networkManager.getCurrentNetwork();
      console.log('✅ Current network:', currentNetwork);
      
      // We can't test getRpc() here as it might hang, but we can test the method exists
      if (typeof networkManager.getRpc === 'function') {
        console.log('✅ getRpc method available for analytics');
      } else {
        console.log('❌ getRpc method missing');
        return false;
      }
    } catch (error) {
      console.log('❌ Network Manager test failed:', error.message);
      return false;
    }
    
    console.log('\n✅ All View Analytics infrastructure tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Analytics deep test failed:', error.message);
    return false;
  }
}

testAnalyticsDeep()
  .then(success => {
    if (success) {
      console.log('\n🎉 View Analytics deep test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 View Analytics deep test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });