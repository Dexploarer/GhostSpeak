/**
 * Comprehensive Integration Test Suite
 * 
 * Tests complete workflows across the GhostSpeak Protocol including
 * agent registration, service transactions, escrow management, and messaging.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { PodAIClient } from '../src/client-v2';
import { generateKeyPair } from '@solana/keys';
import type { Address } from '@solana/addresses';
import type { TransactionSignature } from '@solana/rpc-types';

// Test configuration
const TEST_CONFIG = {
  rpcEndpoint: 'https://api.devnet.solana.com',
  programId: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP' as Address,
  commitment: 'confirmed' as const,
  timeout: 30000,
};

// Test data
const TEST_AGENT = {
  name: 'IntegrationTestAgent',
  description: 'AI agent for comprehensive integration testing',
  capabilities: ['natural-language-processing', 'code-generation', 'data-analysis'],
  serviceFee: 5000n,
  metadataUri: 'ipfs://QmTestMetadata123',
  serviceUrl: 'https://api.test-agent.com',
};

const TEST_CHANNEL = {
  name: 'integration-test-channel',
  visibility: 'public' as const,
  participants: [] as Address[],
};

const TEST_ESCROW = {
  amount: 10000n,
  deadline: Date.now() + 86400000, // 24 hours from now
  taskId: 'integration-test-task-001',
};

describe('Comprehensive Integration Tests', () => {
  let client: PodAIClient;
  let agentKeyPair: CryptoKeyPair;
  let clientKeyPair: CryptoKeyPair;
  let agentAddress: Address;
  let clientAddress: Address;

  beforeAll(async () => {
    // Generate test keypairs
    agentKeyPair = await generateKeyPair();
    clientKeyPair = await generateKeyPair();
    
    // Get addresses
    agentAddress = agentKeyPair.publicKey as Address;
    clientAddress = clientKeyPair.publicKey as Address;

    // Initialize client
    client = new PodAIClient(TEST_CONFIG);

    // Fund test accounts with devnet SOL
    try {
      await client.airdrop(agentAddress, 2000000000n); // 2 SOL
      await client.airdrop(clientAddress, 2000000000n); // 2 SOL
      
      // Wait for funding confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn('Failed to fund test accounts:', error);
    }
  });

  afterAll(async () => {
    // Cleanup if needed
    await client.disconnect();
  });

  describe('Agent Lifecycle Management', () => {
    let registeredAgentId: string;

    it('should register a new agent successfully', async () => {
      const result = await client.agent.register({
        name: TEST_AGENT.name,
        description: TEST_AGENT.description,
        capabilities: TEST_AGENT.capabilities,
        serviceFee: TEST_AGENT.serviceFee,
        metadataUri: TEST_AGENT.metadataUri,
        serviceUrl: TEST_AGENT.serviceUrl,
      });

      expect(result.success).toBe(true);
      expect(result.agentId).toBeDefined();
      registeredAgentId = result.agentId!;
    }, TEST_CONFIG.timeout);

    it('should retrieve agent information', async () => {
      const agentInfo = await client.agent.getAgent(registeredAgentId);
      
      expect(agentInfo).toBeDefined();
      expect(agentInfo.name).toBe(TEST_AGENT.name);
      expect(agentInfo.description).toBe(TEST_AGENT.description);
      expect(agentInfo.capabilities).toEqual(TEST_AGENT.capabilities);
      expect(agentInfo.isActive).toBe(true);
    }, TEST_CONFIG.timeout);

    it('should update agent information', async () => {
      const updatedDescription = 'Updated description for integration test';
      
      const result = await client.agent.updateAgent(registeredAgentId, {
        description: updatedDescription,
      });

      expect(result.success).toBe(true);

      // Verify update
      const agentInfo = await client.agent.getAgent(registeredAgentId);
      expect(agentInfo.description).toBe(updatedDescription);
    }, TEST_CONFIG.timeout);

    it('should list agents with filtering', async () => {
      const agents = await client.agent.listAgents({
        isActive: true,
        capabilities: ['natural-language-processing'],
        limit: 10,
      });

      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
      
      // Should include our test agent
      const testAgent = agents.find(agent => agent.name === TEST_AGENT.name);
      expect(testAgent).toBeDefined();
    }, TEST_CONFIG.timeout);
  });

  describe('Channel and Messaging Workflow', () => {
    let channelId: string;

    it('should create a communication channel', async () => {
      const result = await client.channel.createChannel({
        name: TEST_CHANNEL.name,
        visibility: TEST_CHANNEL.visibility,
        participants: [agentAddress, clientAddress],
      });

      expect(result.success).toBe(true);
      expect(result.channelId).toBeDefined();
      channelId = result.channelId!;
    }, TEST_CONFIG.timeout);

    it('should send messages in the channel', async () => {
      const messages = [
        { content: 'Hello, I need help with a coding task', type: 'text' as const },
        { content: 'Sure! I can help you with that. What do you need?', type: 'text' as const },
        { content: 'I need a Python function for data processing', type: 'text' as const },
      ];

      for (const message of messages) {
        const result = await client.message.sendMessage({
          channelId,
          content: message.content,
          messageType: message.type,
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      }
    }, TEST_CONFIG.timeout);

    it('should retrieve channel messages', async () => {
      const messages = await client.message.getChannelMessages(channelId, {
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      
      // Messages should be ordered by timestamp
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].sentAt).toBeGreaterThanOrEqual(messages[i - 1].sentAt);
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Escrow and Payment Workflow', () => {
    let escrowId: string;
    let taskId: string;

    it('should create an escrow for a task', async () => {
      const result = await client.escrow.createEscrow({
        agentId: agentAddress,
        amount: TEST_ESCROW.amount,
        deadline: TEST_ESCROW.deadline,
        taskDescription: 'Create a Python data processing function',
        requirements: [
          'Python 3.8+',
          'Pandas library usage',
          'Error handling',
          'Documentation',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.escrowId).toBeDefined();
      expect(result.taskId).toBeDefined();
      
      escrowId = result.escrowId!;
      taskId = result.taskId!;
    }, TEST_CONFIG.timeout);

    it('should retrieve escrow details', async () => {
      const escrowDetails = await client.escrow.getEscrowDetails(escrowId);
      
      expect(escrowDetails).toBeDefined();
      expect(escrowDetails.amount).toBe(TEST_ESCROW.amount);
      expect(escrowDetails.status).toBe('active');
      expect(escrowDetails.taskId).toBe(taskId);
    }, TEST_CONFIG.timeout);

    it('should simulate work completion and escrow release', async () => {
      // Simulate agent completing the work
      const completionResult = await client.escrow.submitCompletion({
        escrowId,
        completionProof: 'ipfs://QmCompletionProof123',
        deliverables: [
          'data_processor.py',
          'test_data_processor.py',
          'README.md',
        ],
      });

      expect(completionResult.success).toBe(true);

      // Client approves and releases escrow
      const releaseResult = await client.escrow.releaseEscrow({
        escrowId,
        rating: 5,
        review: 'Excellent work! Fast delivery and high quality.',
      });

      expect(releaseResult.success).toBe(true);

      // Verify escrow status
      const finalEscrowDetails = await client.escrow.getEscrowDetails(escrowId);
      expect(finalEscrowDetails.status).toBe('completed');
    }, TEST_CONFIG.timeout);
  });

  describe('Advanced Feature Integration', () => {
    it('should handle agent verification workflow', async () => {
      const verificationResult = await client.agent.submitForVerification(agentAddress, {
        serviceEndpoint: TEST_AGENT.serviceUrl,
        capabilities: TEST_AGENT.capabilities,
        performanceMetrics: {
          averageResponseTime: 250,
          successRate: 0.98,
          totalTransactions: 100,
        },
      });

      expect(verificationResult.success).toBe(true);
      expect(verificationResult.verificationId).toBeDefined();
    }, TEST_CONFIG.timeout);

    it('should handle bulk operations efficiently', async () => {
      const bulkOperations = [
        () => client.agent.listAgents({ limit: 5 }),
        () => client.channel.listChannels({ limit: 5 }),
        () => client.escrow.listEscrows({ status: 'active', limit: 5 }),
      ];

      const results = await Promise.all(bulkOperations.map(op => op()));
      
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    }, TEST_CONFIG.timeout);

    it('should handle error conditions gracefully', async () => {
      // Test with non-existent agent
      const nonExistentAgent = await client.agent.getAgent('non-existent-id');
      expect(nonExistentAgent).toBeNull();

      // Test with invalid escrow operation
      try {
        await client.escrow.releaseEscrow({
          escrowId: 'invalid-escrow-id',
          rating: 5,
          review: 'Test review',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test with malformed data
      try {
        await client.agent.register({
          name: '', // Invalid: empty name
          description: TEST_AGENT.description,
          capabilities: [],
          serviceFee: 0n, // Invalid: zero fee
          metadataUri: 'invalid-uri',
          serviceUrl: 'not-a-url',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Performance and Stress Testing', () => {
    it('should handle concurrent operations', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => 
        client.agent.listAgents({ 
          limit: 10,
          offset: i * 10,
        })
      );

      const results = await Promise.all(concurrentOperations);
      
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    }, TEST_CONFIG.timeout);

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      const heavyOperations = [
        client.agent.listAgents({ limit: 50 }),
        client.channel.listChannels({ limit: 50 }),
        client.escrow.listEscrows({ limit: 50 }),
      ];

      await Promise.all(heavyOperations);
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(15000); // 15 seconds
    }, TEST_CONFIG.timeout * 2);

    it('should handle rate limiting gracefully', async () => {
      // Rapid-fire requests to test rate limiting
      const rapidRequests = Array.from({ length: 20 }, () => 
        client.agent.listAgents({ limit: 1 })
      );

      // Should not throw errors due to rate limiting
      const results = await Promise.allSettled(rapidRequests);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    }, TEST_CONFIG.timeout);
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      const initialAgentCount = (await client.agent.listAgents({ limit: 1000 })).length;
      
      // Register multiple agents
      const newAgents = await Promise.all([
        client.agent.register({
          name: 'ConsistencyTestAgent1',
          description: 'Test agent 1',
          capabilities: ['test'],
          serviceFee: 1000n,
          metadataUri: 'ipfs://test1',
          serviceUrl: 'https://test1.com',
        }),
        client.agent.register({
          name: 'ConsistencyTestAgent2',
          description: 'Test agent 2',
          capabilities: ['test'],
          serviceFee: 2000n,
          metadataUri: 'ipfs://test2',
          serviceUrl: 'https://test2.com',
        }),
      ]);

      // Verify count increased
      const finalAgentCount = (await client.agent.listAgents({ limit: 1000 })).length;
      expect(finalAgentCount).toBeGreaterThanOrEqual(initialAgentCount + newAgents.length);
    }, TEST_CONFIG.timeout);

    it('should validate data integrity in transactions', async () => {
      const agent = await client.agent.getAgent(agentAddress);
      
      if (agent) {
        // Test that all required fields are present
        expect(agent.name).toBeDefined();
        expect(agent.description).toBeDefined();
        expect(agent.capabilities).toBeDefined();
        expect(Array.isArray(agent.capabilities)).toBe(true);
        expect(agent.isActive).toBeDefined();
        expect(typeof agent.isActive).toBe('boolean');
        expect(agent.createdAt).toBeDefined();
        expect(agent.updatedAt).toBeDefined();
      }
    }, TEST_CONFIG.timeout);
  });
});

// Utility function for cleanup (if needed)
export async function cleanupTestData(client: PodAIClient) {
  // Implementation depends on whether the protocol supports data cleanup
  // This might involve deactivating test agents, closing channels, etc.
  console.log('Cleaning up test data...');
}