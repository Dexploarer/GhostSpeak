#!/usr/bin/env node

// Direct test of escrow creation without CLI prompts
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { createKeyPairFromBytes, createSolanaRpc, address, getAddressFromPublicKey } from '@solana/kit';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function testEscrowCreation() {
  console.log('🧪 Testing direct escrow creation...');
  
  try {
    // Initialize client
    const rpc = createSolanaRpc('https://api.devnet.solana.com');
    const client = new GhostSpeakClient({ rpc });
    
    // Load user's actual wallet
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');
    console.log('📁 Loading wallet from:', walletPath);
    const walletData = JSON.parse(readFileSync(walletPath, 'utf8'));
    console.log('📄 Wallet data length:', walletData.length);
    const wallet = await createKeyPairFromBytes(new Uint8Array(walletData));
    const walletAddress = await getAddressFromPublicKey(wallet.publicKey);
    
    // Create proper signer object for CLI compatibility
    const signer = {
      address: walletAddress,
      publicKey: walletAddress,
      sign: async (message) => {
        const signature = await crypto.subtle.sign('Ed25519', wallet.privateKey, message);
        return new Uint8Array(signature);
      }
    };
    
    console.log('✅ Client initialized');
    console.log('📍 Program ID:', client.config.programId);
    console.log('🔑 Wallet address:', walletAddress);
    
    // Generate test parameters
    const orderId = BigInt(Date.now());
    
    // Generate PDA for work order
    const { getProgramDerivedAddress, getAddressEncoder } = await import('@solana/kit');
    const addressEncoder = getAddressEncoder();
    
    const [workOrderPda, bump] = await getProgramDerivedAddress({
      programAddress: client.config.programId,
      seeds: [
        new TextEncoder().encode('work_order'),
        new TextEncoder().encode(orderId.toString()),
        addressEncoder.encode(walletAddress)
      ]
    });
    
    console.log('📍 Work Order PDA:', workOrderPda);
    console.log('🎯 Bump:', bump);
    
    // Test createEscrow call
    console.log('🚀 Attempting to create escrow...');
    
    const signature = await client.createEscrow(
      signer,
      workOrderPda,
      {
        orderId,
        provider: address('5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK'),
        title: `Test Work Order #${orderId}`,
        description: 'Test escrow payment for debugging',
        requirements: ['Complete the test task'],
        paymentAmount: BigInt(1_000_000_000), // 1 SOL in lamports
        paymentToken: address('So11111111111111111111111111111111111111112'), // Native SOL
        deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60) // 7 days from now
      }
    );
    
    console.log('✅ Escrow created successfully!');
    console.log('📄 Transaction signature:', signature);
    console.log('🔗 Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
  } catch (error) {
    console.error('❌ Escrow creation failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Check specific error types
    if (error.message.includes('insufficient funds')) {
      console.log('💡 Suggestion: Fund the wallet with SOL for gas fees');
    } else if (error.message.includes('program')) {
      console.log('💡 Suggestion: Check if the program is deployed correctly');
    } else if (error.message.includes('length')) {
      console.log('💡 Suggestion: Array encoding issue - check codec patterns');
    }
  }
}

testEscrowCreation().catch(console.error);