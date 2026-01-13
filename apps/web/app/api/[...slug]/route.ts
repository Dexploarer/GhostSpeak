/**
 * Catch-all API Route
 *
 * Handles any unmatched API routes with proper 404 responses.
 * Wide-event logging has been removed in favor of middleware-based logging.
 */

import { withMiddleware, errorResponse, handleCORS } from '@/lib/api/middleware'

export const GET = withMiddleware(
  async (request, { params }: { params: Promise<{ slug: string[] }> }) => {
    const resolvedParams = await params
    const path = `/api/${resolvedParams.slug.join('/')}`

    return errorResponse(
      JSON.stringify({
        error: 'API endpoint not found',
        path,
        availableEndpoints: [
          '/api/health',
          '/api/v1/health',
          '/api/v1/agent/[address]',
          '/api/agent/chat',
        ],
      }),
      404
    )
  }
)

export const POST = withMiddleware(
  async (request, { params }: { params: Promise<{ slug: string[] }> }) => {
    const resolvedParams = await params
    const path = `/api/${resolvedParams.slug.join('/')}`

    return errorResponse(
      JSON.stringify({
        error: 'API endpoint not found',
        path,
        availableEndpoints: [
          '/api/health',
          '/api/v1/health',
          '/api/v1/agent/[address]',
          '/api/agent/chat',
        ],
      }),
      404
    )
  }
)

export const OPTIONS = handleCORS
