'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Coins,
  Star,
  TrendingUp,
  Lock,
  Users,
  Zap,
  Info,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useVotingPowerBreakdown,
  formatVotingPower,
  formatTokenAmount,
  VOTING_WEIGHTS,
} from '@/lib/hooks/useVotingPower'

// =====================================================
// FULL BREAKDOWN COMPONENT
// =====================================================

interface VotingPowerBreakdownProps {
  className?: string
}

export function VotingPowerBreakdown({ className }: VotingPowerBreakdownProps): React.JSX.Element {
  const { data: breakdown, isLoading } = useVotingPowerBreakdown()

  if (isLoading || !breakdown) {
    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </GlassCard>
    )
  }

  // Calculate percentages for the pie chart representation
  const tokenContribution =
    Number(breakdown.tokenVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.TOKEN * 100))) / 100
  const repContribution =
    Number(breakdown.reputationVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.REPUTATION * 100))) /
    100
  const volumeContribution =
    Number(breakdown.volumeVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.VOLUME * 100))) / 100
  const total = tokenContribution + repContribution + volumeContribution
  const tokenPercent = total > 0 ? (tokenContribution / total) * 100 : 0
  const repPercent = total > 0 ? (repContribution / total) * 100 : 0
  const volumePercent = total > 0 ? (volumeContribution / total) * 100 : 0

  return (
    <GlassCard className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Voting Power Analysis</h3>
            <p className="text-xs text-muted-foreground">
              Breakdown by source with x402 marketplace factors
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatVotingPower(breakdown.effectiveVotingPower)}</p>
          <p className="text-xs text-muted-foreground">Total Power</p>
        </div>
      </div>

      {/* Visual Breakdown Bar */}
      <div className="mb-6">
        <div className="flex h-4 rounded-full overflow-hidden">
          <div className="bg-yellow-500 transition-all" style={{ width: `${tokenPercent}%` }} />
          <div className="bg-purple-500 transition-all" style={{ width: `${repPercent}%` }} />
          <div className="bg-green-500 transition-all" style={{ width: `${volumePercent}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Tokens
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Reputation
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            x402 Volume
          </span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Detailed Breakdown */}
      <div className="space-y-4">
        {/* Tokens */}
        <BreakdownRow
          icon={Coins}
          iconColor="text-yellow-500"
          bgColor="bg-yellow-500/10"
          label="GHOST Token Balance"
          value={formatTokenAmount(breakdown.tokenBalance)}
          subvalue="tokens"
          power={breakdown.tokenVotingPower}
          weight={VOTING_WEIGHTS.TOKEN}
          description="Square-root voting reduces whale dominance"
        />

        {/* Reputation */}
        <BreakdownRow
          icon={Star}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10"
          label="Agent Reputation"
          value={`${(breakdown.reputationScore / 100).toFixed(0)}%`}
          subvalue={breakdown.isVerifiedAgent ? 'verified' : 'not verified'}
          power={breakdown.reputationVotingPower}
          weight={VOTING_WEIGHTS.REPUTATION}
          description="Based on x402 payment history and client ratings"
          badge={
            breakdown.isVerifiedAgent ? (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unverified
              </Badge>
            )
          }
        />

        {/* x402 Volume */}
        <BreakdownRow
          icon={TrendingUp}
          iconColor="text-green-500"
          bgColor="bg-green-500/10"
          label="x402 Volume (30d)"
          value={`$${formatTokenAmount(breakdown.x402Volume30d)}`}
          subvalue="traded"
          power={breakdown.volumeVotingPower}
          weight={VOTING_WEIGHTS.VOLUME}
          description="Active marketplace participation rewards"
        />

        {/* Staking */}
      </div>

      <Separator className="my-4" />

      {/* Delegations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-muted-foreground">Delegations</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
              <ArrowUp className="w-4 h-4" />
              Received
            </div>
            <p className="text-lg font-semibold">+{formatVotingPower(breakdown.delegatedToYou)}</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
              <ArrowDown className="w-4 h-4" />
              Delegated Out
            </div>
            <p className="text-lg font-semibold">-{formatVotingPower(breakdown.delegatedByYou)}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

// =====================================================
// BREAKDOWN ROW
// =====================================================

interface BreakdownRowProps {
  icon: LucideIcon
  iconColor: string
  bgColor: string
  label: string
  value: string
  subvalue: string
  power: bigint
  weight: number
  description: string
  badge?: React.ReactNode
}

function BreakdownRow({
  icon: Icon,
  iconColor,
  bgColor,
  label,
  value,
  subvalue,
  power,
  weight,
  description,
  badge,
}: BreakdownRowProps) {
  const weightedPower = (power * BigInt(Math.floor(weight * 100))) / BigInt(100)

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-card/50">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgColor)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground">
          {value} <span className="opacity-60">{subvalue}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-medium">{formatVotingPower(weightedPower)}</p>
        <p className="text-xs text-muted-foreground">{(weight * 100).toFixed(0)}% weight</p>
      </div>
    </div>
  )
}

// =====================================================
// COMPACT X402 VOLUME DISPLAY
// =====================================================

interface X402VolumeDisplayProps {
  volume30d: bigint
  volumeVotingPower: bigint
  className?: string
}

export function X402VolumeDisplay({
  volume30d,
  volumeVotingPower,
  className,
}: X402VolumeDisplayProps): React.JSX.Element {
  // Calculate trend (mock for now)
  const trend = 15 // +15% vs last period

  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">x402 Volume (30d)</p>
          <p className="text-xl font-bold">${formatTokenAmount(volume30d)}</p>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'flex items-center gap-1 text-sm',
              trend >= 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
          <p className="text-xs text-muted-foreground">
            +{formatVotingPower(volumeVotingPower)} power
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

// =====================================================
// REPUTATION VOTING POWER DISPLAY
// =====================================================

interface ReputationVotingPowerProps {
  reputationScore: number
  reputationVotingPower: bigint
  isVerifiedAgent: boolean
  agentName?: string
  className?: string
}

export function ReputationVotingPower({
  reputationScore,
  reputationVotingPower,
  isVerifiedAgent,
  agentName,
  className,
}: ReputationVotingPowerProps): React.JSX.Element {
  const percentage = reputationScore / 100

  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Star className="w-5 h-5 text-purple-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Reputation Voting Power</p>
            {isVerifiedAgent && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          {agentName && <p className="text-xs text-muted-foreground">{agentName}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{formatVotingPower(reputationVotingPower)}</p>
          <p className="text-xs text-muted-foreground">voting power</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reputation Score</span>
          <span className="font-medium">{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Based on x402 payment success rate, response time, and client ratings
        </p>
      </div>

      {!isVerifiedAgent && (
        <div className="mt-3 p-2 rounded bg-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-500 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Complete x402 transactions to unlock reputation voting power</span>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
