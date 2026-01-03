#!/usr/bin/env node
/**
 * GhostSpeak MCP Server
 *
 * Exposes GhostSpeak agent discovery functionality via Model Context Protocol
 * Compatible with ElizaOS, Claude Desktop, OpenAI, and other MCP clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ConvexHttpClient } from 'convex/browser'
import { z } from 'zod'

// Convex API types (generated from schema)
type ConvexAPI = {
  ghostDiscovery: {
    listDiscoveredAgents: (args: { status?: string; limit?: number }) => Promise<any[]>
    getDiscoveryStats: (args: {}) => Promise<any>
    getDiscoveredAgent: (args: { ghostAddress: string }) => Promise<any>
    claimAgent: (args: { ghostAddress: string; claimedBy: string }) => Promise<any>
  }
}

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
if (!convexUrl) {
  console.error('❌ NEXT_PUBLIC_CONVEX_URL environment variable is required')
  process.exit(1)
}

const convex = new ConvexHttpClient(convexUrl)

// Create MCP server
const server = new Server(
  {
    name: 'ghostspeak-discovery',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

// Tool schemas
const searchAgentsSchema = z.object({
  status: z.enum(['discovered', 'claimed', 'verified']).optional(),
  limit: z.number().min(1).max(100).optional(),
})

const claimAgentSchema = z.object({
  agentAddress: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/),
  claimedBy: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/),
})

const getStatsSchema = z.object({})

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_discovered_agents',
        description:
          'Search for agents discovered on-chain but not yet claimed. These agents have been found through x402 payment transactions, on-chain program logs, or blockchain account scanning.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['discovered', 'claimed', 'verified'],
              description: 'Filter by agent status (default: discovered)',
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Maximum number of agents to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'claim_agent',
        description:
          'Claim ownership of a discovered agent. SECURITY: The agent address must match the authenticated wallet address. Users can only claim agents they own.',
        inputSchema: {
          type: 'object',
          properties: {
            agentAddress: {
              type: 'string',
              pattern: '^[A-HJ-NP-Za-km-z1-9]{32,44}$',
              description: 'Solana public key of the agent to claim',
            },
            claimedBy: {
              type: 'string',
              pattern: '^[A-HJ-NP-Za-km-z1-9]{32,44}$',
              description: 'Solana public key of the wallet claiming the agent',
            },
          },
          required: ['agentAddress', 'claimedBy'],
        },
      },
      {
        name: 'get_discovery_stats',
        description: 'Get current statistics about agent discovery (total, claimed, verified counts)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'search_discovered_agents': {
        const { status = 'discovered', limit = 20 } = searchAgentsSchema.parse(args || {})

        console.error(`🔍 Searching for ${status} agents (limit: ${limit})`)

        const [agents, stats] = await Promise.all([
          convex.query('ghostDiscovery:listDiscoveredAgents' as any, { status, limit }),
          convex.query('ghostDiscovery:getDiscoveryStats' as any, {}),
        ])

        if (!Array.isArray(agents) || agents.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: `No ${status} agents found in the discovery database`,
                    stats: stats || {},
                    agents: [],
                  },
                  null,
                  2
                ),
              },
            ],
          }
        }

        const result = {
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

        console.error(`✅ Found ${agents.length} ${status} agents`)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'claim_agent': {
        const { agentAddress, claimedBy } = claimAgentSchema.parse(args)

        console.error(`🎯 Claiming agent ${agentAddress.slice(0, 8)}... for ${claimedBy.slice(0, 8)}...`)

        // CRITICAL SECURITY: Ownership validation
        // The agent address MUST match the authenticated wallet
        if (agentAddress.toLowerCase() !== claimedBy.toLowerCase()) {
          console.error(
            `❌ Ownership verification failed: ${agentAddress.slice(0, 8)} !== ${claimedBy.slice(0, 8)}`
          )

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Ownership verification failed',
                    message: `You can only claim agents you own. Agent ${agentAddress.slice(0, 8)}... does not match your wallet ${claimedBy.slice(0, 8)}...`,
                    agentAddress,
                    claimedBy,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }

        // Check if agent exists and is unclaimed
        const agent = await convex.query('ghostDiscovery:getDiscoveredAgent' as any, {
          ghostAddress: agentAddress,
        })

        if (!agent) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Agent not found',
                    message: `Agent ${agentAddress.slice(0, 8)}... not found in discovery database`,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }

        if (agent.status === 'claimed') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Agent already claimed',
                    message: `Agent ${agentAddress.slice(0, 8)}... has already been claimed by ${agent.claimedBy?.slice(0, 8)}...`,
                    claimedBy: agent.claimedBy,
                    claimedAt: agent.claimedAt,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }

        // Claim the agent
        const result = await convex.mutation('ghostDiscovery:claimAgent' as any, {
          ghostAddress: agentAddress,
          claimedBy,
        })

        console.error(`✅ Successfully claimed agent ${agentAddress.slice(0, 8)}...`)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Successfully claimed agent ${agentAddress.slice(0, 8)}...`,
                  agentAddress,
                  claimedBy,
                  discoverySource: agent.discoverySource,
                  firstSeen: agent.firstSeenTimestamp,
                  claimedAt: Date.now(),
                  nextSteps: [
                    'Register your agent on-chain with name, description, and capabilities',
                    'Start building Ghost Score by completing jobs',
                    'Enable x402 payments to accept transactions',
                    'Earn verifiable credentials as your reputation grows',
                  ],
                },
                null,
                2
              ),
            },
          ],
        }
      }

      case 'get_discovery_stats': {
        getStatsSchema.parse(args || {})

        console.error('📊 Fetching discovery stats')

        const stats = await convex.query('ghostDiscovery:getDiscoveryStats' as any, {})

        console.error(`✅ Stats: ${JSON.stringify(stats)}`)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  stats,
                  timestamp: Date.now(),
                },
                null,
                2
              ),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    console.error(`❌ Error in tool ${name}:`, error)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              tool: name,
              arguments: args,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    }
  }
})

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'discovery://stats',
        name: 'Discovery Statistics',
        description: 'Current statistics about agent discovery (total, claimed, verified counts)',
        mimeType: 'application/json',
      },
    ],
  }
})

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  if (uri === 'discovery://stats') {
    console.error('📊 Reading discovery stats resource')

    const stats = await convex.query('ghostDiscovery:getDiscoveryStats' as any, {})

    return {
      contents: [
        {
          uri: 'discovery://stats',
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('🚀 GhostSpeak MCP Server running')
  console.error(`📡 Convex URL: ${convexUrl}`)
  console.error(`🔧 Available tools: search_discovered_agents, claim_agent, get_discovery_stats`)
  console.error(`📦 Available resources: discovery://stats`)
}

main().catch((error) => {
  console.error('❌ Fatal error starting MCP server:', error)
  process.exit(1)
})
