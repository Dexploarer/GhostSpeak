'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Shield,
  Users,
  Scale,
  Bot,
  Wallet,
  Settings,
  Clock,
  Lock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MultisigType,
  MULTISIG_TYPE_INFO,
  getMultisigTypeInfo,
  canCreateMultisigType,
  type MultisigTypeInfo,
} from '@/lib/queries/multisig'

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Users,
  Scale,
  Bot,
  Wallet,
  Settings,
}

// Color mapping
const COLOR_MAP: Record<string, string> = {
  red: 'text-red-500 bg-red-500/10 border-red-500/20',
  purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  green: 'text-green-500 bg-green-500/10 border-green-500/20',
  gray: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
}

interface MultisigTypeSelectorProps {
  selectedType: MultisigType | null
  onSelect: (type: MultisigType) => void
  userHasTokens?: boolean
  userReputationScore?: number
  showDetails?: boolean
  className?: string
}

export function MultisigTypeSelector({
  selectedType,
  onSelect,
  userHasTokens = false,
  userReputationScore = 0,
  showDetails = true,
  className,
}: MultisigTypeSelectorProps): React.JSX.Element {
  const types = Object.values(MultisigType)

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-base font-semibold">Select Multisig Type</Label>
      <p className="text-sm text-muted-foreground">
        Choose the type of multisig based on your governance needs
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {types.map((type) => {
          const info = getMultisigTypeInfo(type)
          const { canCreate, reason } = canCreateMultisigType(
            type,
            userHasTokens,
            userReputationScore
          )
          const isSelected = selectedType === type
          const Icon = ICON_MAP[info.icon] ?? Settings
          const colorClasses = COLOR_MAP[info.color] ?? COLOR_MAP.gray

          return (
            <button
              key={type}
              type="button"
              onClick={() => canCreate && onSelect(type)}
              disabled={!canCreate}
              className={cn(
                'p-4 rounded-xl border text-left transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected && 'ring-2 ring-primary border-primary bg-primary/10',
                !canCreate && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center border',
                    colorClasses
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{info.label}</span>
                    {!canCreate && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {info.description}
                  </p>
                  {!canCreate && reason && (
                    <p className="text-xs text-yellow-500 mt-1">{reason}</p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected type details */}
      {showDetails && selectedType && (
        <MultisigTypeDetails type={selectedType} className="mt-4" />
      )}
    </div>
  )
}

// =====================================================
// MULTISIG TYPE DETAILS
// =====================================================

interface MultisigTypeDetailsProps {
  type: MultisigType
  className?: string
}

export function MultisigTypeDetails({
  type,
  className,
}: MultisigTypeDetailsProps): React.JSX.Element {
  const info = getMultisigTypeInfo(type)
  const Icon = ICON_MAP[info.icon] ?? Settings
  const colorClasses = COLOR_MAP[info.color] ?? COLOR_MAP.gray

  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center border',
            colorClasses
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{info.label}</h4>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Timelock */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Timelock</p>
            <p className="text-sm font-medium">
              {info.timelockHours > 0 ? `${info.timelockHours}h` : 'None'}
            </p>
          </div>
        </div>

        {/* Threshold */}
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Recommended</p>
            <p className="text-sm font-medium">{info.recommendedThreshold}</p>
          </div>
        </div>

        {/* Signers */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Signers</p>
            <p className="text-sm font-medium">
              {info.requirements.minSigners}-{info.requirements.maxSigners}
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Requirements</p>
            <p className="text-sm font-medium">
              {info.requirements.requiresToken && info.requirements.requiresReputation
                ? 'Token + Rep'
                : info.requirements.requiresToken
                  ? 'Token'
                  : info.requirements.requiresReputation
                    ? 'Reputation'
                    : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-2">Permissions</p>
        <div className="flex flex-wrap gap-1">
          {info.permissions.map((permission) => (
            <Badge key={permission} variant="secondary" className="text-xs">
              {permission}
            </Badge>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

// =====================================================
// MULTISIG TYPE BADGE
// =====================================================

interface MultisigTypeBadgeProps {
  type: MultisigType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function MultisigTypeBadge({
  type,
  size = 'md',
  showLabel = true,
  className,
}: MultisigTypeBadgeProps): React.JSX.Element {
  const info = getMultisigTypeInfo(type)
  const Icon = ICON_MAP[info.icon] ?? Settings
  const colorClasses = COLOR_MAP[info.color] ?? COLOR_MAP.gray

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <Badge
      variant="outline"
      className={cn('border', colorClasses, sizeClasses[size], className)}
    >
      <Icon className={cn(iconSizes[size], showLabel && 'mr-1')} />
      {showLabel && info.label}
    </Badge>
  )
}
