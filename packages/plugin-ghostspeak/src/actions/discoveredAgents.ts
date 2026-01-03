/**
 * Discovered Agents Actions
 *
 * Search, query, and claim agents discovered on-chain
 */

import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core'
import { logger } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'

/**
 * SEARCH_DISCOVERED_AGENTS Action
 *
 * Search and list agents discovered on-chain that haven't been claimed yet
 */
export const searchDiscoveredAgentsAction: Action = {
  name: 'SEARCH_DISCOVERED_AGENTS',
  similes: ['FIND_AGENTS', 'LIST_DISCOVERED_AGENTS', 'SHOW_UNCLAIMED_AGENTS', 'BROWSE_AGENTS'],
  description: `Search for agents discovered on-chain but not yet claimed. These agents have been found through:
- x402 payment transactions
- On-chain program logs
- Blockchain account scanning

Unclaimed agents can be claimed by their owners to establish full GhostSpeak identity.`,

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || ''

    // Matches queries about discovering/finding/listing agents
    const hasSearchIntent =
      text.includes('search') ||
      text.includes('find') ||
      text.includes('list') ||
      text.includes('show') ||
      text.includes('what') ||
      text.includes('who') ||
      text.includes('which')

    const hasAgentTopic =
      text.includes('discovered') ||
      text.includes('unclaimed') ||
      text.includes('claimable') ||
      text.includes('available') ||
      (text.includes('agent') && (text.includes('available') || text.includes('claimable') || text.includes('unclaimed')))

    return hasSearchIntent && hasAgentTopic
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      // Get Convex URL
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!convexUrl) {
        throw new Error('NEXT_PUBLIC_CONVEX_URL not configured')
      }

      // Create Convex client
      const client = new ConvexHttpClient(convexUrl)

      // Parse search options from message
      const text = message.content.text?.toLowerCase() || ''
      const limit = text.includes('all') ? 100 : 20

      // Fetch discovered agents
      const discoveredAgents = await client.query(
        'ghostDiscovery:listDiscoveredAgents' as any,
        { status: 'discovered', limit }
      )

      // Fetch stats
      const stats = await client.query('ghostDiscovery:getDiscoveryStats' as any, {})

      if (!Array.isArray(discoveredAgents) || discoveredAgents.length === 0) {
        const noAgentsMsg = `No unclaimed agents found in the discovery database.

**Discovery Stats:**
- Total discovered: ${(stats as any)?.total || 0}
- Claimed: ${(stats as any)?.totalClaimed || 0}
- Verified: ${(stats as any)?.totalVerified || 0}

All discovered agents have been claimed! Check back later as the blockchain indexer continues scanning for new agents.`

        if (callback) {
          await callback({
            text: noAgentsMsg,
            actions: ['SEARCH_DISCOVERED_AGENTS'],
            source: message.content.source,
          })
        }

        return {
          success: true,
          text: noAgentsMsg,
          values: {
            totalFound: 0,
            stats,
          },
          data: {
            agents: [],
            stats,
          },
        }
      }

      // Format agent list
      const agentsList = discoveredAgents
        .map((agent: any, idx: number) => {
          const discoveryDate = new Date(agent.firstSeenTimestamp).toLocaleDateString()
          const source = agent.discoverySource || 'unknown'
          const facilitator = agent.facilitatorAddress
            ? `\n  Facilitator: ${agent.facilitatorAddress.slice(0, 8)}...`
            : ''

          return `${idx + 1}. **${agent.ghostAddress}**
   Discovered: ${discoveryDate}
   Source: ${source}${facilitator}
   Status: ${agent.status}
   First seen: Block ${agent.slot}`
        })
        .join('\n\n')

      const responseText = `Found ${discoveredAgents.length} unclaimed agent${discoveredAgents.length === 1 ? '' : 's'}:

${agentsList}

**Discovery Stats:**
- Total discovered: ${(stats as any)?.total || 0}
- Unclaimed: ${(stats as any)?.totalDiscovered || 0}
- Claimed: ${(stats as any)?.totalClaimed || 0}
- Verified: ${(stats as any)?.totalVerified || 0}

💡 **To claim an agent:**
1. Verify you own the agent wallet
2. Use "claim agent [address]" command
3. Complete registration to build Ghost Score

🔍 **Discovery sources:**
- x402 payment transactions (agent received payment)
- On-chain program logs (agent interactions)
- Blockchain account scanning (periodic indexing)`

      if (callback) {
        await callback({
          text: responseText,
          actions: ['SEARCH_DISCOVERED_AGENTS'],
          source: message.content.source,
        })
      }

      return {
        success: true,
        text: responseText,
        values: {
          totalFound: discoveredAgents.length,
          agents: discoveredAgents.map((a: any) => ({
            address: a.ghostAddress,
            firstSeen: a.firstSeenTimestamp,
            source: a.discoverySource,
          })),
          stats,
        },
        data: {
          agents: discoveredAgents,
          stats,
        },
      }
    } catch (error) {
      logger.error({ error }, 'Error searching discovered agents')
      const errorMsg = `Failed to search discovered agents: ${error instanceof Error ? error.message : 'Unknown error'}

Common issues:
- Convex database not configured
- Network connection issues
- Query permissions

Try again or contact support if the issue persists.`

      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['SEARCH_DISCOVERED_AGENTS'],
          source: message.content.source,
        })
      }

      return {
        success: false,
        text: errorMsg,
        values: {},
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Show me discovered agents',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Found 5 unclaimed agents:\n\n1. **7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk**\n   Discovered: 1/2/2026\n   Source: x402_payment\n   Status: discovered\n\n...\n\n💡 To claim an agent, use "claim agent [address]"',
          actions: ['SEARCH_DISCOVERED_AGENTS'],
        },
      },
    ],
  ],
}

