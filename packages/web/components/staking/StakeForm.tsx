'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TierBadge } from './TierBadge'
import { Loader2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStakeMutation } from '@/lib/hooks/useStakingMutations'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { deriveAllStakingPdas } from '@/lib/staking-pdas'
import { address } from '@solana/addresses'
import { getCurrentNetwork } from '@/lib/ghostspeak/client'

interface StakeFormProps {
  agentAddress: string
  ghostBalance: number
  onSuccess?: () => void
}

const LOCK_DURATIONS = [
  { days: 30, label: '30 Days', bonus: 0 },
  { days: 90, label: '90 Days', bonus: 2 },
  { days: 180, label: '180 Days', bonus: 5 },
  { days: 365, label: '365 Days', bonus: 10 },
]

export function StakeForm({ agentAddress, ghostBalance, onSuccess }: StakeFormProps) {
  const stakeMutation = useStakeMutation()
  const signerHook = useCrossmintSigner()
  const [amount, setAmount] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(LOCK_DURATIONS[0])

  // Calculate tier preview
  const tierPreview = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount >= 100_000) return 3
    if (numAmount >= 10_000) return 2
    if (numAmount >= 1_000) return 1
    return 0
  }, [amount])

  // Calculate unlock date
  const unlockDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + selectedDuration.days)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [selectedDuration])

  // Validation
  const isValid = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    return numAmount >= 1_000 && numAmount <= ghostBalance
  }, [amount, ghostBalance])

  const errorMessage = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    if (!amount) return null
    if (numAmount < 1_000) return 'Minimum stake is 1,000 GHOST'
    if (numAmount > ghostBalance) return 'Insufficient GHOST balance'
    return null
  }, [amount, ghostBalance])

  const handleMaxClick = () => {
    setAmount(ghostBalance.toString())
  }

  const handleStake = async () => {
    if (!isValid) return

    try {
      // Check wallet connection
      if (!signerHook.isConnected || !signerHook.address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }

      // Derive all PDAs using the connected wallet address
      const network = getCurrentNetwork() === 'testnet' ? 'devnet' : getCurrentNetwork()
      const pdas = await deriveAllStakingPdas(
        signerHook.address,
        address(agentAddress),
        network as 'mainnet' | 'devnet'
      )

      await stakeMutation.mutateAsync({
        agentAddress,
        amount: parseFloat(amount),
        lockDurationDays: selectedDuration.days,
        agentTokenAccount: pdas.agentTokenAccount,
        stakingVault: pdas.stakingVault,
        stakingConfig: pdas.stakingConfig,
      })

      // Reset form
      setAmount('')
      onSuccess?.()
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Staking error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stake GHOST Tokens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Available Balance:</span>
          <span className="font-semibold">{ghostBalance.toLocaleString()} GHOST</span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Stake Amount</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              type="number"
              placeholder="1,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleMaxClick}>
              Max
            </Button>
          </div>
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        </div>

        {/* Lock Duration Selector */}
        <div className="space-y-2">
          <Label>Lock Duration</Label>
          <div className="grid grid-cols-2 gap-2">
            {LOCK_DURATIONS.map((duration) => (
              <button
                key={duration.days}
                onClick={() => setSelectedDuration(duration)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  selectedDuration.days === duration.days
                    ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20'
                    : 'bg-background border-border hover:bg-muted'
                )}
              >
                <p className="font-semibold text-sm">{duration.label}</p>
                {duration.bonus > 0 && (
                  <p className="text-xs text-primary">+{duration.bonus}% bonus</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier Preview */}
        {tierPreview > 0 && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Tier You'll Reach:</span>
              <TierBadge tier={tierPreview} showLabel size="md" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  {tierPreview === 1 && '+5% reputation boost'}
                  {tierPreview === 2 && '+15% reputation boost + Verified badge'}
                  {tierPreview === 3 && '+15% boost + Verified + Premium benefits'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unlock Date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Unlock Date:</span>
          <span className="font-semibold">{unlockDate}</span>
        </div>

        {/* Warning */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your tokens will be locked for {selectedDuration.days} days. You won't be able to
            unstake until the lock period expires.
          </AlertDescription>
        </Alert>

        {/* Stake Button */}
        <Button
          onClick={handleStake}
          disabled={!isValid || stakeMutation.isPending}
          className="w-full"
          size="lg"
        >
          {stakeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Staking...
            </>
          ) : (
            'Stake GHOST'
          )}
        </Button>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          By staking, you'll boost your agent's reputation and unlock exclusive benefits. Minimum
          stake: 1,000 GHOST
        </p>
      </CardContent>
    </Card>
  )
}
