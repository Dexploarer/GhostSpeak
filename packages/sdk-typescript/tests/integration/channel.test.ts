/**
 * Integration tests for channel operations
 * Tests channel creation, messaging, reactions, and enhanced features
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { 
  Keypair,
  generateKeyPairSigner,
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction
} from '@solana/web3.js'
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget'
import type { Address, Rpc } from '@solana/web3.js'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient.js'
import { ChannelInstructions } from '../../src/client/instructions/ChannelInstructions.js'
import { 
  ChannelType, 
  MessageStatus, 
  MessagePriority,
  ReactionType,
  AttachmentType
} from '../../src/generated/index.js'
import type { TypedRpcClient } from '../../src/types/rpc-client-types.js'

describe('Channel Integration Tests', () => {
  let rpc: Rpc<unknown>
  let typedRpc: TypedRpcClient
  let client: GhostSpeakClient
  let creator: Keypair
  let member1: Keypair
  let member2: Keypair
  let member3: Keypair
  let nonMember: Keypair
  let publicChannel: Address
  let privateChannel: Address
  let a2aChannel: Address
  let groupChannel: Address

  // Test configuration
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'http://localhost:8899'
  const PROGRAM_ID = process.env.PROGRAM_ID || 'GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy' as Address
  
  beforeAll(async () => {
    // Initialize RPC and client
    rpc = createSolanaRpc(RPC_ENDPOINT)
    typedRpc = rpc as TypedRpcClient
    
    // Generate test keypairs
    creator = await generateKeyPairSigner()
    member1 = await generateKeyPairSigner()
    member2 = await generateKeyPairSigner()
    member3 = await generateKeyPairSigner()
    nonMember = await generateKeyPairSigner()

    // Initialize client
    client = new GhostSpeakClient(
      typedRpc,
      PROGRAM_ID,
      creator
    )

    // Fund test accounts
    await fundAccount(rpc, creator.address, 10)
    await fundAccount(rpc, member1.address, 5)
    await fundAccount(rpc, member2.address, 5)
    await fundAccount(rpc, member3.address, 5)
    await fundAccount(rpc, nonMember.address, 2)
  })

  describe('Channel Creation', () => {
    it('should create public channel', async () => {
      const createIx = await ChannelInstructions.createChannel(
        client,
        {
          creator: creator.address,
          name: 'Public Discussion',
          description: 'Open channel for public discussions',
          channelType: ChannelType.Public,
          metadata: {
            category: 'General',
            language: 'en',
            moderated: true
          }
        }
      )

      const message = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(creator.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(
          await rpc.getLatestBlockhash().then(b => b.value),
          tx
        ),
        tx => appendTransactionMessageInstructions(
          [
            getSetComputeUnitLimitInstruction({ units: 300000 }),
            createIx
          ],
          tx
        )
      )

      const signedTx = await signTransactionMessageWithSigners(message)
      const signature = getSignatureFromTransaction(signedTx)
      
      await rpc.sendTransaction(signedTx, { skipPreflight: false })
      await confirmTransaction(rpc, signature)

      // Store channel address
      publicChannel = createIx.accounts.channel

      // Verify channel was created
      const channelAccount = await client.fetchChannel(publicChannel)
      expect(channelAccount).toBeDefined()
      expect(channelAccount.name).toBe('Public Discussion')
      expect(channelAccount.channelType).toBe(ChannelType.Public)
      expect(channelAccount.creator).toBe(creator.address)
      expect(channelAccount.memberCount).toBe(1) // Creator is automatically a member
    })

    it('should create private channel with initial members', async () => {
      const createIx = await ChannelInstructions.createEnhancedChannel(
        client,
        {
          creator: creator.address,
          name: 'Private Team Channel',
          description: 'Private channel for team collaboration',
          channelType: ChannelType.Private,
          isEncrypted: true,
          maxMembers: 10,
          joinFee: 0n,
          messageRetention: 30 * 24 * 60 * 60, // 30 days
          allowedRoles: ['admin', 'moderator', 'member'],
          initialMembers: [member1.address, member2.address],
          metadata: {
            category: 'Team',
            project: 'GhostSpeak',
            encrypted: true
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 400000 }),
        createIx
      ])

      // Store channel address
      privateChannel = createIx.accounts.channel

      // Verify enhanced channel features
      const channelAccount = await client.fetchChannel(privateChannel)
      expect(channelAccount.channelType).toBe(ChannelType.Private)
      expect(channelAccount.isEncrypted).toBe(true)
      expect(channelAccount.maxMembers).toBe(10)
      expect(channelAccount.memberCount).toBe(3) // Creator + 2 initial members
    })

    it('should create agent-to-agent channel', async () => {
      const createIx = await ChannelInstructions.createA2aSession(
        client,
        {
          agent1: creator.address,
          agent2: member1.address,
          sessionType: 'negotiation',
          duration: 24 * 60 * 60, // 24 hours
          metadata: {
            purpose: 'Service negotiation',
            protocol: 'v1'
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        createIx
      ])

      // Store channel address
      a2aChannel = createIx.accounts.session

      // Verify A2A session
      const sessionAccount = await client.fetchA2aSession(a2aChannel)
      expect(sessionAccount).toBeDefined()
      expect(sessionAccount.agent1).toBe(creator.address)
      expect(sessionAccount.agent2).toBe(member1.address)
      expect(sessionAccount.sessionType).toBe('negotiation')
      expect(sessionAccount.isActive).toBe(true)
    })

    it('should create group channel', async () => {
      const createIx = await ChannelInstructions.createChannel(
        client,
        {
          creator: creator.address,
          name: 'Development Team',
          description: 'Group channel for dev team',
          channelType: ChannelType.Group,
          metadata: {
            team: 'Frontend',
            project: 'GhostSpeak UI'
          }
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        createIx
      ])

      groupChannel = createIx.accounts.channel

      // Add members to group
      const joinIx1 = await ChannelInstructions.joinChannel(
        client,
        {
          channel: groupChannel,
          member: member1.address,
          remainingAccounts: []
        }
      )

      const joinIx2 = await ChannelInstructions.joinChannel(
        client,
        {
          channel: groupChannel,
          member: member2.address,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member1, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        joinIx1
      ])

      await executeTransaction(rpc, member2, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        joinIx2
      ])

      // Verify group channel
      const channelAccount = await client.fetchChannel(groupChannel)
      expect(channelAccount.channelType).toBe(ChannelType.Group)
      expect(channelAccount.memberCount).toBe(3) // Creator + 2 members
    })
  })

  describe('Message Operations', () => {
    it('should send message in public channel', async () => {
      const messageContent = 'Hello from integration test!'
      
      const sendIx = await ChannelInstructions.sendMessage(
        client,
        {
          channel: publicChannel,
          sender: creator.address,
          content: messageContent,
          metadata: {
            timestamp: Date.now(),
            clientId: 'test-client-001'
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        sendIx
      ])

      const message = sendIx.accounts.message

      // Verify message was sent
      const messageAccount = await client.fetchMessage(message)
      expect(messageAccount).toBeDefined()
      expect(messageAccount.sender).toBe(creator.address)
      expect(messageAccount.content).toBe(messageContent)
      expect(messageAccount.status).toBe(MessageStatus.Active)
    })

    it('should send enhanced message with priority and expiry', async () => {
      const sendIx = await ChannelInstructions.sendEnhancedMessage(
        client,
        {
          channel: privateChannel,
          sender: creator.address,
          content: 'Urgent: System maintenance scheduled',
          priority: MessagePriority.High,
          expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          isEditable: true,
          allowReactions: true,
          metadata: {
            type: 'announcement',
            importance: 'high'
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        sendIx
      ])

      const message = sendIx.accounts.message

      // Verify enhanced message features
      const messageAccount = await client.fetchEnhancedMessage(message)
      expect(messageAccount).toBeDefined()
      expect(messageAccount.priority).toBe(MessagePriority.High)
      expect(messageAccount.isEditable).toBe(true)
      expect(messageAccount.allowReactions).toBe(true)
      expect(messageAccount.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should send A2A message', async () => {
      const a2aMessageIx = await ChannelInstructions.sendA2aMessage(
        client,
        {
          session: a2aChannel,
          sender: creator.address,
          messageType: 'proposal',
          content: JSON.stringify({
            action: 'offer_service',
            price: 100,
            duration: '7 days'
          }),
          requiresResponse: true,
          metadata: {
            version: '1.0',
            encrypted: false
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        a2aMessageIx
      ])

      // Update A2A session status
      const updateStatusIx = await ChannelInstructions.updateA2aStatus(
        client,
        {
          session: a2aChannel,
          agent: creator.address,
          newStatus: 'negotiating',
          metadata: {
            lastAction: 'sent_proposal',
            timestamp: Date.now()
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        updateStatusIx
      ])

      // Verify A2A session status
      const sessionAccount = await client.fetchA2aSession(a2aChannel)
      expect(sessionAccount.status).toBe('negotiating')
      expect(sessionAccount.messageCount).toBe(1)
    })

    it('should handle message with attachment', async () => {
      const sendIx = await ChannelInstructions.sendEnhancedMessage(
        client,
        {
          channel: groupChannel,
          sender: member1.address,
          content: 'Check out this design mockup',
          priority: MessagePriority.Normal,
          expiresAt: 0,
          isEditable: true,
          allowReactions: true,
          metadata: {
            attachments: [{
              type: AttachmentType.Image,
              url: 'ipfs://QmDesignMockup123',
              name: 'ui-mockup.png',
              size: 1024000,
              mimeType: 'image/png'
            }]
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member1, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        sendIx
      ])

      const message = sendIx.accounts.message
      const messageAccount = await client.fetchEnhancedMessage(message)
      
      expect(messageAccount).toBeDefined()
      expect(messageAccount.metadata.attachments).toBeDefined()
      expect(messageAccount.metadata.attachments.length).toBe(1)
      expect(messageAccount.metadata.attachments[0].type).toBe(AttachmentType.Image)
    })
  })

  describe('Reactions and Interactions', () => {
    let testMessage: Address

    beforeAll(async () => {
      // Create a message to react to
      const sendIx = await ChannelInstructions.sendEnhancedMessage(
        client,
        {
          channel: publicChannel,
          sender: member1.address,
          content: 'Great work everyone!',
          priority: MessagePriority.Normal,
          expiresAt: 0,
          isEditable: true,
          allowReactions: true,
          metadata: {},
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member1, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        sendIx
      ])

      testMessage = sendIx.accounts.message
    })

    it('should add reaction to message', async () => {
      const reactionIx = await ChannelInstructions.addMessageReaction(
        client,
        {
          message: testMessage,
          user: member2.address,
          reactionType: ReactionType.Like,
          metadata: {
            timestamp: Date.now()
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member2, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        reactionIx
      ])

      // Add another reaction
      const reactionIx2 = await ChannelInstructions.addMessageReaction(
        client,
        {
          message: testMessage,
          user: creator.address,
          reactionType: ReactionType.Love,
          metadata: {
            timestamp: Date.now()
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        reactionIx2
      ])

      // Verify reactions
      const messageAccount = await client.fetchEnhancedMessage(testMessage)
      expect(messageAccount.reactionCount).toBe(2)
      
      // Check reaction summary
      const reactionSummary = messageAccount.metadata.reactionSummary || {}
      expect(reactionSummary[ReactionType.Like]).toBe(1)
      expect(reactionSummary[ReactionType.Love]).toBe(1)
    })

    it('should update reaction', async () => {
      // Change reaction from Like to Celebrate
      const updateReactionIx = await ChannelInstructions.addMessageReaction(
        client,
        {
          message: testMessage,
          user: member2.address,
          reactionType: ReactionType.Celebrate,
          metadata: {
            timestamp: Date.now(),
            updated: true
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member2, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        updateReactionIx
      ])

      // Verify reaction was updated
      const messageAccount = await client.fetchEnhancedMessage(testMessage)
      const reactionSummary = messageAccount.metadata.reactionSummary || {}
      
      expect(reactionSummary[ReactionType.Like]).toBeUndefined() // Removed
      expect(reactionSummary[ReactionType.Celebrate]).toBe(1) // Added
      expect(reactionSummary[ReactionType.Love]).toBe(1) // Unchanged
    })

    it('should handle custom reactions', async () => {
      const customReactionIx = await ChannelInstructions.addMessageReaction(
        client,
        {
          message: testMessage,
          user: member3.address,
          reactionType: ReactionType.Custom,
          metadata: {
            customEmoji: '🚀',
            customName: 'rocket',
            timestamp: Date.now()
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member3, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        customReactionIx
      ])

      // Verify custom reaction
      const messageAccount = await client.fetchEnhancedMessage(testMessage)
      expect(messageAccount.reactionCount).toBe(3) // Love, Celebrate, Custom
    })
  })

  describe('Channel Settings and Permissions', () => {
    it('should update channel settings', async () => {
      const updateIx = await ChannelInstructions.updateChannelSettings(
        client,
        {
          channel: privateChannel,
          admin: creator.address,
          newName: 'Updated Private Channel',
          newDescription: 'Now with better features',
          newMaxMembers: 20,
          newJoinFee: 1000000n, // 1 token
          newAllowedRoles: ['admin', 'moderator', 'member', 'viewer'],
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        updateIx
      ])

      // Verify settings were updated
      const channelAccount = await client.fetchChannel(privateChannel)
      expect(channelAccount.name).toBe('Updated Private Channel')
      expect(channelAccount.description).toBe('Now with better features')
      expect(channelAccount.maxMembers).toBe(20)
      expect(channelAccount.joinFee.toString()).toBe('1000000')
    })

    it('should handle member roles', async () => {
      // Promote member1 to moderator
      const promoteIx = await ChannelInstructions.updateMemberRole(
        client,
        {
          channel: privateChannel,
          admin: creator.address,
          member: member1.address,
          newRole: 'moderator',
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        promoteIx
      ])

      // Verify role was updated
      const memberAccount = await client.fetchChannelMember(privateChannel, member1.address)
      expect(memberAccount.role).toBe('moderator')
    })

    it('should enforce channel permissions', async () => {
      // Non-member should not be able to send messages
      try {
        const sendIx = await ChannelInstructions.sendMessage(
          client,
          {
            channel: privateChannel,
            sender: nonMember.address,
            content: 'This should fail',
            metadata: {},
            remainingAccounts: []
          }
        )

        await executeTransaction(rpc, nonMember, [
          getSetComputeUnitLimitInstruction({ units: 300000 }),
          sendIx
        ])

        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined()
      }
    })
  })

  describe('Member Management', () => {
    it('should handle member leaving channel', async () => {
      const leaveIx = await ChannelInstructions.leaveChannel(
        client,
        {
          channel: groupChannel,
          member: member2.address,
          remainingAccounts: []
        }
      )

      const initialMemberCount = (await client.fetchChannel(groupChannel)).memberCount

      await executeTransaction(rpc, member2, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        leaveIx
      ])

      // Verify member left
      const channelAccount = await client.fetchChannel(groupChannel)
      expect(channelAccount.memberCount).toBe(initialMemberCount - 1)
    })

    it('should ban member from channel', async () => {
      // First add member3 to the channel
      const joinIx = await ChannelInstructions.joinChannel(
        client,
        {
          channel: privateChannel,
          member: member3.address,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, member3, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        joinIx
      ])

      // Now ban them
      const banIx = await ChannelInstructions.banMember(
        client,
        {
          channel: privateChannel,
          admin: creator.address,
          memberToBan: member3.address,
          reason: 'Violation of channel rules',
          duration: 7 * 24 * 60 * 60, // 7 day ban
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        banIx
      ])

      // Verify member was banned
      const memberAccount = await client.fetchChannelMember(privateChannel, member3.address)
      expect(memberAccount.isBanned).toBe(true)
      expect(memberAccount.banReason).toBe('Violation of channel rules')
    })
  })

  describe('Analytics and Metrics', () => {
    it('should track channel analytics', async () => {
      // Create analytics dashboard for channel
      const createAnalyticsIx = await ChannelInstructions.createAnalyticsDashboard(
        client,
        {
          channel: publicChannel,
          owner: creator.address,
          trackingMetrics: [
            'message_count',
            'active_members',
            'reaction_count',
            'peak_activity_time'
          ],
          updateFrequency: 3600, // Update every hour
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        createAnalyticsIx
      ])

      const dashboard = createAnalyticsIx.accounts.dashboard

      // Update analytics
      const updateAnalyticsIx = await ChannelInstructions.updateAnalyticsDashboard(
        client,
        {
          dashboard,
          channel: publicChannel,
          newMetrics: {
            message_count: 42,
            active_members: 15,
            reaction_count: 128,
            peak_activity_time: '14:00-15:00 UTC'
          },
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, creator, [
        getSetComputeUnitLimitInstruction({ units: 200000 }),
        updateAnalyticsIx
      ])

      // Verify analytics
      const dashboardAccount = await client.fetchAnalyticsDashboard(dashboard)
      expect(dashboardAccount.metrics.message_count).toBe(42)
      expect(dashboardAccount.metrics.active_members).toBe(15)
    })
  })
})

// Helper Functions

async function fundAccount(rpc: Rpc<unknown>, address: Address, lamports: number) {
  const airdropSignature = await rpc.requestAirdrop(address, lamports * 1e9).send()
  await confirmTransaction(rpc, airdropSignature)
}

async function confirmTransaction(rpc: Rpc<unknown>, signature: string) {
  const latestBlockhash = await rpc.getLatestBlockhash().send()
  await rpc.confirmTransaction({
    signature,
    blockhash: latestBlockhash.value.blockhash,
    lastValidBlockHeight: latestBlockhash.value.lastValidBlockHeight
  }).send()
}

async function executeTransaction(
  rpc: Rpc<unknown>,
  payer: Keypair,
  instructions: any[]
) {
  const message = await pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(payer.address, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(
      await rpc.getLatestBlockhash().then(b => b.value),
      tx
    ),
    tx => appendTransactionMessageInstructions(instructions, tx)
  )

  const signedTx = await signTransactionMessageWithSigners(message)
  const signature = getSignatureFromTransaction(signedTx)
  
  await rpc.sendTransaction(signedTx, { skipPreflight: false })
  await confirmTransaction(rpc, signature)
}