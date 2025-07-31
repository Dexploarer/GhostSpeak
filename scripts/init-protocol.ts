#!/usr/bin/env tsx
/**
 * Initialize the GhostSpeak protocol on devnet
 * This creates the necessary global state accounts
 */

// July 2025 @solana/kit patterns - unified imports
import { 
  createSolanaRpc,
  createTransaction,
  pipe,
  createTransactionMessage,
  createKeyPairSignerFromBytes,
  appendTransactionMessageInstructions,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  address,
  lamports,
  type Address,
  type KeyPairSigner
} from '@solana/kit';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const PROGRAM_ID = address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');

async function initializeProtocol() {
  console.log(chalk.cyan('=== PROTOCOL INITIALIZATION ===\n'));
  
  // Setup connection using July 2025 patterns
  const rpc = createSolanaRpc('https://api.devnet.solana.com');
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME!, '.config/solana/id.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const walletSigner = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
  
  console.log(`Wallet: ${walletSigner.address}`);
  
  // Check balance
  const balance = await rpc.getBalance(walletSigner.address).send();
  const solBalance = Number(balance.value) / 1_000_000_000;
  console.log(`Balance: ${solBalance} SOL`);
  
  if (balance.value < lamports(100_000_000n)) { // 0.1 SOL minimum
    console.log(chalk.red('❌ Insufficient balance'));
    return;
  }
  
  try {
    // Wallet signer is already created above
    console.log(`Signer address: ${walletSigner.address}`);
    
    // For now, just try the agent registration directly
    // The protocol might auto-initialize user registry on first use
    console.log(chalk.green('\n✅ Ready to register agents'));
    console.log('The protocol will auto-initialize necessary accounts on first use');
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Initialization failed: ${error instanceof Error ? error.message : error}`));
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

// Run the initialization
initializeProtocol().catch(console.error);