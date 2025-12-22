'use client'

import React, { useState } from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Vote,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  AlertTriangle,
  Play,
  Bot,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { CreateProposalForm } from '@/components/governance/CreateProposalForm'
import { VotingInterface } from '@/components/governance/VotingInterface'
import { VotingPowerCard } from '@/components/governance/VotingPowerCard'
import { VotingPowerBreakdown } from '@/components/governance/VotingPowerBreakdown'
import { AgentsVotingList, type AgentVotingInfo } from '@/components/governance/AgentVotingStatus'
import {
  useProposals,
  useVotingPower,
  useCastVote,
  useExecuteProposal,
  ProposalStatus,
  ProposalType,
  VoteChoice,
  type Proposal,
  type GovernanceFilters,
} from '@/lib/queries/governance'
import { useVotingPowerBreakdown, formatVotingPower } from '@/lib/hooks/useVotingPower'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/kit'

// Demo agent data for governance participation
const DEMO_AGENTS: AgentVotingInfo[] = [
  {
    agentAddress: 'DemoAgent1111111111111111111111111111111' as Address,
    agentName: 'Trading Bot Alpha',
    agentType: 'Trading Agent',
    isVerified: true,
    isActive: true,
    canVote: true,
    reputationScore: 8500,
    x402TotalCalls: 1250,
    x402TotalPayments: BigInt(75000) * BigInt(1_000_000),
    lastPaymentTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isDelegatedToOwner: true,
    delegatedVotingPower: BigInt(850),
    proposalsVoted: 12,
    lastVoteTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    agentAddress: 'DemoAgent2222222222222222222222222222222' as Address,
    agentName: 'Content Creator Pro',
    agentType: 'Content Agent',
    isVerified: true,
    isActive: true,
    canVote: true,
    reputationScore: 7200,
    x402TotalCalls: 890,
    x402TotalPayments: BigInt(45000) * BigInt(1_000_000),
    lastPaymentTimestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isDelegatedToOwner: false,
    delegatedVotingPower: BigInt(720),
    proposalsVoted: 8,
    lastVoteTimestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    agentAddress: 'DemoAgent3333333333333333333333333333333' as Address,
    agentName: 'New Agent Test',
    agentType: 'Automation Agent',
    isVerified: false,
    isActive: false,
    canVote: false,
    eligibilityReason: 'Agent must complete at least one x402 transaction',
    reputationScore: 0,
    x402TotalCalls: 0,
    x402TotalPayments: BigInt(0),
    lastPaymentTimestamp: new Date(),
    isDelegatedToOwner: false,
    delegatedVotingPower: BigInt(0),
    proposalsVoted: 0,
  },
]

