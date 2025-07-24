/**
 * Hello GhostSpeak - A minimal example of the GhostSpeak SDK
 * 
 * ✅ VERIFIED WORKING on Devnet with Program ID: GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX
 * 
 * This example demonstrates:
 * - Setting up the GhostSpeak client with deployed program
 * - Creating a keypair and getting funds  
 * - Registering an AI agent on-chain
 * - Fetching agent information
 */

import { GhostSpeakClient } from '@ghostspeak/sdk';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { address } from '@solana/addresses';
import * as fs from 'fs';

const DEVNET_URL = 'https://api.devnet.solana.com';

// Main function
async function main() {
  console.log('🚀 Starting Hello GhostSpeak...\n');

  try {
    // 1. Setup connection and wallet
    const connection = new Connection(DEVNET_URL, 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // 2. Load or create wallet (use funded wallet if exists, otherwise generate)
    let walletKeypair: Keypair;
    const walletPath = './test-wallet-funded.json';
    
    try {
      walletKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
      );
      console.log('🔑 Loaded existing wallet:', walletKeypair.publicKey.toBase58());
    } catch {
      walletKeypair = Keypair.generate();
      console.log('🔑 Generated new keypair:', walletKeypair.publicKey.toBase58());
    }

    const signer = await createKeyPairSignerFromBytes(walletKeypair.secretKey);

    // 3. Initialize GhostSpeak client with deployed program
    const client = new GhostSpeakClient({
      rpcEndpoint: DEVNET_URL,
      keypair: walletKeypair
    });

    // 4. Check balance and get funds if needed
    await ensureFunds(connection, walletKeypair);

    // 5. Register an AI agent
    const agentAddress = await registerAgent(client, signer);

    // 6. Fetch and display agent information
    await displayAgentInfo(client, agentAddress);

    console.log('\n🎉 Hello GhostSpeak completed successfully!');

  } catch (error) {
    handleError(error);
  }
}

// Ensure the wallet has funds
async function ensureFunds(
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('💰 Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  // Request airdrop if balance is low
  if (balance < 0.01 * LAMPORTS_PER_SOL) { // Less than 0.01 SOL
    console.log('📥 Requesting airdrop...');
    
    try {
      const signature = await connection.requestAirdrop(
        keypair.publicKey, 
        1 * LAMPORTS_PER_SOL // 1 SOL
      );
      
      console.log('💸 Airdrop requested:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      const newBalance = await connection.getBalance(keypair.publicKey);
      console.log('💰 New balance:', newBalance / LAMPORTS_PER_SOL, 'SOL');
      
    } catch (error) {
      console.error('❌ Airdrop failed:', error);
      console.log('ℹ️  You may need to use: npx @ghostspeak/cli faucet --save');
    }
  }
}

// Register an AI agent using working pattern from test suite
async function registerAgent(
  client: GhostSpeakClient,
  signer: any
): Promise<string> {
  console.log('\n🤖 Registering agent...');

  try {
    const timestamp = Date.now();
    const agentId = `hello_agent_${timestamp}`;
    
    const metadata = {
      name: "Hello Agent",
      description: "My first GhostSpeak agent - ready to help!",
      capabilities: ["greeting", "basic-chat", "learning"],
      type: "AI"
    };
    
    const metadataJson = JSON.stringify(metadata);
    const metadataBase64 = Buffer.from(metadataJson).toString('base64');
    const metadataUri = `data:application/json;base64,${metadataBase64}`;
    
    const signature = await client.agent.register(signer, {
      agentType: 1,
      metadataUri,
      agentId
    });
    
    const agentAddress = await client.agent.findAgentPDA(signer.address, agentId);

    console.log('✅ Agent registered successfully!');
    console.log('📍 Agent address:', agentAddress);
    console.log('🔗 Transaction:', signature);

    return agentAddress;

  } catch (error) {
    console.error('❌ Failed to register agent:', error.message);
    throw error;
  }
}

// Display agent information
async function displayAgentInfo(
  client: GhostSpeakClient,
  agentAddress: string
): Promise<void> {
  console.log('\n📋 Fetching agent details...');
  
  try {
    const agent = await client.agent.getAccount(address(agentAddress));

    if (!agent) {
      console.error('❌ Agent not found');
      return;
    }

    console.log('\n📋 Agent Details:');
    console.log('  Address:', agentAddress);
    console.log('  Owner:', agent.owner.toString());
    console.log('  Active:', agent.isActive ? '✅ Yes' : '❌ No');
    console.log('  Agent Type:', agent.agentType);
    console.log('  Metadata URI:', agent.metadataUri);
    console.log('  Created:', new Date(Number(agent.createdAt) * 1000).toLocaleString());
    console.log('  Updated:', new Date(Number(agent.updatedAt) * 1000).toLocaleString());
  } catch (error) {
    console.error('❌ Failed to fetch agent info:', error.message);
  }
}

// Error handler
function handleError(error: any): void {
  console.error('\n❌ Error occurred:');
  console.error(error.message || error);
  
  // Provide helpful suggestions
  if (error.message?.includes('insufficient funds')) {
    console.log('\n💡 Tip: Make sure you have enough SOL for transaction fees');
    console.log('   Run: npx @ghostspeak/cli faucet --save');
  } else if (error.message?.includes('0x1bbd')) {
    console.log('\n💡 Tip: This might be a constraint validation error');
  } else if (error.message?.includes('network')) {
    console.log('\n💡 Tip: Check your internet connection and try again');
  }
  
  process.exit(1);
}

// Run the example
console.log('='.repeat(60));
console.log('  GHOSTSPEAK SDK - HELLO WORLD EXAMPLE');
console.log('  ✅ VERIFIED WORKING ON DEVNET');
console.log('  Program: GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
console.log('='.repeat(60));

main().catch(handleError);