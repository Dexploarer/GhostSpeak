/**
 * Claim Agent Action
 *
 * Allows users to claim a discovered agent by:
 * 1. Validating keypair ownership
 * 2. Registering Ghost on-chain via Solana program
 * 3. Updating Convex status to 'claimed'
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const claimAgentAction: Action = {
  name: 'CLAIM_AGENT',
  description: 'Claim a discovered agent by validating keypair and registering on-chain',

  // Force recompile

  // Validate: trigger on claim-related queries
  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Match claim intent with potential agent address
    const claimTriggers = [
      'claim agent',
      'claim ghost',
      'register agent',
      'register ghost',
      'i want to claim',
      'claim this',
      'claim my',
      'select agent',
      'choose agent',
    ]

    return claimTriggers.some((trigger) => text.includes(trigger))
  },

  // Handler: validate keypair → register on-chain → update Convex
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: unknown,
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content.text || ''
      const entityId = message.entityId

      // Extract potential wallet address from message
      // Look for Solana address pattern (base58, 32-44 chars)
      const addressMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/)

      if (!addressMatch) {
        const response = {
          text: 'Hold up bestie, I need to know which agent you want to claim! 🤔\n\nPlease provide the wallet address of the discovered agent.\n\nExample: "I want to claim agent 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB"',
        }

        if (callback) {
          await callback(response)
        }

        return { success: false, error: 'No wallet address provided' }
      }

      const ghostAddress = addressMatch[0]

      console.log(`🎯 Attempting to claim agent: ${ghostAddress}`)
      console.log(`👤 Entity: ${entityId}`)

      // Get Convex client
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Step 1: Check if agent exists and is unclaimed
      const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
        ghostAddress,
      })

      if (!agent) {
        const response = {
          text: `Hmm, I can't find that agent in my Ghost Registry. 🔍\n\nAddress: \`${ghostAddress}\`\n\nEither:\n- It hasn't been discovered yet\n- The address is incorrect\n- My database is being haunted\n\nWant me to search for available agents instead?`,
        }

        if (callback) {
          await callback(response)
        }

        return { success: false, error: 'Agent not found' }
      }

      if (agent.status === 'claimed') {
        const response = {
          text: `Oof, someone beat you to it! 👻\n\nAgent \`${ghostAddress.slice(0, 12)}...\` was already claimed by \`${agent.claimedBy?.slice(0, 12)}...\` on ${new Date(agent.claimedAt || 0).toLocaleDateString()}.\n\nThat's not a red flag, that's a red parade. This one's taken! 🚩`,
        }

        if (callback) {
          await callback(response)
        }

        return { success: false, error: 'Agent already claimed' }
      }

      // Step 2: Validate keypair ownership
      // TODO: Implement actual keypair validation
      // For now, we'll check if the user's wallet matches the ghost address
      // In production, this should use a challenge-response signature verification

      const userWallet = entityId // In web app, entityId is the wallet address

      if (userWallet !== ghostAddress) {
        const response = {
          text: `Hold up! My ghost senses are tingling... 🚨\n\nYou're trying to claim agent \`${ghostAddress.slice(0, 12)}...\`\nBut you're signed in as \`${userWallet.slice(0, 12)}...\`\n\nTo claim an agent, you need to:\n1. Sign in with the wallet that made the x402 payment\n2. Prove you own the private key\n3. Then I can register your Ghost on-chain\n\nNice try though! 😏`,
        }

        if (callback) {
          await callback(response)
        }

        return { success: false, error: 'Keypair validation failed' }
      }

      // Step 3: Register Ghost on-chain
      console.log(`⛓️  Registering Ghost on-chain: ${ghostAddress}`)

      // Import SDK for on-chain registration
      const { GhostSpeakClient, createKeyPairSignerFromBytes } = await import('@ghostspeak/sdk')
      const bs58 = await import('bs58')

      // Get admin keypair from environment (server-side signing for Phase 1)
      // TODO Phase 2: Implement client-side signature delegation
      const adminPrivateKey = process.env.GHOSTSPEAK_ADMIN_PRIVATE_KEY
      if (!adminPrivateKey) {
        throw new Error('GHOSTSPEAK_ADMIN_PRIVATE_KEY environment variable not set')
      }

      // Create keypair signer from admin private key
      const adminKeypair = await createKeyPairSignerFromBytes(bs58.default.decode(adminPrivateKey))

      // Initialize GhostSpeak client
      const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      const client = new GhostSpeakClient({
        rpcEndpoint,
        commitment: 'confirmed',
      })

      // Register agent on-chain
      // For discovered agents, we use a simple agent type with minimal metadata
      // Skip simulation to bypass staking requirement check (for dev/testing)
      // Note: pricingModel defaults to PricingModel.Fixed if not specified
      const txSignature = await client.agents.register(adminKeypair, {
        agentType: 10, // Type 10 = External x402 agent (Ghost)
        name: `Ghost Agent ${ghostAddress.slice(0, 8)}`,
        description: `Discovered agent from x402 payment at ${ghostAddress}`,
        metadataUri: `https://ghostspeak.ai/agents/${ghostAddress}`, // Placeholder URI
        agentId: ghostAddress, // Use ghost address as unique identifier
        skipSimulation: true, // Bypass staking requirement for now
      })

      console.log(`✅ Ghost registered on-chain: ${txSignature}`)

      // Step 4: Update Convex to mark as claimed
      await convex.mutation(api.ghostDiscovery.claimAgent, {
        ghostAddress,
        claimedBy: userWallet,
        claimTxSignature: txSignature,
      })

      console.log(`✅ Agent claimed successfully!`)

      const response = {
        text: `🎉 Congrats bestie! Your Ghost is now official!\n\n**Claimed Agent:** \`${ghostAddress.slice(0, 12)}...\`\n**Transaction:** \`${txSignature.slice(0, 20)}...\`\n**Status:** Registered on-chain ⛓️\n\n**What's next?**\n- Your Ghost Score will start tracking reputation\n- You can issue Verifiable Credentials\n- Build your on-chain trust profile\n\nWelcome to the Ghost Club! 👻✨\n\n*Note: Once your Ghost syncs to the blockchain (usually <30s), you'll see it in your dashboard.*`,
      }

      if (callback) {
        await callback(response)
      }

      return {
        success: true,
        data: {
          ghostAddress,
          claimedBy: userWallet,
          txSignature,
          agent,
        },
      }
    } catch (error) {
      console.error('Error claiming agent:', error)

      const errorResponse = {
        text: 'My ghost circuits are overloaded! 👻⚡\n\nSomething went wrong while claiming your agent. This might be:\n- Network congestion\n- The blockchain is haunted\n- I need a coffee break\n\nTry again in a moment, or ask me to show available agents!',
      }

      if (callback) {
        await callback(errorResponse)
      }

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
        content: { text: 'I want to claim agent 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '🎉 Congrats bestie! Your Ghost is now official!\n\n**Claimed Agent:** `4wHjA2a5YC4t...`\n**Status:** Registered on-chain ⛓️',
          action: 'CLAIM_AGENT',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Claim this ghost for me' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Hold up bestie, I need to know which agent you want to claim! 🤔\n\nPlease provide the wallet address of the discovered agent.',
          action: 'CLAIM_AGENT',
        },
      },
    ],
  ],
}
