'use client'

import React, { useState } from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bot,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  Users,
  ArrowRight,
  Loader2,
  Clock,
  Shield,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { formatVotingPower } from '@/lib/hooks/useVotingPower'
import type { Address } from '@solana/kit'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface AgentVotingInfo {
  agentAddress: Address
  agentName: string
  agentType: string

  // Voting eligibility
  isVerified: boolean
  isActive: boolean
  canVote: boolean
  eligibilityReason?: string

  // Reputation & metrics
  reputationScore: number
  x402TotalCalls: number
  x402TotalPayments: bigint
  lastPaymentTimestamp: Date

  // Delegation
  isDelegatedToOwner: boolean
  delegatedVotingPower: bigint

  // Voting history
  proposalsVoted: number
  lastVoteTimestamp?: Date
}

export interface DelegationSettings {
  scope: 'All' | 'Category' | 'SingleProposal'
  category?: string
  proposalId?: string
  expiresAt?: Date
}

// =====================================================
// AGENT VOTING STATUS CARD
// =====================================================

interface AgentVotingStatusProps {
  agent: AgentVotingInfo
  onDelegate?: (settings: DelegationSettings) => void
  onRevokeDelegation?: () => void
  className?: string
}

export function AgentVotingStatus({
  agent,
  onDelegate,
  onRevokeDelegation,
  className,
}: AgentVotingStatusProps): React.JSX.Element {
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false)

  const reputationPercentage = agent.reputationScore / 100

  return (
    <GlassCard className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            {agent.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{agent.agentName}</h3>
            <p className="text-xs text-muted-foreground">{agent.agentType}</p>
          </div>
        </div>
        <Badge
          variant={agent.canVote ? 'default' : 'secondary'}
          className={agent.canVote ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
        >
          {agent.canVote ? 'Can Vote' : 'Cannot Vote'}
        </Badge>
      </div>

      {/* Eligibility Status */}
      <div className="space-y-3 mb-4">
        <EligibilityRow
          label="Verified Agent"
          description="Has x402 payment history"
          met={agent.isVerified}
        />
        <EligibilityRow
          label="Active Agent"
          description="Payment in last 30 days"
          met={agent.isActive}
        />
        <EligibilityRow
          label="Minimum Reputation"
          description="50%+ reputation score"
          met={agent.reputationScore >= 5000}
        />
      </div>

      {!agent.canVote && agent.eligibilityReason && (
        <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 mb-4">
          <div className="flex items-center gap-2 text-yellow-500 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{agent.eligibilityReason}</span>
          </div>
        </div>
      )}

      {/* Reputation Score */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Star className="w-4 h-4" />
            Reputation Score
          </span>
          <span className="font-medium">{reputationPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={reputationPercentage} className="h-2" />
      </div>

      {/* x402 Activity */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Zap className="w-3 h-3" />
            x402 Calls
          </div>
          <p className="text-lg font-semibold">{agent.x402TotalCalls.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <TrendingUp className="w-3 h-3" />
            Voting Power
          </div>
          <p className="text-lg font-semibold">{formatVotingPower(agent.delegatedVotingPower)}</p>
        </div>
      </div>

      {/* Delegation Status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 mb-4">
        <div>
          <p className="text-sm font-medium">
            {agent.isDelegatedToOwner ? 'Delegated to Owner' : 'Not Delegated'}
          </p>
          <p className="text-xs text-muted-foreground">
            {agent.isDelegatedToOwner
              ? 'Agent votes through your wallet'
              : 'Enable to include agent in your votes'}
          </p>
        </div>
        <Switch
          checked={agent.isDelegatedToOwner}
          onCheckedChange={(checked) => {
            if (checked) {
              setIsDelegateDialogOpen(true)
            } else {
              onRevokeDelegation?.()
            }
          }}
        />
      </div>

      {/* Voting History */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {agent.proposalsVoted} proposals voted
        </span>
        {agent.lastVoteTimestamp && (
          <span>Last vote {formatDistanceToNow(agent.lastVoteTimestamp, { addSuffix: true })}</span>
        )}
      </div>

      {/* Delegation Dialog */}
      <DelegationDialog
        open={isDelegateDialogOpen}
        onOpenChange={setIsDelegateDialogOpen}
        agentName={agent.agentName}
        onConfirm={(settings) => {
          onDelegate?.(settings)
          setIsDelegateDialogOpen(false)
        }}
      />
    </GlassCard>
  )
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface EligibilityRowProps {
  label: string
  description: string
  met: boolean
}

function EligibilityRow({ label, description, met }: EligibilityRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {met ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
    </div>
  )
}

interface DelegationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName: string
  onConfirm: (settings: DelegationSettings) => void
}

function DelegationDialog({
  open,
  onOpenChange,
  agentName,
  onConfirm,
}: DelegationDialogProps) {
  const [scope, setScope] = useState<'All' | 'Category' | 'SingleProposal'>('All')
  const [category, setCategory] = useState<string>('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Delegate Agent Voting
          </DialogTitle>
          <DialogDescription>
            Configure how {agentName} contributes to your voting power
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Delegation Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Proposals</SelectItem>
                <SelectItem value="Category">Specific Category</SelectItem>
                <SelectItem value="SingleProposal">Single Proposal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'Category' && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Protocol">Protocol</SelectItem>
                  <SelectItem value="Treasury">Treasury</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <GlassCard className="p-4 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-400">How Agent Delegation Works</p>
                <p className="text-muted-foreground mt-1">
                  When delegated, your agent's reputation-based voting power is added to yours.
                  The agent votes through your wallet - you maintain full control.
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                onConfirm({
                  scope,
                  category: scope === 'Category' ? category : undefined,
                })
              }
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Enable Delegation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// AGENTS LIST FOR GOVERNANCE
// =====================================================

interface AgentsVotingListProps {
  agents: AgentVotingInfo[]
  onDelegateAgent?: (agentAddress: Address, settings: DelegationSettings) => void
  className?: string
}

export function AgentsVotingList({
  agents,
  onDelegateAgent,
  className,
}: AgentsVotingListProps): React.JSX.Element {
  const eligibleAgents = agents.filter((a) => a.canVote)
  const ineligibleAgents = agents.filter((a) => !a.canVote)

  const totalVotingPower = agents.reduce((acc, a) => acc + a.delegatedVotingPower, BigInt(0))
  const delegatedPower = agents
    .filter((a) => a.isDelegatedToOwner)
    .reduce((acc, a) => acc + a.delegatedVotingPower, BigInt(0))

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{agents.length}</p>
            <p className="text-xs text-muted-foreground">Total Agents</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{eligibleAgents.length}</p>
            <p className="text-xs text-muted-foreground">Can Vote</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatVotingPower(delegatedPower)}</p>
            <p className="text-xs text-muted-foreground">Delegated Power</p>
          </div>
        </GlassCard>
      </div>

      {/* Eligible Agents */}
      {eligibleAgents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Eligible Agents ({eligibleAgents.length})
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {eligibleAgents.map((agent) => (
              <AgentVotingStatus
                key={agent.agentAddress}
                agent={agent}
                onDelegate={(settings) => onDelegateAgent?.(agent.agentAddress, settings)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ineligible Agents */}
      {ineligibleAgents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Ineligible Agents ({ineligibleAgents.length})
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ineligibleAgents.map((agent) => (
              <AgentVotingStatus key={agent.agentAddress} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {agents.length === 0 && (
        <GlassCard className="p-8 text-center">
          <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-semibold mb-2">No Agents Found</h4>
          <p className="text-sm text-muted-foreground">
            Register agents to participate in governance with their reputation-based voting power.
          </p>
        </GlassCard>
      )}
    </div>
  )
}
