'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Address } from '@solana/addresses'
import type { MockGhostSpeakClient } from '@/lib/ghostspeak/client'
// Import types from SDK via dynamic import to avoid fs dependency issues
// import {
//   getChannelDecoder,
//   getMessageDecoder,
//   ChannelModule,
//   type GeneratedChannelType as SDKChannelType,
//   type GeneratedMessageType as SDKMessageType,
// } from '@ghostspeak/sdk'

// Define SDK types locally to avoid import issues
type SDKChannelType = 'Public' | 'Private' | 'Direct'
type SDKMessageType = 'Text' | 'Image' | 'File' | 'Audio'

// Define SDK interfaces to match what the actual SDK returns
interface SDKChannel {
  type?: SDKChannelType
  channelType?: SDKChannelType
  creator?: string
  owner?: string
  participants?: string[]
  members?: string[]
  isPrivate: boolean
  isActive: boolean
  createdAt: bigint
  lastActivity: bigint
}

interface ChannelDataUnion {
  type?: SDKChannelType
  channelType?: SDKChannelType
  creator?: string
  owner?: string
  participants?: string[]
  members?: string[]
  isPrivate: boolean
  isActive: boolean
  createdAt: bigint
  lastActivity: bigint
}

interface MockSigner {
  address: Address
  signTransaction: (transaction: unknown) => Promise<unknown>
}

interface SDKMessage {
  type?: SDKMessageType
  messageType?: SDKMessageType
  channel: string
  sender: string
  content: string
  timestamp: bigint
}
import { getProgramDerivedAddress, getBytesEncoder, getUtf8Encoder } from '@solana/kit'

export enum ChannelType {
  Direct = 'Direct',
  Group = 'Group',
  Public = 'Public',
  Private = 'Private',
}

export enum MessageType {
  Text = 'Text',
  File = 'File',
  Image = 'Image',
  Audio = 'Audio',
  Code = 'Code',
  System = 'System',
  Reaction = 'Reaction',
}

export interface ChannelMember {
  address: string
  username?: string
  avatarUrl?: string
  joinedAt: Date
  lastActiveAt: Date
  role: 'owner' | 'admin' | 'member'
  permissions: {
    canSendMessages: boolean
    canUploadFiles: boolean
    canManageMembers: boolean
    canDeleteMessages: boolean
  }
  isOnline: boolean
  lastReadMessageId?: string
}

export interface MessageReaction {
  emoji: string
  users: string[]
  count: number
}

export interface MessageAttachment {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  downloadUrl: string
  thumbnailUrl?: string
  uploadedAt: Date
}

export interface Message {
  id: string
  channelAddress: string
  sender: string
  senderName?: string
  senderAvatar?: string
  content: string
  messageType: MessageType
  timestamp: Date
  editedAt?: Date
  replyTo?: string
  threadId?: string
  reactions: MessageReaction[]
  attachments: MessageAttachment[]
  mentions: string[]
  isDeleted: boolean
  isEdited: boolean
  isSystemMessage: boolean
}

export interface Channel {
  address: string
  name: string
  description?: string
  channelType: ChannelType
  owner: string
  ownerName?: string
  avatarUrl?: string
  isPrivate: boolean
  memberCount: number
  maxMembers: number
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
  lastMessage?: {
    id: string
    content: string
    sender: string
    timestamp: Date
  }
  settings: {
    allowFileSharing: boolean
    allowExternalInvites: boolean
    messageRetentionDays: number
    maxMessageSize: number
    requireEncryption: boolean
    autoArchiveAfterDays: number
    slowModeSeconds: number
  }
  tags: string[]
  isArchived: boolean
  unreadCount?: number
}

export interface CreateChannelData {
  name: string
  description?: string
  channelType: ChannelType
  isPrivate: boolean
  maxMembers?: number
  inviteMembers?: string[]
  settings?: Partial<Channel['settings']>
  tags?: string[]
}

