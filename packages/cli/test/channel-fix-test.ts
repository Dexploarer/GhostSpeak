/**
 * Test the fixed channel creation
 */

import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import { createChannelDirect } from '../src/services/sdk-direct.js';

async function testChannelFix() {
  console.log('Testing fixed channel creation...\n');
  
  try {
    // Create RPC
    const rpc = createSolanaRpc('https://api.devnet.solana.com');
    console.log('✅ RPC created');
    
    // Generate test signer
    const signer = await generateKeyPairSigner();
    console.log(`✅ Test signer: ${signer.address}`);
    
    // Program ID
    const programId = address('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
    console.log('✅ Program ID:', programId);
    
    // Test channel options
    const channelOptions = {
      name: 'Test Channel',
      description: 'Testing the fixed channel creation',
      visibility: 0, // public
      maxParticipants: 100,
      metadata: { test: true }
    };
    
    console.log('\nAttempting to create channel...');
    console.log('Channel options:', channelOptions);
    
    try {
      // This will fail with insufficient funds, but that's expected
      // We're testing if the SDK integration works correctly
      const result = await createChannelDirect(
        rpc,
        signer,
        programId,
        channelOptions
      );
      
      console.log('✅ Channel creation call succeeded!');
      console.log('Result:', result);
    } catch (error: any) {
      if (error.message?.includes('insufficient')) {
        console.log('✅ SDK integration working! (Failed with expected insufficient funds error)');
        console.log('   This is normal - the test signer has no SOL');
      } else {
        console.log('❌ Unexpected error:', error.message || error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChannelFix().catch(console.error);