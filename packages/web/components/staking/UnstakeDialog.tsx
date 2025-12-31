'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, TrendingDown } from 'lucide-react'
import { useUnstakeMutation } from '@/lib/hooks/useStakingMutations'

interface UnstakeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentAddress: string
  stakedAmount: number
  reputationBoost: number
  onSuccess?: () => void
}

export function UnstakeDialog({
  open,
  onOpenChange,
  agentAddress,
  stakedAmount,
  reputationBoost,
  onSuccess,
}: UnstakeDialogProps) {
  const unstakeMutation = useUnstakeMutation()
  const [confirmed, setConfirmed] = useState(false)

  const handleUnstake = async () => {
    if (!confirmed) return

    try {
      // TODO: Derive these PDAs from the agentAddress
      // These should be derived using PDA derivation functions from the SDK
      const stakingAccount = 'PLACEHOLDER_STAKING_ACCOUNT' // TODO: Derive staking account PDA
      const agentTokenAccount = 'PLACEHOLDER_TOKEN_ACCOUNT' // TODO: Derive agent's GHOST token account
      const stakingVault = 'PLACEHOLDER_STAKING_VAULT' // TODO: Derive staking vault PDA

      await unstakeMutation.mutateAsync({
        agentAddress,
        stakingAccount,
        agentTokenAccount,
        stakingVault,
      })

      // Close dialog and reset state
      onOpenChange(false)
      setConfirmed(false)
      onSuccess?.()
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Unstaking error:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Unstake GHOST Tokens
          </DialogTitle>
          <DialogDescription>
            You're about to unstake your GHOST tokens. This action will remove all staking benefits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount to Unstake */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount to Unstake:</span>
              <span className="text-lg font-bold">{stakedAmount.toLocaleString()} GHOST</span>
            </div>
          </div>

          {/* Benefits Lost */}
          <Alert variant="destructive">
            <TrendingDown className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">You will lose:</p>
              <ul className="space-y-1 text-sm">
                <li>• +{reputationBoost}% Reputation Boost</li>
                <li>• Verified Badge (if applicable)</li>
                <li>• Premium Benefits (if applicable)</li>
                <li>• Priority Support</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2 p-3 border border-border rounded-lg">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand I'll lose all staking benefits
              </Label>
              <p className="text-xs text-muted-foreground">
                Your GHOST tokens will be returned to your wallet, but you'll lose your reputation
                boost and tier benefits.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={unstakeMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleUnstake}
            disabled={!confirmed || unstakeMutation.isPending}
            className="w-full sm:w-auto"
          >
            {unstakeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Unstaking...
              </>
            ) : (
              'Unstake GHOST'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
