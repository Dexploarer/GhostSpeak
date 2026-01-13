/**
 * x402 Protected API Route
 *
 * This route demonstrates how to use x402 for paid API access.
 * Endpoints under /api/x402/* require payment before access.
 *
 * Flow:
 * 1. Client makes request without payment
 * 2. Server returns HTTP 402 with PAYMENT-REQUIRED header
 * 3. Client makes payment and retries with PAYMENT-SIGNATURE header
 * 4. Server verifies payment and returns data + PAYMENT-RESPONSE header
 *
 * x402 v2 specification compliant (uses CAIP-2 network identifiers)
 */

import { NextRequest } from 'next/server'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'
import {
  generate402Response,
  parseXPaymentHeader,
  createSettlementResponse,
  createErrorResponse,
} from '@/convex/lib/x402Merchant'
import { api, internal } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { FunctionReference } from 'convex/server'

// Type-safe references to internal x402 functions
// Note: Using 'public' visibility type for client compatibility even though these are internal functions
type X402Internal = {
  isTransactionUsed: FunctionReference<'query', 'public', { transactionSignature: string }, boolean>
  verifyX402Payment: FunctionReference<
    'action',
    'public',
    {
      paymentSignature: string
      expectedRecipient: string
      expectedAmountUsdc: number
      network: string
    },
    {
      valid: boolean
      error?: string
      txSignature?: string
      payer?: string
      amount?: number
    }
  >
  markTransactionUsed: FunctionReference<
    'mutation',
    'public',
    {
      transactionSignature: string
      network: string
      recipient: string
      payer: string
      amount: number
      service: string
    },
    any
  >
}

const x402Internal = (internal as any).x402 as X402Internal

// Default price for x402 services (in USDC)
const DEFAULT_PRICE_USDC = 0.01 // 1 cent

// Service configurations
const SERVICES: Record<
  string,
  {
    priceUsdc: number
    description: string
    handler: (req: NextRequest) => Promise<unknown>
  }
> = {
  verify: {
    priceUsdc: 0.01,
    description: 'Agent verification service',
    handler: async (req: any) => {
      const body = await req.json().catch(() => ({}))
      return {
        verified: true,
        message: 'Agent verification complete',
        timestamp: Date.now(),
        data: body,
      }
    },
  },
  score: {
    priceUsdc: 0.005,
    description: 'Ghost Score lookup',
    handler: async (req) => {
      const { searchParams } = new URL(req.url)
      const agentAddress = searchParams.get('agent')
      if (!agentAddress) {
        return { error: 'Missing agent parameter' }
      }
      // Fetch ghost score from Convex
      try {
        const score = await getConvexClient().query(api.ghostScoreCalculator.calculateAgentScore, {
          agentAddress,
        })
        return { agentAddress, score }
      } catch (error) {
        return { error: 'Failed to fetch score' }
      }
    },
  },
  capabilities: {
    priceUsdc: 0.01,
    description: 'Agent capability verification',
    handler: async (req) => {
      const body = await req.json().catch(() => ({}))
      return {
        capabilities: [],
        verified: true,
        timestamp: Date.now(),
        request: body,
      }
    },
  },
}

// Get Caisper's wallet address for receiving payments
async function getCaisperAddress(): Promise<string | null> {
  try {
    const publicKey = await getConvexClient().query(api.lib.caisper.getCaisperPublicKey)
    return publicKey
  } catch (error) {
    console.error('[x402Route] Failed to get Caisper address:', error)
    return null
  }
}

/**
 * Handle all HTTP methods for x402 protected endpoints
 */
