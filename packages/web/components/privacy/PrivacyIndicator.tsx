'use client'

import React from 'react'
import { Shield, Lock, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type PrivacyMode = 'public' | 'tier-only' | 'authorized-only' | 'hidden'

export interface PrivacyIndicatorProps {
  mode: PrivacyMode
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const privacyConfig = {
  public: {
    label: 'Public',
    description: 'All reputation data is publicly visible',
    icon: Eye,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  'tier-only': {
    label: 'Tier Only',
    description: 'Only reputation tier is visible',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  'authorized-only': {
    label: 'Authorized',
    description: 'Only authorized wallets can view details',
    icon: Lock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  hidden: {
    label: 'Hidden',
    description: 'All reputation data is hidden',
    icon: EyeOff,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
} as const

export function PrivacyIndicator({
  mode,
  className,
  showLabel = false,
  size = 'md',
}: PrivacyIndicatorProps): React.JSX.Element {
  const config = privacyConfig[mode]
  const Icon = config.icon

  const iconSizeClass = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size]

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 border',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <Icon className={cn(iconSizeClass, config.color)} />
      {showLabel && <span className="text-xs font-medium">{config.label}</span>}
    </Badge>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{config.label} Privacy</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
