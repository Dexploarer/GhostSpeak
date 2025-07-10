/**
 * Integration Tests for Real Smart Contract Connections
 * Verifies that the SDK can connect to real Anchor programs
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { createDevnetClient } from './client-v2';
import { generateKeyPair } from '@solana/keys';
import { getAddressFromPublicKey } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { logger } from '../../../shared/logger';

describe('Real Smart Contract Integration Tests', () => {
  let client: ReturnType<typeof createDevnetClient>;
  let testSigner: KeyPairSigner & { address: string };

  beforeAll(async () => {
    // Create devnet client
    client = createDevnetClient();

    // Generate test keypair
    const baseSigner = await generateKeyPair();

    // Get the address from the public key
    const signerAddress = await getAddressFromPublicKey(baseSigner.publicKey);

    // Create extended signer with address property
    testSigner = {
      ...baseSigner,
      address: signerAddress,
    };

    logger.general.info('🧪 Test setup complete');
    logger.general.info(`🔑 Test signer address: ${signerAddress}`);
  });

  it('should create PodAI client with real RPC connections', async () => {
    expect(client).toBeDefined();
    expect(client.getRpc()).toBeDefined();
    expect(client.getRpcSubscriptions()).toBeDefined();
    expect(client.getProgramId()).toBeDefined();

    logger.general.info('✅ Client creation successful');
  });

  it('should connect to Solana devnet', async () => {
    const isConnected = await client.isConnected();
    expect(isConnected).toBe(true);

    logger.general.info('✅ Devnet connection successful');
  });

  it('should get cluster info', async () => {
    const clusterInfo = await client.getClusterInfo();
    expect(clusterInfo).toBeDefined();
    expect(clusterInfo.cluster).toBe('devnet');
    expect(clusterInfo.blockHeight).toBeGreaterThan(0);
    expect(clusterInfo.health).toBe('ok');

    logger.general.info('✅ Cluster info retrieved:', clusterInfo);
  });

  it('should initialize services with real instruction builders', async () => {
    // Test Agent Service
    const agentService = client.agents;
    expect(agentService).toBeDefined();

    // Test Channel Service
    const channelService = client.channels;
    expect(channelService).toBeDefined();

    // Test Message Service
    const messageService = client.messages;
    expect(messageService).toBeDefined();

    logger.general.info('✅ All services initialized with real instruction builders');
  });

  it('should have real instruction builders available', async () => {
    // Test that we can create instructions (without executing them)
    try {
      // This would fail if instruction builders aren't available
      const { getVerifyAgentInstruction } = await import('./generated-v2/instructions/verifyAgent');
      const { getCreateChannelInstructionAsync } = await import(
        './generated-v2/instructions/createChannel'
      );
      const { getSendMessageInstructionAsync } = await import(
        './generated-v2/instructions/sendMessage'
      );

      expect(getVerifyAgentInstruction).toBeDefined();
      expect(getCreateChannelInstructionAsync).toBeDefined();
      expect(getSendMessageInstructionAsync).toBeDefined();

      logger.general.info('✅ Real instruction builders available');
    } catch (error) {
      logger.general.error('❌ Instruction builders not available:', error);
      throw error;
    }
  });

  it('should validate smart contract program ID', async () => {
    const programId = client.getProgramId();
    expect(programId).toBeDefined();
    expect(typeof programId).toBe('string');
    expect(programId.length).toBeGreaterThan(0);

    logger.general.info('✅ Program ID validated:', programId);
  });

  it('should handle RPC and subscription clients', async () => {
    const rpc = client.getRpc();
    const rpcSubscriptions = client.getRpcSubscriptions();

    expect(rpc).toBeDefined();
    expect(rpcSubscriptions).toBeDefined();

    // Test that RPC client can make calls
    const health = await rpc.getHealth().send();
    expect(health).toBe('ok');

    logger.general.info('✅ RPC and subscription clients working');
  });

  it('should demonstrate real instruction creation (without execution)', async () => {
    try {
      const { getVerifyAgentInstruction } = await import('./generated-v2/instructions/verifyAgent');

      // Create a register agent instruction to verify it works
      const instruction = await getVerifyAgentInstruction({
        signer: testSigner,
        capabilities: BigInt(0),
        metadataUri: 'https://example.com/metadata.json',
      });

      expect(instruction).toBeDefined();
      expect(instruction.accounts).toBeDefined();
      expect(instruction.data).toBeDefined();
      expect(instruction.programAddress).toBeDefined();

      logger.general.info('✅ Real instruction creation successful');
      logger.general.info('📋 Instruction accounts:', instruction.accounts.length);
      logger.general.info('💾 Instruction data length:', instruction.data.length);
    } catch (error) {
      logger.general.error('❌ Instruction creation failed:', error);
      throw error;
    }
  });
});
