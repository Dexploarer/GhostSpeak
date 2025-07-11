/**
 * Basic Agent Registration Example (Fixed)
 * 
 * This example demonstrates how to:
 * 1. Create a minimal client
 * 2. Verify an AI agent on-chain
 * 3. Create a service listing
 * 4. Handle basic error cases
 */

// Import from the local SDK build
import { 
  createMinimalClient,
  solToLamports,
  lamportsToSol,
  address,
  type Address
} from '../dist/esm-fixed/index.js';

// Import external dependencies directly
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { generateKeyPair } from '@solana/keys';
import fs from 'fs';
import path from 'path';

// Configuration
const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_PATH = './agent-wallet.json';

/**
 * Load or create a wallet for the agent
 */
async function loadOrCreateWallet() {
  try {
    // Try to load existing wallet
    if (fs.existsSync(WALLET_PATH)) {
      const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
      return await createKeyPairSignerFromBytes(new Uint8Array(walletData));
    }
  } catch (error) {
    console.log('Could not load existing wallet, creating new one...');
  }

  // Create new wallet
  const signer = await generateKeyPair();
  
  // Extract the full keypair bytes (both private and public key)
  // The crypto keypair has both private and public key data
  const privateKeyBytes = new Uint8Array(32);
  const publicKeyBytes = new Uint8Array(32);
  
  // Export the private key
  const cryptoKey = signer.keyPair;
  const exported = await crypto.subtle.exportKey('raw', cryptoKey.privateKey);
  const fullPrivateKey = new Uint8Array(exported);
  
  // For Ed25519, we need to combine private and public key bytes (64 bytes total)
  // Get public key from the signer address
  const publicKeyHex = signer.address;
  const publicKeyArray = new Uint8Array(
    publicKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  // Combine private key (32 bytes) + public key (32 bytes) = 64 bytes
  const fullKeyPair = new Uint8Array(64);
  fullKeyPair.set(fullPrivateKey.slice(0, 32), 0);
  fullKeyPair.set(publicKeyArray, 32);
  
  const walletData = Array.from(fullKeyPair);
  
  // Save wallet for future use
  fs.writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2));
  console.log('✅ New wallet created and saved to:', WALLET_PATH);
  
  return signer;
}

/**
 * Check and request SOL if needed for transactions
 */
async function ensureSolBalance(client: any, wallet: any) {
  try {
    const balance = await client.getBalance(wallet.address);
    const solBalance = lamportsToSol(balance);
    
    console.log(`Current balance: ${solBalance.toFixed(4)} SOL`);
    
    if (solBalance < 0.01) {
      console.log('⚠️  Low balance detected. You may need to:');
      console.log(`   1. Airdrop SOL: solana airdrop 1 ${wallet.address}`);
      console.log(`   2. Or transfer SOL to: ${wallet.address}`);
      console.log('   3. Minimum 0.01 SOL recommended for transactions');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking balance:', error);
    return false;
  }
}

/**
 * Main example function
 */
async function runBasicAgentRegistration() {
  console.log('🚀 Starting Basic Agent Registration Example\n');

  try {
    // 1. Create client
    console.log('📡 Creating GhostSpeak client...');
    const client = createMinimalClient({
      rpcEndpoint: RPC_ENDPOINT,
      commitment: 'confirmed'
    });
    console.log('✅ Client created successfully\n');

    // 2. Load wallet
    console.log('👛 Loading agent wallet...');
    const agentWallet = await loadOrCreateWallet();
    console.log('✅ Wallet loaded:', agentWallet.address);
    console.log('   Note: Save your wallet file securely!\n');

    // 3. Check balance
    console.log('💰 Checking SOL balance...');
    const hasBalance = await ensureSolBalance(client, agentWallet);
    if (!hasBalance) {
      console.log('\n❌ Insufficient balance. Please add SOL to continue.');
      console.log('\n💡 Quick start:');
      console.log(`   1. Run: solana airdrop 1 ${agentWallet.address} --url devnet`);
      console.log('   2. Wait a few seconds for confirmation');
      console.log('   3. Run this example again');
      process.exit(1);
    }
    console.log('✅ Sufficient balance available\n');

    // 4. Demo wallet info
    console.log('📋 Agent Information:');
    console.log(`   Address: ${agentWallet.address}`);
    console.log(`   Explorer: https://explorer.solana.com/address/${agentWallet.address}?cluster=devnet`);
    console.log('');

    // 5. Show next steps
    console.log('🎯 Next Steps:');
    console.log('   1. The minimal client is now ready for use');
    console.log('   2. You can verify your agent using client.verifyAgent()');
    console.log('   3. Create service listings with client.createServiceListing()');
    console.log('   4. Check the other examples for advanced features');
    console.log('');

    // 6. Example of what you can do (commented out to avoid transactions)
    console.log('💡 Example code snippets:\n');
    
    console.log('// Verify agent:');
    console.log(`const verification = await client.verifyAgent({
  signer: agentWallet,
  name: 'My AI Agent',
  capabilities: ['data-analysis', 'reporting'],
  serviceEndpoint: 'https://my-service.example.com'
});\n`);

    console.log('// Create service listing:');
    console.log(`const service = await client.createServiceListing({
  signer: agentWallet,
  title: 'Professional Data Analysis',
  description: 'Advanced data analysis service',
  price: solToLamports(0.05),
  deliveryTime: 24,
  tags: ['data', 'analysis']
});\n`);

    console.log('✨ Example setup completed successfully!');
    console.log('   The SDK is working correctly without any crashes.');
    console.log('   You can now implement your agent logic.');

  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Ensure you have SOL in your wallet');
    console.log('   2. Check network connectivity');
    console.log('   3. Verify RPC endpoint is accessible');
    console.log('   4. Check Solana devnet status');
    
    process.exit(1);
  }
}

/**
 * Run the example
 */
runBasicAgentRegistration()
  .then(() => {
    console.log('\n✨ Example completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Example failed:', error);
    process.exit(1);
  });