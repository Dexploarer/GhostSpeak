'use client'

import React, { useState } from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Play,
  Shield,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Key,
  Lock,
  Unlock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { Proposal } from '@/lib/queries/governance'
import { ProposalStatus } from '@/lib/queries/governance'
import { useMultisigs, type Multisig } from '@/lib/queries/multisig'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { toast } from 'sonner'
import type { Address } from '@solana/kit'

interface ProposalExecutionFlowProps {
  proposal: Proposal
  onSuccess?: () => void
  className?: string
}

type ExecutionStep = 'select-multisig' | 'review' | 'sign' | 'execute' | 'complete'

export function ProposalExecutionFlow({
  proposal,
  onSuccess,
  className,
}: ProposalExecutionFlowProps): React.JSX.Element | null {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<ExecutionStep>('select-multisig')
  const [selectedMultisig, setSelectedMultisig] = useState<Multisig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { address, isConnected } = useCrossmintSigner()
  const { data: multisigs, isLoading: loadingMultisigs } = useMultisigs()

  // Only show for succeeded proposals
  if (proposal.status !== ProposalStatus.Succeeded) {
    return null
  }

  const canExecute = proposal.status === ProposalStatus.Succeeded
  const hasMultisigs = (multisigs?.length ?? 0) > 0

  const handleStartExecution = () => {
    setCurrentStep('select-multisig')
    setSelectedMultisig(null)
    setIsDialogOpen(true)
  }

  const handleSelectMultisig = (multisigId: string) => {
    const multisig = multisigs?.find((m) => m.multisigId === multisigId)
    if (multisig) {
      setSelectedMultisig(multisig)
      setCurrentStep('review')
    }
  }

  const handleProceedToSign = () => {
    setCurrentStep('sign')
  }

  const handleSign = async () => {
    if (!selectedMultisig) return

    setIsSubmitting(true)
    try {
      // In production, this would create a pending transaction in the multisig
      // that requires threshold signatures before execution
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setCurrentStep('execute')
    } catch (error) {
      console.error('Failed to sign:', error)
      toast.error('Failed to sign transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExecute = async () => {
    if (!selectedMultisig) return

    setIsSubmitting(true)
    try {
      // In production, this would execute the proposal through the multisig
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setCurrentStep('complete')
      toast.success('Proposal executed successfully!')
      onSuccess?.()
    } catch (error) {
      console.error('Failed to execute:', error)
      toast.error('Failed to execute proposal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setCurrentStep('select-multisig')
    setSelectedMultisig(null)
  }

  const steps = [
    { id: 'select-multisig', label: 'Select Multisig' },
    { id: 'review', label: 'Review' },
    { id: 'sign', label: 'Sign' },
    { id: 'execute', label: 'Execute' },
    { id: 'complete', label: 'Complete' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`

  return (
    <>
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">Ready for Execution</h3>
              <p className="text-sm text-muted-foreground">
                This proposal has passed and can be executed via multisig
              </p>
            </div>
          </div>
          <Button
            onClick={handleStartExecution}
            disabled={!isConnected || !canExecute}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Execute via Multisig
          </Button>
        </div>

        {!isConnected && (
          <div className="mt-4 flex items-center gap-2 text-yellow-500 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Connect your wallet to execute this proposal</span>
          </div>
        )}
      </GlassCard>

      {/* Execution Flow Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Execute Proposal via Multisig
            </DialogTitle>
            <DialogDescription>
              Execute "{proposal.title}" using a multisig wallet for secure governance
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isComplete = index < currentStepIndex

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        isComplete && 'bg-green-500 text-white',
                        isActive && 'bg-primary text-primary-foreground',
                        !isComplete && !isActive && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs',
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2',
                        index < currentStepIndex ? 'bg-green-500' : 'bg-muted'
                      )}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {/* Step 1: Select Multisig */}
            {currentStep === 'select-multisig' && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Select a Multisig Wallet
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose which multisig wallet will execute this proposal.
                  You must be an owner or signer on the selected multisig.
                </p>

                {loadingMultisigs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !hasMultisigs ? (
                  <GlassCard className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    </div>
                    <h4 className="font-semibold mb-2">No Multisig Wallets</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      You don't have any multisig wallets. Create one first to execute proposals.
                    </p>
                    <Button variant="outline" onClick={handleClose}>
                      Go to Multisig
                    </Button>
                  </GlassCard>
                ) : (
                  <div className="space-y-3">
                    {multisigs?.map((multisig) => (
                      <GlassCard
                        key={multisig.multisigId}
                        variant="interactive"
                        className={cn(
                          'p-4',
                          selectedMultisig?.multisigId === multisig.multisigId &&
                            'ring-2 ring-primary'
                        )}
                        onClick={() => handleSelectMultisig(multisig.multisigId)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {multisig.multisigId.slice(0, 8)}
                              </span>
                              <Badge variant="outline">
                                {multisig.threshold} of {multisig.signers.length}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {shortenAddress(multisig.address)}
                            </span>
                          </div>
                          <div className="flex -space-x-2">
                            {multisig.signers.slice(0, 3).map((signer) => (
                              <Avatar
                                key={signer}
                                className="w-6 h-6 border-2 border-background"
                              >
                                <AvatarFallback className="text-xs">
                                  {signer.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Review */}
            {currentStep === 'review' && selectedMultisig && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Review Execution</Label>
                <p className="text-sm text-muted-foreground">
                  Review the proposal details before proceeding with execution.
                </p>

                <GlassCard className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Proposal</span>
                    <span className="font-medium">{proposal.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="secondary">{proposal.proposalType}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Multisig</span>
                    <span className="font-mono text-sm">
                      {shortenAddress(selectedMultisig.address)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Required Signatures
                    </span>
                    <span>
                      {selectedMultisig.threshold} of {selectedMultisig.signers.length}
                    </span>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-400">Multisig Execution</p>
                      <p className="text-muted-foreground">
                        This will create a pending transaction in the multisig that
                        requires {selectedMultisig.threshold} signatures before execution.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('select-multisig')}
                  >
                    Back
                  </Button>
                  <Button onClick={handleProceedToSign}>
                    Proceed to Sign
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Sign */}
            {currentStep === 'sign' && selectedMultisig && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Sign Transaction</Label>
                <p className="text-sm text-muted-foreground">
                  Sign the execution transaction. Other signers will need to approve
                  before it can be executed.
                </p>

                <GlassCard className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Sign with Your Wallet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    You will be prompted to sign a transaction that creates the
                    execution request in the multisig.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>1 of {selectedMultisig.threshold} signatures</span>
                  </div>
                </GlassCard>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('review')}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button onClick={handleSign} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Signing...' : 'Sign Transaction'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Execute */}
            {currentStep === 'execute' && selectedMultisig && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Execute Proposal</Label>
                <p className="text-sm text-muted-foreground">
                  The required signatures have been collected. You can now execute
                  the proposal.
                </p>

                <GlassCard className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Unlock className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Ready to Execute</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    All required signatures have been collected. Click execute to
                    finalize the proposal.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {selectedMultisig.threshold} of {selectedMultisig.threshold} signatures
                    </span>
                  </div>
                </GlassCard>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleExecute}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Executing...' : 'Execute Proposal'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 'complete' && (
              <div className="space-y-4 text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Proposal Executed!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  The proposal "{proposal.title}" has been successfully executed
                  through the multisig wallet.
                </p>
                <Button onClick={handleClose}>Close</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
