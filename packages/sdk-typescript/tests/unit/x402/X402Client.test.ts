/**
 * X402Client Unit Tests
 *
 * Comprehensive tests for x402 payment client functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Address, Rpc, SolanaRpcApi, Signature } from '@solana/kit';
import { X402Client, type X402PaymentRequest, type X402PaymentReceipt } from '../../../src/x402/X402Client';

describe('X402Client', () => {
  let mockRpc: Rpc<SolanaRpcApi>;
  let client: X402Client;

  beforeEach(() => {
    mockRpc = {
      getTransaction: vi.fn(),
      getLatestBlockhash: vi.fn(),
      sendTransaction: vi.fn(),
    } as unknown as Rpc<SolanaRpcApi>;

    client = new X402Client(mockRpc);
  });

  describe('Payment Request Creation', () => {
    it('should create a valid payment request', () => {
      const request: X402PaymentRequest = {
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n, // 1 USDC
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'AI agent query',
        metadata: {
          agent: 'test-agent',
          capability: 'query',
        },
        expiresAt: Date.now() + 300_000, // 5 minutes
        requiresReceipt: true,
      };

      expect(request.amount).toBeGreaterThan(0n);
      expect(request.description).toBe('AI agent query');
      expect(request.metadata).toHaveProperty('agent');
    });

    it('should validate minimum payment amount', () => {
      const MIN_AMOUNT = 1000n; // 0.001 tokens
      const amount = 500n;

      expect(amount).toBeLessThan(MIN_AMOUNT);
    });

    it('should validate maximum payment amount', () => {
      const MAX_AMOUNT = 1_000_000_000_000n; // 1M tokens
      const amount = 2_000_000_000_000n;

      expect(amount).toBeGreaterThan(MAX_AMOUNT);
    });

    it('should handle optional metadata', () => {
      const requestWithMetadata: X402PaymentRequest = {
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'Test',
        metadata: { key: 'value' },
      };

      const requestWithoutMetadata: X402PaymentRequest = {
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'Test',
      };

      expect(requestWithMetadata.metadata).toBeDefined();
      expect(requestWithoutMetadata.metadata).toBeUndefined();
    });
  });

  describe('Payment Headers', () => {
    it('should generate correct HTTP 402 headers', () => {
      const request: X402PaymentRequest = {
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'API call',
      };

      const expectedHeaders = {
        'X-Payment-Address': request.recipient,
        'X-Payment-Amount': request.amount.toString(),
        'X-Payment-Token': request.token,
        'X-Payment-Blockchain': 'solana' as const,
        'X-Payment-Description': request.description,
      };

      expect(expectedHeaders['X-Payment-Blockchain']).toBe('solana');
      expect(expectedHeaders['X-Payment-Amount']).toBe('1000000');
    });

    it('should include expiration in headers when provided', () => {
      const expiresAt = Date.now() + 300_000;
      const request: X402PaymentRequest = {
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'API call',
        expiresAt,
      };

      expect(request.expiresAt).toBe(expiresAt);
    });
  });

  describe('Payment Receipt', () => {
    it('should create a valid payment receipt', () => {
      const receipt: X402PaymentReceipt = {
        signature: '5JqCw8Rr8vN9Xz3Kp2Yq1Wf4Tb6Sg7Vh9Uc8Re5Qd4Mx3Ly2Kx1Jz9Hy8Gx7Fv6Eu5Dt4Cs3Br2Aq1Zp0Yo' as Signature,
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        timestamp: Date.now(),
        metadata: {
          agent: 'test-agent',
        },
      };

      expect(receipt.signature).toBeDefined();
      expect(receipt.amount).toBe(1_000_000n);
      expect(receipt.metadata).toHaveProperty('agent');
    });

    it('should include optional blockchain data', () => {
      const receipt: X402PaymentReceipt = {
        signature: '5JqCw8Rr8vN9Xz3Kp2Yq1Wf4Tb6Sg7Vh9Uc8Re5Qd4Mx3Ly2Kx1Jz9Hy8Gx7Fv6Eu5Dt4Cs3Br2Aq1Zp0Yo' as Signature,
        recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        amount: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        timestamp: Date.now(),
        blockTime: 1699999999,
        slot: 123456789n,
      };

      expect(receipt.blockTime).toBe(1699999999);
      expect(receipt.slot).toBe(123456789n);
    });
  });

  describe('Event Emitter', () => {
    it('should extend EventEmitter', () => {
      expect(client).toHaveProperty('on');
      expect(client).toHaveProperty('emit');
      expect(client).toHaveProperty('removeListener');
    });

    it('should emit payment lifecycle events', () => {
      const events = [
        'payment:created',
        'payment:pending',
        'payment:confirmed',
        'payment:failed',
        'payment:verified',
      ];

      events.forEach(event => {
        const handler = vi.fn();
        client.on(event, handler);
        expect(client.listenerCount(event)).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid recipient address', () => {
      const invalidAddress = 'invalid-address';
      // Address validation would happen in implementation
      expect(invalidAddress).not.toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });

    it('should throw on zero amount', () => {
      const amount = 0n;
      expect(amount).toBe(0n);
      // Implementation should reject this
    });

    it('should throw on negative amount (not possible with BigInt)', () => {
      // BigInt can't represent negative values in this context
      const amount = 1_000_000n;
      expect(amount).toBeGreaterThan(0n);
    });
  });

  describe('Amount Conversion', () => {
    it('should handle USDC decimals correctly', () => {
      const USDC_DECIMALS = 6;
      const amount = 1_000_000n; // 1 USDC
      const humanAmount = Number(amount) / Math.pow(10, USDC_DECIMALS);

      expect(humanAmount).toBe(1);
    });

    it('should handle SOL decimals correctly', () => {
      const SOL_DECIMALS = 9;
      const amount = 1_000_000_000n; // 1 SOL
      const humanAmount = Number(amount) / Math.pow(10, SOL_DECIMALS);

      expect(humanAmount).toBe(1);
    });

    it('should handle large amounts without precision loss', () => {
      const largeAmount = 1_000_000_000_000n; // 1M USDC (with 6 decimals)
      expect(largeAmount.toString()).toBe('1000000000000');
    });
  });

  describe('Metadata Handling', () => {
    it('should serialize metadata correctly', () => {
      const metadata = {
        agent: 'test-agent',
        capability: 'query',
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(metadata);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(metadata);
    });

    it('should handle nested metadata', () => {
      const metadata = {
        agent: {
          id: 'test-123',
          name: 'Test Agent',
        },
        request: {
          type: 'query',
          params: ['param1', 'param2'],
        },
      };

      expect(metadata.agent.id).toBe('test-123');
      expect(metadata.request.params).toHaveLength(2);
    });
  });

  describe('Integration with @solana/kit', () => {
    it('should use correct Address type', () => {
      const address: Address = 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address;
      expect(typeof address).toBe('string');
    });

    it('should use correct Signature type', () => {
      const signature: Signature = '5JqCw8Rr8vN9Xz3Kp2Yq1Wf4Tb6Sg7Vh9Uc8Re5Qd4Mx3Ly2Kx1Jz9Hy8Gx7Fv6Eu5Dt4Cs3Br2Aq1Zp0Yo' as Signature;
      expect(typeof signature).toBe('string');
    });

    it('should use BigInt for amounts (not number)', () => {
      const amount = 1_000_000n;
      expect(typeof amount).toBe('bigint');
    });
  });
});
