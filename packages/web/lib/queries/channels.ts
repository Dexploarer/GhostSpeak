'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/addresses'

// Import SDK types from browser entry point
import type {
  Channel as SDKChannel,
  Message as SDKMessage,
  ChannelType as SDKChannelType,
  MessageType as SDKMessageType,
} from '@ghostspeak/sdk/browser'

// =====================================================
// UI TYPE DEFINITIONS
// =====================================================

// UI-friendly channel type enum (maps to SDK types)
export enum ChannelType {
  Direct = 'Direct',
  Group = 'Group',
  Public = 'Public',
  Private = 'Private',
}

// UI-friendly message type enum (maps to SDK types)
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
  isOnline: boolean
  permissions: {
    canSendMessages: boolean
    canUploadFiles: boolean
    canManageMembers: boolean
    canDeleteMessages: boolean
  }
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
}

export interface Message {
  id: string
  channelAddress: string
  sender: string
  senderName?: string
  senderAvatar?: string
  content: string
  messageType: string
  timestamp: Date
  reactions: MessageReaction[]
  attachments: MessageAttachment[]
  replyTo?: string
  isDeleted: boolean
  isEdited: boolean
  isSystemMessage: boolean
}

export interface ChannelSettings {
  allowFileSharing: boolean
  allowExternalInvites: boolean
  messageRetentionDays: number
  maxMessageSize: number
  requireEncryption: boolean
  autoArchiveAfterDays: number
  slowModeSeconds: number
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
  lastActivity: Date
  isActive: boolean
  participants: string[]
  settings: ChannelSettings
  tags: string[]
  isArchived: boolean
  unreadCount?: number
  lastMessage?: Message
}

// Data types for mutations
export interface CreateChannelData {
  name: string
  description?: string
  channelType: ChannelType
  isPrivate: boolean
  maxMembers?: number
  tags?: string[]
  settings?: Partial<ChannelSettings>
  inviteMembers?: string[]
}

