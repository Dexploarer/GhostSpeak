/**
 * x402 Facilitators API Route
 *
 * GET /api/x402/facilitators - List all facilitators
 */

import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// TYPES
// =====================================================

interface FacilitatorResponse {
  id: string
  name: string
  description?: string
  logo?: string
  website?: string
  networks: string[]
  discoveryUrl?: string
  settleUrl: string
  verifyUrl: string
  enabled: boolean
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latencyMs?: number
  uptimePercent?: number
}

interface ListFacilitatorsResponse {
  facilitators: FacilitatorResponse[]
  total: number
}

// =====================================================
// MOCK DATA
// =====================================================

const MOCK_FACILITATORS: FacilitatorResponse[] = [
  {
    id: 'ghostspeak',
    name: 'GhostSpeak',
    description: 'GhostSpeak native Solana x402 facilitator with escrow support',
    logo: 'https://ghostspeak.ai/favicon.ico',
    website: 'https://ghostspeak.ai',
    networks: ['solana'],
    discoveryUrl: 'https://api.ghostspeak.ai/x402/discover',
    settleUrl: 'https://api.ghostspeak.ai/x402/settle',
    verifyUrl: 'https://api.ghostspeak.ai/x402/verify',
    enabled: true,
    healthStatus: 'healthy',
    latencyMs: 45,
    uptimePercent: 99.9,
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    description: 'Coinbase Developer Platform x402 facilitator',
    logo: 'https://www.coinbase.com/favicon.ico',
    website: 'https://www.coinbase.com/developer-platform',
    networks: ['base', 'solana', 'polygon'],
    discoveryUrl: 'https://api.x402.org/discover',
    settleUrl: 'https://api.x402.org/settle',
    verifyUrl: 'https://api.x402.org/verify',
    enabled: true,
    healthStatus: 'healthy',
    latencyMs: 120,
    uptimePercent: 99.5,
  },
  {
    id: 'thirdweb',
    name: 'ThirdWeb',
    description: 'ThirdWeb x402 payment facilitator',
    logo: 'https://thirdweb.com/favicon.ico',
    website: 'https://thirdweb.com',
    networks: ['base', 'polygon', 'arbitrum'],
    settleUrl: 'https://pay.thirdweb.com/x402/settle',
    verifyUrl: 'https://pay.thirdweb.com/x402/verify',
    enabled: true,
    healthStatus: 'healthy',
    latencyMs: 85,
    uptimePercent: 99.2,
  },
  {
    id: 'payai',
    name: 'PayAI',
    description: 'PayAI micropayment facilitator for AI services',
    logo: 'https://payai.network/favicon.ico',
    website: 'https://payai.network',
    networks: ['solana', 'base'],
    discoveryUrl: 'https://api.payai.network/x402/resources',
    settleUrl: 'https://api.payai.network/x402/settle',
    verifyUrl: 'https://api.payai.network/x402/verify',
    enabled: true,
    healthStatus: 'healthy',
    latencyMs: 95,
    uptimePercent: 98.8,
  },
  {
    id: 'aurracloud',
    name: 'AurraCloud',
    description: 'AurraCloud AI agent payment facilitator',
    logo: 'https://aurra.cloud/favicon.ico',
    website: 'https://aurra.cloud',
    networks: ['base', 'solana'],
    discoveryUrl: 'https://api.aurra.cloud/v1/x402/discover',
    settleUrl: 'https://api.aurra.cloud/v1/x402/settle',
    verifyUrl: 'https://api.aurra.cloud/v1/x402/verify',
    enabled: true,
    healthStatus: 'degraded',
    latencyMs: 250,
    uptimePercent: 97.5,
  },
  {
    id: 'x402scan-auto',
    name: 'x402scan Auto',
    description: 'x402scan load-balancing proxy facilitator',
    logo: 'https://x402scan.com/favicon.ico',
    website: 'https://x402scan.com',
    networks: ['base', 'solana', 'polygon'],
    discoveryUrl: 'https://facilitators.x402scan.com/discover',
    settleUrl: 'https://facilitators.x402scan.com/settle',
    verifyUrl: 'https://facilitators.x402scan.com/verify',
    enabled: true,
    healthStatus: 'healthy',
    latencyMs: 65,
    uptimePercent: 99.7,
  },
]

// =====================================================
// GET HANDLER
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse<ListFacilitatorsResponse>> {
  const searchParams = request.nextUrl.searchParams

  // Parse query parameters
  const network = searchParams.get('network')
  const enabled = searchParams.get('enabled')
  const hasDiscovery = searchParams.get('hasDiscovery')

  // Filter facilitators
  let filtered = [...MOCK_FACILITATORS]

  if (network) {
    filtered = filtered.filter((f) => f.networks.includes(network))
  }

  if (enabled !== null) {
    const enabledFilter = enabled === 'true'
    filtered = filtered.filter((f) => f.enabled === enabledFilter)
  }

  if (hasDiscovery === 'true') {
    filtered = filtered.filter((f) => f.discoveryUrl != null)
  }

  return NextResponse.json({
    facilitators: filtered,
    total: filtered.length,
  })
}
