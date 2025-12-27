/**
 * x402 Resources API Route
 *
 * GET /api/x402/resources - List resources with filters (now includes REAL external services)
 * POST /api/x402/resources - Register a new resource
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchAllExternalResources,
  type ExternalResource,
} from '@/lib/x402/fetchExternalResources'

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
  priceUsd?: string
  maxAmount?: string
  facilitatorId?: string
  isActive: boolean
  isVerified: boolean
  isExternal?: boolean
  createdAt?: string
  updatedAt?: string
}

interface ListResourcesResponse {
  resources: ResourceResponse[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  sources: {
    heurist: number
    ghostspeak: number
    other: number
  }
}

interface RegisterResourceRequest {
  url: string
  name?: string
  description?: string
  category?: string
  tags?: string[]
}

// =====================================================
// GHOSTSPEAK NATIVE RESOURCES
// =====================================================

const GHOSTSPEAK_RESOURCES: ResourceResponse[] = [
  {
    id: 'gs_text_generation',
    url: 'https://www.ghostspeak.io/api/v1/generate',
    name: 'GhostSpeak Text Generation',
    description: 'Advanced AI text generation with x402 micropayments and escrow protection',
    category: 'text-generation',
    tags: ['ai', 'text', 'llm', 'ghostspeak', 'escrow'],
    network: 'solana',
    priceUsd: '0.001',
    maxAmount: '1000000',
    facilitatorId: 'ghostspeak',
    isActive: true,
    isVerified: true,
    isExternal: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
]

// =====================================================
// TRANSFORM EXTERNAL TO RESPONSE
// =====================================================

function transformExternalResource(ext: ExternalResource): ResourceResponse {
  return {
    id: ext.id,
    url: ext.url,
    name: ext.name,
    description: ext.description,
    category: ext.category,
    tags: ext.tags,
    network: ext.network,
    priceUsd: ext.priceUsd,
    facilitatorId: ext.facilitator,
    isActive: ext.isActive,
    isVerified: true, // Heurist resources are verified
    isExternal: true,
  }
}

// =====================================================
// GET HANDLER
// =====================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<ListResourcesResponse>> {
  const searchParams = request.nextUrl.searchParams

  // Parse query parameters
  const query = searchParams.get('q') ?? ''
  const network = searchParams.get('network')
  const category = searchParams.get('category')
  const facilitatorId = searchParams.get('facilitator')
  const isActive = searchParams.get('active')
  const externalOnly = searchParams.get('external') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10)

  // Fetch external resources
  const externalResources = await fetchAllExternalResources()
  const transformedExternal = externalResources.map(transformExternalResource)

  // Combine all resources
  let allResources: ResourceResponse[] = externalOnly
    ? transformedExternal
    : [...GHOSTSPEAK_RESOURCES, ...transformedExternal]

  // Apply filters
  if (query) {
    const lowerQuery = query.toLowerCase()
    allResources = allResources.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description?.toLowerCase().includes(lowerQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    )
  }

  if (network) {
    allResources = allResources.filter((r) => r.network === network)
  }

  if (category) {
    allResources = allResources.filter((r) => r.category === category)
  }

  if (facilitatorId) {
    allResources = allResources.filter((r) => r.facilitatorId === facilitatorId)
  }

  if (isActive !== null && isActive !== undefined) {
    const activeFilter = isActive === 'true'
    allResources = allResources.filter((r) => r.isActive === activeFilter)
  }

  // Calculate source counts
  const sources = {
    heurist: allResources.filter((r) => r.facilitatorId === 'heurist').length,
    ghostspeak: allResources.filter((r) => r.facilitatorId === 'ghostspeak').length,
    other: allResources.filter(
      (r) => r.facilitatorId !== 'heurist' && r.facilitatorId !== 'ghostspeak'
    ).length,
  }

  // Paginate
  const total = allResources.length
  const start = (page - 1) * pageSize
  const paginatedResources = allResources.slice(start, start + pageSize)

  return NextResponse.json({
    resources: paginatedResources,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
    sources,
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