export interface SendMessageData {
  channelAddress: string
  content: string
  messageType?: MessageType
  replyTo?: string
  threadId?: string
  attachments?: File[]
  mentions?: string[]
}

export interface UpdateChannelData {
  channelAddress: string
  name?: string
  description?: string
  settings?: Partial<Channel['settings']>
  tags?: string[]
}

export interface JoinChannelData {
  channelAddress: string
  inviteCode?: string
}

export interface InviteMemberData {
  channelAddress: string
  memberAddress: string
  role?: 'member' | 'admin'
}

// Helper to map SDK channel type to UI channel type
function mapSDKChannelTypeToUIType(sdkType: SDKChannelType): ChannelType {
  // SDK uses numeric enum: Direct=0, Group=1, Public=2, Private=3
  const typeValue = sdkType as unknown as number
  switch (typeValue) {
    case 0: // Direct
      return ChannelType.Direct
    case 1: // Group
      return ChannelType.Group
    case 2: // Public
      return ChannelType.Public
    case 3: // Private
      return ChannelType.Private
    default:
      return ChannelType.Public
  }
}

// Helper to map UI channel type to SDK channel type
function mapUIChannelTypeToSDKType(uiType: ChannelType): SDKChannelType {
  // Map UI string enum to SDK numeric enum
  switch (uiType) {
    case ChannelType.Direct:
      return 0 as unknown as SDKChannelType // Direct
    case ChannelType.Group:
      return 1 as unknown as SDKChannelType // Group
    case ChannelType.Public:
      return 2 as unknown as SDKChannelType // Public
    case ChannelType.Private:
      return 3 as unknown as SDKChannelType // Private
    default:
      return 2 as unknown as SDKChannelType // Default to Public
  }
}

// Helper to map SDK message type to UI message type
function mapSDKMessageTypeToUIType(sdkType: SDKMessageType): MessageType {
  // SDK uses numeric enum: Text=0, File=1, Image=2, Audio=3, System=4
  const typeValue = sdkType as unknown as number
  switch (typeValue) {
    case 0: // Text
      return MessageType.Text
    case 1: // File
      return MessageType.File
    case 2: // Image
      return MessageType.Image
    case 3: // Audio
      return MessageType.Audio
    case 4: // System
      return MessageType.System
    default:
      return MessageType.Text
  }
}

// Helper to map UI message type to SDK message type
function mapUIMessageTypeToSDKType(uiType: MessageType): SDKMessageType {
  // Map UI string enum to SDK numeric enum
  switch (uiType) {
    case MessageType.Text:
      return 0 as unknown as SDKMessageType // Text
    case MessageType.File:
      return 1 as unknown as SDKMessageType // File
    case MessageType.Image:
      return 2 as unknown as SDKMessageType // Image
    case MessageType.Audio:
      return 3 as unknown as SDKMessageType // Audio
    case MessageType.Code:
      return 0 as unknown as SDKMessageType // Map Code to Text for SDK
    case MessageType.System:
      return 4 as unknown as SDKMessageType // System
    case MessageType.Reaction:
      return 0 as unknown as SDKMessageType // Map Reaction to Text for SDK
    default:
      return 0 as unknown as SDKMessageType // Default to Text
  }
}

// Helper function to derive channel PDA
async function deriveChannelPda(channelId: string, programId: Address): Promise<[Address, number]> {
  const result = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([99, 104, 97, 110, 110, 101, 108])), // 'channel'
      getUtf8Encoder().encode(channelId),
    ],
  })
  return [result[0], result[1]]
}

// Helper function to create channel module with proper config
// Currently using mock client, so this returns a mock module
function createChannelModule(): ReturnType<MockGhostSpeakClient['channels']> {
  const client = getGhostSpeakClient()
  return client.channels()
}

