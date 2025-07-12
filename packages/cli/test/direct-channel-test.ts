/**
 * Test channel creation directly without SDK wrappers
 */

import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { getCreateChannelInstruction } from '../../sdk/dist/esm-fixed/chunks/getCreateChannelInstruction-CLqiGvX0.js';

async function testChannelCreation() {
  console.log('Testing direct channel creation...\n');
  
  try {
    // Create RPC client
    const rpc = createSolanaRpc('https://api.devnet.solana.com');
    console.log('✅ RPC client created');
    
    // Generate a test keypair
    const signer = await generateKeyPairSigner();
    console.log(`✅ Test keypair generated: ${signer.address}`);
    
    // Program ID
    const programId = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
    console.log(`✅ Using program ID: ${programId}`);
    
    // Try to create instruction
    console.log('\nAttempting to create channel instruction...');
    const channelId = `test_${Date.now()}`;
    
    try {
      const instruction = getCreateChannelInstruction({
        creator: signer,
        channelId,
        name: 'Test Channel',
        description: 'Testing channel creation',
        visibility: 0, // public
        maxParticipants: 100,
        programId
      });
      
      console.log('✅ Channel instruction created successfully');
      console.log('Instruction:', instruction);
    } catch (error) {
      console.log('❌ Failed to create instruction:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChannelCreation().catch(console.error);