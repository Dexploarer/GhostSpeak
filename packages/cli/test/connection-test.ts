/**
 * Test the actual blockchain connection and SDK initialization
 */

import { createSolanaRpc } from '@solana/rpc';
import { getKeypair, getRpc, getProgramId, getGhostspeakSdk } from '../src/context-helpers.js';

async function testConnection() {
  console.log('Testing blockchain connection...\n');
  
  try {
    // Test 1: RPC Connection
    console.log('1. Testing RPC connection...');
    const rpc = await getRpc();
    console.log('✅ RPC client created successfully');
    
    // Try to get latest blockhash
    try {
      const blockhash = await rpc.getLatestBlockhash().send();
      console.log(`✅ Connected to Solana network. Blockhash: ${blockhash.value.blockhash}`);
    } catch (error) {
      console.log('❌ Failed to connect to Solana network:', error);
    }
    
    // Test 2: Keypair
    console.log('\n2. Testing keypair loading...');
    try {
      const keypair = await getKeypair();
      console.log(`✅ Keypair loaded. Address: ${keypair.address}`);
    } catch (error) {
      console.log('❌ Failed to load keypair:', error);
    }
    
    // Test 3: Program ID
    console.log('\n3. Testing program ID...');
    const programId = await getProgramId('channel');
    console.log(`✅ Program ID: ${programId}`);
    
    // Test 4: SDK Loading
    console.log('\n4. Testing SDK loading...');
    try {
      const sdk = await getGhostspeakSdk();
      console.log('✅ SDK loaded successfully');
      console.log('Available services:', Object.keys(sdk));
    } catch (error) {
      console.log('❌ Failed to load SDK:', error);
    }
    
    // Test 5: Channel Service instantiation
    console.log('\n5. Testing ChannelService instantiation...');
    try {
      const sdk = await getGhostspeakSdk();
      const rpc = await getRpc();
      const programId = await getProgramId('channel');
      
      // Try creating ChannelService with null subscriptions
      const channelService = new sdk.ChannelService(
        rpc,
        null as any, // No subscriptions in CLI
        programId,
        'confirmed'
      );
      console.log('✅ ChannelService created successfully');
    } catch (error) {
      console.log('❌ Failed to create ChannelService:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testConnection().catch(console.error);