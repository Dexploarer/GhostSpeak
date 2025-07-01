import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { generateKeyPairSigner } from '@solana/web3.js';

describe('CLI Agent Management E2E Tests', () => {
  beforeAll(async () => {
    console.log('🤖 CLI Agent management test environment initialized');
  });

  afterAll(async () => {
    console.log('🧹 CLI Agent tests cleaned up');
  });

  describe('Agent Keypair Operations', () => {
    test('should generate valid agent keypairs', async () => {
      const agent = await generateKeyPairSigner();
      
      expect(agent.address).toBeDefined();
      expect(typeof agent.address).toBe('string');
    });

    test('should generate unique agent addresses', async () => {
      const agents = await Promise.all([
        generateKeyPairSigner(),
        generateKeyPairSigner(),
        generateKeyPairSigner()
      ]);

      const addresses = agents.map(a => a.address);
      const uniqueAddresses = new Set(addresses);
      
      expect(uniqueAddresses.size).toBe(3);
    });

    test('should handle agent keypair creation concurrently', async () => {
      const concurrentCount = 10;
      const startTime = Date.now();
      
      const agents = await Promise.all(
        Array.from({ length: concurrentCount }, () => generateKeyPairSigner())
      );
      
      const duration = Date.now() - startTime;
      
      expect(agents.length).toBe(concurrentCount);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`⚡ Generated ${concurrentCount} agent keypairs in ${duration}ms`);
    });
  });
}); 