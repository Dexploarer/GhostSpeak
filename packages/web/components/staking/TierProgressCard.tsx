'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TierBadge } from './TierBadge'
import { ArrowRight } from 'lucide-react'

interface TierProgressCardProps {
  currentAmount: number
  currentTier: number
}

const TIER_THRESHOLDS = [
  { tier: 1, amount: 1_000, name: 'Bronze' },
  { tier: 2, amount: 10_000, name: 'Silver' },
  { tier: 3, amount: 100_000, name: 'Gold' },
]

export function TierProgressCard({ currentAmount, currentTier }: TierProgressCardProps) {
  // Find next tier
  const nextTier = TIER_THRESHOLDS.find((t) => t.tier > currentTier)
  const _currentTierData = TIER_THRESHOLDS.find((t) => t.tier === currentTier)

  // Calculate progress to next tier
  const progressPercentage = nextTier ? Math.min(100, (currentAmount / nextTier.amount) * 100) : 100

  const amountNeeded = nextTier ? nextTier.amount - currentAmount : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tier Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tier Display */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Current Tier</p>
            <TierBadge tier={currentTier} showLabel size="lg" />
          </div>
          {nextTier && (
            <>
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Next Tier</p>
                <TierBadge tier={nextTier.tier} showLabel size="lg" />
              </div>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {nextTier ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {currentAmount.toLocaleString()} / {nextTier.amount.toLocaleString()} GHOST
              </span>
              <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {amountNeeded.toLocaleString()} GHOST needed to reach {nextTier.name} tier
            </p>
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <p className="text-lg font-semibold text-primary">Maximum Tier Reached!</p>
            <p className="text-sm text-muted-foreground">You've unlocked all staking benefits</p>
          </div>
        )}

        {/* All Tiers Overview */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-sm font-semibold">All Tiers:</p>
          {TIER_THRESHOLDS.map((tier) => (
            <div
              key={tier.tier}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                tier.tier === currentTier
                  ? 'bg-primary/10 border-primary/30'
                  : tier.tier < currentTier
                    ? 'bg-muted/50 border-border opacity-60'
                    : 'bg-background border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <TierBadge tier={tier.tier} size="sm" />
                <div>
                  <p className="text-sm font-medium">{tier.name} Tier</p>
                  <p className="text-xs text-muted-foreground">
                    {tier.amount.toLocaleString()} GHOST
                  </p>
                </div>
              </div>
              {tier.tier === currentTier && (
                <span className="text-xs font-semibold text-primary">Current</span>
              )}
              {tier.tier < currentTier && (
                <span className="text-xs text-green-500">✓ Unlocked</span>
              )}
              {tier.tier > currentTier && (
                <span className="text-xs text-muted-foreground">Locked</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