export function useChannels(filters?: {
  type?: ChannelType[]
  search?: string
  joined?: boolean
  userAddress?: string
}) {
  return useQuery({
    queryKey: ['channels', filters],
    queryFn: async () => {
      const channelModule = createChannelModule()

      // Fetch all channels or public channels based on filters
      const channels = filters?.joined
        ? await channelModule.getAllChannels()
        : await channelModule.getPublicChannels()

      // Transform SDK data to match our Channel interface
      let results = await Promise.all(
        channels.map(async (channelAccount: { address: Address; data: SDKChannel }) => {
          const { address, data } = channelAccount

          // Get last message if available (would need separate query)
          // For now, we'll leave it undefined
          const lastMessage = undefined

          return {
            address: address,
            name: address, // Channel ID is stored in PDA derivation, not in account
            description: undefined, // Not stored in base channel account
            channelType: mapSDKChannelTypeToUIType((data.type || data.channelType)!), // Handle both possible property names
            owner: data.creator || data.owner, // Handle both possible property names
            ownerName: undefined, // TODO: Fetch from user registry
            avatarUrl: undefined,
            isPrivate: data.isPrivate,
            memberCount: (data.participants || data.members || []).length, // Handle both possible property names
            maxMembers: 100, // Default, not stored in base account
            createdAt: new Date(Number(data.createdAt) * 1000),
            updatedAt: new Date(Number(data.lastActivity) * 1000),
            lastActivity: new Date(Number(data.lastActivity) * 1000),
            lastMessage,
            settings: {
              allowFileSharing: true,
              allowExternalInvites: !data.isPrivate,
              messageRetentionDays: 30,
              maxMessageSize: 4096,
              requireEncryption: data.isPrivate,
              autoArchiveAfterDays: 365,
              slowModeSeconds: 0,
            },
            tags: [],
            isArchived: !data.isActive,
            unreadCount: 0, // Would need to track per user
          } as Channel
        })
      )

      // Apply client-side filters
      if (filters?.type && filters.type.length > 0) {
        results = results.filter((channel) => filters.type!.includes(channel.channelType))
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        results = results.filter(
          (channel) =>
            channel.name.toLowerCase().includes(searchLower) ||
            channel.description?.toLowerCase().includes(searchLower) ||
            channel.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
        )
      }

      if (filters?.joined && filters.userAddress) {
        results = results.filter(
          (channel) =>
            channel.owner === filters.userAddress ||
            // Check if user is in participants (would need to check on-chain data)
            !channel.isPrivate
        )
      }

      // Sort by last activity
      results.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())

      return results
    },
    staleTime: 30000, // 30 seconds
  })
}

export function useChannel(address: string) {
  return useQuery({
    queryKey: ['channel', address],
    queryFn: async () => {
      const channelModule = createChannelModule()

      // Fetch the channel account
      const channelData = await channelModule.getChannelAccount(address as Address)

      if (!channelData) {
        throw new Error('Channel not found')
      }

      // Get participant count
      const memberCount = (
        (channelData as ChannelDataUnion).participants ||
        (channelData as ChannelDataUnion).members ||
        []
      ).length

      // Get last message if available (would need separate query)
      const lastMessage = undefined

      // Transform SDK data to match our Channel interface
      return {
        address: address,
        name: address, // Channel ID is stored in PDA derivation
        description: undefined,
        channelType: mapSDKChannelTypeToUIType(
          ((channelData as ChannelDataUnion).type || (channelData as ChannelDataUnion).channelType)!
        ), // Handle both possible property names
        owner: (channelData as ChannelDataUnion).creator || (channelData as ChannelDataUnion).owner, // Handle both possible property names
        ownerName: undefined,
        avatarUrl: undefined,
        isPrivate: channelData.isPrivate,
        memberCount,
        maxMembers: 100,
        createdAt: new Date(Number(channelData.createdAt) * 1000),
        updatedAt: new Date(Number(channelData.lastActivity) * 1000),
        lastActivity: new Date(Number(channelData.lastActivity) * 1000),
        lastMessage,
        settings: {
          allowFileSharing: true,
          allowExternalInvites: !channelData.isPrivate,
          messageRetentionDays: 30,
          maxMessageSize: 4096,
          requireEncryption: channelData.isPrivate,
          autoArchiveAfterDays: 365,
          slowModeSeconds: 0,
        },
        tags: [],
        isArchived: !channelData.isActive,
        unreadCount: 0,
      } as Channel
    },
    enabled: !!address,
  })
}

