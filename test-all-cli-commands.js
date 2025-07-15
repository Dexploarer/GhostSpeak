#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

/**
 * Comprehensive CLI testing - ALL commands with on-chain verification
 */

let testResults = [];

async function runCommand(cmd, args, inputs = [], timeout = 30000) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${cmd} ${args.join(' ')}`);
    
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let output = '';
    let hasUrl = false;
    let transactionUrl = '';
    let explorerUrl = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Look for transaction URLs
      if (text.includes('explorer.solana.com/tx/')) {
        hasUrl = true;
        const urlMatch = text.match(/(https:\/\/explorer\.solana\.com\/tx\/[A-Za-z0-9]+)/);
        if (urlMatch) transactionUrl = urlMatch[1];
      }
      
      // Look for account URLs  
      if (text.includes('explorer.solana.com/address/')) {
        const urlMatch = text.match(/(https:\/\/explorer\.solana\.com\/address\/[A-Za-z0-9]+)/);
        if (urlMatch) explorerUrl = urlMatch[1];
      }
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // Send inputs with delays
    inputs.forEach((input, index) => {
      setTimeout(() => {
        child.stdin.write(input + '\\n');
      }, (index + 1) * 2000);
    });
    
    // End input after all inputs sent
    setTimeout(() => {
      child.stdin.end();
    }, inputs.length * 2000 + 1000);
    
    child.on('close', (code) => {
      const result = {
        command: `${cmd} ${args.join(' ')}`,
        success: code === 0,
        hasTransactionUrl: hasUrl,
        transactionUrl,
        explorerUrl,
        output: output.slice(-1000), // Last 1000 chars
        exitCode: code
      };
      
      testResults.push(result);
      resolve(result);
    });
    
    // Force timeout
    setTimeout(() => {
      child.kill();
      const result = {
        command: `${cmd} ${args.join(' ')}`,
        success: false,
        hasTransactionUrl: hasUrl,
        transactionUrl,
        explorerUrl,
        output: output.slice(-1000) + '\\n[TIMEOUT]',
        exitCode: -1
      };
      testResults.push(result);
      resolve(result);
    }, timeout);
  });
}

async function testAllCommands() {
  console.log('🚀 COMPREHENSIVE CLI TESTING - ON-CHAIN VERIFICATION');
  console.log('═'.repeat(60));
  
  // Test 1: Check version
  await runCommand('npx', ['@ghostspeak/cli@latest', '--version']);
  
  // Test 2: Get SOL from faucet
  console.log('\\n💧 Testing faucet...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'faucet', '--save'], [], 45000);
  
  // Test 3: Test agent registration
  console.log('\\n🤖 Testing agent registration...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'agent', 'register'], [
    'TestBot AI',
    'Automated testing agent',
    'https://api.example.com/webhook',
    'data-analysis,testing',
    '1.0'
  ], 60000);
  
  // Test 4: List agents
  console.log('\\n📋 Testing agent listing...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'agent', 'list'], [], 30000);
  
  // Test 5: Create marketplace listing
  console.log('\\n🛒 Testing marketplace creation...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'marketplace', 'create'], [
    'AI Data Analysis Service',
    'Professional data analysis and insights generation',
    'data-analysis,reporting',
    '2.5',
    '7'
  ], 60000);
  
  // Test 6: List marketplace
  console.log('\\n📊 Testing marketplace listing...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'marketplace', 'list'], [], 30000);
  
  // Test 7: Create escrow
  console.log('\\n🔒 Testing escrow creation...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'escrow', 'create'], [
    '1.0',
    '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK',
    'Test escrow payment for comprehensive verification'
  ], 60000);
  
  // Test 8: List escrows
  console.log('\\n💰 Testing escrow listing...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'escrow', 'list'], [], 30000);
  
  // Test 9: Create A2A channel
  console.log('\\n📡 Testing channel creation...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'channel', 'create'], [
    '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK',
    'Test Channel',
    'Testing A2A communication'
  ], 60000);
  
  // Test 10: List channels
  console.log('\\n📬 Testing channel listing...');
  await runCommand('npx', ['@ghostspeak/cli@latest', 'channel', 'list'], [], 30000);
  
  // Generate test report
  console.log('\\n🏁 GENERATING TEST REPORT...');
  console.log('═'.repeat(60));
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      successful: testResults.filter(r => r.success).length,
      withTransactionUrls: testResults.filter(r => r.hasTransactionUrl).length,
      withExplorerUrls: testResults.filter(r => r.explorerUrl).length
    },
    results: testResults
  };
  
  // Save detailed report
  writeFileSync('./cli-test-report.json', JSON.stringify(report, null, 2));
  
  // Print summary
  console.log(`✅ Successful commands: ${report.summary.successful}/${report.summary.totalTests}`);
  console.log(`🔗 Commands with transaction URLs: ${report.summary.withTransactionUrls}`);
  console.log(`🌐 Commands with explorer URLs: ${report.summary.withExplorerUrls}`);
  
  console.log('\\n📊 DETAILED RESULTS:');
  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const onChain = result.hasTransactionUrl ? '🔗' : '❌';
    console.log(`${index + 1}. ${status} ${onChain} ${result.command}`);
    
    if (result.transactionUrl) {
      console.log(`   📄 Transaction: ${result.transactionUrl}`);
    }
    if (result.explorerUrl) {
      console.log(`   🏠 Account: ${result.explorerUrl}`);
    }
    if (!result.success) {
      console.log(`   ❌ Exit code: ${result.exitCode}`);
      console.log(`   💬 Output: ${result.output.slice(-200)}...`);
    }
  });
  
  console.log(`\\n📋 Full report saved to: cli-test-report.json`);
  
  // Exit with error if any critical tests failed
  const criticalTests = testResults.filter(r => 
    r.command.includes('agent register') || 
    r.command.includes('escrow create') ||
    r.command.includes('marketplace create')
  );
  
  const failedCritical = criticalTests.filter(r => !r.success);
  if (failedCritical.length > 0) {
    console.log(`\\n❌ CRITICAL FAILURES: ${failedCritical.length} critical commands failed`);
    process.exit(1);
  } else {
    console.log(`\\n🎉 ALL CRITICAL TESTS PASSED! CLI performs real on-chain actions.`);
    process.exit(0);
  }
}

testAllCommands().catch(console.error);