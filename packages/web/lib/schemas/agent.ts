import { z } from 'zod'

/**
 * Agent types available in the system
 */
export const agentTypes = [
  { value: 'assistant', label: 'Assistant' },
  { value: 'analyst', label: 'Data Analyst' },
  { value: 'creative', label: 'Creative' },
  { value: 'developer', label: 'Developer' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'security', label: 'Security' },
] as const

/**
 * Agent capabilities
 */
export const agentCapabilities = [
  'text-generation',
  'code-generation',
  'data-analysis',
  'image-processing',
  'translation',
  'summarization',
  'qa',
  'reasoning',
  'security-audit',
  'content-moderation',
] as const

/**
 * Schema for registering a new agent
 */
export const registerAgentSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(32, 'Name must be at most 32 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Name can only contain letters, numbers, spaces, and hyphens'),
  
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  
  agentType: z.enum(['assistant', 'analyst', 'creative', 'developer', 'researcher', 'security'], {
    required_error: 'Please select an agent type',
  }),
  
  capabilities: z
    .array(z.string())
    .min(1, 'Select at least one capability'),
  
  useCompressed: z.boolean().default(true),
})

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>

/**
 * Schema for updating an agent
 */
export const updateAgentSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(32, 'Name must be at most 32 characters')
    .optional(),
  
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  
  capabilities: z
    .array(z.string())
    .min(1, 'Select at least one capability')
    .optional(),
  
  isActive: z.boolean().optional(),
})

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
