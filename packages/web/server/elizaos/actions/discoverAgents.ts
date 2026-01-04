/**
 * Discover Agents Action
 *
 * Web-app-specific action to query Convex for discovered/claimable agents
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const discoverAgentsAction: Action = {
  name: 'DISCOVER_AGENTS',
  description: 'Search for discovered agents that are available to claim on GhostSpeak',

  // Validate: trigger on queries about agents, discovery, claiming, etc.
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content.text.toLowerCase()

    // Match discovery queries (NOT claim actions - those are handled by CLAIM_AGENT)
    const discoveryTriggers = [
      'available',
      'discover',
      'find agents',
      'show agents',
      'list agents',
      'what agents',
      'which agents',
      'any agents',
      'ghosts available',
      'unclaimed',
    ]

    // Don't trigger if user is trying to claim a specific agent
    const isClaimIntent = text.includes('i want to claim') ||
                          text.includes('claim agent') ||
                          text.includes('claim this') ||
                          text.includes('select agent') ||
                          text.includes('choose agent')

    if (isClaimIntent) {
      return false
    }

    return discoveryTriggers.some(trigger => text.includes(trigger))
  },

  // Handler: query Convex and format response
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ) => {
    try {
      // Get Convex client from database adapter
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Query discovered agents
      const agents = await convex.query(api.ghostDiscovery.listDiscoveredAgents, {
        limit: 10,
      })

      if (!agents || agents.length === 0) {
        const response = {
          text: "Hmm, the Ghost Registry is looking pretty empty right now. 👻\n\nNo unclaimed agents detected yet. This could mean:\n- We haven't scanned the blockchain recently\n- All agents have been claimed already (unlikely)\n- The spirit realm is having connectivity issues\n\nTry asking me to check a specific agent's reputation instead, or come back in a bit!",
        }

        if (callback) {
          await callback(response)
        }

        return { success: true, data: response }
      }

      // Format simple text response
      const responseText = `Hold my ectoplasm, pulling up the Ghost Registry... 🔍\n\n**${agents.length} Unclaimed Agent${agents.length > 1 ? 's' : ''} Detected**\n\nClick "Claim Now" next to any agent to get started! 👻`

      // Format agents for UI table
      const formattedAgents = agents.map((agent: any) => ({
        ghostAddress: agent.ghostAddress,
        shortAddress: `${agent.ghostAddress.slice(0, 4)}...${agent.ghostAddress.slice(-4)}`,
        discoveredDate: agent.firstSeenTimestamp
          ? new Date(agent.firstSeenTimestamp).toLocaleDateString()
          : 'Unknown',
        discoverySource: agent.discoverySource || 'blockchain',
        status: agent.status || 'discovered',
        // Claim prompt for button
        claimPrompt: `I want to claim agent ${agent.ghostAddress}`,
      }))

      const response = {
        text: responseText,
        // Metadata for UI rendering
        ui: {
          type: 'agent-list',
          agents: formattedAgents,
          totalCount: agents.length,
        },
      }

      if (callback) {
        await callback(response)
      }

      return {
        success: true,
        data: {
          agents: formattedAgents,
          count: agents.length,
          response: responseText,
        }
      }

    } catch (error) {
      console.error('Error discovering agents:', error)

      const errorResponse = {
        text: "Oof, my ghost senses are malfunctioning. 👻💥\n\nCouldn't access the Ghost Registry right now. The blockchain spirits might be taking a coffee break.\n\nTry asking about a specific agent's reputation instead, or ping me again in a moment!",
      }

      if (callback) {
        await callback(errorResponse)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'What ghosts are available to claim?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Hold my ectoplasm, pulling up the Ghost Registry... 🔍\n\n**3 Unclaimed Agents Detected:**\n\n1. **CodePhantom**\n   Ghost Score: 850/1000 | Status: ✨ Available\n   Address: `4wHjA2a5YC4t...`',
          action: 'DISCOVER_AGENTS',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Are there any claimable agents?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Summoning the Ghost Registry spirits... *rattles chains for effect*\n\nFound 5 unclaimed agents lurking in the blockchain!',
          action: 'DISCOVER_AGENTS',
        },
      },
    ],
  ],
}
