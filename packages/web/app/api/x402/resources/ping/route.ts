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

    // Actually fetch the URL to check for x402 response
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(body.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GhostSpeak-x402-Validator/1.0',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const latencyMs = Date.now() - startTime

      // Check for x402 Payment Required status
      if (response.status === 402) {
        // Try to parse x402 response from WWW-Authenticate header or body
        let x402Data = null
        let parseError: string | undefined

        // Check WWW-Authenticate header (standard x402 location)
        const wwwAuth = response.headers.get('WWW-Authenticate')
        if (wwwAuth) {
          try {
            // Parse Bearer realm with JSON payload
            const match = wwwAuth.match(/Bearer\s+(.+)/i)
            if (match) {
              x402Data = JSON.parse(match[1])
            }
          } catch {
            parseError = 'Failed to parse WWW-Authenticate header'
          }
        }

        // Fall back to body if no header
        if (!x402Data) {
          try {
            const bodyText = await response.text()
            x402Data = JSON.parse(bodyText)
          } catch {
            parseError = parseError || 'Failed to parse response body as JSON'
          }
        }

        // Validate x402 structure
        const hasValidX402 = x402Data && 
          Array.isArray(x402Data.accepts) && 
          x402Data.accepts.length > 0 &&
          x402Data.accepts[0].payTo

        return NextResponse.json({
          success: true,
          url: body.url,
          statusCode: 402,
          latencyMs,
          hasValidX402: Boolean(hasValidX402),
          x402Response: hasValidX402 ? {
            version: x402Data.version || '1.0',
            accepts: x402Data.accepts,
            inputSchema: x402Data.inputSchema,
            outputSchema: x402Data.outputSchema,
            description: x402Data.description,
            tags: x402Data.tags,
          } : undefined,
          parseError: hasValidX402 ? undefined : parseError,
          metadata: {
            title: parsedUrl.hostname,
            description: `x402-enabled endpoint at ${parsedUrl.pathname}`,
            favicon: `${parsedUrl.origin}/favicon.ico`,
          },
        })
      }

      // Non-402 response
      return NextResponse.json({
        success: true,
        url: body.url,
        statusCode: response.status,
        latencyMs,
        hasValidX402: false,
        error: `Resource returned HTTP ${response.status} (expected 402 for x402)`,
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      const errorMessage = fetchError instanceof Error 
        ? fetchError.name === 'AbortError' 
          ? 'Request timed out after 10 seconds'
          : fetchError.message
        : 'Unknown fetch error'

      return NextResponse.json({
        success: false,
        url: body.url,
        latencyMs: Date.now() - startTime,
        hasValidX402: false,
        error: errorMessage,
      })
    }

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

