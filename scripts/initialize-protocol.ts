#!/usr/bin/env tsx
/**
 * Initialize GhostSpeak Protocol on Devnet
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const PROGRAM_ID = new PublicKey('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
const RPC_URL = 'https://api.devnet.solana.com';

async function initializeProtocol() {
  console.log(chalk.cyan('=== INITIALIZING GHOSTSPEAK PROTOCOL ===\n'));
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME!, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Admin wallet: ${walletKeypair.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log(chalk.red('❌ Insufficient balance. Need at least 0.1 SOL'));
    return;
  }
  
  // Generate treasury keypair
  const treasuryKeypair = Keypair.generate();
  console.log(`Treasury: ${treasuryKeypair.publicKey.toBase58()}`);
  
  // Protocol parameters
  const protocolFee = 200; // 2% in basis points
  const disputeFee = 500; // 5% in basis points
  const disputePeriod = 7 * 24 * 60 * 60; // 7 days in seconds
  
  console.log(chalk.cyan('\nProtocol Parameters:'));
  console.log(`- Protocol Fee: ${protocolFee / 100}%`);
  console.log(`- Dispute Fee: ${disputeFee / 100}%`);
  console.log(`- Dispute Period: ${disputePeriod / (24 * 60 * 60)} days`);
  
  console.log(chalk.yellow('\n⚠️  Note: Direct protocol initialization requires the SDK'));
  console.log(chalk.yellow('    The CLI doesn\'t expose an init command'));
  
  // Import SDK and initialize
  try {
    const { GhostSpeakClient } = await import('@ghostspeak/sdk');
    
    console.log(chalk.green('\n✅ SDK loaded successfully'));
    
    // Create client
    const client = new GhostSpeakClient({
      rpcEndpoint: RPC_URL,
      keypair: walletKeypair
    });
    
    console.log(chalk.blue('\nInitializing protocol...'));
    
    // This would be the initialization call, but it depends on the SDK methods
    // You'll need to check the SDK documentation for the exact method
    console.log(chalk.yellow('\n⚠️  SDK initialization method needs to be implemented'));
    console.log(chalk.yellow('    Check SDK documentation for protocol.initialize() or similar'));
    
  } catch (error) {
    console.log(chalk.red('\n❌ Failed to import SDK'));
    console.log(chalk.yellow('   Make sure @ghostspeak/sdk is built and available'));
    console.log(chalk.yellow('   Run: npm run build:sdk'));
  }
  
  console.log(chalk.cyan('\n=== MANUAL INITIALIZATION STEPS ==='));
  console.log('1. Use Anchor CLI or a custom script to call the initialize instruction');
  console.log('2. Parameters needed:');
  console.log('   - admin: Your wallet address');
  console.log('   - treasury: Treasury account');
  console.log('   - protocolFee: 200 (2%)');
  console.log('   - disputeFee: 500 (5%)');
  console.log('   - disputePeriod: 604800 (7 days)');
  console.log('\n3. Or deploy a fresh instance with initialization included');
}

initializeProtocol().catch(console.error);