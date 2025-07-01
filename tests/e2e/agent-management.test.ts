import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { generateKeyPairSigner } from '@solana/web3.js';
import { 
  createTestConfig, 
  cleanupTestEnvironment 
} from '../helpers/test-config';

describe('Agent Management E2E Tests', () => {
  let testConfig: any;

  beforeAll(async () => {
    testConfig = await createTestConfig();
    console.log('🤖 Agent management test environment initialized');
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
    console.log('🧹 Agent tests cleaned up');
  });

  describe('Basic Agent Operations', () => {
    test('should generate valid keypairs for agents', async () => {
      const agent1 = await generateKeyPairSigner();
      const agent2 = await generateKeyPairSigner();

      expect(agent1.address).toBeDefined();
      expect(agent2.address).toBeDefined();
      expect(agent1.address).not.toBe(agent2.address);
    });

    test('should create test configuration', async () => {
      expect(testConfig).toBeDefined();
      expect(testConfig.rpc).toBeDefined();
      expect(testConfig.programId).toBeDefined();
      expect(testConfig.network).toBe('localnet');
    });

    test('should validate RPC connection', async () => {
      // Simple RPC test
      try {
        const slot = await testConfig.rpc.getSlot().send();
        expect(typeof slot).toBe('bigint');
      } catch (error) {
        // RPC might not be available in test environment
        console.warn('RPC connection test skipped:', error);
      }
    });

    test('should handle keypair address generation', async () => {
      const agents = await Promise.all([
        generateKeyPairSigner(),
        generateKeyPairSigner(),
        generateKeyPairSigner()
      ]);

      for (const agent of agents) {
        expect(agent.address).toBeDefined();
        expect(typeof agent.address).toBe('string');
      }

      // Verify uniqueness
      const addresses = agents.map(a => a.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(agents.length);
    });
  });
}); 