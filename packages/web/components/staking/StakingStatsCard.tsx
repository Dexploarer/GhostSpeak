'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TierBadge } from './TierBadge'
import { Shield, Clock, TrendingUp, Unlock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface StakingStatsCardProps {
  agentAddress: string
  onStakeMore?: () => void
  onUnstake?: () => void
}

export function StakingStatsCard({
  agentAddress,
  onStakeMore,
  onUnstake,
}: StakingStatsCardProps) {
  const stakingAccount = useQuery(api.staking.getStakingAccount, { agentAddress })
  const isLoading = stakingAccount === undefined

  // Calculate countdown
  const timeRemaining = useMemo(() => {
    if (!stakingAccount) return null

    const now = Date.now()
    const remaining = stakingAccount.unlockAt - now

    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, expired: true }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes, expired: false }
  }, [stakingAccount])

  // Format unlock date
  const unlockDate = useMemo(() => {
    if (!stakingAccount) return null
    return new Date(stakingAccount.unlockAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [stakingAccount])

  // Calculate boost percentage
  const boostPercentage = useMemo(() => {
    if (!stakingAccount) return 0
    return stakingAccount.reputationBoostBps / 100
  }, [stakingAccount])

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader>
          <CardTitle>Staking Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stakingAccount) {
    return (
      <Card className="bg-gradient-to-br from-background via-background to-primary/5 border-dashed">
        <CardHeader>
          <CardTitle>Staking Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No active stake</p>
          <p className="text-xs text-muted-foreground">
            Stake GHOST tokens to boost your reputation and unlock premium benefits
          </p>
          <Button onClick={onStakeMore} className="w-full">
            Start Staking
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Staking Stats</span>
          <TierBadge tier={stakingAccount.tier} size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Staked */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Staked</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {stakingAccount.amountStaked.toLocaleString()}
            </span>
            <span className="text-lg text-muted-foreground">GHOST</span>
          </div>
        </div>

        {/* Reputation Boost */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold">Reputation Boost</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              +{boostPercentage}%
            </span>
          </div>
        </div>

        {/* Unlock Countdown */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Unlock Date: {unlockDate}</span>
          </div>
          {timeRemaining && !timeRemaining.expired ? (
            <div className="flex gap-2">
              <div className="flex-1 text-center p-2 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{timeRemaining.days}</div>
                <div className="text-xs text-muted-foreground">Days</div>
              </div>
              <div className="flex-1 text-center p-2 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{timeRemaining.hours}</div>
                <div className="text-xs text-muted-foreground">Hours</div>
              </div>
              <div className="flex-1 text-center p-2 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{timeRemaining.minutes}</div>
                <div className="text-xs text-muted-foreground">Mins</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Unlock className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">
                Unlocked - Ready to unstake
              </span>
            </div>
          )}
        </div>

        {/* Active Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Active Benefits:</p>
          <div className="space-y-1.5">
            {stakingAccount.hasVerifiedBadge && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Verified Badge</span>
              </div>
            )}
            {stakingAccount.hasPremiumBenefits && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                <span>Premium Benefits</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Priority Support</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={onStakeMore}
            variant="outline"
            className="flex-1"
          >
            Stake More
          </Button>
          <Button
            onClick={onUnstake}
            variant="destructive"
            className="flex-1"
            disabled={!timeRemaining?.expired}
          >
            Unstake
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
