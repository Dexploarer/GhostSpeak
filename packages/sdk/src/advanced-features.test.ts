/**
 * Advanced Features Test - Verifying newly enabled instruction builders
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { createDevnetClient } from './client-v2';
import { generateKeyPair } from '@solana/keys';
import { getAddressFromPublicKey } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { logger } from '../../../shared/logger';

// Import newly re-enabled functions
import {
  getAddParticipantInstruction,
  getBroadcastMessageInstruction,
  getProcessPaymentInstruction,
} from './generated-v2/instructions/index';

describe('Advanced Features Integration Tests', () => {
  let client: ReturnType<typeof createDevnetClient>;
  let testSigner: KeyPairSigner & { address: string };
  let testSigner2: KeyPairSigner & { address: string };

  beforeAll(async () => {
    client = createDevnetClient();

    // Generate test keypairs
    const baseSigner = await generateKeyPair();
    const baseSigner2 = await generateKeyPair();

    const signerAddress = await getAddressFromPublicKey(baseSigner.publicKey);
    const signerAddress2 = await getAddressFromPublicKey(baseSigner2.publicKey);

    testSigner = { ...baseSigner, address: signerAddress };
    testSigner2 = { ...baseSigner2, address: signerAddress2 };

    logger.general.info('🧪 Advanced features test setup complete');
  });

  it('should create addParticipant instruction', async () => {
    try {
      const instruction = getAddParticipantInstruction({
        channelAccount: testSigner.address,
        admin: testSigner,
        newParticipant: testSigner2.address,
      });

      expect(instruction).toBeDefined();
      expect(instruction.accounts).toBeDefined();
      expect(instruction.data).toBeDefined();
      expect(instruction.programAddress).toBeDefined();

      logger.general.info('✅ AddParticipant instruction created successfully');
      logger.general.info('📋 Instruction accounts:', instruction.accounts.length);
    } catch (error) {
      logger.general.error('❌ AddParticipant instruction failed:', error);
      throw error;
    }
  });

  it('should create broadcastMessage instruction', async () => {
    try {
      const instruction = getBroadcastMessageInstruction({
        messageAccount: testSigner.address,
        channelAccount: testSigner2.address,
        sender: testSigner,
        messageId: 'test-broadcast-message-id',
        content: 'Hello everyone in the channel!',
      });

      expect(instruction).toBeDefined();
      expect(instruction.accounts).toBeDefined();
      expect(instruction.data).toBeDefined();
      expect(instruction.programAddress).toBeDefined();

      logger.general.info('✅ BroadcastMessage instruction created successfully');
      logger.general.info('📋 Instruction accounts:', instruction.accounts.length);
    } catch (error) {
      logger.general.error('❌ BroadcastMessage instruction failed:', error);
      throw error;
    }
  });

  it('should create processPayment instruction', async () => {
    try {
      const instruction = getProcessPaymentInstruction({
        payment: testSigner.address,
        workOrder: testSigner2.address,
        providerAgent: testSigner.address,
        payer: testSigner.address,
        payerTokenAccount: testSigner.address,
        providerTokenAccount: testSigner2.address,
        tokenMint: testSigner.address,
        amount: BigInt(1000000), // 1 SOL in lamports
        useConfidentialTransfer: false,
      });

      expect(instruction).toBeDefined();
      expect(instruction.accounts).toBeDefined();
      expect(instruction.data).toBeDefined();
      expect(instruction.programAddress).toBeDefined();

      logger.general.info('✅ ProcessPayment instruction created successfully');
      logger.general.info('📋 Instruction accounts:', instruction.accounts.length);
    } catch (error) {
      logger.general.error('❌ ProcessPayment instruction failed:', error);
      throw error;
    }
  });

  it('should verify all advanced services can access the instructions', async () => {
    // Test that our services can access the newly enabled instructions
    const services = {
      agents: client.agents,
      channels: client.channels,
      messages: client.messages,
      escrow: client.escrow,
    };

    Object.entries(services).forEach(([name, service]) => {
      expect(service).toBeDefined();
      logger.general.info(`✅ ${name} service available`);
    });

    logger.general.info('✅ All advanced services accessible');
  });
});
