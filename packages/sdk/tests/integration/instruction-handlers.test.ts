/**
 * Comprehensive Integration Tests for Smart Contract Instruction Handlers
 * 
 * This test suite validates all instruction handlers with:
 * - PDA derivation validation
 * - Error scenario testing
 * - Security boundary testing
 * - State transition validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { 
  generateKeyPairSigner, 
  createDefaultSolanaClient,
  generateKeyPairSignerWithSol,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  type Address,
  type KeyPairSigner,
  type TransactionSigner,
  getAddressFromPublicKey,
  assertAccountExists,
  fetchAccount,
  decodeLamportsAmount,
  address
} from '@solana/web3.js';
import {
  getCreateChannelInstruction,
  getBroadcastMessageInstruction,
  getSendMessageInstruction,
  getAddParticipantInstruction,
  getVerifyAgentInstruction,
  getCreateServiceListingInstruction,
  getPurchaseServiceInstruction,
  getCreateWorkOrderInstruction,
  getSubmitWorkDeliveryInstruction,
  getProcessPaymentInstruction,
  type ChannelAccount,
  type MessageAccount,
  type AgentAccount,
  decodeChannelAccount,
  decodeMessageAccount,
  getChannelAccountEncoder,
  getMessageAccountEncoder,
  getProgramAddress,
  findChannelPda,
  findMessagePda,
  findAgentPda,
  findWorkOrderPda,
  findListingPda,
  type ChannelVisibility,
  type MessageType,
  type MessageStatus
} from '../../src/generated-v2';
import { safeBigIntToU64, safeNumberToBigInt } from '../../src/utils/bigint-serialization';
import { SecureBigIntBuffer } from '../../src/utils/secure-bigint-buffer';

// Test configuration
const PROGRAM_ID = address('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
const TEST_TIMEOUT = 60000; // 60 seconds

describe('Instruction Handler Integration Tests', () => {
  let client: ReturnType<typeof createDefaultSolanaClient>;
  let authority: KeyPairSigner;
  let agent1: KeyPairSigner;
  let agent2: KeyPairSigner;
  let channelId: bigint;
  let messageCounter: bigint = 0n;
  
  beforeAll(async () => {
    // Initialize test environment
    client = createDefaultSolanaClient('http://127.0.0.1:8899');
    
    // Generate test keypairs with SOL
    authority = await generateKeyPairSignerWithSol(client, lamports(1000000000n)); // 1 SOL
    agent1 = await generateKeyPairSignerWithSol(client, lamports(1000000000n));
    agent2 = await generateKeyPairSignerWithSol(client, lamports(1000000000n));
    
    // Generate channel ID
    channelId = BigInt(Date.now());
  }, TEST_TIMEOUT);
  
  describe('Channel Instructions', () => {
    describe('createChannel', () => {
      it('should create a channel with valid parameters', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getCreateChannelInstruction({
          authority,
          channel: channelPda,
          channelId,
          name: 'Test Channel',
          metadata: 'Test channel for integration testing',
          visibility: 'public' as ChannelVisibility,
          programAddress: PROGRAM_ID
        });
        
        // Send transaction
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          tx => setTransactionMessageFeePayerSigner(authority, tx),
          tx => setTransactionMessageLifetimeUsingBlockhash(
            client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
            tx
          ),
          tx => ({
            ...tx,
            instructions: [instruction]
          })
        );
        
        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
        const signature = await client.rpc.sendTransaction(signedTransaction, { 
          skipPreflight: false 
        });
        
        await client.rpc.confirmTransaction(signature, { 
          commitment: 'confirmed' 
        });
        
        // Verify channel was created
        const channelAccount = await fetchAccount(client.rpc, channelPda);
        assertAccountExists(channelAccount);
        
        const decodedChannel = decodeChannelAccount(channelAccount.data);
        expect(decodedChannel.authority).toBe(authority.address);
        expect(decodedChannel.channelId).toBe(channelId);
        expect(decodedChannel.name).toBe('Test Channel');
        expect(decodedChannel.visibility).toBe('public');
      });
      
      it('should fail with duplicate channel ID', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getCreateChannelInstruction({
          authority,
          channel: channelPda,
          channelId,
          name: 'Duplicate Channel',
          metadata: 'Should fail',
          visibility: 'public' as ChannelVisibility,
          programAddress: PROGRAM_ID
        });
        
        await expect(async () => {
          const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(authority, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(
              client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
              tx
            ),
            tx => ({
              ...tx,
              instructions: [instruction]
            })
          );
          
          const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
          await client.rpc.sendTransaction(signedTransaction, { 
            skipPreflight: false 
          });
        }).toThrow();
      });
      
      it('should validate channel name length', async () => {
        const newChannelId = channelId + 1n;
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(newChannelId),
          programAddress: PROGRAM_ID
        });
        
        const longName = 'A'.repeat(65); // Exceeds 64 char limit
        
        const instruction = getCreateChannelInstruction({
          authority,
          channel: channelPda,
          channelId: newChannelId,
          name: longName,
          metadata: 'Test metadata',
          visibility: 'public' as ChannelVisibility,
          programAddress: PROGRAM_ID
        });
        
        await expect(async () => {
          const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(authority, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(
              client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
              tx
            ),
            tx => ({
              ...tx,
              instructions: [instruction]
            })
          );
          
          const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
          await client.rpc.sendTransaction(signedTransaction, { 
            skipPreflight: false 
          });
        }).toThrow();
      });
    });
    
    describe('addParticipant', () => {
      it('should add participant to existing channel', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getAddParticipantInstruction({
          authority,
          channel: channelPda,
          participant: agent1.address,
          programAddress: PROGRAM_ID
        });
        
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          tx => setTransactionMessageFeePayerSigner(authority, tx),
          tx => setTransactionMessageLifetimeUsingBlockhash(
            client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
            tx
          ),
          tx => ({
            ...tx,
            instructions: [instruction]
          })
        );
        
        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
        const signature = await client.rpc.sendTransaction(signedTransaction, { 
          skipPreflight: false 
        });
        
        await client.rpc.confirmTransaction(signature, { 
          commitment: 'confirmed' 
        });
        
        // Verify participant was added
        const channelAccount = await fetchAccount(client.rpc, channelPda);
        const decodedChannel = decodeChannelAccount(channelAccount.data);
        expect(decodedChannel.participantCount).toBe(1n);
      });
      
      it('should fail when non-authority adds participant', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getAddParticipantInstruction({
          authority: agent1, // Wrong authority
          channel: channelPda,
          participant: agent2.address,
          programAddress: PROGRAM_ID
        });
        
        await expect(async () => {
          const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(agent1, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(
              client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
              tx
            ),
            tx => ({
              ...tx,
              instructions: [instruction]
            })
          );
          
          const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
          await client.rpc.sendTransaction(signedTransaction, { 
            skipPreflight: false 
          });
        }).toThrow();
      });
    });
  });
  
  describe('Message Instructions', () => {
    describe('sendMessage', () => {
      it('should send message to channel', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const messageId = ++messageCounter;
        const [messagePda] = await findMessagePda({
          channel: channelPda,
          messageId: safeBigIntToU64(messageId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getSendMessageInstruction({
          sender: agent1,
          channel: channelPda,
          message: messagePda,
          messageId,
          content: 'Hello, channel!',
          messageType: 'text' as MessageType,
          metadata: JSON.stringify({ timestamp: Date.now() }),
          programAddress: PROGRAM_ID
        });
        
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          tx => setTransactionMessageFeePayerSigner(agent1, tx),
          tx => setTransactionMessageLifetimeUsingBlockhash(
            client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
            tx
          ),
          tx => ({
            ...tx,
            instructions: [instruction]
          })
        );
        
        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
        const signature = await client.rpc.sendTransaction(signedTransaction, { 
          skipPreflight: false 
        });
        
        await client.rpc.confirmTransaction(signature, { 
          commitment: 'confirmed' 
        });
        
        // Verify message was created
        const messageAccount = await fetchAccount(client.rpc, messagePda);
        assertAccountExists(messageAccount);
        
        const decodedMessage = decodeMessageAccount(messageAccount.data);
        expect(decodedMessage.sender).toBe(agent1.address);
        expect(decodedMessage.messageId).toBe(messageId);
        expect(decodedMessage.content).toBe('Hello, channel!');
        expect(decodedMessage.messageType).toBe('text');
        expect(decodedMessage.status).toBe('sent');
      });
      
      it('should validate message content length', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const messageId = ++messageCounter;
        const [messagePda] = await findMessagePda({
          channel: channelPda,
          messageId: safeBigIntToU64(messageId),
          programAddress: PROGRAM_ID
        });
        
        const longContent = 'A'.repeat(1025); // Exceeds 1024 char limit
        
        const instruction = getSendMessageInstruction({
          sender: agent1,
          channel: channelPda,
          message: messagePda,
          messageId,
          content: longContent,
          messageType: 'text' as MessageType,
          metadata: '',
          programAddress: PROGRAM_ID
        });
        
        await expect(async () => {
          const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(agent1, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(
              client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
              tx
            ),
            tx => ({
              ...tx,
              instructions: [instruction]
            })
          );
          
          const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
          await client.rpc.sendTransaction(signedTransaction, { 
            skipPreflight: false 
          });
        }).toThrow();
      });
      
      it('should fail when non-participant sends message', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const messageId = ++messageCounter;
        const [messagePda] = await findMessagePda({
          channel: channelPda,
          messageId: safeBigIntToU64(messageId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getSendMessageInstruction({
          sender: agent2, // Not a participant
          channel: channelPda,
          message: messagePda,
          messageId,
          content: 'Unauthorized message',
          messageType: 'text' as MessageType,
          metadata: '',
          programAddress: PROGRAM_ID
        });
        
        await expect(async () => {
          const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(agent2, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(
              client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
              tx
            ),
            tx => ({
              ...tx,
              instructions: [instruction]
            })
          );
          
          const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
          await client.rpc.sendTransaction(signedTransaction, { 
            skipPreflight: false 
          });
        }).toThrow();
      });
    });
    
    describe('broadcastMessage', () => {
      it('should broadcast message from authority', async () => {
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const messageId = ++messageCounter;
        const [messagePda] = await findMessagePda({
          channel: channelPda,
          messageId: safeBigIntToU64(messageId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getBroadcastMessageInstruction({
          authority,
          channel: channelPda,
          message: messagePda,
          messageId,
          content: 'Broadcast: Important announcement',
          messageType: 'announcement' as MessageType,
          metadata: JSON.stringify({ priority: 'high' }),
          programAddress: PROGRAM_ID
        });
        
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          tx => setTransactionMessageFeePayerSigner(authority, tx),
          tx => setTransactionMessageLifetimeUsingBlockhash(
            client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
            tx
          ),
          tx => ({
            ...tx,
            instructions: [instruction]
          })
        );
        
        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
        const signature = await client.rpc.sendTransaction(signedTransaction, { 
          skipPreflight: false 
        });
        
        await client.rpc.confirmTransaction(signature, { 
          commitment: 'confirmed' 
        });
        
        // Verify broadcast message
        const messageAccount = await fetchAccount(client.rpc, messagePda);
        const decodedMessage = decodeMessageAccount(messageAccount.data);
        expect(decodedMessage.sender).toBe(authority.address);
        expect(decodedMessage.messageType).toBe('announcement');
      });
    });
  });
  
  describe('PDA Derivation Tests', () => {
    it('should derive consistent channel PDAs', async () => {
      const testChannelId = 12345n;
      const [pda1, bump1] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(testChannelId),
        programAddress: PROGRAM_ID
      });
      
      const [pda2, bump2] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(testChannelId),
        programAddress: PROGRAM_ID
      });
      
      expect(pda1).toBe(pda2);
      expect(bump1).toBe(bump2);
    });
    
    it('should derive different PDAs for different channel IDs', async () => {
      const [pda1] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(100n),
        programAddress: PROGRAM_ID
      });
      
      const [pda2] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(200n),
        programAddress: PROGRAM_ID
      });
      
      expect(pda1).not.toBe(pda2);
    });
    
    it('should derive consistent message PDAs', async () => {
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      const testMessageId = 999n;
      const [pda1, bump1] = await findMessagePda({
        channel: channelPda,
        messageId: safeBigIntToU64(testMessageId),
        programAddress: PROGRAM_ID
      });
      
      const [pda2, bump2] = await findMessagePda({
        channel: channelPda,
        messageId: safeBigIntToU64(testMessageId),
        programAddress: PROGRAM_ID
      });
      
      expect(pda1).toBe(pda2);
      expect(bump1).toBe(bump2);
    });
  });
  
  describe('BigInt Security Tests', () => {
    it('should handle secure BigInt conversions', () => {
      // Test secure buffer to BigInt conversion
      const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      const value = SecureBigIntBuffer.fromBufferLE(buffer);
      expect(value).toBe(0xFFFFFFFFFFFFFFFFn);
      
      // Test secure BigInt to buffer conversion
      const bigintValue = 0x1234567890ABCDEFn;
      const resultBuffer = SecureBigIntBuffer.toBufferLE(bigintValue);
      expect(resultBuffer.length).toBe(8);
      
      // Verify round-trip conversion
      const roundTrip = SecureBigIntBuffer.fromBufferLE(resultBuffer);
      expect(roundTrip).toBe(bigintValue);
    });
    
    it('should reject oversized buffers', () => {
      const oversizedBuffer = Buffer.alloc(16); // Too large
      expect(() => {
        SecureBigIntBuffer.fromBufferLE(oversizedBuffer);
      }).toThrow(/exceeds maximum allowed size/);
    });
    
    it('should reject negative BigInt values', () => {
      expect(() => {
        SecureBigIntBuffer.toBufferLE(-1n);
      }).toThrow(/cannot be negative/);
    });
    
    it('should reject BigInt values exceeding u64 max', () => {
      const tooBig = 0xFFFFFFFFFFFFFFFFn + 1n;
      expect(() => {
        SecureBigIntBuffer.toBufferLE(tooBig);
      }).toThrow(/exceeds maximum u64 value/);
    });
  });
  
  describe('Error Boundary Tests', () => {
    it('should handle network errors gracefully', async () => {
      // Create a client with invalid endpoint
      const badClient = createDefaultSolanaClient('http://invalid-endpoint:8899');
      
      await expect(async () => {
        await badClient.rpc.getLatestBlockhash();
      }).toThrow();
    });
    
    it('should handle malformed instruction data', async () => {
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      // Try to create channel with invalid visibility
      const instruction = getCreateChannelInstruction({
        authority,
        channel: channelPda,
        channelId: channelId + 100n,
        name: 'Test',
        metadata: 'Test',
        visibility: 'invalid' as any, // Invalid enum value
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          tx => setTransactionMessageFeePayerSigner(authority, tx),
          tx => setTransactionMessageLifetimeUsingBlockhash(
            client.rpc.getLatestBlockhash({ commitment: 'finalized' }).then(b => b.value),
            tx
          ),
          tx => ({
            ...tx,
            instructions: [instruction]
          })
        );
        
        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
        await client.rpc.sendTransaction(signedTransaction, { 
          skipPreflight: false 
        });
      }).toThrow();
    });
  });
  
  afterAll(async () => {
    // Cleanup if needed
  });
});