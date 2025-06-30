#!/usr/bin/env node

/**
 * Simple test for Register Agent command functionality
 */

async function testRegisterAgentSimple() {
  console.log('🧪 Simple Register Agent Test...\n');
  
  try {
    // Test 1: Import all required modules
    console.log('1️⃣ Testing imports...');
    const { RegisterAgentCommand } = await import('./src/commands/register-agent.js');
    const { UIManager } = await import('./src/ui/ui-manager.js');
    const { ConfigManager } = await import('./src/utils/config-manager.js');
    console.log('✅ All imports successful');
    
    // Test 2: Create instances
    console.log('\n2️⃣ Testing instantiation...');
    const command = new RegisterAgentCommand();
    const ui = new UIManager();
    const config = new ConfigManager();
    console.log('✅ All instances created');
    
    // Test 3: Test basic config functionality
    console.log('\n3️⃣ Testing config...');
    const configData = await config.load();
    console.log('✅ Config loaded:', configData?.network || 'default');
    
    // Test 4: Test SDK import
    console.log('\n4️⃣ Testing SDK import...');
    const sdk = await import('../sdk-typescript/dist/index.js');
    if (sdk.createPodAIClientV2) {
      console.log('✅ SDK import successful');
    } else {
      console.log('❌ SDK createPodAIClientV2 not found');
      return false;
    }
    
    // Test 5: Test capabilities constants
    console.log('\n5️⃣ Testing agent capabilities...');
    const { AGENT_CAPABILITIES } = await import('./src/commands/register-agent.js');
    if (AGENT_CAPABILITIES && typeof AGENT_CAPABILITIES.TEXT === 'number') {
      console.log('✅ Agent capabilities defined');
    } else {
      console.log('❌ Agent capabilities missing');
      return false;
    }
    
    console.log('\n✅ All simple tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Simple test failed:', error.message);
    return false;
  }
}

testRegisterAgentSimple()
  .then(success => {
    if (success) {
      console.log('\n🎉 Register Agent simple test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Register Agent simple test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });