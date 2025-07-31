#!/usr/bin/env node

/**
 * Debug script to test agent registration instruction building
 */

import { createSolanaRpc } from '@solana/kit';
import { address } from '@solana/addresses';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
const programId = address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
const walletAddress = address('FfGhMd5nwQB5dL1kMfKKo1vdpme83JMHChgSNvhiYBZ7');

async function debugAgentRegistration() {
  console.log('🔍 Debug Agent Registration');
  console.log('Program ID:', programId);
  console.log('Wallet:', walletAddress);
  
  try {
    // Check program account
    const programAccount = await rpc.getAccountInfo(programId).send();
    console.log('✅ Program account exists:', !!programAccount);
    console.log('Program executable:', programAccount?.executable);
    console.log('Program owner:', programAccount?.owner);
    
    // Try to get program accounts (this will show us if there are any existing agents)
    const programAccounts = await rpc.getProgramAccounts(programId, {
      commitment: 'confirmed'
    }).send();
    
    console.log('📊 Existing program accounts:', programAccounts.length);
    
    // Check wallet balance
    const balance = await rpc.getBalance(walletAddress).send();
    console.log('💰 Wallet balance:', balance / 1e9, 'SOL');
    
    if (balance < 10000000) { // Less than 0.01 SOL
      console.log('⚠️  Warning: Low wallet balance, may not be enough for transaction');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugAgentRegistration().catch(console.error);