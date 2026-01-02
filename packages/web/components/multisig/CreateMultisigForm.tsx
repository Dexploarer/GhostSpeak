'use client'

import React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  Users,
  Plus,
  X,
  AlertTriangle,
  Info,
  Key,
  Clock,
  Settings,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCreateMultisig,
  type CreateMultisigData,
  MultisigType,
  MULTISIG_TYPE_INFO,
} from '@/lib/queries/multisig'
import { MultisigTypeSelector } from './MultisigTypeSelector'
import type { Address } from '@solana/kit'

const createMultisigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  multisigType: z.enum([
    MultisigType.Protocol,
    MultisigType.Dao,
    MultisigType.Dispute,
    MultisigType.AgentConsortium,
    MultisigType.AgentTreasury,
    MultisigType.Custom,
  ]),
  threshold: z.number().min(1, 'At least 1 signature required').max(10, 'Maximum 10 signatures'),
  signers: z
    .array(
      z.object({
        address: z.string().min(32, 'Invalid address').max(64, 'Invalid address'),
        label: z.string().optional(),
      })
    )
    .min(1, 'At least one signer required')
    .max(10, 'Maximum 10 signers'),
  autoExecute: z.boolean(),
  allowEmergencyOverride: z.boolean(),
  defaultTimeout: z.number().min(3600, 'Minimum 1 hour').max(604800, 'Maximum 7 days'),
})

type CreateMultisigFormData = z.infer<typeof createMultisigSchema>

interface CreateMultisigFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

const thresholdPresets = [
  { label: '1-of-N', description: 'Single signer can execute', security: 'Low' },
  { label: '2-of-3', description: 'Standard security', security: 'Medium' },
  { label: '3-of-5', description: 'High security', security: 'High' },
  { label: '5-of-7', description: 'Maximum security', security: 'Critical' },
]

const timeoutOptions = [
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '24 hours' },
  { value: 172800, label: '48 hours' },
  { value: 259200, label: '3 days' },
  { value: 604800, label: '7 days' },
]

