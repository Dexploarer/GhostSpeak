/**
 * x402 Protected API Route
 *
 * This route demonstrates how to use x402 for paid API access.
 * Endpoints under /api/x402/* require payment before access.
 *
 * Flow:
 * 1. Client makes request without payment
 * 2. Server returns HTTP 402 with payment requirements
 * 3. Client makes payment and retries with X-PAYMENT header
 * 4. Server verifies payment and returns data + X-PAYMENT-RESPONSE
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generate402Response,
  parseXPaymentHeader,
  createSettlementResponse,
  createErrorResponse,
} from '@/convex/lib/x402Merchant'
import { ConvexHttpClient } from 'convex/browser'
import { api, internal } from '@/convex/_generated/api'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

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
    handler: async (req) => {
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
        const score = await convex.query(api.ghostScoreCalculator.calculateAgentScore, {
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
    const publicKey = await convex.query(api.lib.caisper.getCaisperPublicKey)
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
  req: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  const pathSegments = params.path || []
  const service = pathSegments[0] || 'default'

  console.log(`[x402Route] Request for service: ${service}`)

  // Get service configuration
  const serviceConfig = SERVICES[service]
  if (!serviceConfig) {
    return NextResponse.json(
      {
        error: 'Unknown service',
        availableServices: Object.keys(SERVICES),
      },
      { status: 404 }
    )
  }

  // Get Caisper's address for receiving payments
  const caisperAddress = await getCaisperAddress()
  if (!caisperAddress) {
    return NextResponse.json({ error: 'Merchant not configured' }, { status: 500 })
  }

  // Check for X-PAYMENT header
  const xPaymentHeader = req.headers.get('X-PAYMENT') || req.headers.get('x-payment')

  if (!xPaymentHeader) {
    // No payment - return 402 with payment requirements
    console.log('[x402Route] No payment, returning 402')

    const { header, body, accepts } = generate402Response({
      payTo: caisperAddress,
      priceUsdc: serviceConfig.priceUsdc,
      description: serviceConfig.description,
      facilitatorAddress: process.env.PAYAI_FACILITATOR_ADDRESS,
    })

    return NextResponse.json(
      {
        error: 'Payment Required',
        message: `This endpoint requires payment of $${serviceConfig.priceUsdc} USDC`,
        accepts,
        x402: body,
      },
      {
        status: 402,
        headers: {
          'WWW-Authenticate': header,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Payment provided - verify it
  console.log('[x402Route] Payment header received, verifying...')

  const payload = parseXPaymentHeader(xPaymentHeader)
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid X-PAYMENT header' },
      {
        status: 400,
        headers: {
          'X-PAYMENT-RESPONSE': createErrorResponse('Invalid X-PAYMENT header format'),
        },
      }
    )
  }

  // For MVP, we trust that the payment is valid if the header parses correctly
  // In production, we would:
  // 1. Decode and verify the transaction
  // 2. Check it transfers correct amount to caisperAddress
  // 3. Forward to facilitator for co-signing
  // 4. Wait for on-chain confirmation

  // TODO: Implement full verification via verifyX402Payment action
  // For now, simulate successful verification
  const mockTxSignature = `x402_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const mockPayer = 'unknown' // Would be extracted from transaction

  console.log('[x402Route] Payment accepted (MVP mode)')

  // Execute the service handler
  try {
    const result = await serviceConfig.handler(req)

    return NextResponse.json(
      {
        success: true,
        paymentAccepted: true,
        transactionSignature: mockTxSignature,
        data: result,
      },
      {
        status: 200,
        headers: {
          'X-PAYMENT-RESPONSE': createSettlementResponse(mockTxSignature, mockPayer),
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[x402Route] Service handler error:', error)
    return NextResponse.json(
      { error: 'Service execution failed' },
      {
        status: 500,
        headers: {
          'X-PAYMENT-RESPONSE': createSettlementResponse(mockTxSignature, mockPayer),
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
