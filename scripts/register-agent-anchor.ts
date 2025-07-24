#!/usr/bin/env tsx
/**
 * Register an agent directly using Anchor
 */

import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { Keypair, SystemProgram, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Import the IDL
import idl from '../target/idl/ghostspeak_marketplace.json';

const PROGRAM_ID = new anchor.web3.PublicKey('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');

async function registerAgent() {
  console.log(chalk.cyan('=== AGENT REGISTRATION (DIRECT) ===\n'));
  
  // Setup provider
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME!, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed'
  });
  
  anchor.setProvider(provider);
  
  // Create program instance
  const program = new Program(idl as any, PROGRAM_ID, provider);
  
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
    console.log(chalk.red('❌ Insufficient balance'));
    return;
  }
  
  // Generate agent ID
  const agentId = `agent_${Date.now()}`;
  console.log(`Agent ID: ${agentId}`);
  
  // Derive PDAs
  const [agentPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('agent'),
      wallet.publicKey.toBuffer(),
      Buffer.from(agentId)
    ],
    PROGRAM_ID
  );
  
  const [userRegistryPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('user_registry'),
      wallet.publicKey.toBuffer()
    ],
    PROGRAM_ID
  );
  
  console.log(`Agent PDA: ${agentPDA.toBase58()}`);
  console.log(`User Registry PDA: ${userRegistryPDA.toBase58()}`);
  
  // Agent parameters
  const agentType = 0; // Standard agent
  const metadataUri = 'https://example.com/agent-metadata.json';
  
  try {
    console.log(chalk.blue('\nRegistering agent...'));
    
    const tx = await program.methods
      .registerAgent(
        agentType,
        metadataUri,
        agentId
      )
      .accounts({
        agentAccount: agentPDA,
        userRegistry: userRegistryPDA,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY
      })
      .rpc();
    
    console.log(chalk.green(`✅ Agent registered successfully!`));
    console.log(`Transaction: ${tx}`);
    console.log(`View on Solana Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    
    // Fetch the agent account
    const agentAccount = await program.account.agent.fetch(agentPDA);
    console.log(chalk.cyan('\nAgent Account Data:'));
    console.log(`- Owner: ${agentAccount.owner.toBase58()}`);
    console.log(`- Agent Type: ${agentAccount.agentType}`);
    console.log(`- Metadata URI: ${agentAccount.metadataUri}`);
    console.log(`- Active: ${agentAccount.isActive}`);
    console.log(`- Created: ${new Date(agentAccount.createdAt.toNumber() * 1000).toLocaleString()}`);
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Registration failed: ${error.message}`));
    
    if (error.logs) {
      console.log(chalk.yellow('\nProgram logs:'));
      error.logs.forEach(log => console.log(log));
    }
    
    // Parse specific errors
    if (error.message.includes('custom program error')) {
      const errorCode = error.message.match(/0x([0-9a-f]+)/i)?.[1];
      if (errorCode) {
        console.log(chalk.yellow(`\nError code: 0x${errorCode}`));
        // Map error codes to messages if available
      }
    }
  }
}

// Run the registration
registerAgent().catch(console.error);