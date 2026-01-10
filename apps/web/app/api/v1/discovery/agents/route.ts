/**
 * Centralized Agent Discovery API
 *
 * Provides a registry for mapping wallet addresses to domains and discovering
 * agent service endpoints. This solves the problem of agents discovered via
 * x402 payments (wallet-only) needing to be discoverable by domain.
 *
 * Endpoints:
 * - GET /api/v1/discovery/agents - List all discoverable agents
 * - GET /api/v1/discovery/agents?address={wallet} - Get specific agent's services
 */

import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')
    const status = searchParams.get('status') // 'claimed', 'unclaimed', 'verified'
    const hasEndpoints = searchParams.get('hasEndpoints') // 'true', 'false'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get all discovered agents from Convex
    const allAgents = await fetchQuery(api.ghostDiscovery.listDiscoveredAgents, {})

    // Get all registered endpoints
    const allEndpoints = await fetchQuery(api.observation.listEndpoints, {})

    // Build endpoint map: agentAddress -> endpoints[]
    const endpointsByAgent = new Map<string, typeof allEndpoints>()
    for (const endpoint of allEndpoints) {
      if (!endpointsByAgent.has(endpoint.agentAddress)) {
        endpointsByAgent.set(endpoint.agentAddress, [])
      }
      endpointsByAgent.get(endpoint.agentAddress)!.push(endpoint)
    }

    // Filter for specific agent if requested
    if (address) {
      const agent = allAgents.find((a) => a.ghostAddress === address)
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found', address },
          { status: 404 }
        )
      }

      const endpoints = endpointsByAgent.get(address) || []

      // Format response following x402 discovery pattern
      return NextResponse.json(
        {
          agent: {
            address: agent.ghostAddress,
            name: agent.name,
            description: agent.description,
            domainUrl: agent.domainUrl,
            status: agent.status,
            discoverySource: agent.discoverySource,
            firstSeen: agent.firstSeenTimestamp,
            claimedBy: agent.claimedBy,
          },
          endpoints: endpoints.map((ep) => ({
            name: ep.description || `${ep.method} ${ep.endpoint}`,
            description: ep.description,
            url: ep.endpoint,
            baseUrl: ep.baseUrl,
            endpoint: ep.endpoint,
            method: ep.method,
            category: ep.category,
            priceUsdc: ep.priceUsdc,
            isActive: ep.isActive,
            lastTestedAt: ep.lastTestedAt,
            avgQualityScore: ep.avgQualityScore,
            totalTests: ep.totalTests,
            successfulTests: ep.successfulTests,
          })),
          discoverable: !!agent.domainUrl,
          totalEndpoints: endpoints.length,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // List all agents (with filtering)
    let filteredAgents = allAgents

    // Filter by status
    if (status) {
      filteredAgents = filteredAgents.filter((a) => a.status === status)
    }

    // Filter by endpoint availability
    if (hasEndpoints === 'true') {
      filteredAgents = filteredAgents.filter((a) =>
        endpointsByAgent.has(a.ghostAddress)
      )
    } else if (hasEndpoints === 'false') {
      filteredAgents = filteredAgents.filter(
        (a) => !endpointsByAgent.has(a.ghostAddress)
      )
    }

    // Apply pagination
    const totalCount = filteredAgents.length
    const paginatedAgents = filteredAgents.slice(offset, offset + limit)

    // Format response
    const agents = paginatedAgents.map((agent) => {
      const endpoints = endpointsByAgent.get(agent.ghostAddress) || []
      return {
        address: agent.ghostAddress,
        name: agent.name,
        description: agent.description,
        domainUrl: agent.domainUrl,
        status: agent.status,
        discoverySource: agent.discoverySource,
        firstSeen: agent.firstSeenTimestamp,
        discoverable: !!agent.domainUrl,
        endpointCount: endpoints.length,
        claimedBy: agent.claimedBy,
      }
    })

    return NextResponse.json(
      {
        agents,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        stats: {
          totalAgents: allAgents.length,
          withEndpoints: Array.from(endpointsByAgent.keys()).length,
          withoutEndpoints: allAgents.length - Array.from(endpointsByAgent.keys()).length,
          withDomains: allAgents.filter((a) => a.domainUrl).length,
          claimed: allAgents.filter((a) => a.status === 'claimed').length,
          verified: allAgents.filter((a) => a.status === 'verified').length,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('[Discovery API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch agents',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Register or update agent domain
 *
 * Allows agents to register their domain for endpoint discovery.
 * Requires authentication (wallet signature or session token).
 *
 * Body: { agentAddress: string, domainUrl: string, signature?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentAddress, domainUrl, callerWallet } = body

    if (!agentAddress || !domainUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: agentAddress, domainUrl' },
        { status: 400 }
      )
    }

    // TODO: Implement wallet signature verification
    // For now, we allow registration with optional callerWallet verification

    // Register domain via Convex mutation
    const { fetchMutation } = await import('convex/nextjs')
    const result = await fetchMutation(api.ghostDiscovery.registerAgentDomain, {
      ghostAddress: agentAddress,
      domainUrl,
      callerWallet,
    })

    // Trigger automatic endpoint discovery
    const { fetchAction } = await import('convex/nextjs')
    try {
      const discoveryResult = await fetchAction(
        api.agentEndpointDiscovery.discoverAndRegisterEndpoints,
        {
          agentAddress,
        }
      )

      return NextResponse.json(
        {
          success: true,
          agentAddress: result.ghostAddress,
          domainUrl: result.domainUrl,
          message: result.message,
          discovery: {
            triggered: true,
            discovered: discoveryResult.discovered || 0,
            registered: discoveryResult.registered || 0,
            skipped: discoveryResult.skipped || 0,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    } catch (discoveryError) {
      // Domain registration succeeded but discovery failed (non-blocking)
      console.warn('[Discovery API] Endpoint discovery failed:', discoveryError)
      return NextResponse.json(
        {
          success: true,
          agentAddress: result.ghostAddress,
          domainUrl: result.domainUrl,
          message: result.message,
          discovery: {
            triggered: true,
            error:
              discoveryError instanceof Error
                ? discoveryError.message
                : 'Discovery failed',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }
  } catch (error) {
    console.error('[Discovery API POST] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to register domain',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// CORS support
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
