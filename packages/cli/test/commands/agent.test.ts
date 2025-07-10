import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import { registerAgent, listAgents, updateAgent, deactivateAgent } from '../../src/commands/agent';
import { readKeypair } from '../../src/utils/keypair';
import * as mockFs from '../../src/utils/mock-fs';

// Mock the connection and keypair
const mockConnection = {
  getBalance: async () => 1000000000,
  getLatestBlockhash: async () => ({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 100,
  }),
  sendTransaction: async () => 'mock-signature',
  confirmTransaction: async () => ({ value: { err: null } }),
} as unknown as Connection;

describe('Agent Commands', () => {
  let testKeypair: Keypair;

  beforeAll(() => {
    // Setup test keypair
    testKeypair = Keypair.generate();

    // Mock file system for tests
    mockFs.mockReadFileSync(
      '/tmp/test-keypair.json',
      JSON.stringify(Array.from(testKeypair.secretKey)),
    );
  });

  afterAll(() => {
    // Clean up mocks
    mockFs.clearMocks();
  });

  test('registers agent successfully', async () => {
    const agentId = `test_agent_${Date.now()}`;
    const result = await registerAgent(
      mockConnection,
      testKeypair,
      agentId,
      'Test Agent',
      'A test agent for unit testing',
      'https://test.agent.com',
      ['testing', 'validation'],
      100,
      null,
      null,
    );

    expect(result).toBeDefined();
    expect(result.agentPda).toBeInstanceOf(PublicKey);
    expect(result.signature).toBe('mock-signature');
  });

  test('handles duplicate registration', async () => {
    const agentId = 'duplicate_agent';

    // First registration
    await registerAgent(
      mockConnection,
      testKeypair,
      agentId,
      'First Agent',
      'First registration',
      'https://first.com',
      ['test'],
      50,
      null,
      null,
    );

    // Attempt duplicate registration
    try {
      await registerAgent(
        mockConnection,
        testKeypair,
        agentId,
        'Duplicate Agent',
        'Duplicate registration',
        'https://duplicate.com',
        ['test'],
        50,
        null,
        null,
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('already exists');
    }
  });

  test('validates agent ID format', async () => {
    const invalidIds = [
      '', // Empty
      'a'.repeat(65), // Too long
      'agent with spaces', // Contains spaces
      'agent@special', // Contains special characters
    ];

    for (const invalidId of invalidIds) {
      try {
        await registerAgent(
          mockConnection,
          testKeypair,
          invalidId,
          'Test Agent',
          'Description',
          'https://test.com',
          ['test'],
          100,
          null,
          null,
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid agent ID');
      }
    }
  });

  test('validates service fee', async () => {
    const invalidFees = [-1, -100];

    for (const fee of invalidFees) {
      try {
        await registerAgent(
          mockConnection,
          testKeypair,
          'fee_test_agent',
          'Test Agent',
          'Description',
          'https://test.com',
          ['test'],
          fee,
          null,
          null,
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Service fee must be non-negative');
      }
    }
  });

  test('lists agents with filters', async () => {
    // Test listing all agents
    const allAgents = await listAgents(mockConnection, {});
    expect(Array.isArray(allAgents)).toBe(true);

    // Test filtering by capability
    const filteredAgents = await listAgents(mockConnection, {
      capabilities: ['testing'],
    });
    expect(Array.isArray(filteredAgents)).toBe(true);

    // Test filtering by active status
    const activeAgents = await listAgents(mockConnection, {
      isActive: true,
    });
    expect(Array.isArray(activeAgents)).toBe(true);
  });

  test('updates agent information', async () => {
    const agentId = `update_test_${Date.now()}`;

    // First register the agent
    await registerAgent(
      mockConnection,
      testKeypair,
      agentId,
      'Original Name',
      'Original Description',
      'https://original.com',
      ['original'],
      50,
      null,
      null,
    );

    // Update the agent
    const result = await updateAgent(mockConnection, testKeypair, agentId, {
      name: 'Updated Name',
      description: 'Updated Description',
      serviceUrl: 'https://updated.com',
      capabilities: ['updated', 'testing'],
      serviceFee: 75,
    });

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('handles update of non-existent agent', async () => {
    try {
      await updateAgent(mockConnection, testKeypair, 'non_existent_agent', {
        name: 'Updated Name',
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Agent not found');
    }
  });

  test('deactivates agent', async () => {
    const agentId = `deactivate_test_${Date.now()}`;

    // First register the agent
    await registerAgent(
      mockConnection,
      testKeypair,
      agentId,
      'Active Agent',
      'Will be deactivated',
      'https://active.com',
      ['test'],
      100,
      null,
      null,
    );

    // Deactivate the agent
    const result = await deactivateAgent(mockConnection, testKeypair, agentId);

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('handles deactivation of already inactive agent', async () => {
    const agentId = `inactive_test_${Date.now()}`;

    // Register and deactivate
    await registerAgent(
      mockConnection,
      testKeypair,
      agentId,
      'Test Agent',
      'Description',
      'https://test.com',
      ['test'],
      50,
      null,
      null,
    );

    await deactivateAgent(mockConnection, testKeypair, agentId);

    // Try to deactivate again
    try {
      await deactivateAgent(mockConnection, testKeypair, agentId);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('already inactive');
    }
  });

  test('validates capability array', async () => {
    // Empty capabilities
    try {
      await registerAgent(
        mockConnection,
        testKeypair,
        'no_capabilities',
        'Test Agent',
        'Description',
        'https://test.com',
        [],
        100,
        null,
        null,
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('At least one capability required');
    }

    // Too many capabilities
    const tooManyCapabilities = Array(21).fill('capability');
    try {
      await registerAgent(
        mockConnection,
        testKeypair,
        'too_many_capabilities',
        'Test Agent',
        'Description',
        'https://test.com',
        tooManyCapabilities,
        100,
        null,
        null,
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Too many capabilities');
    }
  });

  test('validates metadata URI format', async () => {
    const validUris = [
      'https://metadata.example.com/agent.json',
      'ipfs://QmTest123',
      'ar://test-arweave-hash',
    ];

    for (const uri of validUris) {
      const result = await registerAgent(
        mockConnection,
        testKeypair,
        `metadata_test_${Date.now()}`,
        'Test Agent',
        'Description',
        'https://test.com',
        ['test'],
        100,
        uri,
        null,
      );
      expect(result).toBeDefined();
    }

    // Invalid URI
    try {
      await registerAgent(
        mockConnection,
        testKeypair,
        'invalid_metadata',
        'Test Agent',
        'Description',
        'https://test.com',
        ['test'],
        100,
        'not-a-valid-uri',
        null,
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Invalid metadata URI');
    }
  });

  test('handles encrypted private data', async () => {
    const encryptedData = 'encrypted:base64encodeddata';

    const result = await registerAgent(
      mockConnection,
      testKeypair,
      `encrypted_test_${Date.now()}`,
      'Test Agent',
      'Description',
      'https://test.com',
      ['test'],
      100,
      null,
      encryptedData,
    );

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('validates service URL format', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://invalid-protocol.com',
      'http://insecure.com', // Should require HTTPS
      '',
    ];

    for (const url of invalidUrls) {
      try {
        await registerAgent(
          mockConnection,
          testKeypair,
          `url_test_${Date.now()}`,
          'Test Agent',
          'Description',
          url,
          ['test'],
          100,
          null,
          null,
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid service URL');
      }
    }
  });

  test('handles agent registration with maximum field lengths', async () => {
    const maxLengthName = 'A'.repeat(100); // Test max name length
    const maxLengthDescription = 'D'.repeat(500); // Test max description length
    const maxCapabilities = Array(10).fill('capability'); // Test max capabilities

    const result = await registerAgent(
      mockConnection,
      testKeypair,
      `max_length_test_${Date.now()}`,
      maxLengthName,
      maxLengthDescription,
      'https://max.test.com',
      maxCapabilities,
      999999, // Test high service fee
      null,
      null,
    );

    expect(result).toBeDefined();
    expect(result.agentPda).toBeInstanceOf(PublicKey);
  });

  test('handles network errors gracefully', async () => {
    const failingConnection = {
      ...mockConnection,
      sendTransaction: async () => {
        throw new Error('Network error: Connection timeout');
      },
    } as unknown as Connection;

    await expect(
      registerAgent(
        failingConnection,
        testKeypair,
        'network_error_test',
        'Network Test',
        'Testing network errors',
        'https://test.com',
        ['test'],
        100,
        null,
        null,
      ),
    ).rejects.toThrow(/Network error/);
  });

  test('validates agent name constraints', async () => {
    // Test empty name
    await expect(
      registerAgent(
        mockConnection,
        testKeypair,
        'empty_name_test',
        '',
        'Description',
        'https://test.com',
        ['test'],
        100,
        null,
        null,
      ),
    ).rejects.toThrow(/Agent name cannot be empty/);

    // Test name with special characters
    const specialCharNames = ['Agent@123', 'Agent#Test', 'Agent$Bot'];
    for (const name of specialCharNames) {
      // Should allow special characters in names
      const result = await registerAgent(
        mockConnection,
        testKeypair,
        `special_char_${Date.now()}`,
        name,
        'Testing special chars',
        'https://test.com',
        ['test'],
        100,
        null,
        null,
      );
      expect(result).toBeDefined();
    }
  });

  test('handles batch agent operations', async () => {
    // Test registering multiple agents in sequence
    const agentIds = [];
    const batchSize = 3;

    for (let i = 0; i < batchSize; i++) {
      const agentId = `batch_agent_${Date.now()}_${i}`;
      agentIds.push(agentId);

      const result = await registerAgent(
        mockConnection,
        testKeypair,
        agentId,
        `Batch Agent ${i}`,
        `Batch testing agent ${i}`,
        'https://batch.test.com',
        ['batch', 'testing'],
        100 + i * 10,
        null,
        null,
      );

      expect(result).toBeDefined();
      expect(result.agentPda).toBeInstanceOf(PublicKey);
    }

    // Verify all agents were created
    expect(agentIds).toHaveLength(batchSize);
  });
});
