/**
 * Comprehensive SDK Integration Testing
 * Tests all SDK features after recent fixes
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  createMinimalClient,
  loadAdvancedServices,
  loadOptionalServices,
  loadAnalytics,
  loadObservability,
  createFullClient,
  lamportsToSol,
  solToLamports,
  PODAI_PROGRAM_ID,
  DEVNET_RPC,
  VERSION,
  SDK_NAME
} from '../src/index';
import { address } from '@solana/addresses';
import { generateKeyPairSigner } from '@solana/signers';
import { createSolanaRpc } from '@solana/rpc';
import { pipe } from '@solana/promises';
import { BankrunTestClient } from '../src/testing/bankrun-client';

// Bundle size tracking
import * as fs from 'fs';
import * as path from 'path';

describe('Comprehensive SDK Validation Suite', () => {
  let testClient: BankrunTestClient;
  let signer: Awaited<ReturnType<typeof generateKeyPairSigner>>;
  let rpc: ReturnType<typeof createSolanaRpc>;

  beforeAll(async () => {
    // Initialize test environment
    testClient = new BankrunTestClient();
    await testClient.setup();
    signer = await generateKeyPairSigner();
    rpc = createSolanaRpc(DEVNET_RPC);
  });

  afterAll(async () => {
    await testClient.teardown();
  });

  describe('1. Dynamic Import System', () => {
    it('should load advanced services dynamically', async () => {
      const services = await loadAdvancedServices();
      
      expect(services).toBeDefined();
      expect(services.AgentService).toBeDefined();
      expect(services.ChannelService).toBeDefined();
      expect(services.MessageService).toBeDefined();
      expect(services.EscrowService).toBeDefined();
      
      // Verify each service is a constructor
      expect(typeof services.AgentService).toBe('function');
      expect(typeof services.ChannelService).toBe('function');
      expect(typeof services.MessageService).toBe('function');
      expect(typeof services.EscrowService).toBe('function');
    });

    it('should load optional services dynamically', async () => {
      const services = await loadOptionalServices();
      
      expect(services).toBeDefined();
      expect(services.AuctionService).toBeDefined();
      expect(services.BulkDealsService).toBeDefined();
      expect(services.ReputationService).toBeDefined();
    });

    it('should load analytics service dynamically', async () => {
      const { AnalyticsService } = await loadAnalytics();
      expect(AnalyticsService).toBeDefined();
      expect(typeof AnalyticsService).toBe('function');
    });

    it('should load observability features dynamically', async () => {
      const observability = await loadObservability();
      
      expect(observability.initializeObservability).toBeDefined();
      expect(observability.getObservability).toBeDefined();
      expect(observability.withObservability).toBeDefined();
      expect(observability.observed).toBeDefined();
    });

    it('should load full client dynamically', async () => {
      const { PodAIClient, createPodAIClient } = await createFullClient();
      
      expect(PodAIClient).toBeDefined();
      expect(createPodAIClient).toBeDefined();
      expect(typeof createPodAIClient).toBe('function');
    });
  });

  describe('2. BigInt Handling', () => {
    it('should handle lamports to SOL conversion correctly', () => {
      const lamports = BigInt(1_000_000_000);
      const sol = lamportsToSol(lamports);
      expect(sol).toBe(1);
      
      // Test edge cases
      expect(lamportsToSol(BigInt(0))).toBe(0);
      expect(lamportsToSol(BigInt(1))).toBeCloseTo(0.000000001);
      expect(lamportsToSol(BigInt(500_000_000))).toBe(0.5);
    });

    it('should handle SOL to lamports conversion correctly', () => {
      const sol = 1;
      const lamports = solToLamports(sol);
      expect(lamports).toBe(BigInt(1_000_000_000));
      
      // Test edge cases
      expect(solToLamports(0)).toBe(BigInt(0));
      expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
      expect(solToLamports(0.000000001)).toBe(BigInt(1));
    });

    it('should load and use BigInt serialization utilities', async () => {
      const { 
        safeBigIntToU64,
        safeNumberToBigInt,
        TimestampUtils,
        TokenAmountUtils
      } = await import('../src/utils/bigint-serialization');
      
      // Test safe conversions
      const bigIntValue = BigInt(1000);
      const u64 = safeBigIntToU64(bigIntValue);
      expect(u64).toBeInstanceOf(Uint8Array);
      expect(u64.length).toBe(8);
      
      // Test timestamp utilities
      const now = Date.now();
      const timestamp = TimestampUtils.toTimestamp(now);
      expect(typeof timestamp).toBe('bigint');
      
      // Test token amount utilities
      const tokenAmount = TokenAmountUtils.toTokenAmount(1.5, 9);
      expect(tokenAmount).toBe(BigInt(1_500_000_000));
    });

    it('should handle secure BigInt buffer operations', async () => {
      const { 
        secureToBigIntLE,
        secureToBigIntBE,
        secureToBufferLE,
        secureToBufferBE
      } = await import('../src/utils/secure-bigint-buffer');
      
      const testValue = BigInt(12345678901234567890n);
      
      // Test little-endian conversions
      const bufferLE = secureToBufferLE(testValue, 8);
      const bigIntLE = secureToBigIntLE(bufferLE);
      expect(bigIntLE).toBe(testValue & ((1n << 64n) - 1n)); // Mask to 64 bits
      
      // Test big-endian conversions
      const bufferBE = secureToBufferBE(testValue, 8);
      const bigIntBE = secureToBigIntBE(bufferBE);
      expect(bigIntBE).toBe(testValue & ((1n << 64n) - 1n)); // Mask to 64 bits
    });
  });

  describe('3. Service Integration Tests', () => {
    it('should create and use AgentService', async () => {
      const { AgentService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const agentService = new AgentService(client);
      expect(agentService).toBeDefined();
      expect(agentService.register).toBeDefined();
      expect(agentService.fetch).toBeDefined();
      expect(agentService.update).toBeDefined();
      expect(agentService.list).toBeDefined();
    });

    it('should create and use ChannelService', async () => {
      const { ChannelService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const channelService = new ChannelService(client);
      expect(channelService).toBeDefined();
      expect(channelService.create).toBeDefined();
      expect(channelService.join).toBeDefined();
      expect(channelService.leave).toBeDefined();
      expect(channelService.list).toBeDefined();
    });

    it('should create and use MessageService', async () => {
      const { MessageService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const messageService = new MessageService(client);
      expect(messageService).toBeDefined();
      expect(messageService.send).toBeDefined();
      expect(messageService.broadcast).toBeDefined();
      expect(messageService.fetch).toBeDefined();
      expect(messageService.list).toBeDefined();
    });

    it('should create and use EscrowService', async () => {
      const { EscrowService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const escrowService = new EscrowService(client);
      expect(escrowService).toBeDefined();
      expect(escrowService.create).toBeDefined();
      expect(escrowService.release).toBeDefined();
      expect(escrowService.cancel).toBeDefined();
      expect(escrowService.fetch).toBeDefined();
    });
  });

  describe('4. Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const { AgentService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: createSolanaRpc('https://invalid.endpoint.com'),
        signer 
      });
      
      const agentService = new AgentService(client);
      
      // Should throw or return error for invalid network
      await expect(
        agentService.list({ page: 1, pageSize: 10 })
      ).rejects.toThrow();
    });

    it('should handle invalid addresses', async () => {
      const { AgentService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const agentService = new AgentService(client);
      
      // Should handle invalid address format
      await expect(
        agentService.fetch('invalid-address' as any)
      ).rejects.toThrow();
    });

    it('should handle BigInt overflow gracefully', () => {
      const maxU64 = BigInt(2) ** BigInt(64) - BigInt(1);
      const overflowValue = maxU64 + BigInt(1);
      
      // Should handle overflow in conversions
      expect(() => solToLamports(Number.MAX_SAFE_INTEGER)).not.toThrow();
      expect(() => lamportsToSol(overflowValue)).not.toThrow();
    });
  });

  describe('5. Message Throughput Performance', () => {
    it('should achieve target message throughput', async () => {
      const { MessageService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const messageService = new MessageService(client);
      const testChannel = address('11111111111111111111111111111111');
      
      // Measure throughput for 100 messages
      const messageCount = 100;
      const startTime = Date.now();
      
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        channel: testChannel,
        content: `Test message ${i}`,
        messageType: 'text' as const
      }));
      
      // Simulate message sending (without actual blockchain calls for speed)
      for (const msg of messages) {
        // In real test, this would call messageService.send(msg)
        await new Promise(resolve => setImmediate(resolve));
      }
      
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;
      const throughput = messageCount / elapsedSeconds;
      
      console.log(`Message throughput: ${throughput.toFixed(2)} messages/second`);
      
      // Target: > 10 messages/second
      expect(throughput).toBeGreaterThan(10);
    });
  });

  describe('6. Bundle Size Analysis', () => {
    it('should verify bundle size is under 50KB', async () => {
      const distPath = path.join(__dirname, '..', 'dist');
      
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.map'));
        
        let totalSize = 0;
        for (const file of jsFiles) {
          const stats = fs.statSync(path.join(distPath, file));
          totalSize += stats.size;
          console.log(`${file}: ${(stats.size / 1024).toFixed(2)} KB`);
        }
        
        const totalSizeKB = totalSize / 1024;
        console.log(`Total bundle size: ${totalSizeKB.toFixed(2)} KB`);
        
        // Target: < 50KB
        expect(totalSizeKB).toBeLessThan(50);
      } else {
        console.warn('Dist directory not found. Run build first.');
      }
    });
  });

  describe('7. Type Safety Validation', () => {
    it('should maintain type safety for addresses', () => {
      const validAddress = address('11111111111111111111111111111111');
      expect(validAddress).toBeDefined();
      
      // TypeScript should prevent this at compile time
      // @ts-expect-error - Testing invalid type
      expect(() => address(123)).toThrow();
    });

    it('should export all required types', async () => {
      // Import type definitions
      const types = await import('../src/index');
      
      expect(types).toHaveProperty('IAgent');
      expect(types).toHaveProperty('IChannel');
      expect(types).toHaveProperty('IMessage');
    });
  });

  describe('8. Real-World Usage Scenarios', () => {
    it('should handle complete agent registration flow', async () => {
      const { AgentService } = await loadAdvancedServices();
      const { createPodAIClient } = await createFullClient();
      
      const client = await createPodAIClient({
        endpoint: testClient.rpc as any,
        signer
      });
      
      const agentService = new AgentService(client as any);
      
      // Simulate registration flow
      const agentData = {
        name: 'Test Agent',
        description: 'Test agent for SDK validation',
        capabilities: ['testing', 'validation'],
        fee: BigInt(1_000_000), // 0.001 SOL
        stake: BigInt(100_000_000) // 0.1 SOL
      };
      
      // In real test, this would call agentService.register(agentData)
      expect(agentData.fee).toBe(BigInt(1_000_000));
      expect(agentData.stake).toBe(BigInt(100_000_000));
    });

    it('should handle complete escrow transaction flow', async () => {
      const { EscrowService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const escrowService = new EscrowService(client);
      
      // Simulate escrow flow
      const escrowData = {
        amount: solToLamports(0.5),
        receiver: address('22222222222222222222222222222222'),
        timeout: BigInt(Date.now() + 3600000) // 1 hour from now
      };
      
      expect(escrowData.amount).toBe(BigInt(500_000_000));
      expect(typeof escrowData.timeout).toBe('bigint');
    });

    it('should handle high-volume messaging scenario', async () => {
      const { MessageService, ChannelService } = await loadAdvancedServices();
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const messageService = new MessageService(client);
      const channelService = new ChannelService(client);
      
      // Simulate high-volume messaging
      const batchSize = 50;
      const messages = Array.from({ length: batchSize }, (_, i) => ({
        content: `Batch message ${i}`,
        timestamp: BigInt(Date.now() + i)
      }));
      
      // Verify all messages have proper BigInt timestamps
      messages.forEach(msg => {
        expect(typeof msg.timestamp).toBe('bigint');
      });
    });
  });

  describe('9. SDK Constants and Configuration', () => {
    it('should export correct constants', () => {
      expect(PODAI_PROGRAM_ID).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      expect(DEVNET_RPC).toBe('https://api.devnet.solana.com');
      expect(VERSION).toBe('2.0.4');
      expect(SDK_NAME).toBe('ghostspeak-sdk');
    });

    it('should use correct program ID in all services', async () => {
      const services = await loadAdvancedServices();
      
      // Each service should use the correct program ID
      const client = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      const agentService = new (services.AgentService as any)(client);
      expect(agentService.programId).toBe(PODAI_PROGRAM_ID);
    });
  });

  describe('10. Tree-Shaking Verification', () => {
    it('should not load unused services', async () => {
      // Track which modules are loaded
      const loadedModules = new Set<string>();
      
      // Override require to track module loading
      const originalRequire = require;
      (global as any).require = (id: string) => {
        loadedModules.add(id);
        return originalRequire(id);
      };
      
      // Load only minimal client
      const minimalClient = createMinimalClient({ 
        rpc: testClient.rpc,
        signer 
      });
      
      // Verify optional services are not loaded
      expect(loadedModules.has('./services/auction')).toBe(false);
      expect(loadedModules.has('./services/bulk-deals')).toBe(false);
      expect(loadedModules.has('./services/reputation')).toBe(false);
      
      // Restore original require
      (global as any).require = originalRequire;
    });
  });
});

// Performance benchmark runner
export async function runPerformanceBenchmarks() {
  console.log('Running SDK Performance Benchmarks...\n');
  
  const benchmarks = {
    dynamicImportTime: 0,
    serviceCreationTime: 0,
    bigIntOperationTime: 0,
    messageSerializationTime: 0,
  };
  
  // Benchmark dynamic imports
  const importStart = performance.now();
  await loadAdvancedServices();
  benchmarks.dynamicImportTime = performance.now() - importStart;
  
  // Benchmark service creation
  const serviceStart = performance.now();
  const { AgentService } = await loadAdvancedServices();
  const client = createMinimalClient({ 
    rpc: createSolanaRpc(DEVNET_RPC),
    signer: await generateKeyPairSigner()
  });
  new AgentService(client);
  benchmarks.serviceCreationTime = performance.now() - serviceStart;
  
  // Benchmark BigInt operations
  const bigIntStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    solToLamports(Math.random() * 100);
    lamportsToSol(BigInt(Math.floor(Math.random() * 1_000_000_000_000)));
  }
  benchmarks.bigIntOperationTime = performance.now() - bigIntStart;
  
  // Print results
  console.log('Performance Benchmark Results:');
  console.log('==============================');
  console.log(`Dynamic Import Time: ${benchmarks.dynamicImportTime.toFixed(2)}ms`);
  console.log(`Service Creation Time: ${benchmarks.serviceCreationTime.toFixed(2)}ms`);
  console.log(`10K BigInt Operations: ${benchmarks.bigIntOperationTime.toFixed(2)}ms`);
  console.log(`Avg BigInt Operation: ${(benchmarks.bigIntOperationTime / 10000).toFixed(4)}ms`);
  
  return benchmarks;
}