export function useChannelMessages(
  channelAddress: string,
  options?: { limit?: number; before?: string }
) {
  return useQuery({
    queryKey: ['channel-messages', channelAddress, options],
    queryFn: async () => {
      const channelModule = createChannelModule()

      // Fetch messages in the channel
      const messages = await channelModule.getChannelMessages(channelAddress as Address)

      // Transform SDK data to match our Message interface
      let results = messages.map((messageAccount: { address: Address; data: SDKMessage }) => {
        const { address, data } = messageAccount
        return {
          id: address,
          channelAddress: data.channel,
          sender: data.sender,
          senderName: undefined, // TODO: Fetch from user registry
          senderAvatar: undefined,
          content: data.content,
          messageType: mapSDKMessageTypeToUIType((data.type || data.messageType)!), // Handle both possible property names
          timestamp: new Date(Number(data.timestamp) * 1000),
          editedAt: undefined, // Not tracked in base message
          replyTo: undefined, // Would be in metadata
          threadId: undefined,
          reactions: [], // Would need separate storage
          attachments: [], // Would need to parse from content or metadata
          mentions: [], // Would need to parse from content
          isDeleted: false,
          isEdited: false,
          isSystemMessage: ((data.type || data.messageType) as unknown as number) === 4, // SDKMessageType.System
        } as Message
      })

      // Sort by timestamp (newest first)
      results.sort((a: Message, b: Message) => b.timestamp.getTime() - a.timestamp.getTime())

      // Apply limit
      if (options?.limit) {
        results = results.slice(0, options.limit)
      }

      return results
    },
    enabled: !!channelAddress,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  })
}

