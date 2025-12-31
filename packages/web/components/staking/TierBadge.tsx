'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Trophy, Award, Crown, Star } from 'lucide-react'

interface TierBadgeProps {
  tier: number // 1, 2, or 3
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const TIER_CONFIG = {
  1: {
    name: 'Bronze Staker',
    icon: Star,
    gradient: 'from-amber-700 via-amber-600 to-amber-700',
    textColor: 'text-amber-200',
    borderColor: 'border-amber-600/50',
    bgColor: 'bg-amber-900/20',
    benefits: ['+5% Reputation Boost', 'Priority Support', 'Early Feature Access'],
    requirement: '1,000 GHOST',
  },
  2: {
    name: 'Silver Staker',
    icon: Award,
    gradient: 'from-slate-400 via-slate-300 to-slate-400',
    textColor: 'text-slate-100',
    borderColor: 'border-slate-400/50',
    bgColor: 'bg-slate-900/30',
    benefits: [
      '+15% Reputation Boost',
      'Verified Badge',
      'Featured in Search',
      'Priority Dispute Resolution',
    ],
    requirement: '10,000 GHOST',
  },
  3: {
    name: 'Gold Staker',
    icon: Crown,
    gradient: 'from-yellow-500 via-amber-400 to-yellow-500',
    textColor: 'text-yellow-100',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-900/20',
    benefits: [
      '+15% Reputation Boost',
      'Verified Badge',
      'Premium Agent Listing',
      'Custom Profile URL',
      'API Rate Limit Increase',
      'White Glove Support',
    ],
    requirement: '100,000 GHOST',
  },
}

export function TierBadge({ tier, className, showLabel = false, size = 'md' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]
  if (!config) return null

  const Icon = config.icon

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full font-semibold border',
              'bg-gradient-to-r shadow-lg transition-all duration-200 hover:scale-105 cursor-help',
              config.gradient,
              config.textColor,
              config.borderColor,
              sizeClasses[size],
              className
            )}
          >
            <Icon className={iconSizes[size]} />
            {showLabel && <span>{config.name}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <h4 className="font-bold text-base">{config.name}</h4>
            </div>
            <p className="text-xs text-muted-foreground">Required: {config.requirement}</p>
            <div className="border-t border-border pt-2 mt-2">
              <p className="text-xs font-semibold mb-1">Benefits:</p>
              <ul className="text-xs space-y-1">
                {config.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
