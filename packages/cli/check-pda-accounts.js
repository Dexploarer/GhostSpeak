#!/usr/bin/env node

import { createSolanaRpc, createKeyPairSignerFromBytes } from '@solana/kit';
import { address } from '@solana/addresses';
import { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder, getUtf8Encoder } from '@solana/kit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
const programId = address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');

async function checkPDAAccounts() {
  console.log('🔍 Checking PDA Accounts');
  
  try {
    // Load the wallet
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');
    const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
    
    console.log('✅ Wallet:', signer.address);
    
    // Check user registry PDA
    const [userRegistryPDA] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('user_registry')),
        getAddressEncoder().encode(signer.address)
      ]
    });
    
    console.log('📋 User Registry PDA:', userRegistryPDA);
    
    try {
      const userRegistryAccount = await rpc.getAccountInfo(userRegistryPDA).send();
      if (userRegistryAccount) {
        console.log('✅ User Registry exists');
        console.log('  - Owner:', userRegistryAccount.owner);
        console.log('  - Data length:', userRegistryAccount.data.length);
        console.log('  - Lamports:', Number(userRegistryAccount.lamports));
      } else {
        console.log('❌ User Registry does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking User Registry:', error.message);
    }
    
    // Check a test agent PDA
    const testAgentId = 'TestAgent';
    const [agentPDA] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('agent')),
        getAddressEncoder().encode(signer.address),
        getBytesEncoder().encode(new TextEncoder().encode(testAgentId))
      ]
    });
    
    console.log('🤖 Test Agent PDA:', agentPDA);
    
    try {
      const agentAccount = await rpc.getAccountInfo(agentPDA).send();
      if (agentAccount) {
        console.log('✅ Test Agent already exists!');
        console.log('  - Owner:', agentAccount.owner);
        console.log('  - Data length:', agentAccount.data.length);
        console.log('  - Lamports:', Number(agentAccount.lamports));
      } else {
        console.log('❌ Test Agent does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking Test Agent:', error.message);
    }
    
    // Get all program accounts to see what exists
    console.log('\n🔍 Checking all program accounts...');
    try {
      const programAccounts = await rpc.getProgramAccounts(programId).send();
      console.log(`📊 Total program accounts: ${programAccounts.length}`);
      
      if (programAccounts.length > 0) {
        console.log('First few accounts:');
        programAccounts.slice(0, 5).forEach((account, i) => {
          console.log(`  ${i + 1}. ${account.pubkey} (${account.account.data.length} bytes)`);
        });
      }
    } catch (error) {
      console.log('❌ Error getting program accounts:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPDAAccounts().catch(console.error);