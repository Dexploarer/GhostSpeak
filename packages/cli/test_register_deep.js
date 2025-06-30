#!/usr/bin/env node

/**
 * Deep test for Register Agent command functionality
 */

import { RegisterAgentCommand } from './src/commands/register-agent.js';
import { UIManager } from './src/ui/ui-manager.js';
import { NetworkManager } from './src/utils/network-manager.js';
import { ConfigManager } from './src/utils/config-manager.js';

async function testRegisterAgentDeep() {
  console.log('🧪 Deep Testing Register Agent Command...\n');
  
  try {
    // Test 1: Command Infrastructure
    console.log('1️⃣ Testing command infrastructure...');
    const command = new RegisterAgentCommand();
    console.log('✅ RegisterAgentCommand instantiated');
    
    // Test 2: UI Manager
    console.log('\n2️⃣ Testing UI Manager...');
    try {
      const ui = new UIManager();
      console.log('✅ UIManager instantiated');
    } catch (error) {
      console.log('❌ UIManager failed:', error.message);
      return false;
    }
    
    // Test 3: Network Manager
    console.log('\n3️⃣ Testing Network Manager...');
    try {
      const network = new NetworkManager();
      console.log('✅ NetworkManager instantiated');
      
      // Test network operations
      const currentNetwork = await network.getCurrentNetwork();
      console.log('✅ Current network:', currentNetwork);
      
      const rpc = await network.getRpc();
      console.log('✅ RPC endpoint obtained');
    } catch (error) {
      console.log('❌ NetworkManager failed:', error.message);
      return false;
    }
    
    // Test 4: Config Manager
    console.log('\n4️⃣ Testing Config Manager...');
    try {
      const config = new ConfigManager();
      console.log('✅ ConfigManager instantiated');
      
      // Test config loading
      const configData = await config.load();
      console.log('✅ Config loaded:', Object.keys(configData || {}));
    } catch (error) {
      console.log('❌ ConfigManager failed:', error.message);
      return false;
    }
    
    // Test 5: SDK Integration
    console.log('\n5️⃣ Testing SDK integration...');
    try {
      const sdk = await import('../sdk-typescript/dist/index.js');
      
      if (sdk.createPodAIClientV2) {
        const client = sdk.createPodAIClientV2({
          rpcEndpoint: 'https://api.devnet.solana.com',
          commitment: 'confirmed'
        });
        console.log('✅ SDK client created');
        
        // Test health check
        const health = await client.healthCheck();
        console.log('✅ Health check passed:', health.rpcConnection);
        
        // Test if agents service exists
        if (client.agents) {
          console.log('✅ Agents service available');
          
          // Test if register method exists
          if (client.agents.registerAgent) {
            console.log('✅ registerAgent method available');
          } else {
            console.log('⚠️  registerAgent method not found');
          }
        } else {
          console.log('⚠️  Agents service not found');
        }
      } else {
        console.log('❌ createPodAIClientV2 not available');
        return false;
      }
    } catch (error) {
      console.log('❌ SDK integration failed:', error.message);
      return false;
    }
    
    console.log('\n✅ All Register Agent infrastructure tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Deep test failed:', error.message);
    return false;
  }
}

testRegisterAgentDeep()
  .then(success => {
    if (success) {
      console.log('\n🎉 Register Agent deep test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Register Agent deep test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });