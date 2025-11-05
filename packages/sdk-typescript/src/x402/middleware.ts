/**
 * HTTP 402 Middleware for AI Agent Services
 *
 * Implements the x402 payment protocol as Express/Fastify middleware.
 * Enables pay-per-request API endpoints.
 *
 * @module X402Middleware
 */

import type { Request, Response, NextFunction } from 'express'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Address } from '@solana/addresses'
import type { X402Client } from './X402Client.js'

// =====================================================
// TYPES
// =====================================================

export interface X402MiddlewareOptions {
  x402Client: X402Client
  requiredPayment: bigint
  token: Address
  description: string
  agentId?: string // Agent ID for on-chain payment recording
  recordPaymentOnChain?: boolean // Whether to call record_x402_payment instruction
  allowBypass?: boolean
  bypassAddresses?: Address[]
  onPaymentVerified?: (signature: string, req: Request) => Promise<void>
  onPaymentFailed?: (error: string, req: Request) => Promise<void>
  onReputationUpdateFailed?: (error: Error) => void // Graceful error handling for reputation updates
}

export interface X402RequestWithPayment extends Request {
  x402Payment?: {
    signature: string
    verified: boolean
    amount: bigint
    token: Address
    responseTimeMs?: number // Response time for analytics
    timestamp: number // Payment timestamp
  }
}

export interface X402FastifyRequest extends FastifyRequest {
  x402Payment?: {
    signature: string
    verified: boolean
    amount: bigint
    token: Address
  }
}

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Express middleware for x402 payment verification
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { createX402Middleware } from '@ghostspeak/sdk'
 *
 * const app = express()
 *
 * app.get('/api/agent/query',
 *   createX402Middleware({
 *     x402Client: client,
 *     requiredPayment: 1000n, // 0.001 USDC
 *     token: USDC_ADDRESS,
 *     description: 'AI agent query'
 *   }),
 *   async (req, res) => {
 *     // Payment verified, process request
 *     const result = await processQuery(req.query)
 *     res.json(result)
 *   }
 * )
 * ```
 */
export function createX402Middleware(options: X402MiddlewareOptions) {
  return async (
    req: X402RequestWithPayment,
    res: Response,
    next: NextFunction
  ) => {
    // Start response time tracking
    const requestStartTime = Date.now()

    const paymentSignature = req.headers['x-payment-signature'] as string | undefined

    // Check bypass conditions
    if (options.allowBypass && shouldBypass(req, options)) {
      return next()
    }

    // Create payment request (needed for both 402 response and verification)
    const paymentRequest = options.x402Client.createPaymentRequest({
      amount: options.requiredPayment,
      token: options.token,
      description: options.description
    })

    // No payment provided - return HTTP 402
    if (!paymentSignature) {
      const headers = options.x402Client.createPaymentHeaders(paymentRequest)

      res.status(402).set(headers).json({
        error: 'Payment Required',
        message: 'This endpoint requires x402 payment',
        code: 'PAYMENT_REQUIRED',
        paymentDetails: {
          address: paymentRequest.recipient,
          amount: paymentRequest.amount.toString(),
          token: paymentRequest.token,
          blockchain: 'solana',
          description: options.description,
          expiresAt: paymentRequest.expiresAt
        },
        documentation: 'https://docs.ghostspeak.ai/x402'
      })
      return
    }

    try {
      // Verify payment
      const verification = await options.x402Client.verifyPaymentDetails({
        signature: paymentSignature,
        expectedRecipient: paymentRequest.recipient,
        expectedAmount: options.requiredPayment,
        expectedToken: options.token
      })

      if (!verification.valid) {
        // Payment verification failed
        if (options.onPaymentFailed) {
          await options.onPaymentFailed(verification.error ?? 'Unknown error', req)
        }

        res.status(402).json({
          error: 'Payment Verification Failed',
          message: verification.error ?? 'Invalid payment',
          code: 'PAYMENT_INVALID'
        })
        return
      }

      // Calculate response time (from start to payment verification)
      const responseTimeMs = Date.now() - requestStartTime

      // Payment verified successfully
      req.x402Payment = {
        signature: paymentSignature,
        verified: true,
        amount: verification.receipt!.amount,
        token: verification.receipt!.token,
        responseTimeMs,
        timestamp: Date.now()
      }

      // Optionally record payment on-chain via record_x402_payment instruction
      if (options.recordPaymentOnChain && options.agentId) {
        try {
          // This would call the record_x402_payment Solana instruction
          // Implementation depends on having a GhostSpeak SDK client with the instruction
          // Example:
          // await options.x402Client.recordPaymentOnChain({
          //   agentId: options.agentId,
          //   amount: verification.receipt!.amount,
          //   tokenMint: verification.receipt!.token,
          //   transactionSignature: paymentSignature,
          //   responseTimeMs
          // })

          // For now, we'll just log that this would happen
          console.log(`[x402] Would record payment on-chain for agent ${options.agentId}`)
        } catch (reputationError) {
          // Gracefully handle reputation/on-chain update failures
          // Don't block the request if reputation update fails
          if (options.onReputationUpdateFailed && reputationError instanceof Error) {
            options.onReputationUpdateFailed(reputationError)
          } else {
            console.error('[x402] Failed to record payment on-chain:', reputationError)
          }
          // Continue processing the request despite reputation update failure
        }
      }

      if (options.onPaymentVerified) {
        await options.onPaymentVerified(paymentSignature, req)
      }

      // Proceed to route handler
      next()
    } catch (error) {
      // Error during verification
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (options.onPaymentFailed) {
        await options.onPaymentFailed(errorMessage, req)
      }

      res.status(500).json({
        error: 'Payment Verification Error',
        message: errorMessage,
        code: 'PAYMENT_VERIFICATION_ERROR'
      })
    }
  }
}

/**
 * Fastify plugin for x402 payment verification
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify'
 * import { x402FastifyPlugin } from '@ghostspeak/sdk'
 *
 * const fastify = Fastify()
 *
 * fastify.register(x402FastifyPlugin, {
 *   x402Client: client,
 *   routes: {
 *     '/api/agent/query': {
 *       payment: 1000n,
 *       token: USDC_ADDRESS,
 *       description: 'AI agent query'
 *     }
 *   }
 * })
 * ```
 */
