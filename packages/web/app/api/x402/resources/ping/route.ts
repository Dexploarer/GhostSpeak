/**
 * x402 Resource Ping API Route
 *
 * POST /api/x402/resources/ping - Ping a resource URL to validate x402 response
 */

import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// TYPES
// =====================================================

interface PingRequest {
  url: string
}

interface PingResponse {
  success: boolean
  url: string
  statusCode?: number
  latencyMs: number
  hasValidX402: boolean
  x402Response?: {
    version: string
    accepts: Array<{
      scheme: string
      network: string
      maxAmountRequired: string
      payTo: string
      asset: string
    }>
    inputSchema?: object
    outputSchema?: object
    description?: string
    tags?: string[]
  }
  metadata?: {
    title?: string
    description?: string
    favicon?: string
  }
  error?: string
  parseError?: string
}

// =====================================================
// POST HANDLER
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse<PingResponse>> {
  const startTime = Date.now()

  try {
    const body = (await request.json()) as PingRequest

    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          url: '',
          latencyMs: Date.now() - startTime,
          hasValidX402: false,
          error: 'URL is required',
        },
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(body.url)
    } catch {
      return NextResponse.json(
        {
          success: false,
          url: body.url,
          latencyMs: Date.now() - startTime,
          hasValidX402: false,
          error: 'Invalid URL format',
        },
        { status: 400 }
      )
    }

    // In production, this would actually fetch the URL
    // For now, return mock data based on the URL
    const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 100)

    // Simulate different responses based on URL
    if (
      body.url.includes('ghostspeak') ||
      body.url.includes('payai') ||
      body.url.includes('example')
    ) {
      return NextResponse.json({
        success: true,
        url: body.url,
        statusCode: 402,
        latencyMs,
        hasValidX402: true,
        x402Response: {
          version: '1.0',
          accepts: [
            {
              scheme: 'exact',
              network: 'solana',
              maxAmountRequired: '1000000',
              payTo: 'GHOSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
              asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
          ],
          description: 'AI-powered API endpoint',
          tags: ['ai', 'text', 'generation'],
        },
        metadata: {
          title: 'AI API Service',
          description: 'Advanced AI capabilities with x402 payments',
          favicon: `${parsedUrl.origin}/favicon.ico`,
        },
      })
    }

    // Simulate invalid x402 response
    if (body.url.includes('invalid')) {
      return NextResponse.json({
        success: true,
        url: body.url,
        statusCode: 402,
        latencyMs,
        hasValidX402: false,
        parseError: 'Missing required field: accepts',
      })
    }

    // Simulate non-402 response
    return NextResponse.json({
      success: true,
      url: body.url,
      statusCode: 200,
      latencyMs,
      hasValidX402: false,
      error: 'Resource did not return HTTP 402 status',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        url: '',
        latencyMs: Date.now() - startTime,
        hasValidX402: false,
        error: error instanceof Error ? error.message : 'Failed to ping resource',
      },
      { status: 500 }
    )
  }
}
