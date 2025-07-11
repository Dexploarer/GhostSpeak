#!/usr/bin/env node

/**
 * Test Airdrop Helper
 * 
 * Quick script to test the automatic airdrop functionality
 */

import { Keypair } from '@solana/web3.js';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { AirdropHelper, ensureSufficientBalance } from './utils/airdrop-helper';

async function testAirdrop() {
  console.log('🧪 Testing Airdrop Helper\n');

  try {
    // Generate a test wallet
    const testKeypair = Keypair.generate();
    const signer = await createKeyPairSignerFromBytes(testKeypair.secretKey);
    
    console.log('📍 Test wallet address:', signer.address);
    console.log('');

    // Test 1: Basic airdrop
    console.log('Test 1: Basic airdrop with default settings');
    const result1 = await ensureSufficientBalance(signer.address);
    console.log('Result:', result1 ? '✅ Success' : '❌ Failed');
    console.log('');

    // Test 2: Custom configuration
    console.log('Test 2: Custom configuration (0.5 SOL minimum)');
    const result2 = await ensureSufficientBalance(signer.address, {
      minBalance: 0.5,
      airdropAmount: 1,
      verbose: true,
      maxRetries: 2
    });
    console.log('Result:', result2 ? '✅ Success' : '❌ Failed');
    console.log('');

    // Test 3: Get help instructions
    console.log('Test 3: Display help instructions');
    console.log(AirdropHelper.getAirdropInstructions(signer.address));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if executed directly
if (require.main === module) {
  testAirdrop()
    .then(() => {
      console.log('\n✅ Airdrop test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Airdrop test failed:', error);
      process.exit(1);
    });
}

export { testAirdrop };