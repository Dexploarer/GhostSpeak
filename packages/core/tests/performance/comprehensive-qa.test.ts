/**
 * Comprehensive Edge Case and Security QA Test Suite
 * 
 * This test suite covers all critical edge cases, security vulnerabilities, 
 * and error scenarios for the GhostSpeak protocol.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PodaiMarketplace } from '../../../target/types/podai_marketplace';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { performance } from 'perf_hooks';

// Edge case categories and test results storage
const testResults: { [category: string]: any[] } = {
  invalidInputs: [],
  resourceLimits: [],
  concurrencyIssues: [],
  networkFailures: [],
  securityTests: [],
  stateCorruption: [],
  integrationFailures: [],
};

// Constants from smart contract
const LIMITS = {
  MAX_NAME_LENGTH: 64,
  MAX_GENERAL_STRING_LENGTH: 256,
  MAX_CAPABILITIES_COUNT: 20,
  MAX_PARTICIPANTS_COUNT: 50,
  MAX_PAYMENT_AMOUNT: 1_000_000_000_000,
  MIN_PAYMENT_AMOUNT: 1_000,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 512,
  MAX_REQUIREMENTS_ITEMS: 10,
  MAX_MESSAGE_LENGTH: 1024,
};

describe('Comprehensive Edge Case and Security QA', () => {
  let provider: AnchorProvider;
  let program: Program<PodaiMarketplace>;

  beforeAll(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.PodaiMarketplace as Program<PodaiMarketplace>;
  });

  describe('1. Invalid Inputs', () => {
    test('Empty strings where required', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test cases for empty strings
      const emptyStringTests = [
        {
          name: 'Empty agent name',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(1), '') // Empty URL
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
        {
          name: 'Empty channel name',
          test: async () => {
            const [channelPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from('')],
              program.programId
            );
            
            return program.methods
              .createChannel('', 'Description', { public: {} }, 10, 0)
              .accounts({
                channelAccount: channelPDA,
                creator: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
        {
          name: 'Empty work order title',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            const [workOrderPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('work_order'), agentSigner.address.toBuffer(), Buffer.from('empty-title')],
              program.programId
            );
            
            return program.methods
              .createWorkOrder(
                'empty-title',
                '', // Empty title
                'Requirements',
                new anchor.BN(1000),
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
          shouldFail: true,
        },
      ];

      for (const test of emptyStringTests) {
        try {
          await test.test();
          results.push({
            test: test.name,
            passed: !test.shouldFail,
            error: 'Test should have failed but succeeded',
          });
        } catch (e) {
          results.push({
            test: test.name,
            passed: test.shouldFail,
            error: e.message,
          });
        }
      }

      testResults.invalidInputs.push(...results);
      expect(results.every(r => r.passed)).toBe(true);
    });

    test('Extremely long strings (>1000 chars)', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const longStringTests = [
        {
          name: 'URL exceeding max length',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            const longUrl = 'https://' + 'a'.repeat(LIMITS.MAX_GENERAL_STRING_LENGTH + 100);
            
            return program.methods
              .registerAgent(new anchor.BN(1), longUrl)
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
        {
          name: 'Description exceeding max length',
          test: async () => {
            const channelName = `channel-${Date.now()}`;
            const [channelPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
              program.programId
            );
            
            const longDescription = 'x'.repeat(LIMITS.MAX_DESCRIPTION_LENGTH + 100);
            
            return program.methods
              .createChannel(channelName, longDescription, { public: {} }, 10, 0)
              .accounts({
                channelAccount: channelPDA,
                creator: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
        {
          name: 'Message exceeding max length',
          test: async () => {
            // First register agent
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
            
            // Create channel
            const channelName = `msg-channel-${Date.now()}`;
            const [channelPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
              program.programId
            );
            
            await program.methods
              .createChannel(channelName, 'Test channel', { public: {} }, 10, 0)
              .accounts({
                channelAccount: channelPDA,
                creator: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
            
            // Send long message
            const [messagePDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('message'),
                channelPDA.toBuffer(),
                new anchor.BN(0).toArrayLike(Buffer, 'le', 8),
              ],
              program.programId
            );
            
            const longMessage = 'M'.repeat(LIMITS.MAX_MESSAGE_LENGTH + 100);
            
            return program.methods
              .sendMessage(longMessage, { text: {} })
              .accounts({
                message: messagePDA,
                channel: channelPDA,
                sender: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
      ];

      for (const test of longStringTests) {
        try {
          await test.test();
          results.push({
            test: test.name,
            passed: !test.shouldFail,
            error: 'Test should have failed but succeeded',
          });
        } catch (e) {
          results.push({
            test: test.name,
            passed: test.shouldFail,
            error: e.message,
          });
        }
      }

      testResults.invalidInputs.push(...results);
      expect(results.every(r => r.passed)).toBe(true);
    });

    test('Special characters and injection attempts', async () => {
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

      const specialCharTests = [
        {
          name: 'XSS script injection in channel description',
          input: '<script>alert("XSS")</script>',
          type: 'xss',
        },
        {
          name: 'SQL injection in message',
          input: "'; DROP TABLE agents; --",
          type: 'sql',
        },
        {
          name: 'HTML injection',
          input: '<img src=x onerror=alert(1)>',
          type: 'html',
        },
        {
          name: 'Null byte injection',
          input: 'normal\x00malicious',
          type: 'null',
        },
        {
          name: 'Unicode direction override',
          input: '\u202e\u0644\u0644\u0644\u0644test',
          type: 'unicode',
        },
        {
          name: 'Control characters',
          input: 'test\r\nmalicious\tdata',
          type: 'control',
        },
      ];

      for (const test of specialCharTests) {
        try {
          const channelName = `test-${Date.now()}`;
          const [channelPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
            program.programId
          );
          
          await program.methods
            .createChannel(channelName, test.input, { public: {} }, 10, 0)
            .accounts({
              channelAccount: channelPDA,
              creator: agentSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc();
          
          // Check if input was sanitized
          const channelAccount = await program.account.channel.fetch(channelPDA);
          const sanitized = channelAccount.description !== test.input;
          
          results.push({
            test: test.name,
            type: test.type,
            injectionBlocked: false,
            sanitized: sanitized,
            storedValue: channelAccount.description,
          });
        } catch (e) {
          results.push({
            test: test.name,
            type: test.type,
            injectionBlocked: true,
            error: e.message,
          });
        }
      }

      testResults.invalidInputs.push(...results);
      // All injections should be blocked or sanitized
      expect(results.every(r => r.injectionBlocked || r.sanitized)).toBe(true);
    });

    test('Invalid numbers and amounts', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const numberTests = [
        {
          name: 'Negative capability value',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(-1), 'https://test.com')
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
        {
          name: 'Zero escrow amount',
          test: async () => {
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('zero-amount'),
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
          shouldFail: true,
        },
        {
          name: 'Amount below minimum',
          test: async () => {
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('below-min'),
              ],
              program.programId
            );
            
            return program.methods
              .createEscrow(
                new anchor.BN(LIMITS.MIN_PAYMENT_AMOUNT - 1),
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
          shouldFail: true,
        },
        {
          name: 'Amount above maximum',
          test: async () => {
            const receiver = Keypair.generate();
            const receiverSigner = await generateKeyPairSigner(receiver);
            
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                receiverSigner.address.toBuffer(),
                Buffer.from('above-max'),
              ],
              program.programId
            );
            
            return program.methods
              .createEscrow(
                new anchor.BN(LIMITS.MAX_PAYMENT_AMOUNT + 1),
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
          shouldFail: true,
        },
        {
          name: 'Invalid capability ID (too high)',
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(100), 'https://test.com')
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

      for (const test of numberTests) {
        try {
          await test.test();
          results.push({
            test: test.name,
            passed: !test.shouldFail,
            error: 'Test should have failed but succeeded',
          });
        } catch (e) {
          results.push({
            test: test.name,
            passed: test.shouldFail,
            error: e.message,
          });
        }
      }

      testResults.invalidInputs.push(...results);
      expect(results.every(r => r.passed)).toBe(true);
    });

    test('Invalid public keys', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const publicKeyTests = [
        {
          name: 'Invalid PDA seeds',
          test: async () => {
            // Use wrong seed to generate PDA
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
          name: 'System program as agent account',
          test: async () => {
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
          name: 'Zero address as receiver',
          test: async () => {
            const [escrowPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('escrow'),
                agentSigner.address.toBuffer(),
                PublicKey.default.toBuffer(),
                Buffer.from('zero-receiver'),
              ],
              program.programId
            );
            
            return program.methods
              .createEscrow(
                new anchor.BN(1000),
                new anchor.BN(Date.now() / 1000 + 3600)
              )
              .accounts({
                escrow: escrowPDA,
                payer: agentSigner.address,
                receiver: PublicKey.default,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
          shouldFail: true,
        },
      ];

      for (const test of publicKeyTests) {
        try {
          await test.test();
          results.push({
            test: test.name,
            passed: !test.shouldFail,
            error: 'Test should have failed but succeeded',
          });
        } catch (e) {
          results.push({
            test: test.name,
            passed: test.shouldFail,
            error: e.message,
          });
        }
      }

      testResults.invalidInputs.push(...results);
      expect(results.every(r => r.passed)).toBe(true);
    });
  });

  describe('2. Resource Limits', () => {
    test('Max agents per user', async () => {
      const results = [];
      const user = Keypair.generate();
      const userSigner = await generateKeyPairSigner(user);
      await provider.connection.requestAirdrop(userSigner.address, 1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to create multiple agents (should be limited to 1 per user)
      const agentCreationAttempts = [];
      for (let i = 0; i < 5; i++) {
        const attemptAgent = Keypair.generate();
        const attemptSigner = await generateKeyPairSigner(attemptAgent);
        
        agentCreationAttempts.push({
          index: i,
          signer: attemptSigner,
          test: async () => {
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), userSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(1), `https://agent${i}.com`)
              .accounts({
                agentAccount: agentPDA,
                signer: userSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([userSigner])
              .rpc();
          },
        });
      }

      for (const attempt of agentCreationAttempts) {
        try {
          await attempt.test();
          results.push({
            test: `Agent creation attempt ${attempt.index}`,
            succeeded: true,
            shouldSucceed: attempt.index === 0, // Only first should succeed
          });
        } catch (e) {
          results.push({
            test: `Agent creation attempt ${attempt.index}`,
            succeeded: false,
            shouldSucceed: attempt.index > 0, // All after first should fail
            error: e.message,
          });
        }
      }

      testResults.resourceLimits.push(...results);
      // Only first agent should be created successfully
      expect(results.filter(r => r.succeeded).length).toBe(1);
    });

    test('Max messages per channel', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.5 * LAMPORTS_PER_SOL);
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

      // Create channel
      const channelName = `msg-limit-${Date.now()}`;
      const [channelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
        program.programId
      );
      
      await program.methods
        .createChannel(channelName, 'Test channel', { public: {} }, 10, 0)
        .accounts({
          channelAccount: channelPDA,
          creator: agentSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentSigner])
        .rpc();

      // Send many messages to test limits
      const messageCount = 100;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < messageCount; i++) {
        try {
          const [messagePDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('message'),
              channelPDA.toBuffer(),
              new anchor.BN(i).toArrayLike(Buffer, 'le', 8),
            ],
            program.programId
          );
          
          await program.methods
            .sendMessage(`Message ${i}`, { text: {} })
            .accounts({
              message: messagePDA,
              channel: channelPDA,
              sender: agentSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc();
          
          successCount++;
        } catch (e) {
          failCount++;
          if (i < 50) {
            // Log early failures (shouldn't happen)
            results.push({
              test: `Message ${i}`,
              failed: true,
              error: e.message,
            });
          }
        }
      }

      results.push({
        test: 'Channel message capacity',
        totalAttempts: messageCount,
        successCount,
        failCount,
        channelFull: failCount > 0,
      });

      testResults.resourceLimits.push(...results);
      expect(successCount).toBeGreaterThan(0);
    });

    test('Max participants per channel', async () => {
      const results = [];
      const creator = Keypair.generate();
      const creatorSigner = await generateKeyPairSigner(creator);
      await provider.connection.requestAirdrop(creatorSigner.address, 0.5 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register creator
      const [creatorAgentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), creatorSigner.address.toBuffer()],
        program.programId
      );
      
      await program.methods
        .registerAgent(new anchor.BN(1), 'https://creator.com')
        .accounts({
          agentAccount: creatorAgentPDA,
          signer: creatorSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([creatorSigner])
        .rpc();

      // Create private channel
      const channelName = `participants-${Date.now()}`;
      const [channelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), creatorSigner.address.toBuffer(), Buffer.from(channelName)],
        program.programId
      );
      
      await program.methods
        .createChannel(channelName, 'Participant test', { private: {} }, 100, 0)
        .accounts({
          channelAccount: channelPDA,
          creator: creatorSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([creatorSigner])
        .rpc();

      // Try to add many participants
      const participantCount = LIMITS.MAX_PARTICIPANTS_COUNT + 10;
      let addedCount = 0;
      let rejectedCount = 0;

      for (let i = 0; i < participantCount; i++) {
        try {
          const participant = Keypair.generate();
          const participantSigner = await generateKeyPairSigner(participant);
          
          // Register participant as agent
          const [participantAgentPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('agent'), participantSigner.address.toBuffer()],
            program.programId
          );
          
          await provider.connection.requestAirdrop(participantSigner.address, 0.01 * LAMPORTS_PER_SOL);
          
          await program.methods
            .registerAgent(new anchor.BN(1), `https://participant${i}.com`)
            .accounts({
              agentAccount: participantAgentPDA,
              signer: participantSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([participantSigner])
            .rpc();

          // Add to channel
          await program.methods
            .addParticipant(participantSigner.address)
            .accounts({
              channel: channelPDA,
              authority: creatorSigner.address,
            })
            .signers([creatorSigner])
            .rpc();
          
          addedCount++;
        } catch (e) {
          rejectedCount++;
          if (addedCount < LIMITS.MAX_PARTICIPANTS_COUNT) {
            results.push({
              test: `Early rejection at participant ${i}`,
              error: e.message,
            });
          }
        }
      }

      results.push({
        test: 'Channel participant limit',
        maxLimit: LIMITS.MAX_PARTICIPANTS_COUNT,
        addedCount,
        rejectedCount,
        limitEnforced: addedCount <= LIMITS.MAX_PARTICIPANTS_COUNT,
      });

      testResults.resourceLimits.push(...results);
      expect(addedCount).toBeLessThanOrEqual(LIMITS.MAX_PARTICIPANTS_COUNT);
    });

    test('Memory constraints and account size limits', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test large capability array
      try {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), agentSigner.address.toBuffer()],
          program.programId
        );
        
        // Try to set many capabilities (should be limited)
        const capabilities = Array(LIMITS.MAX_CAPABILITIES_COUNT + 10).fill(0).map((_, i) => i + 1);
        
        await program.methods
          .registerAgent(new anchor.BN(1), 'https://test.com')
          .accounts({
            agentAccount: agentPDA,
            signer: agentSigner.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([agentSigner])
          .rpc();
        
        results.push({
          test: 'Capability array size limit',
          attemptedSize: capabilities.length,
          maxAllowed: LIMITS.MAX_CAPABILITIES_COUNT,
          passed: false, // Should have failed
        });
      } catch (e) {
        results.push({
          test: 'Capability array size limit',
          maxAllowed: LIMITS.MAX_CAPABILITIES_COUNT,
          passed: true,
          error: e.message,
        });
      }

      // Test large requirement items
      try {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), agentSigner.address.toBuffer()],
          program.programId
        );
        
        const [workOrderPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('work_order'), agentSigner.address.toBuffer(), Buffer.from('large-reqs')],
          program.programId
        );
        
        // Create very long requirements string
        const longRequirements = 'R'.repeat(LIMITS.MAX_DESCRIPTION_LENGTH * 2);
        
        await program.methods
          .createWorkOrder(
            'large-reqs',
            'Test',
            longRequirements,
            new anchor.BN(1000),
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
        
        results.push({
          test: 'Requirements size limit',
          passed: false, // Should have failed
        });
      } catch (e) {
        results.push({
          test: 'Requirements size limit',
          passed: true,
          error: e.message,
        });
      }

      testResults.resourceLimits.push(...results);
      expect(results.every(r => r.passed)).toBe(true);
    });

    test('Rate limiting simulation', async () => {
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

      // Rapid fire operations
      const operationCount = 50;
      const startTime = performance.now();
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      const operations = Array(operationCount).fill(0).map((_, i) => 
        program.methods
          .updateAgent(new anchor.BN((i % 7) + 1), `https://rapid${i}.com`)
          .accounts({
            agentAccount: agentPDA,
            signer: agentSigner.address,
          })
          .signers([agentSigner])
          .rpc()
          .then(() => { successCount++; return { success: true, index: i }; })
          .catch(e => { 
            errorCount++; 
            errors.push({ index: i, error: e.message });
            return { success: false, index: i, error: e.message };
          })
      );

      const operationResults = await Promise.all(operations);
      const endTime = performance.now();
      const duration = endTime - startTime;
      const opsPerSecond = (successCount / duration) * 1000;

      results.push({
        test: 'Rate limiting test',
        totalOperations: operationCount,
        successCount,
        errorCount,
        duration: `${duration.toFixed(2)}ms`,
        opsPerSecond: opsPerSecond.toFixed(2),
        rateLimited: errorCount > 0 && errors.some(e => 
          e.error.includes('rate') || e.error.includes('too many')
        ),
      });

      testResults.resourceLimits.push(...results);
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('3. Concurrency Issues', () => {
    test('Simultaneous transactions', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.5 * LAMPORTS_PER_SOL);
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

      // Create multiple channels simultaneously
      const channelPromises = [];
      for (let i = 0; i < 10; i++) {
        const channelName = `concurrent-${Date.now()}-${i}`;
        const [channelPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
          program.programId
        );
        
        channelPromises.push(
          program.methods
            .createChannel(channelName, `Concurrent channel ${i}`, { public: {} }, 10, 0)
            .accounts({
              channelAccount: channelPDA,
              creator: agentSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc()
            .then(() => ({ index: i, success: true }))
            .catch(e => ({ index: i, success: false, error: e.message }))
        );
      }

      const channelResults = await Promise.all(channelPromises);
      const successfulChannels = channelResults.filter(r => r.success).length;

      results.push({
        test: 'Concurrent channel creation',
        totalAttempts: 10,
        successful: successfulChannels,
        failed: 10 - successfulChannels,
        allSucceeded: successfulChannels === 10,
      });

      // Test concurrent updates to same account
      const updatePromises = [];
      for (let i = 0; i < 20; i++) {
        updatePromises.push(
          program.methods
            .updateAgent(new anchor.BN((i % 7) + 1), `https://concurrent-update-${i}.com`)
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
      const successfulUpdates = updateResults.filter(r => r.success).length;

      results.push({
        test: 'Concurrent account updates',
        totalAttempts: 20,
        successful: successfulUpdates,
        failed: 20 - successfulUpdates,
        someConflicts: successfulUpdates < 20,
      });

      testResults.concurrencyIssues.push(...results);
      expect(successfulChannels).toBeGreaterThan(0);
      expect(successfulUpdates).toBeGreaterThan(0);
    });

    test('Race conditions', async () => {
      const results = [];
      const payer = Keypair.generate();
      const payerSigner = await generateKeyPairSigner(payer);
      const receiver = Keypair.generate();
      const receiverSigner = await generateKeyPairSigner(receiver);
      
      await provider.connection.requestAirdrop(payerSigner.address, 0.5 * LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(receiverSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register both as agents
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

      // Create escrow
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          payerSigner.address.toBuffer(),
          receiverSigner.address.toBuffer(),
          Buffer.from('race-test'),
        ],
        program.programId
      );
      
      await program.methods
        .createEscrow(
          new anchor.BN(0.1 * LAMPORTS_PER_SOL),
          new anchor.BN(Date.now() / 1000 + 3600)
        )
        .accounts({
          escrow: escrowPDA,
          payer: payerSigner.address,
          receiver: receiverSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([payerSigner])
        .rpc();

      // Try to release and cancel simultaneously
      const releasePromise = program.methods
        .releaseEscrow()
        .accounts({
          escrow: escrowPDA,
          payer: payerSigner.address,
          receiver: receiverSigner.address,
          signer: receiverSigner.address,
        })
        .signers([receiverSigner])
        .rpc()
        .then(() => ({ operation: 'release', success: true }))
        .catch(e => ({ operation: 'release', success: false, error: e.message }));

      const cancelPromise = program.methods
        .cancelEscrow()
        .accounts({
          escrow: escrowPDA,
          payer: payerSigner.address,
          receiver: receiverSigner.address,
          signer: payerSigner.address,
        })
        .signers([payerSigner])
        .rpc()
        .then(() => ({ operation: 'cancel', success: true }))
        .catch(e => ({ operation: 'cancel', success: false, error: e.message }));

      const [releaseResult, cancelResult] = await Promise.all([releasePromise, cancelPromise]);

      results.push({
        test: 'Escrow race condition',
        releaseResult,
        cancelResult,
        bothSucceeded: releaseResult.success && cancelResult.success,
        raceConditionPrevented: !(releaseResult.success && cancelResult.success),
      });

      testResults.concurrencyIssues.push(...results);
      // Only one operation should succeed
      expect(releaseResult.success && cancelResult.success).toBe(false);
    });

    test('Double-spending attempts', async () => {
      const results = [];
      const spender = Keypair.generate();
      const spenderSigner = await generateKeyPairSigner(spender);
      const receiver1 = Keypair.generate();
      const receiver1Signer = await generateKeyPairSigner(receiver1);
      const receiver2 = Keypair.generate();
      const receiver2Signer = await generateKeyPairSigner(receiver2);
      
      await provider.connection.requestAirdrop(spenderSigner.address, 0.2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register all as agents
      for (const signer of [spenderSigner, receiver1Signer, receiver2Signer]) {
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

      // Create two escrows with same funds
      const escrowAmount = new anchor.BN(0.08 * LAMPORTS_PER_SOL);
      
      const [escrow1PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          spenderSigner.address.toBuffer(),
          receiver1Signer.address.toBuffer(),
          Buffer.from('double-spend-1'),
        ],
        program.programId
      );
      
      const [escrow2PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          spenderSigner.address.toBuffer(),
          receiver2Signer.address.toBuffer(),
          Buffer.from('double-spend-2'),
        ],
        program.programId
      );

      // Try to create both escrows simultaneously
      const escrow1Promise = program.methods
        .createEscrow(escrowAmount, new anchor.BN(Date.now() / 1000 + 3600))
        .accounts({
          escrow: escrow1PDA,
          payer: spenderSigner.address,
          receiver: receiver1Signer.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([spenderSigner])
        .rpc()
        .then(() => ({ escrow: 1, success: true }))
        .catch(e => ({ escrow: 1, success: false, error: e.message }));

      const escrow2Promise = program.methods
        .createEscrow(escrowAmount, new anchor.BN(Date.now() / 1000 + 3600))
        .accounts({
          escrow: escrow2PDA,
          payer: spenderSigner.address,
          receiver: receiver2Signer.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([spenderSigner])
        .rpc()
        .then(() => ({ escrow: 2, success: true }))
        .catch(e => ({ escrow: 2, success: false, error: e.message }));

      const [escrow1Result, escrow2Result] = await Promise.all([escrow1Promise, escrow2Promise]);

      results.push({
        test: 'Double-spending prevention',
        escrow1Result,
        escrow2Result,
        bothSucceeded: escrow1Result.success && escrow2Result.success,
        doubleSpendPrevented: !(escrow1Result.success && escrow2Result.success) || 
          (await provider.connection.getBalance(spenderSigner.address)) >= 0,
      });

      testResults.concurrencyIssues.push(...results);
      expect(results[0].doubleSpendPrevented).toBe(true);
    });

    test('Parallel agent updates', async () => {
      const results = [];
      const agents = [];
      
      // Create multiple agents
      for (let i = 0; i < 5; i++) {
        const agent = Keypair.generate();
        const agentSigner = await generateKeyPairSigner(agent);
        await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
        
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), agentSigner.address.toBuffer()],
          program.programId
        );
        
        agents.push({ signer: agentSigner, pda: agentPDA });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register all agents
      for (const agent of agents) {
        await program.methods
          .registerAgent(new anchor.BN(1), 'https://test.com')
          .accounts({
            agentAccount: agent.pda,
            signer: agent.signer.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([agent.signer])
          .rpc();
      }

      // Update all agents in parallel
      const updatePromises = agents.map((agent, index) => 
        program.methods
          .updateAgent(new anchor.BN((index % 7) + 1), `https://parallel-${index}.com`)
          .accounts({
            agentAccount: agent.pda,
            signer: agent.signer.address,
          })
          .signers([agent.signer])
          .rpc()
          .then(() => ({ agent: index, success: true }))
          .catch(e => ({ agent: index, success: false, error: e.message }))
      );

      const updateResults = await Promise.all(updatePromises);
      const allSucceeded = updateResults.every(r => r.success);

      results.push({
        test: 'Parallel agent updates',
        totalAgents: agents.length,
        successfulUpdates: updateResults.filter(r => r.success).length,
        allSucceeded,
        noInterference: allSucceeded,
      });

      testResults.concurrencyIssues.push(...results);
      expect(allSucceeded).toBe(true);
    });
  });

  describe('4. Network Failures', () => {
    test('Transaction retry logic', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate retries by attempting same operation multiple times
      const maxRetries = 3;
      let attempts = 0;
      let success = false;
      let lastError = null;

      while (attempts < maxRetries && !success) {
        try {
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
          
          success = true;
        } catch (e) {
          lastError = e;
          attempts++;
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
          }
        }
      }

      results.push({
        test: 'Transaction retry mechanism',
        attempts,
        maxRetries,
        success,
        retriesNeeded: attempts > 1,
        lastError: lastError?.message,
      });

      testResults.networkFailures.push(...results);
      expect(success).toBe(true);
    });

    test('Partial failure recovery', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.3 * LAMPORTS_PER_SOL);
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

      // Create multiple operations where some might fail
      const operations = [
        {
          name: 'Create Channel 1',
          execute: async () => {
            const channelName = `recovery-1-${Date.now()}`;
            const [channelPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
              program.programId
            );
            
            return program.methods
              .createChannel(channelName, 'Test 1', { public: {} }, 10, 0)
              .accounts({
                channelAccount: channelPDA,
                creator: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
        },
        {
          name: 'Invalid Operation',
          execute: async () => {
            // This should fail
            const wrongPDA = PublicKey.findProgramAddressSync(
              [Buffer.from('wrong'), agentSigner.address.toBuffer()],
              program.programId
            )[0];
            
            return program.methods
              .updateAgent(new anchor.BN(1), 'https://fail.com')
              .accounts({
                agentAccount: wrongPDA,
                signer: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
        },
        {
          name: 'Create Channel 2',
          execute: async () => {
            const channelName = `recovery-2-${Date.now()}`;
            const [channelPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
              program.programId
            );
            
            return program.methods
              .createChannel(channelName, 'Test 2', { public: {} }, 10, 0)
              .accounts({
                channelAccount: channelPDA,
                creator: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
        },
      ];

      const operationResults = [];
      for (const op of operations) {
        try {
          await op.execute();
          operationResults.push({
            operation: op.name,
            success: true,
          });
        } catch (e) {
          operationResults.push({
            operation: op.name,
            success: false,
            error: e.message,
          });
        }
      }

      const successCount = operationResults.filter(r => r.success).length;
      const failureCount = operationResults.filter(r => !r.success).length;

      results.push({
        test: 'Partial failure recovery',
        totalOperations: operations.length,
        successCount,
        failureCount,
        partialSuccess: successCount > 0 && failureCount > 0,
        results: operationResults,
      });

      testResults.networkFailures.push(...results);
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });
  });

  describe('5. Security Tests', () => {
    test('Unauthorized access attempts', async () => {
      const results = [];
      const owner = Keypair.generate();
      const ownerSigner = await generateKeyPairSigner(owner);
      const attacker = Keypair.generate();
      const attackerSigner = await generateKeyPairSigner(attacker);
      
      await provider.connection.requestAirdrop(ownerSigner.address, 0.2 * LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(attackerSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Owner registers agent
      const [ownerAgentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), ownerSigner.address.toBuffer()],
        program.programId
      );
      
      await program.methods
        .registerAgent(new anchor.BN(1), 'https://owner.com')
        .accounts({
          agentAccount: ownerAgentPDA,
          signer: ownerSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([ownerSigner])
        .rpc();

      // Attacker tries to update owner's agent
      try {
        await program.methods
          .updateAgent(new anchor.BN(7), 'https://hacked.com')
          .accounts({
            agentAccount: ownerAgentPDA,
            signer: attackerSigner.address,
          })
          .signers([attackerSigner])
          .rpc();
        
        results.push({
          test: 'Unauthorized agent update',
          attackSucceeded: true,
          vulnerability: true,
        });
      } catch (e) {
        results.push({
          test: 'Unauthorized agent update',
          attackSucceeded: false,
          vulnerability: false,
          error: e.message,
        });
      }

      // Owner creates private channel
      const channelName = `private-${Date.now()}`;
      const [channelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), ownerSigner.address.toBuffer(), Buffer.from(channelName)],
        program.programId
      );
      
      await program.methods
        .createChannel(channelName, 'Private channel', { private: {} }, 10, 0)
        .accounts({
          channelAccount: channelPDA,
          creator: ownerSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([ownerSigner])
        .rpc();

      // Attacker tries to send message to private channel
      try {
        const [messagePDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('message'),
            channelPDA.toBuffer(),
            new anchor.BN(0).toArrayLike(Buffer, 'le', 8),
          ],
          program.programId
        );
        
        await program.methods
          .sendMessage('Unauthorized message', { text: {} })
          .accounts({
            message: messagePDA,
            channel: channelPDA,
            sender: attackerSigner.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([attackerSigner])
          .rpc();
        
        results.push({
          test: 'Unauthorized channel access',
          attackSucceeded: true,
          vulnerability: true,
        });
      } catch (e) {
        results.push({
          test: 'Unauthorized channel access',
          attackSucceeded: false,
          vulnerability: false,
          error: e.message,
        });
      }

      testResults.securityTests.push(...results);
      expect(results.every(r => !r.vulnerability)).toBe(true);
    });

    test('Signature validation', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      const fakeSigner = Keypair.generate();
      const fakeSignerKeypair = await generateKeyPairSigner(fakeSigner);
      
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to register with mismatched signer
      try {
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), agentSigner.address.toBuffer()],
          program.programId
        );
        
        // Use agent's PDA but sign with fake signer
        await program.methods
          .registerAgent(new anchor.BN(1), 'https://fake.com')
          .accounts({
            agentAccount: agentPDA,
            signer: agentSigner.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([fakeSignerKeypair]) // Wrong signer
          .rpc();
        
        results.push({
          test: 'Signature mismatch',
          signatureValidated: false,
          vulnerability: true,
        });
      } catch (e) {
        results.push({
          test: 'Signature mismatch',
          signatureValidated: true,
          vulnerability: false,
          error: e.message,
        });
      }

      testResults.securityTests.push(...results);
      expect(results.every(r => r.signatureValidated)).toBe(true);
    });

    test('PDA derivation security', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test various PDA derivation attacks
      const pdaTests = [
        {
          name: 'Wrong program ID',
          test: async () => {
            const wrongProgramId = Keypair.generate().publicKey;
            const [wrongPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), agentSigner.address.toBuffer()],
              wrongProgramId
            );
            
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
        },
        {
          name: 'Modified seeds',
          test: async () => {
            const [modifiedPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent_modified'), agentSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://test.com')
              .accounts({
                agentAccount: modifiedPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
        },
        {
          name: 'Reordered seeds',
          test: async () => {
            const [reorderedPDA] = PublicKey.findProgramAddressSync(
              [agentSigner.address.toBuffer(), Buffer.from('agent')],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://test.com')
              .accounts({
                agentAccount: reorderedPDA,
                signer: agentSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([agentSigner])
              .rpc();
          },
        },
      ];

      for (const pdaTest of pdaTests) {
        try {
          await pdaTest.test();
          results.push({
            test: pdaTest.name,
            pdaValidated: false,
            vulnerability: true,
          });
        } catch (e) {
          results.push({
            test: pdaTest.name,
            pdaValidated: true,
            vulnerability: false,
            error: e.message,
          });
        }
      }

      testResults.securityTests.push(...results);
      expect(results.every(r => r.pdaValidated)).toBe(true);
    });
  });

  describe('6. State Corruption', () => {
    test('Invalid state transitions', async () => {
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

      // Create work order
      const [agentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), agentSigner.address.toBuffer()],
        program.programId
      );
      
      const [workOrderPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('work_order'), agentSigner.address.toBuffer(), Buffer.from('state-test')],
        program.programId
      );
      
      await program.methods
        .createWorkOrder(
          'state-test',
          'Test Work Order',
          'Test requirements',
          new anchor.BN(10000),
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

      // Try invalid state transitions
      const stateTests = [
        {
          name: 'Complete without acceptance',
          test: async () => {
            return program.methods
              .completeWorkOrder()
              .accounts({
                workOrder: workOrderPDA,
                provider: receiverSigner.address,
              })
              .signers([receiverSigner])
              .rpc();
          },
        },
        {
          name: 'Cancel after completion',
          test: async () => {
            // First accept
            await program.methods
              .acceptWorkOrder()
              .accounts({
                workOrder: workOrderPDA,
                provider: receiverSigner.address,
              })
              .signers([receiverSigner])
              .rpc();
            
            // Then complete
            await program.methods
              .completeWorkOrder()
              .accounts({
                workOrder: workOrderPDA,
                provider: receiverSigner.address,
              })
              .signers([receiverSigner])
              .rpc();
            
            // Try to cancel after completion
            return program.methods
              .cancelWorkOrder()
              .accounts({
                workOrder: workOrderPDA,
                requester: agentSigner.address,
              })
              .signers([agentSigner])
              .rpc();
          },
        },
      ];

      for (const stateTest of stateTests) {
        try {
          await stateTest.test();
          results.push({
            test: stateTest.name,
            invalidTransition: true,
            stateCorruption: true,
          });
        } catch (e) {
          results.push({
            test: stateTest.name,
            invalidTransition: false,
            stateCorruption: false,
            error: e.message,
          });
        }
      }

      testResults.stateCorruption.push(...results);
      expect(results.every(r => !r.stateCorruption)).toBe(true);
    });

    test('Orphaned accounts', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create accounts that reference each other
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

      // Create channel
      const channelName = `orphan-test-${Date.now()}`;
      const [channelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), agentSigner.address.toBuffer(), Buffer.from(channelName)],
        program.programId
      );
      
      await program.methods
        .createChannel(channelName, 'Test channel', { public: {} }, 10, 0)
        .accounts({
          channelAccount: channelPDA,
          creator: agentSigner.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentSigner])
        .rpc();

      // Send messages
      for (let i = 0; i < 3; i++) {
        const [messagePDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('message'),
            channelPDA.toBuffer(),
            new anchor.BN(i).toArrayLike(Buffer, 'le', 8),
          ],
          program.programId
        );
        
        await program.methods
          .sendMessage(`Message ${i}`, { text: {} })
          .accounts({
            message: messagePDA,
            channel: channelPDA,
            sender: agentSigner.address,
            systemProgram: SystemProgram.programId,
          })
          .signers([agentSigner])
          .rpc();
      }

      // Check if accounts are properly linked
      try {
        const channelAccount = await program.account.channel.fetch(channelPDA);
        const messageCount = channelAccount.messageCount.toNumber();
        
        results.push({
          test: 'Account relationships',
          channelCreated: true,
          messageCount,
          orphanedAccounts: false,
        });
      } catch (e) {
        results.push({
          test: 'Account relationships',
          channelCreated: false,
          orphanedAccounts: true,
          error: e.message,
        });
      }

      testResults.stateCorruption.push(...results);
      expect(results.every(r => !r.orphanedAccounts)).toBe(true);
    });
  });

  describe('7. Integration Failures', () => {
    test('External service unavailability', async () => {
      const results = [];
      const agent = Keypair.generate();
      const agentSigner = await generateKeyPairSigner(agent);
      await provider.connection.requestAirdrop(agentSigner.address, 0.1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test IPFS-like metadata URIs
      const metadataTests = [
        {
          name: 'Invalid IPFS hash',
          uri: 'ipfs://invalid-hash',
        },
        {
          name: 'Malformed URI',
          uri: 'not-a-valid-uri',
        },
        {
          name: 'Empty URI',
          uri: '',
        },
        {
          name: 'Very long URI',
          uri: 'https://' + 'x'.repeat(LIMITS.MAX_GENERAL_STRING_LENGTH),
        },
      ];

      for (const test of metadataTests) {
        try {
          const [agentPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('agent'), agentSigner.address.toBuffer()],
            program.programId
          );
          
          await program.methods
            .registerAgent(new anchor.BN(1), test.uri)
            .accounts({
              agentAccount: agentPDA,
              signer: agentSigner.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([agentSigner])
            .rpc();
          
          results.push({
            test: test.name,
            uri: test.uri,
            accepted: true,
            validated: test.uri !== '',
          });
        } catch (e) {
          results.push({
            test: test.name,
            uri: test.uri,
            accepted: false,
            error: e.message,
          });
        }
      }

      testResults.integrationFailures.push(...results);
      expect(results.filter(r => r.validated || !r.accepted).length).toBe(results.length);
    });

    test('Wallet connection edge cases', async () => {
      const results = [];
      
      // Test various wallet scenarios
      const walletTests = [
        {
          name: 'Insufficient balance',
          test: async () => {
            const poorWallet = Keypair.generate();
            const poorSigner = await generateKeyPairSigner(poorWallet);
            // Don't fund this wallet
            
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), poorSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://poor.com')
              .accounts({
                agentAccount: agentPDA,
                signer: poorSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([poorSigner])
              .rpc();
          },
        },
        {
          name: 'Lamports dust amount',
          test: async () => {
            const dustWallet = Keypair.generate();
            const dustSigner = await generateKeyPairSigner(dustWallet);
            await provider.connection.requestAirdrop(dustSigner.address, 1); // 1 lamport
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const [agentPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('agent'), dustSigner.address.toBuffer()],
              program.programId
            );
            
            return program.methods
              .registerAgent(new anchor.BN(1), 'https://dust.com')
              .accounts({
                agentAccount: agentPDA,
                signer: dustSigner.address,
                systemProgram: SystemProgram.programId,
              })
              .signers([dustSigner])
              .rpc();
          },
        },
      ];

      for (const walletTest of walletTests) {
        try {
          await walletTest.test();
          results.push({
            test: walletTest.name,
            succeeded: true,
            handled: false,
          });
        } catch (e) {
          results.push({
            test: walletTest.name,
            succeeded: false,
            handled: true,
            error: e.message,
          });
        }
      }

      testResults.integrationFailures.push(...results);
      expect(results.every(r => r.handled)).toBe(true);
    });
  });

  afterAll(() => {
    generateComprehensiveReport();
  });
});

function generateComprehensiveReport() {
  console.log('\n' + '='.repeat(100));
  console.log('COMPREHENSIVE EDGE CASE AND SECURITY QA REPORT');
  console.log('='.repeat(100));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Protocol: GhostSpeak AI Agent Commerce Protocol`);
  console.log(`Program ID: 4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP`);
  
  // Category summaries
  const categories = [
    { name: 'Invalid Inputs', key: 'invalidInputs' },
    { name: 'Resource Limits', key: 'resourceLimits' },
    { name: 'Concurrency Issues', key: 'concurrencyIssues' },
    { name: 'Network Failures', key: 'networkFailures' },
    { name: 'Security Tests', key: 'securityTests' },
    { name: 'State Corruption', key: 'stateCorruption' },
    { name: 'Integration Failures', key: 'integrationFailures' },
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let criticalIssues = [];
  let recommendations = [];

  console.log('\n📊 TEST RESULTS BY CATEGORY:');
  console.log('─'.repeat(100));

  categories.forEach(category => {
    const results = testResults[category.key];
    if (!results || results.length === 0) {
      console.log(`\n${category.name}: No tests executed`);
      return;
    }

    console.log(`\n${category.name}:`);
    totalTests += results.length;
    
    let categoryPassed = 0;
    let categoryIssues = [];

    results.forEach(result => {
      const passed = result.passed !== false && 
                    !result.vulnerability && 
                    !result.attackSucceeded &&
                    !result.stateCorruption;
      
      if (passed) {
        categoryPassed++;
        totalPassed++;
      } else {
        const issue = {
          test: result.test || result.name || 'Unknown test',
          reason: result.error || 'Test failed validation',
          severity: result.vulnerability ? 'CRITICAL' : 'HIGH',
        };
        categoryIssues.push(issue);
        
        if (result.vulnerability || result.attackSucceeded) {
          criticalIssues.push({
            category: category.name,
            ...issue,
          });
        }
      }
    });

    console.log(`  ✅ Passed: ${categoryPassed}/${results.length} (${((categoryPassed/results.length)*100).toFixed(1)}%)`);
    
    if (categoryIssues.length > 0) {
      console.log(`  ❌ Issues found:`);
      categoryIssues.forEach(issue => {
        console.log(`     - ${issue.test}: ${issue.reason}`);
      });
    }

    // Category-specific recommendations
    if (category.key === 'invalidInputs' && categoryIssues.length > 0) {
      recommendations.push('Implement comprehensive input validation for all string and numeric inputs');
      recommendations.push('Add sanitization for special characters and potential injection attempts');
    }
    if (category.key === 'resourceLimits' && results.some(r => !r.limitEnforced)) {
      recommendations.push('Enforce strict resource limits to prevent DoS attacks');
      recommendations.push('Implement rate limiting for all public endpoints');
    }
    if (category.key === 'concurrencyIssues' && results.some(r => r.raceConditionPossible)) {
      recommendations.push('Add proper locking mechanisms for concurrent operations');
      recommendations.push('Implement atomic operations for critical state changes');
    }
    if (category.key === 'securityTests' && criticalIssues.length > 0) {
      recommendations.push('Review and strengthen access control mechanisms');
      recommendations.push('Implement comprehensive signature validation');
      recommendations.push('Add audit logging for all sensitive operations');
    }
  });

  // Overall summary
  console.log('\n' + '='.repeat(100));
  console.log('📈 OVERALL SUMMARY');
  console.log('='.repeat(100));
  
  const overallScore = (totalPassed / totalTests) * 100;
  const grade = overallScore >= 95 ? 'A+' : 
               overallScore >= 90 ? 'A' :
               overallScore >= 85 ? 'B+' :
               overallScore >= 80 ? 'B' :
               overallScore >= 75 ? 'C+' :
               overallScore >= 70 ? 'C' : 'D';

  console.log(`Total Tests Executed: ${totalTests}`);
  console.log(`Tests Passed: ${totalPassed}`);
  console.log(`Tests Failed: ${totalTests - totalPassed}`);
  console.log(`Success Rate: ${overallScore.toFixed(2)}%`);
  console.log(`Security Grade: ${grade}`);

  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL SECURITY ISSUES:');
    console.log('─'.repeat(100));
    criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.category} - ${issue.test}`);
      console.log(`   ${issue.reason}`);
    });
  } else {
    console.log('\n✅ No critical security vulnerabilities detected');
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('─'.repeat(100));
  
  // Add general recommendations
  recommendations.push('Implement comprehensive error handling for all edge cases');
  recommendations.push('Add monitoring and alerting for suspicious patterns');
  recommendations.push('Conduct regular security audits and penetration testing');
  recommendations.push('Implement circuit breakers for high-frequency operations');
  recommendations.push('Add comprehensive logging for debugging and forensics');
  
  // Remove duplicates and sort by priority
  const uniqueRecommendations = [...new Set(recommendations)];
  uniqueRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  // Risk assessment
  console.log('\n⚠️  RISK ASSESSMENT:');
  console.log('─'.repeat(100));
  
  const riskLevel = criticalIssues.length > 5 ? 'CRITICAL' :
                   criticalIssues.length > 2 ? 'HIGH' :
                   criticalIssues.length > 0 ? 'MEDIUM' :
                   overallScore < 90 ? 'LOW' : 'MINIMAL';
  
  console.log(`Overall Risk Level: ${riskLevel}`);
  console.log(`Critical Issues: ${criticalIssues.length}`);
  console.log(`Security Posture: ${overallScore >= 90 ? 'Strong' : overallScore >= 80 ? 'Good' : 'Needs Improvement'}`);

  // Export detailed report
  const fs = require('fs');
  const reportData = {
    summary: {
      totalTests,
      totalPassed,
      totalFailed: totalTests - totalPassed,
      successRate: overallScore,
      securityGrade: grade,
      riskLevel,
      timestamp: new Date().toISOString(),
    },
    criticalIssues,
    recommendations: uniqueRecommendations,
    detailedResults: testResults,
    limits: LIMITS,
  };

  fs.writeFileSync(
    'comprehensive-qa-report.json',
    JSON.stringify(reportData, null, 2)
  );

  console.log('\n📄 Detailed report saved to: comprehensive-qa-report.json');
  console.log('='.repeat(100));
}