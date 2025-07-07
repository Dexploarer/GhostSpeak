/**
 * Client Factory Functions Test
 * Target: Cover lines 411, 429-433, 440-444 in client-v2.ts
 */

import { describe, test, expect } from 'bun:test';
import { 
  createPodAIClient, 
  createDevnetClient, 
  createLocalnetClient, 
  createMainnetClient,
  PodAIClient 
} from '../src/client-v2.js';

describe('Client Factory Functions Coverage', () => {
  describe('createPodAIClient Factory', () => {
    test('createPodAIClient function', async () => {
      console.log('🏭 Testing createPodAIClient factory function...');
      
      // Test line 411-412: createPodAIClient function
      const client = createPodAIClient({
        rpcEndpoint: 'https://api.devnet.solana.com',
        commitment: 'confirmed'
      });
      
      expect(client).toBeInstanceOf(PodAIClient);
      expect(client.rpcEndpoint).toBe('https://api.devnet.solana.com');
      expect(client.getCommitment()).toBe('confirmed');
      
      console.log('✅ createPodAIClient factory function tested');
    });
  });

  describe('Environment-Specific Client Factories', () => {
    test('createDevnetClient function', async () => {
      console.log('🌐 Testing createDevnetClient factory function...');
      
      // Test createDevnetClient without programId
      const devnetClient1 = createDevnetClient();
      expect(devnetClient1).toBeInstanceOf(PodAIClient);
      expect(devnetClient1.rpcEndpoint).toBe('https://api.devnet.solana.com');
      expect(devnetClient1.getCommitment()).toBe('confirmed');
      
      // Test createDevnetClient with programId (line 421: programId conditional)
      const testProgramId = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
      const devnetClient2 = createDevnetClient(testProgramId);
      expect(devnetClient2).toBeInstanceOf(PodAIClient);
      expect(devnetClient2.programId).toBe(testProgramId);
      expect(devnetClient2.rpcEndpoint).toBe('https://api.devnet.solana.com');
      expect(devnetClient2.getCommitment()).toBe('confirmed');
      
      console.log('✅ createDevnetClient factory function tested');
    });

    test('createLocalnetClient function', async () => {
      console.log('🏠 Testing createLocalnetClient factory function...');
      
      // Test lines 429-433: createLocalnetClient function
      const localnetClient1 = createLocalnetClient();
      expect(localnetClient1).toBeInstanceOf(PodAIClient);
      expect(localnetClient1.rpcEndpoint).toBe('http://127.0.0.1:8899');
      expect(localnetClient1.getCommitment()).toBe('confirmed');
      
      // Test createLocalnetClient with programId (line 432: programId conditional)
      const testProgramId = 'TestProgram1111111111111111111111111111111';
      const localnetClient2 = createLocalnetClient(testProgramId);
      expect(localnetClient2).toBeInstanceOf(PodAIClient);
      expect(localnetClient2.programId).toBe(testProgramId);
      expect(localnetClient2.rpcEndpoint).toBe('http://127.0.0.1:8899');
      expect(localnetClient2.getCommitment()).toBe('confirmed');
      
      console.log('✅ createLocalnetClient factory function tested');
    });

    test('createMainnetClient function', async () => {
      console.log('🌍 Testing createMainnetClient factory function...');
      
      // Test lines 440-444: createMainnetClient function
      const mainnetClient1 = createMainnetClient();
      expect(mainnetClient1).toBeInstanceOf(PodAIClient);
      expect(mainnetClient1.rpcEndpoint).toBe('https://api.mainnet-beta.solana.com');
      expect(mainnetClient1.getCommitment()).toBe('confirmed');
      
      // Test createMainnetClient with programId (line 443: programId conditional)
      const testProgramId = 'MainnetProgram11111111111111111111111111111';
      const mainnetClient2 = createMainnetClient(testProgramId);
      expect(mainnetClient2).toBeInstanceOf(PodAIClient);
      expect(mainnetClient2.programId).toBe(testProgramId);
      expect(mainnetClient2.rpcEndpoint).toBe('https://api.mainnet-beta.solana.com');
      expect(mainnetClient2.getCommitment()).toBe('confirmed');
      
      console.log('✅ createMainnetClient factory function tested');
    });
  });

  describe('Factory Function Variations', () => {
    test('All factory functions with different program IDs', async () => {
      console.log('🎯 Testing all factory functions with different program IDs...');
      
      const programIds = [
        '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
        'Test1111111111111111111111111111111111111111',
        'Test2222222222222222222222222222222222222222'
      ];
      
      for (const programId of programIds) {
        // Test all environment factories with program ID
        const devnetClient = createDevnetClient(programId);
        const localnetClient = createLocalnetClient(programId);
        const mainnetClient = createMainnetClient(programId);
        
        expect(devnetClient.programId).toBe(programId);
        expect(localnetClient.programId).toBe(programId);
        expect(mainnetClient.programId).toBe(programId);
        
        console.log(`  ✅ Program ID ${programId.substring(0, 10)}... tested across all environments`);
      }
    });

    test('Factory functions without program IDs', async () => {
      console.log('📋 Testing all factory functions without program IDs...');
      
      // Test all factories without program ID to ensure default behavior
      const devnetClient = createDevnetClient();
      const localnetClient = createLocalnetClient();
      const mainnetClient = createMainnetClient();
      
      // Verify they use default program IDs
      expect(devnetClient.programId).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      expect(localnetClient.programId).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      expect(mainnetClient.programId).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      
      // Verify endpoints are correct
      expect(devnetClient.rpcEndpoint).toBe('https://api.devnet.solana.com');
      expect(localnetClient.rpcEndpoint).toBe('http://127.0.0.1:8899');
      expect(mainnetClient.rpcEndpoint).toBe('https://api.mainnet-beta.solana.com');
      
      console.log('✅ All factory functions tested without program IDs');
    });

    test('createPodAIClient with various configurations', async () => {
      console.log('⚙️ Testing createPodAIClient with various configurations...');
      
      const configurations = [
        {
          rpcEndpoint: 'https://api.devnet.solana.com',
          commitment: 'processed' as const,
          description: 'Devnet with processed commitment'
        },
        {
          rpcEndpoint: 'https://api.mainnet-beta.solana.com',
          commitment: 'finalized' as const,
          programId: 'CustomProgram1111111111111111111111111111111',
          description: 'Mainnet with custom program'
        },
        {
          rpcEndpoint: 'http://localhost:8899',
          wsEndpoint: 'ws://localhost:8900',
          commitment: 'confirmed' as const,
          description: 'Local with custom WS endpoint'
        }
      ];
      
      for (const config of configurations) {
        const client = createPodAIClient(config);
        
        expect(client).toBeInstanceOf(PodAIClient);
        expect(client.rpcEndpoint).toBe(config.rpcEndpoint);
        expect(client.getCommitment()).toBe(config.commitment);
        
        if (config.programId) {
          expect(client.programId).toBe(config.programId);
        }
        
        if (config.wsEndpoint) {
          expect(client.getWsEndpoint()).toBe(config.wsEndpoint);
        }
        
        console.log(`  ✅ ${config.description} tested`);
      }
    });
  });
});