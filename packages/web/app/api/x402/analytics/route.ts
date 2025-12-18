/**
 * x402 Analytics API Route
 *
 * GET /api/x402/analytics - Get time-windowed metrics
 */

import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// TYPES
// =====================================================

type TimeWindow = '1h' | '6h' | '24h' | '3d' | '7d' | '15d' | '30d' | 'all'

interface TimeWindowMetrics {
  window: TimeWindow
  requests: {
    total: number
    success: number
    failure: number
    successRate: number
  }
  latency: {
    p50: number
    p90: number
    p99: number
  }
  statusCodes: {
    '2xx': number
    '3xx': number
    '4xx': number
    '5xx': number
  }
  uptime: {
    percent: number
    outages: number
  }
  payments: {
    volume: string
    count: number
    average: string
    uniquePayers: number
  }
}

interface GlobalMetrics {
  totalResources: number
  activeResources: number
  totalFacilitators: number
  networkBreakdown: Record<string, number>
}

interface AnalyticsResponse {
  global: GlobalMetrics
  metrics: Record<TimeWindow, TimeWindowMetrics>
  topResources: Array<{
    resourceId: string
    name: string
    volume: string
    requests: number
  }>
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generateMockMetrics(window: TimeWindow): TimeWindowMetrics {
  const multiplier: Record<TimeWindow, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '3d': 72,
    '7d': 168,
    '15d': 360,
    '30d': 720,
    all: 2160
  }

  const m = multiplier[window]
  const baseRequests = 100

  return {
    window,
    requests: {
      total: Math.floor(baseRequests * m),
      success: Math.floor(baseRequests * m * 0.95),
      failure: Math.floor(baseRequests * m * 0.05),
      successRate: 95.2
    },
    latency: {
      p50: 120 + Math.random() * 50,
      p90: 350 + Math.random() * 100,
      p99: 800 + Math.random() * 200
    },
    statusCodes: {
      '2xx': Math.floor(baseRequests * m * 0.93),
      '3xx': Math.floor(baseRequests * m * 0.02),
      '4xx': Math.floor(baseRequests * m * 0.03),
      '5xx': Math.floor(baseRequests * m * 0.02)
    },
    uptime: {
      percent: 99.5 - Math.random() * 0.5,
      outages: Math.floor(Math.random() * 3)
    },
    payments: {
      volume: (Math.floor(baseRequests * m * 0.001 * 100) / 100).toString(),
      count: Math.floor(baseRequests * m * 0.8),
      average: '0.00125',
      uniquePayers: Math.floor(baseRequests * m * 0.3)
    }
  }
}

// =====================================================
// GET HANDLER
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse<AnalyticsResponse>> {
  const searchParams = request.nextUrl.searchParams
  const resourceId = searchParams.get('resourceId')
  const window = (searchParams.get('window') as TimeWindow) ?? '24h'

  // Generate metrics for all windows
  const windows: TimeWindow[] = ['1h', '6h', '24h', '3d', '7d', '15d', '30d', 'all']
  const metrics: Record<TimeWindow, TimeWindowMetrics> = {} as Record<TimeWindow, TimeWindowMetrics>

  for (const w of windows) {
    metrics[w] = generateMockMetrics(w)
  }

  return NextResponse.json({
    global: {
      totalResources: 1247,
      activeResources: 1089,
      totalFacilitators: 7,
      networkBreakdown: {
        solana: 523,
        base: 412,
        polygon: 189,
        ethereum: 78,
        arbitrum: 45
      }
    },
    metrics,
    topResources: [
      {
        resourceId: 'res_1',
        name: 'GhostSpeak Text Generation',
        volume: '$12,450',
        requests: 45000
      },
      {
        resourceId: 'res_2',
        name: 'PayAI Image Generator',
        volume: '$8,200',
        requests: 12000
      },
      {
        resourceId: 'res_3',
        name: 'Questflow Workflow Executor',
        volume: '$4,100',
        requests: 5600
      }
    ]
  })
}
