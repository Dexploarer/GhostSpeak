/**
 * Catch-all API Route
 *
 * Handles any unmatched API routes with proper 404 responses
 * and wide event logging.
 */

import { NextRequest } from 'next/server'
import { completeWideEvent } from '@/lib/logging/wide-event'

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = `/api/${params.slug.join('/')}`

  completeWideEvent((request as any).wideEvent, {
    statusCode: 404,
    durationMs: Date.now() - (request as any).wideEvent?.timestamp ? new Date((request as any).wideEvent.timestamp).getTime() : Date.now(),
    error: {
      type: 'NotFoundError',
      code: 'ENDPOINT_NOT_FOUND',
      message: `API endpoint not found: ${path}`,
      retriable: false,
    },
  })

  return Response.json(
    {
      error: 'API endpoint not found',
      path,
      availableEndpoints: [
        '/api/health',
        '/api/v1/health',
        '/api/v1/agent/[address]',
        '/api/agent/chat'
      ]
    },
    { status: 404 }
  )
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = `/api/${params.slug.join('/')}`

  completeWideEvent((request as any).wideEvent, {
    statusCode: 404,
    durationMs: Date.now() - (request as any).wideEvent?.timestamp ? new Date((request as any).wideEvent.timestamp).getTime() : Date.now(),
    error: {
      type: 'NotFoundError',
      code: 'ENDPOINT_NOT_FOUND',
      message: `API endpoint not found: ${path}`,
      retriable: false,
    },
  })

  return Response.json(
    {
      error: 'API endpoint not found',
      path,
      availableEndpoints: [
        '/api/health',
        '/api/v1/health',
        '/api/v1/agent/[address]',
        '/api/agent/chat'
      ]
    },
    { status: 404 }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}