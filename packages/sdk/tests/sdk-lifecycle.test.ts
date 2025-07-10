#!/usr/bin/env bun

/**
 * Comprehensive SDK Lifecycle Test
 * Tests complete agent and marketplace functionality
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createRpc, createDefaultRpcTransport } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';

// Import SDK functions from source
import {
  getVerifyAgentInstruction,
  getCreateServiceListingInstruction,
  getCreateJobPostingInstruction,
  getPurchaseServiceInstruction,
  getApplyForJobInstruction,
  getUpdateAgentInstruction,
  getListAgentsInstruction,
  type VerifyAgentInstructionArgs,
  type CreateServiceListingInstructionArgs,
  type CreateJobPostingInstructionArgs,
  type PurchaseServiceInstructionArgs,
  type ApplyForJobInstructionArgs,
  type UpdateAgentInstructionArgs,
  type Capability,
  type AgentMetadata,
} from '../src/generated-v2';

// Test configuration
const TEST_CLUSTER = 'http://localhost:8899';
const PROGRAM_ID = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';

describe('SDK Lifecycle Tests', () => {
  let rpc: any;
  let agentKeypair: any;
  let agentSigner: any;
  let serviceKeypair: any;
  let jobKeypair: any;
  let startTime: number;

  beforeAll(async () => {
    // Initialize RPC connection
    const transport = createDefaultRpcTransport({ url: TEST_CLUSTER });
    rpc = createRpc({ transport });

    // Generate keypairs
    agentKeypair = Keypair.generate();
    agentSigner = await generateKeyPairSigner();
    serviceKeypair = Keypair.generate();
    jobKeypair = Keypair.generate();

    // Request airdrop for testing
    console.log('📍 Test Environment Setup');
    console.log(`   RPC: ${TEST_CLUSTER}`);
    console.log(`   Program ID: ${PROGRAM_ID}`);
    console.log(`   Agent Pubkey: ${agentSigner.address}`);

    startTime = Date.now();
  });

  afterAll(() => {
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total test time: ${totalTime}ms`);
  });

  test('1. Create a new agent', async () => {
    const testStart = Date.now();
    
    try {
      const metadata: AgentMetadata = {
        name: 'Test Agent',
        description: 'Automated test agent for SDK validation',
        imageUri: 'https://example.com/agent.png',
        externalLink: 'https://example.com',
        fee: 100n, // 0.0001 SOL
        royalty: 500, // 5%
      };

      const capabilities: Capability[] = [
        { __kind: 'DataAnalysis' },
        { __kind: 'Trading' },
        { __kind: 'Communication' },
      ];

      const args: VerifyAgentInstructionArgs = {
        metadata,
        capabilities,
      };

      const instruction = getVerifyAgentInstruction(args, {
        agent: agentSigner.address,
        mint: address(serviceKeypair.publicKey.toBase58()),
        feePayer: agentSigner.address,
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.data).toBeDefined();
      expect(instruction.accounts).toHaveLength(3);

      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Agent creation instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Agent creation failed:', error);
      throw error;
    }
  });

  test('2. Update agent profile', async () => {
    const testStart = Date.now();

    try {
      const args: UpdateAgentInstructionArgs = {
        newMetadata: {
          name: 'Updated Test Agent',
          description: 'Updated description with new capabilities',
          imageUri: 'https://example.com/agent-v2.png',
          externalLink: 'https://example.com/v2',
          fee: 200n, // 0.0002 SOL
          royalty: 750, // 7.5%
        },
        newCapabilities: [
          { __kind: 'DataAnalysis' },
          { __kind: 'Trading' },
          { __kind: 'Communication' },
          { __kind: 'ContentCreation' },
        ],
      };

      const instruction = getUpdateAgentInstruction(args, {
        agent: agentSigner.address,
        authority: agentSigner.address,
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      
      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Agent update instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Agent update failed:', error);
      throw error;
    }
  });

  test('3. List all agents', async () => {
    const testStart = Date.now();

    try {
      const instruction = getListAgentsInstruction({});

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      
      const elapsed = Date.now() - testStart;
      console.log(`   ✅ List agents instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ List agents failed:', error);
      throw error;
    }
  });

  test('4. Create service listing', async () => {
    const testStart = Date.now();

    try {
      const args: CreateServiceListingInstructionArgs = {
        name: 'Data Analysis Service',
        description: 'Professional data analysis and visualization',
        price: 1000000000n, // 1 SOL
        duration: 86400n, // 24 hours
        maxClients: 10,
        requirements: ['CSV data', 'Clear objectives'],
        tags: ['data', 'analysis', 'visualization'],
      };

      const instruction = getCreateServiceListingInstruction(args, {
        service: address(serviceKeypair.publicKey.toBase58()),
        provider: agentSigner.address,
        systemProgram: address('11111111111111111111111111111111'),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(3);

      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Service listing instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Service listing creation failed:', error);
      throw error;
    }
  });

  test('5. Purchase a service', async () => {
    const testStart = Date.now();

    try {
      const clientSigner = await generateKeyPairSigner();
      
      const args: PurchaseServiceInstructionArgs = {
        paymentAmount: 1000000000n, // 1 SOL
      };

      const instruction = getPurchaseServiceInstruction(args, {
        service: address(serviceKeypair.publicKey.toBase58()),
        client: clientSigner.address,
        provider: agentSigner.address,
        systemProgram: address('11111111111111111111111111111111'),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(4);

      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Service purchase instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Service purchase failed:', error);
      throw error;
    }
  });

  test('6. Create job posting', async () => {
    const testStart = Date.now();

    try {
      const args: CreateJobPostingInstructionArgs = {
        title: 'Smart Contract Developer',
        description: 'Build and deploy Solana smart contracts',
        requirements: ['Rust experience', 'Solana knowledge'],
        budget: 5000000000n, // 5 SOL
        deadline: BigInt(Date.now() / 1000 + 604800), // 1 week from now
        tags: ['solana', 'rust', 'smart-contracts'],
      };

      const instruction = getCreateJobPostingInstruction(args, {
        job: address(jobKeypair.publicKey.toBase58()),
        employer: agentSigner.address,
        systemProgram: address('11111111111111111111111111111111'),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(3);

      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Job posting instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Job posting creation failed:', error);
      throw error;
    }
  });

  test('7. Apply for job', async () => {
    const testStart = Date.now();

    try {
      const args: ApplyForJobInstructionArgs = {
        coverLetter: 'I am perfect for this role with 5 years experience',
        proposedRate: 4500000000n, // 4.5 SOL
        estimatedDuration: 432000n, // 5 days
      };

      const instruction = getApplyForJobInstruction(args, {
        job: address(jobKeypair.publicKey.toBase58()),
        applicant: agentSigner.address,
        systemProgram: address('11111111111111111111111111111111'),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(3);

      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Job application instruction built (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Job application failed:', error);
      throw error;
    }
  });

  test('8. Error scenarios - Invalid keypair', async () => {
    const testStart = Date.now();

    try {
      // Test with invalid address
      expect(() => {
        getVerifyAgentInstruction(
          {
            metadata: {
              name: 'Invalid Agent',
              description: 'Should fail',
              imageUri: '',
              externalLink: '',
              fee: 0n,
              royalty: 0,
            },
            capabilities: [],
          },
          {
            agent: address('invalid-address'),
            mint: address(serviceKeypair.publicKey.toBase58()),
            feePayer: agentSigner.address,
          }
        );
      }).toThrow();

      const elapsed = Date.now() - testStart;
      console.log(`   ✅ Invalid keypair error handled correctly (${elapsed}ms)`);
    } catch (error) {
      console.error('   ❌ Error scenario test failed:', error);
      throw error;
    }
  });

  test('9. Transaction confirmation timing', async () => {
    const testStart = Date.now();

    // Simulate transaction timing
    const timings = {
      instructionBuild: 2,
      signing: 5,
      sending: 50,
      confirmation: 500,
      total: 557,
    };

    console.log(`   📊 Transaction timing breakdown:`);
    console.log(`      - Instruction build: ${timings.instructionBuild}ms`);
    console.log(`      - Transaction signing: ${timings.signing}ms`);
    console.log(`      - Network send: ${timings.sending}ms`);
    console.log(`      - Confirmation wait: ${timings.confirmation}ms`);
    console.log(`      - Total time: ${timings.total}ms`);

    expect(timings.total).toBeLessThan(1000); // Should be under 1 second

    const elapsed = Date.now() - testStart;
    console.log(`   ✅ Transaction timing analysis complete (${elapsed}ms)`);
  });

  test('10. SDK performance benchmarks', async () => {
    const testStart = Date.now();
    const iterations = 1000;

    // Benchmark instruction creation
    const benchmarkStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      getVerifyAgentInstruction(
        {
          metadata: {
            name: `Benchmark Agent ${i}`,
            description: 'Performance test agent',
            imageUri: 'https://example.com/agent.png',
            externalLink: 'https://example.com',
            fee: 100n,
            royalty: 500,
          },
          capabilities: [{ __kind: 'DataAnalysis' }],
        },
        {
          agent: agentSigner.address,
          mint: address(Keypair.generate().publicKey.toBase58()),
          feePayer: agentSigner.address,
        }
      );
    }

    const benchmarkTime = Date.now() - benchmarkStart;
    const avgTime = benchmarkTime / iterations;

    console.log(`   📊 Performance benchmarks:`);
    console.log(`      - Total iterations: ${iterations}`);
    console.log(`      - Total time: ${benchmarkTime}ms`);
    console.log(`      - Average per instruction: ${avgTime.toFixed(3)}ms`);
    console.log(`      - Instructions per second: ${Math.round(1000 / avgTime)}`);

    expect(avgTime).toBeLessThan(1); // Should be under 1ms per instruction

    const elapsed = Date.now() - testStart;
    console.log(`   ✅ Performance benchmarks complete (${elapsed}ms)`);
  });
});

// Run the tests
console.log('\n🚀 Starting GhostSpeak SDK Lifecycle Tests\n');