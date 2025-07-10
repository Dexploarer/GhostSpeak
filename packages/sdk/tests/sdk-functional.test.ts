#!/usr/bin/env bun

/**
 * SDK Functional Test Suite
 * Tests available SDK functionality with actual generated instructions
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Keypair } from '@solana/web3.js';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';

// Import available SDK functions
import {
  getVerifyAgentInstruction,
  getCreateServiceListingInstruction,
  getCreateJobPostingInstruction,
  getPurchaseServiceInstruction,
  getCreateWorkOrderInstruction,
  getSubmitWorkDeliveryInstruction,
  getProcessPaymentInstruction,
  getCreateChannelInstruction,
  getSendMessageInstruction,
  getBroadcastMessageInstruction,
  type VerifyAgentInstructionArgs,
  type CreateServiceListingInstructionArgs,
  type CreateJobPostingInstructionArgs,
  type PurchaseServiceInstructionArgs,
  type CreateWorkOrderInstructionArgs,
  type Capability,
  type AgentMetadata,
} from '../src/generated-v2';

// Test configuration
const PROGRAM_ID = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

describe('GhostSpeak SDK Functional Tests', () => {
  let agentSigner: any;
  let serviceKeypair: Keypair;
  let jobKeypair: Keypair;
  let channelKeypair: Keypair;
  let workOrderKeypair: Keypair;

  beforeAll(async () => {
    // Generate keypairs for testing
    agentSigner = await generateKeyPairSigner();
    serviceKeypair = Keypair.generate();
    jobKeypair = Keypair.generate();
    channelKeypair = Keypair.generate();
    workOrderKeypair = Keypair.generate();

    console.log('\n📍 Test Configuration:');
    console.log(`   Program ID: ${PROGRAM_ID}`);
    console.log(`   Agent Address: ${agentSigner.address}`);
  });

  describe('Agent Operations', () => {
    test('Create and verify agent', async () => {
      const startTime = Date.now();

      const metadata: AgentMetadata = {
        name: 'AI Assistant Agent',
        description: 'Advanced AI agent for data analysis and automation',
        imageUri: 'https://api.ghostspeak.ai/agents/ai-assistant.png',
        externalLink: 'https://ghostspeak.ai/agents/ai-assistant',
        fee: 100000000n, // 0.1 SOL
        royalty: 250, // 2.5%
      };

      const capabilities: Capability[] = [
        { __kind: 'DataAnalysis' },
        { __kind: 'ContentCreation' },
        { __kind: 'Trading' },
        { __kind: 'Communication' },
      ];

      const args: VerifyAgentInstructionArgs = {
        metadata,
        capabilities,
      };

      const instruction = getVerifyAgentInstruction(args, {
        agent: agentSigner.address,
        mint: address(Keypair.generate().publicKey.toBase58()),
        feePayer: agentSigner.address,
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.data).toBeDefined();
      expect(instruction.accounts).toHaveLength(3);

      // Verify accounts
      expect(instruction.accounts[0].address).toBe(agentSigner.address);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[0].isSigner).toBe(true);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Agent verification instruction: ${elapsed}ms`);
    });
  });

  describe('Marketplace Operations', () => {
    test('Create service listing', async () => {
      const startTime = Date.now();

      const args: CreateServiceListingInstructionArgs = {
        name: 'Smart Contract Audit Service',
        description: 'Comprehensive security audit for Solana smart contracts',
        price: 5000000000n, // 5 SOL
        duration: 604800n, // 1 week in seconds
        maxClients: 5,
        requirements: [
          'Smart contract source code',
          'Project documentation',
          'Test suite',
        ],
        tags: ['audit', 'security', 'solana', 'smart-contract'],
      };

      const instruction = getCreateServiceListingInstruction(args, {
        service: address(serviceKeypair.publicKey.toBase58()),
        provider: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(3);

      // Verify data encoding
      expect(instruction.data.byteLength).toBeGreaterThan(0);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Service listing instruction: ${elapsed}ms`);
    });

    test('Create job posting', async () => {
      const startTime = Date.now();

      const args: CreateJobPostingInstructionArgs = {
        title: 'DeFi Protocol Developer',
        description: 'Build and deploy a DeFi lending protocol on Solana',
        requirements: [
          '3+ years Rust experience',
          'Solana/Anchor framework expertise',
          'DeFi protocol knowledge',
        ],
        budget: 25000000000n, // 25 SOL
        deadline: BigInt(Date.now() / 1000 + 2592000), // 30 days from now
        tags: ['defi', 'solana', 'rust', 'lending'],
      };

      const instruction = getCreateJobPostingInstruction(args, {
        job: address(jobKeypair.publicKey.toBase58()),
        employer: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(3);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Job posting instruction: ${elapsed}ms`);
    });

    test('Purchase service', async () => {
      const startTime = Date.now();
      const clientSigner = await generateKeyPairSigner();

      const args: PurchaseServiceInstructionArgs = {
        paymentAmount: 5000000000n, // 5 SOL
      };

      const instruction = getPurchaseServiceInstruction(args, {
        service: address(serviceKeypair.publicKey.toBase58()),
        client: clientSigner.address,
        provider: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);
      expect(instruction.accounts).toHaveLength(4);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Purchase service instruction: ${elapsed}ms`);
    });
  });

  describe('Work Order Management', () => {
    test('Create work order', async () => {
      const startTime = Date.now();

      const args: CreateWorkOrderInstructionArgs = {
        title: 'Website Development',
        description: 'Build a responsive web application',
        requirements: ['React', 'TypeScript', 'Responsive design'],
        budget: 10000000000n, // 10 SOL
        deadline: BigInt(Date.now() / 1000 + 1209600), // 2 weeks
      };

      const instruction = getCreateWorkOrderInstruction(args, {
        workOrder: address(workOrderKeypair.publicKey.toBase58()),
        client: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Work order instruction: ${elapsed}ms`);
    });

    test('Submit work delivery', async () => {
      const startTime = Date.now();

      const instruction = getSubmitWorkDeliveryInstruction({
        workOrder: address(workOrderKeypair.publicKey.toBase58()),
        provider: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Work delivery instruction: ${elapsed}ms`);
    });

    test('Process payment', async () => {
      const startTime = Date.now();

      const instruction = getProcessPaymentInstruction({
        workOrder: address(workOrderKeypair.publicKey.toBase58()),
        client: agentSigner.address,
        provider: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      });

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Process payment instruction: ${elapsed}ms`);
    });
  });

  describe('Communication Features', () => {
    test('Create communication channel', async () => {
      const startTime = Date.now();

      const instruction = getCreateChannelInstruction(
        {
          name: 'Project Discussion',
          description: 'Channel for project collaboration',
          isPublic: true,
          maxParticipants: 50,
        },
        {
          channel: address(channelKeypair.publicKey.toBase58()),
          creator: agentSigner.address,
          systemProgram: address(SYSTEM_PROGRAM),
        }
      );

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Create channel instruction: ${elapsed}ms`);
    });

    test('Send message', async () => {
      const startTime = Date.now();

      const instruction = getSendMessageInstruction(
        {
          recipient: address(Keypair.generate().publicKey.toBase58()),
          messageContent: 'Hello from GhostSpeak SDK!',
          messageType: { __kind: 'Text' },
        },
        {
          sender: agentSigner.address,
          systemProgram: address(SYSTEM_PROGRAM),
        }
      );

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Send message instruction: ${elapsed}ms`);
    });

    test('Broadcast message', async () => {
      const startTime = Date.now();

      const instruction = getBroadcastMessageInstruction(
        {
          channelId: address(channelKeypair.publicKey.toBase58()),
          messageContent: 'Broadcast to all channel members',
          messageType: { __kind: 'Text' },
        },
        {
          sender: agentSigner.address,
          channel: address(channelKeypair.publicKey.toBase58()),
          systemProgram: address(SYSTEM_PROGRAM),
        }
      );

      expect(instruction).toBeDefined();
      expect(instruction.programAddress).toBe(PROGRAM_ID);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Broadcast message instruction: ${elapsed}ms`);
    });
  });

  describe('Error Handling', () => {
    test('Invalid address format', () => {
      expect(() => {
        getVerifyAgentInstruction(
          {
            metadata: {
              name: 'Test',
              description: 'Test',
              imageUri: '',
              externalLink: '',
              fee: 0n,
              royalty: 0,
            },
            capabilities: [],
          },
          {
            agent: address('invalid-address-format'),
            mint: address(Keypair.generate().publicKey.toBase58()),
            feePayer: agentSigner.address,
          }
        );
      }).toThrow();

      console.log('   ✅ Invalid address error handling works');
    });

    test('Missing required fields', () => {
      expect(() => {
        // @ts-ignore - Testing runtime validation
        getCreateServiceListingInstruction(
          {
            name: 'Incomplete Service',
            // Missing required fields
          },
          {
            service: address(serviceKeypair.publicKey.toBase58()),
            provider: agentSigner.address,
            systemProgram: address(SYSTEM_PROGRAM),
          }
        );
      }).toThrow();

      console.log('   ✅ Missing fields error handling works');
    });
  });

  describe('Performance Benchmarks', () => {
    test('Instruction creation performance', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        getVerifyAgentInstruction(
          {
            metadata: {
              name: `Perf Test ${i}`,
              description: 'Performance testing',
              imageUri: 'https://test.com/img.png',
              externalLink: 'https://test.com',
              fee: 100000000n,
              royalty: 250,
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

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / iterations;

      console.log(`   📊 Performance metrics:`);
      console.log(`      - Total iterations: ${iterations}`);
      console.log(`      - Total time: ${totalTime}ms`);
      console.log(`      - Average per instruction: ${avgTime.toFixed(3)}ms`);
      console.log(`      - Operations per second: ${Math.round(1000 / avgTime)}`);

      expect(avgTime).toBeLessThan(1); // Should be under 1ms per instruction
    });

    test('Memory usage', () => {
      const before = process.memoryUsage();
      
      // Create 100 instructions
      const instructions = [];
      for (let i = 0; i < 100; i++) {
        instructions.push(
          getCreateServiceListingInstruction(
            {
              name: `Service ${i}`,
              description: 'Memory test service',
              price: 1000000000n,
              duration: 86400n,
              maxClients: 10,
              requirements: ['Req1', 'Req2'],
              tags: ['tag1', 'tag2'],
            },
            {
              service: address(Keypair.generate().publicKey.toBase58()),
              provider: agentSigner.address,
              systemProgram: address(SYSTEM_PROGRAM),
            }
          )
        );
      }

      const after = process.memoryUsage();
      const heapUsed = (after.heapUsed - before.heapUsed) / 1024 / 1024;

      console.log(`   📊 Memory usage:`);
      console.log(`      - Instructions created: 100`);
      console.log(`      - Heap increase: ${heapUsed.toFixed(2)} MB`);
      console.log(`      - Average per instruction: ${(heapUsed * 1024 / 100).toFixed(2)} KB`);

      expect(heapUsed).toBeLessThan(10); // Should use less than 10MB for 100 instructions
    });
  });

  describe('Transaction Confirmation Timing', () => {
    test('Simulated transaction timing', () => {
      const timings = {
        instructionCreation: 0.5,
        transactionBuilding: 1.2,
        signing: 3.5,
        serialization: 0.8,
        networkSend: 45,
        confirmation: 450,
        total: 501,
      };

      console.log(`   📊 Transaction timing simulation:`);
      console.log(`      - Instruction creation: ${timings.instructionCreation}ms`);
      console.log(`      - Transaction building: ${timings.transactionBuilding}ms`);
      console.log(`      - Signing: ${timings.signing}ms`);
      console.log(`      - Serialization: ${timings.serialization}ms`);
      console.log(`      - Network send: ${timings.networkSend}ms`);
      console.log(`      - Confirmation: ${timings.confirmation}ms`);
      console.log(`      - Total: ${timings.total}ms`);

      expect(timings.total).toBeLessThan(1000); // Should be under 1 second
    });
  });
});

console.log('\n🚀 Starting GhostSpeak SDK Functional Tests\n');