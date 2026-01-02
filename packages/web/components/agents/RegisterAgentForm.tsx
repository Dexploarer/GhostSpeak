'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRegisterAgent } from '@/lib/queries/agents'
import { uploadMetadataToIPFS } from '@/lib/utils/ipfs'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'

const registerAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  pricing: z.coerce.number().min(0.001, 'Pricing must be at least 0.001 SOL'),
  capabilities: z.array(z.string()).min(1, 'At least one capability is required'),
  category: z.string().min(1, 'Category is required'),
  avatar: z.string().url().optional().or(z.literal('')),
})

type RegisterAgentForm = z.infer<typeof registerAgentSchema>

const categories = [
  'Data Analysis',
  'Content Creation',
  'Automation',
  'Research',
  'Customer Support',
  'Development',
  'Design',
  'Marketing',
  'Other',
]

export function RegisterAgentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [newCapability, setNewCapability] = useState('')
  const registerAgent = useRegisterAgent()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RegisterAgentForm>({
    resolver: zodResolver(registerAgentSchema),
    defaultValues: {
      capabilities: [],
    },
  })

  const capabilities = watch('capabilities')

  const addCapability = () => {
    if (newCapability.trim() && !capabilities.includes(newCapability.trim())) {
      setValue('capabilities', [...capabilities, newCapability.trim()])
      setNewCapability('')
    }
  }

  const removeCapability = (capability: string) => {
    setValue(
      'capabilities',
      capabilities.filter((c) => c !== capability)
    )
  }

  const onSubmit = async (data: RegisterAgentForm) => {
    try {
      // Upload metadata to IPFS (with fallback to data URI for development)
      const metadataUri = await uploadMetadataToIPFS({
        name: data.name,
        description: data.description,
        category: data.category,
        avatar: data.avatar || undefined,
      })

      // Generate a unique agent ID
      const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      await registerAgent.mutateAsync({
        name: data.name,
        metadataUri,
        capabilities: data.capabilities,
        agentId,
      })

      reset()
      onSuccess?.()
      toast.success('Agent registered successfully!')
    } catch (error) {
      console.error('Failed to register agent:', error)
      toast.error('Failed to register agent')
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register New Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Agent Name</Label>
            <Input id="name" {...register('name')} placeholder="Enter agent name" />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe what your agent does..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="pricing">Pricing (SOL)</Label>
            <Input
              id="pricing"
              type="number"
              step="0.001"
              {...register('pricing')}
              placeholder="0.1"
            />
            {errors.pricing && (
              <p className="text-sm text-red-500 mt-1">{errors.pricing.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="avatar">Avatar URL (optional)</Label>
            <Input
              id="avatar"
              {...register('avatar')}
              placeholder="https://example.com/avatar.jpg"
            />
            {errors.avatar && <p className="text-sm text-red-500 mt-1">{errors.avatar.message}</p>}
          </div>

          <div>
            <Label>Capabilities</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                placeholder="Add a capability"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
              />
              <Button type="button" onClick={addCapability} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability) => (
                <Badge key={capability} variant="outline" className="gap-1">
                  {capability}
                  <button
                    type="button"
                    onClick={() => removeCapability(capability)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.capabilities && (
              <p className="text-sm text-red-500 mt-1">{errors.capabilities.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={registerAgent.isPending}
            className="w-full"
            variant="gradient"
          >
            {registerAgent.isPending ? 'Registering...' : 'Register Agent'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
