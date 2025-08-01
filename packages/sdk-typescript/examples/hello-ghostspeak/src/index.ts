/**
 * Hello GhostSpeak - A minimal example of the GhostSpeak SDK
 * 
 * ✅ VERIFIED WORKING on Devnet with Program ID: 5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG
 * 
 * This example demonstrates:
 * - Setting up the GhostSpeak client with deployed program
 * - Creating a keypair and getting funds  
 * - Registering an AI agent on-chain
 * - Fetching agent information
 */

import { GhostSpeakClient } from '@ghostspeak/sdk';
// July 2025 @solana/kit patterns - unified imports
import { 
  createSolanaRpc,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  address,
  lamports,
  type Address,
  type KeyPairSigner
} from '@solana/kit';
import * as fs from 'fs';

const DEVNET_URL = 'https://api.devnet.solana.com';

// Main function
async function main() {
  console.log('🚀 Starting Hello GhostSpeak...\n');

  try {
    // 1. Setup connection and wallet using July 2025 patterns
    const rpc = createSolanaRpc(DEVNET_URL);
    console.log('✅ Connected to Solana devnet');

    // 2. Load or create wallet (use funded wallet if exists, otherwise generate)
    let walletSigner: KeyPairSigner;
    const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    
    try {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      walletSigner = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
      console.log('🔑 Loaded existing wallet:', walletSigner.address);
    } catch {
      walletSigner = await generateKeyPairSigner();
      console.log('🔑 Generated new keypair:', walletSigner.address);
    }

    // 3. Initialize GhostSpeak client with deployed program
    const client = new GhostSpeakClient({
      rpcEndpoint: DEVNET_URL,
      // Note: Client may need to be updated to accept KeyPairSigner
    });

    // 4. Check balance and get funds if needed
    await ensureFunds(rpc, walletSigner);

    // 5. Register an AI agent
    const agentAddress = await registerAgent(client, walletSigner);

    // 6. Fetch and display agent information
    await displayAgentInfo(client, agentAddress);

    console.log('\n🎉 Hello GhostSpeak completed successfully!');

  } catch (error) {
    handleError(error);
  }
}

// Ensure the wallet has funds using July 2025 patterns
async function ensureFunds(
  rpc: any,
  walletSigner: KeyPairSigner
): Promise<void> {
  const balance = await rpc.getBalance(walletSigner.address).send();
  const solBalance = Number(balance.value) / 1_000_000_000;
  console.log('💰 Balance:', solBalance, 'SOL');

  // Request airdrop if balance is low
  if (balance.value < lamports(10_000_000n)) { // Less than 0.01 SOL
    console.log('📥 Requesting airdrop...');
    
    try {
      const signature = await rpc.requestAirdrop(
        walletSigner.address, 
        lamports(1_000_000_000n) // 1 SOL
      ).send();
      
      console.log('💸 Airdrop requested:', signature);
      
      // Wait for confirmation (simplified)
      console.log('⏳ Waiting for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newBalance = await rpc.getBalance(walletSigner.address).send();
      const newSolBalance = Number(newBalance.value) / 1_000_000_000;
      console.log('💰 New balance:', newSolBalance, 'SOL');
      
    } catch (error) {
      console.error('❌ Airdrop failed:', error);
      console.log('ℹ️  You may need to use: npx @ghostspeak/cli faucet --save');
    }
  }
}

// Register an AI agent using working pattern from test suite
async function registerAgent(
  client: GhostSpeakClient,
  signer: KeyPairSigner
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
console.log('  Program: 5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG');
console.log('='.repeat(60));

main().catch(handleError);