export interface SendMessageData {
  channelAddress: string
  content: string
  messageType?: MessageType | string
  replyTo?: string
  attachments?: File[]
  mentions?: string[]
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Signer is now provided by useCrossmintSigner hook

// Map SDK channel type to UI channel type
function mapSDKChannelTypeToUI(sdkType: SDKChannelType | undefined): ChannelType {
  if (!sdkType) return ChannelType.Public

  // SDK ChannelType is an enum-like object
  const typeStr = String(sdkType)
  switch (typeStr) {
    case 'Direct':
      return ChannelType.Direct
    case 'Group':
      return ChannelType.Group
    case 'Private':
      return ChannelType.Private
    case 'Public':
    default:
      return ChannelType.Public
  }
}

// Transform SDK channel to UI channel
function transformSDKChannel(address: string, data: SDKChannel): Channel {
  return {
    address,
    name: `Channel-${address.slice(0, 8)}`, // SDK doesn't store name directly
    channelType: mapSDKChannelTypeToUI(data.channelType),
    owner: data.creator?.toString() ?? '',
    isPrivate: data.isPrivate ?? false,
    memberCount: data.participants?.length ?? 0,
    maxMembers: 100, // Default max members
    createdAt: new Date(Number(data.createdAt ?? 0) * 1000),
    lastActivity: new Date(Number(data.lastActivity ?? 0) * 1000),
    isActive: data.isActive ?? true,
    participants: data.participants?.map((p) => p.toString()) ?? [],
    settings: {
      allowFileSharing: true,
      allowExternalInvites: !data.isPrivate,
      messageRetentionDays: 30,
      maxMessageSize: 4096,
      requireEncryption: data.isPrivate ?? false,
      autoArchiveAfterDays: 365,
      slowModeSeconds: 0,
    },
    tags: [],
    isArchived: false,
    unreadCount: 0,
  }
}

// Transform SDK message to UI message
function transformSDKMessage(address: string, data: SDKMessage): Message {
  return {
    id: address,
    channelAddress: data.channel?.toString() ?? '',
    sender: data.sender?.toString() ?? '',
    content: data.content ?? '',
    messageType: String(data.messageType ?? 'Text'),
    timestamp: new Date(Number(data.timestamp ?? 0) * 1000),
    reactions: [],
    attachments: [],
    isDeleted: false,
    isEdited: false,
    isSystemMessage: false,
  }
}

// =====================================================
// QUERY KEYS
// =====================================================

export const channelKeys = {
  all: ['channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (filters: string) => [...channelKeys.lists(), { filters }] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (address: string) => [...channelKeys.details(), address] as const,
  messages: (channelAddress: string) => [...channelKeys.all, 'messages', channelAddress] as const,
}

// =====================================================
// QUERY HOOKS
// =====================================================

// Fetch single channel by address
export function useChannel(channelAddress: string | undefined) {
  return useQuery({
    queryKey: channelKeys.detail(channelAddress || ''),
    queryFn: async () => {
      if (!channelAddress) throw new Error('Channel address required')

      const client = getGhostSpeakClient()
      const channelData = await client.channels.getChannelAccount(channelAddress as Address)

      if (!channelData) {
        throw new Error('Channel not found')
      }

      return transformSDKChannel(channelAddress, channelData)
    },
    enabled: !!channelAddress,
    staleTime: 30000,
  })
}

// Fetch all channels
export function useChannels(filters?: { isPublic?: boolean; userAddress?: string }) {
  return useQuery({
    queryKey: channelKeys.list(JSON.stringify(filters || {})),
    queryFn: async () => {
      const client = getGhostSpeakClient()

      let channelAccounts: { address: Address; data: SDKChannel }[]

      try {
        if (filters?.isPublic) {
          channelAccounts = await client.channels.getPublicChannels()
        } else if (filters?.userAddress) {
          channelAccounts = await client.channels.getChannelsByCreator(
            filters.userAddress as Address
          )
        } else {
          channelAccounts = await client.channels.getAllChannels()
        }
      } catch (error) {
        console.warn('Error fetching channels:', error)
        channelAccounts = []
      }

      return channelAccounts.map((account) =>
        transformSDKChannel(account.address.toString(), account.data)
      )
    },
    staleTime: 30000,
  })
}

// Fetch members for a channel
export function useChannelMembers(channelAddress: string | undefined) {
  return useQuery({
    queryKey: [...channelKeys.detail(channelAddress || ''), 'members'] as const,
    queryFn: async (): Promise<ChannelMember[]> => {
      if (!channelAddress) return []

      const client = getGhostSpeakClient()

      try {
        const channelData = await client.channels.getChannelAccount(channelAddress as Address)

        if (!channelData) return []

        // Transform participants to ChannelMember format
        return (channelData.participants ?? []).map(
          (participant, index): ChannelMember => ({
            address: participant.toString(),
            joinedAt: new Date(),
            lastActiveAt: new Date(),
            role: index === 0 ? 'owner' : 'member',
            isOnline: false,
            permissions: {
              canSendMessages: true,
              canUploadFiles: true,
              canManageMembers: index === 0,
              canDeleteMessages: index === 0,
            },
          })
        )
      } catch (error) {
        console.warn('Error fetching channel members:', error)
        return []
      }
    },
    enabled: !!channelAddress,
    staleTime: 60000,
  })
}

// Fetch messages for a channel
export function useChannelMessages(channelAddress: string | undefined) {
  return useQuery({
    queryKey: channelKeys.messages(channelAddress || ''),
    queryFn: async () => {
      if (!channelAddress) return []

      const client = getGhostSpeakClient()

      try {
        const messageAccounts = await client.channels.getChannelMessages(channelAddress as Address)

        return messageAccounts.map((account) =>
          transformSDKMessage(account.address.toString(), account.data)
        )
      } catch (error) {
        console.warn('Error fetching messages:', error)
        return []
      }
    },
    enabled: !!channelAddress,
    staleTime: 10000, // Messages should refresh more frequently
    refetchInterval: 30000, // Poll for new messages
  })
}

// =====================================================
// MUTATION HOOKS
// =====================================================

// Create a new channel
export function useCreateChannel() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      name: string
      description?: string
      channelType: ChannelType
      isPrivate?: boolean
    }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Map UI channel type to SDK channel type
      const sdkChannelType = params.channelType as unknown as SDKChannelType

