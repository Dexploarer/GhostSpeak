/**
 * Issue Credential Action
 *
 * Issue a new W3C Verifiable Credential for an agent
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const issueCredentialAction: Action = {
  name: 'ISSUE_CREDENTIAL',
  description: 'Issue a new W3C Verifiable Credential for an AI agent',

  // Validate: trigger on credential issuance requests ONLY when an agent address is present
  // This prevents triggering on general questions like "How do I issue a credential?"
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Must have a Solana address to trigger this action
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')
    if (!hasAddress) return false

    const triggers = [
      'issue credential',
      'issue a credential',
      'create credential',
      'mint credential',
      'generate credential',
      'issue vc',
      'create vc',
      'new credential',
    ]

    return triggers.some((trigger) => text.includes(trigger))
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ) => {
    try {
      const text = message.content.text || ''
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Extract agent address from message
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)
      const agentAddress = addressMatch ? addressMatch[1] : null

      if (!agentAddress) {
        const response = {
          text: "I need an agent address to issue a credential. 👻\n\nDrop me the Solana address and I'll mint them a shiny new W3C Verifiable Credential.\n\nExample: `Issue credential for 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2`",
        }
        if (callback) await callback(response)
        return { success: false, error: 'No agent address provided' }
      }

      // Generate DID from address
      const did = `did:sol:devnet:${agentAddress}`

      // Issue the credential via Convex
      const result = await convex.mutation(api.credentials.issueAgentIdentityCredentialPublic, {
        agentAddress,
        did,
      })

      if (!result.success) {
        const response = {
          text: `Couldn't issue that credential. 👻\n\nReason: ${result.error || 'Unknown error'}\n\nMake sure the agent address is valid and try again.`,
        }
        if (callback) await callback(response)
        return { success: false, error: result.error }
      }

      const responseText = `On it! Creating a verified credential... 🔏\n\n` +
        `**✅ Credential Issued!**\n\n` +
        `**Agent:** \`${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}\`\n` +
        `**Credential ID:** \`${result.credentialId}\`\n` +
        `**DID:** \`${did.slice(0, 30)}...\`\n` +
        `**Type:** Agent Identity Credential\n` +
        `**Network:** Solana Devnet\n\n` +
        `This is now on-chain and permanent. No take-backs! 👻✨\n\n` +
        `The agent can now prove their identity with this W3C Verifiable Credential.`

      const response = {
        text: responseText,
        ui: {
          type: 'credential-issued',
          agentAddress,
          credentialId: result.credentialId,
          did,
          success: true,
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: {
          agentAddress,
          credentialId: result.credentialId,
          did,
        },
      }
    } catch (error) {
      console.error('Error issuing credential:', error)

      const errorResponse = {
        text: "The credential printer jammed. 👻🖨️\n\nCouldn't issue that credential right now. The blockchain spirits might be overwhelmed. Try again in a moment!",
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
        content: { text: 'Issue a credential for 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'On it! Creating a verified credential... 🔏\n\n**✅ Credential Issued!**',
          action: 'ISSUE_CREDENTIAL',
        },
      },
    ],
  ],
}
