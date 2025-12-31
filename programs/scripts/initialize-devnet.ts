/**
 * Initialize GhostSpeak Protocol on Devnet
 *
 * This script initializes the staking configuration on devnet with reasonable defaults:
 * - Minimum stake: 1,000 GHOST tokens (1e12 with 9 decimals)
 * - Lock duration: 30 days (2,592,000 seconds)
 * - Fraud slash: 50% (5000 basis points)
 * - Dispute slash: 10% (1000 basis points)
 *
 * Run with: bun run programs/scripts/initialize-devnet.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import * as anchor from '@coral-xyz/anchor';

// Constants
const PROGRAM_ID = new PublicKey('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB');
const DEVNET_RPC = 'https://api.devnet.solana.com';
const MIN_STAKE = 1_000_000_000_000; // 1K GHOST (9 decimals)

async function main() {
  console.log('🚀 Initializing GhostSpeak Protocol on Devnet...\n');

  // Load wallet
  const walletPath = `${homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, 'utf-8')))
  );

  console.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`);

  // Setup connection
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: 'confirmed' }
  );

  // Get wallet balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Please airdrop more SOL.');
    return;
  }

  // Derive PDAs
  const [stakingConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_config')],
    PROGRAM_ID
  );

  console.log(`📍 Staking Config PDA: ${stakingConfig.toBase58()}\n`);

  // Check if already initialized
  try {
    const configAccount = await connection.getAccountInfo(stakingConfig);
    if (configAccount) {
      console.log('✅ Staking config already initialized!');
      console.log('   Skip re-initialization to avoid errors.\n');

      // Display config details
      console.log('Configuration Details:');
      console.log(`   - Address: ${stakingConfig.toBase58()}`);
      console.log(`   - Owner: ${configAccount.owner.toBase58()}`);
      console.log(`   - Data Length: ${configAccount.data.length} bytes`);
      console.log(`   - Lamports: ${configAccount.lamports / 1e9} SOL\n`);
      return;
    }
  } catch (e) {
    // Account doesn't exist - proceed with initialization
  }

  // Initialize Staking Config
  console.log('📝 Initializing staking configuration...');
  console.log(`   Min Stake: ${MIN_STAKE / 1e12} GHOST`);
  console.log(`   Treasury: ${walletKeypair.publicKey.toBase58()}`);
  console.log(`   Fraud Slash: 50%`);
  console.log(`   Dispute Slash: 10%\n`);

  try {
    // Load IDL
    const idlPath = `${process.cwd()}/target/idl/ghostspeak_marketplace.json`;
    const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

    // Create program interface
    const program = new anchor.Program(idl, provider);

    // Build initialize instruction
    const tx = await program.methods
      .initializeStakingConfig(
        new anchor.BN(MIN_STAKE),
        walletKeypair.publicKey // Treasury address
      )
      .accounts({
        stakingConfig,
        authority: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Staking config initialized!`);
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    // Fetch and verify config
    const config = await program.account.stakingConfig.fetch(stakingConfig);
    console.log('Verified Configuration:');
    console.log(`   Authority: ${config.authority.toBase58()}`);
    console.log(`   Min Stake: ${config.minStake.toString()} (${config.minStake.toNumber() / 1e12} GHOST)`);
    console.log(`   Min Lock Duration: ${config.minLockDuration.toNumber()} seconds (${config.minLockDuration.toNumber() / 86400} days)`);
    console.log(`   Fraud Slash: ${config.fraudSlashBps} bps (${config.fraudSlashBps / 100}%)`);
    console.log(`   Dispute Slash: ${config.disputeSlashBps} bps (${config.disputeSlashBps / 100}%)`);
    console.log(`   Treasury: ${config.treasury.toBase58()}\n`);

  } catch (error: any) {
    console.error('❌ Error initializing staking config:');
    if (error.logs) {
      console.error('Program logs:');
      error.logs.forEach((log: string) => console.error(`   ${log}`));
    } else {
      console.error(error);
    }
    throw error;
  }

  console.log('🎉 Devnet initialization complete!\n');
  console.log('Next steps:');
  console.log('   1. Create a GHOST token mint (or use existing)');
  console.log('   2. Test staking with SDK examples');
  console.log('   3. Test Ghost Protect escrow with SDK examples\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
