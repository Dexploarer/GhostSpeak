#!/usr/bin/env node

import { createSolanaRpc } from '@solana/kit';
import { address } from '@solana/addresses';

const rpc = createSolanaRpc('https://api.devnet.solana.com');

async function simulateRegisterAgent() {
  console.log('🔍 Debug Agent Registration Transaction');
  
  try {
    // Test parameters that match what the CLI is sending
    const agentType = 0;
    const metadataUri = 'data:application/json;base64,eyJuYW1lIjoiVGVzdEFnZW50IiwiZGVzY3JpcHRpb24iOiJUZXN0IGFnZW50IGZvciBkZWJ1Z2dpbmciLCJjYXBhYmlsaXRpZXMiOlsidGVzdGluZyIsImRlYnVnZ2luZyJdfQ==';
    const agentId = 'test-agent-123'; // Simple test ID
    
    console.log('Parameters:');
    console.log('- agentType:', agentType);
    console.log('- metadataUri length:', metadataUri.length);
    console.log('- agentId:', agentId);
    console.log('- agentId length:', agentId.length);
    
    // Check parameter constraints from Rust code
    const MAX_GENERAL_STRING_LENGTH = 200; // Common Anchor limit
    
    if (metadataUri.length > MAX_GENERAL_STRING_LENGTH) {
      console.log('❌ Metadata URI too long:', metadataUri.length, '>', MAX_GENERAL_STRING_LENGTH);
    } else {
      console.log('✅ Metadata URI length OK');
    }
    
    if (agentType > 10) {
      console.log('❌ Agent type too high:', agentType, '> 10');
    } else {
      console.log('✅ Agent type OK');
    }
    
    // Try to get recent blockhash to test basic RPC
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    console.log('✅ RPC connection working, blockhash:', latestBlockhash.blockhash.slice(0, 8) + '...');
    
    // Check if we can query program accounts
    const programId = address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
    
    // Try a simple program account query with filters
    try {
      const accounts = await rpc.getProgramAccounts(programId, {
        commitment: 'confirmed',
        dataSlice: { offset: 0, length: 0 }, // Just count accounts
      }).send();
      console.log('✅ Program accounts query successful, found:', accounts.length, 'accounts');
    } catch (error) {
      console.log('⚠️  Program accounts query failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error during simulation:', error);
  }
}

simulateRegisterAgent().catch(console.error);