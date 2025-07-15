#!/usr/bin/env node

/**
 * Test Agent Registration on Devnet
 * Using the minimal GhostSpeak SDK with July 2025 patterns
 */

import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { address } from '@solana/addresses';
import { GhostSpeakClient } from './packages/sdk-typescript/dist/index.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Get wallet
function getWallet() {
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  if (fs.existsSync(walletPath)) {
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')));
    return Keypair.fromSecretKey(secretKey);
  } else {
    throw new Error('No wallet found at ~/.config/solana/id.json');
  }
}

async function main() {
  console.log('🤖 GhostSpeak Agent Registration Test');
  console.log('=====================================\n');
  
  // Setup
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = getWallet();
  
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');
  
  if (balance === 0) {
    console.log('\n❌ Wallet has no SOL. Please run:');
    console.log(`solana airdrop 2 ${wallet.publicKey.toBase58()}`);
    return;
  }
  
  // Create SDK client
  const client = new GhostSpeakClient({
    endpoint: 'https://api.devnet.solana.com'
  });
  
  // Create signer from wallet (July 2025 pattern)
  const signer = await createKeyPairSignerFromBytes(wallet.secretKey);
  console.log('Signer address:', signer.address);
  
  // Agent data
  const agentId = `agent-${Date.now()}`;
  const agentType = 0; // 0 = AI Agent
  const metadataUri = 'https://ghostspeak.ai/agents/test-agent.json';
  
  console.log('\n📝 Registering agent:');
  console.log('- ID:', agentId);
  console.log('- Type:', agentType, '(AI Agent)');
  console.log('- Metadata URI:', metadataUri);
  
  try {
    // Create register agent instruction
    const instruction = await client.registerAgent(
      signer,
      agentId,
      agentType,
      metadataUri
    );
    
    console.log('\n✅ Instruction created successfully');
    console.log('Program:', instruction.programAddress);
    console.log('Accounts:', instruction.accounts.length);
    console.log('Data size:', instruction.data.length, 'bytes');
    
    // Build transaction (old Web3.js for now since it's simpler)
    const transaction = new Transaction().add({
      keys: instruction.accounts.map(acc => ({
        pubkey: new PublicKey(acc.address),
        isSigner: acc.role === 2 || acc.role === 3, // WRITABLE_SIGNER or READONLY_SIGNER
        isWritable: acc.role === 1 || acc.role === 2 // WRITABLE or WRITABLE_SIGNER
      })),
      programId: new PublicKey(instruction.programAddress),
      data: Buffer.from(instruction.data)
    });
    
    console.log('\n📤 Sending transaction...');
    
    // Send and confirm
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      {
        commitment: 'confirmed',
        skipPreflight: false
      }
    );
    
    console.log('\n🎉 Success! Agent registered on-chain');
    console.log('Transaction:', signature);
    console.log('View on Solscan:', `https://solscan.io/tx/${signature}?cluster=devnet`);
    
    // Derive agent PDA to check
    const { deriveAgentPda } = await import('./packages/sdk-typescript/dist/index.js');
    const agentPda = await deriveAgentPda(address(wallet.publicKey.toBase58()), agentId);
    console.log('\nAgent PDA:', agentPda);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

// Need to import PublicKey
import { PublicKey } from '@solana/web3.js';

main().catch(console.error);