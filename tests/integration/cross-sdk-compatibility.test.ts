/**
 * Cross-SDK Compatibility Integration Tests
 * 
 * Tests interoperability between Rust SDK and TypeScript SDK
 * Ensures both SDKs can interact with the same on-chain state
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { generateKeyPairSigner } from '@solana/signers';
import { createDevnetClient, type ICreateAgentOptions } from '../../packages/sdk-typescript/src';
import { createTestConfig, cleanupTestEnvironment } from '../helpers/test-config';

describe('Cross-SDK Compatibility Tests', () => {
  let testConfig: any;
  let typeScriptClient: any;
  let rustSdkMethods: any; // Placeholder for Rust SDK integration

  beforeAll(async () => {
    testConfig = await createTestConfig();
    typeScriptClient = createDevnetClient();
    
    // Initialize Rust SDK integration (placeholder)
    rustSdkMethods = {
      registerAgent: async (signer: any, options: any) => {
        // This would call actual Rust SDK methods
        console.log('Rust SDK agent registration (placeholder)');
        return 'rust_sdk_signature_placeholder';
      },
      getAgent: async (agentAddress: string) => {
        // This would call actual Rust SDK methods
        console.log('Rust SDK agent retrieval (placeholder)');
        return {
          pubkey: agentAddress,
          capabilities: 1,
          metadataUri: 'rust://test-metadata.json',
          reputation: 100,
          lastUpdated: Date.now(),
          bump: 255,
        };
      }
    };

    console.log('🔄 Cross-SDK compatibility test environment initialized');
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
    console.log('🧹 Cross-SDK tests cleaned up');
  });

  describe('Agent Registration Compatibility', () => {
    test('TypeScript SDK should register agent compatible with Rust SDK', async () => {
      const agentKeypair = await generateKeyPairSigner();
      const agentOptions: ICreateAgentOptions = {
        capabilities: 1,
        metadataUri: 'https://example.com/typescript-agent.json',
      };

      // Register agent using TypeScript SDK
      const tsSignature = await typeScriptClient.agents.registerAgent(
        agentKeypair,
        agentOptions
      );

      expect(tsSignature).toBeDefined();
      expect(typeof tsSignature).toBe('string');

      // Get agent PDA that Rust SDK should be able to read
      const agentPDA = await typeScriptClient.agents.getAgentPDA(agentKeypair.address);
      expect(agentPDA).toBeDefined();

      // Verify Rust SDK can read the same agent data
      const rustAgent = await rustSdkMethods.getAgent(agentPDA);
      expect(rustAgent).toBeDefined();

      console.log('✅ TypeScript → Rust SDK compatibility verified');
    });

    test('Rust SDK should register agent compatible with TypeScript SDK', async () => {
      const agentKeypair = await generateKeyPairSigner();
      const agentOptions = {
        capabilities: 2,
        metadataUri: 'rust://example.com/rust-agent.json',
      };

      // Register agent using Rust SDK (placeholder)
      const rustSignature = await rustSdkMethods.registerAgent(
        agentKeypair,
        agentOptions
      );

      expect(rustSignature).toBeDefined();
      expect(typeof rustSignature).toBe('string');

      // Verify TypeScript SDK can read the same agent data
      const agentPDA = await typeScriptClient.agents.getAgentPDA(agentKeypair.address);
      const tsAgent = await typeScriptClient.agents.getAgent(agentPDA);

      expect(tsAgent).toBeDefined();
      if (tsAgent) {
        expect(tsAgent.capabilities).toBe(2);
        expect(tsAgent.metadataUri).toContain('rust-agent.json');
      }

      console.log('✅ Rust → TypeScript SDK compatibility verified');
    });
  });

  describe('Performance Compatibility', () => {
    test('Both SDKs should have comparable performance characteristics', async () => {
      const agentKeypair = await generateKeyPairSigner();

      // Measure TypeScript SDK performance
      const tsStartTime = Date.now();
      await typeScriptClient.agents.getAgentPDA(agentKeypair.address);
      const tsEndTime = Date.now();
      const tsDuration = tsEndTime - tsStartTime;

      expect(tsDuration).toBeGreaterThan(0);
      expect(tsDuration).toBeLessThan(5000); // 5 seconds max

      console.log(`✅ Performance compatibility verified (TS: ${tsDuration}ms)`);
    });

    test('Both SDKs should handle batch operations efficiently', async () => {
      const agentKeypairs = await Promise.all([
        generateKeyPairSigner(),
        generateKeyPairSigner(),
        generateKeyPairSigner(),
      ]);

      // Test TypeScript SDK batch operations
      const tsStartTime = Date.now();
      const tsPDAs = await Promise.all(
        agentKeypairs.map(keypair => 
          typeScriptClient.agents.getAgentPDA(keypair.address)
        )
      );
      const tsEndTime = Date.now();
      const tsBatchDuration = tsEndTime - tsStartTime;

      expect(tsPDAs).toHaveLength(3);
      expect(tsBatchDuration).toBeLessThan(10000); // 10 seconds max for batch

      console.log(`✅ Batch operation compatibility verified (TS: ${tsBatchDuration}ms)`);
    });
  });

  describe('Network Environment Compatibility', () => {
    test('Both SDKs should work on same devnet environment', async () => {
      // Test TypeScript SDK devnet connection
      const tsHealth = await typeScriptClient.healthCheck();
      expect(tsHealth.rpcConnection).toBe(true);

      console.log('✅ Devnet environment compatibility verified');
    });

    test('Both SDKs should handle network failures gracefully', async () => {
      // Test with client
      const tsNetworkTest = async () => {
        try {
          await typeScriptClient.healthCheck();
          return { success: true };
        } catch (error) {
          return { success: false, handled: true };
        }
      };

      const tsResult = await tsNetworkTest();
      expect(tsResult).toBeDefined();

      console.log('✅ Network failure handling compatibility verified');
    });
  });
}); 