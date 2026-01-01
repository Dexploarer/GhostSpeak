'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Tag,
  ArrowRight,
  Zap,
  Shield,
  Coins,
  Sparkles,
} from 'lucide-react'
import { cn, formatTokenAmount } from '@/lib/utils'
import type { Proposal } from '@/lib/queries/governance'
import { ProposalType, ProposalStatus, VoteChoice } from '@/lib/queries/governance'
import { formatDistanceToNow } from 'date-fns'

interface ProposalCardProps {
  proposal: Proposal
  onViewDetails?: () => void
  onEdit?: () => void
  onVote?: (choice: VoteChoice) => void
  userAddress?: string
  className?: string
}

const proposalTypeConfig = {
  [ProposalType.ParameterChange]: {
    icon: Settings,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200',
  },
  [ProposalType.Treasury]: {
    icon: Coins,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200',
  },
  [ProposalType.Upgrade]: {
    icon: Zap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200',
  },
  [ProposalType.Feature]: {
    icon: Sparkles,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500',
    lightBg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200',
  },
  [ProposalType.Emergency]: {
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200',
  },
}

const statusConfig = {
  [ProposalStatus.Draft]: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  [ProposalStatus.Voting]: {
    label: 'Active Voting',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
  },
  [ProposalStatus.VotingEnded]: {
    label: 'Voting Ended',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
  },
  [ProposalStatus.Succeeded]: {
    label: 'Passed',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
  },
  [ProposalStatus.Defeated]: {
    label: 'Defeated',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
  },
  [ProposalStatus.Executed]: {
    label: 'Executed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
  },
  [ProposalStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  [ProposalStatus.Expired]: {
    label: 'Expired',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
}

const impactLevelConfig = {
  Low: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20' },
  Medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' },
  High: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/20' },
  Critical: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/20' },
}

export function ProposalCard({
  proposal,
  onViewDetails,
  onEdit,
  onVote,
  userAddress,
  className,
}: ProposalCardProps): React.JSX.Element {
  const typeInfo = proposalTypeConfig[proposal.proposalType]
  const statusInfo = statusConfig[proposal.status]
  const impactInfo = impactLevelConfig[proposal.impactLevel]
  const TypeIcon = typeInfo.icon

  const isOwner = proposal.proposer === userAddress
  const canEdit = isOwner && proposal.status === ProposalStatus.Draft
  const canVote = proposal.status === ProposalStatus.Voting && !proposal.userHasVoted && userAddress
  const isActive = proposal.status === ProposalStatus.Voting
  const hasResults = proposal.results && proposal.results.totalVotes !== '0'

  // Calculate voting progress
  const progressData = React.useMemo(() => {
    if (!hasResults) return null

    const results = proposal.results!
    const totalVotes = parseFloat(results.totalVotes)
    const forVotes = parseFloat(results.forVotes)
    const againstVotes = parseFloat(results.againstVotes)

    const forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0
    const againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0

    return {
      forPercentage,
      againstPercentage,
      forVotes,
      againstVotes,
      totalVotes,
      quorumReached: results.quorumReached,
      participationRate: results.participationRate,
    }
  }, [hasResults, proposal.results])

  // Time until voting ends
  const timeUntilEnd = React.useMemo(() => {
    if (proposal.status !== ProposalStatus.Voting) return null

    const now = new Date()
    const endTime = proposal.votingEndsAt

    if (endTime <= now) return 'Ended'

    return formatDistanceToNow(endTime, { addSuffix: true })
  }, [proposal.status, proposal.votingEndsAt])

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
    <Card className={cn('group hover:shadow-md transition-all duration-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type Icon */}
            <div className={cn('p-2 rounded-lg', typeInfo.bgColor)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs', statusInfo.color, statusInfo.bgColor)}
                >
                  {statusInfo.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', impactInfo.color, impactInfo.bgColor)}
                >
                  {proposal.impactLevel} Impact
                </Badge>
                {proposal.userHasVoted && (
                  <Badge variant="secondary" className="text-xs">
                    Voted {proposal.userVoteChoice}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2">
                {proposal.title}
              </h3>

              {/* ID and Proposer */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <span className="font-mono">{proposal.id}</span>
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {getUserInitials(proposal.proposer, proposal.proposerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{proposal.proposerName || `${proposal.proposer.slice(0, 8)}...`}</span>
                </div>
              </div>

              {/* Description Preview */}
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {proposal.description}
              </p>

              {/* Tags */}
              {proposal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {proposal.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {proposal.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{proposal.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Proposal
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Calendar className="w-4 h-4 mr-2" />
                Add to Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Progress */}
        {hasResults && progressData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Voting Results</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatTokenAmount(progressData.totalVotes.toString())} votes
              </span>
            </div>

            {/* Vote Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">For</span>
                </div>
                <span className="text-sm font-medium">
                  {progressData.forPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={progressData.forPercentage} className="h-2 bg-gray-200">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progressData.forPercentage}%` }}
                />
              </Progress>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">Against</span>
                </div>
                <span className="text-sm font-medium">
                  {progressData.againstPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={progressData.againstPercentage} className="h-2 bg-gray-200">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${progressData.againstPercentage}%` }}
                />
              </Progress>
            </div>

            {/* Quorum Status */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3" />
                <span className="text-gray-600 dark:text-gray-400">
                  Quorum: {progressData.quorumReached ? 'Reached' : 'Not Reached'}
                </span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                {(progressData.participationRate * 100).toFixed(1)}% participation
              </span>
            </div>
          </div>
        )}

        {/* Time and Cost Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            {isActive && timeUntilEnd && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Ends {timeUntilEnd}</span>
              </div>
            )}
            {!isActive && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDistanceToNow(proposal.createdAt, { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {proposal.estimatedCost && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>{proposal.estimatedCost}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link href={`/governance/${proposal.address}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View Details
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>

          {canVote && onVote && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVote(VoteChoice.Against)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Against
              </Button>
              <Button
                size="sm"
                onClick={() => onVote(VoteChoice.For)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Support
              </Button>
            </div>
          )}

          {proposal.status === ProposalStatus.Succeeded && (
            <Badge variant="secondary" className="text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              Ready to Execute
            </Badge>
          )}

          {proposal.proposalType === ProposalType.Emergency && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Emergency
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
