/**
 * Catch-all API Route
 *
 * Handles any unmatched API routes with proper 404 responses.
 * Wide-event logging has been removed in favor of middleware-based logging.
 */

import { NextRequest } from 'next/server'
import { errorResponse, handleCORS } from '@/lib/api/middleware'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const resolvedParams = await context.params
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const resolvedParams = await context.params
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

export const OPTIONS = handleCORS
