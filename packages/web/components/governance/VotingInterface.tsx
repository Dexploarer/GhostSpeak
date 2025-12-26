'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Coins,
  Star,
  Loader2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Proposal, CreateVoteData } from '@/lib/queries/governance'
import { VoteChoice } from '@/lib/queries/governance'
import { useCastVote, useProposalVotes, useVotingPower } from '@/lib/queries/governance'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'
import { formatDistanceToNow } from 'date-fns'

const voteSchema = z.object({
  choice: z.nativeEnum(VoteChoice),
  reasoning: z.string().max(1000, 'Reasoning must be less than 1000 characters').optional(),
})

type VoteFormData = z.infer<typeof voteSchema>

interface VotingInterfaceProps {
  proposal: Proposal
  className?: string
}

const voteChoiceConfig = {
  [VoteChoice.For]: {
    label: 'Support',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200',
    icon: CheckCircle,
  },
  [VoteChoice.Against]: {
    label: 'Oppose',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200',
    icon: XCircle,
  },
  [VoteChoice.Abstain]: {
    label: 'Abstain',
    color: 'text-gray-600',
    bgColor: 'bg-gray-500',
    lightBg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200',
    icon: MinusCircle,
  },
}

export function VotingInterface({ proposal, className }: VotingInterfaceProps): React.JSX.Element {
  const { status } = useAuth()
  const { wallet } = useWallet()
  const [selectedChoice, setSelectedChoice] = React.useState<VoteChoice | null>(null)

  const { data: votes, isLoading: votesLoading } = useProposalVotes(proposal.address)
  const { data: votingPower, isLoading: powerLoading } = useVotingPower()
  const castVote = useCastVote()

  const form = useForm<VoteFormData>({
    resolver: zodResolver(voteSchema),
    defaultValues: {
      reasoning: '',
    },
  })

  const userAddress = wallet?.address
  const canVote = proposal.status === 'Voting' && !proposal.userHasVoted && userAddress
  const hasResults = proposal.results && proposal.results.totalVotes !== '0'

  // Calculate voting statistics
  const votingStats = React.useMemo(() => {
    if (!hasResults) return null

    const results = proposal.results!
    const totalVotes = parseFloat(results.totalVotes)
    const forVotes = parseFloat(results.forVotes)
    const againstVotes = parseFloat(results.againstVotes)
    const abstainVotes = parseFloat(results.abstainVotes)

    const forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0
    const againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0
    const abstainPercentage = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0

    const quorumRequired = parseFloat(proposal.quorumRequired)
    const quorumProgress = quorumRequired > 0 ? (totalVotes / quorumRequired) * 100 : 100

    return {
      forPercentage,
      againstPercentage,
      abstainPercentage,
      forVotes,
      againstVotes,
      abstainVotes,
      totalVotes,
      quorumProgress,
      quorumReached: results.quorumReached,
      participationRate: results.participationRate,
      approvalThreshold: proposal.approvalThreshold,
      isWinning: forPercentage > proposal.approvalThreshold,
    }
  }, [hasResults, proposal])

  // Time until voting ends
  const timeUntilEnd = React.useMemo(() => {
    if (proposal.status !== 'Voting') return null

    const now = new Date()
    const endTime = proposal.votingEndsAt

    if (endTime <= now) return 'Ended'

    return formatDistanceToNow(endTime, { addSuffix: true })
  }, [proposal.status, proposal.votingEndsAt])

  const onSubmit = async (data: VoteFormData): Promise<void> => {
    if (!selectedChoice || !userAddress) return

    try {
      const voteData: CreateVoteData = {
        proposalAddress: proposal.address,
        choice: selectedChoice,
        reasoning: data.reasoning?.trim() || undefined,
      }

      await castVote.mutateAsync(voteData)
    } catch (error) {
      console.error('Failed to cast vote:', error)
    }
  }

  const formatTokenAmount = (amount: string): string => {
    const num = parseFloat(amount)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getUserInitials = (address: string, name?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map((word) => word[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    }
    return address.slice(0, 2).toUpperCase()
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Voting Results */}
      {hasResults && votingStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Voting Results
              </CardTitle>
              <div className="flex items-center gap-2">
                {votingStats.isWinning ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    Leading
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <ArrowDown className="w-3 h-3 mr-1" />
                    Trailing
                  </Badge>
                )}
                {proposal.status === 'Voting' && timeUntilEnd && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ends {timeUntilEnd}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vote Breakdown */}
            <div className="space-y-4">
              {/* For Votes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">Support</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{votingStats.forPercentage.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">
                      {formatTokenAmount(votingStats.forVotes.toString())} votes
                    </div>
                  </div>
                </div>
                <Progress value={votingStats.forPercentage} className="h-3">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${votingStats.forPercentage}%` }}
                  />
                </Progress>
              </div>

              {/* Against Votes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-red-600 dark:text-red-400">Oppose</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{votingStats.againstPercentage.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">
                      {formatTokenAmount(votingStats.againstVotes.toString())} votes
                    </div>
                  </div>
                </div>
                <Progress value={votingStats.againstPercentage} className="h-3">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${votingStats.againstPercentage}%` }}
                  />
                </Progress>
              </div>

              {/* Abstain Votes */}
              {votingStats.abstainPercentage > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-600 dark:text-gray-400">Abstain</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {votingStats.abstainPercentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTokenAmount(votingStats.abstainVotes.toString())} votes
                      </div>
                    </div>
                  </div>
                  <Progress value={votingStats.abstainPercentage} className="h-3">
                    <div
                      className="h-full bg-gray-500 rounded-full transition-all"
                      style={{ width: `${votingStats.abstainPercentage}%` }}
                    />
                  </Progress>
                </div>
              )}
            </div>

            {/* Quorum and Threshold */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTokenAmount(votingStats.totalVotes.toString())}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Votes</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {votingStats.approvalThreshold}%
                  </div>
                  {votingStats.isWinning ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Approval Threshold</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(votingStats.participationRate * 100).toFixed(1)}%
                  </div>
                  {votingStats.quorumReached ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {votingStats.quorumReached ? 'Quorum Reached' : 'Quorum Required'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Interface */}
      {canVote && votingPower && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Cast Your Vote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Voting Power Display */}
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Your Voting Power
                      </h4>
                      <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <div>Tokens: {formatTokenAmount(votingPower.tokens)}</div>
                        <div>Staked: {formatTokenAmount(votingPower.staked)}</div>
                        <div>Delegated: {formatTokenAmount(votingPower.delegated)}</div>
                        {votingPower.reputation > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Reputation Bonus: {votingPower.reputation}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {formatTokenAmount(votingPower.total)}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Total Power</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vote Choice Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Your Vote</Label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(voteChoiceConfig).map(([choice, config]) => {
                    const Icon = config.icon
                    const isSelected = selectedChoice === choice

                    return (
                      <Card
                        key={choice}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          isSelected && `ring-2 ${config.border} ${config.lightBg}`
                        )}
                        onClick={() => setSelectedChoice(choice as VoteChoice)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Icon className={cn('w-6 h-6', config.color)} />
                            <div className="flex-1">
                              <div className="font-medium">{config.label}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {choice === VoteChoice.For && 'Vote in favor of this proposal'}
                                {choice === VoteChoice.Against && 'Vote against this proposal'}
                                {choice === VoteChoice.Abstain &&
                                  'Abstain from voting while still participating'}
                              </div>
                            </div>
                            {isSelected && (
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full flex items-center justify-center',
                                  config.bgColor
                                )}
                              >
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Reasoning */}
              {selectedChoice && (
                <div className="space-y-2">
                  <Label htmlFor="reasoning">Reasoning (Optional)</Label>
                  <Textarea
                    id="reasoning"
                    {...form.register('reasoning')}
                    placeholder={`Explain why you chose to ${voteChoiceConfig[selectedChoice].label.toLowerCase()} this proposal...`}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Share your reasoning to help inform other voters
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!selectedChoice || castVote.isPending}
                className={cn(
                  'w-full flex items-center gap-2',
                  selectedChoice && voteChoiceConfig[selectedChoice].bgColor
                )}
              >
                {castVote.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : selectedChoice ? (
                  React.createElement(voteChoiceConfig[selectedChoice].icon, {
                    className: 'w-4 h-4',
                  })
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {castVote.isPending
                  ? 'Casting Vote...'
                  : selectedChoice
                    ? `Vote ${voteChoiceConfig[selectedChoice].label}`
                    : 'Select Your Vote'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Already Voted */}
      {proposal.userHasVoted && proposal.userVoteChoice && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  You voted {voteChoiceConfig[proposal.userVoteChoice].label}
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your vote has been recorded and cannot be changed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Votes */}
      {votes && votes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Votes ({votes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {votes.slice(0, 5).map((vote) => {
                const voteConfig = voteChoiceConfig[vote.choice]
                const VoteIcon = voteConfig.icon

                return (
                  <div
                    key={vote.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {getUserInitials(vote.voter, vote.voterName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {vote.voterName || `${vote.voter.slice(0, 8)}...`}
                        </span>
                        <Badge variant="outline" className={cn('text-xs', voteConfig.color)}>
                          <VoteIcon className="w-3 h-3 mr-1" />
                          {voteConfig.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Coins className="w-3 h-3" />
                          {formatTokenAmount(vote.votingPower)}
                        </div>
                      </div>

                      {vote.reasoning && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {vote.reasoning}
                        </p>
                      )}

                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(vote.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {votes.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    View All Votes ({votes.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading States */}
      {(votesLoading || powerLoading) && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading voting data...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