export function x402FastifyPlugin(
  fastify: FastifyInstance,
  options: {
    x402Client: X402Client
    routes: Record<string, {
      payment: bigint
      token: Address
      description: string
    }>
  }
) {
  fastify.addHook('preHandler', async (request: X402FastifyRequest, reply: FastifyReply) => {
    const route = options.routes[request.url]

    if (!route) {
      // Route not protected by x402
      return
    }

    const paymentSignature = request.headers['x-payment-signature'] as string | undefined

    // Create payment request (needed for both 402 response and verification)
    const paymentRequest = options.x402Client.createPaymentRequest({
      amount: route.payment,
      token: route.token,
      description: route.description
    })

    if (!paymentSignature) {
      const headers = options.x402Client.createPaymentHeaders(paymentRequest)

      reply.code(402).headers(headers).send({
        error: 'Payment Required',
        paymentDetails: {
          address: paymentRequest.recipient,
          amount: paymentRequest.amount.toString(),
          token: paymentRequest.token
        }
      })
      return
    }

    // Verify payment
    const verification = await options.x402Client.verifyPaymentDetails({
      signature: paymentSignature,
      expectedRecipient: paymentRequest.recipient,
      expectedAmount: route.payment,
      expectedToken: route.token
    })

    if (!verification.valid) {
      reply.code(402).send({
        error: 'Payment Verification Failed',
        message: verification.error
      })
      return
    }

    // Add payment info to request
    request.x402Payment = {
      signature: paymentSignature,
      verified: true,
      amount: verification.receipt!.amount,
      token: verification.receipt!.token
    }
  })
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function shouldBypass(
  req: X402RequestWithPayment,
  options: X402MiddlewareOptions
): boolean {
  // Check if requester is in bypass list
  const clientAddress = req.headers['x-client-address'] as string | undefined

  if (clientAddress && options.bypassAddresses) {
    return options.bypassAddresses.includes(clientAddress as Address)
  }

  return false
}

// =====================================================
// RATE LIMITING DECORATOR
// =====================================================

/**
 * Decorator to add rate limiting based on x402 payments
 */
export function withX402RateLimit(options: {
  maxRequestsPerMinute: number
  paymentRequired: bigint
}) {
  const requests = new Map<string, number[]>()

  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const req = args[0] as X402RequestWithPayment
      const res = args[1] as Response

      // Get client IP, checking X-Forwarded-For for proxies
      const forwardedFor = req.headers['x-forwarded-for'] as string | undefined
      const clientIp = forwardedFor?.split(',')[0]?.trim() ?? req.ip ?? 'unknown'
      const clientId = req.x402Payment?.signature ?? clientIp
      const now = Date.now()

      // Clean old requests
      const userRequests = requests.get(clientId) ?? []
      const recentRequests = userRequests.filter(
        timestamp => now - timestamp < 60000
      )

      // Check rate limit
      if (recentRequests.length >= options.maxRequestsPerMinute) {
        res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: `Maximum ${options.maxRequestsPerMinute} requests per minute`,
          paymentRequired: options.paymentRequired.toString()
        })
        return
      }

      // Record request
      recentRequests.push(now)
      requests.set(clientId, recentRequests)

      // Call original method
      return originalMethod.apply(this, args)
    }
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default createX402Middleware
