'use client'

import React from 'react'
import { useQuery as useConvexQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Star, TrendingUp, Calendar, ExternalLink, Crown, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { formatAddress } from '@/lib/utils'

function getGhostScoreTier(score: number): {
  tier: string
  color: string
} {
  if (score >= 900) return { tier: 'PLATINUM', color: 'text-gray-300' }
  if (score >= 750) return { tier: 'GOLD', color: 'text-yellow-400' }
  if (score >= 500) return { tier: 'SILVER', color: 'text-gray-400' }
  if (score >= 200) return { tier: 'BRONZE', color: 'text-orange-500' }
  return { tier: 'NEWCOMER', color: 'text-blue-400' }
}

export default function GhostScoreDashboard() {
  const subscription = useConvexQuery(api.ghostScore.getUserSubscription)
  const verificationHistory = useConvexQuery(api.ghostScore.getVerificationHistory)

  // Calculate monthly verification count
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const monthlyVerifications = useConvexQuery(api.ghostScore.getVerificationCount, {
    startTime: thirtyDaysAgo,
  })

  const currentTier = subscription?.tier || 'free'
  const isActive = subscription?.status === 'active'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black mb-2">Ghost Score</h1>
        <p className="text-muted-foreground">
          Manage your agent verifications, reviews, and subscription.
        </p>
      </div>

      {/* Subscription Card */}
      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold">Your Subscription</h2>
            </div>
            <p className="text-muted-foreground">
              {currentTier === 'free' && 'Free Plan'}
              {currentTier === 'pro' && 'Pro Plan'}
              {currentTier === 'power' && 'Power Plan'}
            </p>
          </div>

          {currentTier === 'free' && (
            <Link href="/ghost-score/pricing">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            </Link>
          )}

          {currentTier !== 'free' && isActive && (
            <Badge variant="success" className="text-lg px-4 py-2">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Active
            </Badge>
          )}
        </div>

        {/* Tier Details */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Verifications</div>
            <div className="text-2xl font-bold">
              {currentTier === 'free' ? (
                <>
                  {monthlyVerifications || 0}
                  <span className="text-lg text-muted-foreground">/3</span>
                </>
              ) : (
                'Unlimited'
              )}
            </div>
          </div>

          <div className="bg-card/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Reviews</div>
            <div className="text-2xl font-bold">
              {currentTier === 'free' ? '1/month' : 'Unlimited'}
            </div>
          </div>

          <div className="bg-card/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">API Access</div>
            <div className="text-2xl font-bold">
              {currentTier === 'power'
                ? '10K/month'
                : currentTier === 'pro'
                  ? 'Coming Soon'
                  : 'None'}
            </div>
          </div>
        </div>

        {currentTier !== 'free' && subscription && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current period ends</span>
              <span className="font-semibold">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{verificationHistory?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Verifications</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Reviews Written</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Agents Saved</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Verification History */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Verifications</h2>
          <Link href="/ghost-score">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Verify Agent
            </Button>
          </Link>
        </div>

        {!verificationHistory ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : verificationHistory.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No verifications yet</h3>
            <p className="text-muted-foreground mb-6">
              Start verifying agents to track their Ghost Scores.
            </p>
            <Link href="/ghost-score">
              <Button className="bg-purple-600 hover:bg-purple-700">Verify Your First Agent</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {verificationHistory.slice(0, 10).map((verification) => {
              const { tier, color } = getGhostScoreTier(verification.ghostScore)

              return (
                <Card key={verification._id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold mb-1">
                          {formatAddress(verification.agentAddress)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(verification.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Ghost Score</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-black ${color}`}>
                            {verification.ghostScore}
                          </span>
                          <Badge className={`${color} bg-transparent`}>{tier}</Badge>
                        </div>
                      </div>
                    </div>

                    <Link href={`/ghost-score/${verification.agentAddress}`} className="ml-4">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-card/50">
        <h3 className="font-bold mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/ghost-score">
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              Verify an Agent
            </Button>
          </Link>
          <Link href="/ghost-score/pricing">
            <Button variant="outline" className="w-full justify-start">
              <Crown className="w-4 h-4 mr-2" />
              View Pricing
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
