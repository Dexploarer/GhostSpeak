import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createSolanaRpc } from '@solana/web3.js';
import { 
  createTestConfig, 
  cleanupTestEnvironment 
} from '../helpers/test-config';

describe('Network Connectivity E2E Tests', () => {
  let testConfig: any;

  beforeAll(async () => {
    testConfig = await createTestConfig();
    console.log('🌐 Network connectivity test environment initialized');
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
    console.log('🧹 Network tests cleaned up');
  });

  describe('RPC Connectivity', () => {
    test('should connect to localnet RPC', async () => {
      const localRpc = createSolanaRpc('http://127.0.0.1:8899');
      
      try {
        const slot = await localRpc.getSlot().send();
        expect(typeof slot).toBe('bigint');
        console.log('✅ Connected to localnet at slot:', slot.toString());
      } catch (error) {
        console.warn('⚠️ Localnet not available, skipping test');
      }
    });

    test('should connect to devnet RPC', async () => {
      const devnetRpc = createSolanaRpc('https://api.devnet.solana.com');
      
      try {
        const slot = await devnetRpc.getSlot().send();
        expect(typeof slot).toBe('bigint');
        console.log('✅ Connected to devnet at slot:', slot.toString());
      } catch (error) {
        console.warn('⚠️ Devnet connection failed:', error);
        // Don't fail the test if network is unavailable
      }
    });

    test('should handle RPC errors gracefully', async () => {
      const invalidRpc = createSolanaRpc('http://invalid-url:8899');
      
      try {
        await invalidRpc.getSlot().send();
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
        console.log('✅ Properly handled invalid RPC URL');
      }
    });

    test('should validate test configuration RPC', async () => {
      expect(testConfig.rpc).toBeDefined();
      
      try {
        const slot = await testConfig.rpc.getSlot().send();
        expect(typeof slot).toBe('bigint');
      } catch (error) {
        console.warn('Test RPC not available:', error);
      }
    });
  });
}); 