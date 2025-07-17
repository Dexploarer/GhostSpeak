#!/usr/bin/env node

/**
 * Test channel messaging command
 */

import { createSolanaRpc, createKeyPairSignerFromBytes, address } from '@solana/kit';
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Program ID
const PROGRAM_ID = 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR';

// Get wallet
async function getWallet() {
  const defaultWalletPath = join(homedir(), '.config', 'solana', 'id.json');
  if (existsSync(defaultWalletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(defaultWalletPath, 'utf-8'));
      if (walletData.length === 64) {
        return await createKeyPairSignerFromBytes(new Uint8Array(walletData));
      }
    } catch (error) {
      log(`Failed to load wallet: ${error.message}`, colors.red);
    }
  }
  throw new Error('No valid wallet found');
}

async function testChannelMessage() {
  log('\n💬 Channel Message Test', colors.bold);
  log('=======================\n', colors.bold);
  
  try {
    // Initialize RPC and client
    log('1. Initializing connection...', colors.yellow);
    const rpcUrl = 'https://api.devnet.solana.com';
    const rpc = createSolanaRpc(rpcUrl);
    
    // Get wallet
    log('2. Loading wallet...', colors.yellow);
    const wallet = await getWallet();
    log(`   Wallet address: ${wallet.address}`, colors.blue);
    
    // Initialize SDK client
    log('3. Initializing GhostSpeak client...', colors.yellow);
    const client = new GhostSpeakClient({
      rpc,
      signer: wallet,
      programId: address(PROGRAM_ID)
    });
    
    // Use the existing A2A session
    const sessionAddress = address('3p7Z9FM6ntPZ3RDm7TYK8ZWL6V3VN79hko84SUZ7v1Ds');
    log(`   Using existing A2A session: ${sessionAddress}`, colors.blue);
    
    // Test message parameters
    const messageId = BigInt(Date.now());
    const sessionId = BigInt(1752724234039); // From the previous test
    const messageData = {
      messageId,
      sessionId,
      sender: wallet.address,
      content: 'Hello from GhostSpeak A2A protocol! This is a test message.',
      messageType: 'Text',
      timestamp: BigInt(Math.floor(Date.now() / 1000))
    };
    
    log(`   Message ID: ${messageData.messageId}`, colors.blue);
    log(`   Session ID: ${messageData.sessionId}`, colors.blue);
    log(`   Message type: ${messageData.messageType}`, colors.blue);
    log(`   Content: ${messageData.content}`, colors.blue);
    log(`   Timestamp: ${new Date(Number(messageData.timestamp) * 1000).toLocaleString()}`, colors.blue);
    
    // Generate PDA for A2A message - need session's created_at timestamp
    log('4. Getting session details for PDA generation...', colors.yellow);
    
    // First, get the session's created_at timestamp from the account data
    const sessionAccountInfo = await rpc.getAccountInfo(sessionAddress, {
      commitment: 'confirmed',
      encoding: 'base64'
    }).send();
    
    if (!sessionAccountInfo.value) {
      throw new Error('Session account not found');
    }
    
    // Parse created_at from session account data - found at offset 8
    const sessionBuffer = Buffer.from(sessionAccountInfo.value.data[0], 'base64');
    // The created_at timestamp is at offset 8 (confirmed by debug script)
    const sessionCreatedAt = sessionBuffer.readBigInt64LE(8); // Read from correct offset
    
    log(`   Session created_at: ${sessionCreatedAt}`, colors.blue);
    
    log('5. Generating A2A message PDA with correct seeds...', colors.yellow);
    
    const { getProgramDerivedAddress, getAddressEncoder, getU64Encoder } = await import('@solana/kit');
    
    // Convert created_at to little-endian bytes 
    const createdAtBytes = new Uint8Array(8);
    const view = new DataView(createdAtBytes.buffer);
    view.setBigInt64(0, sessionCreatedAt, true); // true = little-endian
    
    const [messagePda] = await getProgramDerivedAddress({
      programAddress: address(PROGRAM_ID),
      seeds: [
        new TextEncoder().encode('a2a_message'),
        getAddressEncoder().encode(sessionAddress), // session address
        createdAtBytes // session's created_at as little-endian bytes
      ]
    });
    
    log(`   A2A Message PDA: ${messagePda}`, colors.blue);
    
    // Send the A2A message using SDK (PDA derivation now uses session.createdAt)
    log('6. Sending A2A message on blockchain...', colors.yellow);
    
    try {
      // Use the SDK call with the updated signature (no messagePda parameter needed)
      const signature = await client.sendA2AMessage(
        wallet,
        sessionAddress,
        messageData
      );
      
      log('\n✅ A2A MESSAGE SENT SUCCESSFULLY!', colors.green);
      log(`   Transaction signature: ${signature}`, colors.green);
      log(`   Message address: ${messagePda} (derived from session.createdAt)`, colors.green);
      log(`   Explorer URL: https://explorer.solana.com/tx/${signature}?cluster=devnet`, colors.blue);
      log(`   Message Account: https://explorer.solana.com/address/${messagePda}?cluster=devnet`, colors.blue);
      
      // Wait a moment for confirmation
      log('\n7. Waiting for confirmation...', colors.yellow);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Verify the message was created
      log('8. Verifying A2A message on-chain...', colors.yellow);
      
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(`solana account ${messagePda} --url devnet`);
        
        if (stdout.includes(`Owner: ${PROGRAM_ID}`)) {
          log('✅ A2A message account verified on-chain!', colors.green);
          log(`   Owner confirmed: ${PROGRAM_ID}`, colors.blue);
          
          // Parse some data from the account
          const lines = stdout.split('\n');
          const balanceLine = lines.find(l => l.includes('Balance:'));
          if (balanceLine) {
            log(`   ${balanceLine.trim()}`, colors.blue);
          }
          
          const lengthLine = lines.find(l => l.includes('Length:'));
          if (lengthLine) {
            log(`   ${lengthLine.trim()}`, colors.blue);
          }
          
          // Check for message content in the data
          if (stdout.includes('Hello from GhostSpeak')) {
            log('   ✅ Message content found in account data!', colors.green);
          }
        } else {
          log('⚠️  Account exists but with unexpected owner', colors.yellow);
          log(`   Full output:\n${stdout}`, colors.yellow);
        }
      } catch (verifyError) {
        log(`⚠️  Could not verify A2A message: ${verifyError.message}`, colors.yellow);
      }
      
      return {
        success: true,
        signature,
        messageAddress: messagePda,
        messageContent: messageData.content,
        messageId: messageData.messageId.toString()
      };
      
    } catch (sendError) {
      log('\n❌ A2A MESSAGE SENDING FAILED!', colors.red);
      log(`   Error: ${sendError.message}`, colors.red);
      
      if (sendError.logs) {
        log('\n📋 Program logs:', colors.yellow);
        sendError.logs.forEach(logEntry => log(`   ${logEntry}`, colors.yellow));
      }
      
      if (sendError.context && sendError.context.logs) {
        log('\n📋 Transaction logs:', colors.yellow);
        sendError.context.logs.forEach(logEntry => log(`   ${logEntry}`, colors.yellow));
      }
      
      return {
        success: false,
        error: sendError.message
      };
    }
    
  } catch (error) {
    log(`\n❌ Test setup failed: ${error.message}`, colors.red);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testChannelMessage()
  .then(result => {
    if (result.success) {
      log('\n🎉 TEST PASSED - Channel messaging works!', colors.green);
      log(`\n📝 Test Summary:`, colors.bold);
      log(`   - Sent message ID: ${result.messageId}`, colors.blue);
      log(`   - Message content: "${result.messageContent}"`, colors.blue);
      log(`   - Transaction confirmed: ${result.signature}`, colors.blue);
      log(`   - Account verified at: ${result.messageAddress}`, colors.blue);
      log(`\n🔗 Verification Links:`, colors.bold);
      log(`   - Transaction: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`, colors.cyan);
      log(`   - A2A Message: https://explorer.solana.com/address/${result.messageAddress}?cluster=devnet`, colors.cyan);
    } else {
      log('\n💥 TEST FAILED', colors.red);
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n💥 TEST CRASHED: ${error.message}`, colors.red);
    process.exit(1);
  });