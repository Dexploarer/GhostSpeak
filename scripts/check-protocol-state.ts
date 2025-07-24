#!/usr/bin/env tsx
/**
 * Check if GhostSpeak protocol is initialized on devnet
 */

import { Connection, PublicKey } from '@solana/web3.js';
import chalk from 'chalk';

const PROGRAM_ID = new PublicKey('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
const RPC_URL = 'https://api.devnet.solana.com';

async function checkProtocolState() {
  console.log(chalk.cyan('=== CHECKING PROTOCOL STATE ===\n'));
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Find protocol state PDA
  const [protocolStatePDA] = await PublicKey.findProgramAddress(
    [Buffer.from('protocol-state')],
    PROGRAM_ID
  );
  
  console.log(`Protocol State PDA: ${protocolStatePDA.toBase58()}`);
  
  try {
    const accountInfo = await connection.getAccountInfo(protocolStatePDA);
    
    if (accountInfo) {
      console.log(chalk.green('✅ Protocol State Account exists!'));
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      console.log(`   Data length: ${accountInfo.data.length} bytes`);
      console.log(`   Lamports: ${accountInfo.lamports}`);
      console.log(`   Executable: ${accountInfo.executable}`);
      
      // Try to decode first few bytes
      const data = accountInfo.data;
      console.log(`   First 32 bytes (hex): ${data.slice(0, 32).toString('hex')}`);
      
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
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 500 } // Approximate size for agent accounts
      ]
    });
    
    console.log(`Found ${accounts.length} program accounts`);
    
    if (accounts.length > 0) {
      console.log('First few accounts:');
      accounts.slice(0, 3).forEach((acc, i) => {
        console.log(`  ${i + 1}. ${acc.pubkey.toBase58()}`);
        console.log(`     Size: ${acc.account.data.length} bytes`);
      });
    }
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}

checkProtocolState().catch(console.error);