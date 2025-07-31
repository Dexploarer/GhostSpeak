'use client'

import React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Shield,
  Lock,
  Target,
  AlertCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateEscrow, type CreateEscrowData } from '@/lib/queries/escrow'
import { toast } from 'sonner'

// Real token data fetched from blockchain
import { useAvailableTokens } from '@/lib/queries/tokens'

const milestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number'),
})

const createEscrowSchema = z.object({
  client: z.string().min(1, 'Client address is required'),
  agent: z.string().min(1, 'Agent address is required'),
  taskId: z.string().min(1, 'Task description is required').max(200, 'Description too long'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number'),
  paymentToken: z.string().min(1, 'Payment token is required'),
  isConfidential: z.boolean().default(false),
  transferHook: z.string().optional(),
  expirationDays: z
    .string()
    .min(1, 'Expiration is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 365,
      'Expiration must be between 1-365 days'
    ),
  workOrderAddress: z.string().optional(),
  marketplaceListingAddress: z.string().optional(),
  milestones: z.array(milestoneSchema).optional(),
})

type CreateEscrowFormData = z.infer<typeof createEscrowSchema>

interface CreateEscrowFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultClient?: string
  defaultAgent?: string
  defaultWorkOrderAddress?: string
  defaultMarketplaceListingAddress?: string
  className?: string
}

