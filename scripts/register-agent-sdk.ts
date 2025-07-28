#!/usr/bin/env tsx
/**
 * Register an agent using the GhostSpeak SDK
 */

import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { GhostSpeakClient, type Address } from '../packages/sdk-typescript/dist/index.js';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

async function registerAgent() {
  console.log(chalk.cyan('=== AGENT REGISTRATION USING SDK ===\n'));
  
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
    // Convert Keypair to TransactionSigner
    const signer = await createKeyPairSignerFromBytes(walletKeypair.secretKey);
    console.log(`Signer address: ${signer.address}`);
    
    // Create GhostSpeak client
    const client = new GhostSpeakClient({
      rpcEndpoint: 'https://api.devnet.solana.com'
    });
    
    console.log(chalk.blue('\nRegistering agent...'));
    
    // Register agent with minimal required fields
    const agentData = {
      name: `TestAgent_${Date.now()}`,
      description: 'Test agent registered via SDK',
      category: 'AI',
      capabilities: ['data-analysis', 'automation'],
      serviceEndpoint: 'https://test-agent.example.com'
    };
    
    console.log('Agent data:', agentData);
    
    // Use the create method which handles both metadata and registration
    const agentAddress = await client.agent.create(signer, agentData);
    
    console.log(chalk.green('\n✅ Agent registered successfully!'));
    console.log(`Agent Address: ${agentAddress}`);
    
    // Fetch the agent data to verify
    const agentAccount = await client.agent.getAccount(agentAddress as Address);
    if (agentAccount) {
      console.log(chalk.cyan('\nAgent Account Data:'));
      console.log(`- Owner: ${agentAccount.owner}`);
      console.log(`- Is Active: ${agentAccount.isActive}`);
      console.log(`- Metadata URI: ${agentAccount.metadataUri}`);
      console.log(`- Active: ${agentAccount.isActive}`);
      console.log(`- Created: ${new Date(Number(agentAccount.createdAt) * 1000).toLocaleString()}`);
    }
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Registration failed: ${error.message}`));
    console.error(error.stack);
  }
}

// Run the registration
registerAgent().catch(console.error);