'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Settings,
  Coins,
  Zap,
  Sparkles,
  Shield,
  Calendar,
  Clock,
  FileText,
  Tag,
  DollarSign,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Share2,
  Bookmark,
  Copy,
  CheckCircle,
  Crown,
  TrendingUp,
} from 'lucide-react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useProposal, ProposalType, ProposalStatus } from '@/lib/queries/governance'
import { VotingInterface } from '@/components/governance/VotingInterface'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import type { Address } from '@solana/addresses'

const proposalTypeConfig = {
  [ProposalType.ParameterChange]: {
    icon: Settings,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  [ProposalType.Treasury]: {
    icon: Coins,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50 dark:bg-green-900/20',
  },
  [ProposalType.Upgrade]: {
    icon: Zap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  [ProposalType.Feature]: {
    icon: Sparkles,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500',
    lightBg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  [ProposalType.Emergency]: {
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50 dark:bg-red-900/20',
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

export default function ProposalDetailPage(): React.JSX.Element {
  const params = useParams()
  const proposalId = params?.id as string
  const { address: publicKey, isConnected } = useWalletAddress()
  const [copied, setCopied] = React.useState(false)

  const {
    data: proposal,
    isLoading,
    error,
  } = useProposal(proposalId ? (proposalId as Address) : undefined)

  const userAddress = publicKey?.toString()
  const isProposer = proposal?.proposer === userAddress

  const handleCopyAddress = async (): Promise<void> => {
    if (proposal?.address) {
      await navigator.clipboard.writeText(proposal.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async (): Promise<void> => {
    if (navigator.share && proposal) {
      try {
        await navigator.share({
          title: proposal.title,
          text: proposal.description.slice(0, 100) + '...',
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      handleCopyAddress()
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading proposal...</span>
        </div>
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-4">Proposal Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The proposal you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Link href="/governance">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Governance
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const typeInfo = proposalTypeConfig[proposal.proposalType]
  const statusInfo = statusConfig[proposal.status]
  const impactInfo = impactLevelConfig[proposal.impactLevel]
  const TypeIcon = typeInfo.icon

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/governance">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Governance
          </Button>
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleShare}>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Share2 className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Share'}
          </Button>

          <Button variant="outline" size="sm">
            <Bookmark className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proposal Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl', typeInfo.bgColor)}>
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
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
                        You Voted {proposal.userVoteChoice}
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {proposal.title}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-mono">{proposal.id}</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-blue-500 text-white text-xs">
                          {getUserInitials(proposal.proposer, proposal.proposerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{proposal.proposerName || `${proposal.proposer.slice(0, 8)}...`}</span>
                      {isProposer && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Proposal Address */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Proposal Address
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded border">
                    {proposal.address}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyAddress}>
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Tags */}
              {proposal.tags.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {proposal.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Description
                </label>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {proposal.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 text-gray-700 dark:text-gray-300">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voting Interface */}
          <VotingInterface proposal={proposal} />

          {/* Execution Details */}
          {proposal.executionParams && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Execution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Execution Delay
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {proposal.executionParams.executionDelay} hours after approval
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Target Program
                    </label>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {proposal.executionParams.targetProgram}
                    </p>
                  </div>
                </div>

                {proposal.executionParams.executeAfter && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Execute After
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(proposal.executionParams.executeAfter, 'PPP p')}
                    </p>
                  </div>
                )}

                {proposal.executedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Executed At
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(proposal.executedAt, 'PPP p')}
                      </p>
                      {proposal.executionTxId && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://explorer.solana.com/tx/${proposal.executionTxId}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Transaction
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Proposal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Proposal Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <div className="flex items-center gap-2 mt-1">
                  <TypeIcon className={cn('w-4 h-4', typeInfo.color)} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {proposal.proposalType}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{proposal.category}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Impact Level
                </label>
                <Badge
                  variant="outline"
                  className={cn('text-xs', impactInfo.color, impactInfo.bgColor)}
                >
                  {proposal.impactLevel}
                </Badge>
              </div>

              {proposal.estimatedCost && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estimated Cost
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {proposal.estimatedCost}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Created
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {format(proposal.createdAt, 'PPP')}
                  <span className="text-xs ml-2">
                    ({formatDistanceToNow(proposal.createdAt, { addSuffix: true })})
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Voting Period
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(proposal.votingStartsAt, 'PPP')} -{' '}
                      {format(proposal.votingEndsAt, 'PPP')}
                    </span>
                  </div>
                  {proposal.status === ProposalStatus.Voting && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Ends {formatDistanceToNow(proposal.votingEndsAt, { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>

              {proposal.status === ProposalStatus.Succeeded &&
                proposal.executionParams?.executeAfter && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ready for Execution
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(proposal.executionParams.executeAfter, 'PPP p')}
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Voting Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Voting Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Approval Threshold
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {proposal.approvalThreshold}% of votes required to pass
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quorum Required
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {parseFloat(proposal.quorumRequired).toLocaleString()} votes minimum
                </p>
              </div>

              {proposal.results && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Participation Rate
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(proposal.results.participationRate * 100).toFixed(1)}%
                    <span className="ml-2">
                      ({parseFloat(proposal.results.totalVotes).toLocaleString()} votes)
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Execute Button */}
          {proposal.status === ProposalStatus.Succeeded && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    Proposal Passed
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    This proposal has been approved and is ready for execution.
                  </p>
                  <Button className="w-full">
                    <Zap className="w-4 h-4 mr-2" />
                    Execute Proposal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Alert */}
          {proposal.proposalType === ProposalType.Emergency &&
            proposal.status === ProposalStatus.Voting && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2 animate-pulse" />
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                      Emergency Proposal
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This proposal requires urgent attention due to critical security concerns.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  )
}