      const signature = await client.channels.create({
        signer,
        name: params.name,
        description: params.description ?? '',
        channelType: sdkChannelType,
        isPrivate: params.isPrivate,
      })

      return { signature }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Channel created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create channel:', error)
      toast.error('Failed to create channel')
    },
  })
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      channelAddress: string
      content: string
      messageType?: string
    }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const signature = await client.channels.sendMessage({
        signer,
        channelAddress: params.channelAddress as Address,
        content: params.content,
        messageType: params.messageType as unknown as SDKMessageType,
      })

      return { signature }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.messages(variables.channelAddress) })
      toast.success('Message sent!')
    },
    onError: (error) => {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    },
  })
}

// Join a channel
export function useJoinChannel() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (channelAddress: string) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const signature = await client.channels.join(signer, channelAddress as Address)

      return { signature }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Joined channel!')
    },
    onError: (error) => {
      console.error('Failed to join channel:', error)
      toast.error('Failed to join channel')
    },
  })
}

// Leave a channel
export function useLeaveChannel() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (channelAddress: string) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const signature = await client.channels.leave(signer, channelAddress as Address)

      return { signature }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Left channel')
    },
    onError: (error) => {
      console.error('Failed to leave channel:', error)
      toast.error('Failed to leave channel')
    },
  })
}

// Update channel settings
export function useUpdateChannel() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      channelAddress: string
      name?: string
      description?: string
      isPrivate?: boolean
    }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const signature = await client.channels.updateSettings(
        signer,
        params.channelAddress as Address,
        {
          name: params.name,
          description: params.description,
          isPrivate: params.isPrivate,
        }
      )

      return { signature }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(variables.channelAddress) })
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Channel updated!')
    },
    onError: (error) => {
      console.error('Failed to update channel:', error)
      toast.error('Failed to update channel')
    },
  })
}

// Add reaction to a message
export function useAddReaction() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      messageId?: string
      messageAddress?: string
      channelAddress: string
      emoji: string
    }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      // Support both messageId and messageAddress for compatibility
      const messageAddr = params.messageAddress ?? params.messageId
      if (!messageAddr) {
        throw new Error('Message address required')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const signature = await client.channels.addReaction(
        signer,
        messageAddr as Address,
        params.emoji
      )

      return { signature }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.messages(variables.channelAddress) })
    },
    onError: (error) => {
      console.error('Failed to add reaction:', error)
      toast.error('Failed to add reaction')
    },
  })
}

// Edit message (not supported by SDK yet - stub for UI compatibility)
export function useEditMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_params: { messageId: string; channelAddress: string; content: string }) => {
      // TODO: Implement when SDK supports message editing
      console.warn('Message editing not yet supported by SDK')
      return { signature: '' }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.messages(variables.channelAddress) })
      toast.success('Message edited!')
    },
    onError: (error) => {
      console.error('Failed to edit message:', error)
      toast.error('Failed to edit message')
    },
  })
}

// Delete message (not supported by SDK yet - stub for UI compatibility)
export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_params: { messageId: string; channelAddress: string }) => {
      // TODO: Implement when SDK supports message deletion
      console.warn('Message deletion not yet supported by SDK')
      return { signature: '' }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.messages(variables.channelAddress) })
      toast.success('Message deleted')
    },
    onError: (error) => {
      console.error('Failed to delete message:', error)
      toast.error('Failed to delete message')
    },
  })
}

// =====================================================
// EXPORTS
// =====================================================

export type { SDKChannel, SDKMessage }
