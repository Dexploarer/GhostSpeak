'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Coins,
  Star,
  TrendingUp,
  Lock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useVotingPowerBreakdown,
  useCanVote,
  formatVotingPower,
  formatTokenAmount,
  VOTING_WEIGHTS,
  LOCKUP_TIERS,
  type VotingPowerBreakdown,
} from '@/lib/hooks/useVotingPower'

interface VotingPowerCardProps {
  className?: string
  compact?: boolean
  showActions?: boolean
  onStake?: () => void
  onDelegate?: () => void
}

export function VotingPowerCard({
  className,
  compact = false,
  showActions = true,
  onStake,
  onDelegate,
}: VotingPowerCardProps): React.JSX.Element {
  const { data: breakdown, isLoading } = useVotingPowerBreakdown()
  const { canVote, requirements } = useCanVote()

  if (isLoading) {
    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </GlassCard>
    )
  }

  if (!breakdown) {
    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="text-center text-muted-foreground py-8">
          Connect your wallet to see your voting power
        </div>
      </GlassCard>
    )
  }

  if (compact) {
    return <CompactVotingPower breakdown={breakdown} canVote={canVote} className={className} />
  }

  return (
    <GlassCard className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Your Voting Power</h3>
            <p className="text-sm text-muted-foreground">
              Based on tokens, reputation & activity
            </p>
          </div>
        </div>
        <Badge
          variant={canVote ? 'default' : 'secondary'}
          className={canVote ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
        >
          {canVote ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Can Vote
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1" />
              Cannot Vote
            </>
          )}
        </Badge>
      </div>

      {/* Total Voting Power */}
      <div className="text-center mb-6 p-4 rounded-xl bg-linear-to-r from-primary/10 to-purple-500/10 border border-primary/20">
        <p className="text-sm text-muted-foreground mb-1">Effective Voting Power</p>
        <p className="text-4xl font-bold text-primary">
          {formatVotingPower(breakdown.effectiveVotingPower)}
        </p>
        {breakdown.delegatedToYou > BigInt(0) && (
          <p className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +{formatVotingPower(breakdown.delegatedToYou)} delegated to you
          </p>
        )}
        {breakdown.delegatedByYou > BigInt(0) && (
          <p className="text-xs text-yellow-500 mt-1 flex items-center justify-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            -{formatVotingPower(breakdown.delegatedByYou)} delegated by you
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Power Breakdown</h4>

        {/* Token Balance */}
        <PowerSourceRow
          icon={Coins}
          iconColor="text-yellow-500"
          label="Token Balance"
          sublabel={`${formatTokenAmount(breakdown.tokenBalance)} GHOST`}
          power={breakdown.tokenVotingPower}
          weight={breakdown.tokenWeight}
          tooltip="Voting power from GHOST token holdings. Uses square-root voting to reduce whale dominance."
        />

        {/* Reputation */}
        <PowerSourceRow
          icon={Star}
          iconColor="text-purple-500"
          label="Reputation Score"
          sublabel={breakdown.isVerifiedAgent ? `${(breakdown.reputationScore / 100).toFixed(0)}% verified` : 'Not verified'}
          power={breakdown.reputationVotingPower}
          weight={breakdown.reputationWeight}
          tooltip="Voting power from your agent's reputation. Only verified agents (with x402 payment history) get this bonus."
          disabled={!breakdown.isVerifiedAgent}
        />

        {/* x402 Volume */}
        <PowerSourceRow
          icon={TrendingUp}
          iconColor="text-green-500"
          label="x402 Volume (30d)"
          sublabel={`$${formatTokenAmount(breakdown.x402Volume30d)} traded`}
          power={breakdown.volumeVotingPower}
          weight={breakdown.volumeWeight}
          tooltip="Voting power from x402 payment volume in the last 30 days. Rewards active marketplace participants."
        />

        {/* Staking */}
        <PowerSourceRow
          icon={Lock}
          iconColor="text-blue-500"
          label="Staked Tokens"
          sublabel={breakdown.lockupDuration > 0 
            ? `${formatTokenAmount(breakdown.stakedTokens)} × ${breakdown.lockupMultiplier}x` 
            : 'No lockup'}
          power={breakdown.stakingVotingPower}
          weight={breakdown.stakingWeight}
          tooltip={`Voting power from staked tokens with ${breakdown.lockupMultiplier}x multiplier for ${breakdown.lockupDuration}-day lockup.`}
          multiplier={breakdown.lockupMultiplier > 1 ? breakdown.lockupMultiplier : undefined}
        />
      </div>

      {/* Requirements */}
      {!canVote && (
        <div className="mt-6 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <h4 className="text-sm font-medium text-yellow-500 mb-2">Missing Requirements</h4>
          <div className="space-y-2 text-sm">
            {!requirements.hasTokens && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Need GHOST tokens to vote</span>
              </div>
            )}
            {!requirements.meetsMinimum && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Need minimum 100 voting power</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex gap-3 mt-6">
          {onStake && (
            <Button variant="outline" className="flex-1" onClick={onStake}>
              <Lock className="w-4 h-4 mr-2" />
              Stake Tokens
            </Button>
          )}
          {onDelegate && (
            <Button variant="outline" className="flex-1" onClick={onDelegate}>
              <Users className="w-4 h-4 mr-2" />
              Delegate
            </Button>
          )}
        </div>
      )}
    </GlassCard>
  )
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface PowerSourceRowProps {
  icon: LucideIcon
  iconColor: string
  label: string
  sublabel: string
  power: bigint
  weight: number
  tooltip: string
  disabled?: boolean
  multiplier?: number
}

function PowerSourceRow({
  icon: Icon,
  iconColor,
  label,
  sublabel,
  power,
  weight,
  tooltip,
  disabled,
  multiplier,
}: PowerSourceRowProps) {
  const weightedPower = (power * BigInt(Math.floor(weight * 100))) / BigInt(100)
  const percentOfTotal = weight * 100

  return (
    <div className={cn('flex items-center gap-4', disabled && 'opacity-50')}>
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', 'bg-muted')}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {multiplier && (
            <Badge variant="secondary" className="text-xs">
              {multiplier}x
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
        <Progress value={percentOfTotal} className="h-1 mt-1" />
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium">{formatVotingPower(weightedPower)}</p>
        <p className="text-xs text-muted-foreground">{(weight * 100).toFixed(0)}% weight</p>
      </div>
    </div>
  )
}

interface CompactVotingPowerProps {
  breakdown: VotingPowerBreakdown
  canVote: boolean
  className?: string
}

function CompactVotingPower({ breakdown, canVote, className }: CompactVotingPowerProps) {
  return (
    <GlassCard className={cn('p-4 flex items-center gap-4', className)}>
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
        <Zap className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Voting Power</span>
          {canVote && <CheckCircle className="w-3 h-3 text-green-500" />}
        </div>
        <p className="text-xl font-bold">{formatVotingPower(breakdown.effectiveVotingPower)}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Coins className="w-3 h-3" />
          {formatVotingPower(breakdown.tokenVotingPower)}
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {formatVotingPower(breakdown.reputationVotingPower)}
        </div>
      </div>
    </GlassCard>
  )
}

// =====================================================
// LOCKUP TIER SELECTOR (for staking UI)
// =====================================================

interface LockupTierSelectorProps {
  selectedDays: number
  onSelect: (days: number) => void
  className?: string
}

export function LockupTierSelector({
  selectedDays,
  onSelect,
  className,
}: LockupTierSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-2', className)}>
      {LOCKUP_TIERS.map((tier) => {
        const isSelected = selectedDays === tier.days
        return (
          <button
            key={tier.days}
            onClick={() => onSelect(tier.days)}
            className={cn(
              'p-3 rounded-lg border text-left transition-all',
              'hover:border-primary/50 hover:bg-primary/5',
              isSelected && 'border-primary bg-primary/10'
            )}
          >
            <div className="font-medium text-sm">{tier.label}</div>
            <div className="text-xs text-muted-foreground">
              {tier.multiplier}x multiplier
            </div>
          </button>
        )
      })}
    </div>
  )
}
