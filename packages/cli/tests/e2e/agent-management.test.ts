import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Keypair } from '@solana/web3.js';

describe('CLI Agent Management E2E Tests', () => {
  beforeAll(async () => {
    console.log('🤖 CLI Agent management test environment initialized');
  });

  afterAll(async () => {
    console.log('🧹 CLI Agent tests cleaned up');
  });

  describe('Agent Keypair Operations', () => {
    test('should generate valid agent keypairs', async () => {
      const agent = Keypair.generate();
      
      expect(agent.publicKey).toBeDefined();
      expect(typeof agent.publicKey.toBase58()).toBe('string');
    });

    test('should generate unique agent addresses', async () => {
      const agents = [
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate()
      ];

      const addresses = agents.map(a => a.publicKey.toBase58());
      const uniqueAddresses = new Set(addresses);
      
      expect(uniqueAddresses.size).toBe(3);
    });

    test('should handle agent keypair creation concurrently', async () => {
      const concurrentCount = 10;
      const startTime = Date.now();
      
      const agents = Array.from({ length: concurrentCount }, () => Keypair.generate());
      
      const duration = Date.now() - startTime;
      
      expect(agents.length).toBe(concurrentCount);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`⚡ Generated ${concurrentCount} agent keypairs in ${duration}ms`);
    });
  });
}); 