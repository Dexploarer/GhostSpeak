/**
 * GhostSpeak x402 Facilitator REST API
 *
 * Standard REST endpoints matching PayAI's simple interface:
 * - GET  /api/x402           - Facilitator info
 * - POST /api/x402/verify    - Verify payment
 * - POST /api/x402/settle    - Settle payment
 * - GET  /api/x402/list      - List resources (discovery)
 *
 * No API key required for basic operations (like PayAI).
 *
 * @module api/x402
 */

import { NextResponse } from 'next/server'

// =====================================================
// TYPES
// =====================================================

interface FacilitatorInfo {
  name: string
  version: string
  networks: string[]
  features: string[]
  endpoints: {
    verify: string
    settle: string
    list: string
    discover: string
    health: string
  }
  pricing: {
    plan: string
    settlementsPerMonth: number
    requestsPerSecond: number
  }
  uniqueFeatures: {
    escrow: boolean
    reputation: boolean
    disputes: boolean
    privacy: boolean
    workOrders: boolean
    gasless: boolean
    compliance: boolean
  }
}

// =====================================================
// GET - Facilitator Info
// =====================================================

/**
 * Get GhostSpeak facilitator information
 *
 * Returns metadata about the facilitator including:
 * - Supported networks
 * - Available features
 * - API endpoints
 * - Pricing tiers
 *
 * No API key required.
 */
export async function GET(): Promise<NextResponse<FacilitatorInfo>> {
  const info: FacilitatorInfo = {
    name: 'GhostSpeak x402 Facilitator',
    version: '1.0.0',
    networks: [
      'solana',
      'solana-devnet'
      // Future: 'base', 'polygon', etc.
    ],
    features: [
      'x402-payment-verification',
      'x402-payment-settlement',
      'resource-discovery',
      'ai-tool-generation',
      // GhostSpeak exclusive features
      'on-chain-escrow',
      'on-chain-reputation',
      'dispute-resolution',
      'work-orders',
      'milestone-payments',
      'privacy-layer',
      'compressed-agents',
      'gasless-payments',
      'ofac-compliance'
    ],
    endpoints: {
      verify: '/api/x402/verify',
      settle: '/api/x402/settle',
      list: '/api/x402/resources',
      discover: '/api/x402/resources',
      health: '/api/x402/health'
    },
    pricing: {
      plan: 'FREE',
      settlementsPerMonth: 100000,
      requestsPerSecond: 10
    },
    uniqueFeatures: {
      escrow: true,
      reputation: true,
      disputes: true,
      privacy: true,
      workOrders: true,
      gasless: true,
      compliance: true
    }
  }

  return NextResponse.json(info, {
    headers: {
      'X-Facilitator-Name': 'GhostSpeak',
      'X-Facilitator-Version': '1.0.0'
    }
  })
}
