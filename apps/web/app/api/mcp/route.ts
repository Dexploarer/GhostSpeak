/**
 * MCP-Compatible API Endpoint
 *
 * Lightweight MCP server that proxies to Convex database
 * No MCP SDK dependencies - just JSON-RPC 2.0 compatible responses
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// JSON-RPC 2.0 response helpers
function jsonRpcSuccess(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// MCP tool handlers
async function handleSearchAgents(args: any) {
  const { status = 'discovered', limit = 20 } = args || {}

  const [agents, stats] = await Promise.all([
    convex.query(api.ghostDiscovery.listDiscoveredAgents, { status, limit }),
    convex.query(api.ghostDiscovery.getDiscoveryStats, {}),
  ])

  return {
    agents: agents.map((agent: any) => ({
      ghostAddress: agent.ghostAddress,
      status: agent.status,
      discoverySource: agent.discoverySource,
      firstSeenTimestamp: agent.firstSeenTimestamp,
      slot: agent.slot,
      facilitatorAddress: agent.facilitatorAddress,
      claimedBy: agent.claimedBy,
      claimedAt: agent.claimedAt,
    })),
    stats,
    count: agents.length,
    timestamp: Date.now(),
  }
}

async function handleClaimAgent(args: any) {
  const { agentAddress, claimedBy } = args

  // Ownership validation
  if (agentAddress.toLowerCase() !== claimedBy.toLowerCase()) {
    throw new Error('Ownership verification failed: You can only claim agents you own')
  }

  // Check if agent exists
  const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
    ghostAddress: agentAddress,
  })

  if (!agent) {
    throw new Error('Agent not found')
  }

  if (agent.status === 'claimed') {
    throw new Error('Agent already claimed')
  }

  // Claim the agent
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
  const stats = await convex.query(api.ghostDiscovery.getDiscoveryStats, {})
  return { stats, timestamp: Date.now() }
}

// Main request handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jsonrpc, id, method, params } = body

    if (jsonrpc !== '2.0') {
      return Response.json(jsonRpcError(id, -32600, 'Invalid Request'), { status: 400 })
    }

    let result: any

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
                },
                required: ['agentAddress', 'claimedBy'],
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
              content: [
                { type: 'text', text: JSON.stringify(await handleClaimAgent(args), null, 2) },
              ],
            }
            break
          case 'get_discovery_stats':
            result = {
              content: [{ type: 'text', text: JSON.stringify(await handleGetStats(), null, 2) }],
            }
            break
          default:
            return Response.json(jsonRpcError(id, -32601, `Unknown tool: ${name}`), { status: 404 })
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
          return Response.json(jsonRpcError(id, -32602, 'Unknown resource'), { status: 404 })
        }
        break

      default:
        return Response.json(jsonRpcError(id, -32601, `Unknown method: ${method}`), { status: 404 })
    }

    return Response.json(jsonRpcSuccess(id, result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('MCP API error:', error)
    return Response.json(
      jsonRpcError(null, -32603, error instanceof Error ? error.message : 'Internal error'),
      { status: 500 }
    )
  }
}

// CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Service discovery
export async function GET() {
  return Response.json(
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
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