/**
 * CLAIM_DISCOVERED_AGENT Action
 *
 * Claim ownership of a discovered agent
 *
 * SECURITY MODEL:
 * - User must be authenticated via Solana Wallet Adapter (frontend)
 * - User can only claim agents matching their authenticated wallet address
 * - The API route receives walletAddress from authenticated session
 * - This action validates: agentAddress === authenticatedWalletAddress
 * - Future enhancement: require cryptographic signature of claim intent
 */
export const claimDiscoveredAgentAction: Action = {
  name: 'CLAIM_DISCOVERED_AGENT',
  similes: ['CLAIM_AGENT', 'TAKE_OWNERSHIP', 'REGISTER_OWNERSHIP'],
  description: `Claim ownership of an agent discovered on-chain.

**Security Requirements:**
- You must be connected with the wallet that owns the agent
- The agent address must match your authenticated wallet address
- Claiming requires active wallet authentication via Solana Wallet Adapter

This prevents users from claiming agents they don't own.`,

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || ''
    return text.includes('claim') && text.includes('agent')
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      // Extract agent address from message
      const text = message.content.text || ''
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)

      if (!addressMatch) {
        const errorMsg = 'Please provide the agent address to claim. Format: "claim agent [address]"'
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CLAIM_DISCOVERED_AGENT'],
            source: message.content.source,
          })
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent address required'),
        }
      }

      const agentAddress = addressMatch[1]

      // Get Convex URL
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!convexUrl) {
        throw new Error('NEXT_PUBLIC_CONVEX_URL not configured')
      }

      // Create Convex client
      const client = new ConvexHttpClient(convexUrl)

      // Check if agent exists and is unclaimed
      const agent = await client.query('ghostDiscovery:getDiscoveredAgent' as any, {
        ghostAddress: agentAddress,
      })

      if (!agent) {
        const errorMsg = `Agent ${agentAddress.slice(0, 8)}... not found in discovery database.

The agent may not have been discovered yet, or the address is incorrect.

Try:
- "search discovered agents" to see available agents
- Verify the agent address is correct`

        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CLAIM_DISCOVERED_AGENT'],
            source: message.content.source,
          })
        }

        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent not found'),
        }
      }

      if (agent.status === 'claimed') {
        const errorMsg = `Agent ${agentAddress.slice(0, 8)}... has already been claimed by ${agent.claimedBy?.slice(0, 8)}...

This agent is no longer available for claiming.`

        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CLAIM_DISCOVERED_AGENT'],
            source: message.content.source,
          })
        }

        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent already claimed'),
        }
      }

      // CRITICAL SECURITY: Verify ownership before claiming
      // The user must prove they own the agent wallet they're trying to claim

      // Get user's authenticated wallet address from message metadata
      const userWallet = message.userId || runtime.agentId

      if (!userWallet) {
        throw new Error('User wallet address not available')
      }

      // OWNERSHIP VALIDATION: User can only claim agents they own
      // The agent address they're claiming MUST match their authenticated wallet
      if (agentAddress.toLowerCase() !== userWallet.toLowerCase()) {
        const errorMsg = `❌ Ownership verification failed!

You are trying to claim agent: ${agentAddress.slice(0, 8)}...
But you are authenticated as: ${userWallet.slice(0, 8)}...

**Security requirement**: You can only claim agents you own.

To claim this agent, you must:
1. Connect with the wallet that owns ${agentAddress.slice(0, 8)}...
2. Then retry the claim command

If you believe this is an error, verify your wallet connection.`

        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CLAIM_DISCOVERED_AGENT'],
            source: message.content.source,
          })
        }

        return {
          success: false,
          text: errorMsg,
          error: new Error('Ownership verification failed: wallet mismatch'),
        }
      }

      // Mark agent as claimed
      const result = await client.mutation('ghostDiscovery:claimAgent' as any, {
        ghostAddress: agentAddress,
        claimedBy: userWallet,
      })

      const successMsg = `✅ Successfully claimed agent ${agentAddress.slice(0, 8)}...!

**Claim Details:**
- Agent Address: ${agentAddress}
- Claimed By: ${userWallet.slice(0, 8)}...
- Discovery Source: ${agent.discoverySource}
- First Seen: ${new Date(agent.firstSeenTimestamp).toLocaleDateString()}

**Next Steps:**
1. Register your agent on-chain: "register agent name: [name], description: [desc], capabilities: [caps]"
2. Start building Ghost Score by completing jobs
3. Enable x402 payments to accept transactions
4. Earn verifiable credentials as your reputation grows

Your agent journey begins now! 🚀`

      if (callback) {
        await callback({
          text: successMsg,
          actions: ['CLAIM_DISCOVERED_AGENT'],
          source: message.content.source,
        })
      }

      return {
        success: true,
        text: successMsg,
        values: {
          agentAddress,
          claimedBy: userWallet,
          discoverySource: agent.discoverySource,
          firstSeen: agent.firstSeenTimestamp,
        },
        data: {
          agentAddress,
          claimedBy: userWallet,
          result,
        },
      }
    } catch (error) {
      logger.error({ error }, 'Error claiming discovered agent')
      const errorMsg = `Failed to claim agent: ${error instanceof Error ? error.message : 'Unknown error'}

Common issues:
- Agent not found in discovery database
- Agent already claimed
- Wallet authentication required
- Network connection issues

Try "search discovered agents" to see available agents.`

      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['CLAIM_DISCOVERED_AGENT'],
          source: message.content.source,
        })
      }

      return {
        success: false,
        text: errorMsg,
        values: {},
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'claim agent 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Successfully claimed agent 7xKXtYZ3...!\n\nAgent Address: 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk\nClaimed By: 9AbC...\n\nNext steps:\n1. Register your agent on-chain\n2. Start building Ghost Score\n3. Enable x402 payments',
          actions: ['CLAIM_DISCOVERED_AGENT'],
        },
      },
    ],
  ],
}

export default {
  searchDiscoveredAgentsAction,
  claimDiscoveredAgentAction,
}
