/**
 * PayAI-Compatible Resource Discovery Endpoint
 *
 * Provides a marketplace-style resource listing compatible with PayAI's
 * /discovery/resources format. This allows GhostSpeak agents to be
 * discoverable in The Bazaar ecosystem.
 *
 * Format follows: https://docs.payai.network/discovery
 */

import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { withMiddleware, jsonResponse, handleCORS } from '@/lib/api/middleware'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ghostspeak.io'

export const GET = withMiddleware(async (request) => {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') // 'verification', 'analytics', etc.
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const network = searchParams.get('network') // 'solana', 'solana-devnet'
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get all registered endpoints from Observatory
  const allEndpoints = await fetchQuery(api.observation.listEndpoints, {})

  // Get all discovered agents for metadata
  const allAgents = await fetchQuery(api.ghostDiscovery.listDiscoveredAgents, {})
  const agentMap = new Map(allAgents.map((a) => [a.ghostAddress, a]))

  // Filter endpoints (use isActive instead of status which doesn't exist)
  let filteredEndpoints = allEndpoints.filter((ep) => ep.isActive !== false)

  if (category) {
    filteredEndpoints = filteredEndpoints.filter((ep) => ep.category === category)
  }

  if (minPrice) {
    const min = parseFloat(minPrice)
    filteredEndpoints = filteredEndpoints.filter((ep) => ep.priceUsdc >= min)
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice)
    filteredEndpoints = filteredEndpoints.filter((ep) => ep.priceUsdc <= max)
  }

  // Apply pagination
  const totalCount = filteredEndpoints.length
  const paginatedEndpoints = filteredEndpoints.slice(offset, offset + limit)

  // Format as PayAI-compatible resources
  const resources = paginatedEndpoints.map((endpoint) => {
    const agent = agentMap.get(endpoint.agentAddress)
    const amountMicroUsdc = Math.floor(endpoint.priceUsdc * 1_000_000)

    return {
      // Resource identification
      id: endpoint._id,
      name: endpoint.description || `${endpoint.method} ${endpoint.endpoint}`,
      description: endpoint.description || `API endpoint: ${endpoint.endpoint}`,
      category: endpoint.category || 'other',
      type: 'api-endpoint',

      // Provider information
      provider: {
        name: agent?.name || 'Unknown Agent',
        address: endpoint.agentAddress,
        status: agent?.status || 'discovered',
        website: agent?.domainUrl ? `https://${agent.domainUrl}` : BASE_URL,
      },

      // Endpoint details
      endpoint: {
        url: endpoint.endpoint,
        baseUrl: endpoint.baseUrl,
        method: endpoint.method,
        discoveryUrl: agent?.domainUrl
          ? `https://${agent.domainUrl}/.well-known/x402.json`
          : `${BASE_URL}/.well-known/x402.json`,
      },

      // Pricing (x402 v2 format)
      price: endpoint.priceUsdc,
      priceUsdc: endpoint.priceUsdc,
      amount: amountMicroUsdc.toString(),

      // Payment configuration
      accepts: [
        {
          scheme: 'exact',
          network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Mainnet
          asset: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501', // USDC
          payTo: endpoint.agentAddress,
          maxAmountRequired: amountMicroUsdc.toString(),
          extra: {
            feePayer:
              process.env.PAYAI_FACILITATOR_ADDRESS ||
              '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
          },
        },
        {
          scheme: 'exact',
          network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', // Devnet
          asset: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/slip44:501',
          payTo: endpoint.agentAddress,
          maxAmountRequired: amountMicroUsdc.toString(),
          extra: {
            feePayer:
              process.env.PAYAI_FACILITATOR_ADDRESS ||
              '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
          },
        },
      ],

      // Quality metrics
      quality: {
        score: endpoint.avgQualityScore,
        totalTests: endpoint.totalTests || 0,
        successfulTests: endpoint.successfulTests || 0,
        successRate:
          (endpoint.totalTests || 0) > 0
            ? Math.round(((endpoint.successfulTests || 0) / (endpoint.totalTests || 1)) * 100)
            : 0,
        lastTested: endpoint.lastTestedAt,
        avgResponseTime: endpoint.avgResponseTimeMs,
      },

      // Observatory link
      observatoryUrl: `${BASE_URL}/observatory?agent=${endpoint.agentAddress}`,

      // Metadata
      isActive: endpoint.isActive,
      createdAt: endpoint._creationTime,
      updatedAt: endpoint.lastTestedAt || endpoint._creationTime,
    }
  })

  // Aggregate categories for discovery
  const categories = Array.from(new Set(allEndpoints.map((ep) => ep.category).filter(Boolean)))

  return jsonResponse(
    {
      resources,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      filters: {
        categories,
        priceRange: {
          min: Math.min(...allEndpoints.map((ep) => ep.priceUsdc)),
          max: Math.max(...allEndpoints.map((ep) => ep.priceUsdc)),
        },
        networks: ['solana', 'solana-devnet'],
      },
      metadata: {
        registry: 'GhostSpeak Observatory',
        description: 'On-chain reputation and trust verification for AI agents on Solana',
        version: '2.0',
        discoveryUrl: `${BASE_URL}/.well-known/x402.json`,
        apiUrl: `${BASE_URL}/api/v1/discovery`,
        updatedAt: new Date().toISOString(),
      },
    },
    { cache: true }
  )
})

export const OPTIONS = handleCORS
