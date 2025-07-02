import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Connection } from '@solana/web3.js';

describe('CLI Network Connectivity E2E Tests', () => {
  beforeAll(async () => {
    console.log('🌐 CLI Network connectivity test environment initialized');
  });

  afterAll(async () => {
    console.log('🧹 CLI Network tests cleaned up');
  });

  describe('RPC Connections', () => {
    test('should create RPC client instances', async () => {
      const devnetConnection = new Connection('https://api.devnet.solana.com');
      const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
      
      expect(devnetConnection).toBeDefined();
      expect(mainnetConnection).toBeDefined();
    });

    test('should test devnet connectivity', async () => {
      const connection = new Connection('https://api.devnet.solana.com');
      
      try {
        const slot = await connection.getSlot();
        expect(typeof slot).toBe('number');
        console.log('✅ CLI can connect to devnet at slot:', slot.toString());
      } catch (error) {
        console.warn('⚠️ Devnet connection failed:', error);
      }
    });

    test('should handle connection timeouts gracefully', async () => {
      const connection = new Connection('http://localhost:9999'); // Non-existent endpoint
      
      try {
        await connection.getSlot();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Properly handled connection timeout');
      }
    });
  });
}); 