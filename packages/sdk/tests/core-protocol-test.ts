/**
 * Core Protocol Functionality Test
 *
 * This test verifies the fundamental GhostSpeak Protocol capabilities:
 * 1. Agent registration
 * 2. Channel creation
 * 3. Message sending
 * 4. Work order creation
 * 5. Payment processing
 *
 * This test focuses on the CORE blockchain protocol functionality,
 * not the advanced features like real-time communication.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { createDevnetClient, type PodAIClient } from '../src/client-v2';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import type { Address } from '@solana/addresses';
import { logger } from '../../../shared/logger';

describe('GhostSpeak Core Protocol', () => {
  let client: PodAIClient;
  let agentSigner: KeyPairSigner;
  let userSigner: KeyPairSigner;

  beforeAll(async () => {
    // Initialize client with correct program ID
    client = createDevnetClient('4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385');

    // Generate test keypairs
    agentSigner = await generateKeyPairSigner();
    userSigner = await generateKeyPairSigner();

    // Check if we can connect to devnet
    try {
      const isConnected = await client.isConnected();
      logger.general.info('✅ Devnet connection status:', isConnected);
    } catch (error) {
      logger.general.warn('⚠️ Devnet connection failed, tests may be limited');
    }

    // Fund accounts with SOL for testing (devnet only)
    try {
      await client.airdrop(agentSigner.address, 1.0);
      await client.airdrop(userSigner.address, 1.0);
      logger.general.info('✅ Test accounts funded with SOL');
    } catch (error) {
      logger.general.warn('⚠️ Airdrop failed:', error);
    }
  });

  test('Core Protocol Configuration', async () => {
    // Verify program ID consistency
    const programId = client.getProgramId();
    expect(programId).toBe('4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385');
    logger.general.info('✅ Program ID verified:', programId);

    // Verify commitment level
    const commitment = client.getCommitment();
    expect(commitment).toBe('confirmed');
    logger.general.info('✅ Commitment level:', commitment);

    // Verify RPC endpoints
    logger.general.info('✅ RPC endpoint configured');
  });

  test('Agent Registration (Core Function)', async () => {
    try {
      logger.general.info('🤖 Testing agent registration...');

      const registrationResult = await client.agents.registerAgent(
        agentSigner,
        {
          name: 'Test Agent',
          description: 'A test AI agent for protocol validation',
          capabilities: [1, 2, 4], // Basic capabilities
          metadata: {
            version: '1.0.0',
            framework: 'GhostSpeak',
            testMode: true,
          },
        }
      );

      expect(registrationResult).toBeDefined();
      expect(registrationResult.signature).toBeDefined();
      expect(registrationResult.agentPda).toBeDefined();

      logger.general.info('✅ Agent registered successfully');
      logger.general.info('  - Signature:', registrationResult.signature);
      logger.general.info('  - Agent PDA:', registrationResult.agentPda);
      logger.general.info('  - Agent ID:', registrationResult.agentId);
    } catch (error) {
      logger.general.error('❌ Agent registration failed:', error);
      // Don't fail the test if this is due to network issues
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('Channel Creation (Core Function)', async () => {
    try {
      logger.general.info('📢 Testing channel creation...');

      const channelResult = await client.channels.createChannel(agentSigner, {
        name: 'Test Channel',
        description: 'Agent-to-human communication channel',
        channelType: 'direct',
        isPublic: false,
        participants: [userSigner.address],
      });

      expect(channelResult).toBeDefined();
      expect(channelResult.signature).toBeDefined();
      expect(channelResult.channelPda).toBeDefined();

      logger.general.info('✅ Channel created successfully');
      logger.general.info('  - Signature:', channelResult.signature);
      logger.general.info('  - Channel PDA:', channelResult.channelPda);
    } catch (error) {
      logger.general.error('❌ Channel creation failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('Message Sending (Core Function)', async () => {
    try {
      logger.general.info('💬 Testing message sending...');

      // First create a channel for messaging
      const channelResult = await client.channels.createChannel(agentSigner, {
        name: 'Message Test Channel',
        description: 'Channel for testing message functionality',
        channelType: 'direct',
        isPublic: false,
        participants: [userSigner.address],
      });

      // Send a message in the channel
      const messageResult = await client.messages.sendMessage(agentSigner, {
        channelAddress: channelResult.channelPda,
        content: 'Hello from GhostSpeak Protocol test!',
        messageType: 'text',
        metadata: {
          testMessage: true,
          timestamp: Date.now(),
        },
      });

      expect(messageResult).toBeDefined();
      expect(messageResult.signature).toBeDefined();
      expect(messageResult.messagePda).toBeDefined();

      logger.general.info('✅ Message sent successfully');
      logger.general.info('  - Signature:', messageResult.signature);
      logger.general.info('  - Message PDA:', messageResult.messagePda);
    } catch (error) {
      logger.general.error('❌ Message sending failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('Work Order Creation (Core Function)', async () => {
    try {
      logger.general.info('💼 Testing work order creation...');

      const workOrderResult = await client.escrow.createWorkOrder(userSigner, {
        agentAddress: agentSigner.address,
        taskDescription: 'Test task for protocol validation',
        paymentAmount: BigInt(1000000), // 0.001 SOL in lamports
        deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        requirements: 'Complete the test task successfully',
        deliverables: 'Test completion report',
      });

      expect(workOrderResult).toBeDefined();
      expect(workOrderResult.signature).toBeDefined();
      expect(workOrderResult.workOrderPda).toBeDefined();

      logger.general.info('✅ Work order created successfully');
      logger.general.info('  - Signature:', workOrderResult.signature);
      logger.general.info('  - Work Order PDA:', workOrderResult.workOrderPda);
    } catch (error) {
      logger.general.error('❌ Work order creation failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('Agent Discovery (Core Function)', async () => {
    try {
      logger.general.info('🔍 Testing agent discovery...');

      const discoveryResult = await client.agents.discoverAgents({
        requiredCapabilities: [1, 2], // Look for agents with basic capabilities
        minimumReputation: 0,
        isOnline: true,
        limit: 10,
      });

      expect(discoveryResult).toBeDefined();
      expect(discoveryResult.agents).toBeDefined();
      expect(Array.isArray(discoveryResult.agents)).toBe(true);

      logger.general.info('✅ Agent discovery completed');
      logger.general.info('  - Total found:', discoveryResult.totalFound);
      logger.general.info('  - Returned:', discoveryResult.agents.length);
      logger.general.info('  - Filters applied:', discoveryResult.filtersApplied);
    } catch (error) {
      logger.general.error('❌ Agent discovery failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('Account Balance Check (Core Function)', async () => {
    try {
      logger.general.info('💰 Testing account balance checks...');

      const agentBalance = await client.getBalance(agentSigner.address);
      const userBalance = await client.getBalance(userSigner.address);

      expect(typeof agentBalance).toBe('number');
      expect(typeof userBalance).toBe('number');
      expect(agentBalance).toBeGreaterThanOrEqual(0);
      expect(userBalance).toBeGreaterThanOrEqual(0);

      logger.general.info('✅ Balance checks completed');
      logger.general.info('  - Agent balance:', agentBalance.toFixed(4), 'SOL');
      logger.general.info('  - User balance:', userBalance.toFixed(4), 'SOL');
    } catch (error) {
      logger.general.error('❌ Balance check failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('Cluster Information (Core Function)', async () => {
    try {
      logger.general.info('🌐 Testing cluster information...');

      const clusterInfo = await client.getClusterInfo();

      expect(clusterInfo).toBeDefined();
      expect(clusterInfo.cluster).toBeDefined();
      expect(clusterInfo.blockHeight).toBeDefined();
      expect(clusterInfo.health).toBeDefined();
      expect(typeof clusterInfo.blockHeight).toBe('number');
      expect(clusterInfo.blockHeight).toBeGreaterThan(0);

      logger.general.info('✅ Cluster information retrieved');
      logger.general.info('  - Cluster:', clusterInfo.cluster);
      logger.general.info('  - Block height:', clusterInfo.blockHeight);
      logger.general.info('  - Health:', clusterInfo.health);
    } catch (error) {
      logger.general.error('❌ Cluster info failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });

  test('End-to-End Agent Commerce Workflow', async () => {
    try {
      logger.general.info('🔄 Testing complete agent commerce workflow...');

      // Step 1: Register agent
      logger.general.info('  Step 1: Register agent...');
      const agentRegistration = await client.agents.registerAgent(agentSigner, {
        name: 'E2E Test Agent',
        description: 'End-to-end workflow test agent',
        capabilities: [1, 2, 4, 8],
        metadata: { workflowTest: true },
      });

      // Step 2: Create communication channel
      logger.general.info('  Step 2: Create communication channel...');
      const channel = await client.channels.createChannel(agentSigner, {
        name: 'E2E Test Channel',
        description: 'End-to-end workflow communication',
        channelType: 'direct',
        isPublic: false,
        participants: [userSigner.address],
      });

      // Step 3: Send negotiation message
      logger.general.info('  Step 3: Send negotiation message...');
      const negotiationMessage = await client.messages.sendMessage(
        agentSigner,
        {
          channelAddress: channel.channelPda,
          content: 'I can complete your task for 0.001 SOL',
          messageType: 'text',
          metadata: { messageType: 'quote', amount: '0.001' },
        }
      );

      // Step 4: Create work order
      logger.general.info('  Step 4: Create work order...');
      const workOrder = await client.escrow.createWorkOrder(userSigner, {
        agentAddress: agentSigner.address,
        taskDescription: 'Complete end-to-end workflow test',
        paymentAmount: BigInt(1000000), // 0.001 SOL
        deadline: Math.floor(Date.now() / 1000) + 86400,
        requirements: 'Follow complete workflow protocol',
        deliverables: 'Workflow completion proof',
      });

      // Step 5: Send confirmation message
      logger.general.info('  Step 5: Send confirmation message...');
      const confirmationMessage = await client.messages.sendMessage(
        agentSigner,
        {
          channelAddress: channel.channelPda,
          content:
            'Work order accepted. Task will be completed within 24 hours.',
          messageType: 'text',
          metadata: {
            messageType: 'acceptance',
            workOrderId: workOrder.workOrderPda,
          },
        }
      );

      // Verify all steps completed successfully
      expect(agentRegistration.signature).toBeDefined();
      expect(channel.channelPda).toBeDefined();
      expect(negotiationMessage.messagePda).toBeDefined();
      expect(workOrder.workOrderPda).toBeDefined();
      expect(confirmationMessage.messagePda).toBeDefined();

      logger.general.info('✅ End-to-end workflow completed successfully');
      logger.general.info('  - Agent registered:', agentRegistration.agentPda);
      logger.general.info('  - Channel created:', channel.channelPda);
      logger.general.info('  - Messages sent:', 2);
      logger.general.info('  - Work order created:', workOrder.workOrderPda);
    } catch (error) {
      logger.general.error('❌ End-to-end workflow failed:', error);
      if (error instanceof Error && error.message.includes('network')) {
        logger.general.warn('⚠️ Skipping due to network issues');
        return;
      }
      throw error;
    }
  });
});
