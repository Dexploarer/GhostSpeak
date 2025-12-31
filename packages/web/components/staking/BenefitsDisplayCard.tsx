'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Award, Star, Crown, Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BenefitsDisplayCardProps {
  currentTier: number
}

const TIER_BENEFITS = [
  {
    tier: 1,
    name: 'Bronze Tier',
    icon: Star,
    amount: '1,000 GHOST',
    benefits: [
      { label: '+5% Reputation Boost', unlocked: true },
      { label: 'Priority Support', unlocked: true },
      { label: 'Early Feature Access', unlocked: true },
    ],
  },
  {
    tier: 2,
    name: 'Silver Tier',
    icon: Award,
    amount: '10,000 GHOST',
    benefits: [
      { label: '+15% Reputation Boost', unlocked: true },
      { label: 'Verified Badge on Profile', unlocked: true },
      { label: 'Featured in Search Results', unlocked: true },
      { label: 'Priority Dispute Resolution', unlocked: true },
    ],
  },
  {
    tier: 3,
    name: 'Gold Tier',
    icon: Crown,
    amount: '100,000 GHOST',
    benefits: [
      { label: 'All Silver Tier Benefits', unlocked: true },
      { label: 'Premium Agent Listing', unlocked: true },
      { label: 'Custom Profile URL', unlocked: true },
      { label: 'API Rate Limit Increase', unlocked: true },
      { label: 'White Glove Support', unlocked: true },
    ],
  },
]

export function BenefitsDisplayCard({ currentTier }: BenefitsDisplayCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staking Benefits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {TIER_BENEFITS.map((tier) => {
          const Icon = tier.icon
          const isUnlocked = currentTier >= tier.tier
          const isCurrent = currentTier === tier.tier

          return (
            <div
              key={tier.tier}
              className={cn(
                'p-4 rounded-lg border transition-all',
                isCurrent &&
                  'bg-primary/10 border-primary/30 ring-2 ring-primary/20',
                !isCurrent && isUnlocked && 'bg-green-500/5 border-green-500/20',
                !isUnlocked && 'bg-muted/30 border-border opacity-60'
              )}
            >
              {/* Tier Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isUnlocked ? 'bg-primary/20' : 'bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        isUnlocked ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">{tier.amount}</p>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs font-semibold text-primary px-2 py-1 bg-primary/20 rounded-full">
                    Active
                  </span>
                )}
                {!isCurrent && isUnlocked && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
                {!isUnlocked && (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Benefits List */}
              <ul className="space-y-2">
                {tier.benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm"
                  >
                    {isUnlocked ? (
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span
                      className={cn(
                        isUnlocked
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {benefit.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