export function useChannelMembers(channelAddress: string) {
  return useQuery({
    queryKey: ['channel-members', channelAddress],
    queryFn: async () => {
      const channelModule = createChannelModule()

      // Fetch the channel to get participants
      const channelData = await channelModule.getChannelAccount(channelAddress as Address)

      if (!channelData) {
        throw new Error('Channel not found')
      }

      // Transform participants into member objects
      const participants =
        (channelData as ChannelDataUnion).participants ||
        (channelData as ChannelDataUnion).members ||
        []
      const members: ChannelMember[] = participants.map((participant: Address, index: number) => ({
        address: participant,
        username: undefined, // TODO: Fetch from user registry
        avatarUrl: undefined,
        joinedAt: new Date(Number(channelData.createdAt) * 1000), // Approximate
        lastActiveAt: new Date(), // Would need separate tracking
        role: index === 0 ? 'owner' : 'member', // First participant is owner
        permissions: {
          canSendMessages: true,
          canUploadFiles: true,
          canManageMembers: index === 0, // Only owner
          canDeleteMessages: index === 0, // Only owner
        },
        isOnline: false, // Would need real-time tracking
        lastReadMessageId: undefined,
      }))

      return members
    },
    enabled: !!channelAddress,
    staleTime: 60000, // 1 minute
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateChannelData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const channelModule = createChannelModule()

      // Create the channel
      const signature = await channelModule.create({
        signer: { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
        name: data.name,
        description: data.description || '',
        channelType: mapUIChannelTypeToSDKType(data.channelType),
        isPrivate: data.isPrivate,
        maxMembers: data.maxMembers,
      })

      // Wait for confirmation
      const client = getGhostSpeakClient()
      const rpc = client.config?.rpc || {}
      await rpc.confirmTransaction?.(signature, 'confirmed')

      // Derive the channel address
      const programId = '11111111111111111111111111111111' as Address // TODO: Get actual program ID
      const [channelAddress] = await deriveChannelPda(data.name, programId)

      return {
        signature,
        channelAddress,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success('Channel created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create channel:', error)
      toast.error('Failed to create channel')
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const channelModule = createChannelModule()

      // Handle file uploads if present
      let attachmentUri: string | undefined
      if (data.attachments && data.attachments.length > 0) {
        // TODO: Upload to IPFS or other storage
        // For now, just log
        console.log('File uploads not yet implemented:', data.attachments)
      }

      // Send the message
      const signature = await channelModule.sendMessage({
        signer: { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
        channelAddress: data.channelAddress as Address,
        content: data.content,
        messageType: data.messageType ? mapUIMessageTypeToSDKType(data.messageType) : undefined,
        attachmentUri,
        replyTo: data.replyTo as Address | undefined,
      })

      // Wait for confirmation
      const client = getGhostSpeakClient()
      const rpc = client.config?.rpc || {}
      await rpc.confirmTransaction?.(signature, 'confirmed')

      return {
        signature,
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelAddress] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
    onError: (error) => {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    },
  })
}

export function useJoinChannel() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: JoinChannelData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const channelModule = createChannelModule()

      // Join the channel
      const signature = await channelModule.join(
        { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
        data.channelAddress as Address
      )

      // Wait for confirmation
      const client = getGhostSpeakClient()
      const rpc = client.config?.rpc || {}
      await rpc.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'joined',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel', variables.channelAddress] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channel-members', variables.channelAddress] })
      toast.success('Successfully joined channel!')
    },
    onError: (error) => {
      console.error('Failed to join channel:', error)
      toast.error('Failed to join channel')
    },
  })
}

export function useLeaveChannel() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (channelAddress: string) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const channelModule = createChannelModule()

      // Leave the channel
      const signature = await channelModule.leave(
        { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
        channelAddress as Address
      )

      // Wait for confirmation
      const client = getGhostSpeakClient()
      const rpc = client.config?.rpc || {}
      await rpc.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'left',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel', variables] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channel-members', variables] })
      toast.success('Left channel successfully')
    },
    onError: (error) => {
      console.error('Failed to leave channel:', error)
      toast.error('Failed to leave channel')
    },
  })
}

export function useAddReaction() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: { messageId: string; channelAddress: string; emoji: string }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const channelModule = createChannelModule()

      // Add reaction
      const signature = await channelModule.addReaction(
        { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
        data.messageId as Address,
        data.emoji
      )

      // Wait for confirmation
      const client = getGhostSpeakClient()
      const rpc = client.config?.rpc || {}
      await rpc.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'added',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelAddress] })
    },
    onError: (error) => {
      console.error('Failed to add reaction:', error)
      toast.error('Failed to add reaction')
    },
  })
}

export function useEditMessage() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: { messageId: string; channelAddress: string; newContent: string }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      // TODO: The SDK doesn't have an edit message method yet
      // This would need to be implemented in the smart contract first
      console.log('Edit message not yet implemented:', data)
      throw new Error('Edit message not yet implemented')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelAddress] })
      toast.success('Message edited successfully')
    },
    onError: (error) => {
      console.error('Failed to edit message:', error)
      toast.error('Failed to edit message')
    },
  })
}

export function useDeleteMessage() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: { messageId: string; channelAddress: string }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      // TODO: The SDK doesn't have a delete message method yet
      // This would need to be implemented in the smart contract first
      console.log('Delete message not yet implemented:', data)
      throw new Error('Delete message not yet implemented')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelAddress] })
      toast.success('Message deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete message:', error)
      toast.error('Failed to delete message')
    },
  })
}

// Note: Mock data has been removed as we're now using real SDK calls
