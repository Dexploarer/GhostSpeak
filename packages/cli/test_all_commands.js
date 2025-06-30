#!/usr/bin/env node

/**
 * Comprehensive test for all CLI commands
 */

async function testAllCommands() {
  console.log('🧪 Testing All CLI Commands...\n');
  
  const results = [];
  
  // Test 1: Register Agent Command
  try {
    const { RegisterAgentCommand } = await import('./src/commands/register-agent.js');
    const cmd = new RegisterAgentCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Register Agent', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Register Agent', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Register Agent', status: '❌', message: error.message });
  }

  // Test 2: Develop SDK Command
  try {
    const { DevelopSDKCommand } = await import('./src/commands/develop-sdk.js');
    const cmd = new DevelopSDKCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Develop SDK', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Develop SDK', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Develop SDK', status: '❌', message: error.message });
  }

  // Test 3: Manage Channels Command
  try {
    const { ManageChannelsCommand } = await import('./src/commands/manage-channels.js');
    const cmd = new ManageChannelsCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Manage Channels', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Manage Channels', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Manage Channels', status: '❌', message: error.message });
  }

  // Test 4: Test E2E Command
  try {
    const { TestE2ECommand } = await import('./src/commands/test-e2e.js');
    const cmd = new TestE2ECommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Test E2E', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Test E2E', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Test E2E', status: '❌', message: error.message });
  }

  // Test 5: View Analytics Command
  try {
    const { ViewAnalyticsCommand } = await import('./src/commands/view-analytics.js');
    const cmd = new ViewAnalyticsCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'View Analytics', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'View Analytics', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'View Analytics', status: '❌', message: error.message });
  }

  // Test 6: Deploy Protocol Command
  try {
    const { DeployProtocolCommand } = await import('./src/commands/deploy-protocol.js');
    const cmd = new DeployProtocolCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Deploy Protocol', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Deploy Protocol', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Deploy Protocol', status: '❌', message: error.message });
  }

  // Test 7: Settings Command
  try {
    const { SettingsCommand } = await import('./src/commands/settings.js');
    const cmd = new SettingsCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Settings', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Settings', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Settings', status: '❌', message: error.message });
  }

  // Test 8: Help Command
  try {
    const { HelpCommand } = await import('./src/commands/help.js');
    const cmd = new HelpCommand();
    if (typeof cmd.execute === 'function') {
      results.push({ command: 'Help', status: '✅', message: 'Ready' });
    } else {
      results.push({ command: 'Help', status: '❌', message: 'No execute method' });
    }
  } catch (error) {
    results.push({ command: 'Help', status: '❌', message: error.message });
  }

  // Display results
  console.log('📋 Command Test Results:');
  console.log('========================');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    console.log(`${result.status} ${result.command.padEnd(20)} - ${result.message}`);
    if (result.status === '✅') passCount++;
    else failCount++;
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📋 Total: ${results.length}`);
  
  return failCount === 0;
}

testAllCommands()
  .then(success => {
    if (success) {
      console.log('\n🎉 All command tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some command tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });