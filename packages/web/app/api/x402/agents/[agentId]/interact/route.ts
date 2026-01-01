/**
 * x402 Agent Interaction Endpoint
 *
 * elizaOS-compatible x402 route for GhostSpeak agents
 * Supports payment-gated AI agent interactions via HTTP 402
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractPaymentHeaders, verifyX402Payment, recordPayment } from '@/lib/x402/verifyPayment'

export const runtime = 'edge'

/**
 * POST /api/x402/agents/:agentId/interact
 *
 * Payment-gated agent interaction endpoint
 * Returns 402 if payment required, executes agent if payment verified
 *
 * TODO: Integrate with actual agent database and execution system
 * For now, this is a proof-of-concept that demonstrates x402 protocol
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ agentId: string }> }
) {
  const params = await props.params
  const { agentId } = params

  try {
    // TODO: Fetch agent configuration from database
    // For now, use mock agent configuration
    const agent = {
      id: agentId,
      name: `Agent ${agentId.slice(0, 8)}`,
      description: 'GhostSpeak AI agent (demo)',
      isActive: true,
      pricingModel: {
        basePrice: 0.01,
      },
      model: 'gpt-4',
    }

    // Extract payment headers (sent by elizaOS gateway or PayAI)
    const paymentHeaders = extractPaymentHeaders(request)

    // If no payment proof, return 402 Payment Required
    if (!paymentHeaders) {
      // Calculate price based on agent configuration
      const priceUsd = agent.pricingModel?.basePrice ?? 0.01
      const priceUsdcMicro = Math.floor(priceUsd * 1_000_000) // Convert to micro-USDC

      return new NextResponse(
        JSON.stringify({
          error: 'Payment Required',
          message: `Interaction with agent ${agent.name} requires payment`,
          agentId,
          agentName: agent.name,
          payment: {
            amount: priceUsdcMicro,
            amountUsd: priceUsd,
            currency: 'USDC',
            network: 'solana',
            merchant: process.env.GHOSTSPEAK_MERCHANT_ADDRESS!,
            facilitator: 'payai',
          },
        }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Solana realm="GhostSpeak", facilitator="payai"`,
            'X-Payment-Amount': String(priceUsdcMicro),
            'X-Payment-Currency': 'USDC',
            'X-Payment-Network': 'solana',
            'X-Payment-Merchant': process.env.GHOSTSPEAK_MERCHANT_ADDRESS!,
            'X-Payment-Facilitator': 'https://payai.io',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Payment-Signature, X-Payment-Amount, X-Payment-Payer',
          },
        }
      )
    }

    // Verify payment signature on-chain
    const startTime = Date.now()
    const verification = await verifyX402Payment(
      paymentHeaders,
      process.env.GHOSTSPEAK_MERCHANT_ADDRESS
    )

    if (!verification.valid) {
      console.warn('[x402] Payment verification failed:', {
        agentId,
        signature: paymentHeaders.signature,
        error: verification.error,
      })

      return NextResponse.json(
        {
          error: 'Payment verification failed',
          message: verification.error ?? 'Invalid payment signature',
          signature: paymentHeaders.signature,
        },
        { status: 403 }
      )
    }

    console.log('[x402] Payment verified:', {
      agentId,
      signature: verification.signature,
      blockTime: verification.transactionData?.blockTime,
      slot: verification.transactionData?.slot,
    })

    // Parse request body
    const body = await request.json()
    const { message, context, sessionId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      )
    }

    // Execute agent interaction
    // TODO: Integrate with actual agent execution system
    // For now, return a mock response structure
    const processingTimeMs = Date.now() - startTime
    const success = true // Will be based on actual agent execution

    const response = {
      agentId,
      agentName: agent.name,
      sessionId: sessionId ?? `session_${Date.now()}`,
      message: {
        role: 'assistant',
        content: `This is a placeholder response from ${agent.name}. Full agent execution coming soon.`,
        timestamp: new Date().toISOString(),
      },
      metadata: {
        model: agent.model ?? 'gpt-4',
        tokensUsed: 150, // Mock value
        processingTimeMs,
      },
      payment: {
        signature: verification.signature!,
        amount: paymentHeaders.amount,
        payer: paymentHeaders.payer,
        verified: true,
        blockTime: verification.transactionData?.blockTime,
        slot: verification.transactionData?.slot,
        timestamp: new Date().toISOString(),
      },
    }

    // Record payment to reputation system
    await recordPayment(agentId, verification, success, processingTimeMs)

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Verified': 'true',
        'X-Session-Id': response.sessionId,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[x402] Agent interaction error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/x402/agents/:agentId/interact
 *
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Payment-Signature, X-Payment-Amount, X-Payment-Payer',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/**
 * GET /api/x402/agents/:agentId/interact
 *
 * Return agent metadata and pricing information
 */
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ agentId: string }> }
) {
  const params = await props.params
  const { agentId } = params

  try {
    // TODO: Fetch agent configuration from database
    // For now, use mock agent configuration
    const agent = {
      id: agentId,
      name: `Agent ${agentId.slice(0, 8)}`,
      description: 'GhostSpeak AI agent (demo)',
      isActive: true,
      pricingModel: {
        basePrice: 0.01,
      },
      model: 'gpt-4',
    }

    const priceUsd = agent.pricingModel.basePrice
    const priceUsdcMicro = Math.floor(priceUsd * 1_000_000)

    return NextResponse.json({
      agentId,
      name: agent.name,
      description: agent.description ?? 'GhostSpeak AI agent',
      isActive: agent.isActive,
      network: 'solana',
      pricing: {
        basePrice: priceUsd,
        basePriceMicro: priceUsdcMicro,
        currency: 'USDC',
        model: 'pay-per-use',
      },
      capabilities: {
        model: agent.model ?? 'gpt-4',
        maxTokens: 4096,
        streaming: false,
        functions: false,
      },
      payment: {
        facilitator: 'payai',
        network: 'solana',
        merchant: process.env.GHOSTSPEAK_MERCHANT_ADDRESS!,
        protocol: 'x402',
      },
    })
  } catch (error) {
    console.error('[x402] Agent metadata error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
