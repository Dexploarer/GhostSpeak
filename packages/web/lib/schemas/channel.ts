import { z } from 'zod'

/**
 * Channel types
 */
export const channelTypes = [
  { value: 'public', label: 'Public Channel' },
  { value: 'private', label: 'Private Channel' },
  { value: 'direct', label: 'Direct Message' },
] as const

/**
 * Schema for creating a channel
 */
export const createChannelSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Name can only contain lowercase letters, numbers, and hyphens'
    ),
  
  description: z
    .string()
    .max(200, 'Description must be at most 200 characters')
    .optional(),
  
  isPrivate: z.boolean().default(false),
  
  maxMembers: z
    .number()
    .min(2, 'Channel must allow at least 2 members')
    .max(1000, 'Channel cannot have more than 1000 members')
    .optional(),
})

export type CreateChannelInput = z.infer<typeof createChannelSchema>

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4096, 'Message must be at most 4096 characters'),
  
  attachmentUri: z
    .string()
    .url('Invalid attachment URL')
    .optional()
    .or(z.literal('')),
  
  replyToId: z
    .string()
    .optional(),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

/**
 * Schema for updating channel settings
 */
export const updateChannelSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Name can only contain lowercase letters, numbers, and hyphens'
    )
    .optional(),
  
  description: z
    .string()
    .max(200, 'Description must be at most 200 characters')
    .optional(),
  
  isPrivate: z.boolean().optional(),
  
  maxMembers: z
    .number()
    .min(2, 'Channel must allow at least 2 members')
    .max(1000, 'Channel cannot have more than 1000 members')
    .optional(),
})

export type UpdateChannelInput = z.infer<typeof updateChannelSchema>
