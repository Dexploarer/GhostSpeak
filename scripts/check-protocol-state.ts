#!/usr/bin/env tsx
/**
 * Check if GhostSpeak protocol is initialized on devnet
 */

import { createSolanaRpc, address, getAddressFromPublicKey } from '@solana/kit';
import { findProgramDerivedAddress } from '@solana/addresses';
import chalk from 'chalk';

const PROGRAM_ID = address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
const RPC_URL = 'https://api.devnet.solana.com';

async function checkProtocolState() {
  console.log(chalk.cyan('=== CHECKING PROTOCOL STATE ===\n'));
  
  const rpc = createSolanaRpc(RPC_URL);
  
  // Find protocol state PDA
  const [protocolStatePDA] = await findProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [new TextEncoder().encode('protocol-state')]
  });
  
  console.log(`Protocol State PDA: ${protocolStatePDA}`);
  
  try {
    const accountInfo = await rpc.getAccountInfo(protocolStatePDA).send();
    
    if (accountInfo.value) {
      console.log(chalk.green('✅ Protocol State Account exists!'));
      console.log(`   Owner: ${accountInfo.value.owner}`);
      console.log(`   Data length: ${accountInfo.value.data.length} bytes`);
      console.log(`   Lamports: ${accountInfo.value.lamports}`);
      console.log(`   Executable: ${accountInfo.value.executable}`);
      
      // Try to decode first few bytes
      const data = new Uint8Array(accountInfo.value.data);
      console.log(`   First 32 bytes (hex): ${Array.from(data.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
      
      // Check if it looks initialized (non-zero data)
      const hasData = data.some(byte => byte !== 0);
      if (hasData) {
        console.log(chalk.green('   ✅ Protocol appears to be initialized'));
      } else {
        console.log(chalk.yellow('   ⚠️  Account exists but data is all zeros'));
      }
    } else {
      console.log(chalk.red('❌ Protocol State Account NOT found'));
      console.log(chalk.yellow('   The protocol needs to be initialized first'));
      console.log(chalk.yellow('   Run: Initialize protocol command'));
    }
    
    // Also check for any agents
    console.log(chalk.cyan('\n=== CHECKING FOR AGENTS ===\n'));
    
    const accounts = await rpc.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 500 } // Approximate size for agent accounts
      ]
    }).send();
    
    console.log(`Found ${accounts.length} program accounts`);
    
    if (accounts.length > 0) {
      console.log('First few accounts:');
      accounts.slice(0, 3).forEach((acc, i) => {
        console.log(`  ${i + 1}. ${acc.pubkey}`);
        console.log(`     Size: ${acc.account.data.length} bytes`);
      });
    }
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}

checkProtocolState().catch(console.error);