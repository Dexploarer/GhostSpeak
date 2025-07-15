#!/usr/bin/env node

import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Program ID from devnet deployment
const PROGRAM_ID = new PublicKey('367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK');

// Get or create wallet
function getWallet() {
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  if (fs.existsSync(walletPath)) {
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')));
    return Keypair.fromSecretKey(secretKey);
  } else {
    const wallet = Keypair.generate();
    console.log('Generated new wallet:', wallet.publicKey.toBase58());
    return wallet;
  }
}

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = getWallet();
  
  console.log('GhostSpeak Devnet Test');
  console.log('======================');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');
  
  if (balance === 0) {
    console.log('\nWallet has no SOL. Please run:');
    console.log(`solana airdrop 2 ${wallet.publicKey.toBase58()}`);
    return;
  }
  
  // Check if program exists
  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (programInfo) {
      console.log('\n✅ Program is deployed on devnet');
      console.log('Program size:', programInfo.data.length, 'bytes');
      console.log('Program owner:', programInfo.owner.toBase58());
    } else {
      console.log('\n❌ Program not found on devnet');
    }
  } catch (error) {
    console.error('Error checking program:', error);
  }
  
  // Try to get program accounts (agents, listings, etc)
  console.log('\nSearching for program accounts...');
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      dataSlice: { offset: 0, length: 8 } // Just get discriminator
    });
    console.log('Found', accounts.length, 'program accounts');
    
    if (accounts.length > 0) {
      console.log('\nFirst few accounts:');
      accounts.slice(0, 5).forEach(acc => {
        console.log('-', acc.pubkey.toBase58());
      });
    }
  } catch (error) {
    console.error('Error fetching program accounts:', error);
  }
}

main().catch(console.error);