export function CreateMultisigForm({
  onSuccess,
  onCancel,
  className,
}: CreateMultisigFormProps): React.JSX.Element {
  const createMultisig = useCreateMultisig()

  const form = useForm<CreateMultisigFormData>({
    resolver: zodResolver(createMultisigSchema),
    defaultValues: {
      name: '',
      multisigType: MultisigType.Custom,
      threshold: 2,
      signers: [
        { address: '', label: 'Signer 1' },
        { address: '', label: 'Signer 2' },
        { address: '', label: 'Signer 3' },
      ],
      autoExecute: true,
      allowEmergencyOverride: false,
      defaultTimeout: 86400,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'signers',
  })

  const watchedSigners = form.watch('signers')
  const watchedThreshold = form.watch('threshold')

  // Ensure threshold doesn't exceed signers
  React.useEffect(() => {
    if (watchedThreshold > watchedSigners.length) {
      form.setValue('threshold', watchedSigners.length)
    }
  }, [watchedSigners.length, watchedThreshold, form])

  const onSubmit = async (data: CreateMultisigFormData): Promise<void> => {
    try {
      const multisigData: CreateMultisigData = {
        name: data.name,
        threshold: data.threshold,
        signers: data.signers
          .filter((s) => s.address.trim() !== '')
          .map((s) => s.address as Address),
        config: {
          autoExecute: data.autoExecute,
          allowEmergencyOverride: data.allowEmergencyOverride,
          defaultTimeout: data.defaultTimeout,
        },
      }

      await createMultisig.mutateAsync(multisigData)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create multisig:', error)
    }
  }

  const validSignersCount = watchedSigners.filter((s) => s.address.trim() !== '').length
  const securityLevel =
    watchedThreshold === 1
      ? 'Low'
      : watchedThreshold <= 2
        ? 'Medium'
        : watchedThreshold <= 4
          ? 'High'
          : 'Critical'

  const securityColors = {
    Low: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    Medium: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    High: 'text-green-500 bg-green-500/10 border-green-500/20',
    Critical: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="w-5 h-5 text-primary" />
          <span>Create Multisig Wallet</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Multisig Name</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="e.g., Treasury Multisig, Team Wallet"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Multisig Type Selection */}
      <MultisigTypeSelector
        selectedType={form.watch('multisigType')}
        onSelect={(type) => {
          form.setValue('multisigType', type)
          // Apply recommended settings from the type
          const info = MULTISIG_TYPE_INFO[type]
          form.setValue('allowEmergencyOverride', info.requirements.requiresReputation)
          form.setValue('defaultTimeout', info.timelockHours * 3600 || 86400)
        }}
        userHasTokens={true} // Would come from actual wallet check
        userReputationScore={7500} // Would come from actual agent data
        showDetails={true}
      />

      <Separator />

      {/* Signers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <Label className="text-base font-semibold">Signers</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ address: '', label: `Signer ${fields.length + 1}` })}
            disabled={fields.length >= 10}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Signer
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        {...form.register(`signers.${index}.label`)}
                        placeholder="Label (optional)"
                        className="w-32"
                      />
                      <Input
                        {...form.register(`signers.${index}.address`)}
                        placeholder="Wallet address (e.g., 7xKX...)"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                    {form.formState.errors.signers?.[index]?.address && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.signers[index]?.address?.message}
                      </p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Maximum 10 signers. Each signer can approve transactions.
        </p>
      </div>

      <Separator />

      {/* Threshold */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          <Label className="text-base font-semibold">Approval Threshold</Label>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select
              value={String(watchedThreshold)}
              onValueChange={(value) => form.setValue('threshold', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(validSignersCount, 10) }, (_, i) => i + 1).map(
                  (n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} of {validSignersCount} signatures required
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div
            className={cn(
              'px-3 py-1 rounded-full border text-sm font-medium',
              securityColors[securityLevel]
            )}
          >
            {securityLevel} Security
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {thresholdPresets.map((preset) => {
            const [required, _total] = preset.label
              .split('-of-')
              .map((s, i) => (i === 1 ? 'N' : parseInt(s)))
            const isSelected =
              required === watchedThreshold &&
              validSignersCount >= (typeof required === 'number' ? required : 0)

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  if (typeof required === 'number' && validSignersCount >= required) {
                    form.setValue('threshold', required)
                  }
                }}
                disabled={typeof required === 'number' && validSignersCount < required}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  isSelected && 'border-primary bg-primary/10',
                  typeof required === 'number' &&
                    validSignersCount < required &&
                    'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="font-medium text-sm">{preset.label}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Advanced Settings */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Auto-Execute</Label>
              <p className="text-xs text-muted-foreground">
                Automatically execute transactions when threshold is met
              </p>
            </div>
            <Switch
              checked={form.watch('autoExecute')}
              onCheckedChange={(checked) => form.setValue('autoExecute', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Emergency Override</Label>
              <p className="text-xs text-muted-foreground">
                Allow emergency freeze with reduced threshold
              </p>
            </div>
            <Switch
              checked={form.watch('allowEmergencyOverride')}
              onCheckedChange={(checked) => form.setValue('allowEmergencyOverride', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Transaction Timeout
            </Label>
            <Select
              value={String(form.watch('defaultTimeout'))}
              onValueChange={(value) => form.setValue('defaultTimeout', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeoutOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pending transactions will expire after this duration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2 text-sm">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Multisig Summary</h4>
              <div className="space-y-1 text-blue-800 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {validSignersCount} signer{validSignersCount !== 1 ? 's' : ''} configured
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span>
                    Requires {watchedThreshold} of {validSignersCount} signatures
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{securityLevel} security level</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning for low security */}
      {watchedThreshold === 1 && validSignersCount > 1 && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> With a 1-of-N threshold, any single signer can execute
                transactions. Consider increasing the threshold for better security.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={createMultisig.isPending || validSignersCount < 1}
          className="flex items-center gap-2"
        >
          {createMultisig.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          {createMultisig.isPending ? 'Creating...' : 'Create Multisig'}
        </Button>
      </div>
    </form>
  )
}
