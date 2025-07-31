'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Plus,
  Search,
  Filter,
  Users,
  Coins,
  Loader2,
  TrendingUp,
  Clock,
  Vote,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  useProposals,
  useVotingPower,
  useDelegations,
  ProposalType,
  ProposalStatus,
  VoteChoice,
  type GovernanceFilters,
  type Proposal,
} from '@/lib/queries/governance'
import { ProposalCard } from '@/components/governance/ProposalCard'
import { CreateProposalForm } from '@/components/governance/CreateProposalForm'
import { useCastVote } from '@/lib/queries/governance'

export default function GovernancePage(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('all')

  // Filters
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<ProposalStatus[]>([])
  const [typeFilter, setTypeFilter] = React.useState<ProposalType[]>([])
  const [impactFilter, setImpactFilter] = React.useState<string[]>([])

  const filters: GovernanceFilters = {
    search: search || undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    type: typeFilter.length > 0 ? typeFilter : undefined,
    impactLevel: impactFilter.length > 0 ? impactFilter : undefined,
  }

  const { data: proposals, isLoading, error } = useProposals(filters)
  const { data: votingPower } = useVotingPower()
  const { data: delegations } = useDelegations()
  const castVote = useCastVote()

  // Filter proposals by tab
  const filteredProposals = React.useMemo(() => {
    if (!proposals) return []

    switch (activeTab) {
      case 'active':
        return proposals.filter((p) => p.status === ProposalStatus.Voting)
      case 'passed':
        return proposals.filter(
          (p) => p.status === ProposalStatus.Succeeded || p.status === ProposalStatus.Executed
        )
      case 'my-votes':
        return proposals.filter((p) => p.userHasVoted)
      case 'my-proposals':
        return proposals.filter((p) => p.proposer === publicKey?.toString())
      default:
        return proposals
    }
  }, [proposals, activeTab, publicKey])

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!proposals) return { total: 0, active: 0, passed: 0, userVoted: 0, userProposed: 0 }

    const userAddress = publicKey?.toString()

    return {
      total: proposals.length,
      active: proposals.filter((p) => p.status === ProposalStatus.Voting).length,
      passed: proposals.filter(
        (p) => p.status === ProposalStatus.Succeeded || p.status === ProposalStatus.Executed
      ).length,
      userVoted: proposals.filter((p) => p.userHasVoted).length,
      userProposed: proposals.filter((p) => p.proposer === userAddress).length,
    }
  }, [proposals, publicKey])

  const handleVote = async (proposal: Proposal, choice: VoteChoice): Promise<void> => {
    try {
      await castVote.mutateAsync({
        proposalAddress: proposal.address,
        choice,
      })
    } catch (error) {
      console.error('Failed to cast vote:', error)
    }
  }

  const resetFilters = (): void => {
    setSearch('')
    setStatusFilter([])
    setTypeFilter([])
    setImpactFilter([])
  }

  const toggleStatusFilter = (status: ProposalStatus): void => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const toggleTypeFilter = (type: ProposalType): void => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const formatTokenAmount = (amount: string): string => {
    const num = parseFloat(amount)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Vote className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to participate in governance and view proposals.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Governance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Participate in protocol governance and shape the future of GhostSpeak
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Proposal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Proposal</DialogTitle>
            </DialogHeader>
            <CreateProposalForm
              onSuccess={() => setIsCreateOpen(false)}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Voting</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Votes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.userVoted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Proposals</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.userProposed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voting Power</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {votingPower ? formatTokenAmount(votingPower.total) : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voting Power & Delegation Info */}
      {votingPower && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Your Governance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Voting Power Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Voting Power Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                    <span className="font-medium">{formatTokenAmount(votingPower.tokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Staked:</span>
                    <span className="font-medium">{formatTokenAmount(votingPower.staked)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Delegated:</span>
                    <span className="font-medium">{formatTokenAmount(votingPower.delegated)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">{formatTokenAmount(votingPower.total)}</span>
                  </div>
                </div>
              </div>

              {/* Delegation Status */}
              <div>
                <h4 className="font-medium mb-3">Delegation Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Given:</span>
                    <span className="font-medium">{delegations?.given.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Received:</span>
                    <span className="font-medium">{delegations?.received.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="font-medium mb-3">Recent Activity</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Votes Cast:</span>
                    <span className="font-medium">{stats.userVoted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Proposals:</span>
                    <span className="font-medium">{stats.userProposed}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="font-medium mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Delegate Votes
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Coins className="w-4 h-4 mr-2" />
                    Stake Tokens
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search proposals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              {Object.values(ProposalStatus)
                .slice(0, 4)
                .map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatusFilter(status)}
                    className="flex items-center gap-1"
                  >
                    {status === ProposalStatus.Voting && <Clock className="w-3 h-3" />}
                    {status === ProposalStatus.Succeeded && <CheckCircle className="w-3 h-3" />}
                    {status === ProposalStatus.Defeated && <AlertTriangle className="w-3 h-3" />}
                    {status === ProposalStatus.Draft && <FileText className="w-3 h-3" />}
                    {status}
                  </Button>
                ))}
            </div>

            {/* Reset Filters */}
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          {/* Active Filters */}
          {(search || statusFilter.length > 0 || typeFilter.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: &quot;{search}&quot;
                  <button onClick={() => setSearch('')} className="ml-1 hover:bg-gray-200 rounded">
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter.map((status) => (
                <Badge key={status} variant="secondary" className="flex items-center gap-1">
                  {status}
                  <button
                    onClick={() => toggleStatusFilter(status)}
                    className="ml-1 hover:bg-gray-200 rounded"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {typeFilter.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <button
                    onClick={() => toggleTypeFilter(type)}
                    className="ml-1 hover:bg-gray-200 rounded"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-1">
            All
            {stats.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-1">
            Active
            {stats.active > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="passed" className="flex items-center gap-1">
            Passed
            {stats.passed > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.passed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-votes" className="flex items-center gap-1">
            My Votes
            {stats.userVoted > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.userVoted}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-proposals" className="flex items-center gap-1">
            My Proposals
            {stats.userProposed > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.userProposed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        {['all', 'active', 'passed', 'my-votes', 'my-proposals'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <ProposalList
              proposals={filteredProposals}
              isLoading={isLoading}
              error={error}
              onVote={handleVote}
              userAddress={publicKey.toString()}
              isVoting={castVote.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

interface ProposalListProps {
  proposals: Proposal[] | undefined
  isLoading: boolean
  error: Error | null
  onVote: (proposal: Proposal, choice: VoteChoice) => Promise<void>
  userAddress: string
  isVoting: boolean
}

function ProposalList({
  proposals,
  isLoading,
  error,
  onVote,
  userAddress,
  isVoting,
}: ProposalListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading proposals...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium mb-2">Error Loading Proposals</h3>
        <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
      </div>
    )
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <Vote className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Proposals Found</h3>
        <p className="text-gray-600 dark:text-gray-400">No proposals match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.address}
          proposal={proposal}
          onVote={(choice) => onVote(proposal, choice)}
          userAddress={userAddress}
          className={isVoting ? 'pointer-events-none opacity-50' : ''}
        />
      ))}
    </div>
  )
}
