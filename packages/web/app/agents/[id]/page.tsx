'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bot,
  DollarSign,
  ExternalLink,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  MessageSquare,
  Globe,
  FileCode,
  Shield,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgent } from '@/lib/queries/agents'
import { formatAddress, formatNumber, formatSol } from '@/lib/utils'
import { TierBadge } from '@/components/staking/TierBadge'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function AgentDetailPage(): React.JSX.Element {
  const params = useParams()
  const agentId = params.id as string

  const { data: agent, isLoading, error } = useAgent(agentId)

  // Fetch staking account for this agent
  const stakingAccount = useQuery(
    api.staking.getStakingAccount,
    agent ? { agentAddress: agent.address } : 'skip'
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The agent you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link href="/agents">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link
          href="/agents"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Link>

        {/* Agent Header */}
        <Card className="p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {agent.metadata.avatar ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agent.metadata.avatar}
                    alt={agent.name}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
                </>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold mb-1">{agent.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {formatAddress(agent.address)}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={agent.isActive ? 'success' : 'secondary'}>
                    {agent.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  {agent.x402?.enabled && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      <Zap className="w-3 h-3 mr-1" />
                      x402 Enabled
                    </Badge>
                  )}
                  {stakingAccount && stakingAccount.hasVerifiedBadge && (
                    <Badge variant="outline" className="border-blue-500 text-blue-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {stakingAccount && stakingAccount.hasPremiumBenefits && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {stakingAccount && <TierBadge tier={stakingAccount.tier} size="sm" />}
                </div>
              </div>
            </div>

            <Link href={`/agents/${agent.address}/interact`}>
              <Button variant="gradient" size="lg">
                <MessageSquare className="w-5 h-5 mr-2" />
                Interact with Agent
              </Button>
            </Link>
          </div>

          {agent.metadata.description && (
            <p className="text-gray-600 dark:text-gray-300 mb-6">{agent.metadata.description}</p>
          )}

          {/* Capabilities */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Capabilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((capability) => (
                <Badge key={capability} variant="outline">
                  {capability}
                </Badge>
              ))}
              {agent.capabilities.length === 0 && (
                <span className="text-gray-400 text-sm">No capabilities listed</span>
              )}
            </div>
          </div>

          {/* Ghost Score - Hero Metric */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Ghost Score</h3>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-purple-400">
                    {Math.round(agent.reputation.score * 100)}
                  </span>
                  <div className="flex flex-col">
                    <Badge variant="outline" className="border-purple-500 text-purple-600 mb-1">
                      {agent.reputation.score >= 90
                        ? 'Platinum'
                        : agent.reputation.score >= 75
                          ? 'Gold'
                          : agent.reputation.score >= 50
                            ? 'Silver'
                            : agent.reputation.score >= 20
                              ? 'Bronze'
                              : 'Unranked'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Built on PayAI data</span>
                  </div>
                </div>
              </div>
              {stakingAccount && stakingAccount.reputationBoostBps > 0 && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Staking Boost</div>
                  <div className="text-3xl font-bold text-green-500">
                    +{stakingAccount.reputationBoostBps / 100}%
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Jobs Completed</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(agent.reputation.totalJobs)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Base Price</span>
              </div>
              <p className="text-2xl font-bold">{formatSol(agent.pricing)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 text-purple-500 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <p className="text-lg font-bold">
                {agent.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </Card>

        {/* x402 Endpoint Info */}
        {agent.x402?.enabled && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              x402 Payment Endpoint
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Service Endpoint
                  </span>
                  {agent.x402.serviceEndpoint && (
                    <a
                      href={agent.x402.serviceEndpoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <code className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                  {agent.x402.serviceEndpoint || 'Not configured'}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Price per Call
                  </span>
                  <p className="text-xl font-bold">
                    {agent.x402.pricePerCall
                      ? `${(Number(agent.x402.pricePerCall) / 1_000_000).toFixed(4)} USDC`
                      : 'Free'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4" />
                    Total Calls
                  </span>
                  <p className="text-xl font-bold">
                    {formatNumber(Number(agent.x402.totalCalls ?? 0))}
                  </p>
                </div>
              </div>

              {agent.x402.apiSpecUri && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <FileCode className="w-4 h-4" />
                      API Specification
                    </span>
                    <a
                      href={agent.x402.apiSpecUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      View OpenAPI Spec <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Owner Info */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Agent Owner</h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Owner Address</p>
              <p className="font-mono text-sm">{formatAddress(agent.owner)}</p>
            </div>
            <a
              href={`https://explorer.solana.com/address/${agent.owner}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
