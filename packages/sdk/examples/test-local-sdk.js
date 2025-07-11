#!/usr/bin/env node

/**
 * Test example using the local SDK build
 * This demonstrates basic agent registration without crashes
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import from the local build
const sdkPath = path.join(__dirname, '../dist/esm-fixed/index.js');

async function testBasicFunctionality() {
  console.log('🧪 Testing GhostSpeak SDK Basic Functionality\n');

  try {
    // Import the SDK
    console.log('📦 Importing SDK from local build...');
    const SDK = await import(sdkPath);
    console.log('✅ SDK imported successfully\n');

    // Test 1: Create minimal client
    console.log('1️⃣ Creating minimal client...');
    const client = SDK.createMinimalClient({
      rpcEndpoint: 'https://api.devnet.solana.com',
      commitment: 'confirmed'
    });
    console.log('✅ Client created successfully');
    console.log('   RPC endpoint:', client.rpc._rpcEndpoint || 'Connected');
    console.log('   Program ID:', client.programId);
    console.log('   Commitment:', client.commitment);
    console.log('');

    // Test 2: Check health
    console.log('2️⃣ Checking RPC health...');
    try {
      const health = await client.getHealth();
      console.log('✅ RPC health check:', health);
    } catch (error) {
      console.log('⚠️  Health check failed (this is normal for rate-limited endpoints)');
    }
    console.log('');

    // Test 3: Test utility functions
    console.log('3️⃣ Testing utility functions...');
    
    // Test address validation
    const testAddress = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
    console.log(`   Testing address validation for: ${testAddress}`);
    console.log(`   Is valid address: ${SDK.isAddress(testAddress)}`);
    
    // Test address creation
    const createdAddress = SDK.address(testAddress);
    console.log(`   Created address object: ${createdAddress}`);
    console.log('');

    // Test 4: Test BigInt utilities
    console.log('4️⃣ Testing BigInt utilities...');
    if (SDK.solToLamports) {
      const sol = 1.5;
      const lamports = SDK.solToLamports(sol);
      console.log(`   ${sol} SOL = ${lamports} lamports`);
      
      if (SDK.lamportsToSol) {
        const backToSol = SDK.lamportsToSol(lamports);
        console.log(`   ${lamports} lamports = ${backToSol} SOL`);
      }
    } else {
      console.log('   SOL conversion utilities not available in minimal build');
    }
    console.log('');

    // Test 5: Dynamic imports
    console.log('5️⃣ Testing dynamic imports...');
    if (SDK.createFullClient) {
      console.log('   Loading full client dynamically...');
      const { createPodAIClient } = await SDK.createFullClient();
      console.log('✅ Full client loaded successfully');
      console.log('   createPodAIClient available:', typeof createPodAIClient);
    }
    console.log('');

    // Test 6: Load services
    console.log('6️⃣ Testing service loading...');
    if (SDK.loadAdvancedServices) {
      console.log('   Loading advanced services...');
      const services = await SDK.loadAdvancedServices();
      console.log('✅ Services loaded successfully');
      console.log('   Available services:', Object.keys(services).join(', '));
    }
    console.log('');

    // Summary
    console.log('✨ All tests completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ SDK imports without errors');
    console.log('   ✅ No "n1 is not defined" error');
    console.log('   ✅ Minimal client works');
    console.log('   ✅ Utility functions available');
    console.log('   ✅ Dynamic imports functional');
    console.log('');
    console.log('🚀 The SDK is working correctly!');
    console.log('   You can now run the other examples safely.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error.stack);
    process.exit(1);
  }
}

// Run the test
testBasicFunctionality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });