#!/usr/bin/env node

/**
 * Test remaining commands: Settings, Help, Deploy Protocol, Develop SDK
 */

async function testRemainingCommands() {
  console.log('🧪 Testing Remaining Commands...\n');
  
  const results = [];
  
  try {
    // Test 1: Settings Command
    console.log('1️⃣ Testing Settings Command...');
    try {
      const { SettingsCommand } = await import('./src/commands/settings.js');
      const command = new SettingsCommand();
      
      if (typeof command.execute === 'function') {
        console.log('✅ Settings command ready');
        results.push({ command: 'Settings', status: '✅', detail: 'Ready' });
      } else {
        results.push({ command: 'Settings', status: '❌', detail: 'No execute method' });
      }
    } catch (error) {
      results.push({ command: 'Settings', status: '❌', detail: error.message });
    }
    
    // Test 2: Help Command
    console.log('\n2️⃣ Testing Help Command...');
    try {
      const { HelpCommand } = await import('./src/commands/help.js');
      const command = new HelpCommand();
      
      if (typeof command.execute === 'function') {
        console.log('✅ Help command ready');
        results.push({ command: 'Help', status: '✅', detail: 'Ready' });
      } else {
        results.push({ command: 'Help', status: '❌', detail: 'No execute method' });
      }
    } catch (error) {
      results.push({ command: 'Help', status: '❌', detail: error.message });
    }
    
    // Test 3: Deploy Protocol Command
    console.log('\n3️⃣ Testing Deploy Protocol Command...');
    try {
      const { DeployProtocolCommand } = await import('./src/commands/deploy-protocol.js');
      const command = new DeployProtocolCommand();
      
      if (typeof command.execute === 'function') {
        console.log('✅ Deploy Protocol command ready');
        results.push({ command: 'Deploy Protocol', status: '✅', detail: 'Ready' });
      } else {
        results.push({ command: 'Deploy Protocol', status: '❌', detail: 'No execute method' });
      }
    } catch (error) {
      results.push({ command: 'Deploy Protocol', status: '❌', detail: error.message });
    }
    
    // Test 4: Develop SDK Command
    console.log('\n4️⃣ Testing Develop SDK Command...');
    try {
      const { DevelopSDKCommand } = await import('./src/commands/develop-sdk.js');
      const command = new DevelopSDKCommand();
      
      if (typeof command.execute === 'function') {
        console.log('✅ Develop SDK command ready');
        results.push({ command: 'Develop SDK', status: '✅', detail: 'Ready' });
      } else {
        results.push({ command: 'Develop SDK', status: '❌', detail: 'No execute method' });
      }
    } catch (error) {
      results.push({ command: 'Develop SDK', status: '❌', detail: error.message });
    }
    
    // Test 5: Config Manager functionality for settings
    console.log('\n5️⃣ Testing Config Manager for settings...');
    try {
      const { ConfigManager } = await import('./src/utils/config-manager.js');
      const config = new ConfigManager();
      
      const configData = await config.load();
      console.log('✅ Config loaded:', configData?.network || 'default');
      
      // Test RPC URL retrieval
      const rpcUrl = await config.getRpcUrl();
      if (rpcUrl.includes('devnet')) {
        console.log('✅ Using devnet RPC in config');
        results.push({ command: 'Config Manager', status: '✅', detail: 'Devnet RPC configured' });
      } else {
        results.push({ command: 'Config Manager', status: '⚠️', detail: 'Non-devnet RPC' });
      }
    } catch (error) {
      results.push({ command: 'Config Manager', status: '❌', detail: error.message });
    }
    
    // Display results
    console.log('\n📋 Remaining Commands Test Results:');
    console.log('=====================================');
    
    let passCount = 0;
    let failCount = 0;
    
    for (const result of results) {
      console.log(`${result.status} ${result.command.padEnd(20)} - ${result.detail}`);
      if (result.status === '✅') passCount++;
      else failCount++;
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📋 Total: ${results.length}`);
    
    return failCount === 0;
    
  } catch (error) {
    console.error('❌ Remaining commands test failed:', error.message);
    return false;
  }
}

testRemainingCommands()
  .then(success => {
    if (success) {
      console.log('\n🎉 All remaining commands test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some remaining commands test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });