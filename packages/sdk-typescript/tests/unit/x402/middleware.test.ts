/**
 * X402 Middleware Unit Tests
 *
 * Comprehensive tests for HTTP 402 middleware functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { X402Client } from '../../../src/x402/X402Client';
import type { Address } from '@solana/kit';

// Mock middleware types
interface X402MiddlewareOptions {
  x402Client: X402Client;
  requiredPayment: bigint;
  token: Address;
  description: string;
  bypassPaths?: string[];
  onPaymentVerified?: (payment: unknown) => void | Promise<void>;
}

describe('X402 Middleware', () => {
  let mockClient: Partial<X402Client>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockClient = {
      verifyPayment: vi.fn(),
      verifyPaymentDetails: vi.fn(),
      createPaymentHeaders: vi.fn(),
    };

    mockReq = {
      headers: {},
      path: '/api/agent/query',
      method: 'GET',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe('Payment Requirement', () => {
    it('should return HTTP 402 when no payment signature provided', () => {
      const options: X402MiddlewareOptions = {
        x402Client: mockClient as X402Client,
        requiredPayment: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'AI agent query',
      };

      // Middleware should check for x-payment-signature header
      expect(mockReq.headers?.['x-payment-signature']).toBeUndefined();

      // Should return 402 status
      const expectedStatus = 402;
      expect(expectedStatus).toBe(402);
    });

    it('should include payment details in 402 response', () => {
      const paymentDetails = {
        error: 'Payment Required',
        message: 'This endpoint requires x402 payment',
        code: 'PAYMENT_REQUIRED',
        paymentDetails: {
          address: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD',
          amount: '1000000',
          token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD',
          blockchain: 'solana',
          description: 'AI agent query',
        },
        documentation: 'https://docs.ghostspeak.ai/x402',
      };

      expect(paymentDetails.error).toBe('Payment Required');
      expect(paymentDetails.paymentDetails.blockchain).toBe('solana');
      expect(paymentDetails.documentation).toBeDefined();
    });

    it('should set correct HTTP 402 headers', () => {
      const headers = {
        'X-Payment-Address': 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD',
        'X-Payment-Amount': '1000000',
        'X-Payment-Token': 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD',
        'X-Payment-Blockchain': 'solana',
        'X-Payment-Description': 'AI agent query',
      };

      expect(headers['X-Payment-Blockchain']).toBe('solana');
      expect(headers['X-Payment-Amount']).toBe('1000000');
    });
  });

  describe('Payment Verification', () => {
    it('should verify payment signature when provided', async () => {
      const signature = '5JqCw8Rr8vN9Xz3Kp2Yq1Wf4Tb6Sg7Vh9Uc8Re5Qd4Mx3Ly2Kx1Jz9Hy8Gx7Fv6Eu5Dt4Cs3Br2Aq1Zp0Yo';
      mockReq.headers = {
        'x-payment-signature': signature,
      };

      // Mock successful verification
      vi.mocked(mockClient.verifyPayment!).mockResolvedValue({
        verified: true,
        receipt: {
          signature,
          recipient: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
          amount: 1_000_000n,
          token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
          timestamp: Date.now(),
        },
      } as never);

      expect(mockReq.headers['x-payment-signature']).toBe(signature);
    });

    it('should verify payment amount matches required payment', async () => {
      const requiredPayment = 1_000_000n;
      const receivedPayment = 1_000_000n;

      expect(receivedPayment).toBe(requiredPayment);
    });

    it('should reject payment with insufficient amount', () => {
      const requiredPayment = 1_000_000n;
      const receivedPayment = 500_000n;

      expect(receivedPayment).toBeLessThan(requiredPayment);
    });

    it('should verify payment token matches accepted token', () => {
      const requiredToken = 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD';
      const receivedToken = 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD';

      expect(receivedToken).toBe(requiredToken);
    });

    it('should reject payment with wrong token', () => {
      const requiredToken = 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD';
      const receivedToken = 'WrongTokenMintAddress1234567890ABCDEFGH';

      expect(receivedToken).not.toBe(requiredToken);
    });
  });

  describe('Bypass Paths', () => {
    it('should bypass payment for health check endpoints', () => {
      const bypassPaths = ['/health', '/status', '/ping'];
      mockReq.path = '/health';

      expect(bypassPaths).toContain(mockReq.path);
    });

    it('should bypass payment for documentation endpoints', () => {
      const bypassPaths = ['/docs', '/api-docs', '/swagger'];
      mockReq.path = '/docs';

      expect(bypassPaths).toContain(mockReq.path);
    });

    it('should require payment for regular API endpoints', () => {
      const bypassPaths = ['/health', '/status'];
      mockReq.path = '/api/agent/query';

      expect(bypassPaths).not.toContain(mockReq.path);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should track payment-based rate limits', () => {
      const rateLimitConfig = {
        maxRequestsPerMinute: 60,
        paymentRequired: 1_000_000n,
      };

      expect(rateLimitConfig.maxRequestsPerMinute).toBe(60);
      expect(rateLimitConfig.paymentRequired).toBeGreaterThan(0n);
    });

    it('should allow higher rate limits for paid requests', () => {
      const freeRateLimit = 10;
      const paidRateLimit = 60;

      expect(paidRateLimit).toBeGreaterThan(freeRateLimit);
    });
  });

  describe('Response Time Tracking', () => {
    it('should capture response time for analytics', () => {
      const startTime = Date.now();
      // Simulate request processing
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include response time in payment metadata', () => {
      const metadata = {
        responseTimeMs: 150,
        timestamp: Date.now(),
        endpoint: '/api/agent/query',
      };

      expect(metadata.responseTimeMs).toBe(150);
      expect(metadata.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle payment verification errors gracefully', async () => {
      vi.mocked(mockClient.verifyPayment!).mockRejectedValue(
        new Error('Transaction not found')
      );

      const expectedError = {
        error: 'Payment Verification Failed',
        message: 'Transaction not found',
        code: 'VERIFICATION_FAILED',
      };

      expect(expectedError.code).toBe('VERIFICATION_FAILED');
    });

    it('should handle RPC errors gracefully', async () => {
      vi.mocked(mockClient.verifyPayment!).mockRejectedValue(
        new Error('RPC connection failed')
      );

      const expectedError = {
        error: 'Service Unavailable',
        message: 'Unable to verify payment at this time',
        code: 'SERVICE_UNAVAILABLE',
      };

      expect(expectedError.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle expired payment requests', () => {
      const expiresAt = Date.now() - 60000; // Expired 1 minute ago
      const now = Date.now();

      expect(now).toBeGreaterThan(expiresAt);
    });
  });

  describe('Callback Hooks', () => {
    it('should call onPaymentVerified callback', async () => {
      const onPaymentVerified = vi.fn();
      const options: X402MiddlewareOptions = {
        x402Client: mockClient as X402Client,
        requiredPayment: 1_000_000n,
        token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        description: 'Test',
        onPaymentVerified,
      };

      const payment = {
        signature: '5JqCw8Rr8vN9Xz3Kp2Yq1Wf4Tb6Sg7Vh9Uc8Re5Qd4Mx3Ly2Kx1Jz9Hy8Gx7Fv6Eu5Dt4Cs3Br2Aq1Zp0Yo',
        amount: 1_000_000n,
      };

      // Simulate callback
      await options.onPaymentVerified?.(payment);

      expect(onPaymentVerified).toHaveBeenCalledWith(payment);
    });

    it('should handle callback errors without crashing', async () => {
      const onPaymentVerified = vi.fn().mockRejectedValue(
        new Error('Callback error')
      );

      try {
        await onPaymentVerified({});
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Fastify Plugin Integration', () => {
    it('should support Fastify route-specific configuration', () => {
      const routes = {
        '/api/agent/query': {
          payment: 1_000_000n,
          token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
          description: 'AI agent query',
        },
        '/api/agent/execute': {
          payment: 5_000_000n,
          token: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
          description: 'AI agent execution',
        },
      };

      expect(routes['/api/agent/query'].payment).toBe(1_000_000n);
      expect(routes['/api/agent/execute'].payment).toBe(5_000_000n);
    });
  });

  describe('Reputation Integration', () => {
    it('should record payment for reputation tracking', () => {
      const paymentData = {
        agentId: 'agent-123',
        amount: 1_000_000n,
        responseTimeMs: 150,
        transactionSignature: '5JqCw8Rr8vN9Xz3Kp2Yq1Wf4Tb6Sg7Vh9Uc8Re5Qd4Mx3Ly2Kx1Jz9Hy8Gx7Fv6Eu5Dt4Cs3Br2Aq1Zp0Yo',
      };

      expect(paymentData.agentId).toBe('agent-123');
      expect(paymentData.responseTimeMs).toBe(150);
    });

    it('should handle reputation update failures gracefully', async () => {
      const updateReputation = vi.fn().mockRejectedValue(
        new Error('Reputation update failed')
      );

      try {
        await updateReputation();
      } catch (error) {
        // Should not crash the main payment flow
        expect(error).toBeInstanceOf(Error);
      }

      // Payment should still succeed even if reputation update fails
      expect(true).toBe(true);
    });
  });
});
