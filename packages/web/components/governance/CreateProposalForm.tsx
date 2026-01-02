'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  Coins,
  Zap,
  Sparkles,
  Shield,
  X,
  Plus,
  Clock,
  DollarSign,
  AlertTriangle,
  Info,
  Calendar,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProposalType, type CreateProposalData } from '@/lib/queries/governance'
import { useCreateProposal } from '@/lib/queries/governance'

const createProposalSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(100, 'Description must be at least 100 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  proposalType: z.enum([
    ProposalType.ParameterChange,
    ProposalType.Treasury,
    ProposalType.Upgrade,
    ProposalType.Feature,
    ProposalType.Emergency,
  ]),
  category: z.string().min(1, 'Category is required'),
  impactLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  votingDuration: z
    .number()
    .min(1, 'Voting duration must be at least 1 day')
    .max(30, 'Voting duration cannot exceed 30 days'),
  executionDelay: z
    .number()
    .min(0, 'Execution delay cannot be negative')
    .max(168, 'Execution delay cannot exceed 7 days'),
  quorumRequired: z.string().optional(),
  approvalThreshold: z
    .number()
    .min(1, 'Approval threshold must be at least 1%')
    .max(100, 'Approval threshold cannot exceed 100%'),
  estimatedCost: z.string().optional(),
  tags: z.string().optional(),
})

type CreateProposalFormData = z.infer<typeof createProposalSchema>

interface CreateProposalFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

const proposalTypeOptions = [
  {
    value: ProposalType.ParameterChange,
    label: 'Parameter Change',
    description: 'Modify protocol parameters and settings',
    icon: Settings,
    color: 'text-blue-500',
    examples: 'Fee rates, limits, thresholds',
  },
  {
    value: ProposalType.Treasury,
    label: 'Treasury Management',
    description: 'Allocate or manage treasury funds',
    icon: Coins,
    color: 'text-green-500',
    examples: 'Grants, incentives, funding',
  },
  {
    value: ProposalType.Upgrade,
    label: 'Protocol Upgrade',
    description: 'Upgrade smart contracts or core functionality',
    icon: Zap,
    color: 'text-purple-500',
    examples: 'Smart contract updates, migrations',
  },
  {
    value: ProposalType.Feature,
    label: 'New Feature',
    description: 'Add new features or capabilities',
    icon: Sparkles,
    color: 'text-indigo-500',
    examples: 'Cross-chain support, new modules',
  },
  {
    value: ProposalType.Emergency,
    label: 'Emergency Action',
    description: 'Urgent actions for critical situations',
    icon: Shield,
    color: 'text-red-500',
    examples: 'Pause protocol, security fixes',
  },
]

const categoryOptions = [
  'Protocol Parameters',
  'Treasury Management',
  'Protocol Upgrades',
  'New Features',
  'Emergency Actions',
  'Community Initiatives',
  'Partnership Proposals',
  'Research & Development',
]

const impactLevelInfo = {
  Low: {
    description: 'Minor changes with minimal impact',
    color: 'text-green-600',
    threshold: 50,
  },
  Medium: {
    description: 'Moderate changes affecting some users',
    color: 'text-yellow-600',
    threshold: 55,
  },
  High: {
    description: 'Significant changes affecting most users',
    color: 'text-orange-600',
    threshold: 60,
  },
  Critical: {
    description: 'Major changes affecting the entire protocol',
    color: 'text-red-600',
    threshold: 66,
  },
}