// Demo proposals for UI demonstration
const DEMO_PROPOSALS: Proposal[] = [
  {
    address: 'DemoProposal11111111111111111111111111111' as Address,
    id: 'GP-44',
    title: 'Reduce Escrow Dispute Window',
    description: 'Proposal to reduce the dispute window from 7 days to 3 days to speed up payment releases for completed work orders. This will improve the user experience for agents while still providing adequate time for dispute resolution.',
    proposalType: ProposalType.ParameterChange,
    status: ProposalStatus.Voting,
    proposer: 'Proposer1111111111111111111111111111111111' as Address,
    proposerName: 'GhostSpeak Foundation',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    votingStartsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    quorumRequired: '100000',
    approvalThreshold: 51,
    results: {
      forVotes: '8500',
      againstVotes: '3200',
      abstainVotes: '500',
      totalVotes: '12200',
      quorumReached: true,
      participationRate: 0.72,
    },
    tags: ['escrow', 'timing', 'ux'],
    category: 'Protocol Parameters',
    impactLevel: 'Medium',
  },
  {
    address: 'DemoProposal22222222222222222222222222222' as Address,
    id: 'GP-43',
    title: 'Add USDT Support for x402 Payments',
    description: 'Allow agents to accept USDT in addition to USDC for x402 micropayments. This will expand payment options and increase accessibility for users who prefer USDT.',
    proposalType: ProposalType.Feature,
    status: ProposalStatus.Voting,
    proposer: 'Proposer2222222222222222222222222222222222' as Address,
    proposerName: 'Community Member',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    votingStartsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    quorumRequired: '100000',
    approvalThreshold: 51,
    results: {
      forVotes: '12900',
      againstVotes: '1200',
      abstainVotes: '300',
      totalVotes: '14400',
      quorumReached: true,
      participationRate: 0.85,
    },
    tags: ['payments', 'x402', 'tokens'],
    category: 'New Features',
    impactLevel: 'High',
  },
  {
    address: 'DemoProposal33333333333333333333333333333' as Address,
    id: 'GP-42',
    title: 'Increase Reputation Weight for Escrow Completions',
    description: 'Increase the weight of successful escrow completions in reputation scoring from 1.0x to 1.5x. This will incentivize more escrow usage and reward reliable agents.',
    proposalType: ProposalType.ParameterChange,
    status: ProposalStatus.Succeeded,
    proposer: 'Proposer3333333333333333333333333333333333' as Address,
    proposerName: 'Core Team',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    quorumRequired: '100000',
    approvalThreshold: 51,
    results: {
      forVotes: '15000',
      againstVotes: '500',
      abstainVotes: '200',
      totalVotes: '15700',
      quorumReached: true,
      participationRate: 0.92,
    },
    tags: ['reputation', 'incentives'],
    category: 'Protocol Parameters',
    impactLevel: 'Medium',
  },
  {
    address: 'DemoProposal44444444444444444444444444444' as Address,
    id: 'GP-41',
    title: 'Emergency Pause Mechanism for Security Incidents',
    description: 'Implement an emergency pause mechanism that can be activated by the security multisig to halt protocol operations in case of detected exploits or security vulnerabilities.',
    proposalType: ProposalType.Emergency,
    status: ProposalStatus.Executed,
    proposer: 'Proposer4444444444444444444444444444444444' as Address,
    proposerName: 'Security Council',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    quorumRequired: '100000',
    approvalThreshold: 66,
    executedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    results: {
      forVotes: '18500',
      againstVotes: '200',
      abstainVotes: '100',
      totalVotes: '18800',
      quorumReached: true,
      participationRate: 0.95,
    },
    tags: ['security', 'emergency', 'infrastructure'],
    category: 'Emergency Actions',
    impactLevel: 'Critical',
  },
]

interface ProposalCardProps {
  proposal: Proposal
  onClick: () => void
  onVote?: (choice: VoteChoice) => void
  onExecute?: () => void
  isVoting?: boolean
  isExecuting?: boolean
}

