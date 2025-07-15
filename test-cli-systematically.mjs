#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Test each CLI command systematically
const tests = [
  {
    name: "Check CLI Version",
    command: "node",
    args: ["packages/cli/dist/index.js", "--version"],
    shouldHaveTransaction: false
  },
  {
    name: "Get SOL from Faucet and Save Wallet",
    command: "node", 
    args: ["packages/cli/dist/index.js", "faucet", "--save"],
    shouldHaveTransaction: true,
    inputs: ['\n'] // Just press enter for any prompts
  },
  {
    name: "Register AI Agent",
    command: "node",
    args: ["packages/cli/dist/index.js", "agent", "register"],
    shouldHaveTransaction: true,
    inputs: [
      'TestAgent\n',           // Agent name
      'AI assistant for testing\n', // Description
      'AI Assistant\n',        // Service type
      '1.50\n',               // Price
      'y\n'                   // Confirm registration
    ]
  },
  {
    name: "List Registered Agents",
    command: "node",
    args: ["packages/cli/dist/index.js", "agent", "list"],
    shouldHaveTransaction: false
  },
  {
    name: "Create Marketplace Listing",
    command: "node",
    args: ["packages/cli/dist/index.js", "marketplace", "create"],
    shouldHaveTransaction: true,
    inputs: [
      'Test Service\n',        // Service name
      'Test service description\n', // Description
      '2.00\n',               // Price
      'AI Assistant\n',       // Category
      'y\n'                   // Confirm creation
    ]
  },
  {
    name: "List Marketplace Items",
    command: "node",
    args: ["packages/cli/dist/index.js", "marketplace", "list"],
    shouldHaveTransaction: false
  },
  {
    name: "Create Escrow Payment",
    command: "node",
    args: ["packages/cli/dist/index.js", "escrow", "create"],
    shouldHaveTransaction: true,
    inputs: [
      '1.00\n',               // Amount
      'Test work description\n', // Work description
      'y\n'                   // Confirm creation
    ]
  },
  {
    name: "List Escrow Payments",
    command: "node",
    args: ["packages/cli/dist/index.js", "escrow", "list"],
    shouldHaveTransaction: false
  }
];

function runCommand(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📝 Command: ${test.command} ${test.args.join(' ')}`);
    
    const child = spawn(test.command, test.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    // Send inputs if any
    if (test.inputs && test.inputs.length > 0) {
      let inputIndex = 0;
      const sendNextInput = () => {
        if (inputIndex < test.inputs.length) {
          setTimeout(() => {
            child.stdin.write(test.inputs[inputIndex]);
            inputIndex++;
            sendNextInput();
          }, 1000); // Wait 1 second between inputs
        }
      };
      sendNextInput();
    }

    child.on('close', (code) => {
      const result = {
        test: test.name,
        command: `${test.command} ${test.args.join(' ')}`,
        exitCode: code,
        stdout,
        stderr,
        shouldHaveTransaction: test.shouldHaveTransaction,
        hasTransactionUrl: stdout.includes('https://explorer.solana.com/tx/') || stdout.includes('Transaction:'),
        hasAccountUrl: stdout.includes('https://explorer.solana.com/account/') || stdout.includes('Account:'),
        success: code === 0
      };
      
      console.log(`\n📊 Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (exit code: ${code})`);
      
      if (test.shouldHaveTransaction) {
        console.log(`🔗 Transaction URL Found: ${result.hasTransactionUrl ? '✅ YES' : '❌ NO'}`);
        console.log(`🏦 Account URL Found: ${result.hasAccountUrl ? '✅ YES' : '❌ NO'}`);
      }
      
      resolve(result);
    });

    child.on('error', (error) => {
      console.error(`❌ Process error: ${error.message}`);
      reject(error);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after 2 minutes: ${test.name}`));
    }, 120000);
  });
}

async function runAllTests() {
  console.log('🚀 Starting GhostSpeak CLI Test Suite\n');
  
  // Check if CLI is built
  if (!existsSync('packages/cli/dist/index.js')) {
    console.error('❌ CLI not built. Building now...');
    process.exit(1);
  }

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await runCommand(test);
      results.push(result);
    } catch (error) {
      console.error(`❌ Test failed: ${test.name} - ${error.message}`);
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n📋 Test Summary');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withTransactions = results.filter(r => r.shouldHaveTransaction && r.hasTransactionUrl).length;
  const expectedTransactions = results.filter(r => r.shouldHaveTransaction).length;
  
  console.log(`✅ Successful tests: ${successful}/${results.length}`);
  console.log(`❌ Failed tests: ${failed}/${results.length}`);
  console.log(`🔗 Real transactions: ${withTransactions}/${expectedTransactions}`);
  
  console.log('\n📊 Detailed Results:');
  results.forEach(result => {
    console.log(`\n${result.success ? '✅' : '❌'} ${result.test}`);
    if (result.shouldHaveTransaction) {
      console.log(`   Transaction URL: ${result.hasTransactionUrl ? '✅' : '❌'}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  return results;
}

// Run the tests
runAllTests().catch(console.error);