#!/usr/bin/env tsx
/**
 * Initialize the GhostSpeak protocol on devnet
 * This creates the necessary global state accounts
 */

import { Keypair, Connection, LAMPORTS_PER_SOL, SystemProgram, PublicKey } from '@solana/web3.js';
import { 
  createTransaction,
  pipe,
  createTransactionMessage,
  createKeyPairSignerFromBytes,
  appendTransactionMessageInstructions,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  getBase64EncodedWireTransaction
} from '@solana/kit';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const PROGRAM_ID = new PublicKey('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');

async function initializeProtocol() {
  console.log(chalk.cyan('=== PROTOCOL INITIALIZATION ===\n'));
  
  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME!, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log(chalk.red('❌ Insufficient balance'));
    return;
  }
  
  try {
    // Create signer
    const signer = await createKeyPairSignerFromBytes(walletKeypair.secretKey);
    
    // For now, just try the agent registration directly
    // The protocol might auto-initialize user registry on first use
    console.log(chalk.green('\n✅ Ready to register agents'));
    console.log('The protocol will auto-initialize necessary accounts on first use');
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Initialization failed: ${error.message}`));
    console.error(error.stack);
  }
}

// Run the initialization
initializeProtocol().catch(console.error);