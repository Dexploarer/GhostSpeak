/**
 * Next.js Middleware for Wide Event Logging
 *
 * Captures every request and creates a comprehensive wide event
 * with full request context, timing, and outcome.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createRequestEvent, emitWideEvent, WideEvent } from '@/lib/logging/wide-event'

// Extend NextRequest to include our wide event
declare module 'next/server' {
  interface NextRequest {
    wideEvent?: WideEvent
  }
}

/**
 * Extract user context from request (cookies, headers, etc.)
 */
function extractUserContext(request: NextRequest) {
  const cookies = request.cookies

  // Extract user ID from various sources
  const userId = cookies.get('user_id')?.value ||
                 request.headers.get('x-user-id') ||
                 request.headers.get('user-id')

  // Extract wallet address from various sources
  const walletAddress = cookies.get('wallet_address')?.value ||
                       request.headers.get('x-wallet-address') ||
                       request.headers.get('wallet-address')

  // Extract session ID
  const sessionId = cookies.get('session_id')?.value ||
                   request.headers.get('x-session-id') ||
                   cookies.get('__session')?.value

  return {
    userId,
    walletAddress,
    sessionId,
  }
}

/**
 * Extract trace ID from request headers or generate new one
 */
function extractTraceId(request: NextRequest): string {
  return request.headers.get('x-trace-id') ||
         request.headers.get('x-request-id') ||
         request.headers.get('trace-id') ||
         randomUUID()
}

/**
 * Determine if this is an API route that should be logged
 */
function shouldLogRequest(pathname: string): boolean {
  // Skip static assets, Next.js internals
  if (pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.includes('favicon') ||
      pathname.includes('.ico') ||
      pathname.includes('.png') ||
      pathname.includes('.jpg') ||
      pathname.includes('.svg')) {
    return false
  }

  // Log all API routes and important pages
  return pathname.startsWith('/api/') ||
         pathname.includes('/dashboard') ||
         pathname.includes('/caisper') ||
         pathname.includes('/agents')
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Skip logging for non-relevant requests
  if (!shouldLogRequest(pathname)) {
    return NextResponse.next()
  }

  const startTime = Date.now()
  const userContext = extractUserContext(request)
  const traceId = extractTraceId(request)

  // Generate correlation ID for cross-service tracing
  const correlationId = request.headers.get('x-correlation-id') ||
                       `corr_${randomUUID().substring(0, 8)}`

  // Create the wide event
  const wideEvent = createRequestEvent({
    method,
    path: pathname,
    userId: userContext.userId,
    walletAddress: userContext.walletAddress,
    sessionId: userContext.sessionId,
    traceId,
  })

  // Add correlation ID to wide event
  wideEvent.correlation_id = correlationId

  // Attach the event to the request for use in route handlers
  ;(request as any).wideEvent = wideEvent

  // Add trace and correlation IDs to response headers for distributed tracing
  const response = NextResponse.next()
  response.headers.set('x-trace-id', traceId)
  response.headers.set('x-request-id', wideEvent.request_id)
  response.headers.set('x-correlation-id', correlationId)

  // For API routes, let them handle their own event completion
  // For pages, complete the event here
  if (pathname.startsWith('/api/')) {
    // API routes will complete their own events
    return NextResponse.next()
  }

  try {
    // Continue with the request
    const result = await NextResponse.next()

    // Complete the event with success for non-API routes
    emitWideEvent({
      ...wideEvent,
      status_code: result.status,
      duration_ms: Date.now() - startTime,
      outcome: result.status >= 400 ? 'error' : 'success',
    })

    return result

  } catch (error) {
    // Handle and log errors for non-API routes
    const errorEvent = {
      ...wideEvent,
      status_code: 500,
      duration_ms: Date.now() - startTime,
      outcome: 'error' as const,
      error: {
        type: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        stack: error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }

    emitWideEvent(errorEvent)

    // Return error response
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (handled by NextAuth.js)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)',
  ],
}