/**
 * MCP-Compatible API Endpoint
 *
 * Lightweight MCP server that proxies to Convex database
 * No MCP SDK dependencies - just JSON-RPC 2.0 compatible responses
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { withMiddleware, jsonResponse, handleCORS } from '@/lib/api/middleware'

// Lazy initialization to avoid build-time errors
let convexClient: ConvexHttpClient | null = null

function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set')
    }
    convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  }
  return convexClient
}

interface SearchAgentsArgs {
  status?: 'discovered' | 'claimed' | 'verified'
  limit?: number
}

interface ClaimAgentArgs {
  agentAddress: string
  claimedBy: string
  signature: string
}

// JSON-RPC 2.0 response helpers
function jsonRpcSuccess(id: string | number | null, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// MCP tool handlers
async function handleSearchAgents(args: SearchAgentsArgs) {
  const { status = 'discovered', limit = 20 } = args || {}
  const safeLimit = Math.min(limit, 20)
  const convex = getConvexClient()

  const [agents, stats] = await Promise.all([
    convex.query(api.ghostDiscovery.listDiscoveredAgents, { status, limit: safeLimit }),
    convex.query(api.ghostDiscovery.getDiscoveryStats, {}),
  ])

  return {
    agents: agents.map((agent) => {
      const typedAgent = agent as {
        ghostAddress: string
        status: string
        discoverySource: string
        firstSeenTimestamp: number
        slot: number
        facilitatorAddress?: string
        claimedBy?: string
        claimedAt?: number
      }
      return {
        ghostAddress: typedAgent.ghostAddress,
        status: typedAgent.status,
        discoverySource: typedAgent.discoverySource,
        firstSeenTimestamp: typedAgent.firstSeenTimestamp,
        slot: typedAgent.slot,
        facilitatorAddress: typedAgent.facilitatorAddress,
        claimedBy: typedAgent.claimedBy,
        claimedAt: typedAgent.claimedAt,
      }
    }),
    stats,
    count: agents.length,
    timestamp: Date.now(),
  }
}

async function handleClaimAgent(args: ClaimAgentArgs) {
  const { agentAddress, claimedBy, signature } = args
  const convex = getConvexClient()

  if (!signature) {
    throw new Error('Signature required: You must sign this request to prove ownership')
  }

  // TODO: [x402] Verify payment/signature here before processing claim
  if (agentAddress.toLowerCase() !== claimedBy.toLowerCase()) {
    throw new Error('Ownership verification failed: You can only claim agents you own')
  }

  const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
    ghostAddress: agentAddress,
  })

  if (!agent) {
    throw new Error('Agent not found')
  }

  if (agent.status === 'claimed') {
    throw new Error('Agent already claimed')
  }

  await convex.mutation(api.ghostDiscovery.claimAgent, {
    ghostAddress: agentAddress,
    claimedBy,
  })

  return {
    success: true,
    agentAddress,
    claimedBy,
    discoverySource: agent.discoverySource,
    firstSeen: agent.firstSeenTimestamp,
    claimedAt: Date.now(),
  }
}

async function handleGetStats() {
  const convex = getConvexClient()
  const stats = await convex.query(api.ghostDiscovery.getDiscoveryStats, {})
  return { stats, timestamp: Date.now() }
}

export const POST = withMiddleware(async (request) => {
  const body = await request.json()
  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== '2.0') {
    return jsonResponse(jsonRpcError(id, -32600, 'Invalid Request'), { status: 400 })
  }

  let result: unknown

  switch (method) {
    case 'tools/list':
      result = {
        tools: [
          {
            name: 'search_discovered_agents',
            description: 'Search for agents discovered on-chain',
            inputSchema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['discovered', 'claimed', 'verified'] },
                limit: { type: 'number', minimum: 1, maximum: 100 },
              },
            },
          },
          {
            name: 'claim_agent',
            description: 'Claim ownership of a discovered agent',
            inputSchema: {
              type: 'object',
              properties: {
                agentAddress: { type: 'string' },
                claimedBy: { type: 'string' },
                signature: {
                  type: 'string',
                  description: 'Cryptographic signature proving ownership',
                },
              },
              required: ['agentAddress', 'claimedBy', 'signature'],
            },
          },
          {
            name: 'get_discovery_stats',
            description: 'Get discovery statistics',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      }
      break

    case 'tools/call':
      const { name, arguments: args } = params

      switch (name) {
        case 'search_discovered_agents':
          result = {
            content: [
              { type: 'text', text: JSON.stringify(await handleSearchAgents(args), null, 2) },
            ],
          }
          break
        case 'claim_agent':
          result = {
            content: [{ type: 'text', text: JSON.stringify(await handleClaimAgent(args), null, 2) }],
          }
          break
        case 'get_discovery_stats':
          result = {
            content: [{ type: 'text', text: JSON.stringify(await handleGetStats(), null, 2) }],
          }
          break
        default:
          return jsonResponse(jsonRpcError(id, -32601, `Unknown tool: ${name}`), { status: 404 })
      }
      break

    case 'resources/list':
      result = {
        resources: [
          {
            uri: 'discovery://stats',
            name: 'Discovery Statistics',
            description: 'Current statistics about agent discovery',
            mimeType: 'application/json',
          },
        ],
      }
      break

    case 'resources/read':
      if (params.uri === 'discovery://stats') {
        const convex = getConvexClient()
        const stats = await convex.query(api.ghostDiscovery.getDiscoveryStats, {})
        result = {
          contents: [
            {
              uri: 'discovery://stats',
              mimeType: 'application/json',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        }
      } else {
        return jsonResponse(jsonRpcError(id, -32602, 'Unknown resource'), { status: 404 })
      }
      break

    default:
      return jsonResponse(jsonRpcError(id, -32601, `Unknown method: ${method}`), { status: 404 })
  }

  return jsonResponse(jsonRpcSuccess(id, result))
})

export const GET = withMiddleware(async () => {
  return jsonResponse(
    {
      name: 'ghostspeak-discovery',
      version: '1.0.0',
      protocol: 'MCP-compatible',
      transport: 'HTTP/JSON-RPC',
      endpoint: '/api/mcp',
      capabilities: {
        tools: ['search_discovered_agents', 'claim_agent', 'get_discovery_stats'],
        resources: ['discovery://stats'],
      },
      documentation: 'https://ghostspeak.ai/docs/mcp',
    },
    { cache: true }
  )
})

export const OPTIONS = handleCORS
