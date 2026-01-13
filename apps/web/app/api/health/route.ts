/**
 * Health Check API - Redirect to v1
 *
 * GET /api/health - Redirects to /api/v1/health
 */

import { withMiddleware, handleCORS } from '@/lib/api/middleware'
import { NextResponse } from 'next/server'

export const GET = withMiddleware(async (request) => {
  // Get the origin from the request to handle any port
  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/api/v1/health', url.origin))
})

export const OPTIONS = handleCORS
