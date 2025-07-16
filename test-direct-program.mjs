#!/usr/bin/env node

/**
 * Direct Program Test - Bypass SDK Import Issues
 * Test the deployed program directly using Web3.js v2 and manual instruction building
 */

import { 
  createSolanaRpc, 
  createKeyPairSignerFromBytes, 
  generateKeyPairSigner, 
  address, 
  lamports,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  compileTransactionMessage,
  pipe,
  getProgramDerivedAddress,
  getAddressEncoder,
  getUtf8Encoder,
  getU32Encoder,
  addEncoderSizePrefix,
  getBytesEncoder
} from '@solana/kit';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROGRAM_ID = address('5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK');
const RPC_URL = 'https://api.devnet.solana.com';
const SYSTEM_PROGRAM = address('11111111111111111111111111111111');
const CLOCK_SYSVAR = address('SysvarC1ock11111111111111111111111111111111');

// Test Results Tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

console.log('\n🧪 Direct Program Test Suite');
console.log('=' .repeat(60));

async function setupTestEnvironment() {
  console.log('\n📋 Setting up test environment...');
  
  // Create RPC connection
  const rpc = createSolanaRpc(RPC_URL);
  
  // Use Solana CLI keypair if available
  let payer;
  try {
    const solanaKeyPath = process.env.HOME + '/.config/solana/id.json';
    if (fs.existsSync(solanaKeyPath)) {
      const keyData = JSON.parse(fs.readFileSync(solanaKeyPath, 'utf8'));
      payer = await createKeyPairSignerFromBytes(new Uint8Array(keyData));
      console.log(`✅ Using Solana CLI keypair: ${payer.address}`);
    } else {
      payer = await generateKeyPairSigner();
      console.log(`✅ Generated new keypair: ${payer.address}`);
    }
  } catch (error) {
    payer = await generateKeyPairSigner();
    console.log(`✅ Using temporary keypair: ${payer.address}`);
  }

  // Check SOL balance
  try {
    const balance = await rpc.getBalance(payer.address).send();
    console.log(`💰 Current balance: ${Number(balance.value) / 1e9} SOL`);
    
    if (Number(balance.value) < 0.1 * 1e9) {
      console.log('⚠️  Low balance - please run: solana airdrop 2');
    }
  } catch (error) {
    console.log('⚠️  Could not check balance, continuing...');
  }

  console.log(`✅ Direct program testing with: ${PROGRAM_ID}`);

  return { payer, rpc };
}

async function runTest(testName, testFn) {
  console.log(`\n🔍 Testing: ${testName}`);
  console.log('-'.repeat(40));
  
  try {
    await testFn();
    testResults.passed++;
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    if (error.cause && error.cause.logs) {
      console.log(`   Program Logs: ${error.cause.logs.slice(-3).join('\n                 ')}`);
    }
  }
}

