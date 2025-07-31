'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCreateWorkOrder } from '@/lib/queries/work-orders'
import { X, Plus, Calendar, DollarSign, User, Target } from 'lucide-react'
import { toast } from 'sonner'

const createWorkOrderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  requirements: z
    .array(z.string().min(1, 'Requirement cannot be empty'))
    .min(1, 'At least one requirement is required'),
  paymentAmount: z.coerce.number().min(0.01, 'Payment amount must be at least 0.01 SOL'),
  paymentToken: z.string().min(1, 'Payment token is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  provider: z.string().min(1, 'Provider address is required'),
  useMilestones: z.boolean(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1, 'Milestone title is required'),
        description: z.string().optional(),
        amount: z.coerce.number().min(0.001, 'Amount must be at least 0.001 SOL'),
      })
    )
    .optional(),
})

type CreateWorkOrderForm = z.infer<typeof createWorkOrderSchema>

const paymentTokens = [
  { value: 'So11111111111111111111111111111111111111112', label: 'SOL' },
  { value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'USDC' },
]

// Mock provider addresses for demo
const mockProviders = [
  { address: '2vBxCr8mL5kN9fT4qY7sW3gH6jP1zRdV5nM8tK4uFgBs', name: 'BlockSec Auditors' },
  { address: '8tPxvB4nHk3JfL2cXr9WqM5sN6vDrFg4Yh7ZeKm2TwQp', name: 'AI Content Studio' },
  { address: '9vHfnqoKs8CwJ4kHl2tNxP7VrFGn5mLqW3B9dReK8sJp', name: 'Data Analyst Pro' },
  { address: '5K8hqnbm4hNyKe6nYe8oZzHxKqnkzrXkYv6nK8hqnbmu', name: 'Solana Dev Expert' },
  { address: '7xKXtg2CW3J5cqf1Tka7uLiWJNxqJcMRXMK3s5vVrBWp', name: 'Legal AI Assistant' },
]

export function CreateWorkOrderForm({ onSuccess }: { onSuccess?: () => void }) {
  const [newRequirement, setNewRequirement] = useState('')
  const createWorkOrder = useCreateWorkOrder()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<CreateWorkOrderForm>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: {
      requirements: [],
      paymentToken: 'So11111111111111111111111111111111111111112',
      useMilestones: false,
      milestones: [],
    },
  })

  const {
    fields: milestoneFields,
    append: appendMilestone,
    remove: removeMilestone,
  } = useFieldArray({
    control,
    name: 'milestones',
  })

  const requirements = watch('requirements')
  const useMilestones = watch('useMilestones')
  const paymentAmount = watch('paymentAmount')
  const milestones = watch('milestones')

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setValue('requirements', [...requirements, newRequirement.trim()])
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    setValue(
      'requirements',
      requirements.filter((_, i) => i !== index)
    )
  }

  const addMilestone = () => {
    appendMilestone({
      title: '',
      description: '',
      amount: 0,
    })
  }

  const calculateMilestoneTotal = () => {
    return milestones?.reduce((total, milestone) => total + (milestone.amount || 0), 0) || 0
  }

  const onSubmit = async (data: CreateWorkOrderForm) => {
    try {
      // Validate milestone totals
      if (data.useMilestones && data.milestones) {
        const milestoneTotal = calculateMilestoneTotal()
        if (Math.abs(milestoneTotal - data.paymentAmount) > 0.001) {
          toast.error('Milestone amounts must equal total payment amount')
          return
        }
      }

      // Convert deadline string to Date
      const deadline = new Date(data.deadline)
      if (deadline <= new Date()) {
        toast.error('Deadline must be in the future')
        return
      }

      await createWorkOrder.mutateAsync({
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        paymentAmount: BigInt(Math.floor(data.paymentAmount * 1e9)), // Convert SOL to lamports
        paymentToken: data.paymentToken,
        deadline,
        provider: data.provider,
        milestones: data.useMilestones
          ? data.milestones?.map((milestone) => ({
              title: milestone.title,
              description: milestone.description,
              amount: BigInt(Math.floor(milestone.amount * 1e9)),
            }))
          : undefined,
      })

      reset()
      onSuccess?.()
      toast.success('Work order created successfully!')
    } catch (error) {
      console.error('Failed to create work order:', error)
      toast.error('Failed to create work order')
    }
  }

  const milestoneTotal = calculateMilestoneTotal()
  const milestoneError = Boolean(
    useMilestones && paymentAmount && Math.abs(milestoneTotal - paymentAmount) > 0.001
  )

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Create New Work Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Work Order Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g., Smart Contract Security Audit"
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Detailed description of the work to be performed..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  {...register('provider')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">Select a provider</option>
                  {mockProviders.map((provider) => (
                    <option key={provider.address} value={provider.address}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                {errors.provider && (
                  <p className="text-sm text-red-500 mt-1">{errors.provider.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  {...register('deadline')}
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.deadline && (
                  <p className="text-sm text-red-500 mt-1">{errors.deadline.message}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.001"
                    {...register('paymentAmount')}
                    placeholder="1.5"
                  />
                  {errors.paymentAmount && (
                    <p className="text-sm text-red-500 mt-1">{errors.paymentAmount.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="paymentToken">Token</Label>
                  <select
                    id="paymentToken"
                    {...register('paymentToken')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-950"
                  >
                    {paymentTokens.map((token) => (
                      <option key={token.value} value={token.value}>
                        {token.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="useMilestones"
                    {...register('useMilestones')}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="useMilestones">Use milestone-based payments</Label>
                </div>

                {useMilestones && (
                  <div className="space-y-3">
                    {milestoneFields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Milestone {index + 1}</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeMilestone(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          {...register(`milestones.${index}.title`)}
                          placeholder="Milestone title"
                          className="text-sm"
                        />
                        <Input
                          {...register(`milestones.${index}.description`)}
                          placeholder="Description (optional)"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.001"
                          {...register(`milestones.${index}.amount`)}
                          placeholder="Amount"
                          className="text-sm"
                        />
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addMilestone}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Milestone
                    </Button>

                    {milestoneError && (
                      <p className="text-sm text-red-500">
                        Milestone total ({milestoneTotal.toFixed(3)}) must equal payment amount (
                        {paymentAmount?.toFixed(3) || '0'})
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Requirements Section */}
          <div>
            <Label>Requirements</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add a requirement"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" onClick={addRequirement} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {requirements.map((requirement, index) => (
                <Badge key={index} variant="outline" className="gap-1">
                  {requirement}
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.requirements && (
              <p className="text-sm text-red-500 mt-1">{errors.requirements.message}</p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-medium mb-2">Order Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span>
                  Total: {paymentAmount?.toFixed(3) || '0'}{' '}
                  {paymentTokens.find((t) => t.value === watch('paymentToken'))?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>
                  Due:{' '}
                  {watch('deadline') ? new Date(watch('deadline')).toLocaleDateString() : 'Not set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span>Requirements: {requirements.length}</span>
              </div>
              {useMilestones && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <span>Milestones: {milestoneFields.length}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={createWorkOrder.isPending || milestoneError}
            className="w-full"
            variant="gradient"
          >
            {createWorkOrder.isPending ? 'Creating Work Order...' : 'Create Work Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
