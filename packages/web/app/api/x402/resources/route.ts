/**
 * x402 Resources API Route
 *
 * GET /api/x402/resources - List resources with filters
 * POST /api/x402/resources - Register a new resource
 */

import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// TYPES
// =====================================================

interface ResourceResponse {
  id: string
  url: string
  name: string
  description?: string
  category?: string
  tags: string[]
  network: string
  maxAmount: string
  facilitatorId?: string
  isActive: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

interface ListResourcesResponse {
  resources: ResourceResponse[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

interface RegisterResourceRequest {
  url: string
  name?: string
  description?: string
  category?: string
  tags?: string[]
}

// =====================================================
// MOCK DATA
// =====================================================

const MOCK_RESOURCES: ResourceResponse[] = [
  {
    id: 'res_1',
    url: 'https://api.ghostspeak.ai/v1/generate',
    name: 'GhostSpeak Text Generation',
    description: 'Advanced AI text generation with x402 micropayments',
    category: 'text-generation',
    tags: ['ai', 'text', 'llm', 'gpt'],
    network: 'solana',
    maxAmount: '1000000',
    facilitatorId: 'ghostspeak',
    isActive: true,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z',
  },
  {
    id: 'res_2',
    url: 'https://api.payai.network/image/generate',
    name: 'PayAI Image Generator',
    description: 'Generate images with AI using USDC payments',
    category: 'image-processing',
    tags: ['ai', 'image', 'art'],
    network: 'base',
    maxAmount: '50000000',
    facilitatorId: 'payai',
    isActive: true,
    isVerified: true,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z',
  },
]

// =====================================================
// GET HANDLER
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse<ListResourcesResponse>> {
  const searchParams = request.nextUrl.searchParams

  // Parse query parameters
  const query = searchParams.get('q') ?? ''
  const network = searchParams.get('network')
  const category = searchParams.get('category')
  const facilitatorId = searchParams.get('facilitator')
  const isActive = searchParams.get('active')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)

  // Filter resources
  let filtered = [...MOCK_RESOURCES]

  if (query) {
    const lowerQuery = query.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description?.toLowerCase().includes(lowerQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    )
  }

  if (network) {
    filtered = filtered.filter((r) => r.network === network)
  }

  if (category) {
    filtered = filtered.filter((r) => r.category === category)
  }

  if (facilitatorId) {
    filtered = filtered.filter((r) => r.facilitatorId === facilitatorId)
  }

  if (isActive !== null) {
    const activeFilter = isActive === 'true'
    filtered = filtered.filter((r) => r.isActive === activeFilter)
  }

  // Paginate
  const total = filtered.length
  const start = (page - 1) * pageSize
  const paginatedResources = filtered.slice(start, start + pageSize)

  return NextResponse.json({
    resources: paginatedResources,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  })
}

// =====================================================
// POST HANDLER
// =====================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; resourceId?: string; error?: string }>> {
  try {
    const body = (await request.json()) as RegisterResourceRequest

    // Validate URL
    if (!body.url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    try {
      new URL(body.url)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
    }

    // In production, this would:
    // 1. Ping the URL to validate x402 response
    // 2. Parse the x402 response
    // 3. Scrape origin metadata
    // 4. Store in database

    const resourceId = `res_${Date.now()}`

    return NextResponse.json({
      success: true,
      resourceId,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to register resource' },
      { status: 500 }
    )
  }
}
