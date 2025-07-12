/**
 * Simple test to check RPC connectivity
 */

import { createSolanaRpc } from '@solana/rpc';

async function testRpc() {
  console.log('Testing simple RPC connection...\n');
  
  try {
    // Create RPC client directly
    const rpc = createSolanaRpc('https://api.devnet.solana.com');
    console.log('✅ RPC client created');
    
    // Try to get latest blockhash
    console.log('Fetching latest blockhash...');
    const blockhash = await rpc.getLatestBlockhash().send();
    console.log(`✅ Connected! Blockhash: ${blockhash.value.blockhash}`);
    console.log(`   Last valid block height: ${blockhash.value.lastValidBlockHeight}`);
    
    // Get cluster nodes
    console.log('\nFetching cluster nodes...');
    const nodes = await rpc.getClusterNodes().send();
    console.log(`✅ Found ${nodes.length} cluster nodes`);
    
  } catch (error) {
    console.error('❌ RPC test failed:', error);
  }
}

testRpc().catch(console.error);