function ProposalCard({
  proposal,
  onClick,
  onVote,
  onExecute,
  isVoting,
  isExecuting,
}: ProposalCardProps) {
  const forVotes = parseFloat(proposal.results?.forVotes ?? '0')
  const againstVotes = parseFloat(proposal.results?.againstVotes ?? '0')
  const totalVotes = forVotes + againstVotes
  const percentageFor = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 50

  const statusColors: Record<string, string> = {
    [ProposalStatus.Draft]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    [ProposalStatus.Voting]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    [ProposalStatus.VotingEnded]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    [ProposalStatus.Succeeded]: 'bg-green-500/10 text-green-500 border-green-500/20',
    [ProposalStatus.Defeated]: 'bg-red-500/10 text-red-500 border-red-500/20',
    [ProposalStatus.Executed]: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    [ProposalStatus.Cancelled]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    [ProposalStatus.Expired]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }

  const impactColors: Record<string, string> = {
    Low: 'text-green-500',
    Medium: 'text-yellow-500',
    High: 'text-orange-500',
    Critical: 'text-red-500',
  }

  const isVotingPeriod = proposal.status === ProposalStatus.Voting
  const canExecute = proposal.status === ProposalStatus.Succeeded

  const timeDisplay = isVotingPeriod
    ? `${formatDistanceToNow(proposal.votingEndsAt)} left`
    : proposal.status === ProposalStatus.Executed
      ? `Executed ${formatDistanceToNow(proposal.executedAt ?? proposal.updatedAt, { addSuffix: true })}`
      : `Ended ${formatDistanceToNow(proposal.votingEndsAt, { addSuffix: true })}`

  return (
    <GlassCard variant="interactive" className="p-6 group" onClick={onClick}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">#{proposal.id}</span>
          <Badge variant="outline" className={statusColors[proposal.status]}>
            {proposal.status}
          </Badge>
          <span className={cn('text-xs', impactColors[proposal.impactLevel])}>
            {proposal.impactLevel} Impact
          </span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          {timeDisplay}
        </div>
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
        {proposal.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {proposal.description}
      </p>

      {/* Proposer */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Users className="w-3 h-3" />
        <span>by {proposal.proposerName ?? `${proposal.proposer.slice(0, 8)}...`}</span>
      </div>

      {/* Tags */}
      {proposal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {proposal.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {proposal.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{proposal.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Voting Bar */}
      {proposal.results && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-green-500" />
              {parseInt(proposal.results.forVotes).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              {parseInt(proposal.results.againstVotes).toLocaleString()}
              <ThumbsDown className="w-3 h-3 text-red-500" />
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${percentageFor}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${100 - percentageFor}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-500">{percentageFor.toFixed(1)}%</span>
            <span className="text-muted-foreground">
              {(proposal.results.participationRate * 100).toFixed(0)}% turnout
            </span>
            <span className="text-red-500">{(100 - percentageFor).toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {isVotingPeriod && onVote && (
        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="flex-1 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30"
            onClick={() => onVote(VoteChoice.For)}
            disabled={isVoting}
          >
            {isVoting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ThumbsUp className="w-4 h-4 mr-2" />
            )}
            Vote For
          </Button>
          <Button
            variant="outline"
            className="flex-1 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
            onClick={() => onVote(VoteChoice.Against)}
            disabled={isVoting}
          >
            {isVoting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ThumbsDown className="w-4 h-4 mr-2" />
            )}
            Vote Against
          </Button>
        </div>
      )}

      {canExecute && onExecute && (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={onExecute}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Execute Proposal
          </Button>
        </div>
      )}
    </GlassCard>
  )
}

export default function GovernancePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { address, isConnected } = useCrossmintSigner()

  // Build filters
  const filters: GovernanceFilters = {
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? [statusFilter as ProposalStatus] : undefined,
    type: typeFilter !== 'all' ? [typeFilter as ProposalType] : undefined,
  }

  const { data: proposals, isLoading } = useProposals(filters)
  const { data: votingPower } = useVotingPower()
  const { data: votingPowerBreakdown } = useVotingPowerBreakdown()
  const castVote = useCastVote()
  const executeProposal = useExecuteProposal()

  // Use demo data when no real data is available
  const displayProposals = proposals?.length ? proposals : DEMO_PROPOSALS

  // Apply client-side filtering for demo data
  const filteredProposals = displayProposals.filter((p) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !p.title.toLowerCase().includes(query) &&
        !p.description.toLowerCase().includes(query) &&
        !p.tags.some((t) => t.toLowerCase().includes(query))
      ) {
        return false
      }
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false
    }
    if (typeFilter !== 'all' && p.proposalType !== typeFilter) {
      return false
    }
    return true
  })

  // Calculate stats
  const activeProposals = filteredProposals.filter(
    (p) => p.status === ProposalStatus.Voting
  ).length
  const passedProposals = filteredProposals.filter(
    (p) => p.status === ProposalStatus.Succeeded || p.status === ProposalStatus.Executed
  ).length
  const totalVotes = filteredProposals.reduce((acc, p) => {
    return acc + parseInt(p.results?.totalVotes ?? '0')
  }, 0)

  const handleVote = async (proposal: Proposal, choice: VoteChoice) => {
    await castVote.mutateAsync({
      proposalAddress: proposal.address,
      choice,
    })
  }

  const handleExecute = async (proposal: Proposal) => {
    await executeProposal.mutateAsync(proposal.address)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Governance"
        description="Vote on proposals and shape the future of GhostSpeak"
      >
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Proposal
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Vote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeProposals}</p>
            <p className="text-sm text-muted-foreground">Active Proposals</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{passedProposals}</p>
            <p className="text-sm text-muted-foreground">Proposals Passed</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Scale className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {totalVotes >= 1000000
                ? `${(totalVotes / 1000000).toFixed(1)}M`
                : totalVotes >= 1000
                  ? `${(totalVotes / 1000).toFixed(1)}K`
                  : totalVotes.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Votes Cast</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {votingPowerBreakdown ? formatVotingPower(votingPowerBreakdown.effectiveVotingPower) : '0'}
            </p>
            <p className="text-sm text-muted-foreground">Your Voting Power</p>
          </div>
        </GlassCard>
      </div>

      {/* Voting Power Card (Compact) */}
      {isConnected && (
        <VotingPowerCard compact showActions={false} />
      )}

      {/* Not connected warning */}
      {!isConnected && (
        <GlassCard className="p-6 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="font-semibold text-foreground">Wallet Not Connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your wallet to vote on proposals and create new ones.
                Showing demo proposals for preview.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={ProposalStatus.Voting}>Voting</SelectItem>
            <SelectItem value={ProposalStatus.Succeeded}>Passed</SelectItem>
            <SelectItem value={ProposalStatus.Executed}>Executed</SelectItem>
            <SelectItem value={ProposalStatus.Defeated}>Defeated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={ProposalType.ParameterChange}>Parameter Change</SelectItem>
            <SelectItem value={ProposalType.Feature}>New Feature</SelectItem>
            <SelectItem value={ProposalType.Treasury}>Treasury</SelectItem>
            <SelectItem value={ProposalType.Upgrade}>Upgrade</SelectItem>
            <SelectItem value={ProposalType.Emergency}>Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Proposals */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({filteredProposals.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({filteredProposals.filter((p) => p.status === ProposalStatus.Voting).length})
          </TabsTrigger>
          <TabsTrigger value="passed">
            Passed ({filteredProposals.filter((p) => p.status === ProposalStatus.Succeeded || p.status === ProposalStatus.Executed).length})
          </TabsTrigger>
          <TabsTrigger value="agents">
            My Agents ({DEMO_AGENTS.length})
          </TabsTrigger>
          <TabsTrigger value="power">
            Voting Power
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProposals.length === 0 ? (
            <GlassCard className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Vote className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">No Proposals Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No proposals match your filters. Try adjusting your search criteria.'
                    : 'Be the first to create a proposal and shape the future of GhostSpeak!'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.address}
                  proposal={proposal}
                  onClick={() => setSelectedProposal(proposal)}
                  onVote={(choice) => handleVote(proposal, choice)}
                  onExecute={() => handleExecute(proposal)}
                  isVoting={castVote.isPending}
                  isExecuting={executeProposal.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProposals
              .filter((p) => p.status === ProposalStatus.Voting)
              .map((proposal) => (
                <ProposalCard
                  key={proposal.address}
                  proposal={proposal}
                  onClick={() => setSelectedProposal(proposal)}
                  onVote={(choice) => handleVote(proposal, choice)}
                  isVoting={castVote.isPending}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="passed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProposals
              .filter((p) => p.status === ProposalStatus.Succeeded || p.status === ProposalStatus.Executed)
              .map((proposal) => (
                <ProposalCard
                  key={proposal.address}
                  proposal={proposal}
                  onClick={() => setSelectedProposal(proposal)}
                  onExecute={proposal.status === ProposalStatus.Succeeded ? () => handleExecute(proposal) : undefined}
                  isExecuting={executeProposal.isPending}
                />
              ))}
          </div>
        </TabsContent>

        {/* Agent Participation Tab */}
        <TabsContent value="agents" className="space-y-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Agent Governance Participation</h3>
            <p className="text-sm text-muted-foreground">
              Your verified agents can contribute to your voting power based on their reputation 
              and x402 payment history. Enable delegation to include their power in your votes.
            </p>
          </div>
          <AgentsVotingList 
            agents={DEMO_AGENTS}
            onDelegateAgent={(agentAddress, settings) => {
              console.log('Delegate agent:', agentAddress, settings)
            }}
          />
        </TabsContent>

        {/* Voting Power Breakdown Tab */}
        <TabsContent value="power" className="space-y-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Voting Power Breakdown</h3>
            <p className="text-sm text-muted-foreground">
              Voting power is calculated from multiple sources: GHOST tokens, agent reputation, 
              x402 payment volume, and staking lockup multipliers.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VotingPowerBreakdown />
            <VotingPowerCard showActions={true} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Proposal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              Create New Proposal
            </DialogTitle>
          </DialogHeader>
          <CreateProposalForm
            onSuccess={() => setIsCreateDialogOpen(false)}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Proposal Detail Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              {selectedProposal?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-6">
              {/* Proposal Info */}
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {selectedProposal.status}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedProposal.proposalType}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {selectedProposal.category}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{selectedProposal.description}</p>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Proposer</p>
                      <p className="font-mono text-sm">
                        {selectedProposal.proposerName ?? selectedProposal.proposer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {formatDistanceToNow(selectedProposal.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Voting Interface */}
              <VotingInterface proposal={selectedProposal} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