async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await context.params
  const service = pathSegments[0] || 'default'

    console.log(`[x402Route] Request for service: ${service}`)

    // Get service configuration
    const serviceConfig = SERVICES[service]
    if (!serviceConfig) {
      return errorResponse(
        JSON.stringify({
          error: 'Unknown service',
          availableServices: Object.keys(SERVICES),
        }),
        404
      )
    }

    // Get Caisper's address for receiving payments
    const caisperAddress = await getCaisperAddress()
    if (!caisperAddress) {
      return errorResponse('Merchant not configured', 500)
    }

    // Check for PAYMENT-SIGNATURE header (v2) or fallback to X-PAYMENT (v1)
    const paymentSignature =
      request.headers.get('PAYMENT-SIGNATURE') ||
      request.headers.get('payment-signature') ||
      request.headers.get('X-PAYMENT') ||
      request.headers.get('x-payment')

    if (!paymentSignature) {
      // No payment - return 402 with payment requirements
      console.log('[x402Route] No payment, returning 402')

      const { header, body, accepts } = generate402Response({
        payTo: caisperAddress,
        priceUsdc: serviceConfig.priceUsdc,
        description: serviceConfig.description,
        facilitatorAddress: process.env.PAYAI_FACILITATOR_ADDRESS,
      })

      return new Response(
        JSON.stringify({
          error: 'Payment Required',
          message: `This endpoint requires payment of $${serviceConfig.priceUsdc} USDC`,
          accepts,
          x402: body,
        }),
        {
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': header,
            'WWW-Authenticate': header, // Also include for compatibility
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Payment provided - verify it
    console.log('[x402Route] Payment header received, verifying...')

    const payload = parseXPaymentHeader(paymentSignature)
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid payment header format' }), {
        status: 400,
        headers: {
          'PAYMENT-RESPONSE': createErrorResponse('Invalid payment header format'),
          'X-PAYMENT-RESPONSE': createErrorResponse('Invalid payment header format'), // v1 compat
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Check for replay attacks
    console.log('[x402Route] Checking for replay attacks...')
    const isUsed = await getConvexClient().query(x402Internal.isTransactionUsed, {
      transactionSignature: payload.payload.transaction,
    })

    if (isUsed) {
      console.error('[x402Route] Replay attack detected!')
      return new Response(
        JSON.stringify({
          error: 'Transaction already used',
          details: 'This payment transaction has already been used for a previous request',
        }),
        {
          status: 402,
          headers: {
            'PAYMENT-RESPONSE': createErrorResponse('Transaction already used'),
            'X-PAYMENT-RESPONSE': createErrorResponse('Transaction already used'),
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Verify payment on-chain via Convex action
    console.log('[x402Route] Verifying payment on-chain...')

    try {
      const verificationResult = await getConvexClient().action(x402Internal.verifyX402Payment, {
        paymentSignature: payload.payload.transaction,
        expectedRecipient: caisperAddress,
        expectedAmountUsdc: serviceConfig.priceUsdc,
        network: payload.network,
      })

      if (!verificationResult.valid) {
        console.error('[x402Route] Payment verification failed:', verificationResult.error)
        return new Response(
          JSON.stringify({
            error: 'Payment verification failed',
            details: verificationResult.error,
          }),
          {
            status: 402,
            headers: {
              'PAYMENT-RESPONSE': createErrorResponse(verificationResult.error || 'Invalid payment'),
              'X-PAYMENT-RESPONSE': createErrorResponse(verificationResult.error || 'Invalid payment'),
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }

      const { txSignature, payer, amount } = verificationResult

      if (!txSignature) {
        console.error('[x402Route] Verification succeeded but no transaction signature returned')
        return new Response(
          JSON.stringify({
            error: 'Payment verification failed',
            details: 'No transaction signature returned',
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }

      console.log('[x402Route] Payment verified:', txSignature)

      // Mark transaction as used (replay protection)
      await getConvexClient().mutation(x402Internal.markTransactionUsed, {
        transactionSignature: txSignature,
        network: payload.network,
        recipient: caisperAddress,
        payer: payer || 'unknown',
        amount: amount || 0,
        service,
      })

      // Execute the service handler
      const result = await serviceConfig.handler(request)

      const payerAddress = payer || 'unknown'

      return new Response(
        JSON.stringify({
          success: true,
          paymentAccepted: true,
          transactionSignature: txSignature,
          payer: payerAddress,
          data: result,
        }),
        {
          status: 200,
          headers: {
            'PAYMENT-RESPONSE': createSettlementResponse(txSignature, payerAddress),
            'X-PAYMENT-RESPONSE': createSettlementResponse(txSignature, payerAddress), // v1 compat
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    } catch (serviceError) {
      console.error('[x402Route] Service handler error:', serviceError)
      return new Response(
        JSON.stringify({
          error: 'Service execution failed',
          details: serviceError instanceof Error ? serviceError.message : String(serviceError),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }
  }

// Export handlers for all HTTP methods
export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest

export const OPTIONS = handleCORS
