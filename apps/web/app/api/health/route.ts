/**
 * Health Check API - Redirect to v1
 *
 * GET /api/health - Redirects to /api/v1/health
 */

import { NextResponse } from 'next/server'

export async function GET() {
  // Redirect to v1 health check
  return NextResponse.redirect(new URL('/api/v1/health', 'http://localhost:3333'))
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