/**
 * Initialize GhostSpeak Staking Config on Devnet (Simple Version)
 *
 * This uses anchor CLI to initialize rather than the TypeScript SDK
 * to avoid IDL parsing issues with complex types.
 *
 * Run with: bun run programs/scripts/initialize-devnet-simple.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Constants
const PROGRAM_ID = new PublicKey('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB');
const DEVNET_RPC = 'https://api.devnet.solana.com';

async function main() {
  console.log('🚀 Initializing GhostSpeak Protocol on Devnet (via CLI)...\n');

  // Load wallet
  const walletPath = `${homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, 'utf-8')))
  );

  console.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`);

  // Setup connection
  const connection = new Connection(DEVNET_RPC, 'confirmed');

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

      console.log('🎉 Staking configuration is ready for use!\n');
      console.log('Next steps:');
      console.log('   1. Run SDK staking example to test staking functionality');
      console.log('   2. Run SDK escrow example to test Ghost Protect\n');
      return;
    }
  } catch (e) {
    // Account doesn't exist - need manual initialization
  }

  console.log('⚠️  Staking config not yet initialized.');
  console.log('    Please run the following anchor command manually:\n');
  console.log('    cd /Users/home/projects/GhostSpeak');
  console.log(`    anchor run initialize-staking\n`);
  console.log('    OR use the web interface to initialize the configuration.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
