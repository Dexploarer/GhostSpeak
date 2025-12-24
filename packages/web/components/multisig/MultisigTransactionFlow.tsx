'use client'

import React, { useState } from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Shield,
  Coins,
  Settings,
  Users,
  Zap,
  Snowflake,
  ArrowRight,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Multisig } from '@/lib/queries/multisig'
import { TransactionType, TransactionPriority } from '@/lib/queries/multisig'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { toast } from 'sonner'

interface MultisigTransactionFlowProps {
  multisig: Multisig
  onSuccess?: () => void
}

const transactionTypeOptions = [
  {
    value: TransactionType.Transfer,
    label: 'Transfer',
    description: 'Transfer tokens from multisig',
    icon: Coins,
    color: 'text-green-500',
  },
  {
    value: TransactionType.ParameterUpdate,
    label: 'Parameter Update',
    description: 'Update protocol parameters',
    icon: Settings,
    color: 'text-blue-500',
  },
  {
    value: TransactionType.SignerAddition,
    label: 'Add Signer',
    description: 'Add a new signer to the multisig',
    icon: Users,
    color: 'text-purple-500',
  },
  {
    value: TransactionType.SignerRemoval,
    label: 'Remove Signer',
    description: 'Remove a signer from the multisig',
    icon: Users,
    color: 'text-red-500',
  },
  {
    value: TransactionType.ThresholdUpdate,
    label: 'Update Threshold',
    description: 'Change the required signatures',
    icon: Shield,
    color: 'text-orange-500',
  },
  {
    value: TransactionType.ProtocolUpgrade,
    label: 'Protocol Upgrade',
    description: 'Upgrade protocol smart contracts',
    icon: Zap,
    color: 'text-yellow-500',
  },
  {
    value: TransactionType.EmergencyFreeze,
    label: 'Emergency Freeze',
    description: 'Freeze the multisig for emergency',
    icon: Snowflake,
    color: 'text-cyan-500',
  },
]

const priorityOptions = [
  { value: TransactionPriority.Low, label: 'Low', color: 'text-gray-500' },
  { value: TransactionPriority.Normal, label: 'Normal', color: 'text-blue-500' },
  { value: TransactionPriority.High, label: 'High', color: 'text-orange-500' },
  { value: TransactionPriority.Critical, label: 'Critical', color: 'text-red-500' },
  { value: TransactionPriority.Emergency, label: 'Emergency', color: 'text-red-600' },
]

export function MultisigTransactionFlow({
  multisig,
  onSuccess,
}: MultisigTransactionFlowProps): React.JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [step, setStep] = useState<'type' | 'details' | 'review' | 'submit'>('type')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null)
  const [priority, setPriority] = useState<TransactionPriority>(TransactionPriority.Normal)
  const [targetAddress, setTargetAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const { address, isConnected } = useCrossmintSigner()

  const isOwner = multisig.owner === address
  const isSigner = address ? multisig.signers.includes(address) : false
  const canCreateTransaction = isOwner || isSigner

  const selectedTypeOption = transactionTypeOptions.find((opt) => opt.value === transactionType)

  const handleOpen = () => {
    setStep('type')
    setTransactionType(null)
    setPriority(TransactionPriority.Normal)
    setTargetAddress('')
    setAmount('')
    setDescription('')
    setIsDialogOpen(true)
  }

  const handleSelectType = (type: TransactionType) => {
    setTransactionType(type)
    setStep('details')
  }

  const handleProceedToReview = () => {
    if (!targetAddress) {
      toast.error('Target address is required')
      return
    }
    setStep('review')
  }

  const handleSubmit = async () => {
    if (!transactionType || !targetAddress) return

    setIsSubmitting(true)
    try {
      // In production, this would create a pending transaction
      // that other signers need to approve
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success('Transaction created! Waiting for other signers.')
      setIsDialogOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create transaction:', error)
      toast.error('Failed to create transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`

  return (
    <>
      <Button onClick={handleOpen} disabled={!isConnected || !canCreateTransaction}>
        <Plus className="w-4 h-4 mr-2" />
        New Transaction
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Create Multisig Transaction
            </DialogTitle>
            <DialogDescription>
              Create a new transaction for the {shortenAddress(multisig.address)} multisig
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {['type', 'details', 'review', 'submit'].map((s, index) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    step === s && 'bg-primary text-primary-foreground',
                    ['type', 'details', 'review', 'submit'].indexOf(step) > index &&
                      'bg-green-500 text-white',
                    ['type', 'details', 'review', 'submit'].indexOf(step) < index &&
                      'bg-muted text-muted-foreground'
                  )}
                >
                  {['type', 'details', 'review', 'submit'].indexOf(step) > index ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5',
                      ['type', 'details', 'review', 'submit'].indexOf(step) > index
                        ? 'bg-green-500'
                        : 'bg-muted'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {/* Step 1: Select Type */}
            {step === 'type' && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Transaction Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {transactionTypeOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <GlassCard
                        key={option.value}
                        variant="interactive"
                        className="p-4"
                        onClick={() => handleSelectType(option.value)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              'bg-muted'
                            )}
                          >
                            <Icon className={cn('w-5 h-5', option.color)} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && selectedTypeOption && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <selectedTypeOption.icon className={cn('w-5 h-5', selectedTypeOption.color)} />
                  </div>
                  <div>
                    <div className="font-medium">{selectedTypeOption.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedTypeOption.description}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Target Address</Label>
                    <Input
                      id="target"
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="Enter target address..."
                      className="font-mono"
                    />
                  </div>

                  {(transactionType === TransactionType.Transfer ||
                    transactionType === TransactionType.ThresholdUpdate) && (
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        {transactionType === TransactionType.Transfer ? 'Amount' : 'New Threshold'}
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={
                          transactionType === TransactionType.Transfer
                            ? 'Enter amount...'
                            : 'Enter new threshold...'
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => setPriority(v as TransactionPriority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className={opt.color}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe this transaction..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep('type')}>
                    Back
                  </Button>
                  <Button onClick={handleProceedToReview}>
                    Review
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && selectedTypeOption && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Review Transaction</Label>

                <GlassCard className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="secondary">{selectedTypeOption.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Target</span>
                    <span className="font-mono text-sm">{shortenAddress(targetAddress)}</span>
                  </div>
                  {amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {transactionType === TransactionType.Transfer ? 'Amount' : 'New Threshold'}
                      </span>
                      <span className="font-medium">{amount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <Badge
                      variant="outline"
                      className={priorityOptions.find((p) => p.value === priority)?.color}
                    >
                      {priority}
                    </Badge>
                  </div>
                  {description && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Description</span>
                      <p className="text-sm mt-1">{description}</p>
                    </div>
                  )}
                </GlassCard>

                <GlassCard className="p-4 bg-yellow-500/5 border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-400">
                        Requires {multisig.threshold} Signatures
                      </p>
                      <p className="text-muted-foreground">
                        This transaction will require approval from {multisig.threshold} of{' '}
                        {multisig.signers.length} signers before it can be executed.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep('details')}>
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Creating...' : 'Create Transaction'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
