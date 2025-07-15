#!/usr/bin/env node

/**
 * Direct CLI Testing Script
 * Tests each GhostSpeak CLI command and verifies transaction outputs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Test configurations
const CLI_PATH = 'packages/cli/dist/index.js';
const TIMEOUT = 60000; // 1 minute timeout

class CLITester {
  constructor() {
    this.results = [];
  }

  async runCommand(testName, command, shouldHaveTransaction = false) {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log(`📝 Command: ${command}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(command, { 
        timeout: TIMEOUT,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      const hasTransactionUrl = stdout.includes('https://explorer.solana.com/tx/') || 
                               stdout.includes('Transaction:') ||
                               stdout.includes('signature:');
      
      const hasAccountUrl = stdout.includes('https://explorer.solana.com/account/') || 
                           stdout.includes('Account:') ||
                           stdout.includes('Agent Address:') ||
                           stdout.includes('Work Order Address:');

      const result = {
        test: testName,
        command,
        success: true,
        stdout,
        stderr,
        duration,
        shouldHaveTransaction,
        hasTransactionUrl,
        hasAccountUrl,
        exitCode: 0
      };

      // Output results
      console.log('✅ SUCCESS');
      console.log(`⏱️  Duration: ${duration}ms`);
      
      if (shouldHaveTransaction) {
        console.log(`🔗 Transaction URL: ${hasTransactionUrl ? '✅ Found' : '❌ Missing'}`);
        console.log(`🏦 Account URL: ${hasAccountUrl ? '✅ Found' : '❌ Missing'}`);
      }

      // Show transaction URLs if found
      if (hasTransactionUrl) {
        const txMatches = stdout.match(/https:\/\/explorer\.solana\.com\/tx\/[A-Za-z0-9]+/g);
        if (txMatches) {
          console.log('🔗 Transaction URLs:');
          txMatches.forEach(url => console.log(`   ${url}`));
        }
      }

      // Show account URLs if found
      if (hasAccountUrl) {
        const accountMatches = stdout.match(/https:\/\/explorer\.solana\.com\/account\/[A-Za-z0-9]+/g);
        if (accountMatches) {
          console.log('🏦 Account URLs:');
          accountMatches.forEach(url => console.log(`   ${url}`));
        }
      }

      this.results.push(result);
      return result;

    } catch (error) {
      const result = {
        test: testName,
        command,
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.code || -1,
        shouldHaveTransaction,
        hasTransactionUrl: false,
        hasAccountUrl: false
      };

      console.log('❌ FAILED');
      console.log(`Error: ${error.message}`);
      if (error.stdout) console.log(`Stdout: ${error.stdout}`);
      if (error.stderr) console.log(`Stderr: ${error.stderr}`);

      this.results.push(result);
      return result;
    }
  }

  async runAllTests() {
    console.log('🚀 GhostSpeak CLI Test Suite');
    console.log('═'.repeat(80));

    // Check if CLI is built
    if (!existsSync(CLI_PATH)) {
      console.error('❌ CLI not found at:', CLI_PATH);
      console.error('Build the CLI first with: cd packages/cli && npm run build');
      process.exit(1);
    }

    // Test 1: Version check
    await this.runCommand(
      'CLI Version Check',
      `node ${CLI_PATH} --version`,
      false
    );

    // Test 2: Help command
    await this.runCommand(
      'CLI Help',
      `node ${CLI_PATH} --help`,
      false
    );

    // Test 3: Faucet status (should work without requiring transactions)
    await this.runCommand(
      'Faucet Sources List',
      `node ${CLI_PATH} faucet sources`,
      false
    );

    // Test 4: Agent list (might be empty but should work)
    await this.runCommand(
      'List Agents',
      `node ${CLI_PATH} agent list`,
      false
    );

    // Test 5: Marketplace list (might be empty but should work)
    await this.runCommand(
      'List Marketplace',
      `node ${CLI_PATH} marketplace list`,
      false
    );

    // Test 6: Escrow list (might be empty but should work)
    await this.runCommand(
      'List Escrows',
      `node ${CLI_PATH} escrow list`,
      false
    );

    // Display summary
    this.displaySummary();
  }

  displaySummary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('═'.repeat(80));

    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const withTransactions = this.results.filter(r => r.shouldHaveTransaction && r.hasTransactionUrl).length;
    const expectedTransactions = this.results.filter(r => r.shouldHaveTransaction).length;

    console.log(`✅ Successful tests: ${successful}/${this.results.length}`);
    console.log(`❌ Failed tests: ${failed}/${this.results.length}`);
    console.log(`🔗 Real transactions: ${withTransactions}/${expectedTransactions}`);

    console.log('\n📋 DETAILED RESULTS:');
    console.log('─'.repeat(80));

    this.results.forEach((result, index) => {
      const statusIcon = result.success ? '✅' : '❌';
      console.log(`${statusIcon} ${index + 1}. ${result.test}`);
      
      if (result.shouldHaveTransaction) {
        console.log(`   🔗 Transaction: ${result.hasTransactionUrl ? '✅' : '❌'}`);
        console.log(`   🏦 Account: ${result.hasAccountUrl ? '✅' : '❌'}`);
      }
      
      if (!result.success) {
        console.log(`   ❌ Error: ${result.error}`);
      }
      
      if (result.duration) {
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
      }
    });

    // Overall assessment
    console.log('\n🎯 ASSESSMENT:');
    console.log('─'.repeat(40));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! CLI is working correctly.');
    } else if (successful > failed) {
      console.log('⚠️  Most tests passed, but some issues found.');
    } else {
      console.log('❌ Major issues detected. CLI needs debugging.');
    }

    // Transaction analysis
    if (expectedTransactions > 0) {
      console.log('\n🔗 TRANSACTION ANALYSIS:');
      console.log('─'.repeat(40));
      
      if (withTransactions === expectedTransactions) {
        console.log('✅ All expected transactions are generating real blockchain interactions');
      } else if (withTransactions > 0) {
        console.log('⚠️  Some commands are creating real transactions, others may be mocked');
      } else {
        console.log('❌ No real blockchain transactions detected - commands may be using mock data');
      }
    }
  }
}

// Run the tests
const tester = new CLITester();
tester.runAllTests().catch(console.error);