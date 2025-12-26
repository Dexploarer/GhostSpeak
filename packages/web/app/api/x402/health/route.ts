/**
 * x402 Facilitator Health Check Endpoint
 *
 * Returns current health status of the GhostSpeak facilitator.
 *
 * @module api/x402/health
 */

import { NextResponse } from 'next/server'
import { createSolanaRpc } from '@solana/kit'

// =====================================================
// TYPES
// =====================================================

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    name: string
    status: 'up' | 'down' | 'degraded'
    latencyMs?: number
  }[]
  networks: {
    network: string
    status: 'connected' | 'disconnected'
    blockHeight?: number
    latencyMs?: number
  }[]
  features: {
    verification: boolean
    settlement: boolean
    escrow: boolean
    reputation: boolean
    gasless: boolean
    compliance: boolean
  }
}

// =====================================================
// GET - Health Check
// =====================================================

const startTime = Date.now()
const RPC_ENDPOINT = process.env['NEXT_PUBLIC_SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com'
const DEVNET_ENDPOINT = 'https://api.devnet.solana.com'

async function checkSolanaRPC(endpoint: string, network: string): Promise<{
  network: string
  status: 'connected' | 'disconnected'
  blockHeight?: number
  latencyMs?: number
}> {
  const rpcStartTime = Date.now()
  try {
    const rpc = createSolanaRpc(endpoint)
    const slot = await rpc.getSlot().send()
    const latencyMs = Date.now() - rpcStartTime
    return {
      network,
      status: 'connected',
      blockHeight: Number(slot),
      latencyMs,
    }
  } catch (error) {
    console.error(`RPC check failed for ${network}:`, error)
    return {
      network,
      status: 'disconnected',
      latencyMs: Date.now() - rpcStartTime,
    }
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const now = Date.now()
  const uptimeMs = now - startTime

  // Perform real health checks
  const [mainnetCheck, devnetCheck] = await Promise.all([
    checkSolanaRPC(RPC_ENDPOINT, 'solana'),
    checkSolanaRPC(DEVNET_ENDPOINT, 'solana-devnet'),
  ])

  // Determine overall status
  const allConnected = mainnetCheck.status === 'connected' || devnetCheck.status === 'connected'
  const status = allConnected ? 'healthy' : 'unhealthy'

  const health: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: uptimeMs,
    services: [
      { name: 'api', status: 'up', latencyMs: Date.now() - now },
      { name: 'solana-rpc', status: allConnected ? 'up' : 'down', latencyMs: mainnetCheck.latencyMs },
    ],
    networks: [mainnetCheck, devnetCheck],
    features: {
      verification: true,
      settlement: true,
      escrow: true,
      reputation: true,
      gasless: true,
      compliance: true,
    },
  }

  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - now}ms`,
    },
  })
}