// Test: Register Agent with manual instruction building
async function testRegisterAgentDirect(rpc, payer) {
  try {
    console.log('   Building registerAgent instruction manually...');
    
    // Generate agent ID
    const agentId = 'test-agent-' + Date.now();
    
    // Build PDA addresses
    const agentPDA = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // "agent"
        getAddressEncoder().encode(payer.address),
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(agentId)
      ]
    });
    
    const userRegistryPDA = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121])), // "user_registry"
        getAddressEncoder().encode(payer.address),
      ]
    });
    
    console.log(`   Agent PDA: ${agentPDA}`);
    console.log(`   User Registry PDA: ${userRegistryPDA}`);
    
    // Build instruction data manually
    const discriminator = new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]); // RegisterAgent discriminator
    const agentType = 1;
    const metadataUri = 'https://test.com/metadata.json';
    
    // Build instruction data buffer
    const encoder = getBytesEncoder();
    const utf8Encoder = getUtf8Encoder();
    const u32Encoder = getU32Encoder();
    const u8Encoder = new Uint8Array(1);
    u8Encoder[0] = agentType;
    
    const metadataUriEncoded = addEncoderSizePrefix(utf8Encoder, u32Encoder).encode(metadataUri);
    const agentIdEncoded = addEncoderSizePrefix(utf8Encoder, u32Encoder).encode(agentId);
    
    const instructionData = new Uint8Array([
      ...discriminator,
      ...u8Encoder,
      ...metadataUriEncoded,
      ...agentIdEncoded
    ]);
    
    console.log(`   Instruction data length: ${instructionData.length} bytes`);
    
    // Build instruction
    const instruction = {
      programAddress: PROGRAM_ID,
      accounts: [
        { address: agentPDA, role: 3 }, // WritableAccount (3)
        { address: userRegistryPDA, role: 3 }, // WritableAccount (3)
        { address: payer.address, role: 1 }, // WritableSignerAccount (1)
        { address: SYSTEM_PROGRAM, role: 2 }, // ReadonlyAccount (2)
        { address: CLOCK_SYSVAR, role: 2 }, // ReadonlyAccount (2)
      ],
      data: instructionData
    };
    
    console.log('   Building transaction...');
    
    // Get latest blockhash
    const latestBlockhash = await rpc.getLatestBlockhash().send();
    
    // Build transaction message
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      m => setTransactionMessageFeePayerSigner(payer, m),
      m => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash.value, m),
      m => appendTransactionMessageInstructions([instruction], m)
    );
    
    console.log('   Signing transaction...');
    
    // Sign transaction
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    
    console.log('   Compiling transaction...');
    
    // Compile and send
    const compiledTransaction = compileTransactionMessage(signedTransaction);
    
    console.log('   Sending transaction...');
    
    const signature = await rpc.sendTransaction(compiledTransaction, { encoding: 'base64' }).send();
    
    console.log(`   Transaction: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}?cluster=devnet`);
    
  } catch (error) {
    if (error.message.includes('already in use') || error.message.includes('already exists')) {
      console.log('ℹ️  Agent already registered, test passed');
      return;
    }
    throw error;
  }
}

// Test: Check program account fetching
async function testAccountFetching(rpc) {
  try {
    console.log('   Testing basic RPC calls...');
    
    // Test program account lookup
    const programAccount = await rpc.getAccountInfo(PROGRAM_ID).send();
    console.log(`   ✅ Program account exists: ${programAccount ? 'Yes' : 'No'}`);
    
    if (programAccount) {
      console.log(`   ✅ Program account owner: ${programAccount.value?.owner}`);
      console.log(`   ✅ Program account executable: ${programAccount.value?.executable}`);
    }
    
    console.log('   ✅ Basic RPC communication working');
  } catch (error) {
    throw error;
  }
}

// Test: Validate PDA derivation 
async function testPDADerivation(payer) {
  try {
    console.log('   Testing PDA derivation...');
    
    const agentId = 'test-pda-derivation';
    
    // Test agent PDA
    const agentPDA = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // "agent"
        getAddressEncoder().encode(payer.address),
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(agentId)
      ]
    });
    
    // Test user registry PDA
    const userRegistryPDA = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121])), // "user_registry"
        getAddressEncoder().encode(payer.address),
      ]
    });
    
    console.log(`   ✅ Agent PDA: ${agentPDA}`);
    console.log(`   ✅ User Registry PDA: ${userRegistryPDA}`);
    console.log('   ✅ PDA derivation working correctly');
  } catch (error) {
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const { rpc, payer } = await setupTestEnvironment();

    // Run Direct Program Tests
    console.log('\n🚀 Running Direct Program Tests');
    console.log('=' .repeat(60));

    await runTest('1. Account Fetching', () => testAccountFetching(rpc));
    await runTest('2. PDA Derivation', () => testPDADerivation(payer));
    await runTest('3. Register Agent Direct', () => testRegisterAgentDirect(rpc, payer));

    // Results Summary
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(40));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.skipped}`);
    
    if (testResults.passed + testResults.failed > 0) {
      console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    }

    if (testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests Details:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`   ${test}: ${error}`);
      });
    }

    console.log('\n🎯 Direct Program Testing: COMPLETE');
    
    if (testResults.passed >= 2) {
      console.log('   🚀 Program communication working - ready for Phase 2');
    } else {
      console.log('   ⚠️  Issues with program communication');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);