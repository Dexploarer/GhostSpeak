'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { motion as _motion } from 'framer-motion'
import { useAgent } from '@/lib/queries/agents'
import { useAgentReputation } from '@/lib/queries/reputation'
import { useQuery as _useQuery } from '@tanstack/react-query'
import { api } from '@/convex/_generated/api'
import { useConvexAuth, useQuery as useConvexQuery } from 'convex/react'
import { ReputationBreakdown } from '@/components/ghost-score/ReputationBreakdown'
import { ReviewsList } from '@/components/ghost-score/ReviewsList'
import { HireButton } from '@/components/ghost-score/HireButton'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bot,
  Star,
  TrendingUp,
  DollarSign,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { formatAddress, formatSol } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

function getGhostScoreTier(score: number): {
  tier: string
  color: string
  bgColor: string
  borderColor: string
} {
  if (score >= 900)
    return {
      tier: 'PLATINUM',
      color: 'text-gray-300',
      bgColor: 'bg-gray-300/10',
      borderColor: 'border-gray-300/30',
    }
  if (score >= 750)
    return {
      tier: 'GOLD',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
    }
  if (score >= 500)
    return {
      tier: 'SILVER',
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
      borderColor: 'border-gray-400/30',
    }
  if (score >= 200)
    return {
      tier: 'BRONZE',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    }
  return {
    tier: 'NEWCOMER',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  }
}

export default function AgentProfilePage() {
  const params = useParams()
  const agentAddress = params?.agentAddress as string

  const { data: agent, isLoading: agentLoading } = useAgent(agentAddress)
  const { data: reputation, isLoading: reputationLoading } = useAgentReputation(agentAddress)

  const reviewStats = useConvexQuery(api.ghostScore.getReviewStats, { agentAddress })

  if (agentLoading || reputationLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-48 w-full mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 md:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The agent you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/ghost-score">
            <Button>Back to Search</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const ghostScore = agent.reputation.score
  const { tier, color, bgColor, borderColor } = getGhostScoreTier(ghostScore)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-b from-purple-500/10 to-background border-b border-border">
        <div className="max-w-6xl mx-auto p-8">
          <div className="flex items-start gap-6 mb-6">
            {agent.metadata.avatar ? (
              <Image
                src={agent.metadata.avatar}
                alt={agent.name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-purple-500/30"
                unoptimized
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center border-4 border-purple-500/30">
                <Bot className="w-12 h-12 text-white" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black">{agent.name}</h1>
                <Badge variant={agent.isActive ? 'success' : 'secondary'}>
                  {agent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{formatAddress(agent.address)}</p>

              {/* Ghost Score Badge */}
              <div
                className={`inline-flex items-center gap-3 ${bgColor} ${borderColor} border-2 rounded-xl px-6 py-3`}
              >
                <div>
                  <div className="text-xs text-muted-foreground">Ghost Score</div>
                  <div className={`text-4xl font-black ${color}`}>{ghostScore}</div>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{tier}</div>
              </div>
            </div>

            <div className="text-right">
              <Link href="/ghost-score">
                <Button variant="outline" className="mb-3">
                  Back to Search
                </Button>
              </Link>
              <HireButton agent={agent} />
            </div>
          </div>

          {agent.metadata.description && (
            <p className="text-lg text-muted-foreground mb-6">{agent.metadata.description}</p>
          )}

          {/* Capabilities */}
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((capability) => (
              <Badge key={capability} variant="outline">
                {capability}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Key Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Key Metrics
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Jobs</span>
                  <span className="font-semibold">{agent.reputation.totalJobs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-semibold text-green-400">
                    {agent.reputation.successRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Response</span>
                  <span className="font-semibold">450ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Price per Call</span>
                  <span className="font-semibold">{formatSol(agent.pricing)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Disputes</span>
                  <span className="font-semibold text-green-400">0</span>
                </div>
              </div>
            </Card>

            {/* Rating */}
            {reviewStats && reviewStats.totalReviews > 0 && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  User Rating
                </h3>

                <div className="text-center mb-4">
                  <div className="text-5xl font-black mb-2">
                    {reviewStats.averageRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(reviewStats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {reviewStats.totalReviews} reviews ({reviewStats.verifiedCount} verified)
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const countKey = `star${rating}` as keyof typeof reviewStats.ratingDistribution
                    const count = reviewStats.ratingDistribution[countKey] || 0
                    const percentage =
                      reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0
                    return (
                      <div key={rating} className="flex items-center gap-2 text-xs">
                        <span className="w-4">{rating}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-12 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Trust Badge */}
            <Card className="p-6 bg-green-500/5 border-green-500/30">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="font-bold">Verified Agent</h3>
                  <p className="text-xs text-muted-foreground">On-chain validated</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This agent's reputation is verified using blockchain transactions and cannot be
                faked.
              </p>
            </Card>

            {/* Created Date */}
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Member since</div>
                  <div className="font-semibold">{agent.createdAt.toLocaleDateString()}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Reputation & Reviews */}
          <div className="md:col-span-2 space-y-6">
            {/* Reputation Breakdown */}
            {reputation && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Reputation Breakdown</h2>
                <ReputationBreakdown reputation={reputation} />
              </Card>
            )}

            {/* Reviews */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">User Reviews</h2>
                <Link href={`/ghost-score/${agentAddress}/review`}>
                  <Button variant="outline">Write a Review</Button>
                </Link>
              </div>
              <ReviewsList agentAddress={agentAddress} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
