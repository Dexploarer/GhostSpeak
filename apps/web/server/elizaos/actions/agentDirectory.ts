/**
 * Agent Directory Action
 *
 * Lists all agents with their endpoints, metadata, and capabilities
 * Combines data from discoveredAgents and observedEndpoints tables
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

interface EndpointInfo {
  endpoint: string
  baseUrl: string
  method: string
  priceUsdc: number
  description: string
  category: string
  totalTests?: number
  successRate?: number
  avgQualityScore?: number
}

interface AgentDirectoryEntry {
  ghostAddress: string
  shortAddress: string
  status: string
  discoverySource: string
  discoveredDate: string
  claimedBy?: string
  // Endpoints and capabilities
  endpoints: EndpointInfo[]
  categories: string[]
  // Aggregated stats
  totalEndpoints: number
  avgPriceUsdc?: number
  avgQualityScore?: number
  // For UI actions
  ghostScorePrompt: string
  vibeCheckPrompt: string
}

export const agentDirectoryAction: Action = {
  name: 'AGENT_DIRECTORY',
  description: 'List all agents with their endpoints, metadata, and capabilities',

  // Validate: trigger on directory/catalog queries
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    const triggers = [
      'agent directory',
      'agent catalog',
      'all agents',
      'list all',
      'show all agents',
      'agent endpoints',
      'what endpoints',
      'what can agents do',
      'agent capabilities',
      'directory of agents',
      'full agent list',
      'agents with endpoints',
    ]

    return triggers.some((trigger) => text.includes(trigger))
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: (response: { text?: string; ui?: Record<string, unknown> }) => Promise<Memory[]>
  ) => {
    try {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Fetch discovered agents and endpoints in parallel
      const [agents, endpoints] = await Promise.all([
        convex.query(api.ghostDiscovery.listDiscoveredAgents, { limit: 50 }),
        convex.query(api.observation.listEndpoints, { limit: 100 }),
      ])

      if ((!agents || agents.length === 0) && (!endpoints || endpoints.length === 0)) {
        const response = {
          text: "The Ghost Registry is empty and no endpoints are being monitored. 👻\n\nEither we haven't discovered any agents yet, or the spirit realm is having connectivity issues. Try again later!",
        }
        if (callback) await callback(response)
        return { success: true, data: { agents: [], count: 0 } }
      }

      // Group endpoints by agent address
      const endpointsByAgent = new Map<string, EndpointInfo[]>()
      for (const ep of endpoints || []) {
        const agentEndpoints = endpointsByAgent.get(ep.agentAddress) || []
        agentEndpoints.push({
          endpoint: ep.endpoint,
          baseUrl: ep.baseUrl,
          method: ep.method,
          priceUsdc: ep.priceUsdc,
          description: ep.description,
          category: ep.category,
          totalTests: ep.totalTests,
          successRate:
            ep.totalTests && ep.successfulTests
              ? Math.round((ep.successfulTests / ep.totalTests) * 100)
              : undefined,
          avgQualityScore: ep.avgQualityScore,
        })
        endpointsByAgent.set(ep.agentAddress, agentEndpoints)
      }

      // Build directory entries
      const directory: AgentDirectoryEntry[] = []

      // Add agents from discoveredAgents
      for (const agent of agents || []) {
        const agentEndpoints = endpointsByAgent.get(agent.ghostAddress) || []
        const categories = [...new Set(agentEndpoints.map((ep) => ep.category))]

        directory.push({
          ghostAddress: agent.ghostAddress,
          shortAddress: `${agent.ghostAddress.slice(0, 6)}...${agent.ghostAddress.slice(-4)}`,
          status: agent.status || 'discovered',
          discoverySource: agent.discoverySource || 'unknown',
          discoveredDate: agent.firstSeenTimestamp
            ? new Date(agent.firstSeenTimestamp).toLocaleDateString()
            : 'Unknown',
          claimedBy: agent.claimedBy,
          endpoints: agentEndpoints,
          categories,
          totalEndpoints: agentEndpoints.length,
          avgPriceUsdc:
            agentEndpoints.length > 0
              ? agentEndpoints.reduce((sum, ep) => sum + ep.priceUsdc, 0) / agentEndpoints.length
              : undefined,
          avgQualityScore:
            agentEndpoints.filter((ep) => ep.avgQualityScore).length > 0
              ? Math.round(
                  agentEndpoints
                    .filter((ep) => ep.avgQualityScore)
                    .reduce((sum, ep) => sum + (ep.avgQualityScore || 0), 0) /
                    agentEndpoints.filter((ep) => ep.avgQualityScore).length
                )
              : undefined,
          ghostScorePrompt: `Ghost score for ${agent.ghostAddress}`,
          vibeCheckPrompt: `Vibe check ${agent.ghostAddress}`,
        })
      }

      // Add agents that only have endpoints (not in discoveredAgents)
      for (const [agentAddress, agentEndpoints] of endpointsByAgent) {
        if (!directory.find((d) => d.ghostAddress === agentAddress)) {
          const categories = [...new Set(agentEndpoints.map((ep) => ep.category))]
          directory.push({
            ghostAddress: agentAddress,
            shortAddress: `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`,
            status: 'monitored',
            discoverySource: 'endpoint_registration',
            discoveredDate: 'Unknown',
            endpoints: agentEndpoints,
            categories,
            totalEndpoints: agentEndpoints.length,
            avgPriceUsdc:
              agentEndpoints.reduce((sum, ep) => sum + ep.priceUsdc, 0) / agentEndpoints.length,
            avgQualityScore:
              agentEndpoints.filter((ep) => ep.avgQualityScore).length > 0
                ? Math.round(
                    agentEndpoints
                      .filter((ep) => ep.avgQualityScore)
                      .reduce((sum, ep) => sum + (ep.avgQualityScore || 0), 0) /
                      agentEndpoints.filter((ep) => ep.avgQualityScore).length
                  )
                : undefined,
            ghostScorePrompt: `Ghost score for ${agentAddress}`,
            vibeCheckPrompt: `Vibe check ${agentAddress}`,
          })
        }
      }

      // Sort by number of endpoints (most active first)
      directory.sort((a, b) => b.totalEndpoints - a.totalEndpoints)

      // Build response text
      let responseText = `📚 **Agent Directory** — ${directory.length} agents found\n\n`

      // Summary stats
      const totalEndpoints = directory.reduce((sum, a) => sum + a.totalEndpoints, 0)
      const agentsWithEndpoints = directory.filter((a) => a.totalEndpoints > 0).length
      responseText += `**Summary:** ${totalEndpoints} endpoints across ${agentsWithEndpoints} monitored agents\n\n`

      // List top agents with endpoints
      const topAgents = directory.filter((a) => a.totalEndpoints > 0).slice(0, 5)
      if (topAgents.length > 0) {
        responseText += `**Top Agents by Endpoints:**\n`
        for (const agent of topAgents) {
          const qualityBadge = agent.avgQualityScore
            ? agent.avgQualityScore >= 80
              ? '🟢'
              : agent.avgQualityScore >= 50
                ? '🟡'
                : '🔴'
            : '⚪'
          responseText += `• \`${agent.shortAddress}\` — ${agent.totalEndpoints} endpoint${agent.totalEndpoints > 1 ? 's' : ''} `
          responseText += `| ${agent.categories.join(', ')} ${qualityBadge}\n`
        }
        responseText += `\n`
      }

      responseText += `Ask me for a **Ghost Score** or **Vibe Check** on any agent to learn more! 👻`

      const response = {
        text: responseText,
        ui: {
          type: 'agent-directory',
          agents: directory,
          totalAgents: directory.length,
          totalEndpoints,
          agentsWithEndpoints,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: {
          agents: directory,
          totalAgents: directory.length,
          totalEndpoints,
        },
      }
    } catch (error) {
      console.error('Error fetching agent directory:', error)

      const errorResponse = {
        text: 'My ghost senses malfunctioned trying to pull the directory. 👻💥\n\nThe registry might be taking a coffee break. Try again in a moment!',
      }

      if (callback) await callback(errorResponse)

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Show me the agent directory' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '📚 **Agent Directory** — 12 agents found\n\n**Top Agents by Endpoints:**\n• `5eLb...ek2` — 3 endpoints | research, market_data 🟢',
          action: 'AGENT_DIRECTORY',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'What can agents do? What endpoints are available?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '📚 **Agent Directory** — Showing monitored agents with their capabilities...',
          action: 'AGENT_DIRECTORY',
        },
      },
    ],
  ],
}
