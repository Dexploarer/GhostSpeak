/**
 * Convex Conversations Hook
 *
 * Manage Human-to-Agent chat conversations
 */

'use client'

import { useQuery, useMutation } from 'convex/react'
import { useMemo, useCallback, useState } from 'react'
import { api } from '@/convex/_generated/api'
import { useConvexUser } from './useConvexUser'
import type { Id } from '@/convex/_generated/dataModel'

export interface Conversation {
  _id: Id<'conversations'>
  userId: Id<'users'>
  resourceId: string
  resourceUrl: string
  resourceName: string
  title?: string
  status: string
  totalCost: number
  messageCount: number
  createdAt: number
  updatedAt: number
}

export interface Message {
  _id: Id<'messages'>
  conversationId: Id<'conversations'>
  role: string
  content: string
  cost?: number
  transactionSignature?: string
  metadata?: unknown
  createdAt: number
}

export function useConvexConversations() {
  const { userId } = useConvexUser()

  // Query all conversations for current user
  const conversations = useQuery(api.conversations.getByUser, userId ? { userId } : 'skip') as
    | Conversation[]
    | undefined

  // Mutations
  const createConversation = useMutation(api.conversations.create)
  const archiveConversation = useMutation(api.conversations.archive)

  // Create a new conversation
  const create = useCallback(
    async (resource: {
      resourceId: string
      resourceUrl: string
      resourceName: string
      title?: string
    }) => {
      if (!userId) return null
      return createConversation({ userId, ...resource })
    },
    [userId, createConversation]
  )

  // Archive a conversation
  const archive = useCallback(
    async (conversationId: Id<'conversations'>) => {
      return archiveConversation({ conversationId })
    },
    [archiveConversation]
  )

  return useMemo(
    () => ({
      conversations: conversations ?? [],
      isLoading: conversations === undefined && userId !== null,
      create,
      archive,
    }),
    [conversations, userId, create, archive]
  )
}

/**
 * Hook to manage messages within a conversation
 */
export function useConversationMessages(conversationId: Id<'conversations'> | null) {
  // Query messages for this conversation
  const messages = useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : 'skip'
  ) as Message[] | undefined

  // Mutation to add message
  const addMessageMutation = useMutation(api.conversations.addMessage)

  // Add a message to the conversation
  const addMessage = useCallback(
    async (data: {
      role: string
      content: string
      cost?: number
      transactionSignature?: string
      metadata?: unknown
    }) => {
      if (!conversationId) return null
      return addMessageMutation({ conversationId, ...data })
    },
    [conversationId, addMessageMutation]
  )

  return useMemo(
    () => ({
      messages: messages ?? [],
      isLoading: messages === undefined && conversationId !== null,
      addMessage,
    }),
    [messages, conversationId, addMessage]
  )
}

/**
 * Hook for active chat with a resource
 * Creates conversation if needed, manages messages
 */
export function useResourceChat(
  resource: {
    id: string
    url: string
    name: string
  } | null
) {
  const { userId } = useConvexUser()
  const { conversations, create } = useConvexConversations()
  const [activeConversationId, setActiveConversationId] = useState<Id<'conversations'> | null>(null)

  // Find or create conversation for this resource
  const existingConversation = useMemo(() => {
    if (!resource || !conversations) return null
    return conversations.find((c) => c.resourceId === resource.id && c.status === 'active') ?? null
  }, [conversations, resource])

  // Use existing or active conversation
  const conversationId = activeConversationId ?? existingConversation?._id ?? null

  // Get messages for current conversation
  const {
    messages,
    addMessage,
    isLoading: messagesLoading,
  } = useConversationMessages(conversationId)

  // Start a new conversation
  const startConversation = useCallback(async () => {
    if (!resource || !userId) return null
    const id = await create({
      resourceId: resource.id,
      resourceUrl: resource.url,
      resourceName: resource.name,
    })
    if (id) setActiveConversationId(id)
    return id
  }, [resource, userId, create])

  // Send a message (creates conversation if needed)
  const sendMessage = useCallback(
    async (content: string, role: 'user' | 'agent' = 'user', cost?: number) => {
      let convoId = conversationId

      // Create conversation if it doesn't exist
      if (!convoId && resource) {
        convoId = await startConversation()
      }

      if (!convoId) return null

      return addMessage({ role, content, cost })
    },
    [conversationId, resource, startConversation, addMessage]
  )

  return useMemo(
    () => ({
      conversationId,
      messages,
      isLoading: messagesLoading,
      sendMessage,
      startConversation,
    }),
    [conversationId, messages, messagesLoading, sendMessage, startConversation]
  )
}