export function CreateEscrowForm({
  onSuccess,
  onCancel,
  defaultClient,
  defaultAgent,
  defaultWorkOrderAddress,
  defaultMarketplaceListingAddress,
  className,
}: CreateEscrowFormProps): React.JSX.Element {
  const createEscrow = useCreateEscrow()
  const { data: availableTokens = [], isLoading: tokensLoading } = useAvailableTokens()

  const form = useForm<CreateEscrowFormData>({
    resolver: zodResolver(createEscrowSchema),
    defaultValues: {
      client: defaultClient || '',
      agent: defaultAgent || '',
      taskId: '',
      amount: '',
      paymentToken: 'So11111111111111111111111111111111111111112', // SOL
      isConfidential: false,
      transferHook: '',
      expirationDays: '30',
      workOrderAddress: defaultWorkOrderAddress || '',
      marketplaceListingAddress: defaultMarketplaceListingAddress || '',
      milestones: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'milestones',
  })

  const selectedToken = availableTokens.find(
    (token) => token.address === form.watch('paymentToken')
  ) || availableTokens[0]

  const totalMilestoneAmount = fields.reduce((sum, _, index) => {
    const amount = form.watch(`milestones.${index}.amount`)
    return sum + (amount ? Number(amount) : 0)
  }, 0)

  const mainAmount = Number(form.watch('amount') || 0)
  const amountMismatch = fields.length > 0 && Math.abs(totalMilestoneAmount - mainAmount) > 0.001

  const onSubmit = async (data: CreateEscrowFormData): Promise<void> => {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + Number(data.expirationDays))

      const createData: CreateEscrowData = {
        client: data.client,
        agent: data.agent,
        taskId: data.taskId,
        amount: BigInt(Math.floor(Number(data.amount) * Math.pow(10, selectedToken.decimals))),
        paymentToken: data.paymentToken,
        isConfidential: data.isConfidential,
        transferHook: data.transferHook || undefined,
        expiresAt,
        workOrderAddress: data.workOrderAddress || undefined,
        marketplaceListingAddress: data.marketplaceListingAddress || undefined,
        milestones: data.milestones?.map((milestone) => ({
          title: milestone.title,
          description: milestone.description,
          amount: BigInt(
            Math.floor(Number(milestone.amount) * Math.pow(10, selectedToken.decimals))
          ),
        })),
      }

      await createEscrow.mutateAsync(createData)
      toast.success('Escrow created successfully!')
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to create escrow')
      console.error('Create escrow error:', error)
    }
  }

  const addMilestone = (): void => {
    append({
      title: '',
      description: '',
      amount: '',
    })
  }

  const hasTransferFees = selectedToken.transferFeeConfig !== undefined
  const hasConfidentialSupport = selectedToken.confidentialTransferConfig !== undefined
  const hasInterestBearing = selectedToken.extensions.some((ext) => ext.type === 'InterestBearing')

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Address */}
          <div className="space-y-2">
            <Label htmlFor="client">Client Address</Label>
            <Input
              id="client"
              {...form.register('client')}
              placeholder="Client wallet address"
              className="font-mono text-sm"
            />
            {form.formState.errors.client && (
              <p className="text-sm text-red-500">{form.formState.errors.client.message}</p>
            )}
          </div>

          {/* Agent Address */}
          <div className="space-y-2">
            <Label htmlFor="agent">Agent Address</Label>
            <Input
              id="agent"
              {...form.register('agent')}
              placeholder="Agent wallet address"
              className="font-mono text-sm"
            />
            {form.formState.errors.agent && (
              <p className="text-sm text-red-500">{form.formState.errors.agent.message}</p>
            )}
          </div>
        </div>

        {/* Task Description */}
        <div className="space-y-2">
          <Label htmlFor="taskId">Task Description</Label>
          <Textarea
            id="taskId"
            {...form.register('taskId')}
            placeholder="Describe the work to be completed..."
            rows={3}
          />
          {form.formState.errors.taskId && (
            <p className="text-sm text-red-500">{form.formState.errors.taskId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="amount"
                {...form.register('amount')}
                placeholder="0.00"
                className="pl-10"
                type="number"
                step="any"
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Payment Token */}
          <div className="space-y-2">
            <Label htmlFor="paymentToken">Payment Token</Label>
            <Select
              value={form.watch('paymentToken')}
              onValueChange={(value: string) => form.setValue('paymentToken', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem
                    key={token.address}
                    value={token.address}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {token.name} ({token.symbol})
                      </span>
                      {token.extensions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Token-2022
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Token Features Info */}
        {(hasTransferFees || hasConfidentialSupport || hasInterestBearing) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="font-medium">Token-2022 Features Available:</div>
                <ul className="mt-1 space-y-1">
                  {hasTransferFees && (
                    <li>
                      • Transfer fees:{' '}
                      {selectedToken.transferFeeConfig!.transferFeeBasisPoints / 100}% per
                      transaction
                    </li>
                  )}
                  {hasConfidentialSupport && <li>• Confidential transfers supported</li>}
                  {hasInterestBearing && <li>• Interest bearing token</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expirationDays">Expiration (Days)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="expirationDays"
                {...form.register('expirationDays')}
                placeholder="30"
                className="pl-10"
                type="number"
                min="1"
                max="365"
              />
            </div>
            {form.formState.errors.expirationDays && (
              <p className="text-sm text-red-500">{form.formState.errors.expirationDays.message}</p>
            )}
          </div>

          {/* Confidential Transfer Toggle */}
          {hasConfidentialSupport && (
            <div className="space-y-2">
              <Label htmlFor="isConfidential">Privacy Settings</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="isConfidential"
                  checked={form.watch('isConfidential')}
                  onCheckedChange={(checked: boolean) => form.setValue('isConfidential', checked)}
                />
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="isConfidential" className="text-sm">
                    Use confidential transfers
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="workOrderAddress">Work Order Address (Optional)</Label>
            <Input
              id="workOrderAddress"
              {...form.register('workOrderAddress')}
              placeholder="Associated work order address"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplaceListingAddress">Marketplace Listing (Optional)</Label>
            <Input
              id="marketplaceListingAddress"
              {...form.register('marketplaceListingAddress')}
              placeholder="Associated marketplace listing"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Milestones Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Payment Milestones
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMilestone}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No milestones added. Single payment will be released upon completion.</p>
            </div>
          ) : (
            <>
              {amountMismatch && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <div className="font-medium">Amount Mismatch</div>
                      <div>
                        Main amount: {mainAmount} {selectedToken.symbol}, Milestone total:{' '}
                        {totalMilestoneAmount} {selectedToken.symbol}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Milestone {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`milestones.${index}.title`}>Title</Label>
                        <Input
                          {...form.register(`milestones.${index}.title`)}
                          placeholder="Milestone title"
                        />
                        {form.formState.errors.milestones?.[index]?.title && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.milestones[index]!.title!.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`milestones.${index}.amount`}>Amount</Label>
                        <Input
                          {...form.register(`milestones.${index}.amount`)}
                          placeholder="0.00"
                          type="number"
                          step="any"
                        />
                        {form.formState.errors.milestones?.[index]?.amount && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.milestones[index]!.amount!.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`milestones.${index}.description`}>
                        Description (Optional)
                      </Label>
                      <Textarea
                        {...form.register(`milestones.${index}.description`)}
                        placeholder="Describe what needs to be completed for this milestone"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={createEscrow.isPending} className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {createEscrow.isPending ? 'Creating...' : 'Create Escrow'}
        </Button>
      </div>
    </form>
  )
}
