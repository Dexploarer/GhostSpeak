/**
 * Test direct SDK integration
 */

import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import { initializeDirectSdk } from '../src/services/sdk-direct.js';

async function testDirectSdk() {
  console.log('Testing direct SDK integration...\n');
  
  try {
    // Create RPC
    const rpc = createSolanaRpc('https://api.devnet.solana.com');
    console.log('✅ RPC created');
    
    // Program ID
    const programId = address('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
    console.log('✅ Program ID:', programId);
    
    // Initialize SDK
    console.log('\nInitializing SDK services...');
    const sdk = await initializeDirectSdk(rpc, programId);
    console.log('✅ SDK initialized');
    console.log('Available services:', Object.keys(sdk).filter(k => k !== 'mockSubscriptions'));
    
    // Test creating a service instance
    console.log('\nCreating ChannelService instance...');
    const channelService = new sdk.ChannelService(rpc, sdk.mockSubscriptions, programId, 'confirmed');
    console.log('✅ ChannelService created successfully');
    
    // Generate test signer
    const signer = await generateKeyPairSigner();
    console.log(`✅ Test signer: ${signer.address}`);
    
    console.log('\n✨ Direct SDK integration test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectSdk().catch(console.error);