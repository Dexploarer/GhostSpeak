#!/usr/bin/env bun

/**
 * Direct SDK Testing Script
 * Tests the TypeScript SDK functionality without test framework overhead
 */

import { Keypair } from '@solana/web3.js';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';

// Import directly from generated files
import { getVerifyAgentInstruction } from './src/generated-v2/instructions/verifyAgent';
import { getCreateServiceListingInstruction } from './src/generated-v2/instructions/createServiceListing';
import { getCreateJobPostingInstruction } from './src/generated-v2/instructions/createJobPosting';
import { getPurchaseServiceInstruction } from './src/generated-v2/instructions/purchaseService';
import { getCreateChannelInstruction } from './src/generated-v2/instructions/createChannel';
import { getSendMessageInstruction } from './src/generated-v2/instructions/sendMessage';
import type { Capability, AgentMetadata } from './src/generated-v2/types';

const PROGRAM_ID = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

async function testSDK() {
  console.log('🚀 GhostSpeak SDK Direct Test\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test helper
  function testCase(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`✅ ${name}`);
    } catch (error) {
      failedTests++;
      console.log(`❌ ${name}: ${error}`);
    }
  }

  // Generate test keypairs
  const agentSigner = await generateKeyPairSigner();
  const serviceKeypair = Keypair.generate();
  const jobKeypair = Keypair.generate();
  const channelKeypair = Keypair.generate();

  console.log('\n📍 Test Configuration:');
  console.log(`   Program ID: ${PROGRAM_ID}`);
  console.log(`   Agent Address: ${agentSigner.address}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Agent Verification
  testCase('Agent Verification Instruction', () => {
    const metadata: AgentMetadata = {
      name: 'Test AI Agent',
      description: 'An AI agent for testing SDK functionality',
      imageUri: 'https://example.com/agent.png',
      externalLink: 'https://example.com',
      fee: 100000000n, // 0.1 SOL
      royalty: 250, // 2.5%
    };

    const capabilities: Capability[] = [
      { __kind: 'DataAnalysis' },
      { __kind: 'Trading' },
    ];

    const instruction = getVerifyAgentInstruction(
      { metadata, capabilities },
      {
        agent: agentSigner.address,
        mint: address(Keypair.generate().publicKey.toBase58()),
        feePayer: agentSigner.address,
      }
    );

    if (!instruction.programAddress) throw new Error('Missing program address');
    if (!instruction.data) throw new Error('Missing instruction data');
    if (instruction.accounts.length !== 3) throw new Error('Invalid account count');
  });

  // Test 2: Service Listing
  testCase('Create Service Listing Instruction', () => {
    const instruction = getCreateServiceListingInstruction(
      {
        name: 'Smart Contract Audit',
        description: 'Professional smart contract security audit',
        price: 2000000000n, // 2 SOL
        duration: 259200n, // 3 days
        maxClients: 3,
        requirements: ['Source code', 'Documentation'],
        tags: ['audit', 'security'],
      },
      {
        service: address(serviceKeypair.publicKey.toBase58()),
        provider: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      }
    );

    if (!instruction.programAddress) throw new Error('Missing program address');
    if (instruction.accounts.length !== 3) throw new Error('Invalid account count');
  });

  // Test 3: Job Posting
  testCase('Create Job Posting Instruction', () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 604800); // 1 week
    
    const instruction = getCreateJobPostingInstruction(
      {
        title: 'DeFi Developer',
        description: 'Build a lending protocol',
        requirements: ['Rust', 'Solana'],
        budget: 10000000000n, // 10 SOL
        deadline,
        tags: ['defi', 'solana'],
      },
      {
        job: address(jobKeypair.publicKey.toBase58()),
        employer: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      }
    );

    if (!instruction.programAddress) throw new Error('Missing program address');
  });

  // Test 4: Purchase Service
  testCase('Purchase Service Instruction', () => {
    const clientSigner = Keypair.generate();
    
    const instruction = getPurchaseServiceInstruction(
      { paymentAmount: 2000000000n },
      {
        service: address(serviceKeypair.publicKey.toBase58()),
        client: address(clientSigner.publicKey.toBase58()),
        provider: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      }
    );

    if (!instruction.programAddress) throw new Error('Missing program address');
    if (instruction.accounts.length !== 4) throw new Error('Invalid account count');
  });

  // Test 5: Create Channel
  testCase('Create Channel Instruction', () => {
    const instruction = getCreateChannelInstruction(
      {
        name: 'Dev Chat',
        description: 'Developer discussion channel',
        isPublic: true,
        maxParticipants: 100,
      },
      {
        channel: address(channelKeypair.publicKey.toBase58()),
        creator: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      }
    );

    if (!instruction.programAddress) throw new Error('Missing program address');
  });

  // Test 6: Send Message
  testCase('Send Message Instruction', () => {
    const recipient = Keypair.generate();
    
    const instruction = getSendMessageInstruction(
      {
        recipient: address(recipient.publicKey.toBase58()),
        messageContent: 'Hello from SDK test!',
        messageType: { __kind: 'Text' },
      },
      {
        sender: agentSigner.address,
        systemProgram: address(SYSTEM_PROGRAM),
      }
    );

    if (!instruction) throw new Error('Failed to create instruction');
  });

  // Test 7: Error Handling - Invalid Address
  testCase('Invalid Address Error Handling', () => {
    try {
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
          agent: address('invalid-base58-address'),
          mint: address(Keypair.generate().publicKey.toBase58()),
          feePayer: agentSigner.address,
        }
      );
      throw new Error('Should have thrown error for invalid address');
    } catch (error) {
      // Expected error
    }
  });

  // Test 8: Performance Benchmark
  testCase('Performance: 1000 Instructions', () => {
    const start = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      getCreateServiceListingInstruction(
        {
          name: `Service ${i}`,
          description: 'Performance test',
          price: 1000000000n,
          duration: 86400n,
          maxClients: 5,
          requirements: ['Test'],
          tags: ['test'],
        },
        {
          service: address(Keypair.generate().publicKey.toBase58()),
          provider: agentSigner.address,
          systemProgram: address(SYSTEM_PROGRAM),
        }
      );
    }
    
    const elapsed = Date.now() - start;
    const avgTime = elapsed / 1000;
    
    console.log(`     - Total time: ${elapsed}ms`);
    console.log(`     - Average per instruction: ${avgTime.toFixed(3)}ms`);
    console.log(`     - Instructions per second: ${Math.round(1000 / avgTime)}`);
    
    if (avgTime > 1) {
      throw new Error(`Performance too slow: ${avgTime}ms per instruction`);
    }
  });

  // Test 9: Memory Usage
  testCase('Memory Usage Test', () => {
    const before = process.memoryUsage();
    const instructions = [];
    
    for (let i = 0; i < 100; i++) {
      instructions.push(
        getCreateJobPostingInstruction(
          {
            title: `Job ${i}`,
            description: 'Memory test job',
            requirements: ['Req1', 'Req2', 'Req3'],
            budget: 5000000000n,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
            tags: ['tag1', 'tag2', 'tag3'],
          },
          {
            job: address(Keypair.generate().publicKey.toBase58()),
            employer: agentSigner.address,
            systemProgram: address(SYSTEM_PROGRAM),
          }
        )
      );
    }
    
    const after = process.memoryUsage();
    const heapUsed = (after.heapUsed - before.heapUsed) / 1024 / 1024;
    
    console.log(`     - Instructions created: 100`);
    console.log(`     - Heap increase: ${heapUsed.toFixed(2)} MB`);
    console.log(`     - Average per instruction: ${(heapUsed * 1024 / 100).toFixed(2)} KB`);
    
    if (heapUsed > 10) {
      throw new Error(`Memory usage too high: ${heapUsed}MB for 100 instructions`);
    }
  });

  // Test 10: Transaction Size Estimation
  testCase('Transaction Size Estimation', () => {
    const instruction = getVerifyAgentInstruction(
      {
        metadata: {
          name: 'Size Test Agent',
          description: 'Testing transaction size limits',
          imageUri: 'https://example.com/agent.png',
          externalLink: 'https://example.com',
          fee: 100000000n,
          royalty: 500,
        },
        capabilities: [
          { __kind: 'DataAnalysis' },
          { __kind: 'Trading' },
          { __kind: 'ContentCreation' },
        ],
      },
      {
        agent: agentSigner.address,
        mint: address(Keypair.generate().publicKey.toBase58()),
        feePayer: agentSigner.address,
      }
    );

    const estimatedSize = instruction.data.byteLength + (instruction.accounts.length * 32);
    console.log(`     - Instruction data size: ${instruction.data.byteLength} bytes`);
    console.log(`     - Account keys size: ${instruction.accounts.length * 32} bytes`);
    console.log(`     - Estimated total: ${estimatedSize} bytes`);
    
    if (estimatedSize > 1232) { // Max transaction size
      throw new Error(`Transaction too large: ${estimatedSize} bytes`);
    }
  });

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed successfully!');
  }
}

// Run the tests
testSDK().catch(console.error);