#!/usr/bin/env node

/**
 * Test CLI flow and menu navigation
 */

async function testCLIFlow() {
  console.log('🧪 Testing CLI Flow and Menu Navigation...\n');
  
  try {
    // Test 1: Import main CLI class
    console.log('1️⃣ Testing CLI class import...');
    const { PodAICLI } = await import('./src/index.js');
    console.log('✅ PodAICLI class imported successfully');
    
    // Test 2: Test CLI infrastructure components
    console.log('\n2️⃣ Testing CLI infrastructure...');
    
    // Test UI Manager
    const { UIManager } = await import('./src/ui/ui-manager.js');
    const ui = new UIManager();
    console.log('✅ UIManager working');
    
    // Test all command imports
    const commands = [
      { name: 'RegisterAgentCommand', path: './src/commands/register-agent.js' },
      { name: 'DevelopSDKCommand', path: './src/commands/develop-sdk.js' },
      { name: 'ManageChannelsCommand', path: './src/commands/manage-channels.js' },
      { name: 'TestE2ECommand', path: './src/commands/test-e2e.js' },
      { name: 'ViewAnalyticsCommand', path: './src/commands/view-analytics.js' },
      { name: 'DeployProtocolCommand', path: './src/commands/deploy-protocol.js' },
      { name: 'SettingsCommand', path: './src/commands/settings.js' },
      { name: 'HelpCommand', path: './src/commands/help.js' }
    ];
    
    console.log('\n3️⃣ Testing all command imports...');
    for (const cmd of commands) {
      try {
        const module = await import(cmd.path);
        const CommandClass = module[cmd.name];
        const instance = new CommandClass();
        if (typeof instance.execute === 'function') {
          console.log(`✅ ${cmd.name} ready`);
        } else {
          console.log(`❌ ${cmd.name} missing execute method`);
          return false;
        }
      } catch (error) {
        console.log(`❌ ${cmd.name} failed:`, error.message);
        return false;
      }
    }
    
    // Test 3: Test utilities
    console.log('\n4️⃣ Testing CLI utilities...');
    try {
      const { NetworkManager } = await import('./src/utils/network-manager.js');
      const { ConfigManager } = await import('./src/utils/config-manager.js');
      
      const network = new NetworkManager();
      const config = new ConfigManager();
      
      // Test config loading
      const configData = await config.load();
      console.log('✅ Config loaded, network:', configData?.network || 'default');
      
      // Test network info
      const currentNetwork = await network.getCurrentNetwork();
      console.log('✅ Network manager working, current:', currentNetwork);
      
    } catch (error) {
      console.log('❌ Utilities test failed:', error.message);
      return false;
    }
    
    // Test 4: Test error handling
    console.log('\n5️⃣ Testing error handling...');
    try {
      // Test creating CLI instance
      const cli = new PodAICLI();
      console.log('✅ CLI instance created');
      
      // Test CLI has required methods
      if (typeof cli.run === 'function') {
        console.log('✅ CLI run method available');
      } else {
        console.log('❌ CLI run method missing');
        return false;
      }
      
    } catch (error) {
      console.log('❌ CLI instantiation failed:', error.message);
      return false;
    }
    
    // Test 5: Test dependencies
    console.log('\n6️⃣ Testing dependencies...');
    try {
      // Test inquirer prompts
      const inquirer = await import('@inquirer/prompts');
      if (inquirer.select && inquirer.input && inquirer.confirm) {
        console.log('✅ Inquirer prompts available');
      } else {
        console.log('❌ Inquirer prompts missing');
        return false;
      }
      
      // Test chalk
      const chalk = await import('chalk');
      if (chalk.default) {
        console.log('✅ Chalk styling available');
      } else {
        console.log('❌ Chalk styling missing');
        return false;
      }
      
      // Test commander
      const { program } = await import('commander');
      if (program) {
        console.log('✅ Commander CLI framework available');
      } else {
        console.log('❌ Commander CLI framework missing');
        return false;
      }
      
    } catch (error) {
      console.log('❌ Dependencies test failed:', error.message);
      return false;
    }
    
    console.log('\n✅ All CLI flow tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ CLI flow test failed:', error.message);
    return false;
  }
}

testCLIFlow()
  .then(success => {
    if (success) {
      console.log('\n🎉 CLI flow test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 CLI flow test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });