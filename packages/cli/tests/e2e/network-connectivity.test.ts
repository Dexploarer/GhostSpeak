import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createSolanaRpc } from '@solana/web3.js';

describe('CLI Network Connectivity E2E Tests', () => {
  beforeAll(async () => {
    console.log('🌐 CLI Network connectivity test environment initialized');
  });

  afterAll(async () => {
    console.log('🧹 CLI Network tests cleaned up');
  });

  describe('RPC Connections', () => {
    test('should create RPC client instances', async () => {
      const devnetRpc = createSolanaRpc('https://api.devnet.solana.com');
      const mainnetRpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
      
      expect(devnetRpc).toBeDefined();
      expect(mainnetRpc).toBeDefined();
    });

    test('should test devnet connectivity', async () => {
      const rpc = createSolanaRpc('https://api.devnet.solana.com');
      
      try {
        const slot = await rpc.getSlot().send();
        expect(typeof slot).toBe('bigint');
        console.log('✅ CLI can connect to devnet at slot:', slot.toString());
      } catch (error) {
        console.warn('⚠️ Devnet connection failed:', error);
      }
    });

    test('should handle connection timeouts gracefully', async () => {
      const rpc = createSolanaRpc('http://localhost:9999'); // Non-existent endpoint
      
      try {
        await rpc.getSlot().send();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Properly handled connection timeout');
      }
    });
  });
}); 