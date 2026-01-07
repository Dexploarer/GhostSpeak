/**
 * Get Credentials Action
 *
 * Fetch and verify credentials for an agent - implements VERIFY_CREDENTIAL capability
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const getCredentialsAction: Action = {
  name: 'VERIFY_CREDENTIAL',
  description: 'Check W3C Verifiable Credentials for an AI agent',

  // Validate: trigger on credential queries ONLY when an agent address is present
  // This prevents triggering on general questions like "What makes a credential valid?"
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Must have a Solana address to trigger this action
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')
    if (!hasAddress) return false

    const triggers = [
      'credential',
      'credentials',
      'verify credential',
      'check credential',
      'vc',
      'verifiable',
      'w3c',
      'certified',
      'certification',
      'what credentials',
      'show credentials',
    ]

    // Exclude issue requests - those go to ISSUE_CREDENTIAL
    if (text.includes('issue') || text.includes('create') || text.includes('mint')) {
      return false
    }

    return triggers.some((trigger) => text.includes(trigger))
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: unknown,
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content.text || ''
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Extract agent address from message
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)
      const agentAddress = addressMatch ? addressMatch[1] : null

      if (!agentAddress) {
        const response = {
          text: "I need an agent address to check their credentials. 👻\n\nDrop me the Solana address and I'll verify their W3C VCs—identity, capabilities, reputation, the works.",
        }
        if (callback) await callback(response)
        return { success: false, error: 'No agent address provided' }
      }

      // Query credentials from Convex (using public query)
      const credentials = await convex.query(api.credentials.getAgentCredentialsPublic, {
        agentAddress,
      })

      if (!credentials || credentials.length === 0) {
        const response = {
          text: `No credentials found for \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`. 👻\n\nThis agent hasn't been issued any W3C Verifiable Credentials yet.\n\nWant me to issue an Identity Credential for them?`,
        }
        if (callback) await callback(response)
        return { success: true, data: { agentAddress, credentials: [] } }
      }

      // Format credential list
      let responseText = `Let me check the credential vault... 🔏\n\n`
      responseText += `**Agent:** \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`\n\n`
      responseText += `**${credentials.length} Credential(s) Found:**\n\n`

      const typeEmoji: Record<string, string> = {
        identity: '🪪',
        capability: '⚡',
        reputation: '⭐',
        payment: '💰',
        endorsement: '🤝',
        staking: '🔒',
        paymentMilestone: '🏆',
      }

      for (const cred of credentials.slice(0, 5)) {
        const emoji = typeEmoji[cred.type] || '📜'
        const status = cred.isValid ? '✅ Valid' : '❌ Expired'
        responseText += `${emoji} **${cred.type.charAt(0).toUpperCase() + cred.type.slice(1)} Credential**\n`
        responseText += `   ID: \`${cred.credentialId?.slice(0, 20)}...\`\n`
        responseText += `   Status: ${status}\n`
        if (cred.issuedAt) {
          responseText += `   Issued: ${new Date(cred.issuedAt).toLocaleDateString()}\n`
        }
        responseText += `\n`
      }

      if (credentials.length > 5) {
        responseText += `...and ${credentials.length - 5} more credentials.\n\n`
      }

      // Add assessment
      const validCount = credentials.filter((c: any) => c.isValid).length
      responseText += `**My Take:** `
      if (validCount === credentials.length) {
        responseText += `All credentials check out! This agent is fully verified. I'd vouch for them. 👻✅`
      } else if (validCount > 0) {
        responseText += `${validCount}/${credentials.length} credentials are valid. Some have expired—might want to get those renewed.`
      } else {
        responseText += `All credentials are expired. That's... not ideal. They should probably issue fresh ones.`
      }

      const response = {
        text: responseText,
        ui: {
          type: 'credentials',
          agentAddress,
          credentials,
          validCount,
          totalCount: credentials.length,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: {
          agentAddress,
          credentials,
          validCount,
          totalCount: credentials.length,
        },
      }
    } catch (error) {
      console.error('Error fetching credentials:', error)

      const errorResponse = {
        text: 'The credential vault seems to be locked right now. 👻🔐\n\nTry again in a moment—sometimes the blockchain spirits need a second.',
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
        content: {
          text: 'What credentials does 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2 have?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Let me check the credential vault... 🔏\n\n**3 Credentials Found:**\n\n🪪 Identity Credential ✅ Valid',
          action: 'VERIFY_CREDENTIAL',
        },
      },
    ],
  ],
}
