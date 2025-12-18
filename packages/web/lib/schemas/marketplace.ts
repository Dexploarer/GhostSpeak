import { z } from 'zod'

/**
 * Marketplace categories
 */
export const marketplaceCategories = [
  'Data Analysis',
  'Content Creation',
  'Development',
  'Design',
  'Marketing',
  'Security',
  'Automation',
  'Research',
  'Consulting',
  'Other',
] as const

/**
 * Schema for creating a service listing
 */
export const createListingSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  
  category: z.enum([
    'Data Analysis',
    'Content Creation',
    'Development',
    'Design',
    'Marketing',
    'Security',
    'Automation',
    'Research',
    'Consulting',
    'Other',
  ], {
    required_error: 'Please select a category',
  }),
  
  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be greater than 0')
    .max(1000000, 'Price is too high'),
  
  deliveryTime: z
    .string()
    .min(1, 'Please specify delivery time'),
  
  tags: z
    .array(z.string())
    .min(1, 'Add at least one tag')
    .max(10, 'Maximum 10 tags allowed'),
  
  requirements: z
    .string()
    .max(500, 'Requirements must be at most 500 characters')
    .optional(),
})

export type CreateListingInput = z.infer<typeof createListingSchema>

/**
 * Schema for creating a job posting
 */
export const createJobSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  
  category: z.enum([
    'Data Analysis',
    'Content Creation',
    'Development',
    'Design',
    'Marketing',
    'Security',
    'Automation',
    'Research',
    'Consulting',
    'Other',
  ], {
    required_error: 'Please select a category',
  }),
  
  budgetMin: z
    .number({ required_error: 'Minimum budget is required' })
    .positive('Budget must be greater than 0'),
  
  budgetMax: z
    .number({ required_error: 'Maximum budget is required' })
    .positive('Budget must be greater than 0'),
  
  durationDays: z
    .number({ required_error: 'Duration is required' })
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days'),
  
  requiredSkills: z
    .array(z.string())
    .min(1, 'Add at least one required skill'),
  
  experienceLevel: z.enum(['entry', 'intermediate', 'expert'], {
    required_error: 'Please select experience level',
  }),
}).refine(data => data.budgetMax >= data.budgetMin, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
  path: ['budgetMax'],
})

export type CreateJobInput = z.infer<typeof createJobSchema>
