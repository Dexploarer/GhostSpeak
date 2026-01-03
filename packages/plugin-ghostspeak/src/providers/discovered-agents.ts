/**
 * Discovered Agents Provider
 *
 * Supplies context about agents discovered on-chain but not yet claimed
 * Allows Caisper to help users find and claim discovered agents
 */

import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core'
import { logger } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'

/**
 * Provider that fetches discovered agents data from Convex
 *
 * This gives the agent context about:
 * - Unclaimed agents discovered on-chain
 * - Agents discovered via x402 payments
 * - External platform ID mappings
 */
export const discoveredAgentsProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Check if we have Convex URL configured
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!convexUrl) {
        logger.warn('NEXT_PUBLIC_CONVEX_URL not set, discovered agents context unavailable')
        return ''
      }

      // Create Convex client
      const client = new ConvexHttpClient(convexUrl)

      // Fetch unclaimed discovered agents (limit 10 most recent)
      const discoveredAgentsQuery = client.query(
        'ghostDiscovery:listDiscoveredAgents' as any,
        { status: 'discovered', limit: 10 }
      )

      // Fetch discovery stats
      const statsQuery = client.query('ghostDiscovery:getDiscoveryStats' as any, {})

      const [discoveredAgents, stats] = await Promise.all([
        discoveredAgentsQuery,
        statsQuery,
      ])

      // Format discovered agents for context
      const agentsContext = Array.isArray(discoveredAgents) && discoveredAgents.length > 0
        ? discoveredAgents
            .map((agent: any) => {
              const discoveryDate = new Date(agent.firstSeenTimestamp).toLocaleDateString()
              const source = agent.discoverySource || 'unknown'
              return `- ${agent.ghostAddress.slice(0, 8)}... (discovered ${discoveryDate} via ${source})`
            })
            .join('\n')
        : 'No unclaimed agents currently discovered'

      // Build context string
      return `## Discovered Agents Database

**Total discovered agents**: ${(stats as any)?.total || 0}
- Unclaimed: ${(stats as any)?.totalDiscovered || 0}
- Claimed: ${(stats as any)?.totalClaimed || 0}
- Verified: ${(stats as any)?.totalVerified || 0}

**Recent unclaimed agents** (ready to claim):
${agentsContext}

*Note: Users can claim discovered agents by providing ownership proof. Once claimed, agents can register their full identity and start building reputation.*`
    } catch (error) {
      logger.error({ error }, 'Error fetching discovered agents context')
      return ''
    }
  },
}
