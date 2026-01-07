/**
 * Health Check API - Redirect to v1
 *
 * GET /api/health - Redirects to /api/v1/health
 */

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Get the origin from the request to handle any port
  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/api/v1/health', url.origin))
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
