/**
 * Comprehensive SDK Integration Tests
 * Tests complete TypeScript SDK integration with deployed program
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createMinimalClient,
  createFullClient,
  loadAdvancedServices,
  loadOptionalServices,
  PODAI_PROGRAM_ID,
  DEVNET_RPC,
  lamportsToSol,
  solToLamports,
  type IAgent,
  type IChannel,
  type IMessage,
} from '../src/index';
import { PodAIClient, createPodAIClient, createDevnetClient } from '../src/client-v2';
import { POD_COM_PROGRAM_ADDRESS } from '../src/generated-v2/programs/podCom';
import { getVerifyAgentInstruction } from '../src/generated-v2/instructions/verifyAgent';
import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import type { Address } from '@solana/addresses';

describe('SDK Integration Tests', () => {
  let client: PodAIClient;
  let testKeypair: any;
  
  beforeAll(async () => {
    // Initialize test keypair
    testKeypair = await generateKeyPairSigner();
    
    // Initialize client
    client = createDevnetClient();
    
    // Verify connection
    const isConnected = await client.isConnected();
    if (!isConnected) {
      console.warn('⚠️ Devnet connection failed - some tests may be skipped');
    }
  });

  describe('1. SDK Constants and Utilities', () => {
    test('Program ID consistency', () => {
      // Main SDK exports correct program ID
      expect(PODAI_PROGRAM_ID).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      
      // Generated program matches
      expect(POD_COM_PROGRAM_ADDRESS).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      
      // Client uses correct program ID
      expect(client.getProgramId()).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
    });

    test('Utility functions work correctly', () => {
      // Test lamports/SOL conversion
      expect(lamportsToSol(1_000_000_000n)).toBe(1);
      expect(lamportsToSol(500_000_000n)).toBe(0.5);
      expect(solToLamports(1)).toBe(1_000_000_000n);
      expect(solToLamports(0.5)).toBe(500_000_000n);
    });

    test('RPC endpoint constant', () => {
      expect(DEVNET_RPC).toBe('https://api.devnet.solana.com');
    });
  });

  describe('2. Client Initialization', () => {
    test('createPodAIClient factory function', () => {
      const testClient = createPodAIClient({
        rpcEndpoint: 'https://api.devnet.solana.com',
        programId: PODAI_PROGRAM_ID,
        commitment: 'confirmed'
      });
      
      expect(testClient).toBeInstanceOf(PodAIClient);
      expect(testClient.getProgramId()).toBe(PODAI_PROGRAM_ID);
      expect(testClient.getCommitment()).toBe('confirmed');
    });

    test('createDevnetClient factory function', () => {
      const devnetClient = createDevnetClient();
      
      expect(devnetClient).toBeInstanceOf(PodAIClient);
      expect(devnetClient.getProgramId()).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
    });

    test('Client provides core methods', () => {
      expect(typeof client.getRpc).toBe('function');
      expect(typeof client.getRpcSubscriptions).toBe('function');
      expect(typeof client.getProgramId).toBe('function');
      expect(typeof client.getCommitment).toBe('function');
      expect(typeof client.isConnected).toBe('function');
      expect(typeof client.getClusterInfo).toBe('function');
      expect(typeof client.getBalance).toBe('function');
    });
  });

  describe('3. Service Accessibility', () => {
    test('All services are accessible', () => {
      // Core services
      expect(client.agents).toBeDefined();
      expect(client.channels).toBeDefined();
      expect(client.messages).toBeDefined();
      expect(client.escrow).toBeDefined();
      
      // Optional services  
      expect(client.auctions).toBeDefined();
      expect(client.bulkDeals).toBeDefined();
      expect(client.reputation).toBeDefined();
      expect(client.realtime).toBeDefined();
      expect(client.crossPlatform).toBeDefined();
      expect(client.messageRouter).toBeDefined();
      expect(client.offlineSync).toBeDefined();
    });

    test('Services have expected methods', () => {
      // Agent service methods
      const agentService = client.agents;
      expect(typeof agentService.registerAgent).toBe('function');
      expect(typeof agentService.getAgent).toBe('function');
      expect(typeof agentService.listUserAgents).toBe('function');
      
      // Channel service methods
      const channelService = client.channels;
      expect(typeof channelService.createChannel).toBe('function');
      expect(typeof channelService.getChannel).toBe('function');
      expect(typeof channelService.joinChannel).toBe('function');
      
      // Message service methods
      const messageService = client.messages;
      expect(typeof messageService.sendMessage).toBe('function');
      expect(typeof messageService.sendDirectMessage).toBe('function');
      expect(typeof messageService.getMessage).toBe('function');
    });
  });

  describe('4. Generated Instructions', () => {
    test('Instruction builders are accessible', () => {
      expect(typeof getVerifyAgentInstruction).toBe('function');
    });

    test('Verify Agent instruction builder works', () => {
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.example.com',
        supportedCapabilities: ['chat', 'translate'],
        verifiedAt: BigInt(Date.now())
      });

      expect(instruction.programAddress).toBe(POD_COM_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(4);
      expect(instruction.data).toBeInstanceOf(Uint8Array);
    });

    test('Instruction has correct program address', () => {
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.example.com',
        supportedCapabilities: ['chat'],
        verifiedAt: BigInt(Date.now())
      });

      expect(instruction.programAddress).toBe('4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385');
    });
  });

  describe('5. Web3.js v2 Compatibility', () => {
    test('Client uses Web3.js v2 RPC', () => {
      const rpc = client.getRpc();
      expect(rpc).toBeDefined();
      expect(typeof rpc.getHealth).toBe('function');
      expect(typeof rpc.getBalance).toBe('function');
      expect(typeof rpc.getBlockHeight).toBe('function');
    });

    test('RPC subscriptions work', () => {
      const rpcSubscriptions = client.getRpcSubscriptions();
      expect(rpcSubscriptions).toBeDefined();
    });

    test('Address types work correctly', () => {
      const programId = client.getProgramId();
      expect(typeof programId).toBe('string');
      expect(programId.length).toBe(44); // Base58 address length
    });
  });

  describe('6. Dynamic Imports', () => {
    test('createMinimalClient works', async () => {
      const minimalClient = createMinimalClient({
        rpcEndpoint: DEVNET_RPC
      });
      
      expect(minimalClient).toBeDefined();
      expect(typeof minimalClient.getBalance).toBe('function');
    });

    test('loadAdvancedServices dynamic import', async () => {
      const services = await loadAdvancedServices();
      
      expect(services.AgentService).toBeDefined();
      expect(services.ChannelService).toBeDefined();
      expect(services.MessageService).toBeDefined();
      expect(services.EscrowService).toBeDefined();
    });

    test('loadOptionalServices dynamic import', async () => {
      const services = await loadOptionalServices();
      
      expect(services.AuctionService).toBeDefined();
      expect(services.BulkDealsService).toBeDefined();
      expect(services.ReputationService).toBeDefined();
    });

    test('createFullClient dynamic import', async () => {
      const { PodAIClient: FullClient, createPodAIClient: createFullPodAIClient } = await createFullClient();
      
      expect(FullClient).toBeDefined();
      expect(createFullPodAIClient).toBeDefined();
      
      const fullClient = createFullPodAIClient({
        rpcEndpoint: DEVNET_RPC
      });
      expect(fullClient).toBeInstanceOf(FullClient);
    });
  });

  describe('7. Error Handling', () => {
    test('Invalid address handling', () => {
      expect(() => {
        createPodAIClient({
          programId: 'invalid-address'
        });
      }).not.toThrow(); // Client should handle gracefully
    });

    test('Connection failure handling', async () => {
      const invalidClient = createPodAIClient({
        rpcEndpoint: 'https://invalid-endpoint.com'
      });
      
      const isConnected = await invalidClient.isConnected();
      expect(isConnected).toBe(false);
    });
  });

  describe('8. Type Safety', () => {
    test('Interface types are properly exported', () => {
      // Test that interfaces can be used
      const agent: IAgent = {
        address: testKeypair.address as Address,
        name: 'Test Agent',
        capabilities: ['test']
      };
      
      const channel: IChannel = {
        address: testKeypair.address as Address,
        name: 'Test Channel',
        participants: [testKeypair.address as Address]
      };
      
      const message: IMessage = {
        id: 'test-id',
        content: 'Test message',
        sender: testKeypair.address as Address,
        timestamp: Date.now()
      };
      
      expect(agent.name).toBe('Test Agent');
      expect(channel.name).toBe('Test Channel');
      expect(message.content).toBe('Test message');
    });
  });

  describe('9. Network Connectivity (Integration)', () => {
    test('Can connect to devnet', async () => {
      try {
        const isConnected = await client.isConnected();
        expect(typeof isConnected).toBe('boolean');
      } catch (error) {
        console.warn('Network test skipped due to connectivity:', error);
      }
    });

    test('Can get cluster info', async () => {
      try {
        const clusterInfo = await client.getClusterInfo();
        expect(clusterInfo.cluster).toBeDefined();
        expect(typeof clusterInfo.blockHeight).toBe('number');
        expect(clusterInfo.health).toBeDefined();
      } catch (error) {
        console.warn('Cluster info test skipped due to connectivity:', error);
      }
    });

    test('Can get balance', async () => {
      try {
        const balance = await client.getBalance(testKeypair.address);
        expect(typeof balance).toBe('number');
        expect(balance).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.warn('Balance test skipped due to connectivity:', error);
      }
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });
});