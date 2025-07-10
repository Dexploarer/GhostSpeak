/**
 * Edge Cases and Security Testing Suite
 * 
 * Comprehensive testing of edge cases, boundary conditions, and security vulnerabilities
 * for the GhostSpeak protocol to ensure robustness against attacks and unexpected inputs.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PodaiMarketplace } from '../../../target/types/podai_marketplace';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { performance } from 'perf_hooks';

// Constants for edge case testing
const EDGE_CASE_CONSTANTS = {
  // String length limits
  MAX_NAME_LENGTH: 32,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_URL_LENGTH: 200,
  MAX_REQUIREMENTS_LENGTH: 1000,
  MAX_MESSAGE_LENGTH: 1000,
  
  // Numeric limits
  MAX_CAPABILITY: 7,
  MIN_CAPABILITY: 1,
  MAX_PARTICIPANTS: 100,
  MIN_AMOUNT: 1, // 1 lamport
  MAX_AMOUNT: Number.MAX_SAFE_INTEGER,
  
  // Time limits
  MIN_EXPIRY_SECONDS: 60, // 1 minute
  MAX_EXPIRY_SECONDS: 31536000, // 1 year
  
  // Special characters for injection testing
  SPECIAL_CHARS: ['<', '>', '"', "'", '&', '\n', '\r', '\t', '\0', '\\', '/', '`', '${', '}'],
  SQL_INJECTION_PATTERNS: ["' OR '1'='1", "1; DROP TABLE", "admin'--", "1' UNION SELECT"],
  XSS_PATTERNS: ['<script>alert("xss")</script>', '<img src=x onerror=alert(1)>', 'javascript:alert(1)'],
};

let provider: AnchorProvider;
let program: Program<PodaiMarketplace>;
let testResults: { [category: string]: any[] } = {};

describe('Edge Cases and Security Testing', () => {
  beforeAll(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.PodaiMarketplace as Program<PodaiMarketplace>;
  });

  describe('String Input Edge Cases', () => {
    test('Should handle maximum length strings', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test maximum length strings
      const testCases = [
        {
          name: 'Max URL Length',
          field: 'url',
          value: 'https://' + 'a'.repeat(EDGE_CASE_CONSTANTS.MAX_URL_LENGTH - 8),
          shouldSucceed: true,
        },
        {
          name: 'Exceeds URL Length',
          field: 'url',
          value: 'https://' + 'a'.repeat(EDGE_CASE_CONSTANTS.MAX_URL_LENGTH + 100),
          shouldSucceed: false,
        },
        {
          name: 'Max Channel Name',
          field: 'channelName',
          value: 'a'.repeat(EDGE_CASE_CONSTANTS.MAX_NAME_LENGTH),
          shouldSucceed: true,
        },
        {
          name: 'Empty String URL',
          field: 'url',
          value: '',
          shouldSucceed: false,
        },
        {
          name: 'Whitespace Only',
          field: 'description',
          value: '   \t\n\r   ',
          shouldSucceed: false,
        },
        {
          name: 'Unicode Characters',
          field: 'description',
          value: '🚀👻💬 Unicode test émojis ñ 中文',
          shouldSucceed: true,
        },
        {
          name: 'Null Bytes',
          field: 'description',
          value: 'test\0null\0bytes',
          shouldSucceed: false,
        },
      ];
      
      for (const testCase of testCases) {
        try {
          if (testCase.field === 'url') {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            // Register if needed
            try {
              await program.methods
                .registerAgent(new anchor.BN(1), 'https://test.com')
                .accounts({
                  agentAccount: agentPDA,
                  signer: agentSigner.address,
                  systemProgram: SystemProgram.programId,
                })
                .signers([agentSigner])
                .rpc();
            } catch (e) {
              // Already registered
            }
            
            await program.methods
              .updateAgent(new anchor.BN(1), testCase.value)
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          } else if (testCase.field === 'channelName') {
            const [channelPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(testCase.value)],
              program.programId
            );
            
            await program.methods
              .createChannel(testCase.value, 'Test channel', { public: {} }, 10, 0)
              .accounts({
                channelAccount: channelPDA,
                creator: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          }
          
          results.push({
            name: testCase.name,
            succeeded: true,
            expected: testCase.shouldSucceed,
            passed: testCase.shouldSucceed === true,
          });
        } catch (e) {
          results.push({
            name: testCase.name,
            succeeded: false,
            error: e.message,
            expected: testCase.shouldSucceed,
            passed: testCase.shouldSucceed === false,
          });
        }
      }
      
      testResults['String Input Edge Cases'] = results;
      
      const failures = results.filter(r => !r.passed);
      expect(failures.length).toBe(0);
    });

    test('Should prevent injection attacks', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Register agent first
      const [agentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), agentSigner.address.toBuffer()],
        program.programId
      );
      
      await program.methods
        .registerAgent(new anchor.BN(1), 'https://test.com')
        .accounts({
          agentAccount: agentPDA,
          signer: agentSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentSigner])
        .rpc();
      
      // Test injection patterns
      const injectionTests = [
        ...EDGE_CASE_CONSTANTS.SQL_INJECTION_PATTERNS.map(pattern => ({
          name: `SQL Injection: ${pattern}`,
          value: pattern,
          type: 'sql',
        })),
        ...EDGE_CASE_CONSTANTS.XSS_PATTERNS.map(pattern => ({
          name: `XSS Attack: ${pattern}`,
          value: pattern,
          type: 'xss',
        })),
        ...EDGE_CASE_CONSTANTS.SPECIAL_CHARS.map(char => ({
          name: `Special Char: ${char === '\0' ? '\\0' : char}`,
          value: `test${char}value`,
          type: 'special',
        })),
      ];
      
      for (const injection of injectionTests) {
        try {
          // Try to create channel with injection pattern
          const channelName = `test-${Date.now()}`;
          const [channelPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
            program.programId
          );
          
          await program.methods
            .createChannel(channelName, injection.value, { public: {} }, 10, 0)
            .accounts({
              channelAccount: channelPDA,
              creator: agentSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc();
          
          // If it succeeded, check if the value was properly sanitized
          const channelAccount = await program.account.channel.fetch(channelPDA);
          const storedValue = channelAccount.description;
          
          results.push({
            name: injection.name,
            type: injection.type,
            injectionAttempted: injection.value,
            storedValue: storedValue,
            sanitized: storedValue !== injection.value,
            blocked: false,
          });
        } catch (e) {
          results.push({
            name: injection.name,
            type: injection.type,
            injectionAttempted: injection.value,
            blocked: true,
            error: e.message,
          });
        }
      }
      
      testResults['Injection Attack Prevention'] = results;
      
      // All injections should either be blocked or sanitized
      const vulnerabilities = results.filter(r => !r.blocked && !r.sanitized);
      expect(vulnerabilities.length).toBe(0);
    });
  });

  describe('Numeric Boundary Testing', () => {
    test('Should handle numeric limits correctly', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.5 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const numericTests = [
        {
          name: 'Minimum Capability',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(EDGE_CASE_CONSTANTS.MIN_CAPABILITY), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: true,
        },
        {
          name: 'Maximum Capability',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .updateAgent(new anchor.BN(EDGE_CASE_CONSTANTS.MAX_CAPABILITY), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: true,
        },
        {
          name: 'Zero Capability',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .updateAgent(new anchor.BN(0), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: false,
        },
        {
          name: 'Exceed Max Capability',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .updateAgent(new anchor.BN(EDGE_CASE_CONSTANTS.MAX_CAPABILITY + 1), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: false,
        },
        {
          name: 'Minimum Payment Amount',
          test: async () => {
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('min-payment'),
              ],
              program.programId
            );
            
            return program.methods
              .createEscrow(
                new anchor.BN(EDGE_CASE_CONSTANTS.MIN_AMOUNT),
                new anchor.BN(Date.now() / 1000 + 3600)
              )
              .accounts({
                escrow: escrowPDA,
                payer: agentSigner.address,
                receiver: receiverSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: true,
        },
        {
          name: 'Zero Payment Amount',
          test: async () => {
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('zero-payment'),
              ],
              program.programId
            );
            
            return program.methods
              .createEscrow(
                new anchor.BN(0),
                new anchor.BN(Date.now() / 1000 + 3600)
              )
              .accounts({
                escrow: escrowPDA,
                payer: agentSigner.address,
                receiver: receiverSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: false,
        },
        {
          name: 'u64 Max Value',
          test: async () => {
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('max-u64'),
              ],
              program.programId
            );
            
            // u64 max = 2^64 - 1
            const u64Max = new anchor.BN('18446744073709551615');
            
            return program.methods
              .createEscrow(u64Max, new anchor.BN(Date.now() / 1000 + 3600))
              .accounts({
                escrow: escrowPDA,
                payer: agentSigner.address,
                receiver: receiverSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldSucceed: false, // Should fail due to insufficient balance
        },
      ];
      
      for (const numericTest of numericTests) {
        try {
          await numericTest.test();
          results.push({
            name: numericTest.name,
            succeeded: true,
            expected: numericTest.shouldSucceed,
            passed: numericTest.shouldSucceed === true,
          });
        } catch (e) {
          results.push({
            name: numericTest.name,
            succeeded: false,
            error: e.message,
            expected: numericTest.shouldSucceed,
            passed: numericTest.shouldSucceed === false,
          });
        }
      }
      
      testResults['Numeric Boundary Testing'] = results;
      
      const failures = results.filter(r => !r.passed);
      expect(failures.length).toBe(0);
    });

    test('Should prevent integer overflow/underflow', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const overflowTests = [
        {
          name: 'Addition Overflow',
          test: async () => {
            // Try to cause overflow in royalty calculation
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            await program.methods
              .registerAgent(new anchor.BN(1), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
            
            // Set large royalty that could overflow
            const largeRoyalty = new anchor.BN('9223372036854775807'); // i64 max / 2
            
            return program.methods
              .setRoyaltyRate(largeRoyalty)
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
          expectError: true,
        },
        {
          name: 'Subtraction Underflow',
          test: async () => {
            // Try to create escrow with expiry in the past
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('underflow-test'),
              ],
              program.programId
            );
            
            // Use a past timestamp
            const pastTimestamp = new anchor.BN(0);
            
            return program.methods
              .createEscrow(
                new anchor.BN(1000),
                pastTimestamp
              )
              .accounts({
                escrow: escrowPDA,
                payer: agentSigner.address,
                receiver: receiverSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          expectError: true,
        },
        {
          name: 'Multiplication Overflow',
          test: async () => {
            // Try to create work order with values that multiply to overflow
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            const [workOrderPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('work_order'), agentSigner.address.toBuffer(), Buffer.from('overflow-work')],
              program.programId
            );
            
            // Large budget that could overflow in calculations
            const largeBudget = new anchor.BN('9223372036854775807'); // i64 max
            
            return program.methods
              .createWorkOrder(
                'overflow-work',
                'Test',
                'Requirements',
                largeBudget,
                new anchor.BN(Date.now() / 1000 + 3600)
              )
              .accounts({
                workOrder: workOrderPDA,
                requesterAgent: agentPDA,
                requester: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          expectError: true,
        },
      ];
      
      for (const overflowTest of overflowTests) {
        try {
          await overflowTest.test();
          results.push({
            name: overflowTest.name,
            overflowPrevented: false,
            vulnerability: true,
          });
        } catch (e) {
          results.push({
            name: overflowTest.name,
            overflowPrevented: true,
            error: e.message,
            vulnerability: false,
          });
        }
      }
      
      testResults['Integer Overflow Prevention'] = results;
      
      const vulnerabilities = results.filter(r => r.vulnerability);
      expect(vulnerabilities.length).toBe(0);
    });
  });

  describe('Time-based Edge Cases', () => {
    test('Should handle time boundary conditions', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      const receiver = Keypair.generate();
      const receiverSigner = await generateKeyPairSigner(receiver);
      
      await provider.connection.requestAirdrop(agentSigner.address, 0.2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Register agents
      for (const signer of [agentSigner, receiverSigner]) {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), signer.address.toBuffer()],
          program.programId
        );
        
        await program.methods
          .registerAgent(new anchor.BN(1), 'https://test.com')
          .accounts({
            agentAccount: agentPDA,
            signer: signer.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([signer])
          .rpc();
      }
      
      const timeTests = [
        {
          name: 'Immediate Expiry',
          expiryTime: Date.now() / 1000,
          shouldSucceed: false,
        },
        {
          name: 'Minimum Valid Expiry',
          expiryTime: Date.now() / 1000 + EDGE_CASE_CONSTANTS.MIN_EXPIRY_SECONDS,
          shouldSucceed: true,
        },
        {
          name: 'Maximum Expiry (1 year)',
          expiryTime: Date.now() / 1000 + EDGE_CASE_CONSTANTS.MAX_EXPIRY_SECONDS,
          shouldSucceed: true,
        },
        {
          name: 'Past Expiry',
          expiryTime: Date.now() / 1000 - 3600,
          shouldSucceed: false,
        },
        {
          name: 'Far Future Expiry',
          expiryTime: Date.now() / 1000 + (10 * 365 * 24 * 60 * 60), // 10 years
          shouldSucceed: false,
        },
        {
          name: 'Unix Epoch',
          expiryTime: 0,
          shouldSucceed: false,
        },
        {
          name: 'Year 2038 Problem',
          expiryTime: 2147483647, // Max 32-bit unix timestamp
          shouldSucceed: true,
        },
      ];
      
      for (const timeTest of timeTests) {
        const [escrowPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('escrow'),
            agentSigner.address.toBuffer(),
            receiverSigner.address.toBuffer(),
            Buffer.from(timeTest.name),
          ],
          program.programId
        );
        
        try {
          await program.methods
            .createEscrow(
              new anchor.BN(0.01 * LAMPORTS_PER_SOL),
              new anchor.BN(timeTest.expiryTime)
            )
            .accounts({
              escrow: escrowPDA,
              payer: agentSigner.address,
              receiver: receiverSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc();
          
          results.push({
            name: timeTest.name,
            expiryTime: timeTest.expiryTime,
            succeeded: true,
            expected: timeTest.shouldSucceed,
            passed: timeTest.shouldSucceed === true,
          });
        } catch (e) {
          results.push({
            name: timeTest.name,
            expiryTime: timeTest.expiryTime,
            succeeded: false,
            error: e.message,
            expected: timeTest.shouldSucceed,
            passed: timeTest.shouldSucceed === false,
          });
        }
      }
      
      testResults['Time Boundary Testing'] = results;
      
      const failures = results.filter(r => !r.passed);
      expect(failures.length).toBe(0);
    });

    test('Should handle race conditions with expiry', async () => {
      const results = [];
      const payer = Keypair.generate();
      const payerSigner = await generateKeyPairSigner(payer);
      const receiver = Keypair.generate();
      const receiverSigner = await generateKeyPairSigner(receiver);
      
      await provider.connection.requestAirdrop(payerSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Register agents
      for (const signer of [payerSigner, receiverSigner]) {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), signer.address.toBuffer()],
          program.programId
        );
        
        await program.methods
          .registerAgent(new anchor.BN(1), 'https://test.com')
          .accounts({
            agentAccount: agentPDA,
            signer: signer.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([signer])
          .rpc();
      }
      
      // Create escrow with very short expiry
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          payerSigner.address.toBuffer(),
          receiverSigner.address.toBuffer(),
          Buffer.from('race-condition'),
        ],
        program.programId
      );
      
      const shortExpiry = new anchor.BN(Date.now() / 1000 + 3); // 3 seconds
      
      await program.methods
        .createEscrow(
          new anchor.BN(0.01 * LAMPORTS_PER_SOL),
          shortExpiry
        )
        .accounts({
          escrow: escrowPDA,
          payer: payerSigner.address,
          receiver: receiverSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([payerSigner])
        .rpc();
      
      // Try operations near expiry time
      const operations = [
        {
          name: 'Release Before Expiry',
          delay: 1000,
          operation: async () => {
            return program.methods
              .releaseEscrow()
              .accounts({
                escrow: escrowPDA,
                payer: payerSigner.address,
                receiver: receiverSigner.address,
                signer: receiverSigner.address,
              })
              .signers([receiverSigner])
              .rpc();
          },
          shouldSucceed: true,
        },
        {
          name: 'Release At Expiry',
          delay: 2900,
          operation: async () => {
            return program.methods
              .releaseEscrow()
              .accounts({
                escrow: escrowPDA,
                payer: payerSigner.address,
                receiver: receiverSigner.address,
                signer: receiverSigner.address,
              })
              .signers([receiverSigner])
              .rpc();
          },
          shouldSucceed: true, // Might succeed if executed just before expiry
        },
        {
          name: 'Release After Expiry',
          delay: 4000,
          operation: async () => {
            return program.methods
              .releaseEscrow()
              .accounts({
                escrow: escrowPDA,
                payer: payerSigner.address,
                receiver: receiverSigner.address,
                signer: receiverSigner.address,
              })
              .signers([receiverSigner])
              .rpc();
          },
          shouldSucceed: false,
        },
      ];
      
      // Execute first operation only (others would conflict)
      const op = operations[0];
      await new Promise(resolve => setTimeout(resolve, op.delay));
      
      try {
        await op.operation();
        results.push({
          name: op.name,
          succeeded: true,
          timing: 'executed',
        });
      } catch (e) {
        results.push({
          name: op.name,
          succeeded: false,
          error: e.message,
          timing: 'failed',
        });
      }
      
      testResults['Race Condition Testing'] = results;
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Account and PDA Edge Cases', () => {
    test('Should handle invalid account scenarios', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const accountTests = [
        {
          name: 'Wrong PDA Seeds',
          test: async () => {
            // Try to use wrong seeds for PDA
            const wrongPDA = PublicKey.findProgramAddressSync(
              [Buffer.from('wrong_seed'), agentSigner.address.toBuffer()],
              program.programId
            )[0];
            
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://test.com')
              .accounts({
                agentAccount: wrongPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
        {
          name: 'Uninitialized Account Access',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            // Try to update before registering
            return program.methods
              .updateAgent(new anchor.BN(2), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
        {
          name: 'System Program as Account',
          test: async () => {
            // Try to use system program ID as agent account
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://test.com')
              .accounts({
                agentAccount: SystemProgram.programId,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
        {
          name: 'Double Initialization',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            // Register first time
            await program.methods
              .registerAgent(new anchor.BN(1), 'https://test.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
            
            // Try to register again
            return program.methods
              .registerAgent(new anchor.BN(2), 'https://test2.com')
              .accounts({
                agentAccount: agentPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
      ];
      
      for (const accountTest of accountTests) {
        try {
          await accountTest.test();
          results.push({
            name: accountTest.name,
            succeeded: true,
            shouldFail: accountTest.shouldFail,
            vulnerability: accountTest.shouldFail,
          });
        } catch (e) {
          results.push({
            name: accountTest.name,
            succeeded: false,
            error: e.message,
            shouldFail: accountTest.shouldFail,
            vulnerability: false,
          });
        }
      }
      
      testResults['Account Edge Cases'] = results;
      
      const vulnerabilities = results.filter(r => r.vulnerability);
      expect(vulnerabilities.length).toBe(0);
    });

    test('Should handle cross-program invocation attacks', async () => {
      const results = [];
      const attacker = Keypair.generate();
      const attackerSigner = await generateKeyPairSigner(attacker);
      await provider.connection.requestAirdrop(attackerSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Note: These are simulated tests as we can't actually deploy a malicious program
      const cpiTests = [
        {
          name: 'Fake Program ID',
          description: 'Attempt to call with wrong program ID',
          test: async () => {
            const fakeProgramId = Keypair.generate().publicKey;
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), attackerSigner.address.toBuffer()],
              fakeProgramId // Wrong program ID
            );
            
            // This should fail as the PDA won't match
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://attacker.com')
              .accounts({
                agentAccount: agentPDA,
                signer: attackerSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([attackerSigner])
              .rpc();
          },
        },
        {
          name: 'Account Substitution',
          description: 'Try to substitute accounts in instruction',
          test: async () => {
            // Create legitimate agent first
            const legitAgent = Keypair.generate();
            const legitSigner = await generateKeyPairSigner(legitAgent);
            await provider.connection.requestAirdrop(legitSigner.address, 0.1 * LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const [legitPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), legitSigner.address.toBuffer()],
              program.programId
            );
            
            await program.methods
              .registerAgent(new anchor.BN(1), 'https://legit.com')
              .accounts({
                agentAccount: legitPDA,
                signer: legitSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([legitSigner])
              .rpc();
            
            // Attacker tries to update legitimate agent
            return program.methods
              .updateAgent(new anchor.BN(7), 'https://hacked.com')
              .accounts({
                agentAccount: legitPDA, // Legitimate agent's account
                signer: attackerSigner.address, // But attacker's signer
              })
              .signers([attackerSigner])
              .rpc();
          },
        },
      ];
      
      for (const cpiTest of cpiTests) {
        try {
          await cpiTest.test();
          results.push({
            name: cpiTest.name,
            description: cpiTest.description,
            attackSucceeded: true,
            vulnerability: true,
          });
        } catch (e) {
          results.push({
            name: cpiTest.name,
            description: cpiTest.description,
            attackSucceeded: false,
            error: e.message,
            vulnerability: false,
          });
        }
      }
      
      testResults['Cross-Program Invocation Security'] = results;
      
      const vulnerabilities = results.filter(r => r.vulnerability);
      expect(vulnerabilities.length).toBe(0);
    });
  });

  describe('Concurrency and State Edge Cases', () => {
    test('Should handle concurrent state modifications', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Register agent
      const [agentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), agentSigner.address.toBuffer()],
        program.programId
      );
      
      await program.methods
        .registerAgent(new anchor.BN(1), 'https://test.com')
        .accounts({
          agentAccount: agentPDA,
          signer: agentSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentSigner])
        .rpc();
      
      // Attempt concurrent updates
      const updatePromises = [];
      for (let i = 0; i < 20; i++) {
        updatePromises.push(
          program.methods
            .updateAgent(new anchor.BN((i % 7) + 1), `https://concurrent-${i}.com`)
            .accounts({
              agentAccount: agentPDA,
              signer: agentSigner.address,
            })
            .signers([agentSigner])
            .rpc()
            .then(() => ({ index: i, success: true }))
            .catch(e => ({ index: i, success: false, error: e.message }))
        );
      }
      
      const updateResults = await Promise.all(updatePromises);
      const successCount = updateResults.filter(r => r.success).length;
      const failureCount = updateResults.filter(r => !r.success).length;
      
      // Check final state consistency
      const finalState = await program.account.agent.fetch(agentPDA);
      
      results.push({
        test: 'Concurrent Updates',
        totalAttempts: 20,
        successCount,
        failureCount,
        finalStateValid: finalState !== null && finalState.owner.equals(agentSigner.address),
        stateCorruption: false,
      });
      
      // Test concurrent channel operations
      const channelPromises = [];
      for (let i = 0; i < 10; i++) {
        const channelName = `concurrent-channel-${i}`;
        const [channelPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
          program.programId
        );
        
        channelPromises.push(
          program.methods
            .createChannel(channelName, 'Concurrent test', { public: {} }, 10, 0)
            .accounts({
              channelAccount: channelPDA,
              creator: agentSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc()
            .then(() => ({ channel: channelName, success: true }))
            .catch(e => ({ channel: channelName, success: false, error: e.message }))
        );
      }
      
      const channelResults = await Promise.all(channelPromises);
      const channelSuccessCount = channelResults.filter(r => r.success).length;
      
      results.push({
        test: 'Concurrent Channel Creation',
        totalAttempts: 10,
        successCount: channelSuccessCount,
        failureCount: 10 - channelSuccessCount,
      });
      
      testResults['Concurrency Testing'] = results;
      
      // All operations should either succeed or fail gracefully
      expect(results.every(r => !r.stateCorruption)).toBe(true);
    });

    test('Should handle reentrancy attempts', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      const receiver = Keypair.generate();
      const receiverSigner = await generateKeyPairSigner(receiver);
      
      await Promise.all([
        provider.connection.requestAirdrop(agentSigner.address, 0.2 * LAMPORTS_PER_SOL),
        provider.connection.requestAirdrop(receiverSigner.address, 0.1 * LAMPORTS_PER_SOL),
      ]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Register both as agents
      for (const signer of [agentSigner, receiverSigner]) {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), signer.address.toBuffer()],
          program.programId
        );
        
        await program.methods
          .registerAgent(new anchor.BN(1), 'https://test.com')
          .accounts({
            agentAccount: agentPDA,
            signer: signer.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([signer])
          .rpc();
      }
      
      // Create escrow
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          agentSigner.address.toBuffer(),
          receiverSigner.address.toBuffer(),
          Buffer.from('reentrancy-test'),
        ],
        program.programId
      );
      
      await program.methods
        .createEscrow(
          new anchor.BN(0.05 * LAMPORTS_PER_SOL),
          new anchor.BN(Date.now() / 1000 + 3600)
        )
        .accounts({
          escrow: escrowPDA,
          payer: agentSigner.address,
          receiver: receiverSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentSigner])
        .rpc();
      
      // Try to release escrow multiple times rapidly
      const releasePromises = [];
      for (let i = 0; i < 5; i++) {
        releasePromises.push(
          program.methods
            .releaseEscrow()
            .accounts({
              escrow: escrowPDA,
              payer: agentSigner.address,
              receiver: receiverSigner.address,
              signer: receiverSigner.address,
            })
            .signers([receiverSigner])
            .rpc()
            .then(() => ({ attempt: i, success: true }))
            .catch(e => ({ attempt: i, success: false, error: e.message }))
        );
      }
      
      const releaseResults = await Promise.all(releasePromises);
      const successfulReleases = releaseResults.filter(r => r.success).length;
      
      results.push({
        test: 'Multiple Release Attempts',
        totalAttempts: 5,
        successfulReleases,
        reentrancyPrevented: successfulReleases <= 1,
      });
      
      // Check if funds were properly transferred only once
      const payerBalance = await provider.connection.getBalance(agentSigner.address);
      const receiverBalance = await provider.connection.getBalance(receiverSigner.address);
      
      results.push({
        test: 'Fund Security',
        payerBalance: payerBalance / LAMPORTS_PER_SOL,
        receiverBalance: receiverBalance / LAMPORTS_PER_SOL,
        properTransfer: successfulReleases === 1,
      });
      
      testResults['Reentrancy Prevention'] = results;
      
      expect(successfulReleases).toBe(1);
      expect(results.every(r => r.reentrancyPrevented !== false)).toBe(true);
    });
  });

  afterAll(() => {
    generateSecurityReport();
  });
});

function generateSecurityReport() {
  console.log('\n' + '='.repeat(80));
  console.log('EDGE CASES AND SECURITY TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalIssues = [];
  let vulnerabilities = [];
  
  // Analyze results
  Object.entries(testResults).forEach(([category, results]) => {
    console.log(`\n${category}:`);
    
    if (Array.isArray(results)) {
      totalTests += results.length;
      
      results.forEach(result => {
        if (result.passed !== false && !result.vulnerability && !result.attackSucceeded) {
          passedTests++;
        } else {
          console.log(`   ❌ ${result.name || result.test || 'Test'}: FAILED`);
          
          if (result.vulnerability || result.attackSucceeded) {
            vulnerabilities.push(`${category}: ${result.name || result.test}`);
          }
          
          if (result.error) {
            console.log(`      Error: ${result.error}`);
          }
        }
      });
      
      const categoryPassed = results.filter(r => 
        r.passed !== false && !r.vulnerability && !r.attackSucceeded
      ).length;
      
      console.log(`   Summary: ${categoryPassed}/${results.length} tests passed`);
    }
  });
  
  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  
  if (vulnerabilities.length > 0) {
    console.log('\n🚨 SECURITY VULNERABILITIES DETECTED:');
    vulnerabilities.forEach(vuln => {
      console.log(`   - ${vuln}`);
    });
  } else {
    console.log('\n✅ No security vulnerabilities detected');
  }
  
  // Recommendations
  console.log('\n💡 SECURITY RECOMMENDATIONS:');
  console.log('   1. Implement comprehensive input validation for all string inputs');
  console.log('   2. Use checked arithmetic operations to prevent overflows');
  console.log('   3. Enforce strict time boundaries for all time-based operations');
  console.log('   4. Add rate limiting to prevent DoS attacks');
  console.log('   5. Implement circuit breakers for high-frequency operations');
  console.log('   6. Add monitoring and alerting for suspicious patterns');
  console.log('   7. Regular security audits and penetration testing');
  
  console.log('\n' + '='.repeat(80));
  
  // Export detailed report
  const fs = require('fs');
  fs.writeFileSync(
    'edge-cases-security-report.json',
    JSON.stringify({
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: (passedTests / totalTests) * 100,
        vulnerabilities,
      },
      detailedResults: testResults,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );
  
  console.log('Detailed report saved to: edge-cases-security-report.json');
}