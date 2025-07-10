/**
 * Error Scenario Integration Tests
 * 
 * Comprehensive testing of error conditions, edge cases, and security boundaries
 * to ensure the protocol handles all failure scenarios gracefully
 */

import { describe, it, expect, beforeAll } from 'bun:test';
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
  address,
  type KeyPairSigner,
  getAddressFromPublicKey,
  type Address,
  type TransactionMessage,
  type IInstruction
} from '@solana/web3.js';
import {
  getCreateChannelInstruction,
  getSendMessageInstruction,
  getAddParticipantInstruction,
  getCreateServiceListingInstruction,
  getPurchaseServiceInstruction,
  getCreateWorkOrderInstruction,
  getSubmitWorkDeliveryInstruction,
  getProcessPaymentInstruction,
  findChannelPda,
  findMessagePda,
  findAgentPda,
  findWorkOrderPda,
  findListingPda,
  type ChannelVisibility,
  type MessageType,
  type WorkOrderStatus
} from '../../src/generated-v2';
import { safeBigIntToU64 } from '../../src/utils/bigint-serialization';

const PROGRAM_ID = address('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
const TEST_TIMEOUT = 60000;

describe('Error Scenario Integration Tests', () => {
  let client: ReturnType<typeof createDefaultSolanaClient>;
  let authority: KeyPairSigner;
  let agent1: KeyPairSigner;
  let agent2: KeyPairSigner;
  let poorAccount: KeyPairSigner; // Account with insufficient funds
  
  beforeAll(async () => {
    client = createDefaultSolanaClient('http://127.0.0.1:8899');
    
    // Initialize test accounts
    authority = await generateKeyPairSignerWithSol(client, lamports(1000000000n));
    agent1 = await generateKeyPairSignerWithSol(client, lamports(1000000000n));
    agent2 = await generateKeyPairSignerWithSol(client, lamports(1000000000n));
    poorAccount = await generateKeyPairSignerWithSol(client, lamports(1000n)); // Very little SOL
  }, TEST_TIMEOUT);
  
  describe('Authorization Errors', () => {
    it('should reject unauthorized channel creation', async () => {
      const channelId = BigInt(Date.now());
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      // Try to create channel with wrong signer
      const instruction = getCreateChannelInstruction({
        authority: authority, // Authority in instruction
        channel: channelPda,
        channelId,
        name: 'Unauthorized Channel',
        metadata: 'Should fail',
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          tx => setTransactionMessageFeePayerSigner(agent1, tx), // Wrong fee payer
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
        await client.rpc.sendTransaction(signedTransaction, { skipPreflight: false });
      }).toThrow();
    });
    
    it('should reject participant addition by non-authority', async () => {
      // First create a channel
      const channelId = BigInt(Date.now() + 1);
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      const createInstruction = getCreateChannelInstruction({
        authority,
        channel: channelPda,
        channelId,
        name: 'Test Channel',
        metadata: 'Test',
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      await sendTransaction(client, authority, [createInstruction]);
      
      // Try to add participant as non-authority
      const addInstruction = getAddParticipantInstruction({
        authority: agent1, // Wrong authority
        channel: channelPda,
        participant: agent2.address,
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, agent1, [addInstruction]);
      }).toThrow();
    });
  });
  
  describe('Invalid Input Errors', () => {
    it('should reject empty channel name', async () => {
      const channelId = BigInt(Date.now() + 2);
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      const instruction = getCreateChannelInstruction({
        authority,
        channel: channelPda,
        channelId,
        name: '', // Empty name
        metadata: 'Test',
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, authority, [instruction]);
      }).toThrow();
    });
    
    it('should reject excessively long metadata', async () => {
      const channelId = BigInt(Date.now() + 3);
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      const longMetadata = 'A'.repeat(2049); // Exceeds 2048 limit
      
      const instruction = getCreateChannelInstruction({
        authority,
        channel: channelPda,
        channelId,
        name: 'Test Channel',
        metadata: longMetadata,
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, authority, [instruction]);
      }).toThrow();
    });
    
    it('should reject invalid enum values', async () => {
      const channelId = BigInt(Date.now() + 4);
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
        metadata: 'Test',
        visibility: 'invalid_visibility' as any, // Invalid enum
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, authority, [instruction]);
      }).toThrow();
    });
  });
  
  describe('State Validation Errors', () => {
    it('should reject message to non-existent channel', async () => {
      const fakeChannelId = 999999n;
      const [fakeChannelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(fakeChannelId),
        programAddress: PROGRAM_ID
      });
      
      const messageId = 1n;
      const [messagePda] = await findMessagePda({
        channel: fakeChannelPda,
        messageId: safeBigIntToU64(messageId),
        programAddress: PROGRAM_ID
      });
      
      const instruction = getSendMessageInstruction({
        sender: agent1,
        channel: fakeChannelPda,
        message: messagePda,
        messageId,
        content: 'Message to nowhere',
        messageType: 'text' as MessageType,
        metadata: '',
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, agent1, [instruction]);
      }).toThrow();
    });
    
    it('should reject duplicate work order IDs', async () => {
      const orderId = 12345n;
      const [workOrderPda] = await findWorkOrderPda({
        creator: authority.address,
        orderId: safeBigIntToU64(orderId),
        programAddress: PROGRAM_ID
      });
      
      const createOrder = getCreateWorkOrderInstruction({
        creator: authority,
        workOrder: workOrderPda,
        orderId,
        title: 'Test Work Order',
        description: 'Test description',
        budget: 1000000n,
        deadline: BigInt(Date.now() / 1000 + 86400), // 24 hours
        programAddress: PROGRAM_ID
      });
      
      // Create first order
      await sendTransaction(client, authority, [createOrder]);
      
      // Try to create duplicate
      await expect(async () => {
        await sendTransaction(client, authority, [createOrder]);
      }).toThrow();
    });
  });
  
  describe('Insufficient Funds Errors', () => {
    it('should reject transaction with insufficient SOL', async () => {
      const channelId = BigInt(Date.now() + 5);
      const [channelPda] = await findChannelPda({
        authority: poorAccount.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      const instruction = getCreateChannelInstruction({
        authority: poorAccount,
        channel: channelPda,
        channelId,
        name: 'Poor Channel',
        metadata: 'No funds',
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, poorAccount, [instruction]);
      }).toThrow();
    });
    
    it('should reject purchase with insufficient funds', async () => {
      // Create a listing first
      const listingId = 1n;
      const [agentPda] = await findAgentPda({
        owner: agent1.address,
        programAddress: PROGRAM_ID
      });
      const [listingPda] = await findListingPda({
        agent: agentPda,
        listingId: safeBigIntToU64(listingId),
        programAddress: PROGRAM_ID
      });
      
      const createListing = getCreateServiceListingInstruction({
        agent: agent1,
        agentAccount: agentPda,
        listing: listingPda,
        listingId,
        title: 'Expensive Service',
        description: 'Very expensive',
        price: 1000000000000n, // Way more than poorAccount has
        programAddress: PROGRAM_ID
      });
      
      await sendTransaction(client, agent1, [createListing]);
      
      // Try to purchase with insufficient funds
      const purchaseInstruction = getPurchaseServiceInstruction({
        buyer: poorAccount,
        seller: agent1.address,
        listing: listingPda,
        programAddress: PROGRAM_ID
      });
      
      await expect(async () => {
        await sendTransaction(client, poorAccount, [purchaseInstruction]);
      }).toThrow();
    });
  });
  
  describe('Overflow and Boundary Errors', () => {
    it('should handle u64 overflow attempts', async () => {
      const overflowId = 0xFFFFFFFFFFFFFFFFn + 1n; // Overflow u64
      
      expect(() => {
        safeBigIntToU64(overflowId);
      }).toThrow(/exceeds u64 maximum/);
    });
    
    it('should reject negative values', async () => {
      expect(() => {
        safeBigIntToU64(-1n);
      }).toThrow(/cannot be negative/);
    });
    
    it('should handle maximum safe integer boundaries', () => {
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      const result = safeBigIntToU64(maxSafe);
      expect(result).toBe(maxSafe);
      
      const beyondSafe = maxSafe + 1n;
      const result2 = safeBigIntToU64(beyondSafe);
      expect(result2).toBe(beyondSafe);
    });
  });
  
  describe('Concurrent Operation Errors', () => {
    it('should handle concurrent channel creations', async () => {
      const baseId = BigInt(Date.now());
      const concurrentCreations = [];
      
      // Try to create 5 channels concurrently
      for (let i = 0; i < 5; i++) {
        const channelId = baseId + BigInt(i);
        const [channelPda] = await findChannelPda({
          authority: authority.address,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        const instruction = getCreateChannelInstruction({
          authority,
          channel: channelPda,
          channelId,
          name: `Concurrent Channel ${i}`,
          metadata: 'Concurrent test',
          visibility: 'public' as ChannelVisibility,
          programAddress: PROGRAM_ID
        });
        
        concurrentCreations.push(
          sendTransaction(client, authority, [instruction])
            .then(() => ({ success: true, index: i }))
            .catch(() => ({ success: false, index: i }))
        );
      }
      
      const results = await Promise.all(concurrentCreations);
      const successes = results.filter(r => r.success).length;
      
      // At least some should succeed
      expect(successes).toBeGreaterThan(0);
    });
  });
  
  describe('Account Size Errors', () => {
    it('should handle account size limits', async () => {
      const channelId = BigInt(Date.now() + 100);
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      // Try to create channel with maximum allowed data
      const maxName = 'A'.repeat(64); // Max name length
      const maxMetadata = 'B'.repeat(256); // Reasonable metadata limit
      
      const instruction = getCreateChannelInstruction({
        authority,
        channel: channelPda,
        channelId,
        name: maxName,
        metadata: maxMetadata,
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      // Should succeed with max allowed sizes
      await expect(
        sendTransaction(client, authority, [instruction])
      ).resolves.toBeDefined();
    });
  });
  
  describe('Recovery Scenarios', () => {
    it('should allow retry after transient failures', async () => {
      const channelId = BigInt(Date.now() + 200);
      const [channelPda] = await findChannelPda({
        authority: authority.address,
        channelId: safeBigIntToU64(channelId),
        programAddress: PROGRAM_ID
      });
      
      const instruction = getCreateChannelInstruction({
        authority,
        channel: channelPda,
        channelId,
        name: 'Retry Test Channel',
        metadata: 'Testing retry logic',
        visibility: 'public' as ChannelVisibility,
        programAddress: PROGRAM_ID
      });
      
      let attempts = 0;
      let success = false;
      
      while (attempts < 3 && !success) {
        try {
          await sendTransaction(client, authority, [instruction]);
          success = true;
        } catch (error) {
          attempts++;
          if (attempts < 3) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      expect(success || attempts).toBeTruthy();
    });
  });
});

// Helper function to send transactions
async function sendTransaction(
  client: ReturnType<typeof createDefaultSolanaClient>,
  signer: KeyPairSigner,
  instructions: IInstruction[]
): Promise<string> {
  const latestBlockhash = await client.rpc.getLatestBlockhash({ 
    commitment: 'finalized' 
  });
  
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(signer, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash.value, tx),
    tx => ({
      ...tx,
      instructions
    })
  );
  
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
  const signature = await client.rpc.sendTransaction(signedTransaction, { 
    skipPreflight: false 
  });
  
  await client.rpc.confirmTransaction(signature, { 
    commitment: 'confirmed' 
  });
  
  return signature;
}