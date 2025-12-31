import { NextResponse } from 'next/server'
import { runHealthChecks, uptimeMonitor } from '@/lib/monitoring/uptime'

// Use Node.js runtime for server wallet crypto operations
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Health check endpoint
 * GET /api/health
 *
 * Returns 200 if all services are healthy, 503 if any are unhealthy
 */
export async function GET() {
  try {
    const healthCheck = await runHealthChecks()

    // Record this check
    await uptimeMonitor.recordCheck()

    const status = healthCheck.healthy ? 200 : 503

    return NextResponse.json(
      {
        ...healthCheck,
        uptime: uptimeMonitor.getUptimeFormatted(),
        successRate: `${uptimeMonitor.getSuccessRate().toFixed(2)}%`,
        averageLatency: uptimeMonitor.getAverageLatency(),
      },
      { status }
    )
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.5.0',
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 503 }
    )
  }
}
