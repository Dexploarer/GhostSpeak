#!/usr/bin/env node

/**
 * Manual CLI Testing - Test each command individually
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLI_PATH = './packages/cli/dist/index.js';

function testCommand(command, args = [], description = '') {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${description || command}`);
    console.log(`📝 Command: node ${CLI_PATH} ${args.join(' ')}`);
    console.log(`${'='.repeat(60)}`);
    
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: 'inherit', // Show output directly
      timeout: 30000 // 30 second timeout
    });

    child.on('close', (code) => {
      console.log(`\n📊 Exit Code: ${code}`);
      console.log(`Status: ${code === 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
      resolve({ command, args, code, success: code === 0 });
    });

    child.on('error', (error) => {
      console.error(`\n❌ Process Error: ${error.message}`);
      resolve({ command, args, code: -1, success: false, error: error.message });
    });

    // Kill if it takes too long
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        console.log('\n⏰ Test timed out after 30 seconds');
        resolve({ command, args, code: -1, success: false, error: 'Timeout' });
      }
    }, 30000);
  });
}

async function runTests() {
  console.log('🚀 GhostSpeak CLI Manual Testing');
  console.log('Starting systematic tests...\n');

  // Check if CLI exists
  if (!fs.existsSync(CLI_PATH)) {
    console.error(`❌ CLI not found at ${CLI_PATH}`);
    console.error('Build the CLI first: cd packages/cli && npm run build');
    process.exit(1);
  }

  const results = [];

  // Test 1: Version
  results.push(await testCommand('--version', ['--version'], 'Check CLI Version'));

  // Test 2: Help
  results.push(await testCommand('--help', ['--help'], 'Show CLI Help'));

  // Test 3: Faucet sources (read-only, should work)
  results.push(await testCommand('faucet', ['faucet', 'sources'], 'List Faucet Sources'));

  // Test 4: Agent list (read-only, should work)
  results.push(await testCommand('agent', ['agent', 'list'], 'List Agents'));

  // Test 5: Marketplace list (read-only, should work)
  results.push(await testCommand('marketplace', ['marketplace', 'list'], 'List Marketplace'));

  // Test 6: Escrow list (read-only, should work)
  results.push(await testCommand('escrow', ['escrow', 'list'], 'List Escrows'));

  // Test 7: Channel list (read-only, should work)
  results.push(await testCommand('channel', ['channel', 'list'], 'List Channels'));

  // Test 8: Config show (read-only, should work)
  results.push(await testCommand('config', ['config', 'show'], 'Show Config'));

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  console.log('\nDetailed Results:');
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.success ? '✅' : '❌'} ${result.command} ${result.args.join(' ')}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  if (failed === 0) {
    console.log('\n🎉 All tests passed! CLI appears to be working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

runTests().catch(console.error);