export function CreateProposalForm({
  onSuccess,
  onCancel,
  className,
}: CreateProposalFormProps): React.JSX.Element {
  const [tagInput, setTagInput] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])

  const createProposal = useCreateProposal()

  const form = useForm<CreateProposalFormData>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: {
      title: '',
      description: '',
      proposalType: ProposalType.ParameterChange,
      category: 'Protocol Parameters',
      impactLevel: 'Medium',
      votingDuration: 7,
      executionDelay: 48,
      quorumRequired: '',
      approvalThreshold: 50,
      estimatedCost: '',
      tags: '',
    },
  })

  const watchedProposalType = form.watch('proposalType')
  const watchedImpactLevel = form.watch('impactLevel')
  const watchedDescription = form.watch('description')

  // Auto-adjust settings based on proposal type and impact level
  React.useEffect(() => {
    const impactInfo = impactLevelInfo[watchedImpactLevel]
    form.setValue('approvalThreshold', impactInfo.threshold)

    // Adjust voting duration based on type
    if (watchedProposalType === ProposalType.Emergency) {
      form.setValue('votingDuration', 1)
      form.setValue('executionDelay', 1)
    } else if (watchedProposalType === ProposalType.Upgrade) {
      form.setValue('votingDuration', 14)
      form.setValue('executionDelay', 72)
    }
  }, [watchedProposalType, watchedImpactLevel, form])

  const onSubmit = async (data: CreateProposalFormData): Promise<void> => {
    try {
      const proposalData: CreateProposalData = {
        title: data.title,
        description: data.description,
        proposalType: data.proposalType,
        category: data.category,
        impactLevel: data.impactLevel,
        tags,
        votingDuration: data.votingDuration,
        executionDelay: data.executionDelay,
        quorumRequired: data.quorumRequired,
        approvalThreshold: data.approvalThreshold,
        estimatedCost: data.estimatedCost,
      }

      await createProposal.mutateAsync(proposalData)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create proposal:', error)
    }
  }

  const addTag = (): void => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string): void => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const selectedProposalType = proposalTypeOptions.find(
    (option) => option.value === watchedProposalType
  )
  const SelectedIcon = selectedProposalType?.icon || Settings
  const selectedImpactInfo = impactLevelInfo[watchedImpactLevel]

  const remainingChars = 5000 - watchedDescription.length

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      {/* Proposal Type Selection */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Proposal Type</Label>
        <div className="grid grid-cols-1 gap-3">
          {proposalTypeOptions.map((option) => {
            const Icon = option.icon
            const isSelected = watchedProposalType === option.value

            return (
              <Card
                key={option.value}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                )}
                onClick={() => form.setValue('proposalType', option.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={cn('w-6 h-6 mt-1', option.color)} />
                    <div className="flex-1">
                      <div className="font-medium mb-1">{option.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {option.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        <strong>Examples:</strong> {option.examples}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <SelectedIcon className="w-5 h-5" />
          Basic Information
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="title">Proposal Title</Label>
            <span className="text-red-500">*</span>
          </div>
          <Input
            id="title"
            {...form.register('title')}
            placeholder="Enter a clear, descriptive title for your proposal"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="description">Description</Label>
            <span className="text-red-500">*</span>
          </div>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="Provide a detailed description of your proposal including rationale, implementation plan, and expected outcomes..."
            rows={8}
            className="resize-none"
          />
          <div className="flex justify-between items-center text-xs">
            {form.formState.errors.description && (
              <p className="text-red-500">{form.formState.errors.description.message}</p>
            )}
            <p
              className={cn(
                'text-gray-500',
                remainingChars < 100 && 'text-orange-500',
                remainingChars < 0 && 'text-red-500'
              )}
            >
              {remainingChars} characters remaining
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(value: string) => form.setValue('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="impactLevel">Impact Level</Label>
            <Select
              value={form.watch('impactLevel')}
              onValueChange={(value: 'Low' | 'Medium' | 'High' | 'Critical') =>
                form.setValue('impactLevel', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(impactLevelInfo).map(([level, info]) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <span className={info.color}>{level}</span>
                      <span className="text-xs text-gray-500">({info.threshold}% threshold)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">{selectedImpactInfo.description}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags (Optional)</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyPress}
              placeholder="Add tags to categorize your proposal..."
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTag(tag)}
                    className="h-4 w-4 p-0 hover:bg-red-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">Maximum 10 tags</p>
        </div>
      </div>

      <Separator />

      {/* Voting Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Voting Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="votingDuration">Voting Duration (Days)</Label>
                <span className="text-red-500">*</span>
              </div>
              <Select
                value={form.watch('votingDuration').toString()}
                onValueChange={(value: string) => form.setValue('votingDuration', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day (Emergency only)</SelectItem>
                  <SelectItem value="3">3 days (Fast track)</SelectItem>
                  <SelectItem value="7">7 days (Standard)</SelectItem>
                  <SelectItem value="14">14 days (Major changes)</SelectItem>
                  <SelectItem value="21">21 days (Critical updates)</SelectItem>
                  <SelectItem value="30">30 days (Maximum)</SelectItem>
                </SelectContent>
              </Select>
              {watchedProposalType === ProposalType.Emergency && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  Emergency proposals have shortened voting periods
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="executionDelay">Execution Delay (Hours)</Label>
              <Select
                value={form.watch('executionDelay').toString()}
                onValueChange={(value: string) => form.setValue('executionDelay', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No delay</SelectItem>
                  <SelectItem value="1">1 hour (Emergency)</SelectItem>
                  <SelectItem value="24">24 hours (Standard)</SelectItem>
                  <SelectItem value="48">48 hours (Recommended)</SelectItem>
                  <SelectItem value="72">72 hours (Major changes)</SelectItem>
                  <SelectItem value="168">7 days (Critical updates)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Time delay between proposal approval and execution
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="approvalThreshold">Approval Threshold (%)</Label>
              <Input
                id="approvalThreshold"
                type="number"
                min="1"
                max="100"
                {...form.register('approvalThreshold', { valueAsNumber: true })}
                className="text-center"
              />
              <p className="text-xs text-gray-500">
                Percentage of votes needed to pass (auto-set by impact level)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quorumRequired">Minimum Quorum (Optional)</Label>
              <Input
                id="quorumRequired"
                {...form.register('quorumRequired')}
                placeholder="100000"
              />
              <p className="text-xs text-gray-500">Minimum number of votes required for validity</p>
            </div>
          </div>

          {/* Cost Estimation */}
          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost (Optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="estimatedCost"
                {...form.register('estimatedCost')}
                placeholder="e.g., 50,000 GHOST or 10 SOL"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">Implementation cost in tokens or SOL</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2 text-sm">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Proposal Summary</h4>
              <div className="space-y-1 text-blue-800 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Voting will run for {form.watch('votingDuration')} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Execution delay: {form.watch('executionDelay')} hours after approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Requires {form.watch('approvalThreshold')}% approval to pass</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={createProposal.isPending}
          className="flex items-center gap-2"
        >
          <SelectedIcon className="w-4 h-4" />
          {createProposal.isPending ? 'Creating...' : 'Create Proposal'}
        </Button>
      </div>
    </form>
  )
}
