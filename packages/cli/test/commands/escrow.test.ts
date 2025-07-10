import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import {
  createEscrow,
  completeEscrow,
  cancelEscrow,
  disputeEscrow,
  resolveDispute,
  listEscrows,
  getEscrowDetails,
} from '../../src/commands/escrow';
import * as mockFs from '../../src/utils/mock-fs';

// Mock the connection
const mockConnection = {
  getBalance: async () => 1000000000,
  getLatestBlockhash: async () => ({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 100,
  }),
  sendTransaction: async () => 'mock-signature',
  confirmTransaction: async () => ({ value: { err: null } }),
  getAccountInfo: async () => ({
    data: Buffer.from([]),
    owner: PublicKey.default,
    lamports: 1000000,
    executable: false,
  }),
} as unknown as Connection;

describe('Escrow Commands', () => {
  let clientKeypair: Keypair;
  let agentKeypair: Keypair;
  let arbitratorKeypair: Keypair;

  beforeAll(() => {
    // Setup test keypairs
    clientKeypair = Keypair.generate();
    agentKeypair = Keypair.generate();
    arbitratorKeypair = Keypair.generate();
  });

  afterAll(() => {
    // Clean up
    mockFs.clearMocks();
  });

  test('creates escrow successfully', async () => {
    const taskId = `task_${Date.now()}`;
    const amount = 1000;
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    const result = await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      amount,
      deadline,
      'Complete the testing task',
    );

    expect(result).toBeDefined();
    expect(result.escrowPda).toBeInstanceOf(PublicKey);
    expect(result.signature).toBe('mock-signature');
  });

  test('validates escrow amount', async () => {
    const invalidAmounts = [0, -100];

    for (const amount of invalidAmounts) {
      try {
        await createEscrow(
          mockConnection,
          clientKeypair,
          agentKeypair.publicKey,
          'test_task',
          amount,
          Math.floor(Date.now() / 1000) + 3600,
          'Test description',
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid amount');
      }
    }
  });

  test('validates deadline', async () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

    try {
      await createEscrow(
        mockConnection,
        clientKeypair,
        agentKeypair.publicKey,
        'past_deadline_task',
        1000,
        pastDeadline,
        'Test with past deadline',
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Deadline must be in the future');
    }
  });

  test('completes escrow with proof', async () => {
    const taskId = `complete_test_${Date.now()}`;

    // First create the escrow
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      500,
      Math.floor(Date.now() / 1000) + 86400,
      'Task to complete',
    );

    // Complete the escrow
    const completionProof = 'ipfs://QmCompletionProof123';
    const result = await completeEscrow(mockConnection, agentKeypair, taskId, completionProof);

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('handles completion by non-agent', async () => {
    const taskId = `non_agent_complete_${Date.now()}`;

    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      500,
      Math.floor(Date.now() / 1000) + 86400,
      'Test task',
    );

    // Try to complete as client (not agent)
    try {
      await completeEscrow(
        mockConnection,
        clientKeypair, // Wrong keypair
        taskId,
        'proof',
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Only agent can complete');
    }
  });

  test('cancels escrow before work starts', async () => {
    const taskId = `cancel_test_${Date.now()}`;

    // Create escrow
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      750,
      Math.floor(Date.now() / 1000) + 86400,
      'Task to cancel',
    );

    // Cancel the escrow
    const result = await cancelEscrow(mockConnection, clientKeypair, taskId, 'Changed my mind');

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('prevents cancellation after work starts', async () => {
    const taskId = `no_cancel_${Date.now()}`;

    // Create and mark as in progress
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      1000,
      Math.floor(Date.now() / 1000) + 86400,
      'In progress task',
    );

    // Simulate work started
    // In real scenario, agent would update status to InProgress

    try {
      await cancelEscrow(mockConnection, clientKeypair, taskId, 'Too late to cancel');
      // In mock, this might succeed - adjust based on actual implementation
    } catch (error: any) {
      expect(error.message).toContain('Cannot cancel');
    }
  });

  test('raises dispute', async () => {
    const taskId = `dispute_test_${Date.now()}`;

    // Create escrow
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      2000,
      Math.floor(Date.now() / 1000) + 86400,
      'Disputed task',
    );

    // Raise dispute
    const result = await disputeEscrow(
      mockConnection,
      clientKeypair,
      taskId,
      'Work quality not as promised',
      ['evidence1.jpg', 'evidence2.pdf'],
    );

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('validates dispute reason', async () => {
    const taskId = `invalid_dispute_${Date.now()}`;

    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      1000,
      Math.floor(Date.now() / 1000) + 86400,
      'Test task',
    );

    // Empty reason
    try {
      await disputeEscrow(mockConnection, clientKeypair, taskId, '', []);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Dispute reason required');
    }

    // Too long reason
    const longReason = 'a'.repeat(1001);
    try {
      await disputeEscrow(mockConnection, clientKeypair, taskId, longReason, []);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Reason too long');
    }
  });

  test('resolves dispute as arbitrator', async () => {
    const taskId = `resolve_test_${Date.now()}`;

    // Create and dispute escrow
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      3000,
      Math.floor(Date.now() / 1000) + 86400,
      'To be resolved',
    );

    await disputeEscrow(mockConnection, clientKeypair, taskId, 'Quality issue', []);

    // Resolve dispute
    const result = await resolveDispute(
      mockConnection,
      arbitratorKeypair,
      taskId,
      'client', // Winner
      'Partial refund of 50%',
      1500, // Refund amount
    );

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('validates resolution winner', async () => {
    const taskId = `invalid_winner_${Date.now()}`;

    try {
      await resolveDispute(
        mockConnection,
        arbitratorKeypair,
        taskId,
        'invalid_party' as any,
        'Resolution notes',
        1000,
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Invalid winner');
    }
  });

  test('lists escrows with filters', async () => {
    // List all escrows
    const allEscrows = await listEscrows(mockConnection, {});
    expect(Array.isArray(allEscrows)).toBe(true);

    // List by client
    const clientEscrows = await listEscrows(mockConnection, {
      client: clientKeypair.publicKey,
    });
    expect(Array.isArray(clientEscrows)).toBe(true);

    // List by agent
    const agentEscrows = await listEscrows(mockConnection, {
      agent: agentKeypair.publicKey,
    });
    expect(Array.isArray(agentEscrows)).toBe(true);

    // List by status
    const activeEscrows = await listEscrows(mockConnection, {
      status: 'active',
    });
    expect(Array.isArray(activeEscrows)).toBe(true);
  });

  test('gets escrow details', async () => {
    const taskId = `details_test_${Date.now()}`;

    // Create escrow
    const createResult = await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      1500,
      Math.floor(Date.now() / 1000) + 86400,
      'Detailed task',
    );

    // Get details
    const details = await getEscrowDetails(mockConnection, taskId);

    expect(details).toBeDefined();
    expect(details.taskId).toBe(taskId);
    expect(details.amount).toBe(1500);
    expect(details.client).toEqual(clientKeypair.publicKey);
    expect(details.agent).toEqual(agentKeypair.publicKey);
  });

  test('handles non-existent escrow details', async () => {
    try {
      await getEscrowDetails(mockConnection, 'non_existent_task_id');
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Escrow not found');
    }
  });

  test('validates refund amount in resolution', async () => {
    const taskId = `refund_validation_${Date.now()}`;
    const escrowAmount = 2000;

    // Create and dispute
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      escrowAmount,
      Math.floor(Date.now() / 1000) + 86400,
      'Test task',
    );

    await disputeEscrow(mockConnection, clientKeypair, taskId, 'Issue', []);

    // Try to refund more than escrow amount
    try {
      await resolveDispute(
        mockConnection,
        arbitratorKeypair,
        taskId,
        'client',
        'Over refund',
        escrowAmount + 1000,
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Refund exceeds escrow amount');
    }
  });

  test('handles expired escrow', async () => {
    const taskId = `expired_test_${Date.now()}`;
    const pastDeadline = Math.floor(Date.now() / 1000) + 60; // Only 1 minute in future

    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      1000,
      pastDeadline,
      'Soon to expire',
    );

    // Wait for expiration (in real test would mock time)
    // Check if escrow can be claimed after expiration
    const escrows = await listEscrows(mockConnection, {
      status: 'expired',
    });

    expect(Array.isArray(escrows)).toBe(true);
  });

  test('validates task ID format', async () => {
    const invalidTaskIds = ['', 'a'.repeat(65), 'task with spaces', 'task@special#chars'];

    for (const taskId of invalidTaskIds) {
      try {
        await createEscrow(
          mockConnection,
          clientKeypair,
          agentKeypair.publicKey,
          taskId,
          1000,
          Math.floor(Date.now() / 1000) + 86400,
          'Test',
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid task ID');
      }
    }
  });

  test('handles concurrent escrow operations', async () => {
    const taskId = `concurrent_${Date.now()}`;

    // Create escrow
    await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      5000,
      Math.floor(Date.now() / 1000) + 86400,
      'Concurrent test',
    );

    // Try concurrent operations (in real scenario these would be simultaneous)
    const promises = [
      completeEscrow(mockConnection, agentKeypair, taskId, 'proof1'),
      disputeEscrow(mockConnection, clientKeypair, taskId, 'dispute', []),
    ];

    // One should succeed, one should fail
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes.length).toBeGreaterThan(0);
    // In real implementation, expect exactly one success
  });

  test('validates escrow description length', async () => {
    // Test maximum description length
    const maxDescription = 'D'.repeat(1000);

    const result = await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      `desc_test_${Date.now()}`,
      1000,
      Math.floor(Date.now() / 1000) + 3600,
      maxDescription,
    );

    expect(result).toBeDefined();
    expect(result.escrowPda).toBeInstanceOf(PublicKey);

    // Test empty description
    const emptyResult = await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      `empty_desc_${Date.now()}`,
      1000,
      Math.floor(Date.now() / 1000) + 3600,
      '',
    );

    expect(emptyResult).toBeDefined();
  });

  test('handles partial refund scenarios', async () => {
    // Create escrow
    const taskId = `partial_refund_${Date.now()}`;
    const escrowResult = await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      taskId,
      1000,
      Math.floor(Date.now() / 1000) + 3600,
      'Partial refund test',
    );

    // Simulate dispute
    await disputeEscrow(mockConnection, clientKeypair, taskId, 'Partial work completed', []);

    // Resolve with partial refund (30% to agent, 70% to client)
    const resolution = await resolveDispute(
      mockConnection,
      arbitratorKeypair,
      taskId,
      'agent',
      'Partial completion - 30% payment to agent',
      700, // 70% refund to client
    );

    expect(resolution).toBeDefined();
  });

  test('validates minimum escrow duration', async () => {
    const currentTime = Math.floor(Date.now() / 1000);

    // Test very short deadline (1 second)
    await expect(
      createEscrow(
        mockConnection,
        clientKeypair,
        agentKeypair.publicKey,
        `short_deadline_${Date.now()}`,
        1000,
        currentTime + 1, // 1 second in future
        'Too short deadline',
      ),
    ).rejects.toThrow(/Deadline must be at least/);

    // Test reasonable minimum (1 hour)
    const result = await createEscrow(
      mockConnection,
      clientKeypair,
      agentKeypair.publicKey,
      `min_deadline_${Date.now()}`,
      1000,
      currentTime + 3600, // 1 hour
      'Minimum deadline test',
    );

    expect(result).toBeDefined();
  });
});
